import {chamberHeightToWidthRatio} from "./renderer.js";

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
        return new Chamber(rawPinStack.map(Pin.deserialize));
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

export class Pin {
    // Pin is an array of points normalized to 1x1 rect
    // Origin starting at bottom left corner
    // pinHeight is in units, where one unit is 1/20th of the chamber
    constructor(points, pinHeight, lastRenderMetadata=null, highlighted=false, chamber, pinIdx) {
        this.points = points;
        this.pinHeight = pinHeight;
        this.lastRenderMetadata = lastRenderMetadata;
        this.highlighted = highlighted;
        // Parent chamber
        this.chamber = chamber;
        // Position of pin in parent chamber
        this.pinIdx = pinIdx;
    }

    asRawPin() {
        return new Pin(this.points, this.pinHeight, this.lastRenderMetadata, this.highlighted, this.chamber, this.pinIdx);
    }

    serialize() {
        return JSON.stringify({points:this.points, pinHeight:this.pinHeight}, (key, val) => {
            return (val && val.toFixed) ? Number(val.toFixed(4)) : val;
        });
    }

    withHeight(pinHeight) {
        return new Pin(this.points, pinHeight);
    }

    static deserialize(strPoints) {
        console.log("Raw points: " + strPoints);
        try {
            let obj = JSON.parse(strPoints);
            return Object.assign(new Pin([], 0), obj);
        } catch (e) {
            switch (strPoints.charAt(0)) {
                case "k":
                    return Pin.keyPin(Number.parseInt(strPoints.substring(1)));
                case "d":
                    return Pin.standardDriver(Number.parseInt(strPoints.substring(1)));
                default:
                    break;
            }
        }
        return Pin.keyPin(5);
    }

    moveToChamber(chamber) {
        if (chamber == this.chamber) {
            return;
        }
        this.chamber.removePin(this.pinIdx);
        chamber.addPin(this);
    }

    static swap(pin1, pin2) {
        console.log("Swapping", pin1, pin2);
        pin1.chamber.pinStack[pin1.pinIdx] = pin2;
        pin2.chamber.pinStack[pin2.pinIdx] = pin1;

        let tmp = pin1.chamber;
        pin1.chamber = pin2.chamber;
        pin2.chamber = tmp;

        tmp = pin1.pinIdx;
        pin1.pinIdx = pin2.pinIdx;
        pin2.pinIdx = tmp;
    }

    static keyPin(pinHeight, chamferSizeUnits = .2, angleCutHeightUnits = 1.4) {
        return new KeyPin(pinHeight, chamferSizeUnits, angleCutHeightUnits);
    }

    static standardDriver(pinHeight, chamferSizeUnits = .2) {
        return new StandardDriver(pinHeight, chamferSizeUnits);
    }
}

class KeyPin extends Pin {
    constructor(pinHeight, chamferSizeUnits, angleCutHeightUnits) {
        const angleCutHeight = angleCutHeightUnits / pinHeight;
        const chamferHeight = chamferSizeUnits / pinHeight;
        const chamferWidth = chamferSizeUnits / chamberHeightToWidthRatio;
        const pinBaseWidth = .1;
        super(
            [[.5 - pinBaseWidth, 0], [0, angleCutHeight], [0, 1 - chamferHeight], [chamferWidth, 1], [1 - chamferWidth, 1], [1, 1 - chamferHeight], [1, angleCutHeight], [.5 + pinBaseWidth, 0]], 
            pinHeight);

        this.chamferSizeUnits = chamferSizeUnits;
        this.angleCutHeightUnits = angleCutHeightUnits;
    }

    withHeight(pinHeight) {
        return new KeyPin(pinHeight, this.chamferSizeUnits, this.angleCutHeightUnits);
    }

    serialize() {
        return "k" + this.pinHeight;
    }
}

class StandardDriver extends Pin {

    constructor(pinHeight, chamferSizeUnits) {
        const chamferHeight = chamferSizeUnits / pinHeight;
        const chamferWidth = chamferSizeUnits / chamberHeightToWidthRatio;
        super(
            [[chamferWidth, 0], [0, chamferHeight], [0, 1 - chamferHeight], [chamferWidth, 1], [1 - chamferWidth, 1], [1, 1 - chamferHeight], [1, chamferHeight], [1 - chamferWidth, 0]], 
            pinHeight);
        this.chamferSizeUnits = chamferSizeUnits;
    }

    withHeight(pinHeight) {
        return new StandardDriver(pinHeight, this.chamferSizeUnits);
    }

    serialize() {
        return "d" + this.pinHeight;
    }
}