const drawBall = (ball, canvas) => {
    canvas.ctx.fillStyle = ball.color;
    canvas.ctx.beginPath();
    canvas.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2);
    canvas.ctx.closePath();
    canvas.ctx.fill();
};
export const generateBalls = (amount, centers, velocity, acceleration, radius, color) => {
    const balls = [];
    for (let i = 0; i < amount; i++) {
        const ball = new Ball(centers[i], velocity, acceleration, radius, color);
        balls.push(ball);
    }
    return balls;
};
export class Ball {
    constructor(center, velocity, acceleration, radius, color) {
        this.center = center;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.radius = radius;
        this.color = color;
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
    draw(canvas) {
        drawBall(this, canvas);
    }
}
//# sourceMappingURL=Ball.js.map