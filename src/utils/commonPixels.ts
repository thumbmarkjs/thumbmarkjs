export function getCommonPixels(images: ImageData[], width: number, height: number ): ImageData {
    // Short-circuit: single image — every byte is trivially its own mode.
    if (images.length === 1) {
        return images[0];
    }

    // Fast path: exactly 3 images — inline 3-way comparison that mirrors
    // getMostFrequent's tie-breaking exactly for all 5 value-combination cases:
    //   all-equal → that value
    //   a===b     → a (freq 2)
    //   a===c     → a (freq 2)
    //   b===c     → b (freq 2)
    //   all-diff  → a (mostFrequent stays arr[0], no key beats freq 1)
    if (images.length === 3) {
        const a = images[0].data;
        const b = images[1].data;
        const c = images[2].data;
        const out = new Uint8ClampedArray(a.length);
        for (let i = 0; i < a.length; i++) {
            const x = a[i], y = b[i], z = c[i];
            out[i] = (x === y) ? x : (x === z) ? x : (y === z) ? y : x;
        }
        return new ImageData(out, width, height);
    }

    // Generic fallback for any other length (no current caller uses this path).
    let finalData: number[] = [];
    for (let i = 0; i < images[0].data.length; i++) {
        let indice: number[] = [];
        for (let u = 0; u < images.length; u++) {
            indice.push(images[u].data[i]);
        }
        finalData.push(getMostFrequent(indice));
    }

    const pixelData = finalData;
    const pixelArray = new Uint8ClampedArray(pixelData);
    return new ImageData(pixelArray, width, height);
}

function getMostFrequent(arr: number[]): number {
    if (arr.length === 0) {
      return 0; // Handle empty array case
    }
  
    const frequencyMap: { [key: number]: number } = {};
    
    // Count occurrences of each number in the array
    for (const num of arr) {
      frequencyMap[num] = (frequencyMap[num] || 0) + 1;
    }
  
    let mostFrequent: number = arr[0];
    
    // Find the number with the highest frequency
    for (const num in frequencyMap) {
      if (frequencyMap[num] > frequencyMap[mostFrequent]) {
        mostFrequent = parseInt(num, 10);
      }
    }
  
    return mostFrequent;
  }