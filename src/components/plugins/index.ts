import { componentInterface} from '../../factory'

export default async function getPlugins(): Promise<componentInterface | null> {

  const plugins: string[] = [];

  if (navigator.plugins) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push([plugin.name, plugin.filename, plugin.description ].join("|"));
    }
  }

  return new Promise((resolve) => {
    resolve(
      {
        'plugins': plugins
      }
    );
});
}