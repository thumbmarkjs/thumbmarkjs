import { componentInterface, includeComponent } from '../../factory'

export default function getHardware(): Promise<componentInterface> {
  return new Promise((resolve, reject) => {
    const deviceMemory = ((navigator as any).deviceMemory !== undefined) ? (navigator as any).deviceMemory : 0
    const memoryInfo = (window.performance && (window.performance as any).memory ) ? (window.performance as any).memory : 0
    resolve(
      {
        'videocard': getVideoCard(),
        'architecture': getArchitecture(),
        'deviceMemory': deviceMemory.toString() || 'undefined',
        'jsHeapSizeLimit': memoryInfo.jsHeapSizeLimit || 0,
      }
    )
  });
}

function getVideoCard(): componentInterface | string {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    
    if (gl && 'getParameter' in gl) {
        try {
            // Try standard parameters first
            const vendor = (gl.getParameter(gl.VENDOR) || '').toString();
            const renderer = (gl.getParameter(gl.RENDERER) || '').toString();
            
            let result: componentInterface = {
                vendor: vendor,
                renderer: renderer,
                version: (gl.getParameter(gl.VERSION) || '').toString(),
                shadingLanguageVersion: (gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || '').toString(),
            };
            
            // Only try debug info if needed and available
            if (!renderer.length || !vendor.length) {
                const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
                if (debugInfo) {
                    const vendorUnmasked = (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').toString();
                    const rendererUnmasked = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toString();
                    
                    // Only add unmasked values if they exist
                    if (vendorUnmasked) {
                        result.vendorUnmasked = vendorUnmasked;
                    }
                    if (rendererUnmasked) {
                        result.rendererUnmasked = rendererUnmasked;
                    }
                }
            }
            
            return result;
        } catch (error) {
            // fail silently
        }
    }
    return "undefined";
}

function getArchitecture(): number {
  const f = new Float32Array(1);
  const u8 = new Uint8Array(f.buffer);
  f[0] = Infinity;
  f[0] = f[0] - f[0];

  return u8[3];
}