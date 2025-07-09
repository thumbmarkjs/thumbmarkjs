import { componentInterface, componentFunctionInterface, includeComponent } from '../../factory'
import { optionsInterface } from '../../fingerprint/options';
import { getBrowser } from '../system/browser'

export default async function getAudio(options?: optionsInterface): Promise<componentInterface | null> {
  const browser = getBrowser()
  if (!['SamsungBrowser', 'Safari'].includes(browser.name))
    return createAudioFingerprint()
  return null;
}

async function createAudioFingerprint(): Promise<componentInterface> {
  const resultPromise = new Promise<componentInterface>((resolve, reject) => {
    try {
      // Set up audio parameters
      const sampleRate = 44100;
      const numSamples = 5000;
      const audioContext = new ((window.OfflineAudioContext || window.webkitOfflineAudioContext))(1, numSamples, sampleRate );
      const audioBuffer = audioContext.createBufferSource();
      
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.value = 1000;
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.2;
      oscillator.connect(compressor);
      compressor.connect(audioContext.destination);
      oscillator.start();
      let samples: Float32Array;
  
      audioContext.oncomplete = event => {
        samples = event.renderedBuffer.getChannelData(0);
        resolve(
            {
                'sampleHash': calculateHash(samples),
                'maxChannels': audioContext.destination.maxChannelCount,
                'channelCountMode': audioBuffer.channelCountMode,

            }    
          );
      };
  
      audioContext.startRendering();
      
  
    } catch (error) {
      console.error('Error creating audio fingerprint:', error);
      reject(error);
    }
  
  });
  
  return resultPromise;

}


function calculateHash(samples: Float32Array) {
  let hash = 0;
  for (let i = 0; i < samples.length; ++i) {
    hash += Math.abs(samples[i]);
  }
  return hash;
}