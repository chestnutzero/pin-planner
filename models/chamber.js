import PinFactory from "./pinfactory.js";

export class Chamber {
    constructor(pinStack = [], lastRenderMetadata = null, highlighted = false, chambers, chamberIdx=null) {
        this.pinStack = pinStack;
        this.lastRenderMetadata = lastRenderMetadata;
        this.highlighted = highlighted;
        // Pointer to parent array of chambers
        this.chambers = chambers;
        // Position of this chamber in parent array
        this.chamberIdx = chamberIdx;
    }

    serialize() {
        return JSON.stringify(
            this.pinStack.map(pin => pin.serialize())
        );
    }

    removePin(pinIdx) {
        this.pinStack.splice(pinIdx, 1);
        for (let i=0; i<this.pinStack.length; i++) {
            this.pinStack[i].pinIdx = i;
        }
    }

    addPin(pin) {
        let idx = this.pinStack.push(pin) - 1;
        pin.pinIdx = idx;
        pin.chamber = this;
    }

    replacePin(pinIdx, newPin) {
        this.pinStack[pinIdx] = newPin;
        newPin.pinIdx = pinIdx;
        newPin.chamber = this;
    }

    static deserialize(pinStackJson) {
        let rawPinStack = JSON.parse(pinStackJson);
        return new Chamber(rawPinStack.map(PinFactory.deserialize));
    }

    static swap(c1, c2) {
        c1.chambers[c1.chamberIdx] = c2;
        c2.chambers[c2.chamberIdx] = c1;

        let tmp = c1.chambers;
        c1.chambers = c2.chambers;
        c2.chambers = tmp;

        tmp = c1.chamberIdx;
        c1.chamberIdx = c2.chamberIdx;
        c2.chamberIdx = tmp;
    }
}
