import { Point } from "../Types.js"
import { Ball } from "./Ball.js"
import { Polygon } from "./Polygon.js";
import { SessionState } from "./SessionState.js";


export const vectorMagnitude = (v: Point): number =>{
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2))
}

export const dotProduct = (v1: Point, v2: Point): number =>{
    return (v1.x * v2.x) + (v1.y * v2.y)
}

export class Physics{

    collisionBallPoint(ball: Ball, point: Point): boolean{
        const distance = vectorMagnitude({x: ball.center.x - point.x, y: ball.center.y - point.y})
        return distance <= ball.radius
    }
    
    collisionBallSides(ball: Ball, polygon: Polygon): boolean | Point[]{
        for(let i=0; i<polygon.sides.length; i++){
            if( this.collisionBallPoint(ball, polygon.sides[i][0]) || this.collisionBallPoint(ball, polygon.sides[i][1]) ){ 
                return polygon.sides[i];
            }
            if( this.collisionBallLine(ball, polygon.sides[i], polygon.sideLength) ){
                return polygon.sides[i];
            }
        }
        return false
    }
    
    collisionBallLine(ball: Ball, line: Point[], lineLength: number): boolean{
        const x1 = line[0].x
        const x2 = line[1].x
        const y1 = line[0].y
        const y2 = line[1].y
        const cx = ball.center.x
        const cy = ball.center.y
        const ballDotSide = ( ((cx - x1) * (x2 - x1)) + ((cy - y1) * (y2 - y1)) ) / Math.pow(lineLength, 2)
        const closestX = x1 + (ballDotSide * (x2 - x1))
        const closestY = y1 + (ballDotSide * (y2 - y1))
        //if ball is not near line segment, it can't collide
        const d1 = vectorMagnitude({x: closestX - x1, y: closestY - y1});
        const d2 = vectorMagnitude({x: closestX - x2, y: closestY - y2});
        const precision = 0.1;
        if ( !(d1 + d2 >= lineLength - precision && d1 + d2 <= lineLength + precision) ){
            return false
        }
        //if ball is closer than radius, it has collided
        const distanceX = closestX - cx
        const distanceY = closestY - cy
        const distance = vectorMagnitude({x: distanceX, y: distanceY})
        if( distance <= ball.radius ){
            return true
        }
        return false;
    }
    
    collisionLineLine(line1: Point[], line2: Point[]): boolean | Point{
        const x1 = line1[0].x
        const x2 = line1[1].x
        const x3 = line2[0].x
        const x4 = line2[1].x
        const y1 = line1[0].y
        const y2 = line1[1].y
        const y3 = line2[0].y
        const y4 = line2[1].y
        // calculate the distance to intersection point
        const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
        const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
        // if uA and uB are between 0-1, lines are colliding
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            const intersectionX = x1 + (uA * (x2-x1));
            const intersectionY = y1 + (uA * (y2-y1));
    
            return {x: intersectionX, y: intersectionY};
        }
        return false;
    }
    
    calculateBounce(ball: Ball, vector: Point, state: SessionState): Point{
        const lineNormal: Point = {x: -vector.y, y: vector.x}
        const normalMagnitude: number = vectorMagnitude(lineNormal)
        const unitNormal: Point = {x: lineNormal.x / normalMagnitude, y: lineNormal.y / normalMagnitude}
        const ballDotNormal: number = dotProduct(ball.velocity, unitNormal)
        const normalScaler: number = 2 * ballDotNormal
        const reflection: Point = {
            x: (ball.velocity.x - (normalScaler * unitNormal.x)) * 1 / state.physics.bounce, 
            y: (ball.velocity.y - (normalScaler * unitNormal.y)) * 1 / state.physics.bounce
        }
        return reflection
    }
    
    testCollisionContinuous(ball: Ball, sides: Point[][], timeDelta: number): boolean | Point[]{
        const newPosition = ball.getNextPosition(timeDelta)
        const velocityMagnitude = vectorMagnitude(ball.velocity)
        const ballDirection = {x: ball.velocity.x / velocityMagnitude, y: ball.velocity.y / velocityMagnitude }
        const line1 = [
            {x: ball.center.x - (ballDirection.x * ball.radius), y: ball.center.y - (ballDirection.y * ball.radius)},
            {x: newPosition.x + (ballDirection.x * ball.radius), y: newPosition.y + (ballDirection.y * ball.radius)}
        ]
        for(let i=0; i<sides.length; i++){
            const line2 = sides[i]
            const collisionPoint = this.collisionLineLine(line1, line2)
            
            if( collisionPoint ){
                return sides[i]
            }
        }
        return false
    }
    
    testGlobalCollision(ball: Ball, polygons: Polygon[], timeDelta: number, state: SessionState): boolean | Point[]{
        let collision = false;
        for(let i=0; i<state.objects.polygons.length; i++){
            const potentialCollision = this.testCollisionContinuous(ball, state.objects.polygons[i].sides, timeDelta)
            if(potentialCollision){
                return potentialCollision
            }
        }
        return collision
    }

}