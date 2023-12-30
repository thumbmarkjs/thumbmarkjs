import { componentInterface, includeComponent } from '../../factory'

function getLocales(): Promise<componentInterface> {
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

  includeComponent('locales', getLocales);