import { componentInterface, includeComponent } from '../../factory'
import { getBrowser } from '../system/browser';

async function createAudioFingerprint(): Promise<componentInterface> {
  // Check if device is using Samsung browser
  const browser = getBrowser();
  if (browser.name === 'SamsungBrowser' || isSamsungDevice()) {
    // Return a consistent default response for Samsung devices
    return {
      'sampleHash': 0,
      'oscillator': 'sine',
      'maxChannels': 2,
      'channelCountMode': 'max',
      'isSamsung': true
    };
  }
  
  const resultPromise = new Promise<componentInterface>((resolve, reject) => {
    try {
      // Set up audio parameters
      const sampleRate = 44100;
      const numSamples = 5000;
      const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, numSamples, sampleRate );
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
                'oscillator': oscillator.type,
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

// Helper function to detect Samsung devices from user agent
function isSamsungDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('samsung') || 
         ua.includes('sm-') || 
         ua.includes('gt-') ||
         ua.includes('galaxy');
}

function calculateHash(samples: Float32Array) {
  let hash = 0;
  for (let i = 0; i < samples.length; ++i) {
    hash += Math.abs(samples[i]);
  }
  return hash;
}

includeComponent('audio', createAudioFingerprint);