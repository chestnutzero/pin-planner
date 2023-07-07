import Crusher from "../JSONCrush.min.js";
import {Chamber} from "../models/chamber.js";

const chambersParam = "c";

function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get(chambersParam)) {
        try {
            let rawChambers = JSON.parse(decodeURIComponent(Crusher.uncrush((params.get(chambersParam)))));
            console.log("Raw chambers: " + rawChambers);
            let chamberIdx = 0;
            let result = [];
            rawChambers.forEach(rawChamber => {
                let chamber = Chamber.deserialize(rawChamber);
                chamber.chambers = result;
                chamber.chamberIdx = chamberIdx;
                let pinIdx = 0;
                chamber.pinStack.forEach(pin => {
                    pin.chamber = chamber;
                    pin.pinIdx = pinIdx;
                    pinIdx++;
                });

                result.push(chamber);
                chamberIdx++;
            });
            return result;
        } catch (e) {
            console.log("Malformed query param", e);
        }
    }
    return [];
}

function updateUrlParams(chambers) {
    let serializedChambers = encodeURIComponent(Crusher.crush(JSON.stringify(chambers.map(c => c.serialize()))));
    let newUrl = window.location.origin + window.location.pathname + "?c=" + serializedChambers;
    window.history.replaceState({path:newUrl}, "", newUrl);
}

export default {loadFromUrlParams, updateUrlParams};