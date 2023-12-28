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
    let dataURL: string = '';
  
    return new Promise((resolve, reject) => {
        if (ctx) {
            // Set canvas dimensions
            canvas.width = 250;
            canvas.height = 50;
        
            // Text with lowercase/uppercase/punctuation symbols
            var txt = "FingerPrint <canvas> 1.0";
    
            // Create a linear gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 10);
    
    //        1. Red 2. Orange 3. Yellow 4. Green 5. Blue 6. Indigo 7. Violet
            // Add three color stops
            gradient.addColorStop(0, "red");
            gradient.addColorStop(1/6, "orange");
            gradient.addColorStop(2/6, "yellow");
            gradient.addColorStop(3/6, "green");
            gradient.addColorStop(4/6, "blue");
            gradient.addColorStop(5/6, "indigo");
            gradient.addColorStop(1, "violet");
    
            ctx.save();
            ctx.rotate(2.123456789 * Math.PI / 180);
    
    
            // Set the fill style and draw a rectangle
            ctx.fillStyle = gradient;
            ctx.fillRect(10, 10, canvas.width, 10);
    
            ctx.textBaseline = "top";
            // The most common type
            ctx.font = "20.3px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(95,1,62,15);
            // Some tricks for color mixing to increase the difference in rendering
            ctx.fillStyle = "#069";
            ctx.fillText(txt, 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText(txt, 4, 17);    // Get the canvas data as a base64-encoded image
            
            txt = `${String.fromCharCode(55357, 56835)}`
    
            ctx.fillText(txt, canvas.width * 4 / 5, canvas.height / 2)
            ctx.restore();
            dataURL = canvas.toDataURL();
            resolve(
                {
                    'dataHash': hash(JSON.stringify(dataURL)).toString(),
                    // 'dataUrl': dataURL
                }
            );
        }
        
        resolve (
            {
                'dataHash': 'unsupported'
            }
        );
    });
}

includeComponent('canvas', generateCanvasFingerprint);