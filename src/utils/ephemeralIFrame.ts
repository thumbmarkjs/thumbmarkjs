export async function ephemeralIFrame(callback: ({ iframe }: { iframe: Document }) => void): Promise<any> {

    while (!document.body) {
      await wait(50)
    }
    const iframe = document.createElement('iframe')
    iframe.setAttribute('frameBorder', '0')

    const style = iframe.style
    style.setProperty('position','fixed');
    style.setProperty('display', 'block', 'important')
    style.setProperty('visibility', 'visible')
    style.setProperty('border', '0');
    style.setProperty('opacity','0');
    
    iframe.src = 'about:blank'
    document.body.appendChild(iframe)
  
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) {
      throw new Error('Iframe document is not accessible');
    }
  
    // Execute the callback function with access to the iframe's document
    callback({ iframe: iframeDocument });
  
    // Clean up after running the callback
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 0);
  }

  export async function runInIframe<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      ephemeralIFrame(({ iframe }) => {
        const iframeWindow = iframe.defaultView;
        const iframeFn = new iframeWindow.Function('return (' + fn.toString() + ')()');
        const result = iframeFn.call(iframeWindow);
        resolve(result);
      });
    });
  }

  export function wait<T = void>(durationMs: number, resolveWith?: T): Promise<T> {
    return new Promise((resolve) => setTimeout(resolve, durationMs, resolveWith))
  }