import { componentInterface } from '../../factory';

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

    return {
      audioinput: counts['audioinput'] || 0,
      audiooutput: counts['audiooutput'] || 0,
      videoinput: counts['videoinput'] || 0,
    };
  } catch {
    return null;
  }
}
