import { componentInterface, includeComponent } from '../../factory'

function getLocales(): Promise<componentInterface> {
  return new Promise((resolve) => {
    resolve(
      {
        'languages': getUserLanguages(),
        'timezone': getUserTimezone()
      });
    });
}

function getUserLanguages(): string[] {
    const userLanguages: string[] = [];
  
    if (navigator.languages) {
      userLanguages.push(...navigator.languages);
    } else if (navigator.language) {
      userLanguages.push(navigator.language);
    }
  
    return userLanguages;
  }

  function getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  includeComponent('locales', getLocales);