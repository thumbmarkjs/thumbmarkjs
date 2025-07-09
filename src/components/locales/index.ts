import { componentInterface, includeComponent } from '../../factory'

export default function getLocales(): Promise<componentInterface> {
  return new Promise((resolve) => {
    resolve(
      {
        'languages': getUserLanguage(),
        'timezone': getUserTimezone()
      });
    });
}

function getUserLanguage(): string {
    const userLanguages: string[] = [];

    return navigator.language;
  }

  function getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }