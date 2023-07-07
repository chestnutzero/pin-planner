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
        return JSON.stringify({ points: this.points, pinHeight: this.pinHeight }, (key, val) => {
            return (val && val.toFixed) ? Number(val.toFixed(4)) : val;
        });
    }

    withHeight(pinHeight) {
        return new Pin(this.points, pinHeight);
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
}