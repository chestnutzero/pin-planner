import UrlManager from "./urlmanager.js";
import {Chamber, Pin} from "./chamber.js";
import {redrawChambers, findPinUnderCoordinates} from "./renderer.js";
import PinEditor from "./pineditor.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
const selectedPinHeight = document.getElementById("pin-height");
let chambers;
let selectedChamber, selectedPin;

function addChamber(chamber) {
    const idx = chambers.push(chamber) - 1;
    chamber.chambers = chambers;
    chamber.chamberIdx = idx;
    return chamber;
}

function removeChamber(chamberIdx) {
    chambers.splice(chamberIdx, 1);
    for (let i=0; i<chambers.length; i++) {
        chambers[i].chamberIdx = i;
    }
}

function setCanvasSize() {
    canvas.width = window.innerWidth * .9;
    canvas.height = Math.max(Math.min(canvas.width * .5, window.innerWidth * .8), 400);
    // Having pin points use bottom left origin and canvas us top left origin is annoying
    // Just use bottom left origin for everything
    ctx.transform(1, 0, 0, -1, 0, canvas.height)
    console.log("resizing");
    redraw();
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.redraw();
    }
}

window.addEventListener("resize", setCanvasSize);
window.addEventListener("load", setCanvasSize);

document.getElementById("add-chamber").addEventListener("click", () => {
    const chamber = addChamber(new Chamber([]));
    chamber.addPin(Pin.keyPin(Math.ceil(Math.random() * 10)));
    chamber.addPin(Pin.standardDriver(Math.ceil(Math.random() * 10)));
    redraw();
});

document.getElementById("reset").addEventListener("click", () => {
    resetPinSelection();
    PinEditor.closePinEditor();
    chambers = [];
    redraw();
});

function selectPin(pin) {
    resetPinSelection();
    pin.highlighted = true;
    selectedChamber = pin.chamber;
    selectedPin = pin;

    let elements = document.getElementsByClassName("pin-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).removeAttribute("disabled");
    }
}

function resetPinSelection() {
    if (selectedPin) {
        selectedPin.highlighted = false;
    } 
    if (selectedChamber) {
        selectedChamber.highlighted = false;
    }
    selectedPin = null;
    selectedChamber = null;
    let elements = document.getElementsByClassName("pin-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).setAttribute("disabled", true);
    }
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

    if (event.altKey) {
        // delete whatever's being clicked
        if (pin) {
            chamber.removePin(pin.pinIdx);
            redraw();
            return;
        } else if (chamber) {
            removeChamber(chamber.chamberIdx);
            redraw();
            return;
        }
    }

    if (pin) {
        if (selectedPin) {
            if (selectedPin != pin) {
                Pin.swap(pin, selectedPin);
            }
            resetPinSelection();
            redraw();
            return;
        }

        selectPin(pin);
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
        // Convert pin to raw pin for editing
        const rawPin = selectedPin.asRawPin();
        selectedChamber.replacePin(selectedPin.pinIdx, rawPin);
        selectPin(rawPin);
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
    console.log(event);
    PinEditor.setMirroredEditor(event.target.checked);
});

document.getElementById("export-pin").addEventListener("click", () => {
    if (selectedPin) {
        document.getElementById("pin-def").value = selectedPin.serialize();
    }
});

document.getElementById("import-pin").addEventListener("click", () => {
    const newPin = Pin.deserialize(document.getElementById("pin-def").value);
    let chamber;
    if (selectedChamber) {
        chamber = selectedChamber;
    } else {
        chamber = addChamber(new Chamber([]));
    }
    chamber.addPin(newPin);
    redraw();
});

document.getElementById("toggle-instructions").addEventListener("click", () => {
    let instructions = document.getElementById("instructions");
    let hidden = instructions.toggleAttribute("hidden");
    document.getElementById("toggle-instructions").textContent = hidden ? "Show instructions" : "Hide instructions";
});

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