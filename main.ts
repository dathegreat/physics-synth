//TODO: add symmetry mode to ball placement, mirrored across center x or y axis
//TODO: add custom selection to scale, upon selecting "custom" another option box appears with scale selection features
//TODO: Make snap to grid a regular checkbox

import { Polygon } from "./Classes/Polygon"
import { SessionState } from "./Classes/SessionState"
import { Ball } from "./Classes/Ball"
import { Point, Canvas, Drawable, Envelope } from "./Types"
import { Modes, Scales, KeyToTonic } from "./MusicConstants"

const canvasElement = <HTMLCanvasElement> document.getElementById("canvas")
const c: Canvas = {
    source: canvasElement, 
    ctx: <CanvasRenderingContext2D> canvasElement.getContext("2d")
}

const state = new SessionState(c)

const generatePolygonAtPoint = (center: Point, radius: number, sides: number, rotation: number=0): Point[] =>{
    let polygon: Point[] = []
    const theta: number = ( 2 * Math.PI ) / sides
    for(let i=0; i<sides; i++){
        polygon.push(
            { x: center.x + ( radius * Math.cos( (theta * i) + rotation ) ),
              y: center.y + ( radius * Math.sin( (theta * i) + rotation ) )}
        )
    }
    return polygon
}

const drawADSR = (center: Point, size: Point, ADSR: Envelope) =>{
	const padding = 0.9
	const halfHeight = size.y / 2
	const halfWidth = size.x / 2
	const leftCorner = {x: center.x - (halfWidth * padding), y: center.y - (halfHeight * padding)}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const totalDuration = ADSR.attack + ADSR.decay + ADSR.release
	//normalize each segment width to percentage of graph width
	const normA = (ADSR.attack / totalDuration) * (size.x * padding)
	const normD = (ADSR.decay / totalDuration) * (size.x * padding)
	const normR = (ADSR.release / totalDuration) * (size.x * padding)
	//draw outline
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	c.ctx.stroke()
	//draw graph
	c.ctx.moveTo(leftCorner.x, rightCorner.y)
	c.ctx.lineTo(leftCorner.x + normA, leftCorner.y)
	c.ctx.lineTo(leftCorner.x + normA + normD, (rightCorner.y) - (size.y * padding * ADSR.sustain))
	c.ctx.lineTo(rightCorner.x, rightCorner.y)
	c.ctx.stroke()
	c.ctx.closePath()
}

const drawFilter = (center: Point, size: Point, cutoff: number, qValue: number) =>{
	const padding = 0.9
	const halfHeight = size.y / 2
	const halfWidth = size.x / 2
	const leftCorner = {x: center.x - (halfWidth), y: center.y - (halfHeight * padding) + qValue}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const sqrtFrequency = Math.sqrt(cutoff)
	const maxFrequency = 142 //sqrt of 20,000Hz 
	//normalize each segment width to percentage of graph width
	const normCutoff = (sqrtFrequency / maxFrequency) * size.x
	const normQ = (qValue / 1000) * size.y
	//value at which volume is ~0
	const trueCutoff = normCutoff * 2 
	//clip output to bounding rect
	c.ctx.save()
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	c.ctx.clip()
	//draw outline
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	c.ctx.stroke()
	//draw graph
	c.ctx.moveTo(leftCorner.x, leftCorner.y + normQ)
	c.ctx.lineTo(leftCorner.x + normCutoff, leftCorner.y + normQ)
	c.ctx.quadraticCurveTo(leftCorner.x + normCutoff + trueCutoff / 4, leftCorner.y - normQ, trueCutoff, rightCorner.y)
	c.ctx.stroke()
	c.ctx.closePath()
	//remove clipping path from future drawings
	c.ctx.restore()
}

const drawPolygon = (polygon: Polygon) =>{
    c.ctx.beginPath()
    for(let i=0; i<polygon.sides.length; i++){
        c.ctx.moveTo( polygon.sides[i][0].x, polygon.sides[i][0].y )
        c.ctx.lineTo( polygon.sides[i][1].x, polygon.sides[i][1].y )
    }
    c.ctx.stroke()
    c.ctx.closePath()
}

