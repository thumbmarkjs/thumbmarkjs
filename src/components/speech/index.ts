import { componentInterface } from '../../factory';
import { hash } from '../../utils/hash';

const VOICE_LOAD_TIMEOUT = 800; // milliseconds to wait for voices to load

export default async function getSpeech(): Promise<componentInterface | null> {
  return new Promise((resolve) => {
    try {
      // Check if Speech Synthesis API is available
      if (typeof window === 'undefined' || !window.speechSynthesis || typeof window.speechSynthesis.getVoices !== 'function') {
        resolve({
          supported: false,
          error: 'Speech Synthesis API not supported'
        });
        return;
      }

      let voicesResolved = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const processVoices = (voices: SpeechSynthesisVoice[]) => {
        if (voicesResolved) return;
        voicesResolved = true;

        // Clear timeout if it exists
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        try {
          // Collect voice signatures
          const voiceSignatures = voices.map((voice) => {
            // Escape commas and backslashes in voice properties
            const escapeValue = (value: string): string => {
              return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,');
            };

            // Format: voiceURI,name,lang,localService,default
            const signature = [
              escapeValue(voice.voiceURI || ''),
              escapeValue(voice.name || ''),
              escapeValue(voice.lang || ''),
              voice.localService ? '1' : '0',
              voice.default ? '1' : '0'
            ].join(',');

            return signature;
          });

          // Sort alphabetically for consistent ordering
          voiceSignatures.sort();

          // Create details object with count and hash
          const details = {
            voiceCount: voices.length,
            voicesHash: hash(JSON.stringify(voiceSignatures))
          };

          resolve({
            details,
            hash: hash(JSON.stringify(details))
          });

        } catch (error) {
          resolve({
            supported: true,
            error: `Voice processing failed: ${(error as Error).message}`
          });
        }
      };

      // Try to get voices immediately
      const voices = window.speechSynthesis.getVoices();

      // If voices are available immediately, process them
      if (voices.length > 0) {
        processVoices(voices);
        return;
      }

      // Set up timeout in case voices never load
      timeoutHandle = setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();
        processVoices(voices);
      }, VOICE_LOAD_TIMEOUT);

      // Listen for voiceschanged event (for browsers that load voices asynchronously)
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        const voices = window.speechSynthesis.getVoices();
        processVoices(voices);
      };

      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    } catch (error) {
      resolve({
        supported: false,
        error: `Speech Synthesis error: ${(error as Error).message}`
      });
    }
  });
}
