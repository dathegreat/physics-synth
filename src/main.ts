//TODO: add polygon drawing mode to make regular polygons
//TODO: scrolling should affect number of sides if drawing regular polygon
//TODO: add wave effect when balls contact wall...or something cool at least. Maybe balls color the wall?
//TODO: add ball trail, perhaps
//TODO: add option to save current state and reload old states
//TODO: add ball spawn mechanic where MIDI key places ball at current mouse location
//TODO: add tutorial screen for first-time users
//TODO: add settings menu to clean up UI and add keyboard shortcuts
//TODO: change default loading geometry to something more musical (precisely calculated polyrhythm or the like)
import { Polygon, generatePolygonAtPoint, generateRectangleFromCenterline } from "../Classes/Polygon"
import { SessionState } from "../Classes/SessionState"
import { Ball } from "../Classes/Ball"
import { Point, Canvas } from "../Types"
import { Modes, Scales, KeyToTonic } from "../MusicConstants"
import { Physics, vectorMagnitude } from "../Classes/Physics"
import { Spawner } from "../Classes/Spawner"

let state: SessionState;
const physics = new Physics();

const vectorDifference = (v1: Point, v2: Point): Point =>{
	return {x: v1.x - v2.x, y: v1.y - v2.y}
}

const lineToVector = (line: Point[]): Point =>{
	return { x: line[1].x - line[0].x, y: line[1].y - line[0].y }
}

