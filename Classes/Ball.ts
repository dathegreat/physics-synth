import { Drawable, Point } from "../Types"

export class Ball implements Drawable{
    center: Point
    velocity: Point
    acceleration: Point
    radius: number
    color: string
    drawFunction: any

    constructor(center: Point, velocity: Point, acceleration: Point, radius: number, color: string, draw){
        this.center = center
        this.velocity = velocity
        this.acceleration = acceleration
        this.radius = radius
        this.color = color
        this.drawFunction = draw
    }   
	
	getNextPosition(timeDelta: number){
		return {
			x: this.center.x + (this.velocity.x * (timeDelta / 1000)),
			y: this.center.y + (this.velocity.y * (timeDelta / 1000))
		}
	}

    step(timeDelta: number){
		//console.log(Math.sqrt(Math.pow(this.velocity.y, 2) + Math.pow(this.velocity.x, 2)))
        this.center.x += this.velocity.x * (timeDelta / 1000)
        this.center.y += this.velocity.y * (timeDelta / 1000)
        this.velocity.x += this.acceleration.x * (timeDelta / 1000)
        this.velocity.y += this.acceleration.y * (timeDelta / 1000)
    }
	
	unStep(timeDelta: number){
		this.velocity.y -= this.acceleration.y * (timeDelta / 1000)
		this.velocity.x -= this.acceleration.x * (timeDelta / 1000)
		this.center.y -= this.velocity.y * (timeDelta / 1000)
		this.center.x -= this.velocity.x * (timeDelta / 1000)
	}

    draw(){
        this.drawFunction(this)
    }
}