import { NAMED_PIN_TYPES, NAMED_PIN_PREFIXES, KeyPin, StandardDriver } from "./pintypes.js";
import { Pin } from "./pin.js";

function fromClass(pinClassName, pinHeight) {
    // Just hope it works lol, who cares about type safety anyway
    return new NAMED_PIN_TYPES[pinClassName](pinHeight);
}

function keyPin(pinHeight) {
    return new KeyPin(pinHeight);
}

function standardDriver(pinHeight) {
    return new StandardDriver(pinHeight);
}

function deserialize(strPoints) {
    console.log("Raw points: " + strPoints);
    if (strPoints.startsWith("{")) {
        // it's a raw pin
        try {
            let obj = JSON.parse(strPoints);
            return Object.assign(new Pin([], 0), obj);
        } catch (e) {
            console.log("Unable to deserialize :(", e);
        }
    }

    let prefix = strPoints.replace(/\d.*/i, "");
    let pinType = NAMED_PIN_PREFIXES[prefix];
    if (pinType != null) {
        return new pinType(Number.parseInt(strPoints.substring(1)));
    }
    return keyPin(5);
}


export default {
    fromClass, keyPin, standardDriver, deserialize
};