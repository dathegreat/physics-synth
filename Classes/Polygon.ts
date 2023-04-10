import { Drawable, Point } from "../Types"

const rotatePointAboutPoint = (p1: Point, p2: Point, angle: number): Point =>{
    const rotatedPoint: Point = { 
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    }
    return rotatedPoint;
}

const pointsToLines = (points: Point[]): Point[][] =>{
	const lines: Point[][] = []
	for(let i=0; i<points.length-1; i++){
        lines.push( [
			{ x: points[i].x,   y: points[i].y },
			{ x: points[i+1].x, y: points[i+1].y }
		] )
    }
    lines.push( [
		{ x: points[points.length-1].x, y: points[points.length-1].y },
		{ x: points[0].x,               y: points[0].y }
	] )
	return lines
}

export class Polygon implements Drawable{
    center: Point
	rotationalVelocity: number
    points: Point[]
	sides: Point[][]
    sideLength: number
    drawFunction: any

    constructor(center: Point, points: Point[], velocity: Point, acceleration: Point, rotationalVelocity: number, drawFunction){
        this.center = center;
		this.rotationalVelocity = rotationalVelocity
        this.points = points
		this.sides = pointsToLines(this.points)
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2) )
    }

	step(timeDelta: number){
		if(this.rotationalVelocity < 0 || this.rotationalVelocity > 0){
			this.rotate(this.rotationalVelocity * timeDelta / 1000)
		}
	}
	
    rotate(angle: number){
        this.points = this.points.map( (point)=> {return rotatePointAboutPoint(point, this.center, angle)} )
		this.sides = pointsToLines(this.points)
    }

    draw(){
        this.drawFunction(this)
    }
}