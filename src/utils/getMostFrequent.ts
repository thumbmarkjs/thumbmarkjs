function mostFrequentValue(arr: any[]): any | null {
    if (arr.length === 0) {
      return null; // Return null for an empty array
    }
  
    const frequencyMap: { [key: string]: number } = {};
  
    // Count occurrences of each element in the array
    arr.forEach((element) => {
      const key = String(element);
      frequencyMap[key] = (frequencyMap[key] || 0) + 1;
    });
  
    let mostFrequent: any = arr[0]; // Assume the first element is the most frequent
    let highestFrequency = 1; // Frequency of the assumed most frequent element
  
    // Find the element with the highest frequency
    Object.keys(frequencyMap).forEach((key) => {
      if (frequencyMap[key] > highestFrequency) {
        mostFrequent = key;
        highestFrequency = frequencyMap[key];
      }
    });
  
    return mostFrequent;
  }

export function mostFrequentValuesInArrayOfDictionaries(arr: { [key: string]: any }[], keys: string[]): { [key: string]: any } {
    const result: { [key: string]: any } = {};
  
    keys.forEach((key) => {
      const valuesForKey = arr.map((obj) => (key in obj ? obj[key] : undefined)).filter((val) => val !== undefined);
      const mostFrequentValueForKey = mostFrequentValue(valuesForKey);
      if (mostFrequentValueForKey)
        result[key] = mostFrequentValueForKey;
    });
  
    return result;
  }