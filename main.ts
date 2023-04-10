//TODO: add symmetry mode to ball placement, mirrored across center x or y axis
//TODO: add custom selection to scale, upon selecting "custom" another option box appears with scale selection features
//TODO: Make snap to grid a regular checkbox

interface Canvas{
    source: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

interface Point{
    x: number;
    y: number;
}

class Rectangle{
	vector: Point
	length: number
	width: number
	unitNormal: Point
	thicknessVector: Point
	points: Point[]
	sides: Point[][]
	
	constructor(centerLine: Point[], width: number){
		this.vector = {x: centerLine[1].x - centerLine[0].x, y: centerLine[1].y - centerLine[0].y}
		this.length = vectorMagnitude(this.vector)
		this.width = width
		this.unitNormal = {x: -this.vector.y / this.length, y: this.vector.x / this.length}
		this.thicknessVector = {x: this.unitNormal.x * (this.width / 2), y: this.unitNormal.y * (this.width / 2)}
		this.points = [
			{ x: centerLine[0].x + this.thicknessVector.x, y: centerLine[0].y + this.thicknessVector.y }, //top left
			{ x: centerLine[0].x - this.thicknessVector.x, y: centerLine[0].y - this.thicknessVector.y }, //top right
			{ x: centerLine[1].x - this.thicknessVector.x, y: centerLine[1].y - this.thicknessVector.y }, //bottom left
			{ x: centerLine[1].x + this.thicknessVector.x, y: centerLine[1].y + this.thicknessVector.y }  //bottom right
		]
		this.sides = pointsToLines(this.points)
	}
	
	draw(){
		drawPolygon(this)
	}
}

class Polygon{
    center: Point
	rotationalVelocity: number
    points: Point[]
	sides: Point[][]
    sideLength: number

    constructor(center: Point, points: Point[], velocity: Point, acceleration: Point, rotationalVelocity: number){
        this.center = center;
		this.rotationalVelocity = rotationalVelocity
        this.points = points
		this.sides = pointsToLines(this.points)
        this.sideLength = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2) )
    }

	step(timeDelta: number){
		if(this.rotationalVelocity < 0 || this.rotationalVelocity > 0){
			this.rotate(this.rotationalVelocity * timeDelta / 1000)
		}
	}
	
    rotate(angle: number){
        this.points = this.points.map( (point)=> {return rotatePointAboutPoint(point, this.center, angle)} )
		this.sides = pointsToLines(this.points)
    }

    draw(){
        drawPolygon(this)
    }
}

class Ball{
    center: Point
    velocity: Point
    acceleration: Point
    radius: number
    color: string

    constructor(center: Point, velocity: Point, acceleration: Point, radius: number, color: string){
        this.center = center
        this.velocity = velocity
        this.acceleration = acceleration
        this.radius = radius
        this.color = color
    }   
	
	getNextPosition(timeDelta: number){
		return {
			x: this.center.x + (this.velocity.x * (timeDelta / 1000)),
			y: this.center.y + (this.velocity.y * (timeDelta / 1000))
		}
	}

    step(timeDelta: number){
		//console.log(Math.sqrt(Math.pow(this.velocity.y, 2) + Math.pow(this.velocity.x, 2)))
        this.center.x += this.velocity.x * (timeDelta / 1000)
        this.center.y += this.velocity.y * (timeDelta / 1000)
        this.velocity.x += this.acceleration.x * (timeDelta / 1000)
        this.velocity.y += this.acceleration.y * (timeDelta / 1000)
    }
	
	unStep(timeDelta: number){
		this.velocity.y -= this.acceleration.y * (timeDelta / 1000)
		this.velocity.x -= this.acceleration.x * (timeDelta / 1000)
		this.center.y -= this.velocity.y * (timeDelta / 1000)
		this.center.x -= this.velocity.x * (timeDelta / 1000)
	}

    draw(){
        drawBall(this)
    }
}

const keyToTonic = {
	"A": 27.50,
	"A#": 29.14,
	"B": 30.87,
	"C": 16.35,
	"C#": 17.32,
	"D": 18.35,
	"D#": 19.45,
	"E": 20.60,
	"F": 21.83,
	"F#": 23.12,
	"G": 24.50,
	"G#": 25.96
}

