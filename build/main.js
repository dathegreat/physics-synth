//TODO: add symmetry mode to ball placement, mirrored across center x or y axis
//TODO: add custom selection to scale, upon selecting "custom" another option box appears with scale selection features
//TODO: Make snap to grid a regular checkbox
import { Polygon } from "./Classes/Polygon.js";
import { SessionState } from "./Classes/SessionState.js";
import { Ball } from "./Classes/Ball.js";
import { Modes, Scales, KeyToTonic } from "./MusicConstants.js";
let state;
const generatePolygonAtPoint = (center, radius, sides, rotation = 0) => {
    let polygon = [];
    const theta = (2 * Math.PI) / sides;
    for (let i = 0; i < sides; i++) {
        polygon.push({ x: center.x + (radius * Math.cos((theta * i) + rotation)),
            y: center.y + (radius * Math.sin((theta * i) + rotation)) });
    }
    return polygon;
};
const drawADSR = (center, size, ADSR) => {
    const padding = 0.9;
    const halfHeight = size.y / 2;
    const halfWidth = size.x / 2;
    const leftCorner = { x: center.x - (halfWidth * padding), y: center.y - (halfHeight * padding) };
    const rightCorner = { x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding) };
    const totalDuration = ADSR.attack + ADSR.decay + ADSR.release;
    //normalize each segment width to percentage of graph width
    const normA = (ADSR.attack / totalDuration) * (size.x * padding);
    const normD = (ADSR.decay / totalDuration) * (size.x * padding);
    const normR = (ADSR.release / totalDuration) * (size.x * padding);
    //draw outline
    state.canvas.ctx.beginPath();
    state.canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    state.canvas.ctx.stroke();
    //draw graph
    state.canvas.ctx.moveTo(leftCorner.x, rightCorner.y);
    state.canvas.ctx.lineTo(leftCorner.x + normA, leftCorner.y);
    state.canvas.ctx.lineTo(leftCorner.x + normA + normD, (rightCorner.y) - (size.y * padding * ADSR.sustain));
    state.canvas.ctx.lineTo(rightCorner.x, rightCorner.y);
    state.canvas.ctx.stroke();
    state.canvas.ctx.closePath();
};
const drawFilter = (center, size, cutoff, qValue) => {
    const padding = 0.9;
    const halfHeight = size.y / 2;
    const halfWidth = size.x / 2;
    const leftCorner = { x: center.x - (halfWidth), y: center.y - (halfHeight * padding) + qValue };
    const rightCorner = { x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding) };
    const sqrtFrequency = Math.sqrt(cutoff);
    const maxFrequency = 142; //sqrt of 20,000Hz 
    //normalize each segment width to percentage of graph width
    const normCutoff = (sqrtFrequency / maxFrequency) * size.x;
    const normQ = (qValue / 100) * size.y;
    //value at which volume is ~0
    const trueCutoff = normCutoff * 2;
    //clip output to bounding rect
    state.canvas.ctx.save();
    state.canvas.ctx.beginPath();
    state.canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    state.canvas.ctx.clip();
    //draw outline
    state.canvas.ctx.beginPath();
    state.canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    state.canvas.ctx.stroke();
    //draw graph
    state.canvas.ctx.moveTo(leftCorner.x, leftCorner.y + normQ);
    state.canvas.ctx.lineTo(leftCorner.x + normCutoff, leftCorner.y + normQ);
    state.canvas.ctx.quadraticCurveTo(leftCorner.x + normCutoff + (trueCutoff / 4) - normQ, leftCorner.y - normQ, leftCorner.x + trueCutoff, rightCorner.y);
    state.canvas.ctx.stroke();
    state.canvas.ctx.closePath();
    //remove clipping path from future drawings
    state.canvas.ctx.restore();
};
const drawPolygon = (polygon) => {
    state.canvas.ctx.beginPath();
    for (let i = 0; i < polygon.sides.length; i++) {
        state.canvas.ctx.moveTo(polygon.sides[i][0].x, polygon.sides[i][0].y);
        state.canvas.ctx.lineTo(polygon.sides[i][1].x, polygon.sides[i][1].y);
    }
    state.canvas.ctx.stroke();
    state.canvas.ctx.closePath();
};
const normalize = (value, min, max) => {
    return (value - min) / (max - min);
};
const drawBall = (ball) => {
    state.canvas.ctx.fillStyle = ball.color;
    state.canvas.ctx.beginPath();
    state.canvas.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2);
    state.canvas.ctx.closePath();
    state.canvas.ctx.fill();
};
const generateBalls = (amount, centers, velocity, acceleration, radius, color) => {
    const balls = [];
    for (let i = 0; i < amount; i++) {
        const ball = new Ball(centers[i], velocity, acceleration, radius, color, drawBall);
        state.objects.balls.push(ball);
    }
    return balls;
};
const generateRectangleFromCenterline = (centerLine, width) => {
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
    return new Polygon(midpoint, points, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, drawPolygon);
};
const getRandomPointsAroundCenter = (amount, center, radius) => {
    const points = [];
    for (let i = 0; i < amount; i++) {
        const plusOrMinus = Math.random() < 0.5 ? -1 : 1;
        points.push({
            x: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.x,
            y: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.y
        });
    }
    return points;
};
const dotProduct = (v1, v2) => {
    return (v1.x * v2.x) + (v1.y * v2.y);
};
const vectorMagnitude = (v) => {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
};
const lineToVector = (line) => {
    return { x: line[1].x - line[0].x, y: line[1].y - line[0].y };
};
const roundByStep = (number, step) => {
    return Math.round(number / step) * step;
};
const collisionBallPoint = (ball, point) => {
    const distance = vectorMagnitude({ x: ball.center.x - point.x, y: ball.center.y - point.y });
    return distance <= ball.radius;
};
const collisionBallSides = (ball, polygon) => {
    for (let i = 0; i < polygon.sides.length; i++) {
        if (collisionBallPoint(ball, polygon.sides[i][0]) || collisionBallPoint(ball, polygon.sides[i][1])) {
            return polygon.sides[i];
        }
        if (collisionBallLine(ball, polygon.sides[i], polygon.sideLength)) {
            return polygon.sides[i];
        }
    }
    return false;
};
const collisionBallLine = (ball, line, lineLength) => {
    const x1 = line[0].x;
    const x2 = line[1].x;
    const y1 = line[0].y;
    const y2 = line[1].y;
    const cx = ball.center.x;
    const cy = ball.center.y;
    const ballDotSide = (((cx - x1) * (x2 - x1)) + ((cy - y1) * (y2 - y1))) / Math.pow(lineLength, 2);
    const closestX = x1 + (ballDotSide * (x2 - x1));
    const closestY = y1 + (ballDotSide * (y2 - y1));
    //if ball is not near line segment, it can't collide
    const d1 = vectorMagnitude({ x: closestX - x1, y: closestY - y1 });
    const d2 = vectorMagnitude({ x: closestX - x2, y: closestY - y2 });
    const precision = 0.1;
    if (!(d1 + d2 >= lineLength - precision && d1 + d2 <= lineLength + precision)) {
        return false;
    }
    //if ball is closer than radius, it has collided
    const distanceX = closestX - cx;
    const distanceY = closestY - cy;
    const distance = vectorMagnitude({ x: distanceX, y: distanceY });
    if (distance <= ball.radius) {
        return true;
    }
    return false;
};
const collisionLineLine = (line1, line2) => {
    const x1 = line1[0].x;
    const x2 = line1[1].x;
    const x3 = line2[0].x;
    const x4 = line2[1].x;
    const y1 = line1[0].y;
    const y2 = line1[1].y;
    const y3 = line2[0].y;
    const y4 = line2[1].y;
    // calculate the distance to intersection point
    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    // if uA and uB are between 0-1, lines are colliding
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        const intersectionX = x1 + (uA * (x2 - x1));
        const intersectionY = y1 + (uA * (y2 - y1));
        return { x: intersectionX, y: intersectionY };
    }
    return false;
};
const calculateBounce = (ball, vector) => {
    const lineNormal = { x: -vector.y, y: vector.x };
    const normalMagnitude = vectorMagnitude(lineNormal);
    const unitNormal = { x: lineNormal.x / normalMagnitude, y: lineNormal.y / normalMagnitude };
    const ballDotNormal = dotProduct(ball.velocity, unitNormal);
    const normalScaler = 2 * ballDotNormal;
    const reflection = {
        x: (ball.velocity.x - (normalScaler * unitNormal.x)) * 1 / state.physics.bounce,
        y: (ball.velocity.y - (normalScaler * unitNormal.y)) * 1 / state.physics.bounce
    };
    return reflection;
};
const testCollisionContinuous = (ball, sides, timeDelta) => {
    const newPosition = ball.getNextPosition(timeDelta);
    const velocityMagnitude = vectorMagnitude(ball.velocity);
    const ballDirection = { x: ball.velocity.x / velocityMagnitude, y: ball.velocity.y / velocityMagnitude };
    const line1 = [
        { x: ball.center.x - (ballDirection.x * ball.radius), y: ball.center.y - (ballDirection.y * ball.radius) },
        { x: newPosition.x + (ballDirection.x * ball.radius), y: newPosition.y + (ballDirection.y * ball.radius) }
    ];
    for (let i = 0; i < sides.length; i++) {
        const line2 = sides[i];
        const collisionPoint = collisionLineLine(line1, line2);
        if (collisionPoint) {
            return sides[i];
        }
    }
    return false;
};
const testGlobalCollision = (ball, polygons, timeDelta) => {
    let collision = false;
    for (let i = 0; i < state.objects.polygons.length; i++) {
        const potentialCollision = testCollisionContinuous(ball, state.objects.polygons[i].sides, timeDelta);
        if (potentialCollision) {
            return potentialCollision;
        }
    }
    return collision;
};
const drawAllObjects = (objects) => {
    state.canvas.ctx.clearRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    for (let i = 0; i < objects.length; i++) {
        for (let j = 0; j < objects[i].length; j++) {
            objects[i][j].draw();
        }
    }
};
const averageFPS = [0, 0];
const updateFPS = (fps) => {
    if (averageFPS[0] > 100) {
        averageFPS[0] = 0;
        averageFPS[1] = 0;
    }
    if (fps != Infinity) {
        averageFPS[0] = averageFPS[0] + 1;
        averageFPS[1] = averageFPS[1] + fps;
    }
    const fpsElement = document.getElementById("fps");
    if (fpsElement) {
        fpsElement.innerHTML = `FPS: ${Math.floor(averageFPS[1] / averageFPS[0])}`;
    }
};
const generateSelectionOptions = (div, options) => {
    const selectionDiv = document.getElementById(div);
    if (selectionDiv) {
        for (let i = 0; i < options.length; i++) {
            selectionDiv.innerHTML += `<option value="${options[i]}">${options[i]}</option>\n`;
        }
    }
    else {
        console.log(`div ${div} not found in generateSelectionOptions`);
    }
};
const drawStartText = (size) => {
    state.canvas.ctx.font = `${size}em monospace`;
    const text = "Touch Here to Place Objects";
    const textSize = state.canvas.ctx.measureText(text);
    state.canvas.ctx.fillStyle = "white";
    state.canvas.ctx.fillText(text, (state.canvas.dimensions.x / 2) - (textSize.width / 2), (state.canvas.dimensions.y / 2) + (textSize.actualBoundingBoxAscent / 2));
    state.canvas.ctx.fillStyle = "black";
};
const drawPlacingBall = (lineStart, lineEnd) => {
    //draw ball outline
    state.canvas.ctx.beginPath();
    state.canvas.ctx.arc(lineStart.x, lineStart.y, state.objects.ballRadius, 0, Math.PI * 2);
    state.canvas.ctx.closePath();
    state.canvas.ctx.stroke();
    //draw ball's velocity vector
    state.canvas.ctx.beginPath();
    state.canvas.ctx.moveTo(lineStart.x, lineStart.y);
    state.canvas.ctx.lineTo(lineEnd.x, lineEnd.y);
    state.canvas.ctx.closePath();
    state.canvas.ctx.stroke();
};
const initializeCanvas = () => {
    const canvasElement = document.getElementById("canvas");
    const c = {
        source: canvasElement,
        ctx: canvasElement.getContext("2d")
    };
    state = new SessionState(c);
    c.source.width = state.canvas.dimensions.x;
    c.source.height = state.canvas.dimensions.y;
    const polygonStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 : state.canvas.dimensions.y * 0.45, 6, Math.PI / 2);
    const polygon = new Polygon(state.canvas.center, polygonStartingPoints, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, drawPolygon);
    const polygonThickness = 10;
    const polygonShellStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 + polygonThickness : state.canvas.dimensions.y * 0.45 + polygonThickness, 6, Math.PI / 2);
    const polygonShell = new Polygon(state.canvas.center, polygonShellStartingPoints, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, drawPolygon);
    state.objects.polygons.push(polygon, polygonShell);
    for (const polygon of state.objects.polygons) {
        polygon.draw();
    }
    state.canvas.ctx.fillStyle = "rgba(0,0,0,0.25)";
    state.canvas.ctx.fillRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    drawStartText(2);
    state.music.synth.drawADSR = drawADSR;
    state.music.synth.drawFilter = drawFilter;
    generateSelectionOptions("key", Object.keys(KeyToTonic));
    generateSelectionOptions("mode", Object.keys(Modes));
    generateSelectionOptions("scale", Object.keys(Scales));
};
function animationLoop() {
    state.canvas.ctx.clearRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    for (const polygon of state.objects.polygons) {
        polygon.draw();
    }
    for (const ball of state.objects.balls) {
        ball.draw();
    }
    state.music.synth.drawGraph({ x: state.music.graphSize.x / 2, y: state.music.graphSize.y }, state.music.graphSize);
    if (state.placement.currentlyPlacing == "ball" && state.placement.pointerDown) {
        drawPlacingBall(state.placement.lineStart, state.placement.lineEnd);
    }
    if (state.placement.currentlyPlacing == "wall" && state.placement.pointerDown) {
        const lineThickness = 10;
        const rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness);
        rectangle.draw();
    }
    requestAnimationFrame(animationLoop);
}
function physicsLoop(callTime) {
    const timeDelta = performance.now() - callTime;
    updateFPS(Math.floor(1000 / timeDelta));
    for (let i = 0; i < state.objects.polygons.length; i++) {
        state.objects.polygons[i].step(timeDelta);
    }
    for (let i = 0; i < state.objects.balls.length; i++) {
        state.objects.balls[i].color = "black";
        const collision = testGlobalCollision(state.objects.balls[i], state.objects.polygons, timeDelta);
        if (collision) {
            state.music.synth.playRandomNote();
            const bounceVector = calculateBounce(state.objects.balls[i], lineToVector(collision));
            state.objects.balls[i].velocity = bounceVector;
            state.objects.balls[i].color = "blue";
        }
        state.objects.balls[i].step(timeDelta);
    }
    const endTime = performance.now();
    if (!state.canvas.paused) {
        setTimeout(() => physicsLoop(endTime), 0);
    }
}
window.addEventListener("load", initializeCanvas);
document.getElementById("bounce").addEventListener("change", (e) => {
    const bounceInput = e.target;
    state.physics.bounce = parseFloat(bounceInput.value);
});
document.getElementById("gravity").addEventListener("change", (e) => {
    const gravityInput = e.target;
    state.physics.gravity = parseInt(gravityInput.value);
    for (const ball of state.objects.balls) {
        ball.acceleration = { x: ball.acceleration.x, y: state.physics.gravity };
    }
});
document.getElementById("snap").addEventListener("change", (e) => {
    const snapInput = e.target;
    state.placement.snapToGrid = snapInput.checked;
});
document.getElementById("drawing-selector").addEventListener("change", (e) => {
    const drawingInput = e.target;
    state.placement.currentlyPlacing = drawingInput.value;
});
document.getElementById("canvas").addEventListener("pointerdown", (e) => {
    if (state.canvas.fresh) {
        state.canvas.fresh = false;
        animationLoop();
    }
    state.placement.pointerDown = true;
    state.placement.lineStart = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
});
document.getElementById("canvas").addEventListener("pointermove", (e) => {
    state.placement.lineEnd = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
});
document.getElementById("canvas").addEventListener("pointerup", (e) => {
    state.placement.pointerDown = false;
    state.placement.lineEnd = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
    if (state.placement.currentlyPlacing == "wall") {
        const lineThickness = 10;
        const rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness);
        state.objects.polygons.push(rectangle);
    }
    if (state.placement.currentlyPlacing == "ball") {
        const velocity = { x: -(state.placement.lineEnd.x - state.placement.lineStart.x), y: -(state.placement.lineEnd.y - state.placement.lineStart.y) };
        const velocityScale = Math.log(vectorMagnitude(velocity) + 0.0001);
        const ball = new Ball(state.placement.lineStart, { x: velocity.x * velocityScale, y: velocity.y * velocityScale }, { x: 0, y: state.physics.gravity }, state.objects.ballRadius, "black", drawBall);
        state.objects.balls.push(ball);
    }
});
document.getElementById("start").addEventListener("click", () => {
    document.getElementById("start").style.display = "none";
    document.getElementById("pause").style.display = "block";
    state.canvas.paused = false;
    physicsLoop(performance.now());
    animationLoop();
});
document.getElementById("pause").addEventListener("click", () => {
    document.getElementById("start").style.display = "block";
    document.getElementById("pause").style.display = "none";
    state.canvas.paused = true;
});
document.getElementById("reset").addEventListener("click", () => {
    //remove all but the default polygon
    state.objects.polygons.splice(2, state.objects.polygons.length - 2);
    state.objects.balls.splice(0, state.objects.balls.length);
});
document.getElementById("bpm").addEventListener("input", (e) => {
    const bpmInput = e.target;
    state.music.bpm = parseInt(bpmInput.value);
});
document.getElementById("rhythm").addEventListener("change", (e) => {
    const rhythmInput = e.target;
    if (parseFloat(rhythmInput.value) != 0) {
        state.music.rhythm = 1 / parseFloat(rhythmInput.value);
    }
    else {
        state.music.rhythm = 0.0;
    }
    state.objects.polygons[0].rotationalVelocity = state.music.rhythm;
    state.objects.polygons[1].rotationalVelocity = state.music.rhythm;
});
document.getElementById("volume").addEventListener("input", (e) => {
    const volumeInput = e.target;
    state.music.synth.volume = parseFloat(volumeInput.value);
    state.music.synth.setGain(parseFloat(volumeInput.value));
});
document.getElementById("attack").addEventListener("input", (e) => {
    const attackInput = e.target;
    state.music.synth.ADSR.attack = parseFloat(attackInput.value);
});
document.getElementById("decay").addEventListener("input", (e) => {
    const decayInput = e.target;
    state.music.synth.ADSR.decay = parseFloat(decayInput.value);
});
document.getElementById("sustain").addEventListener("input", (e) => {
    const sustainInput = e.target;
    state.music.synth.ADSR.sustain = parseFloat(sustainInput.value);
});
document.getElementById("release").addEventListener("input", (e) => {
    const releaseInput = e.target;
    state.music.synth.ADSR.release = parseFloat(releaseInput.value);
});
document.getElementById("wave").addEventListener("input", (e) => {
    const waveInput = e.target;
    state.music.synth.wave = waveInput.value;
});
document.getElementById("key").addEventListener("input", (e) => {
    const keyInput = e.target;
    state.music.synth.key = keyInput.value;
    state.music.synth.tonic = KeyToTonic[state.music.synth.key] * Math.pow(2, state.music.synth.range[0]);
    state.music.synth.generateNotes();
});
document.getElementById("mode").addEventListener("input", (e) => {
    const modeInput = e.target;
    state.music.synth.mode = Modes[modeInput.value];
    state.music.synth.generateNotes();
});
document.getElementById("scale").addEventListener("input", (e) => {
    const scaleInput = e.target;
    state.music.synth.scale = Scales[scaleInput.value];
    state.music.synth.generateNotes();
});
document.getElementById("filter").addEventListener("input", (e) => {
    const frequencyInput = e.target;
    const newFrequency = Math.pow(parseFloat(frequencyInput.value), 2);
    //log-esque gain curve to adjust gain based on cutoff frequency
    const newGain = (Math.log(1 / ((newFrequency / 20000) + 1)) + 1) * state.music.synth.volume;
    state.music.synth.setGain(newGain);
    state.music.synth.filter.frequency.exponentialRampToValueAtTime(newFrequency, state.music.synth.context.currentTime + 0.001);
});
//# sourceMappingURL=main.js.map