import { componentInterface } from '../../factory';
import { hash } from '../../utils/hash';
import { stableStringify } from '../../utils/stableStringify';

export default async function getMediaDevices(): Promise<componentInterface | null> {
  if (typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    return null;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const counts: Record<string, number> = {};
    for (const device of devices) {
      counts[device.kind] = (counts[device.kind] || 0) + 1;
    }

    const details: componentInterface = {
      audioinput: counts['audioinput'] || 0,
      audiooutput: counts['audiooutput'] || 0,
      videoinput: counts['videoinput'] || 0,
    };

    return {
      details,
      hash: hash(stableStringify(details)),
    };
  } catch {
    return null;
  }
}
