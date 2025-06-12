import { includeComponent, componentInterface } from '../../factory'
import { getBrowser } from '../system/browser'

const _SAMPLE_RATE = 44100
const _BASE_SIGNAL_NUM_SAMPLES = 11025
const _CLONE_COUNT = 15000
const _NUM_POINTS_TO_AVERAGE = 10
const _HASH_PRECISION = 6
const _OSCILLATOR_TYPE = 'square'

// Function to generate multiple renderings of a single sample from the baseSignal
async function generateClonesForSampleAtIndex(
  baseSignal: AudioBuffer,
  targetSampleIndex: number,
  cloneCount: number
): Promise<Float32Array> {
  // This context will render `cloneCount` repetitions of the sample at `targetSampleIndex`.
  // The context length is `cloneCount` samples.
  const context = new OfflineAudioContext(1, cloneCount, _SAMPLE_RATE);
  const source = context.createBufferSource();

  source.buffer = baseSignal;
  source.loop = true;

  // Define the single sample segment to loop
  const loopStartTime = targetSampleIndex / _SAMPLE_RATE;
  const loopEndTime = (targetSampleIndex + 1) / _SAMPLE_RATE;

  source.loopStart = loopStartTime;
  source.loopEnd = loopEndTime; 

  source.connect(context.destination);
  // Start rendering at time 0 in the OfflineAudioContext,
  // beginning playback from `loopStartTime` (the target sample) in the `baseSignal` buffer.
  source.start(0, loopStartTime); 

  const renderedBuffer = await context.startRendering();
  // The renderedBuffer now contains `cloneCount` cloned samples.
  return renderedBuffer.getChannelData(0);
}

export async function createAudioFingerprint(useRobustMethod: boolean): Promise<componentInterface> {
  try {
    // 1. Generate base signal
    const baseSignal = await generateBaseSignal(_SAMPLE_RATE, _BASE_SIGNAL_NUM_SAMPLES);
    let fingerprintValue: string;

    if (useRobustMethod) {
      // 2. Robust method: For several points, generate clones and average them
      let sumOfAveragedValues = 0;
      for (let i = 0; i < _NUM_POINTS_TO_AVERAGE; i++) {
        const currentTargetSampleIndex = Math.floor(
          (baseSignal.length / (_NUM_POINTS_TO_AVERAGE + 1)) * (i + 1)
        );
        const clonedSamples = await generateClonesForSampleAtIndex(
          baseSignal,
          currentTargetSampleIndex,
          _CLONE_COUNT
        );
        sumOfAveragedValues += averageClones(clonedSamples);
      }
      // _NUM_POINTS_TO_AVERAGE is a constant > 0 (10), so direct division is safe.
      const averageOfAveragedValues = sumOfAveragedValues / _NUM_POINTS_TO_AVERAGE;
      fingerprintValue = averageOfAveragedValues.toFixed(_HASH_PRECISION);
    } else {
      // 2. Simple method: Calculate sum of absolute values from the base signal
      const samples = baseSignal.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < samples.length; ++i) {
        sum += Math.abs(samples[i]);
      }
      fingerprintValue = sum.toString();
    }
    
    return {
      'audioFingerprint': fingerprintValue,
      'oscillatorType': _OSCILLATOR_TYPE,
      'effectiveChannels': baseSignal.numberOfChannels, // Actual channels in the rendered buffer (should be 1)
      'processingDetail': useRobustMethod ? 'robustNoiseReduction' : 'directSignalSum',
    };

  } catch (error) {
    // Add more context to the error log
    const method = useRobustMethod ? 'robust' : 'simple';
    console.error(`Error creating audio fingerprint using ${method} method:`, error);
    throw error; // Propagate the error to be handled by the caller
  }
}

// Generate initial signal without reading samples
// This function is used by both robust and simple paths.
async function generateBaseSignal(sampleRate: number, length: number): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, length, sampleRate);
  const oscillator = context.createOscillator();
  const compressor = context.createDynamicsCompressor();

  oscillator.type = _OSCILLATOR_TYPE;
  oscillator.frequency.value = 10000;
  
  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;

  oscillator.connect(compressor);
  compressor.connect(context.destination);
  oscillator.start(0);
  
  return context.startRendering();
}

// Average cloned samples to reduce noise
// This function is only used by the robust path.
function averageClones(samples: Float32Array): number {
  // samples.length is guaranteed to be _CLONE_COUNT by OfflineAudioContext setup,
  // and _CLONE_COUNT (15000) is > 0.
  if (samples.length === 0) { // Should not happen given _CLONE_COUNT > 0
    return 0;
  }
  const sum = samples.reduce((acc, val) => acc + val, 0);
  const average = sum / samples.length;
  return parseFloat(average.toFixed(_HASH_PRECISION));
}

const browserName = getBrowser().name;

// Determine if the robust method (with noise reduction) should be used
const shouldUseRobustMethod = ['SamsungBrowser', 'Safari'].includes(browserName);

// Register the component with the unified function, passing the boolean flag
includeComponent('audio', () => createAudioFingerprint(shouldUseRobustMethod));