const modes = {
	major: {
		1: 1,
		2: 1.122462,
		3: 1.259921,
		4: 1.33484,
		5: 1.498307,
		6: 1.681793,
		7: 1.887749,
		8: 2	
	},
	minor: {
		1: 1,
		2: 1.059463,
		3: 1.189207,
		4: 1.33484,
		5: 1.498307,
		6: 1.587401,
		7: 1.781797,
		8: 2	
	}  
}

const scales = {
	pentatonic: [1, 2, 3, 5, 6],
	chromatic: [1, 2, 3, 4, 5, 6, 7],
	triad: [1, 3, 5],
	seventh: [1, 3, 5, 7]
}


class Synth{
	key: string
	tonic: number
	mode: Object
	scale: Object
	wave: string
	range: number[]
	notes: number[]
	context: AudioContext
	volume: GainNode
	attack: number
	decay: number
	sustain: number
	release: number
	filter: BiquadFilterNode
	
	constructor(key: string, mode: Object, scale: Object, wave: string, range: number[], volume: number, attack: number, decay: number, sustain: number, release: number){
		this.key = key
		this.tonic = keyToTonic[key] * Math.pow(2, range[0])
		this.mode = mode
		this.scale = scale
		this.wave = wave
		this.range = range
		this.attack = attack
		this.decay = decay
		this.sustain = sustain
		this.release = release
		this.graphCenter = {x: screenCenter.x * 0.2, y: canvasDimensions.x * 0.1}
		this.graphSize = {x: canvasDimensions.x * 0.2, y: canvasDimensions.x * 0.1} 
		const AudioContext = window.AudioContext || window.webkitAudioContext;
		this.context = new AudioContext();
		this.volume = volume
		this.volumeNode = this.context.createGain();
		this.volumeNode.gain.exponentialRampToValueAtTime(this.volume, this.context.currentTime + 0.001)
		this.filter = this.context.createBiquadFilter()
		this.filter.type = "lowpass"
		this.filter.frequency.exponentialRampToValueAtTime(10000, this.context.currentTime + 0.001)
		this.filter.connect(this.volumeNode)
		this.volumeNode.connect(this.context.destination)
	}
	generateNotes(){
		const notes: number[] = []
		for(let i=0; i<this.scale.length; i++){
			for(let j=0; j< this.range[1] - this.range[0]; j++){
				notes.push(
					this.tonic * Math.pow(2, j) * this.mode[this.scale[i]]
				)
			}
		}
		this.notes = notes
	}
	
	getRandomNote(){
		const randomIndex: number = Math.floor(Math.random() * this.notes.length)
		return this.notes[randomIndex]
	}
	
	async playRandomNote(){
		const osc = this.context.createOscillator();
		const noteGain = this.context.createGain();
		noteGain.gain.setValueAtTime(0.01, 0.0);
		noteGain.gain.exponentialRampToValueAtTime(1.0, this.context.currentTime + this.attack);
		noteGain.gain.exponentialRampToValueAtTime(this.sustain, this.context.currentTime + this.attack + this.decay);
		noteGain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + this.attack + this.decay + this.release);

		osc.type = this.wave;
		osc.frequency.setValueAtTime(this.getRandomNote(), 0);
		osc.connect(noteGain);
		noteGain.connect(this.filter)
		osc.start();
		osc.stop(this.context.currentTime + this.attack + this.decay + this.release);
		
	}
	
	drawGraph(){
		drawADSR(this.graphSize.x, this.graphSize.y, this.graphCenter, this.attack, this.decay, this.sustain, this.release)
		drawFilter(this.graphSize.x, this.graphSize.y, {x:this.graphCenter.x, y:this.graphCenter.y + this.graphSize.y}, this.filter.frequency.value, this.filter.Q.value)
	}
	
	setGain(volume: number){
		this.volumeNode.gain.exponentialRampToValueAtTime(volume, this.context.currentTime + 0.001)
	}
	
}

const canvasElement = document.getElementById("canvas")
const c: Canvas = {
    source: canvasElement, 
    ctx: canvasElement.getContext("2d")
}

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

const drawPolygon = (polygon: Polygon) =>{
    c.ctx.beginPath()
    for(let i=0; i<polygon.sides.length; i++){
        c.ctx.moveTo( polygon.sides[i][0].x, polygon.sides[i][0].y )
        c.ctx.lineTo( polygon.sides[i][1].x, polygon.sides[i][1].y )
    }
    c.ctx.stroke()
    c.ctx.closePath()
}

