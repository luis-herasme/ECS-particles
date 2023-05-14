export class Painter {
  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    this.canvas = canvas;

    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      throw new Error("Could not get canvas context");
    }

    this.context = ctx;
  }

  public circle(x: number, y: number, radius: number, color: string) {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
  }

  public clear(clearColor: string = "rgba(0,0,0,0.3)") {
    this.context.fillStyle = clearColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
