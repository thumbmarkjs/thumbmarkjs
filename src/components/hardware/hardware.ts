import { componentInterface, includeComponent } from '../../factory'

function getHardwareInfo(): Promise<componentInterface> {
  return new Promise((resolve, reject) => {
    const deviceMemory = (navigator.deviceMemory !== undefined) ? navigator.deviceMemory : 0
    const memoryInfo = (window.performance && (window.performance as any).memory ) ? (window.performance as any).memory : 0
    resolve(
      {
        'videocard': getVideoCard(),
        'architecture': getArchitecture(),
        'deviceMemory': deviceMemory.toString() || 'undefined',
        'jsHeapSizeLimit': memoryInfo.jsHeapSizeLimit || 'undefined',
      }
    )
  });
}

interface VideoCard {
    vendor: string
    renderer: string
  }
  
/**
 * @see Credits: https://stackoverflow.com/a/49267844
 * @returns VideoCard | "undefined"
 */
function getVideoCard(): componentInterface | string {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
  if (gl && 'getParameter' in gl) {
    return {
      vendor: (gl.getParameter(gl.VENDOR) || '').toString(),
      renderer: (gl.getParameter(gl.RENDERER) || '').toString(),
    }
  }
  return "undefined"
}

function getArchitecture(): number {
  const f = new Float32Array(1);
  const u8 = new Uint8Array(f.buffer);
  f[0] = Infinity;
  f[0] = f[0] - f[0];

  return u8[3];
}

includeComponent('hardware', getHardwareInfo);