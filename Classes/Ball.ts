import { Canvas, Drawable, Point, Color } from "../Types.js"
import { getNextColor } from "./Colors.js"

const drawBall = (ball: Ball, canvas: Canvas) =>{
    canvas.ctx.fillStyle = `rgba(${ball.color.RGBA})`
    canvas.ctx.strokeStyle = "black"
    canvas.ctx.beginPath()
    canvas.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2)
    canvas.ctx.closePath()
    canvas.ctx.stroke()
    canvas.ctx.fill()
}

export const generateBalls = (amount: number, centers: Point[], velocity: Point, acceleration: Point, radius: number, color: Color ): Ball[] =>{
    const balls: Ball[] = []
    for(let i=0; i<amount; i++){
        const ball: Ball = new Ball(centers[i], velocity, acceleration, radius, color)
        balls.push(ball)
    }
    return balls
}

export class Ball implements Drawable{
    center: Point
    velocity: Point
    acceleration: Point
    radius: number
    color: Color
    hitCount: number

    constructor(center: Point, velocity: Point, acceleration: Point, radius: number, color?: Color){
        this.center = center
        this.velocity = velocity
        this.acceleration = acceleration
        this.radius = radius
        this.color = color ? color : getNextColor()
        this.hitCount = 0
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

    draw(canvas: Canvas){
        drawBall(this, canvas)
    }
}