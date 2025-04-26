import { componentInterface, includeComponent } from '../../factory'
import { getBrowser } from '../system/browser'

// Modified function with Safari 17 bypass
async function createAudioFingerprint(): Promise<componentInterface> {
  const resultPromise = new Promise<componentInterface>(async (resolve, reject) => {
    try {
      const sampleRate = 44100;
      const numSamples = 5000;
      const cloneCount = 1000; // Adjust based on needed precision

      // 1. Generate base signal without reading samples
      const baseSignal = await generateBaseSignal(sampleRate, numSamples);
      
      // 2. Create looped clones with different noise
      const loopedSignal = await generateLoopedClones(baseSignal, sampleRate, cloneCount);
      const clonedSamples = loopedSignal.getChannelData(0).subarray(baseSignal.length - 1);

      // 3. Average samples to reduce noise
      const averagedSamples = averageClones(clonedSamples, cloneCount);
      
      resolve({
        'sampleHash': calculateHash(averagedSamples),
        'oscillator': 'sine', // Hardcode if needed
        'maxChannels': baseSignal.numberOfChannels,
        'channelCountMode': 'explicit',
      });

    } catch (error) {
      console.error('Error creating audio fingerprint:', error);
      reject(error);
    }
  });
  
  return resultPromise;
}

// Generate initial signal without reading samples
async function generateBaseSignal(sampleRate: number, length: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, length, sampleRate);
  const oscillator = context.createOscillator();
  const compressor = context.createDynamicsCompressor();

  oscillator.type = 'sine';
  oscillator.frequency.value = 1000;
  
  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.2;

  oscillator.connect(compressor);
  compressor.connect(context.destination);
  oscillator.start(0);
  
  return context.startRendering();
}

// Generate looped clones with different noise
async function generateLoopedClones(baseSignal: AudioBuffer, sampleRate: number, cloneCount: number): Promise<AudioBuffer> {
  const loopStart = baseSignal.length - 1;
  const context = new OfflineAudioContext(1, loopStart + cloneCount, sampleRate);
  const source = context.createBufferSource();

  source.buffer = baseSignal;
  source.loop = true;
  source.loopStart = loopStart / sampleRate;
  source.loopEnd = baseSignal.length / sampleRate;
  source.connect(context.destination);
  source.start(0);

  return context.startRendering();
}

// Average cloned samples to reduce noise
function averageClones(samples: Float32Array, cloneCount: number): Float32Array {
  const averaged = new Float32Array(1);
  for (let i = 0; i < cloneCount; i++) {
    averaged[0] += samples[i];
  }
  averaged[0] /= cloneCount;
  return averaged;
}

// Modified hash calculation with rounding
function calculateHash(samples: Float32Array): number {
  let hash = 0;
  for (let i = 0; i < samples.length; ++i) {
    hash += samples[i];
  }
  // Round to 6 decimal places to eliminate remaining noise
  return Number(hash.toFixed(6));
}


const browser = getBrowser()
if (!['SamsungBrowser', 'Safari'].includes(browser.name))
  includeComponent('audio', createAudioFingerprint);