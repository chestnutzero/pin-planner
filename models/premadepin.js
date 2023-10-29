import {Pin} from "./pin.js";

export class JSONPremadePin extends Pin {
    constructor(pinHeight, pinJSON) {
        if (pinHeight == null) {
            pinHeight = pinJSON.pinHeight;
        }
        let points = pinJSON.points;
        if (pinJSON.mirror) {
            points = points.concat(points.slice().reverse().map(point => {
                return [1 - point[0], point[1], point[2]];
            }));
        }

        super(points, pinJSON.pinHeight);
        super.setHeight(pinHeight);
        this.serializationPrefix = pinJSON.serializationPrefix;
    }

    serialize() {
        console.debug("Serializing ", this);
        if (this.serializationPrefix) {
            return this.serializationPrefix + this.pinHeight;
        } else {
            return super.serialize();
        }
    }
}