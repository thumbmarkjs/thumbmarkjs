import { componentInterface, includeComponent } from '../../factory'
import { hash } from '../../utils/hash'
import { getCommonPixels } from '../../utils/commonPixels';

async function createWebGLFingerprint(): Promise<componentInterface> {
  try {

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    
    const gl = canvas.getContext('webgl');
    if (!gl) {
        throw new Error('WebGL not supported');
    }

    const imageDatas: ImageData[] = Array.from({length: 3}, () => createWebGLImageData() );
    // and then checking the most common bytes for each channel of each pixel
    const commonImageData = getCommonPixels(imageDatas, canvas.width, canvas.height);
    //const imageData = createWebGLImageData()

    return {
      'commonImageHash': hash(commonImageData.data.toString()).toString(),
      'renderer': gl.getParameter(gl.RENDERER),
      'vendor': gl.getParameter(gl.VENDOR),
      'version': gl.getParameter(gl.VERSION),
      'shadingLanguageVersion': gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    }
  } catch (error) {
    return {
      'webgl': 'unsupported'
    }
  }
}

function createWebGLImageData(): ImageData {
  let gl = null
  try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;

      gl = canvas.getContext('webgl');

      if (!gl) {
          throw new Error('WebGL not supported');
      }

      const vertexShaderSource = `
          attribute vec2 position;
          void main() {
              gl_Position = vec4(position, 0.0, 1.0);
          }
      `;

      const fragmentShaderSource = `
          precision mediump float;
          void main() {
              gl_FragColor = vec4(0.812, 0.195, 0.553, 0.921); // Set line color
          }
      `;

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

      if (!vertexShader || !fragmentShader) {
          throw new Error('Failed to create shaders');
      }

      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.shaderSource(fragmentShader, fragmentShaderSource);

      gl.compileShader(vertexShader);
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
          throw new Error('Vertex shader compilation failed: ' + gl.getShaderInfoLog(vertexShader));
      }

      gl.compileShader(fragmentShader);
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
          throw new Error('Fragment shader compilation failed: ' + gl.getShaderInfoLog(fragmentShader));
      }

      const shaderProgram = gl.createProgram();

      if (!shaderProgram) {
          throw new Error('Failed to create shader program');
      }

      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
          throw new Error('Shader program linking failed: ' + gl.getProgramInfoLog(shaderProgram));
      }

      gl.useProgram(shaderProgram);

      // Set up vertices to form lines
      const numSpokes: number = 137;
      const vertices = new Float32Array(numSpokes * 4);
      const angleIncrement = (2 * Math.PI) / numSpokes;

      for (let i = 0; i < numSpokes; i++) {
          const angle = i * angleIncrement;

          // Define two points for each line (spoke)
          vertices[i * 4] = 0; // Center X
          vertices[i * 4 + 1] = 0; // Center Y
          vertices[i * 4 + 2] = Math.cos(angle) * (canvas.width / 2); // Endpoint X
          vertices[i * 4 + 3] = Math.sin(angle) * (canvas.height / 2); // Endpoint Y
      }

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const positionAttribute = gl.getAttribLocation(shaderProgram, 'position');
      gl.enableVertexAttribArray(positionAttribute);
      gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

      // Render
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.LINES, 0, numSpokes * 2);

      const pixelData = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
      const imageData = new ImageData(pixelData, canvas.width, canvas.height);

      // WebGL cleanup
      gl.disableVertexAttribArray(positionAttribute);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(shaderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return imageData;
  } catch (error) {
      console.error(error);
      return new ImageData(1, 1);
  } finally {
    if (gl) {
      const loseContextExtension = gl.getExtension('WEBGL_lose_context');
      if (loseContextExtension) {
          loseContextExtension.loseContext();
      }
  }
  }
}

  includeComponent('webgl', createWebGLFingerprint);