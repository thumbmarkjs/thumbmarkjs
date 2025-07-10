import { componentInterface, includeComponent } from '../../factory';
import { isMobileUserAgent } from '../system/browser';

export default function getScreen(): Promise<componentInterface> {
    return new Promise((resolve) => {
        const result: componentInterface = {
            'is_touchscreen': navigator.maxTouchPoints > 0,
            'maxTouchPoints': navigator.maxTouchPoints,
            'colorDepth': screen.colorDepth,
            'mediaMatches': matchMedias(),
        };
        if (isMobileUserAgent() && navigator.maxTouchPoints > 0) {
            result['resolution'] = screenResolution()
        }
        resolve(result);
    });
}

function screenResolution() {
    const w = window.screen.width;
    const h = window.screen.height;
    const longer = Math.max(w, h).toString();
    const shorter = Math.min(w, h).toString();
    return `${longer}x${shorter}`
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
        'inverted-colors': ['inverted', 'none'],
        'prefers-reduced-motion': ['reduce', 'no-preference'],
        'prefers-reduced-transparency': ['reduce', 'no-preference'],
        'scripting': ['none', 'initial-only', 'enabled'],
        'forced-colors': ['active', 'none'],
      };

    Object.keys(mediaQueries).forEach((key) => {
        mediaQueries[key].forEach((value) => {
            if (matchMedia(`(${key}: ${value})`).matches)
                results.push(`${key}: ${value}`);
        })
    });
    return results;
}