export function getCommonPixels(images: ImageData[], width: number, height: number ): ImageData {
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