import { componentInterface } from '../../factory';
import { optionsInterface } from '../../options';
import { hash } from '../../utils/hash';
import { stableStringify } from '../../utils/stableStringify';

export default async function getWebRTC(options?: optionsInterface): Promise<componentInterface | null> {
  return new Promise((resolve) => {
    let connection: RTCPeerConnection | undefined;
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

      connection = new RTCPeerConnection(config);
      // Non-null assertion: connection was just assigned above; if the constructor
      // had thrown we would not reach this line.
      const conn: RTCPeerConnection = connection!;
      conn.createDataChannel(''); // trigger ICE gathering

      const processOffer = async () => {
        try {
          const offerOptions = { offerToReceiveAudio: true, offerToReceiveVideo: true };
          const offer = await conn.createOffer(offerOptions);
          await conn.setLocalDescription(offer);

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

          const audioCodecs = constructDescriptions('audio', getDescriptors('audio'));
          const videoCodecs = constructDescriptions('video', getDescriptors('video'));

          const compressedData = {
            audio: {
              count: audioCodecs.length,
              hash: hash(stableStringify(audioCodecs))
            },
            video: {
              count: videoCodecs.length,
              hash: hash(stableStringify(videoCodecs))
            },
            extensionsHash: hash(stableStringify(extensions))
          };

          // With iceServers:[] only "host" candidates are generated, so waiting for
          // the icecandidate event adds latency without any entropy gain. Close
          // immediately and hard-code the known value to keep the hash stable.
          conn.close();
          const result = { supported: true, ...compressedData, candidateType: 'host' };

          resolve({
            details: result,
            hash: hash(stableStringify(result)),
          });

        } catch (error) {
          conn.close();
          resolve({
            supported: true,
            error: `WebRTC offer failed: ${(error as Error).message}`
          });
        }
      };

      processOffer();

    } catch (error) {
      connection?.close();
      resolve({
        supported: false,
        error: `WebRTC error: ${(error as Error).message}`
      });
    }
  });
}