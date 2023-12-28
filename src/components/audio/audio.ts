import { componentInterface, includeComponent } from '../../factory'

async function createAudioFingerprint(): Promise<componentInterface> {
  const resultPromise = new Promise<componentInterface>((resolve, reject) => {
    try {
      // Set up audio parameters
      const sampleRate = 44100;
      const numSamples = 5000;
      const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, numSamples, sampleRate );
      const audioBuffer = audioContext.createBufferSource();
      // Create an oscillator
      const oscillator = audioContext.createOscillator();
//      oscillator.type = 'triangle';
      oscillator.frequency.value = 1000;
      // Create a compressor node with specified parameters
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      //compressor.reduction.value = 20;
      compressor.attack.value = 0;
      compressor.release.value = 0.2;
  
      // Connect nodes
      oscillator.connect(compressor);
      compressor.connect(audioContext.destination);
  
      // Capture audio samples
      oscillator.start();
      let samples: Float32Array;
  
      audioContext.oncomplete = event => {
        // We have only one channel, so we get it by index
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


function calculateHash(samples: Float32Array) {
  let hash = 0;
  for (let i = 0; i < samples.length; ++i) {
    hash += Math.abs(samples[i]);
  }
  return hash;
}

includeComponent('audio', createAudioFingerprint);