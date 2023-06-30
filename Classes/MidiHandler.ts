export class MidiHandler{
    midiAccess: MIDIAccess
    currentNoteValue: number
    constructor(){
        console.log("that happened")
        navigator.requestMIDIAccess({sysex: true, software: true}).then(
            //midi device exists
            (midiAccess)=>{ 
                this.midiAccess = midiAccess
                midiAccess.onstatechange = ()=>{
                    console.log("state changed")
                }
                for( const input of midiAccess.inputs.values()){
                    input[1].onmidimessage = this.updateMidiValue
                    console.log("did it")
                }
            },
            //midi device does not exist
            ()=>{console.log("no midi devices found")}
        )
    }

    updateMidiValue(midiEvent: MIDIMessageEvent){
        if(midiEvent.data[0] > 21 || midiEvent.data[0] < 127){
            this.currentNoteValue = midiEvent.data[0]
            console.log(midiEvent.data)
        }
    }
}