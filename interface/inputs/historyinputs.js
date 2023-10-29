import History from "../../data/history.js";
import UrlManager from "../urlmanager.js";
import {setChambers} from "../../main.js";

const undo = document.getElementById("undo");
const redo = document.getElementById("redo");

export function addHistoryListeners() {
    undo.addEventListener("click", () => {
        const newSerChambers = History.stepBackwards();
        if (newSerChambers) {
            let newChambers = UrlManager.loadFromString(newSerChambers);
            setChambers(newChambers);
            UrlManager.updateUrlParamsRaw(newSerChambers);
            updateButtons();
        }
    });

    redo.addEventListener("click", () => {
        const newSerChambers = History.stepForwards();
        if (newSerChambers) {
            let newChambers = UrlManager.loadFromString(newSerChambers);
            setChambers(newChambers);
            UrlManager.updateUrlParamsRaw(newSerChambers);
            updateButtons();
        }
    });
}

export function updateButtons() {
    if (History.hasPrevious()) {
        undo.removeAttribute("disabled");
    } else {
        undo.setAttribute("disabled", true);
    }

    if (History.hasNext()) {
        redo.removeAttribute("disabled");
    } else {
        redo.setAttribute("disabled", true);
    }
}