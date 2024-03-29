import { KeyToTonic } from "../MusicConstants"
import { Envelope, Canvas, Point } from "../Types"


const drawADSR = (center: Point, size: Point, ADSR: Envelope, canvas: Canvas) =>{
	const padding = 0.9
	const halfHeight = size.y / 2
	const halfWidth = size.x / 2
	const leftCorner = {x: center.x - (halfWidth * padding), y: center.y - (halfHeight * padding)}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const totalDuration = ADSR.attack + ADSR.decay + ADSR.release
	//normalize each segment width to percentage of graph width
	const normA = (ADSR.attack / totalDuration) * (size.x * padding)
	const normD = (ADSR.decay / totalDuration) * (size.x * padding)
	//draw outline
	canvas.ctx.beginPath()
	canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	canvas.ctx.stroke()
	//draw graph
	canvas.ctx.moveTo(leftCorner.x, rightCorner.y)
	canvas.ctx.lineTo(leftCorner.x + normA, leftCorner.y)
	canvas.ctx.lineTo(leftCorner.x + normA + normD, (rightCorner.y) - (size.y * padding * ADSR.sustain))
	canvas.ctx.lineTo(rightCorner.x, rightCorner.y)
	canvas.ctx.stroke()
	canvas.ctx.closePath()
}

const drawFilter = (center: Point, size: Point, cutoff: number, qValue: number, canvas: Canvas) =>{
	const padding = 0.9
	const halfHeight = size.y / 2
	const halfWidth = size.x / 2
	const leftCorner = {x: center.x - (halfWidth), y: center.y - (halfHeight * padding) + qValue}
	const rightCorner = {x: center.x + (halfWidth * padding), y: center.y + (halfHeight * padding)}
	const sqrtFrequency = Math.sqrt(cutoff)
	const maxFrequency = 142 //sqrt of 20,000Hz 
	//normalize each segment width to percentage of graph width
	const normCutoff = (sqrtFrequency / maxFrequency) * size.x
	const normQ = (qValue / 100) * size.y
	//value at which volume is ~0
	const trueCutoff = normCutoff * 2 
	//clip output to bounding rect
	canvas.ctx.save()
	canvas.ctx.beginPath()
	canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	canvas.ctx.clip()
	//draw outline
	canvas.ctx.beginPath()
	canvas.ctx.rect(center.x - halfWidth, center.y - halfHeight, size.x, size.y)
	canvas.ctx.stroke()
	//draw graph
	canvas.ctx.moveTo(leftCorner.x, leftCorner.y + normQ)
	canvas.ctx.lineTo(leftCorner.x + normCutoff, leftCorner.y + normQ)
	canvas.ctx.quadraticCurveTo(leftCorner.x + normCutoff + (trueCutoff / 4) - normQ, leftCorner.y - normQ, leftCorner.x + trueCutoff, rightCorner.y)
	canvas.ctx.stroke()
	canvas.ctx.closePath()
	//remove clipping path from future drawings
	canvas.ctx.restore()
}

export class Synth{
	key: string
	tonic: number
	mode: Object
	scale: Array<number>
	wave: OscillatorType
	range: number[]
	notes: number[]
	context: AudioContext
	volume: number
	volumeNode: GainNode;
	ADSR: Envelope
	filter: BiquadFilterNode
	graphCenter: { x: number; y: number; };
	graphSize: { x: number; y: number; };
	
	constructor(key: string, mode: Object, scale: Array<number>, wave: OscillatorType, range: number[], volume: number, ADSR: Envelope){
		this.key = key
		this.tonic = KeyToTonic[key] * Math.pow(2, range[0])
		this.mode = mode
		this.scale = scale
		this.wave = wave
		this.range = range
		this.ADSR = ADSR
		const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
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

	midiToFrequency(midiKey: number){
		return Math.pow(2, (midiKey - 69) / 12) * 440
	}

	playNote(frequency: number, panning?: number){
		const osc = this.context.createOscillator();
		const noteGain = this.context.createGain();
		noteGain.gain.setValueAtTime(0.01, 0.0);
		noteGain.gain.exponentialRampToValueAtTime(1.0, this.context.currentTime + this.ADSR.attack);
		noteGain.gain.exponentialRampToValueAtTime(this.ADSR.sustain, this.context.currentTime + this.ADSR.attack + this.ADSR.decay);
		noteGain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + this.ADSR.attack + this.ADSR.decay + this.ADSR.release);
		osc.type = this.wave;
		osc.frequency.setValueAtTime(frequency, 0);
		if(panning){
			const panNode = this.context.createStereoPanner()
			panNode.pan.exponentialRampToValueAtTime(panning, 0)
			osc.connect(panNode)
			panNode.connect(noteGain)
		}else{
			osc.connect(noteGain);
		}
		noteGain.connect(this.filter)
		osc.start();
		osc.stop(this.context.currentTime + this.ADSR.attack + this.ADSR.decay + this.ADSR.release);
	}
	
	getRandomNote(){
		const randomIndex: number = Math.floor(Math.random() * this.notes.length)
		return this.notes[randomIndex]
	}
	
	playRandomNote(panning?: number){
		this.playNote(this.getRandomNote(), panning)
	}
	
	drawGraph(center: Point, size: Point, canvas: Canvas){
		drawADSR(center, size, this.ADSR, canvas)
		drawFilter({x: center.x, y: center.y + size.y}, size, this.filter.frequency.value, this.filter.Q.value, canvas)
	}
	
	setGain(volume: number){
		this.volumeNode.gain.exponentialRampToValueAtTime(volume, this.context.currentTime + 0.001)
	}
	
}