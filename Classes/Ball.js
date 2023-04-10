"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ball = void 0;
var Ball = /** @class */ (function () {
    function Ball(center, velocity, acceleration, radius, color, draw) {
        this.center = center;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.radius = radius;
        this.color = color;
        this.drawFunction = draw;
    }
    Ball.prototype.getNextPosition = function (timeDelta) {
        return {
            x: this.center.x + (this.velocity.x * (timeDelta / 1000)),
            y: this.center.y + (this.velocity.y * (timeDelta / 1000))
        };
    };
    Ball.prototype.step = function (timeDelta) {
        //console.log(Math.sqrt(Math.pow(this.velocity.y, 2) + Math.pow(this.velocity.x, 2)))
        this.center.x += this.velocity.x * (timeDelta / 1000);
        this.center.y += this.velocity.y * (timeDelta / 1000);
        this.velocity.x += this.acceleration.x * (timeDelta / 1000);
        this.velocity.y += this.acceleration.y * (timeDelta / 1000);
    };
    Ball.prototype.unStep = function (timeDelta) {
        this.velocity.y -= this.acceleration.y * (timeDelta / 1000);
        this.velocity.x -= this.acceleration.x * (timeDelta / 1000);
        this.center.y -= this.velocity.y * (timeDelta / 1000);
        this.center.x -= this.velocity.x * (timeDelta / 1000);
    };
    Ball.prototype.draw = function () {
        this.drawFunction(this);
    };
    return Ball;
}());
exports.Ball = Ball;
