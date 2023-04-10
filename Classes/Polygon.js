"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Polygon = void 0;
var rotatePointAboutPoint = function (p1, p2, angle) {
    var rotatedPoint = {
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    };
    return rotatedPoint;
};
var pointsToLines = function (points) {
    var lines = [];
    for (var i = 0; i < points.length - 1; i++) {
        lines.push([
            { x: points[i].x, y: points[i].y },
            { x: points[i + 1].x, y: points[i + 1].y }
        ]);
    }
    lines.push([
        { x: points[points.length - 1].x, y: points[points.length - 1].y },
        { x: points[0].x, y: points[0].y }
    ]);
    return lines;
};
var Polygon = /** @class */ (function () {
    function Polygon(center, points, velocity, acceleration, rotationalVelocity, drawFunction) {
        this.center = center;
        this.rotationalVelocity = rotationalVelocity;
        this.points = points;
        this.sides = pointsToLines(this.points);
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2));
    }
    Polygon.prototype.step = function (timeDelta) {
        if (this.rotationalVelocity < 0 || this.rotationalVelocity > 0) {
            this.rotate(this.rotationalVelocity * timeDelta / 1000);
        }
    };
    Polygon.prototype.rotate = function (angle) {
        var _this = this;
        this.points = this.points.map(function (point) { return rotatePointAboutPoint(point, _this.center, angle); });
        this.sides = pointsToLines(this.points);
    };
    Polygon.prototype.draw = function () {
        this.drawFunction(this);
    };
    return Polygon;
}());
exports.Polygon = Polygon;
