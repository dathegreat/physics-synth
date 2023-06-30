import { Canvas, Drawable, Point, Color } from "../Types"
import { Ball } from "./Ball"
import { getRandomColor } from "./Colors"
import { randInt } from "./Math"
import { generatePolygonAtPoint, drawPolygon, pointsToLines } from "./Polygon"
import { SessionState } from "./SessionState"

export class Spawner implements Drawable{
    center: Point
    sides: Point[][]
    radius: number
    color: Color

    constructor(center: Point, radius: number){
        const polygonPoints = generatePolygonAtPoint(center, radius, 4, Math.PI / 4)
        this.sides = pointsToLines(polygonPoints, true)
        this.center = center
        this.radius = radius
        this.color = getRandomColor()
    }
    
    draw(canvas: Canvas): void {
        drawPolygon(this.sides, canvas, true, this.color)
    }

    spawn(state: SessionState){
        const ball: Ball = new Ball(
            {...this.center}, 
            {x:0,y:0}, 
            {x:0,y:state.physics.gravity}, 
            state.objects.ballRadius, 
            state.music.synth.getRandomNote()
        )
        state.objects.balls.push(ball)
    }

}