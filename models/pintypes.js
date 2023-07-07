import {chamberHeightToWidthRatio} from "../interface/renderer.js";
import {Pin} from "./pin.js";

class PremadePin extends Pin {
    serialize() {
        let prefix = PIN_TYPE_TO_PREFIX[this.constructor.name];
        if (prefix == null) {
            return super.serialize();
        }
        return prefix + this.pinHeight;
    }
}

export class KeyPin extends PremadePin {
    constructor(pinHeight = 5, chamferSizeUnits = .2, angleCutHeightUnits = 1.4) {
        const angleCutHeight = angleCutHeightUnits / pinHeight;
        const chamferHeight = chamferSizeUnits / pinHeight;
        const chamferWidth = chamferSizeUnits / chamberHeightToWidthRatio;
        const pinBaseWidth = .1;
        super(
            [[.5 - pinBaseWidth, 0], [0, angleCutHeight], [0, 1 - chamferHeight], [chamferWidth, 1], [1 - chamferWidth, 1], [1, 1 - chamferHeight], [1, angleCutHeight], [.5 + pinBaseWidth, 0]], 
            pinHeight);
    }

    withHeight(pinHeight) {
        return new KeyPin(pinHeight);
    }
}

export class StandardDriver extends PremadePin {

    constructor(pinHeight = 5, chamferSizeUnits = .2) {
        const chamferHeight = chamferSizeUnits / pinHeight;
        const chamferWidth = chamferSizeUnits / chamberHeightToWidthRatio;
        super(
            [[chamferWidth, 0], [0, chamferHeight], [0, 1 - chamferHeight], [chamferWidth, 1], [1 - chamferWidth, 1], [1, 1 - chamferHeight], [1, chamferHeight], [1 - chamferWidth, 0]], 
            pinHeight);
    }

    withHeight(pinHeight) {
        return new StandardDriver(pinHeight);
    }
}

export class Spool extends PremadePin {
    constructor(pinHeight = 5, spoolDepth = .15, spoolLipHeightUnits = 1) {
        const lipHeight = spoolLipHeightUnits / pinHeight;
        super([[0, 0],
        [0, lipHeight],
        [spoolDepth, lipHeight],
        [spoolDepth, 1 - lipHeight],
        [0,1 - lipHeight],
        [0,1],
        [1,1],
        [1,1 - lipHeight],
        [1 - spoolDepth, 1 - lipHeight],
        [1 - spoolDepth, lipHeight],
        [1, lipHeight],
        [1,0]], pinHeight);
    }

    withHeight(pinHeight) {
        return new Spool(pinHeight);
    }
}

export class Torpedo extends PremadePin {
    constructor(pinHeight = 5) {
        const pinHeightFactor = Math.max(pinHeight/6, 1);
        super([[0.4, 0],
        [0.1644, 0.1123 / pinHeightFactor],
        [0, 0.263 / pinHeightFactor],
        [0, 0.3479/pinHeightFactor],
        [0.0959, 0.5178],
        [0.2671, 0.94],
        [0, 0.94],
        [0, 0.98],
        [0.05, 1],
        [0.95, 1],
        [1, 0.98],
        [1, 0.94],
        [0.7329, 0.94],
        [0.9041, 0.5178],
        [1, 0.3479 / pinHeightFactor],
        [1, 0.263 / pinHeightFactor],
        [0.8356, 0.1123 / pinHeightFactor],
        [0.6, 0]], pinHeight);
    }

    withHeight(pinHeight) {
        return new Torpedo(pinHeight);
    }
}

function pinType(pinTypeClass, serializationPrefix) {
    return {
        class: pinTypeClass,
        prefix: serializationPrefix
    };
}

// If you create a new pin type, make sure to add it here!
export const PinTypes = [
    pinType(KeyPin, "k"), 
    pinType(StandardDriver, "d"), 
    pinType(Spool, "s"), 
    pinType(Torpedo, "t")
];

// Used for the value of the pin-type dropdown
// Custom pins (i.e. raw `Pin` instances) are not one of the types on this list
export const NAMED_PIN_TYPES = Object.fromEntries(PinTypes
    .map(type => [type.class.name, type.class]));

export const NAMED_PIN_PREFIXES = Object.fromEntries(
    PinTypes.map(type => [type.prefix, type.class])
);

// Used for quick serialization
export const PIN_TYPE_TO_PREFIX = Object.fromEntries(
    Object.entries(NAMED_PIN_PREFIXES)
    .map(a => [a[1].name, a[0]]));
