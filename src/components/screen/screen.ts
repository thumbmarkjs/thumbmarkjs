import { componentInterface, includeComponent } from '../../factory';

function screenDetails(): Promise<componentInterface> {
    return new Promise((resolve) => {
        resolve(
            {
                'is_touchscreen': navigator.maxTouchPoints > 0,
                'maxTouchPoints': navigator.maxTouchPoints,
                'colorDepth': screen.colorDepth,
                'mediaMatches': matchMedias(),
            }
        );
    });
}

function matchMedias(): string[] {
    let results: string[] = [];

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries
     */

    const mediaQueries: { [k: string]: string[] } = {
        'prefers-contrast': ['high', 'more', 'low', 'less', 'forced', 'no-preference'],
        'any-hover': ['hover', 'none'],
        'any-pointer': ['none', 'coarse', 'fine'],
        'pointer': ['none', 'coarse', 'fine'],
        'hover': ['hover', 'none'],
        'update': ['fast', 'slow'],
        'color': ['8', '16', '256'],
        'inverted-colors': ['inverted', 'none'],
        'prefers-reduced-motion': ['reduce', 'no-preference'],
        'prefers-reduced-transparency': ['reduce', 'no-preference'],
        'scripting': ['none', 'initial-only', 'enabled'],
        'forced-colors': ['active', 'none'],
        'prefers-color-scheme': ['dark', 'light', 'no-preference'],
      };

    Object.keys(mediaQueries).forEach((key) => {
        mediaQueries[key].forEach((value) => {
            if (matchMedia(`(${key}: ${value})`).matches)
                results.push(`${key}: ${value}`);
        })
    });
    return results;
}

includeComponent('screen', screenDetails);