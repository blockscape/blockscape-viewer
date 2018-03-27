// in a similar way to strokeRect on CanvasRenderingContext2D, draw a rectangle with rounded corners
export function strokeRoundedRect(ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    w: number, h: number, 
    r: number) {

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, -Math.PI, -Math.PI / 2);

    ctx.stroke();
}