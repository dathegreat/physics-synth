import { Canvas, Color, Drawable, Point } from "../Types.js"
import { vectorMagnitude } from "./Physics.js";

const rotatePointAboutPoint = (p1: Point, p2: Point, angle: number): Point =>{
    const rotatedPoint: Point = { 
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    }
    return rotatedPoint;
}

export const pointsToLines = (points: Point[], closed: boolean): Point[][] =>{
	const lines: Point[][] = []
	for(let i=0; i<points.length-1; i++){
        lines.push( [
			{ x: points[i].x,   y: points[i].y },
			{ x: points[i+1].x, y: points[i+1].y }
		] )
    }
    if(closed){
        lines.push( [
            { x: points[points.length-1].x, y: points[points.length-1].y },
            { x: points[0].x,               y: points[0].y }
        ] )
    }
	return lines
}

export const drawPolygon = (sides: Point[][], canvas: Canvas, fill?: boolean, fillColor?: Color) =>{
    canvas.ctx.beginPath()
    canvas.ctx.moveTo( sides[0][0].x, sides[0][0].y )
    for(let i=0; i<sides.length; i++){
        canvas.ctx.lineTo( sides[i][1].x, sides[i][1].y )
    }
    canvas.ctx.stroke()
    if(fill){ 
        canvas.ctx.fillStyle = fillColor.RGBA
        canvas.ctx.fill()
    }
    canvas.ctx.closePath()
}

export const generatePolygonAtPoint = (center: Point, radius: number, sides: number, rotation: number=0): Point[] =>{
    let polygon: Point[] = []
    const theta: number = ( 2 * Math.PI ) / sides
    for(let i=0; i<sides; i++){
        polygon.push(
            { x: center.x + ( radius * Math.cos( (theta * i) + rotation ) ),
              y: center.y + ( radius * Math.sin( (theta * i) + rotation ) )}
        )
    }
    return polygon
}

export const generateRectangleFromCenterline = (centerLine: Point[], width: number): Polygon =>{
	const vector = {x: centerLine[1].x - centerLine[0].x, y: centerLine[1].y - centerLine[0].y}
	const midpoint = {x: (centerLine[1].x + centerLine[0].x) / 2, y: (centerLine[1].y + centerLine[0].y) / 2}
	const length = vectorMagnitude(vector)
	const unitNormal = {x: -vector.y / length, y: vector.x / length}
	const thicknessVector = {x: unitNormal.x * (width / 2), y: unitNormal.y * (width / 2)}
	const points = [
		{ x: centerLine[0].x + thicknessVector.x, y: centerLine[0].y + thicknessVector.y }, //top left
		{ x: centerLine[0].x - thicknessVector.x, y: centerLine[0].y - thicknessVector.y }, //top right
		{ x: centerLine[1].x - thicknessVector.x, y: centerLine[1].y - thicknessVector.y }, //bottom left
		{ x: centerLine[1].x + thicknessVector.x, y: centerLine[1].y + thicknessVector.y }  //bottom right
	]
	return new Polygon(midpoint, points, {x:0, y:0}, {x:0, y:0}, 0, true)
}

export class Polygon implements Drawable{
    center: Point
	rotationalVelocity: number
    points: Point[]
	sides: Point[][]
    sideLength: number
    closed: boolean

    constructor(center: Point, points: Point[], velocity: Point, acceleration: Point, rotationalVelocity: number, closed: boolean){
        this.center = center;
		this.rotationalVelocity = rotationalVelocity
        this.points = points
		this.sides = pointsToLines(this.points, closed)
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2) )
        this.closed = closed
    }

	step(timeDelta: number){
		if(this.rotationalVelocity < 0 || this.rotationalVelocity > 0){
			this.rotate(this.rotationalVelocity * timeDelta / 1000)
		}
	}
	
    rotate(angle: number){
        this.points = this.points.map( (point)=> { return rotatePointAboutPoint(point, this.center, angle)} )
		this.sides = pointsToLines(this.points, this.closed)
    }

    draw(canvas: Canvas){
        drawPolygon(this.sides, canvas)
    }
}