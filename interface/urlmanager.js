import Crusher from "../lib/JSONCrush.min.js";
import {Chamber} from "../models/chamber.js";
import History from "../data/history.js";

const chambersParam = "c";

function loadFromString(serializedChambers) {
    try {
        console.debug("Raw serialized chambers:", serializedChambers);
        let rawChambers = JSON.parse(Crusher.uncrush(decodeURIComponent(serializedChambers)));
        console.debug("Raw chambers: " + rawChambers);
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
        console.log("Loaded chambers", result);
        return result;
    } catch (e) {
        console.debug("Malformed query param", e);
        return [];
    }
}

function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const serializedChambers = params.get(chambersParam);
    if (serializedChambers) {
        return loadFromString(serializedChambers);
    }
    return [];
}

function updateUrlParams(chambers) {
    let serializedChambers = encodeURIComponent(Crusher.crush(JSON.stringify(chambers.map(c => c.serialize()))));
    let newUrl = window.location.origin + window.location.pathname + "?c=" + serializedChambers;
    window.history.replaceState({path:newUrl}, "", newUrl);
    History.updateCurrentData(serializedChambers);
}

/**
 * Used to update the url params in the browser after moving around in history
 */
function updateUrlParamsRaw(serializedChambers) {
    let newUrl = window.location.origin + window.location.pathname + "?c=" + serializedChambers;
    window.history.replaceState({path:newUrl}, "", newUrl);
}

export default {updateUrlParamsRaw, loadFromUrlParams, updateUrlParams, loadFromString};