const normalize = (value: number, min: number, max: number) =>{
	return (value - min) / (max - min)
}

const drawADSR = (width: number, height: number, center: Point, a: number, d: number, s: number, r: number) =>{
	const padding = 0.9
	const halfHeight = height / 2
	const halfWidth = width / 2
	const leftCorner = {x: center.x - (halfWidth * padding), y: center.y - (halfHeight * padding)}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const totalDuration = a + d + r
	//normalize each segment width to percentage of graph width
	const normA = (a / totalDuration) * (width * padding)
	const normD = (d / totalDuration) * (width * padding)
	const normR = (r / totalDuration) * (width * padding)
	//draw outline
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, width, height)
	c.ctx.stroke()
	//draw graph
	c.ctx.moveTo(leftCorner.x, rightCorner.y)
	c.ctx.lineTo(leftCorner.x + normA, leftCorner.y)
	c.ctx.lineTo(leftCorner.x + normA + normD, (rightCorner.y) - (height * padding * s))
	c.ctx.lineTo(rightCorner.x, rightCorner.y)
	c.ctx.stroke()
	c.ctx.closePath()
}

const drawFilter = (width: number, height: number, center: Point, cutoff: number, qValue: number) =>{
	const padding = 0.9
	const halfHeight = height / 2
	const halfWidth = width / 2
	const leftCorner = {x: center.x - (halfWidth), y: center.y - (halfHeight * padding) + qValue}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const sqrtFrequency = Math.sqrt(cutoff)
	const maxFrequency = 142 //sqrt of 20,000Hz 
	//normalize each segment width to percentage of graph width
	const normCutoff = (sqrtFrequency / maxFrequency) * width
	const normQ = (qValue / 1000) * height
	//value at which volume is ~0
	const trueCutoff = normCutoff * 2 
	//clip output to bounding rect
	c.ctx.save()
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, width, height)
	c.ctx.clip()
	//draw outline
	c.ctx.beginPath()
	c.ctx.rect(center.x - halfWidth, center.y - halfHeight, width, height)
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

const pointsToLines = (points: Point[]) =>{
	const lines: Point[][] = []
	for(let i=0; i<points.length-1; i++){
        lines.push( [
			{ x: points[i].x,   y: points[i].y },
			{ x: points[i+1].x, y: points[i+1].y }
		] )
    }
    lines.push( [
		{ x: points[points.length-1].x, y: points[points.length-1].y },
		{ x: points[0].x,               y: points[0].y }
	] )
	return lines
}

const drawBall = (ball: Ball) =>{
    c.ctx.fillStyle = ball.color
    c.ctx.beginPath()
    c.ctx.arc(ball.center.x, ball.center.y, ball.radius, 0, Math.PI * 2)
    c.ctx.closePath()
    c.ctx.fill()
}

