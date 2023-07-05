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
    constructor(points, pinHeight, serOverride=null, lastRenderMetadata=null, highlighted=false, chamber, pinIdx) {
        this.points = points;
        this.pinHeight = pinHeight;
        this.serOverride = serOverride;
        this.lastRenderMetadata = lastRenderMetadata;
        this.highlighted = highlighted;
        // Parent chamber
        this.chamber = chamber;
        // Position of pin in parent chamber
        this.pinIdx = pinIdx;
    }

    serialize() {
        if (this.serOverride) {
            return this.serOverride;
        }

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
        this.chamber.pinStack.splice(this.pinIdx, 1);
        this.pinIdx = chamber.pinStack.push(this) - 1;
        this.chamber = chamber;
    }

    static swap(pin1, pin2) {
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
    constructor(pinHeight, chamferSizeUnits = .2, angleCutHeightUnits = 1.4) {
        const angleCutHeight = angleCutHeightUnits / pinHeight;
        const chamferHeight = chamferSizeUnits / pinHeight;
        const pinBaseWidth = .1;
        super(
            [[.5 - pinBaseWidth, 0], [0, angleCutHeight], [0, 1 - chamferHeight], [chamferHeight, 1], [1 - chamferHeight, 1], [1, 1 - chamferHeight], [1, angleCutHeight], [.5 + pinBaseWidth, 0]], 
            pinHeight,
            "k" + pinHeight);

        this.chamferSizeUnits = chamferSizeUnits;
        this.angleCutHeightUnits = angleCutHeightUnits;
    }

    withHeight(pinHeight) {
        return new KeyPin(pinHeight, this.chamferSizeUnits, this.angleCutHeightUnits);
    }
}

class StandardDriver extends Pin {

    constructor(pinHeight, chamferSizeUnits = .2) {
        const chamferHeight = chamferSizeUnits / pinHeight;
        super(
            [[chamferHeight, 0], [0, chamferHeight], [0, 1 - chamferHeight], [chamferHeight, 1], [1 - chamferHeight, 1], [1, 1 - chamferHeight], [1, chamferHeight], [1 - chamferHeight, 0]], 
            pinHeight,
            "d" + pinHeight);
        this.chamferSizeUnits = chamferSizeUnits;
    }

    withHeight(pinHeight) {
        return new StandardDriver(pinHeight, this.chamferSizeUnits);
    }
}