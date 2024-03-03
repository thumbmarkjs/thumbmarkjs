export interface optionsInterface {
    exclude?: string[],
    include?: string[],
    webgl_runs?: number,
    canvas_runs?: number,
}

export let options: optionsInterface = {
    exclude: [],
}

export function setOption<K extends keyof optionsInterface>(key: K, value: optionsInterface[K]) {
    if (!['exclude'].includes(key))
        throw new Error('Unknown option ' + key)
    if (['exclude'].includes(key) && !(Array.isArray(value) && value.every(item => typeof item === 'string')) )
        throw new Error('The value of the exclude must be an array of strings');
    options[key] = value;
}
