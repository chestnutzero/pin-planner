import PinFactory from "./pinfactory.js";
import Point from "./point.js";

export const MillingType = {
    None: "n",
    Gin: "g",
    Barrel: "b",
    Threaded: "t",
    Overmilled: "o"
}

export class Chamber {
    constructor(pinStack = [], millingType=MillingType.None) {
        this.millingType = millingType;
        this.pinStack = pinStack;
        this.lastRenderMetadata = null;
        this.highlighted = false;
        // Pointer to parent array of chambers
        this.chambers = null;
        // Position of this chamber in parent array
        this.chamberIdx = null;
    }

    static forMillingType(millingType) {
        return new Chamber([], millingType);
    }

    serialize() {
        if (this.millingType == MillingType.None) {
            return JSON.stringify(
                this.pinStack.map(pin => pin.serialize())
            );
        } else {
            return JSON.stringify(
                {
                    p: this.pinStack.map(pin => pin.serialize()),
                    m: this.millingType
                }
            );
        }
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
        if (pinStackJson.startsWith("[")) {
            let rawPinStack = JSON.parse(pinStackJson);
            return new Chamber(rawPinStack.map(PinFactory.deserialize), MillingType.None);
        } else {
            let rawFields = JSON.parse(pinStackJson);
            let result = new Chamber(rawFields.p.map(PinFactory.deserialize), rawFields.m);
            return result;
        }
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

    getCorePoints(innerWidth, outerWidth, height) {
        let points = [];
        // First add all points for the left side
        const innerX = (outerWidth - innerWidth) / 2;
        // Add a 15% padding between edge of countermilling and edge of chamber zone
        const outerX = .15 * innerX;
        switch (this.millingType) {
            case MillingType.Gin:
                points.push(new Point(innerX, 0));
                points.push(new Point(innerX, height * .88));
                points.push(new Point(outerX, height * .88));
                // core height is 10 units, so milling takes up .7 units
                // gin head is .5 units
                points.push(new Point(outerX, height * .95));
                points.push(new Point(innerX, height * .95));
                points.push(new Point(innerX, height));
                break;
            case MillingType.Barrel:
                points.push(new Point(innerX, 0));

                points.push(new Point(innerX, height * .9));
                points.push(new Point(outerX, height * .9));
                points.push(new Point(outerX, height * .92));
                points.push(new Point(innerX, height * .92));

                points.push(new Point(innerX, height * .94));
                points.push(new Point(outerX, height * .94));
                points.push(new Point(outerX, height * .96));
                points.push(new Point(innerX, height * .96));

                points.push(new Point(innerX, height));
                break;
            case MillingType.Overmilled:
                points.push(new Point(innerX, 0));

                points.push(new Point(innerX, height * .95));
                points.push(new Point(outerX, height * .95));
                points.push(new Point(outerX, height));
                break;
            case MillingType.Threaded:
                let inner = true;
                for (let h = 0; h<height; h+=height * .04) {
                    points.push(new Point(inner ? innerX : outerX, h));
                    inner = !inner;
                }
                points.push(new Point(inner ? innerX : outerX, height));
                break;
            case MillingType.None:
            default:
                points.push(new Point(innerX, 0));
                points.push(new Point(innerX, height));
                break;
        }

        let numPoints = points.length;
        // Now copy all left side points to the right side
        for (let i=numPoints - 1; i>=0; i--) {
            let point = points[i];
            points.push(new Point(outerWidth - point.x, point.y, point.lockRelativeToHeight));
        }
        return points;
    }

    getBiblePoints(innerWidth, outerWidth, height) {
        // First add all points for the left side
        const innerX = (outerWidth - innerWidth) / 2;
        // Add a 15% padding between edge of countermilling and edge of chamber zone
        const outerX = .15 * innerX;
        const points = [];
        switch (this.millingType) {
            case MillingType.Threaded:
                let inner = true;
                for (let h = 0; h<=height; h+=height * .04) {
                    points.push(new Point(inner ? innerX : outerX, h));
                    inner = !inner;
                }
                break;
            default:
                points.push(new Point(innerX, 0));
                points.push(new Point(innerX, height));
                break;
        }

        let numPoints = points.length;
        // Now copy all left side points to the right side
        for (let i=numPoints - 1; i>=0; i--) {
            let point = points[i];
            points.push(new Point(outerWidth - point.x, point.y, point.lockRelativeToHeight));
        }
        return points;
    }
}
