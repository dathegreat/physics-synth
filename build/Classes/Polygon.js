const rotatePointAboutPoint = (p1, p2, angle) => {
    const rotatedPoint = {
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    };
    return rotatedPoint;
};
const pointsToLines = (points) => {
    const lines = [];
    for (let i = 0; i < points.length - 1; i++) {
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
export class Polygon {
    constructor(center, points, velocity, acceleration, rotationalVelocity, drawFunction) {
        this.center = center;
        this.rotationalVelocity = rotationalVelocity;
        this.points = points;
        this.sides = pointsToLines(this.points);
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2));
        this.drawFunction = drawFunction;
    }
    step(timeDelta) {
        if (this.rotationalVelocity < 0 || this.rotationalVelocity > 0) {
            this.rotate(this.rotationalVelocity * timeDelta / 1000);
        }
    }
    rotate(angle) {
        this.points = this.points.map((point) => { return rotatePointAboutPoint(point, this.center, angle); });
        this.sides = pointsToLines(this.points);
    }
    draw() {
        this.drawFunction(this);
    }
}
//# sourceMappingURL=Polygon.js.map