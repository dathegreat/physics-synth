import { Synth } from "./Synth.js"
import { Ball } from "./Ball.js"
import { Polygon } from "./Polygon.js"
import { Point, Canvas } from "../Types.js"
import { Modes, Scales } from "../MusicConstants.js"
import { Spawner } from "./Spawner.js"

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
        drawnPoints: Point[]
        pointerSpeed: number
        lastPointerPosition: Point
        lastPointerTime: number
        lineThickness: number
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
        spawners: Spawner[]
        spawnersPaused: boolean
        balls: Ball[]
        ballRadius: number
        maximumHitCount: number
    }
    music: {
        synth: Synth
        bpm: number
        bpmIntervalID: number
        rhythm: number
        graphSize: Point
        minimumTriggerVelocity: number
    }
    constructor(canvas: Canvas){
        this.canvas = {
            element : canvas.element,
            ctx : canvas.ctx,
            dimensions : {x: window.innerWidth * 0.6, y: window.innerHeight * 0.75},
            center : {x: Math.floor((window.innerWidth * 0.6) / 2), y: Math.floor((window.innerHeight * 0.75) / 2)},
            fresh: true,
            paused : false
        }
        this.placement = {
            lineStart : {x: 0, y: 0},
            lineEnd : {x: 0, y: 0},
            drawnPoints : [],
            lastPointerPosition: {x:0,y:0},
            pointerSpeed : 0,
            lastPointerTime : 0,
            lineThickness: 10,
            currentlyPlacing : "ball",
            pointerDown : false,
            snapToGrid : false,
            roundX : this.canvas.dimensions.x / 20,
            roundY: this.canvas.dimensions.y / 20
        }
        this.physics = {
            bounce: 1,
            gravity: 250
        }
        this.objects = {
            polygons: new Array<Polygon>,
            balls: new Array<Ball>,
            spawners: new Array<Spawner>,
            spawnersPaused: false,
            ballRadius: ((this.canvas.dimensions.x + this.canvas.dimensions.y) / 2) * 0.01,
            maximumHitCount: Infinity
        }
        this.music = {
            synth: new Synth("A", Modes["major"], Scales["pentatonic"], "sine", [4,5], 0.1, {attack: 0.01, decay: 0.1, sustain: 1, release: 0.5}),
            graphSize: {x: this.canvas.dimensions.x * 0.2, y: this.canvas.dimensions.x * 0.1},
            bpm: 120,
            bpmIntervalID: null,
            rhythm: 1,
            minimumTriggerVelocity: 50
        }

        this.music.synth.generateNotes()
        
    }

    createNewBpmInterval(bpmFunction: any){
        clearInterval(this.music.bpmIntervalID)
        this.music.bpmIntervalID = setInterval(bpmFunction, (60 / this.music.bpm) * 1000 * this.music.rhythm)
    }
    
}