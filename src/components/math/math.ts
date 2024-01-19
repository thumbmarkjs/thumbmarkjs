import { componentInterface, includeComponent } from '../../factory'

const getMathInfo = async (): Promise<componentInterface> => {
    const x = 1e10
    const y = 1e-10
    const angle = Math.PI / 4
    const value = 0.5
    return {
        pi: Math.PI,
        e: Math.E,
        difference: x - y - x,
        log: Math.log(1000),
        sin: Math.sin(angle),
        cos: Math.cos(angle),
        tan: Math.tan(angle),
        asin: Math.asin(value),
        acos: Math.acos(value),
        atan: Math.atan(value),
        largeSin: Math.sin(1e20),
        largeCos: Math.cos(1e20),
        largeTan: Math.tan(1e20),
        exp: Math.exp(1000),
        integral: integrate(Math.sin, 0, Math.PI, 1000)
    }
}

const integrate = (f: (x: number) => number, a: number, b: number, n: number): number => {
    const h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const x = a + (i + 0.5) * h;
        sum += f(x);
    }
    return sum * h;
};

includeComponent('math', getMathInfo);