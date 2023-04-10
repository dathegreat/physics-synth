"use strict";
//TODO: add symmetry mode to ball placement, mirrored across center x or y axis
//TODO: add custom selection to scale, upon selecting "custom" another option box appears with scale selection features
//TODO: Make snap to grid a regular checkbox
Object.defineProperty(exports, "__esModule", { value: true });
var Polygon_1 = require("./Classes/Polygon");
var SessionState_1 = require("./Classes/SessionState");
var Ball_1 = require("./Classes/Ball");
var MusicConstants_1 = require("./MusicConstants");
var canvasElement = document.getElementById("canvas");
var c = {
    source: canvasElement,
    ctx: canvasElement.getContext("2d")
};
var state = new SessionState_1.SessionState(c);
var generatePolygonAtPoint = function (center, radius, sides, rotation) {
    if (rotation === void 0) { rotation = 0; }
    var polygon = [];
    var theta = (2 * Math.PI) / sides;
    for (var i = 0; i < sides; i++) {
        polygon.push({ x: center.x + (radius * Math.cos((theta * i) + rotation)),
            y: center.y + (radius * Math.sin((theta * i) + rotation)) });
    }
    return polygon;
};
var drawADSR = function (center, size, ADSR) {
    var padding = 0.9;
    var halfHeight = size.y / 2;
    var halfWidth = size.x / 2;
    var leftCorner = { x: center.x - (halfWidth * padding), y: center.y - (halfHeight * padding) };
    var rightCorner = { x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding) };
    var totalDuration = ADSR.attack + ADSR.decay + ADSR.release;
    //normalize each segment width to percentage of graph width
    var normA = (ADSR.attack / totalDuration) * (size.x * padding);
    var normD = (ADSR.decay / totalDuration) * (size.x * padding);
    var normR = (ADSR.release / totalDuration) * (size.x * padding);
    //draw outline
    c.ctx.beginPath();
    c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    c.ctx.stroke();
    //draw graph
    c.ctx.moveTo(leftCorner.x, rightCorner.y);
    c.ctx.lineTo(leftCorner.x + normA, leftCorner.y);
    c.ctx.lineTo(leftCorner.x + normA + normD, (rightCorner.y) - (size.y * padding * ADSR.sustain));
    c.ctx.lineTo(rightCorner.x, rightCorner.y);
    c.ctx.stroke();
    c.ctx.closePath();
};
var drawFilter = function (center, size, cutoff, qValue) {
    var padding = 0.9;
    var halfHeight = size.y / 2;
    var halfWidth = size.x / 2;
    var leftCorner = { x: center.x - (halfWidth), y: center.y - (halfHeight * padding) + qValue };
    var rightCorner = { x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding) };
    var sqrtFrequency = Math.sqrt(cutoff);
    var maxFrequency = 142; //sqrt of 20,000Hz 
    //normalize each segment width to percentage of graph width
    var normCutoff = (sqrtFrequency / maxFrequency) * size.x;
    var normQ = (qValue / 1000) * size.y;
    //value at which volume is ~0
    var trueCutoff = normCutoff * 2;
    //clip output to bounding rect
    c.ctx.save();
    c.ctx.beginPath();
    c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    c.ctx.clip();
    //draw outline
    c.ctx.beginPath();
    c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y);
    c.ctx.stroke();
    //draw graph
    c.ctx.moveTo(leftCorner.x, leftCorner.y + normQ);
    c.ctx.lineTo(leftCorner.x + normCutoff, leftCorner.y + normQ);
    c.ctx.quadraticCurveTo(leftCorner.x + normCutoff + trueCutoff / 4, leftCorner.y - normQ, trueCutoff, rightCorner.y);
    c.ctx.stroke();
    c.ctx.closePath();
    //remove clipping path from future drawings
    c.ctx.restore();
};
var drawPolygon = function (polygon) {
    c.ctx.beginPath();
    for (var i = 0; i < polygon.sides.length; i++) {
        c.ctx.moveTo(polygon.sides[i][0].x, polygon.sides[i][0].y);
        c.ctx.lineTo(polygon.sides[i][1].x, polygon.sides[i][1].y);
    }
    c.ctx.stroke();
    c.ctx.closePath();
};
var normalize = function (value, min, max) {
    return (value - min) / (max - min);
};
var drawBall = function (ball) {
    c.ctx.fillStyle = ball.color;
    c.ctx.beginPath();
    c.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2);
    c.ctx.closePath();
    c.ctx.fill();
};
var generateBalls = function (amount, centers, velocity, acceleration, radius, color) {
    var balls = [];
    for (var i = 0; i < amount; i++) {
        var ball = new Ball_1.Ball(centers[i], velocity, acceleration, radius, color, drawBall);
        state.objects.balls.push(ball);
    }
    return balls;
};
var generateRectangleFromCenterline = function (centerLine, width) {
    var vector = { x: centerLine[1].x - centerLine[0].x, y: centerLine[1].y - centerLine[0].y };
    var midpoint = { x: (centerLine[1].x + centerLine[0].x) / 2, y: (centerLine[1].y + centerLine[0].y) / 2 };
    var length = vectorMagnitude(vector);
    var unitNormal = { x: -vector.y / length, y: vector.x / length };
    var thicknessVector = { x: unitNormal.x * (width / 2), y: unitNormal.y * (width / 2) };
    var points = [
        { x: centerLine[0].x + thicknessVector.x, y: centerLine[0].y + thicknessVector.y },
        { x: centerLine[0].x - thicknessVector.x, y: centerLine[0].y - thicknessVector.y },
        { x: centerLine[1].x - thicknessVector.x, y: centerLine[1].y - thicknessVector.y },
        { x: centerLine[1].x + thicknessVector.x, y: centerLine[1].y + thicknessVector.y } //bottom right
    ];
    return new Polygon_1.Polygon(midpoint, points, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, drawPolygon);
};
var getRandomPointsAroundCenter = function (amount, center, radius) {
    var points = [];
    for (var i = 0; i < amount; i++) {
        var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
        points.push({
            x: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.x,
            y: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.y
        });
    }
    return points;
};
var dotProduct = function (v1, v2) {
    return (v1.x * v2.x) + (v1.y * v2.y);
};
var vectorMagnitude = function (v) {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
};
var lineToVector = function (line) {
    return { x: line[1].x - line[0].x, y: line[1].y - line[0].y };
};
var roundByStep = function (number, step) {
    return Math.round(number / step) * step;
};
var collisionBallPoint = function (ball, point) {
    var distance = vectorMagnitude({ x: ball.center.x - point.x, y: ball.center.y - point.y });
    return distance <= ball.radius;
};
var collisionBallSides = function (ball, polygon) {
    for (var i = 0; i < polygon.sides.length; i++) {
        if (collisionBallPoint(ball, polygon.sides[i][0]) || collisionBallPoint(ball, polygon.sides[i][1])) {
            return polygon.sides[i];
        }
        if (collisionBallLine(ball, polygon.sides[i], polygon.sideLength)) {
            return polygon.sides[i];
        }
    }
    return false;
};
var collisionBallLine = function (ball, line, lineLength) {
    var x1 = line[0].x;
    var x2 = line[1].x;
    var y1 = line[0].y;
    var y2 = line[1].y;
    var cx = ball.center.x;
    var cy = ball.center.y;
    var ballDotSide = (((cx - x1) * (x2 - x1)) + ((cy - y1) * (y2 - y1))) / Math.pow(lineLength, 2);
    var closestX = x1 + (ballDotSide * (x2 - x1));
    var closestY = y1 + (ballDotSide * (y2 - y1));
    //if ball is not near line segment, it can't collide
    var d1 = vectorMagnitude({ x: closestX - x1, y: closestY - y1 });
    var d2 = vectorMagnitude({ x: closestX - x2, y: closestY - y2 });
    var precision = 0.1;
    if (!(d1 + d2 >= lineLength - precision && d1 + d2 <= lineLength + precision)) {
        return false;
    }
    //if ball is closer than radius, it has collided
    var distanceX = closestX - cx;
    var distanceY = closestY - cy;
    var distance = vectorMagnitude({ x: distanceX, y: distanceY });
    if (distance <= ball.radius) {
        return true;
    }
    return false;
};
var collisionLineLine = function (line1, line2) {
    var x1 = line1[0].x;
    var x2 = line1[1].x;
    var x3 = line2[0].x;
    var x4 = line2[1].x;
    var y1 = line1[0].y;
    var y2 = line1[1].y;
    var y3 = line2[0].y;
    var y4 = line2[1].y;
    // calculate the distance to intersection point
    var uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    var uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    // if uA and uB are between 0-1, lines are colliding
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        var intersectionX = x1 + (uA * (x2 - x1));
        var intersectionY = y1 + (uA * (y2 - y1));
        return { x: intersectionX, y: intersectionY };
    }
    return false;
};
var calculateBounce = function (ball, vector) {
    var lineNormal = { x: -vector.y, y: vector.x };
    var normalMagnitude = vectorMagnitude(lineNormal);
    var unitNormal = { x: lineNormal.x / normalMagnitude, y: lineNormal.y / normalMagnitude };
    var ballDotNormal = dotProduct(ball.velocity, unitNormal);
    var normalScaler = 2 * ballDotNormal;
    var reflection = {
        x: (ball.velocity.x - (normalScaler * unitNormal.x)) * 1 / state.physics.bounce,
        y: (ball.velocity.y - (normalScaler * unitNormal.y)) * 1 / state.physics.bounce
    };
    return reflection;
};
var testCollisionContinuous = function (ball, sides, timeDelta) {
    var newPosition = ball.getNextPosition(timeDelta);
    var velocityMagnitude = vectorMagnitude(ball.velocity);
    var ballDirection = { x: ball.velocity.x / velocityMagnitude, y: ball.velocity.y / velocityMagnitude };
    var line1 = [
        { x: ball.center.x - (ballDirection.x * ball.radius), y: ball.center.y - (ballDirection.y * ball.radius) },
        { x: newPosition.x + (ballDirection.x * ball.radius), y: newPosition.y + (ballDirection.y * ball.radius) }
    ];
    for (var i = 0; i < sides.length; i++) {
        var line2 = sides[i];
        var collisionPoint = collisionLineLine(line1, line2);
        if (collisionPoint) {
            return sides[i];
        }
    }
    return false;
};
var testGlobalCollision = function (ball, polygons, timeDelta) {
    var collision = false;
    for (var i = 0; i < state.objects.polygons.length; i++) {
        var potentialCollision = testCollisionContinuous(ball, state.objects.polygons[i].sides, timeDelta);
        if (potentialCollision) {
            return potentialCollision;
        }
    }
    return collision;
};
var drawAllObjects = function (objects) {
    c.ctx.clearRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    for (var i = 0; i < objects.length; i++) {
        for (var j = 0; j < objects[i].length; j++) {
            objects[i][j].draw();
        }
    }
};
var averageFPS = [0, 0];
var updateFPS = function (fps) {
    if (averageFPS[0] > 100) {
        averageFPS[0] = 0;
        averageFPS[1] = 0;
    }
    if (fps != Infinity) {
        averageFPS[0] = averageFPS[0] + 1;
        averageFPS[1] = averageFPS[1] + fps;
    }
    var fpsElement = document.getElementById("fps");
    if (fpsElement) {
        fpsElement.innerHTML = "FPS: ".concat(Math.floor(averageFPS[1] / averageFPS[0]));
    }
};
var generateSelectionOptions = function (div, options) {
    var selectionDiv = document.getElementById(div);
    if (selectionDiv) {
        for (var i = 0; i < options.length; i++) {
            selectionDiv.innerHTML += "<option value=\"".concat(options[i], "\">").concat(options[i], "</option>\n");
        }
    }
    else {
        console.log("div ".concat(div, " not found in generateSelectionOptions"));
    }
};
var drawStartText = function (size) {
    c.ctx.font = "".concat(size, "em monospace");
    var text = "Touch Here to Place Objects";
    var textSize = c.ctx.measureText(text);
    c.ctx.fillStyle = "white";
    c.ctx.fillText(text, (state.canvas.dimensions.x / 2) - (textSize.width / 2), (state.canvas.dimensions.y / 2) + (textSize.actualBoundingBoxAscent / 2));
    c.ctx.fillStyle = "black";
};
var drawPlacingBall = function (lineStart, lineEnd) {
    //draw ball outline
    c.ctx.beginPath();
    c.ctx.arc(lineStart.x, lineStart.y, state.objects.ballRadius, 0, Math.PI * 2);
    c.ctx.closePath();
    c.ctx.stroke();
    //draw ball's velocity vector
    c.ctx.beginPath();
    c.ctx.moveTo(lineStart.x, lineStart.y);
    c.ctx.lineTo(lineEnd.x, lineEnd.y);
    c.ctx.closePath();
    c.ctx.stroke();
};
var initializeCanvas = function () {
    c.source.width = state.canvas.dimensions.x;
    c.source.height = state.canvas.dimensions.y;
    var polygonStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 : state.canvas.dimensions.y * 0.45, 6, Math.PI / 2);
    var polygon = new Polygon_1.Polygon(state.canvas.center, polygonStartingPoints, { x: 0, y: 0 }, { x: 0, y: 0 }, Math.PI / 10, drawPolygon);
    var polygonThickness = 10;
    var polygonShellStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 + polygonThickness : state.canvas.dimensions.y * 0.45 + polygonThickness, 6, Math.PI / 2);
    var polygonShell = new Polygon_1.Polygon(state.canvas.center, polygonShellStartingPoints, { x: 0, y: 0 }, { x: 0, y: 0 }, Math.PI / 10, drawPolygon);
    state.objects.polygons.push(polygon, polygonShell);
    for (var _i = 0, _a = state.objects.polygons; _i < _a.length; _i++) {
        var polygon_1 = _a[_i];
        polygon_1.draw();
    }
    c.ctx.fillStyle = "rgba(0,0,0,0.25)";
    c.ctx.fillRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    drawStartText(2);
    state.music.synth.drawADSR = drawADSR;
    state.music.synth.drawFilter = drawFilter;
};
generateSelectionOptions("key", Object.keys(MusicConstants_1.KeyToTonic));
generateSelectionOptions("mode", Object.keys(MusicConstants_1.Modes));
generateSelectionOptions("scale", Object.keys(MusicConstants_1.Scales));
function animationLoop() {
    c.ctx.clearRect(0, 0, state.canvas.dimensions.x, state.canvas.dimensions.y);
    for (var _i = 0, _a = state.objects.polygons; _i < _a.length; _i++) {
        var polygon = _a[_i];
        polygon.draw();
    }
    for (var _b = 0, _c = state.objects.balls; _b < _c.length; _b++) {
        var ball = _c[_b];
        ball.draw();
    }
    state.music.synth.drawGraph(state.canvas.center, state.music.graphSize);
    if (state.placement.currentlyPlacing == "ball" && state.placement.pointerDown) {
        drawPlacingBall(state.placement.lineStart, state.placement.lineEnd);
    }
    if (state.placement.currentlyPlacing == "wall" && state.placement.pointerDown) {
        var lineThickness = 10;
        var rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness);
        rectangle.draw();
    }
    requestAnimationFrame(animationLoop);
}
function physicsLoop(callTime) {
    var timeDelta = performance.now() - callTime;
    updateFPS(Math.floor(1000 / timeDelta));
    for (var i = 0; i < state.objects.polygons.length; i++) {
        state.objects.polygons[i].step(timeDelta);
    }
    for (var i = 0; i < state.objects.balls.length; i++) {
        state.objects.balls[i].color = "black";
        var collision = testGlobalCollision(state.objects.balls[i], state.objects.polygons, timeDelta);
        if (collision) {
            state.music.synth.playRandomNote();
            var bounceVector = calculateBounce(state.objects.balls[i], lineToVector(collision[1]));
            state.objects.balls[i].velocity = bounceVector;
            state.objects.balls[i].color = "blue";
        }
        state.objects.balls[i].step(timeDelta);
    }
    var endTime = performance.now();
    if (!state.canvas.paused) {
        setTimeout(function () { return physicsLoop(endTime); }, 0);
    }
}
document.getElementById("canvas").addEventListener("load", initializeCanvas);
document.getElementById("bounce").addEventListener("change", function (e) {
    var bounceInput = e.target;
    state.physics.bounce = parseFloat(bounceInput.value);
});
document.getElementById("gravity").addEventListener("change", function (e) {
    var gravityInput = e.target;
    state.physics.gravity = parseInt(gravityInput.value);
    for (var _i = 0, _a = state.objects.balls; _i < _a.length; _i++) {
        var ball = _a[_i];
        ball.acceleration = { x: ball.acceleration.x, y: state.physics.gravity };
    }
});
document.getElementById("snap").addEventListener("change", function (e) {
    var snapInput = e.target;
    state.placement.snapToGrid = snapInput.checked;
});
document.getElementById("drawing-selector").addEventListener("change", function (e) {
    var drawingInput = e.target;
    state.placement.currentlyPlacing = drawingInput.value;
});
document.getElementById("canvas").addEventListener("pointerdown", function (e) {
    if (state.canvas.fresh) {
        state.canvas.fresh = false;
        animationLoop();
    }
    state.placement.pointerDown = true;
    state.placement.lineStart = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
});
document.getElementById("canvas").addEventListener("pointermove", function (e) {
    state.placement.lineEnd = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
});
document.getElementById("canvas").addEventListener("pointerup", function (e) {
    state.placement.pointerDown = false;
    state.placement.lineEnd = state.placement.snapToGrid
        ? { x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY) }
        : { x: e.offsetX, y: e.offsetY };
    if (state.placement.currentlyPlacing == "wall") {
        var lineThickness = 10;
        var rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness);
        state.objects.polygons.push(rectangle);
    }
    if (state.placement.currentlyPlacing == "ball") {
        var velocity = { x: -(state.placement.lineEnd.x - state.placement.lineStart.x), y: -(state.placement.lineEnd.y - state.placement.lineStart.y) };
        var velocityScale = Math.log(vectorMagnitude(velocity) + 0.0001);
        var ball = new Ball_1.Ball(state.placement.lineStart, { x: velocity.x * velocityScale, y: velocity.y * velocityScale }, { x: 0, y: state.physics.gravity }, state.objects.ballRadius, "black", drawBall);
        state.objects.balls.push(ball);
    }
});
document.getElementById("start").addEventListener("click", function () {
    document.getElementById("start").style.display = "none";
    document.getElementById("pause").style.display = "block";
    state.canvas.paused = false;
    physicsLoop(performance.now());
    animationLoop();
});
document.getElementById("pause").addEventListener("click", function () {
    document.getElementById("start").style.display = "block";
    document.getElementById("pause").style.display = "none";
    state.canvas.paused = true;
});
document.getElementById("reset").addEventListener("click", function () {
    //remove all but the default polygon
    state.objects.polygons.splice(2, state.objects.polygons.length - 2);
    state.objects.balls.splice(0, state.objects.balls.length);
});
document.getElementById("bpm").addEventListener("input", function (e) {
    var bpmInput = e.target;
    state.music.bpm = parseInt(bpmInput.value);
});
document.getElementById("rhythm").addEventListener("change", function (e) {
    var rhythmInput = e.target;
    if (parseFloat(rhythmInput.value) != 0) {
        state.music.rhythm = 1 / parseFloat(rhythmInput.value);
    }
    else {
        state.music.rhythm = 0.0;
    }
});
document.getElementById("volume").addEventListener("input", function (e) {
    var volumeInput = e.target;
    state.music.synth.volume = parseFloat(volumeInput.value);
    state.music.synth.setGain(parseFloat(volumeInput.value));
});
document.getElementById("attack").addEventListener("input", function (e) {
    var attackInput = e.target;
    state.music.synth.ADSR.attack = parseFloat(attackInput.value);
});
document.getElementById("decay").addEventListener("input", function (e) {
    var decayInput = e.target;
    state.music.synth.ADSR.decay = parseFloat(decayInput.value);
});
document.getElementById("sustain").addEventListener("input", function (e) {
    var sustainInput = e.target;
    state.music.synth.ADSR.sustain = parseFloat(sustainInput.value);
});
document.getElementById("release").addEventListener("input", function (e) {
    var releaseInput = e.target;
    state.music.synth.ADSR.release = parseFloat(releaseInput.value);
});
document.getElementById("wave").addEventListener("input", function (e) {
    var waveInput = e.target;
    state.music.synth.wave = waveInput.value;
});
document.getElementById("key").addEventListener("input", function (e) {
    var keyInput = e.target;
    state.music.synth.key = keyInput.value;
    state.music.synth.tonic = MusicConstants_1.KeyToTonic[state.music.synth.key] * Math.pow(2, state.music.synth.range[0]);
    state.music.synth.generateNotes();
});
document.getElementById("mode").addEventListener("input", function (e) {
    var modeInput = e.target;
    state.music.synth.mode = MusicConstants_1.Modes[modeInput.value];
    state.music.synth.generateNotes();
});
document.getElementById("scale").addEventListener("input", function (e) {
    var scaleInput = e.target;
    state.music.synth.scale = MusicConstants_1.Scales[scaleInput.value];
    state.music.synth.generateNotes();
});
document.getElementById("filter").addEventListener("input", function (e) {
    var frequencyInput = e.target;
    var newFrequency = Math.pow(parseFloat(frequencyInput.value), 2);
    //log-esque gain curve to adjust gain based on cutoff frequency
    var newGain = (Math.log(1 / ((newFrequency / 20000) + 1)) + 1) * state.music.synth.volume;
    state.music.synth.setGain(newGain);
    state.music.synth.filter.frequency.exponentialRampToValueAtTime(newFrequency, state.music.synth.context.currentTime + 0.001);
});
