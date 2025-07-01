import getAudio from "./audio";
import getCanvas from "./canvas";
import getFonts from "./fonts";
import getHardware from "./hardware";
import getLocales from "./locales";
import getMath from "./math";
import getPermissions from "./permissions";
import getPlugins from "./plugins";
import getScreen from "./screen";
import getSystem from "./system";
import getWebGL from "./webgl";

/**
 * @description key->function map of components. At this point, it's important to not call the function
 * but just pass the function in the map. Calling it will happen when the thumbmark is generated.
 */
const tm_components = {
    'audio': getAudio,
    'canvas': getCanvas,
    'fonts': getFonts,
    'hardware': getHardware,
    'locales': getLocales,
    'math': getMath,
    'permissions': getPermissions,
    'plugins': getPlugins,
    'screen': getScreen,
    'system': getSystem,
    'webgl': getWebGL
}

export default tm_components;