const normalize = (value: number, min: number, max: number): number =>{
	return (value - min) / (max - min)
}

const drawBall = (ball: Ball) =>{
    c.ctx.fillStyle = ball.color
    c.ctx.beginPath()
    c.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2)
    c.ctx.closePath()
    c.ctx.fill()
}

const generateBalls = (amount: number, centers: Point[], velocity: Point, acceleration: Point, radius: number, color: string ): Ball[] =>{
    const balls: Ball[] = []
    for(let i=0; i<amount; i++){
        const ball: Ball = new Ball(centers[i], velocity, acceleration, radius, color, drawBall)
        state.objects.balls.push(ball)
    }
    return balls
}

const generateRectangleFromCenterline = (centerLine: Point[], width: number): Polygon =>{
	const vector = {x: centerLine[1].x - centerLine[0].x, y: centerLine[1].y - centerLine[0].y}
	const midpoint = {x: (centerLine[1].x + centerLine[0].x) / 2, y: (centerLine[1].y + centerLine[0].y) / 2}
	const length = vectorMagnitude(vector)
	const unitNormal = {x: -vector.y / length, y: vector.x / length}
	const thicknessVector = {x: unitNormal.x * (width / 2), y: unitNormal.y * (width / 2)}
	const points = [
		{ x: centerLine[0].x + thicknessVector.x, y: centerLine[0].y + thicknessVector.y }, //top left
		{ x: centerLine[0].x - thicknessVector.x, y: centerLine[0].y - thicknessVector.y }, //top right
		{ x: centerLine[1].x - thicknessVector.x, y: centerLine[1].y - thicknessVector.y }, //bottom left
		{ x: centerLine[1].x + thicknessVector.x, y: centerLine[1].y + thicknessVector.y }  //bottom right
	]
	return new Polygon(midpoint, points, {x:0, y:0}, {x:0, y:0}, 0, drawPolygon)
}

const getRandomPointsAroundCenter = (amount: number, center: Point, radius: number): Point[] =>{
    const points: Point[] = []
    for(let i=0; i<amount; i++){
		const plusOrMinus = Math.random() < 0.5 ? -1 : 1;
        points.push({
            x: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.x,
            y: Math.random() * (Math.random() < 0.5 ? -1 : 1) * radius + center.y
        })
    }
    return points
}

const dotProduct = (v1: Point, v2: Point): number =>{
    return (v1.x * v2.x) + (v1.y * v2.y)
}

const vectorMagnitude = (v: Point): number =>{
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2))
}

const lineToVector = (line: Point[]): Point =>{
	return { x: line[1].x - line[0].x, y: line[1].y - line[0].y }
}

const roundByStep = (number, step): number =>{
	return Math.round(number / step) * step
}

const collisionBallPoint = (ball: Ball, point: Point): boolean =>{
	const distance = vectorMagnitude({x: ball.center.x - point.x, y: ball.center.y - point.y})
	return distance <= ball.radius
}

const collisionBallSides = (ball: Ball, polygon: Polygon): boolean | Point[] =>{
	for(let i=0; i<polygon.sides.length; i++){
		if( collisionBallPoint(ball, polygon.sides[i][0]) || collisionBallPoint(ball, polygon.sides[i][1]) ){ 
			return polygon.sides[i];
		}
		if( collisionBallLine(ball, polygon.sides[i], polygon.sideLength) ){
			return polygon.sides[i];
		}
	}
	return false
}

