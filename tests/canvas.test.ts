import { getCommonPixels } from '../src/components/canvas/canvas';

class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  
    constructor(pixelData: number[], width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(pixelData);; // Mimic the data structure of ImageData
    }
  }

// Mock the global ImageData object in jsdom environment
(global as any).ImageData = MockImageData;

const createImageFromArray = (array: number[]) => {
    const width = 1;
    const height = 1;
    const pixelData = array;
    const pixelArray = new Uint8ClampedArray(pixelData);
    return new ImageData(pixelArray, width, height);
}

describe('canvas tests', () => {
    test("single pixel array", () => {
        const pixel1 = createImageFromArray([128, 255, 255, 255]);
        const pixel2 = createImageFromArray([255, 200, 255, 230]);
        const pixel3 = createImageFromArray([255, 255, 250, 255]);
        const pixel4 = createImageFromArray([255, 255, 255, 255]);
        expect(getCommonPixels([pixel1, pixel2, pixel3], 1, 1)).toBeInstanceOf(ImageData);
        expect(getCommonPixels([pixel1, pixel2, pixel3], 1, 1).data).toStrictEqual(pixel4.data);
    });    
});