const generateBalls = (amount: number, centers: Point[], velocity: Point, acceleration: Point, radius: number, color: string ): Ball[] =>{
    const balls = []
    for(let i=0; i<amount; i++){
        const ball: Ball = new Ball(centers[i], velocity, acceleration, radius, color)
        balls.push(ball)
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
	return new Polygon(midpoint, points, {x:0, y:0}, {x:0, y:0}, 0)
}

const getRandomPointsAroundCenter = (amount: number, center: Point, radius: number): Point[] =>{
    const points = []
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

const rotatePointAboutPoint = (p1: Point, p2: Point, angle: number) =>{
    const rotatedPoint: Point = { 
        x: (Math.cos(angle) * (p1.x - p2.x)) - (Math.sin(angle) * (p1.y - p2.y)) + p2.x,
        y: (Math.sin(angle) * (p1.x - p2.x)) + (Math.cos(angle) * (p1.y - p2.y)) + p2.y
    }
    return rotatedPoint;
}

function roundByStep(number, step){
	return Math.round(number / step) * step
}

const collisionBallPoint = (ball: Ball, point: Point) =>{
	const distance = vectorMagnitude({x: ball.center.x - point.x, y: ball.center.y - point.y})
	return distance <= ball.radius
}

const collisionBallSides = (ball: Ball, polygon: Polygon) =>{
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

const collisionBallLine = (ball: Ball, line: Point[], lineLength: number) =>{
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

const collisionLineLine = (line1: Point[], line2: Point[]) =>{
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

const calculateBounce = (ball: Ball, vector: Point) =>{
	const lineNormal: Point = {x: -vector.y, y: vector.x}
	const normalMagnitude: number = vectorMagnitude(lineNormal)
	const unitNormal: Point = {x: lineNormal.x / normalMagnitude, y: lineNormal.y / normalMagnitude}
	const ballDotNormal: number = dotProduct(ball.velocity, unitNormal)
	const normalScaler: number = 2 * ballDotNormal
	const reflection: Point = {
		x: (ball.velocity.x - (normalScaler * unitNormal.x)) * 1 / Globals.bounce, 
		y: (ball.velocity.y - (normalScaler * unitNormal.y)) * 1 / Globals.bounce
	}
	return reflection
}

const testCollisionContinuous = (ball: Ball, sides: Point[][], timeDelta: number) =>{
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
			return [
				{x: collisionPoint.x, y: collisionPoint.y},
				sides[i]
			]
		}
	}
	return false
}

const testGlobalCollision = (ball: Ball, polygons: Polygon[], timeDelta: number) =>{
	let collision = false
	for(let i=0; i<polygons.length; i++){
		const potentialCollision = testCollisionContinuous(ball, polygons[i].sides, timeDelta)
		if(potentialCollision){
			collision = potentialCollision
		}
	}
	return collision
}

const drawAllObjects = (objects: Any[][]) =>{
	c.ctx.clearRect(0,0,canvasDimensions.x, canvasDimensions.y)
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
	document.getElementById("fps").innerHTML = `FPS: ${Math.floor(averageFPS[1] / averageFPS[0])}`
}

const generateSelectionOptions = (div: string, options: string[]) =>{
	const selectionDiv = document.getElementById(div)
	for(let i=0; i<options.length; i++){
		selectionDiv.innerHTML += `<option value="${options[i]}">${options[i]}</option>\n`
	}
}

const drawStartText = (size: number) =>{
	c.ctx.font = `${parseFloat(size)}em monospace`
	const text = "Touch Here to Place Objects"
	const textSize = c.ctx.measureText(text)
	c.ctx.fillStyle = "white"
	c.ctx.fillText(
		text, 
		(canvasDimensions.x / 2) - (textSize.width / 2), 
		(canvasDimensions.y / 2) + (textSize.actualBoundingBoxAscent / 2)
	)
	c.ctx.fillStyle = "black"
}

const drawPlacingBall = (lineStart: Point, lineEnd: Point) =>{
	//draw ball outline
	c.ctx.beginPath()
	c.ctx.arc(lineStart.x, lineStart.y, ballRadius, 0, Math.PI * 2)
	c.ctx.closePath()
	c.ctx.stroke()
	//draw ball's velocity vector
	c.ctx.beginPath()
	c.ctx.moveTo(lineStart.x, lineStart.y)
	c.ctx.lineTo(lineEnd.x, lineEnd.y)
	c.ctx.closePath()
	c.ctx.stroke()
}

const canvasDimensions: Point = {x: window.innerWidth / 2, y: window.innerHeight * 0.75}

const screenCenter: Point = {
    x: Math.floor(canvasDimensions.x / 2),
    y: Math.floor(canvasDimensions.y / 2)
}

const Globals = {
	lineStart : {x: 0, y: 0},
	lineEnd : {x: 0, y: 0},
	currentlyPlacing : "ball",
	pointerDown : false,
	//canvas hasn't been interacted with yet
	freshCanvas : true,
	paused : false,
	snapToGrid : false,
	roundX : canvasDimensions.x / 20,
	roundY : canvasDimensions.y / 20,
	bounce : 1
}

c.source.width = canvasDimensions.x
c.source.height = canvasDimensions.y
c.source.style.border = "1px solid black"
const polygonStartingPoints = generatePolygonAtPoint(screenCenter, canvasDimensions.x < canvasDimensions.y ? canvasDimensions.x * 0.45 : canvasDimensions.y * 0.45, 6, Math.PI / 2)
const polygon = new Polygon(
	screenCenter, 
	polygonStartingPoints,
	{x: 0, y: 0},
	{x: 0, y: 0},
	Math.PI / 10
)
const polygonThickness = 10
const polygonShellStartingPoints = generatePolygonAtPoint(screenCenter, canvasDimensions.x < canvasDimensions.y ? canvasDimensions.x * 0.45 + polygonThickness : canvasDimensions.y * 0.45 + polygonThickness, 6, Math.PI / 2)
const polygonShell = new Polygon(
	screenCenter, 
	polygonShellStartingPoints,
	{x: 0, y: 0},
	{x: 0, y: 0},
	Math.PI / 10
)
//
const ballAmount = 3
let bpm: number = 120
let rhythm: number = 1
let gravity: number = 250
let ballRadius = ((canvasDimensions.x + canvasDimensions.y) / 2) * 0.01
const startingPoints = getRandomPointsAroundCenter(ballAmount, screenCenter, 100)
// const balls: Ball[] = generateBalls(ballAmount, startingPoints, {x: 0, y: 0}, {x: 0, y: gravity}, 10, "black")
const balls: Ball[] = []
const polygons: Polygon[] = [polygon, polygonShell]
const synth = new Synth("A", modes["major"], scales["pentatonic"], "sine", [4,5], 0.1, 0.01, 0.1, 1, 0.5)
synth.generateNotes()
for( const polygon of polygons ){
	polygon.draw()
}
c.ctx.fillStyle = "rgba(0,0,0,0.25)"
c.ctx.fillRect(0,0,canvasDimensions.x,canvasDimensions.y)
drawStartText(2)

generateSelectionOptions("key", Object.keys(keyToTonic))
generateSelectionOptions("mode", Object.keys(modes))
generateSelectionOptions("scale", Object.keys(scales))

function animationLoop(){
	c.ctx.clearRect(0,0,canvasDimensions.x, canvasDimensions.y)
	for( const polygon of polygons ){
		polygon.draw()
	}
	for( const ball of balls ){
		ball.draw()
	}
	synth.drawGraph()
	if(Globals.currentlyPlacing == "ball" && Globals.pointerDown){
		drawPlacingBall(Globals.lineStart, Globals.lineEnd)
	}
	if(Globals.currentlyPlacing == "wall" && Globals.pointerDown){
		const lineThickness = 10
		const rectangle = generateRectangleFromCenterline([Globals.lineStart, Globals.lineEnd], lineThickness)
		rectangle.draw()
	}
    requestAnimationFrame( animationLoop )
}

function physicsLoop(callTime){
	const timeDelta = performance.now() - callTime
	updateFPS(Math.floor(1000 / timeDelta))
    for(let i=0; i<polygons.length; i++){
		polygons[i].step(timeDelta)
	}
    for(let i=0; i<balls.length; i++){
        balls[i].color = "black"
		const collision = testGlobalCollision(balls[i], polygons, timeDelta)
		if( collision ){
			synth.playRandomNote()
			const bounceVector = calculateBounce( balls[i], lineToVector(collision[1]) )
			balls[i].velocity = bounceVector
			balls[i].color = "blue"
		}
		balls[i].step(timeDelta)
    }
	const endTime: number = performance.now()
	if(!Globals.paused){
    	setTimeout( ()=> physicsLoop(endTime), 0 )
	}
}

document.getElementById("bounce").addEventListener("change", (e)=>{
	Globals.bounce = parseFloat(e.target.value)
})

document.getElementById("gravity").addEventListener("change", (e)=>{
	gravity = parseInt(e.target.value)
	for(const ball of balls){
		ball.acceleration = {x: ball.acceleration.x, y: gravity}
	}
})

document.getElementById("snap").addEventListener("change", (e)=>{
	Globals.snapToGrid = e.target.checked
})
document.getElementById("drawing-selector").addEventListener("change", (e)=>{
	Globals.currentlyPlacing = e.target.value
})
document.getElementById("canvas").addEventListener("pointerdown", (e)=>{
	if( Globals.freshCanvas ){
		Globals.freshCanvas = false
		animationLoop()
	}
	Globals.pointerDown = true
	Globals.lineStart = Globals.snapToGrid 
		? {x: roundByStep(e.offsetX, Globals.roundX), y: roundByStep(e.offsetY, Globals.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
})

document.getElementById("canvas").addEventListener("pointermove", (e)=>{
	Globals.lineEnd = Globals.snapToGrid 
		? {x: roundByStep(e.offsetX, Globals.roundX), y: roundByStep(e.offsetY, Globals.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
})

document.getElementById("canvas").addEventListener("pointerup", (e)=>{
	Globals.pointerDown = false
	Globals.lineEnd = Globals.snapToGrid 
		? {x: roundByStep(e.offsetX, Globals.roundX), y: roundByStep(e.offsetY, Globals.roundY)} 
		: {x: e.offsetX, y: e.offsetY}
	if(Globals.currentlyPlacing == "wall"){
		const lineThickness = 10
		const rectangle = generateRectangleFromCenterline([Globals.lineStart, Globals.lineEnd], lineThickness)
		polygons.push(rectangle)
	}
	if(Globals.currentlyPlacing == "ball"){
		const velocity = {x: -(Globals.lineEnd.x - Globals.lineStart.x), y: -(Globals.lineEnd.y - Globals.lineStart.y) }
		const velocityScale = Math.log(vectorMagnitude(velocity) + 0.0001)
		const ball = new Ball(Globals.lineStart, {x: velocity.x * velocityScale, y: velocity.y * velocityScale}, {x: 0, y: gravity}, ballRadius, "black")
		balls.push(ball)
	}
})

document.getElementById("start").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "none"
	document.getElementById("pause").style.display = "block"
	Globals.paused = false
	physicsLoop(performance.now())
	animationLoop()
})

document.getElementById("pause").addEventListener( "click", ()=> {
	document.getElementById("start").style.display = "block"
	document.getElementById("pause").style.display = "none"
	Globals.paused = true
})

document.getElementById("reset").addEventListener( "click", ()=> {
	//remove all but the default polygon
	polygons.splice(2, polygons.length-2)
	balls.splice(0, balls.length)
})

document.getElementById("bpm").addEventListener("input", (e)=>{
	bpm = e.target.value
	polygon.rotationalVelocity = (Math.PI / polygon.sides.length) * rhythm * (bpm / 60); 
	polygonShell.rotationalVelocity = (Math.PI / polygonShell.sides.length) * rhythm * (bpm / 60);
})
document.getElementById("rhythm").addEventListener("change", (e)=>{
	if(parseFloat(e.target.value) != 0){
		rhythm = 1 / parseFloat(e.target.value)
	}else{
		rhythm = 0.0
	}
	polygon.rotationalVelocity = (Math.PI / polygon.sides.length) * rhythm * (bpm / 60); 
	polygonShell.rotationalVelocity = (Math.PI / polygonShell.sides.length) * rhythm * (bpm / 60);
})
document.getElementById("volume").addEventListener("input", (e)=>{
	synth.volume = parseFloat(e.target.value)
	synth.setGain(parseFloat(e.target.value))
})
document.getElementById("attack").addEventListener("input", (e)=>{
	synth.attack = parseFloat(e.target.value)
})
document.getElementById("decay").addEventListener("input", (e)=>{
	synth.decay = parseFloat(e.target.value)
})
document.getElementById("sustain").addEventListener("input", (e)=>{
	synth.sustain = parseFloat(e.target.value)
})
document.getElementById("release").addEventListener("input", (e)=>{
	synth.release = parseFloat(e.target.value)
})
document.getElementById("wave").addEventListener("input", (e)=>{
	synth.wave = e.target.value
})
document.getElementById("key").addEventListener("input", (e)=>{
	synth.key = e.target.value
	synth.tonic = keyToTonic[synth.key] * Math.pow(2, synth.range[0])
	synth.generateNotes()
})
document.getElementById("mode").addEventListener("input", (e)=>{
	synth.mode = modes[e.target.value]
	synth.generateNotes()
})
document.getElementById("scale").addEventListener("input", (e)=>{
	synth.scale = scales[e.target.value]
	synth.generateNotes()
})
document.getElementById("filter").addEventListener("input", (e)=>{
	const newFrequency = Math.pow(parseFloat(e.target.value), 2)
	//log-esque gain curve to adjust gain based on cutoff frequency
	const newGain = (Math.log(1 / ((newFrequency / 20000) + 1)) + 1 ) * synth.volume
	synth.setGain(newGain)
	synth.filter.frequency.exponentialRampToValueAtTime(newFrequency, synth.context.currentTime + 0.001)
})