const collisionBallLine = (ball: Ball, line: Point[], lineLength: number): boolean =>{
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

const collisionLineLine = (line1: Point[], line2: Point[]): boolean | Point =>{
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

const calculateBounce = (ball: Ball, vector: Point): Point =>{
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

const testCollisionContinuous = (ball: Ball, sides: Point[][], timeDelta: number): boolean | Point[] =>{
	const newPosition = ball.getNextPosition(timeDelta)
	const velocityMagnitude = vectorMagnitude(ball.velocity)
	const ballDirection = {x: ball.velocity.x / velocityMagnitude, y: ball.velocity.y / velocityMagnitude }
	const line1 = [
		{x: ball.center.x - (ballDirection.x * ball.radius), y: ball.center.y - (ballDirection.y * ball.radius)},
		{x: newPosition.x + (ballDirection.x * ball.radius), y: newPosition.y + (ballDirection.y * ball.radius)}
	]
	for(let i=0; i<sides.length; i++){
		const line2 = sides[i]
		const collisionPoint = collisionLineLine(line1, line2)
		
		if( collisionPoint ){
			return sides[i]
		}
	}
	return false
}

const testGlobalCollision = (ball: Ball, polygons: Polygon[], timeDelta: number): boolean | Point[] =>{
	let collision = false;
	for(let i=0; i<state.objects.polygons.length; i++){
		const potentialCollision = testCollisionContinuous(ball, state.objects.polygons[i].sides, timeDelta)
		if(potentialCollision){
			return potentialCollision
		}
	}
	return collision
}

const drawAllObjects = (objects: Drawable[][]) =>{
	c.ctx.clearRect(0,0,state.canvas.dimensions.x, state.canvas.dimensions.y)
	for(let i=0; i<objects.length; i++){
		for(let j=0; j<objects[i].length; j++){
			objects[i][j].draw()
		}
	}
}

const averageFPS = [0, 0]
const updateFPS = (fps: number) =>{
	if(averageFPS[0] > 100){ 
		averageFPS[0] = 0
		averageFPS[1] = 0
	}
	if(fps != Infinity){
		averageFPS[0] = averageFPS[0] + 1
		averageFPS[1] = averageFPS[1] + fps
	}
	const fpsElement = document.getElementById("fps")
	if(fpsElement){ fpsElement.innerHTML = `FPS: ${Math.floor(averageFPS[1] / averageFPS[0])}` }	
}

const generateSelectionOptions = (div: string, options: string[]) =>{
	const selectionDiv = document.getElementById(div)
	if( selectionDiv ){
		for(let i=0; i<options.length; i++){
			selectionDiv.innerHTML += `<option value="${options[i]}">${options[i]}</option>\n`
		}
	}else{
		console.log(`div ${div} not found in generateSelectionOptions`)
	}
}

const drawStartText = (size: number) =>{
	c.ctx.font = `${size}em monospace`
	const text = "Touch Here to Place Objects"
	const textSize = c.ctx.measureText(text)
	c.ctx.fillStyle = "white"
	c.ctx.fillText(
		text, 
		(state.canvas.dimensions.x / 2) - (textSize.width / 2), 
		(state.canvas.dimensions.y / 2) + (textSize.actualBoundingBoxAscent / 2)
	)
	c.ctx.fillStyle = "black"
}

const drawPlacingBall = (lineStart: Point, lineEnd: Point) =>{
	//draw ball outline
	c.ctx.beginPath()
	c.ctx.arc(lineStart.x, lineStart.y, state.objects.ballRadius, 0, Math.PI * 2)
	c.ctx.closePath()
	c.ctx.stroke()
	//draw ball's velocity vector
	c.ctx.beginPath()
	c.ctx.moveTo(lineStart.x, lineStart.y)
	c.ctx.lineTo(lineEnd.x, lineEnd.y)
	c.ctx.closePath()
	c.ctx.stroke()
}

const initializeCanvas = () =>{
	c.source.width = state.canvas.dimensions.x
	c.source.height = state.canvas.dimensions.y

	const polygonStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 : state.canvas.dimensions.y * 0.45, 6, Math.PI / 2)
	const polygon = new Polygon(
		state.canvas.center, 
		polygonStartingPoints,
		{x: 0, y: 0},
		{x: 0, y: 0},
		Math.PI / 10,
		drawPolygon
	)
	const polygonThickness = 10
	const polygonShellStartingPoints = generatePolygonAtPoint(state.canvas.center, state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 + polygonThickness : state.canvas.dimensions.y * 0.45 + polygonThickness, 6, Math.PI / 2)
	const polygonShell = new Polygon(
		state.canvas.center, 
		polygonShellStartingPoints,
		{x: 0, y: 0},
		{x: 0, y: 0},
		Math.PI / 10,
		drawPolygon
	)

	state.objects.polygons.push(polygon, polygonShell)
	for( const polygon of state.objects.polygons){
		polygon.draw()
	}
	c.ctx.fillStyle = "rgba(0,0,0,0.25)"
	c.ctx.fillRect(0,0,state.canvas.dimensions.x,state.canvas.dimensions.y)
	drawStartText(2)
	state.music.synth.drawADSR = drawADSR
	state.music.synth.drawFilter = drawFilter
}

generateSelectionOptions("key", Object.keys(KeyToTonic))
generateSelectionOptions("mode", Object.keys(Modes))
generateSelectionOptions("scale", Object.keys(Scales))

function animationLoop(){
	c.ctx.clearRect(0,0,state.canvas.dimensions.x, state.canvas.dimensions.y)
	for( const polygon of state.objects.polygons){
		polygon.draw()
	}
	for( const ball of state.objects.balls){
		ball.draw()
	}
	state.music.synth.drawGraph(state.canvas.center, state.music.graphSize)
	if(state.placement.currentlyPlacing == "ball" && state.placement.pointerDown){
		drawPlacingBall(state.placement.lineStart, state.placement.lineEnd)
	}
	if(state.placement.currentlyPlacing == "wall" && state.placement.pointerDown){
		const lineThickness = 10
		const rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness)
		rectangle.draw()
	}
    requestAnimationFrame( animationLoop )
}

function physicsLoop(callTime){
	const timeDelta = performance.now() - callTime
	updateFPS(Math.floor(1000 / timeDelta))
    for(let i=0; i<state.objects.polygons.length; i++){
		state.objects.polygons[i].step(timeDelta)
	}
    for(let i=0; i<state.objects.balls.length; i++){
        state.objects.balls[i].color = "black"
		const collision = testGlobalCollision(state.objects.balls[i], state.objects.polygons, timeDelta)
		if( collision ){
			state.music.synth.playRandomNote()
			const bounceVector = calculateBounce( state.objects.balls[i], lineToVector(collision[1]) )
			state.objects.balls[i].velocity = bounceVector
			state.objects.balls[i].color = "blue"
		}
		state.objects.balls[i].step(timeDelta)
    }
	const endTime: number = performance.now()
	if(!state.canvas.paused){
    	setTimeout( ()=> physicsLoop(endTime), 0 )
	}
}

document.getElementById("canvas").addEventListener("load", initializeCanvas)

document.getElementById("bounce").addEventListener("change", (e)=>{
	const bounceInput = e.target as HTMLInputElement
	state.physics.bounce = parseFloat(bounceInput.value)
})

document.getElementById("gravity").addEventListener("change", (e)=>{
	const gravityInput = e.target as HTMLInputElement
	state.physics.gravity = parseInt(gravityInput.value)
	for(const ball of state.objects.balls){
		ball.acceleration = {x: ball.acceleration.x, y: state.physics.gravity}
	}
})

document.getElementById("snap").addEventListener("change", (e)=>{
	const snapInput = e.target as HTMLInputElement
	state.placement.snapToGrid = snapInput.checked
})
document.getElementById("drawing-selector").addEventListener("change", (e)=>{
	const drawingInput = e.target as HTMLInputElement
	state.placement.currentlyPlacing = drawingInput.value
})
document.getElementById("canvas").addEventListener("pointerdown", (e)=>{
	if( state.canvas.fresh ){
		state.canvas.fresh = false
		animationLoop()
	}
	state.placement.pointerDown = true
	state.placement.lineStart = state.placement.snapToGrid 
		? {x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
})

document.getElementById("canvas").addEventListener("pointermove", (e)=>{
	state.placement.lineEnd = state.placement.snapToGrid 
		? {x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
})

document.getElementById("canvas").addEventListener("pointerup", (e)=>{
	state.placement.pointerDown = false
	state.placement.lineEnd = state.placement.snapToGrid 
		? {x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
	if(state.placement.currentlyPlacing == "wall"){
		const lineThickness = 10
		const rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness)
		state.objects.polygons.push(rectangle)
	}
	if(state.placement.currentlyPlacing == "ball"){
		const velocity = {x: -(state.placement.lineEnd.x - state.placement.lineStart.x), y: -(state.placement.lineEnd.y - state.placement.lineStart.y) }
		const velocityScale = Math.log(vectorMagnitude(velocity) + 0.0001)
		const ball = new Ball(
			state.placement.lineStart, 
			{x: velocity.x * velocityScale, y: velocity.y * velocityScale}, 
			{x: 0, y: state.physics.gravity}, 
			state.objects.ballRadius, 
			"black",
			drawBall
		)
		state.objects.balls.push(ball)
	}
})

document.getElementById("start").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "none"
	document.getElementById("pause").style.display = "block"
	state.canvas.paused = false
	physicsLoop(performance.now())
	animationLoop()
})

document.getElementById("pause").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "block"
	document.getElementById("pause").style.display = "none"
	state.canvas.paused = true
})

