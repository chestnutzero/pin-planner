import { JSONPremadePin } from "./pintypes.js";
import PinTypes from "../data/pintypes.json"  assert { type: "json" };
import { Pin } from "./pin.js";
import Point from "./point.js";

const NAMED_PIN_PREFIXES = new Map(Object.entries(PinTypes)
    .map((entry) => [entry[1].serializationPrefix, entry[0]]));

function fromClass(pinClassName, pinHeight) {
    console.log("Creating from class name", pinClassName);
    // Just hope it works lol, who cares about type safety anyway
    return new JSONPremadePin(pinHeight, PinTypes[pinClassName]);
}

function keyPin(pinHeight) {
    console.log(PinTypes.KeyPin);
    return new JSONPremadePin(pinHeight, PinTypes.KeyPin);
}

function standardDriver(pinHeight) {
    return new JSONPremadePin(pinHeight, PinTypes.StandardDriver);
}

function deserialize(strPoints) {
    console.log("Raw points: " + strPoints);
    if (strPoints.startsWith("{")) {
        // it's a raw pin
        try {
            let obj = JSON.parse(strPoints);
            console.log("Parsed object", obj);
            obj.points = obj.points.map(point => Point.fromRawObj(point));
            return Object.assign(new Pin([], 0), obj);
        } catch (e) {
            console.log("Unable to deserialize :(", e);
        }
    }

    let prefix = strPoints.replace(/\d.*/i, "");
    console.log("Searching for ", prefix, "in", NAMED_PIN_PREFIXES);
    let pinType = NAMED_PIN_PREFIXES.get(prefix);
    if (pinType != null) {
        console.log("Creating pin of type", pinType);
        let pinHeight = Number.parseInt(strPoints.substring(1));
        return new JSONPremadePin(pinHeight, PinTypes[pinType]);
    }
    console.log("Falling back to key pin 5 for ", strPoints);
    return keyPin(5);
}


export default {
    fromClass, keyPin, standardDriver, deserialize
};