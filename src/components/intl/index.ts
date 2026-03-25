import { componentInterface } from '../../factory';

export default async function getIntl(): Promise<componentInterface | null> {
  if (typeof Intl === 'undefined') {
    return null;
  }

  try {
    const date = new Date(Date.UTC(2024, 0, 15, 12, 30, 45));

    const result: componentInterface = {
      dateFullFormat: new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' } as any).format(date),
      dateMediumFormat: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' } as any).format(date),
      timeFormat: new Intl.DateTimeFormat('en-US', { timeStyle: 'long', timeZone: 'UTC' } as any).format(date),
      numberFormat: new Intl.NumberFormat('en-US').format(123456.789),
      currencyFormat: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(123456.789),
      percentFormat: new Intl.NumberFormat('en-US', { style: 'percent' }).format(0.456),
      nonLatinDate: new Intl.DateTimeFormat('ar-EG', { timeZone: 'UTC' }).format(date),
      nonLatinNumber: new Intl.NumberFormat('zh-Hans-CN-u-nu-hanidec').format(123456.789),
    };

    const IntlAny = Intl as any;

    if (typeof IntlAny.ListFormat === 'function') {
      result.listFormat = new IntlAny.ListFormat('en', { type: 'conjunction' }).format(['a', 'b', 'c']);
    }

    if (typeof IntlAny.DisplayNames === 'function') {
      result.displayNames = new IntlAny.DisplayNames('en', { type: 'region' }).of('US') || '';
    }

    return result;
  } catch {
    return null;
  }
}
