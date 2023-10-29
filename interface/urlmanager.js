import Crusher from "../lib/JSONCrush.min.js";
import {Chamber} from "../models/chamber.js";
import History from "../data/history.js";

const chambersParam = "c";

function loadFromString(crushedChambers) {
    try {
        console.debug("Raw serialized chambers:", crushedChambers);
        let rawChambers = JSON.parse(Crusher.uncrush(crushedChambers));
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
        console.log("Malformed query param", e);
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
    const crushedChambers = Crusher.crush(JSON.stringify(chambers.map(c => c.serialize())));
    const serializedChambers = encode(crushedChambers);
    let newUrl = window.location.origin + window.location.pathname + "?c=" + serializedChambers;
    console.debug("Updating url to", newUrl);
    window.history.replaceState({path:newUrl}, "", newUrl);
    History.updateCurrentData(crushedChambers);
}

/**
 * Used to update the url params in the browser after moving around in history
 */
function updateUrlParamsRaw(crushedChambers) {
    let newUrl = window.location.origin + window.location.pathname + "?c=" + encode(crushedChambers);
    window.history.replaceState({path:newUrl}, "", newUrl);
}

function encode(str) {
    return encodeURIComponent(str).replace(/[_!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
      });
}

export default {updateUrlParamsRaw, loadFromUrlParams, updateUrlParams, loadFromString};