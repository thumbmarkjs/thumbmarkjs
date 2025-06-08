export async function ephemeralIFrame(callback: ({ iframe }: { iframe: Document }) => void): Promise<any> {
    while (!document.body) {
      await wait(5)
    }
    const iframe = document.createElement('iframe')
    iframe.src = 'about:blank'
    iframe.sandbox = 'allow-scripts allow-same-origin'
    iframe.setAttribute('frameBorder', '0')
    

    const style = iframe.style
    style.setProperty('position','fixed');
    style.setProperty('display', 'block', 'important')
    style.setProperty('visibility', 'visible')
    style.setProperty('border', '0');
    style.setProperty('opacity','0');
    
    
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

  export async function runInIframe<T>(fn: (params: T) => any, params: T): Promise<any> {
  return new Promise((resolve, reject) => {
    ephemeralIFrame(({ iframe }) => {
      if (!iframe) {
        return reject(new Error("Iframe is not accessible"));
      }
      
      iframe.onerror = () => {
        console.error("Error loading iframe");
        reject(new Error("Error loading iframe"));
      };

      iframe.onload = () => {
        console.log("Iframe content loaded");
      };
      const iframeWindow = iframe.defaultView;
      if (!iframeWindow) {
        return reject(new Error("Iframe window is not accessible"));
      }

      try {
        const iframeFn = new iframeWindow.Function('return (' + fn.toString() + ')(' + JSON.stringify(params) + ')');
        const result = iframeFn.call(iframeWindow);
        resolve(result);
      } catch (error) {
        console.error("Error executing function in iframe:", error);
        reject(error);
      }

    });
  });
}

  export function wait<T = void>(durationMs: number, resolveWith?: T): Promise<T> {
    return new Promise((resolve) => setTimeout(resolve, durationMs, resolveWith))
  }