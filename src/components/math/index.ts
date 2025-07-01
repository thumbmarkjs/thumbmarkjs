import { componentInterface, includeComponent } from '../../factory'

const integrate = (f: (x: number) => number, a: number, b: number, n: number): number => {
    const h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const x = a + (i + 0.5) * h;
        sum += f(x);
    }
    return sum * h;
};

export default function getMath(): Promise<componentInterface> {
  return new Promise((resolve) => {
    resolve(
        {
            'acos': Math.acos(0.5),
            'asin': integrate(Math.asin, -1, 1, 97),
            'atan': integrate(Math.atan, -1, 1, 97),
            'cos': integrate(Math.cos, 0, Math.PI, 97),
            'cosh': Math.cosh(9/7),
            'e': Math.E,
            'largeCos': Math.cos(1e20),
            'largeSin': Math.sin(1e20),
            'largeTan': Math.tan(1e20),
            'log': Math.log(1000),
            'pi': Math.PI,
            'sin': integrate(Math.sin, -Math.PI, Math.PI, 97),
            'sinh': integrate(Math.sinh, -9/7, 7/9, 97),
            'sqrt': Math.sqrt(2),
            'tan': integrate(Math.tan, 0, 2 * Math.PI, 97),
            'tanh': integrate(Math.tanh, -9/7, 7/9, 97),
        }
    );
    });
}

includeComponent('math', getMath);