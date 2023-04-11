import { KeyToTonic } from "../MusicConstants.js";
export class Synth {
    constructor(key, mode, scale, wave, range, volume, ADSR, drawADSR, drawFilter) {
        this.key = key;
        this.tonic = KeyToTonic[key] * Math.pow(2, range[0]);
        this.mode = mode;
        this.scale = scale;
        this.wave = wave;
        this.range = range;
        this.ADSR = ADSR;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.volume = volume;
        this.volumeNode = this.context.createGain();
        this.volumeNode.gain.exponentialRampToValueAtTime(this.volume, this.context.currentTime + 0.001);
        this.filter = this.context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.exponentialRampToValueAtTime(10000, this.context.currentTime + 0.001);
        this.filter.connect(this.volumeNode);
        this.volumeNode.connect(this.context.destination);
        this.drawADSR = drawADSR;
        this.drawFilter = drawFilter;
    }
    generateNotes() {
        const notes = [];
        for (let i = 0; i < this.scale.length; i++) {
            for (let j = 0; j < this.range[1] - this.range[0]; j++) {
                notes.push(this.tonic * Math.pow(2, j) * this.mode[this.scale[i]]);
            }
        }
        this.notes = notes;
    }
    getRandomNote() {
        const randomIndex = Math.floor(Math.random() * this.notes.length);
        return this.notes[randomIndex];
    }
    playRandomNote() {
        const osc = this.context.createOscillator();
        const noteGain = this.context.createGain();
        noteGain.gain.setValueAtTime(0.01, 0.0);
        noteGain.gain.exponentialRampToValueAtTime(1.0, this.context.currentTime + this.ADSR.attack);
        noteGain.gain.exponentialRampToValueAtTime(this.ADSR.sustain, this.context.currentTime + this.ADSR.attack + this.ADSR.decay);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + this.ADSR.attack + this.ADSR.decay + this.ADSR.release);
        osc.type = this.wave;
        osc.frequency.setValueAtTime(this.getRandomNote(), 0);
        osc.connect(noteGain);
        noteGain.connect(this.filter);
        osc.start();
        osc.stop(this.context.currentTime + this.ADSR.attack + this.ADSR.decay + this.ADSR.release);
    }
    drawGraph(center, size) {
        this.drawADSR(center, size, this.ADSR);
        this.drawFilter({ x: center.x, y: center.y + size.y }, size, this.filter.frequency.value, this.filter.Q.value);
    }
    setGain(volume) {
        this.volumeNode.gain.exponentialRampToValueAtTime(volume, this.context.currentTime + 0.001);
    }
}
//# sourceMappingURL=Synth.js.map