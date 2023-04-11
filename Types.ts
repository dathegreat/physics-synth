export interface Canvas{
    element: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    dimensions: Point
    center: Point
    paused: boolean
    fresh: boolean
}

export interface Point{
    x: number;
    y: number;
}

export interface Drawable{
	draw(canvas: Canvas): void;
}

export interface Envelope{
    attack: number
    decay: number
    sustain: number
    release: number
}
