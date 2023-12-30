import { componentInterface, includeComponent } from '../../factory'

function getHardwareInfo(): Promise<componentInterface> {
  return new Promise((resolve, reject) => {
    resolve(
      {
        'videocard': getVideoCard(),
        'architecture': getArchitecture(),
        'deviceMemory': navigator.deviceMemory
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
 */
function getVideoCard(): componentInterface | undefined {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
  if (gl && 'getExtension' in gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      return {
        vendor: (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').toString(),
        renderer: (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toString(),
      }
    }
  }
  return undefined
}

function getArchitecture(): number {
  const f = new Float32Array(1);
  const u8 = new Uint8Array(f.buffer);
  f[0] = Infinity;
  f[0] = f[0] - f[0];

  return u8[3];
}

includeComponent('hardware', getHardwareInfo);