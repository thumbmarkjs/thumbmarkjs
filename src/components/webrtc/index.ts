import { componentInterface } from '../../factory';
import { hash } from '../../utils/hash';

export default async function getWebRTC(): Promise<componentInterface | null> {
  return new Promise((resolve) => {
    try {
      // Check if WebRTC is supported
      const RTCPeerConnection = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve({
          supported: false,
          error: 'WebRTC not supported'
        });
        return;
      }

      const config = {
        iceCandidatePoolSize: 1,
        iceServers: []
      };

      const connection = new RTCPeerConnection(config);
      connection.createDataChannel(''); // trigger ICE gathering

      const processOffer = async () => {
        try {
          const offerOptions = { offerToReceiveAudio: true, offerToReceiveVideo: true };
          const offer = await connection.createOffer(offerOptions);
          await connection.setLocalDescription(offer);

          const sdp = offer.sdp || '';
          
          // Extract RTP extensions
          const extensions = [...new Set((sdp.match(/extmap:\d+ [^\n\r]+/g) || []).map((x: string) => x.replace(/extmap:\d+ /, '')))].sort();

          // Extract codec information
          const getDescriptors = (mediaType: string) => {
            const match = sdp.match(new RegExp(`m=${mediaType} [^\\s]+ [^\\s]+ ([^\\n\\r]+)`));
            return match ? match[1].split(' ') : [];
          };

          const constructDescriptions = (mediaType: string, descriptors: string[]) => {
            return descriptors.map(descriptor => {
              const matcher = new RegExp(`(rtpmap|fmtp|rtcp-fb):${descriptor} (.+)`, 'g');
              const matches = [...sdp.matchAll(matcher)];
              if (!matches.length) return null;

              const description: any = {};
              matches.forEach(match => {
                const [_, type, data] = match;
                const parts = data.split('/');
                if (type === 'rtpmap') {
                  description.mimeType = `${mediaType}/${parts[0]}`;
                  description.clockRate = +parts[1];
                  if (mediaType === 'audio') description.channels = +parts[2] || 1;
                } else if (type === 'rtcp-fb') {
                  description.feedbackSupport = description.feedbackSupport || [];
                  description.feedbackSupport.push(data);
                } else if (type === 'fmtp') {
                  description.sdpFmtpLine = data;
                }
              });
              return description;
            }).filter(Boolean);
          };

          const codecsSdp = {
            audio: constructDescriptions('audio', getDescriptors('audio')),
            video: constructDescriptions('video', getDescriptors('video'))
          };

          // Set up for ICE candidate collection with timeout
          const result = await new Promise<componentInterface>((resolveResult) => {
            const timeout = setTimeout(() => {
              connection.removeEventListener('icecandidate', onIceCandidate);
              connection.close();
              resolveResult({ 
                supported: true,
                codecsSdp, 
                extensions: extensions as string[],
                timeout: true
              });
            }, 3000);

            const onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
              const candidateObj = event.candidate;
              if (!candidateObj || !candidateObj.candidate) return;

              clearTimeout(timeout);
              connection.removeEventListener('icecandidate', onIceCandidate);
              connection.close();

              resolveResult({ 
                supported: true,
                codecsSdp, 
                extensions: extensions as string[],
                candidateType: candidateObj.type || ''
              });
            };

            connection.addEventListener('icecandidate', onIceCandidate);
          });

          resolve({
            hash: hash(JSON.stringify(result)),
          });

        } catch (error) {
          connection.close();
          resolve({
            supported: true,
            error: `WebRTC offer failed: ${(error as Error).message}`
          });
        }
      };

      processOffer();

    } catch (error) {
      resolve({
        supported: false,
        error: `WebRTC error: ${(error as Error).message}`
      });
    }
  });
}