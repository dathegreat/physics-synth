export class Ball {
    constructor(center, velocity, acceleration, radius, color, drawFunction) {
        this.center = center;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.radius = radius;
        this.color = color;
        this.drawFunction = drawFunction;
    }
    getNextPosition(timeDelta) {
        return {
            x: this.center.x + (this.velocity.x * (timeDelta / 1000)),
            y: this.center.y + (this.velocity.y * (timeDelta / 1000))
        };
    }
    step(timeDelta) {
        //console.log(Math.sqrt(Math.pow(this.velocity.y, 2) + Math.pow(this.velocity.x, 2)))
        this.center.x += this.velocity.x * (timeDelta / 1000);
        this.center.y += this.velocity.y * (timeDelta / 1000);
        this.velocity.x += this.acceleration.x * (timeDelta / 1000);
        this.velocity.y += this.acceleration.y * (timeDelta / 1000);
    }
    unStep(timeDelta) {
        this.velocity.y -= this.acceleration.y * (timeDelta / 1000);
        this.velocity.x -= this.acceleration.x * (timeDelta / 1000);
        this.center.y -= this.velocity.y * (timeDelta / 1000);
        this.center.x -= this.velocity.x * (timeDelta / 1000);
    }
    draw() {
        this.drawFunction(this);
    }
}
//# sourceMappingURL=Ball.js.map