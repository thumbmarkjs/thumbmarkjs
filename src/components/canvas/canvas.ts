import { componentInterface, includeComponent } from '../../factory'
import { hash } from '../../utils/hash'

/**
 * A simple canvas finger printing function
 * 
 * @returns a CanvasInfo JSON object
 */


export default function generateCanvasFingerprint(): Promise<componentInterface> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    return new Promise((resolve, reject) => {
        // this test is required to check that the image is the same always
        const dataURL1 = generateCanvasDataURL();
        const dataURL2 = generateCanvasDataURL();

        if (dataURL1 == dataURL2) {
            resolve(
                {
                    'dataHash': hash(dataURL1).toString(),
                }
            )
        }
        resolve (
            {
                'dataHash': 'unsupported'
            }
        );
    });
}

function generateCanvasDataURL(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return "unsupported";
    }

    // Set canvas dimensions
    canvas.width = 280;
    canvas.height = 20;

    // Create rainbow gradient for the background rectangle
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(1/6, "orange");
    gradient.addColorStop(2/6, "yellow");
    gradient.addColorStop(3/6, "green");
    gradient.addColorStop(4/6, "blue");
    gradient.addColorStop(5/6, "indigo");
    gradient.addColorStop(1, "violet");

    // Draw background rectangle with the rainbow gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some random text
    const randomText = 'Random Text WMwmil10Oo';
    ctx.font = '23.123px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(randomText, -5, 15);

    // Draw the same text with an offset, different color, and slight transparency
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.fillText(randomText, -3.3, 17.7);

    // Draw a line crossing the image at an arbitrary angle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width * 2/7, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Return data URL of the canvas
    return canvas.toDataURL();
}

includeComponent('canvas', generateCanvasFingerprint);