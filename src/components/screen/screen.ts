import { componentInterface, includeComponent } from '../../factory';

function screenDetails(): Promise<componentInterface> {
    return new Promise((resolve) => {
        resolve(
            {
                'is_touchscreen': navigator.maxTouchPoints > 0,
                'maxTouchPoints': navigator.maxTouchPoints,
                'width': screen.width,
                'height': screen.height,
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
        'color-gamut': ['rec2020', 'p3', 'srgb'],
        'dynamic-range': ['high', 'standard'],
        'video-dynamic-range': ['high', 'standard'],
        'any-hover': ['hover', 'none'],
        'any-pointer': ['none', 'coarse', 'fine'],
        'pointer': ['none', 'coarse', 'fine'],
        'hover': ['hover', 'none'],
        'update': ['fast', 'slow'],
        'overflow-block': ['scroll', 'none', 'optional-paged', 'paged'],
        'overflow-inline': ['scroll', 'none'],
        'color': ['8', '16', '256'],
        'inverted-colors': ['inverted', 'none'],
        'prefers-reduced-motion': ['reduce', 'no-preference'],
        'prefers-reduced-transparency': ['reduce', 'no-preference'],
        'grid': ['0', '1'],
        'scripting': ['none', 'initial-only', 'enabled'],
        'forced-colors': ['active', 'none'],
        'display-mode': ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
        'aspect-ratio': ['1/1', '16/9', '16/10', '4/3'],
//        'resolution': ['300dpi', '2dppx', '3dppx'],
        'prefers-color-scheme': ['dark', 'light', 'no-preference'],
//        'overflow': ['auto', 'hidden'],
//        'transform-3d': ['0', '1'],
        'device-aspect-ratio': ['1/1', '16/9', '16/10', '4/3'],
//        'device-height': ['640px', '768px', '1024px'],
//        'device-width': ['320px', '360px', '375px'],
//        'forced-color-adjust': ['none', 'auto'],
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