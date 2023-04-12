import { vectorMagnitude } from "./Physics.js";
const rotatePointAboutPoint = (p1, p2, angle) => {
    const rotatedPoint = {
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    };
    return rotatedPoint;
};
const pointsToLines = (points, closed) => {
    const lines = [];
    for (let i = 0; i < points.length - 1; i++) {
        lines.push([
            { x: points[i].x, y: points[i].y },
            { x: points[i + 1].x, y: points[i + 1].y }
        ]);
    }
    if (closed) {
        lines.push([
            { x: points[points.length - 1].x, y: points[points.length - 1].y },
            { x: points[0].x, y: points[0].y }
        ]);
    }
    return lines;
};
const drawPolygon = (polygon, canvas) => {
    canvas.ctx.beginPath();
    for (let i = 0; i < polygon.sides.length; i++) {
        canvas.ctx.moveTo(polygon.sides[i][0].x, polygon.sides[i][0].y);
        canvas.ctx.lineTo(polygon.sides[i][1].x, polygon.sides[i][1].y);
    }
    canvas.ctx.stroke();
    canvas.ctx.closePath();
};
export const generatePolygonAtPoint = (center, radius, sides, rotation = 0) => {
    let polygon = [];
    const theta = (2 * Math.PI) / sides;
    for (let i = 0; i < sides; i++) {
        polygon.push({ x: center.x + (radius * Math.cos((theta * i) + rotation)),
            y: center.y + (radius * Math.sin((theta * i) + rotation)) });
    }
    return polygon;
};
export const generateRectangleFromCenterline = (centerLine, width) => {
    const vector = { x: centerLine[1].x - centerLine[0].x, y: centerLine[1].y - centerLine[0].y };
    const midpoint = { x: (centerLine[1].x + centerLine[0].x) / 2, y: (centerLine[1].y + centerLine[0].y) / 2 };
    const length = vectorMagnitude(vector);
    const unitNormal = { x: -vector.y / length, y: vector.x / length };
    const thicknessVector = { x: unitNormal.x * (width / 2), y: unitNormal.y * (width / 2) };
    const points = [
        { x: centerLine[0].x + thicknessVector.x, y: centerLine[0].y + thicknessVector.y },
        { x: centerLine[0].x - thicknessVector.x, y: centerLine[0].y - thicknessVector.y },
        { x: centerLine[1].x - thicknessVector.x, y: centerLine[1].y - thicknessVector.y },
        { x: centerLine[1].x + thicknessVector.x, y: centerLine[1].y + thicknessVector.y } //bottom right
    ];
    return new Polygon(midpoint, points, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, true);
};
export class Polygon {
    constructor(center, points, velocity, acceleration, rotationalVelocity, closed) {
        this.center = center;
        this.rotationalVelocity = rotationalVelocity;
        this.points = points;
        this.sides = pointsToLines(this.points, closed);
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2));
        this.closed = closed;
    }
    step(timeDelta) {
        if (this.rotationalVelocity < 0 || this.rotationalVelocity > 0) {
            this.rotate(this.rotationalVelocity * timeDelta / 1000);
        }
    }
    rotate(angle) {
        this.points = this.points.map((point) => { return rotatePointAboutPoint(point, this.center, angle); });
        this.sides = pointsToLines(this.points, this.closed);
    }
    draw(canvas) {
        drawPolygon(this, canvas);
    }
}
//# sourceMappingURL=Polygon.js.map