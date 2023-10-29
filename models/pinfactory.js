import { JSONPremadePin } from "./premadepin.js";
import PinTypes from "../data/pintypes.js";
import { Pin } from "./pin.js";
import Point from "./point.js";

const NAMED_PIN_PREFIXES = new Map(Object.entries(PinTypes)
    .map((entry) => [entry[1].serializationPrefix, entry[0]]));

function fromClass(pinClassName, pinHeight) {
    console.debug("Creating from class name", pinClassName);
    // Just hope it works lol, who cares about type safety anyway
    return new JSONPremadePin(pinHeight, PinTypes[pinClassName]);
}

function keyPin(pinHeight) {
    console.debug(PinTypes.KeyPin);
    return new JSONPremadePin(pinHeight, PinTypes.KeyPin);
}

function standardDriver(pinHeight) {
    return new JSONPremadePin(pinHeight, PinTypes.StandardDriver);
}

function deserialize(strPoints) {
    console.debug("Raw points: " + strPoints);
    if (strPoints.startsWith("{")) {
        // it's a raw pin
        try {
            let obj = JSON.parse(strPoints);
            console.debug("Parsed object", obj);
            obj.points = obj.points.map(point => Point.fromRawObj(point));
            return Object.assign(new Pin([], 0), obj);
        } catch (e) {
            console.debug("Unable to deserialize :(", e);
        }
    }

    let prefix = strPoints.replace(/\d.*/i, "");
    console.debug("Searching for ", prefix, "in", NAMED_PIN_PREFIXES);
    let pinType = NAMED_PIN_PREFIXES.get(prefix);
    if (pinType != null) {
        console.debug("Creating pin of type", pinType);
        let pinHeight = Number.parseInt(strPoints.substring(prefix.length));
        return new JSONPremadePin(pinHeight, PinTypes[pinType]);
    }
    console.debug("Falling back to key pin 5 for ", strPoints);
    return keyPin(5);
}


export default {
    fromClass, keyPin, standardDriver, deserialize
};