import { Synth } from "./Synth"
import { Ball } from "./Ball"
import { Polygon } from "./Polygon"
import { Point, Canvas } from "../Types"
import { Modes, Scales } from "../MusicConstants"

export class SessionState{
    canvas: {
        element: HTMLCanvasElement
        ctx: CanvasRenderingContext2D
        dimensions: Point
        center: Point
        paused: boolean
        fresh: boolean
    }
    placement: {
        lineStart: Point
        lineEnd: Point
        currentlyPlacing: string
        pointerDown: boolean
        snapToGrid: boolean
        roundX: number
        roundY: number
    }
    physics: {
        bounce: number
        gravity: number
    }
    objects: {
        polygons: Polygon[]
        balls: Ball[]
        ballRadius: number
    }
    music: {
        synth: Synth
        bpm: number
        rhythm: number
        graphSize: Point
    }
    constructor(canvas: Canvas){
        this.canvas.element = canvas.source
        this.canvas.ctx = canvas.ctx
        this.canvas.dimensions = {x: window.innerWidth / 2, y: window.innerHeight * 0.75}
        this.canvas.center = {x: Math.floor(this.canvas.dimensions.x / 2), y: Math.floor(this.canvas.dimensions.y / 2)}
        this.placement.lineStart = {x: 0, y: 0}
        this.placement.lineEnd = {x: 0, y: 0}
        this.placement.currentlyPlacing = "ball"
        this.placement.pointerDown = false
        this.canvas.fresh = true
        this.canvas.paused = false
        this.placement.snapToGrid = false
        this.placement.roundX = this.canvas.dimensions.x / 20
        this.placement.roundY = this.canvas.dimensions.y / 20
        this.physics.bounce = 1
        this.objects.ballRadius = ((this.canvas.dimensions.x + this.canvas.dimensions.y) / 2) * 0.01
        this.music.synth = new Synth("A", Modes["major"], Scales["pentatonic"], "sine", [4,5], 0.1, {attack: 0.01, decay: 0.1, sustain: 1, release: 0.5}, null, null)
        this.music.synth.generateNotes()
        this.music.graphSize = {x: this.canvas.dimensions.x * 0.2, y: this.canvas.dimensions.x * 0.1}
    }
    
}