document.getElementById("reset").addEventListener( "click", ()=> {
	//remove all but the default polygon
	state.objects.polygons.splice(2, state.objects.polygons.length-2)
	state.objects.balls.splice(0, state.objects.balls.length)
})

document.getElementById("bpm").addEventListener("input", (e)=>{
	const bpmInput = e.target as HTMLInputElement
	state.music.bpm = parseInt(bpmInput.value)
})
document.getElementById("rhythm").addEventListener("change", (e)=>{
	const rhythmInput = e.target as HTMLInputElement
	if(parseFloat(rhythmInput.value) != 0){
		state.music.rhythm = 1 / parseFloat(rhythmInput.value)
	}else{
		state.music.rhythm = 0.0
	}
})
document.getElementById("volume").addEventListener("input", (e)=>{
	const volumeInput = e.target as HTMLInputElement
	state.music.synth.volume = parseFloat(volumeInput.value)
	state.music.synth.setGain(parseFloat(volumeInput.value))
})
document.getElementById("attack").addEventListener("input", (e)=>{
	const attackInput = e.target as HTMLInputElement
	state.music.synth.ADSR.attack = parseFloat(attackInput.value)
})
document.getElementById("decay").addEventListener("input", (e)=>{
	const decayInput = e.target as HTMLInputElement
	state.music.synth.ADSR.decay = parseFloat(decayInput.value)
})
document.getElementById("sustain").addEventListener("input", (e)=>{
	const sustainInput = e.target as HTMLInputElement
	state.music.synth.ADSR.sustain = parseFloat(sustainInput.value)
})
document.getElementById("release").addEventListener("input", (e)=>{
	const releaseInput = e.target as HTMLInputElement
	state.music.synth.ADSR.release = parseFloat(releaseInput.value)
})
document.getElementById("wave").addEventListener("input", (e)=>{
	const waveInput = e.target as HTMLInputElement
	state.music.synth.wave = <OscillatorType> waveInput.value
})
document.getElementById("key").addEventListener("input", (e)=>{
	const keyInput = e.target as HTMLInputElement
	state.music.synth.key = keyInput.value
	state.music.synth.tonic = KeyToTonic[state.music.synth.key] * Math.pow(2, state.music.synth.range[0])
	state.music.synth.generateNotes()
})
document.getElementById("mode").addEventListener("input", (e)=>{
	const modeInput = e.target as HTMLInputElement
	state.music.synth.mode = Modes[modeInput.value]
	state.music.synth.generateNotes()
})
document.getElementById("scale").addEventListener("input", (e)=>{
	const scaleInput = e.target as HTMLInputElement
	state.music.synth.scale = Scales[scaleInput.value]
	state.music.synth.generateNotes()
})
document.getElementById("filter").addEventListener("input", (e)=>{
	const frequencyInput = e.target as HTMLInputElement
	const newFrequency = Math.pow(parseFloat(frequencyInput.value), 2)
	//log-esque gain curve to adjust gain based on cutoff frequency
	const newGain = (Math.log(1 / ((newFrequency / 20000) + 1)) + 1 ) * state.music.synth.volume
	state.music.synth.setGain(newGain)
	state.music.synth.filter.frequency.exponentialRampToValueAtTime(newFrequency, state.music.synth.context.currentTime + 0.001)
})