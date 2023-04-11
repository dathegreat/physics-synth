//TODO: add symmetry mode to ball placement, mirrored across center x or y axis
//TODO: add custom selection to scale, upon selecting "custom" another option box appears with scale selection features
//TODO: Make snap to grid a regular checkbox
//TODO: despawn balls when they leave the bottom of frame
//TODO: add point drawing mode to make irregular polygons
//TODO: add polygon drawing mode to make regular polygons
//TODO: add optional lifespan to balls so they disappear after a certain # of hits

import { Polygon, generatePolygonAtPoint, generateRectangleFromCenterline } from "./Classes/Polygon.js"
import { SessionState } from "./Classes/SessionState.js"
import { Ball } from "./Classes/Ball.js"
import { Point, Canvas, Drawable, Envelope } from "./Types.js"
import { Modes, Scales, KeyToTonic } from "./MusicConstants.js"
import { Physics, vectorMagnitude } from "./Classes/Physics.js"

let state: any;
const physics = new Physics();

const normalize = (value: number, min: number, max: number): number =>{
	return (value - min) / (max - min)
}

const vectorDifference = (v1: Point, v2: Point): Point =>{
	return {x: v1.x - v2.x, y: v1.y - v2.y}
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

const lineToVector = (line: Point[]): Point =>{
	return { x: line[1].x - line[0].x, y: line[1].y - line[0].y }
}

const roundByStep = (number, step): number =>{
	return Math.round(number / step) * step
}

const drawAllObjects = (objects: Drawable[][], canvas: Canvas) =>{
	canvas.ctx.clearRect(0, 0, canvas.element.width, canvas.element.height)
	for(let i=0; i<objects.length; i++){
		for(let j=0; j<objects[i].length; j++){
			objects[i][j].draw(canvas)
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

const drawStartText = (size: number, canvas: Canvas) =>{
	canvas.ctx.font = `${size}em monospace`
	const text = "Touch Here to Place Objects"
	const textSize = state.canvas.ctx.measureText(text)
	canvas.ctx.fillStyle = "white"
	canvas.ctx.fillText(
		text, 
		(canvas.element.width / 2) - (textSize.width / 2), 
		(canvas.element.height / 2) + (textSize.actualBoundingBoxAscent / 2)
	)
	canvas.ctx.fillStyle = "black"
}

const drawPlacingBall = (lineStart: Point, lineEnd: Point, radius: number, canvas: Canvas) =>{
	//draw ball outline
	canvas.ctx.beginPath()
	canvas.ctx.arc(lineStart.x, lineStart.y, radius, 0, Math.PI * 2)
	canvas.ctx.closePath()
	canvas.ctx.stroke()
	//draw ball's velocity vector
	canvas.ctx.beginPath()
	canvas.ctx.moveTo(lineStart.x, lineStart.y)
	canvas.ctx.lineTo(lineEnd.x, lineEnd.y)
	canvas.ctx.closePath()
	canvas.ctx.stroke()
}

const initializeCanvas = () =>{
	const canvasElement = <HTMLCanvasElement> document.getElementById("canvas")
	const c: any = {
		element: canvasElement, 
		ctx: <CanvasRenderingContext2D> canvasElement.getContext("2d")
	}
	state = new SessionState(c);
	c.element.width = state.canvas.dimensions.x
	c.element.height = state.canvas.dimensions.y

	const polygonStartingPoints = generatePolygonAtPoint(
		state.canvas.center, 
		state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 : state.canvas.dimensions.y * 0.45, 
		6, 
		Math.PI / 2)
	const polygon = new Polygon(
		state.canvas.center, 
		polygonStartingPoints,
		{x: 0, y: 0},
		{x: 0, y: 0},
		0
	)
	const polygonThickness = 10
	const polygonShellStartingPoints = generatePolygonAtPoint(
		state.canvas.center, 
		state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 + polygonThickness : state.canvas.dimensions.y * 0.45 + polygonThickness, 
		6, 
		Math.PI / 2)
	const polygonShell = new Polygon(
		state.canvas.center, 
		polygonShellStartingPoints,
		{x: 0, y: 0},
		{x: 0, y: 0},
		0
	)

	state.objects.polygons.push(polygon, polygonShell)
	for( const polygon of state.objects.polygons){
		polygon.draw(state.canvas)
	}
	state.canvas.ctx.fillStyle = "rgba(0,0,0,0.25)"
	state.canvas.ctx.fillRect(0,0,state.canvas.dimensions.x,state.canvas.dimensions.y)
	drawStartText(2, state.canvas)

	generateSelectionOptions("key", Object.keys(KeyToTonic))
	generateSelectionOptions("mode", Object.keys(Modes))
	generateSelectionOptions("scale", Object.keys(Scales))
}

function animationLoop(){
	state.canvas.ctx.clearRect(0,0,state.canvas.dimensions.x, state.canvas.dimensions.y)
	for( const polygon of state.objects.polygons){
		polygon.draw(state.canvas)
	}
	for( const ball of state.objects.balls){
		ball.draw(state.canvas)
	}
	state.music.synth.drawGraph({x: state.music.graphSize.x / 2, y: state.music.graphSize.y}, state.music.graphSize, state.canvas)
	if(state.placement.currentlyPlacing == "ball" && state.placement.pointerDown){
		drawPlacingBall(state.placement.lineStart, state.placement.lineEnd, state.objects.ballRadius, state.canvas)
	}
	if(state.placement.currentlyPlacing == "wall" && state.placement.pointerDown){
		const lineThickness = 10
		const rectangle = generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], lineThickness)
		rectangle.draw(state.canvas)
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
		const collision = physics.testGlobalCollision(state.objects.balls[i], state.objects.polygons, timeDelta, state)
		if( collision ){
			state.music.synth.playRandomNote()
			const bounceVector = physics.calculateBounce( state.objects.balls[i], lineToVector(<Point[]> collision), state)
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

window.addEventListener("load", initializeCanvas)

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
	if(state.placement.currentlyPlacing == "continuous" && state.placement.pointerDown){
		if(vectorMagnitude(vectorDifference(state.placement.lineStart, state.placement.lineEnd)) > state.canvas.dimensions.x / 10){
			state.objects.polygons.push(
				generateRectangleFromCenterline([state.placement.lineStart, state.placement.lineEnd], state.placement.lineThickness)
			)
			state.placement.lineStart = state.placement.lineEnd
		}
	}
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
			"black"
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

document.getElementById("clear").addEventListener( "click", ()=> {
	//remove all but the default polygon
	state.objects.polygons.splice(0, state.objects.polygons.length)
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
	state.objects.polygons[0].rotationalVelocity = state.music.rhythm
	state.objects.polygons[1].rotationalVelocity = state.music.rhythm
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