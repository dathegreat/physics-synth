export interface Canvas{
    source: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

export interface Point{
    x: number;
    y: number;
}

export interface Drawable{
	draw(): void;
}

export interface Envelope{
    attack: number
    decay: number
    sustain: number
    release: number
}
