import { getVersion, getFingerprintData as getThumbmarkData } from "./functions";
import { optionsInterface } from "./options";
import tm_components from "../components/tm_components";
//import { getComponentPromises } from "../factory";
import { componentInterface } from "../factory";
import { hash } from "../utils/hash";
import { defaultOptions } from "../thumbmark";

export const getComponentPromises = (
    comps: { [key: string]: (options?: optionsInterface) => Promise<componentInterface | null> },
    options?: optionsInterface) => {
    const opts = { ...defaultOptions, ...options };
    const c = comps;
    return Object.fromEntries(
        Object.entries(c)
            .filter(([key]) => {
                return !opts?.exclude?.includes(key)}
                )
            .filter(([key]) => {
                return opts?.include?.some(e => e.includes('.'))
                    ? opts?.include?.some(e => e.startsWith(key))
                    : opts?.include?.length === 0 || opts?.include?.includes(key)
            }
                    )
            .map(([key, value]) => [key, value()])
    );
};

export async function getThumbmark(options?: optionsInterface): Promise<any> {
    const _options = {...options, ...defaultOptions };
    const promiseMap =  await getComponentPromises(tm_components, _options)
    const components = await getThumbmarkData(promiseMap);
    console.log("components", components);
    const thumbmark = hash(JSON.stringify(components))

    return {
        thumbmark: thumbmark,
        components,
        version: getVersion(),
        info: {
            'trust_score': 9,
            'bot_score': 1,
        }
    }
}