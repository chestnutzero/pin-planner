import UrlManager from "./urlmanager.js";
import {Chamber, Pin} from "./chamber.js";
import {redrawChambers, findPinUnderCoordinates} from "./renderer.js";
import PinEditor from "./pineditor.js";

const canvas = document.getElementById("cl");
const selectedPinHeight = document.getElementById("pin-height");
let chambers;
let selectedChamber, selectedPin;

function addChamber(chamber) {
    const idx = chambers.push(chamber) - 1;
    chamber.chambers = chambers;
    chamber.chamberIdx = idx;
    return chamber;
}

function addPin(chamber, pin) {
    const idx = chamber.pinStack.push(pin) - 1;
    pin.chamber = chamber;
    pin.pinIdx = idx;
}

function replacePin(oldPin, newPin) {
    oldPin.chamber.pinStack[oldPin.pinIdx] = newPin;
    newPin.chamber = oldPin.chamber;
    newPin.pinIdx = oldPin.pinIdx;
}

document.getElementById("add-pin").addEventListener("click", () => {
    const chamber = addChamber(new Chamber([]));
    addPin(chamber, Pin.keyPin(Math.ceil(Math.random() * 10)));
    addPin(chamber, Pin.standardDriver(Math.ceil(Math.random() * 10)));
    redraw();
});

document.getElementById("reset").addEventListener("click", () => {
    resetPinSelection();
    PinEditor.closePinEditor();
    chambers = [];
    redraw();
});

function resetPinSelection() {
    if (selectedPin) {
        selectedPin.highlighted = false;
    } 
    if (selectedChamber) {
        selectedChamber.highlighted = false;
    }
    selectedPin = null;
    selectedChamber = null;
    document.getElementById("edit-pin").setAttribute("disabled", true);
    selectedPinHeight.textContent = "n/a";
}

canvas.addEventListener("click", event => {
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.handleClick(event);
        return;
    }

    let canvasBounds = canvas.getBoundingClientRect();
    const mouseX = event.clientX - canvasBounds.left;
    const mouseY = canvasBounds.height - (event.clientY - canvasBounds.top);
    let { chamber, pin } = findPinUnderCoordinates(chambers, mouseX, mouseY);

    if (pin) {
        if (selectedPin) {
            if (selectedPin != pin) {
                Pin.swap(pin, selectedPin);
            }
            resetPinSelection();
            redraw();
            return;
        }

        resetPinSelection();
        pin.highlighted = true;
        selectedChamber = chamber;
        selectedPin = pin;
        redraw();
    } else if (chamber) {
        if (selectedPin) {
            selectedPin.moveToChamber(chamber);
            resetPinSelection();
            redraw();
        } else if (selectedChamber) {
            // Swap the entire selected chamber for the new chamber
            Chamber.swap(chamber, selectedChamber);
            resetPinSelection();
            redraw();
        } else {
            selectedChamber = chamber;
            selectedChamber.highlighted = true;
            redraw();
        }
    } else {
        resetPinSelection();
        redraw();
    }

    if (selectedPin) {
        selectedPinHeight.textContent = selectedPin.pinHeight;
        document.getElementById("edit-pin").removeAttribute("disabled");
    }
});

canvas.addEventListener("mousemove", event => {
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.handleMouseMove(event);
    }
});

document.getElementById("edit-pin").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        PinEditor.openPinEditor(selectedPin, onPinEditorExit);
    } else if (PinEditor.isPinEditorOpen()) {
        PinEditor.closePinEditor();
    }
});

document.getElementById("increase-pin-height").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        setSelectedPinHeight(selectedPin.pinHeight + 1);
        redraw();
    }
});

document.getElementById("decrease-pin-height").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        setSelectedPinHeight(selectedPin.pinHeight - 1);
        redraw();
    }
});

document.getElementById("mirrored-editor").addEventListener("change", event => {
    PinEditor.setMirroredEditor(event.checked);
})

function onPinEditorExit() {
    redraw();
    if (selectedPin) {
        document.getElementById("edit-pin").removeAttribute("disabled");
    }
}

function redraw() {
    console.log("Redrawing chambers");
    redrawChambers(chambers);
    UrlManager.updateUrlParams(chambers);
}

function setSelectedPinHeight(pinHeight) {
    selectedPin.points = selectedPin.withHeight(pinHeight).points;
    selectedPin.pinHeight = pinHeight;
    selectedPinHeight.textContent = pinHeight;
}

chambers = UrlManager.loadFromUrlParams();
redraw();

export {chambers};