const roundByStep = (number, step): number =>{
	return Math.round(number / step) * step
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
		console.log(`div ${div} not found in generateSelectionOptions()`)
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

const drawLinesBetweenPoints = (points: Point[], color: string, canvas: Canvas) =>{
	canvas.ctx.strokeStyle = color
	canvas.ctx.lineWidth = 3
	canvas.ctx.beginPath()
	canvas.ctx.moveTo(points[0].x, points[0].y)
	for(let i=0; i<points.length; i++){
		canvas.ctx.lineTo(points[i].x, points[i].y)
	}
	canvas.ctx.stroke()
	canvas.ctx.closePath()
	canvas.ctx.lineWidth = 2
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

	// const midiHandler = new MidiHandler()

	const polygonStartingPoints = generatePolygonAtPoint(
		state.canvas.center, 
		state.canvas.dimensions.x < state.canvas.dimensions.y ? state.canvas.dimensions.x * 0.45 : state.canvas.dimensions.y * 0.45, 
		6, 
		Math.PI / 2)
	const polygon = new Polygon(
		state.canvas.center, 
		polygonStartingPoints,
		0,
		true
	)
	const polygonThickness = 10
	const polygonShellStartingPoints = generatePolygonAtPoint(
		state.canvas.center, 
		state.canvas.dimensions.x < state.canvas.dimensions.y 
			? state.canvas.dimensions.x * 0.45 + polygonThickness 
			: state.canvas.dimensions.y * 0.45 + polygonThickness, 
		6, 
		Math.PI / 2)
	const polygonShell = new Polygon(
		state.canvas.center, 
		polygonShellStartingPoints,
		0,
		true
	)

	state.objects.polygons.push(polygon, polygonShell)
	const testSpawner = new Spawner(state.canvas.center, state.objects.ballRadius * 2)
	state.objects.spawners.push(testSpawner)
	for( const polygon of state.objects.polygons ){
		polygon.draw(state.canvas)
	}
	for( const spawner of state.objects.spawners ){
		spawner.draw(state.canvas)
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
	for( const spawner of state.objects.spawners ){
		spawner.draw(state.canvas)
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
	if(state.placement.currentlyPlacing == "continuous" && state.placement.pointerDown){
		drawLinesBetweenPoints([state.placement.drawnPoints[state.placement.drawnPoints.length - 1], state.placement.lineEnd], "rgba(0,0,0,0.25)", state.canvas)
		drawLinesBetweenPoints(state.placement.drawnPoints, "black", state.canvas)
	}
	if(state.placement.currentlyPlacing == "points" && state.placement.pointerDown){
		const timeDelta = (performance.now() - state.placement.lastPointerTime) / 1000
		if(timeDelta >= 0.1){
			drawLinesBetweenPoints([state.placement.drawnPoints[state.placement.drawnPoints.length - 1], state.placement.lineEnd], "black", state.canvas)
		}else{
			drawLinesBetweenPoints([state.placement.drawnPoints[state.placement.drawnPoints.length - 1], state.placement.lineEnd], "rgba(0,0,0,0.25)", state.canvas)
		}
		drawLinesBetweenPoints(state.placement.drawnPoints, "black", state.canvas)
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
		if(state.objects.balls[i].hitCount >= state.objects.maximumHitCount || state.objects.balls[i].center.y > state.canvas.dimensions.y){
			state.objects.balls.splice(i, 1)
			continue;
		}
		const collision = physics.testGlobalCollision(state.objects.balls[i], timeDelta, state)
		if( collision ){
			if( vectorMagnitude(state.objects.balls[i].velocity) > state.music.minimumTriggerVelocity){
				const positionInStereoField = (state.objects.balls[i].center.x - (state.canvas.dimensions.x / 2)) / (state.canvas.dimensions.x / 2)
				state.music.synth.playNote(state.objects.balls[i].frequency, positionInStereoField)
			}
			const bounceVector = physics.calculateBounce( state.objects.balls[i], lineToVector(<Point[]> collision), state)
			state.objects.balls[i].velocity = bounceVector
			state.objects.balls[i].hitCount += 1
		}
		state.objects.balls[i].step(timeDelta)
    }
	const endTime: number = performance.now()
	if(!state.canvas.paused){
    	setTimeout( ()=> physicsLoop(endTime), 0 )
	}
}

function bpmClick(){
	//spawn a new ball from each spawner according to BPM clock
	if(state.objects.spawners.length > 0 && !state.canvas.paused && !state.objects.spawnersPaused){
		for( const spawner of state.objects.spawners ){
			spawner.spawn(state)
		}
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

document.getElementById("ball-life").addEventListener("change", (e)=>{
	const immortalBallsInput = e.target as HTMLInputElement
	state.objects.maximumHitCount = immortalBallsInput.checked ? Infinity : 1
})

document.getElementById("pause-spawner").addEventListener("change", (e)=>{
	const spawnerPauseInput = e.target as HTMLInputElement
	state.objects.spawnersPaused = spawnerPauseInput.checked
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
	if(state.placement.currentlyPlacing == "continuous"){
		state.placement.lastPointerPosition = state.placement.lineStart
		state.placement.drawnPoints.push(state.placement.lineStart)
	}
	if(state.placement.currentlyPlacing == "points"){
		state.placement.lastPointerTime = performance.now()
		state.placement.lastPointerPosition = state.placement.lineStart
		state.placement.drawnPoints.push(state.placement.lineStart)
	}
})

document.getElementById("canvas").addEventListener("pointermove", (e)=>{
	state.placement.lineEnd = state.placement.snapToGrid 
		? {x: roundByStep(e.offsetX, state.placement.roundX), y: roundByStep(e.offsetY, state.placement.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
	if(state.placement.currentlyPlacing == "continuous" && state.placement.pointerDown){
		if(vectorMagnitude(vectorDifference(state.placement.lineStart, state.placement.lineEnd)) > state.canvas.dimensions.x / 100){
			state.placement.drawnPoints.push(state.placement.lineEnd)
			state.placement.lineStart = state.placement.lineEnd
		}
	}
	if(state.placement.currentlyPlacing == "points" && state.placement.pointerDown){
		const timeDeltaSeconds = (performance.now() - state.placement.lastPointerTime) / 1000
		if(timeDeltaSeconds >= 0.1){
			state.placement.drawnPoints.push(state.placement.lastPointerPosition)
			state.placement.lineStart = state.placement.lastPointerPosition
		}
		state.placement.lastPointerPosition = state.placement.lineEnd
		state.placement.lastPointerTime = performance.now()
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
			state.music.synth.getRandomNote()
		)
		state.objects.balls.push(ball)
	}
	if(state.placement.currentlyPlacing == "spawner"){
		const spawner = new Spawner(state.placement.lineStart, state.objects.ballRadius * 2)
		state.objects.spawners.push(spawner)
	}
	if(state.placement.currentlyPlacing == "continuous"){
		state.placement.drawnPoints.push(state.placement.lineEnd)
		if(state.placement.drawnPoints.length > 1){
			state.objects.polygons.push(
				new Polygon({x:0,y:0}, state.placement.drawnPoints, 0, false)
			)
		}
		console.log(state.placement.drawnPoints.length)
		state.placement.drawnPoints = []
	}
	if(state.placement.currentlyPlacing == "points"){
		state.placement.drawnPoints.push(state.placement.lineEnd)
		if(state.placement.drawnPoints.length > 1){
			state.objects.polygons.push(
				new Polygon({x:0,y:0}, state.placement.drawnPoints, 0, true)
			)
		}
		state.placement.drawnPoints = []
	}
})

document.getElementById("start").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "none"
	document.getElementById("pause").style.display = "block"
	state.canvas.paused = false
	physicsLoop(performance.now())
	animationLoop()
	if(!state.music.bpmIntervalID){ state.createNewBpmInterval(bpmClick)}
})

document.getElementById("pause").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "block"
	document.getElementById("pause").style.display = "none"
	state.canvas.paused = true
})

document.getElementById("clear").addEventListener( "click", ()=> {
	//remove all objects from the state
	state.objects.polygons.splice(0, state.objects.polygons.length)
	state.objects.spawners.splice(0, state.objects.spawners.length)
	state.objects.balls.splice(0, state.objects.balls.length)
})

document.getElementById("bpm").addEventListener("input", (e)=>{
	const bpmInput = e.target as HTMLInputElement
	state.music.bpm = parseInt(bpmInput.value)
})
document.getElementById("rhythm").addEventListener("change", (e)=>{
	const rhythmInput = e.target as HTMLInputElement
	state.music.rhythm = parseFloat(rhythmInput.value)
	state.createNewBpmInterval(bpmClick)
	// state.objects.polygons[0].rotationalVelocity = state.music.rhythm
	// state.objects.polygons[1].rotationalVelocity = state.music.rhythm
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
	if(scaleInput.value === "custom"){
		document.getElementById("custom-scale").style.display = "flex"

	}else{
		document.getElementById("custom-scale").style.display = "none"
	}
	state.music.synth.scale = Scales[scaleInput.value]
	state.music.synth.generateNotes()
})
document.getElementById("custom-scale").addEventListener("input", (e)=>{
	const customScaleInput = e.target as HTMLInputElement
	const inputAsInt = parseInt(customScaleInput.value)
	console.log(inputAsInt)
	if(state.music.synth.scale.length == 1 && !customScaleInput.checked){
		customScaleInput.checked = true
		return;
	}
	if( !customScaleInput.checked && state.music.synth.scale.includes(inputAsInt) ){
		state.music.synth.scale = state.music.synth.scale.filter(e => e !== inputAsInt)
	}
	if( customScaleInput.checked && !state.music.synth.scale.includes(inputAsInt) ){
		console.log(state.music.synth.scale)
		state.music.synth.scale.push(inputAsInt)
	}
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