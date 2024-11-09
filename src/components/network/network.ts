import { componentInterface, includeComponent } from '../../factory';

async function getNetworkInfo(): Promise<componentInterface> {
    return new Promise(async (resolve) => {
        try {
            // Try icanhazip.com first
            const ip = await fetchIP('https://ipv4.icanhazip.com/')
                .catch(() => fetchIP('https://api.ipify.org/')); // Fallback to ipify

            resolve({
                'ip': ip || 'unknown'
            });
        } catch (error) {
            resolve({
                'ip': 'unknown'
            });
        }
    });
}

async function fetchIP(url: string): Promise<string> {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain'
        }
    });
    
    if (!response.ok) {
        throw new Error('IP fetch failed');
    }
    
    const ip = await response.text();
    // Clean up the response - remove any whitespace/newlines
    return ip.trim();
}

includeComponent('network', getNetworkInfo);