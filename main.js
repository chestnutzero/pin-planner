import UrlManager from "./interface/urlmanager.js";
import {Chamber, MillingType} from "./models/chamber.js";
import {Pin} from "./models/pin.js";
import PinFactory from "./models/pinfactory.js";
import {redrawChambers, findPinUnderCoordinates, drawPin, chamberHeightToWidthRatio} from "./interface/renderer.js";
import PinEditor from "./interface/pineditor.js";
import PinTypes from "./data/pintypes.js";
import Simulator from "./simulator/simulator.js";
import { registerAllListeners } from "./interface/inputs/inputs.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
const selectedPinHeight = document.getElementById("pin-height");
const addPinTypeSelect = document.getElementById("pin-type");
const millingTypeSelect = document.getElementById("milling-type");
const plannerOpts = document.getElementById("planner-options");

let chambers;
let selectedChamber, selectedPin;

let mouseDownX, mouseDownY;
let dragging = false;

export function setChambers(newChambers) {
    chambers = newChambers;
    redraw();
}

export function addChamber(chamber) {
    const idx = chambers.push(chamber) - 1;
    chamber.chambers = chambers;
    chamber.chamberIdx = idx;
    return chamber;
}

export function deleteChamber(chamberIdx) {
    let chamber = chambers[chamberIdx];
    chambers.splice(chamberIdx, 1);
    for (let i=0; i<chambers.length; i++) {
        chambers[i].chamberIdx = i;
    }

    if (selectedChamber == chamber) {
        resetPinSelection();
    }
    redraw();
    updateUrl();
}

export function getSelectedChamber() {
    return selectedChamber;
}

function setCanvasSize() {
    canvas.width = window.innerWidth * .9;
    canvas.height = Math.max(Math.min(canvas.width * .5, window.innerWidth * .8), 400);
    // Having pin points use bottom left origin and canvas us top left origin is annoying
    // Just use bottom left origin for everything
    ctx.transform(1, 0, 0, -1, 0, canvas.height)
    console.debug("resizing");
    redraw();
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.redraw();
    }
}

window.addEventListener("resize", setCanvasSize);
window.addEventListener("load", setCanvasSize);

export function handleReset() {
    resetPinSelection();
    PinEditor.closePinEditor();
    chambers = [];
    redraw();
    updateUrl();
}

function selectPin(pin) {
    resetPinSelection();
    pin.highlighted = true;
    selectChamber(pin.chamber);
    selectedPin = pin;

    let elements = document.getElementsByClassName("pin-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).removeAttribute("disabled");
    }
}

function selectChamber(chamber, highlighted = false) {
    selectedChamber = chamber;
    selectedChamber.highlighted = highlighted;

    let elements = document.getElementsByClassName("chamber-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).removeAttribute("disabled");
    }
}

function resetChamberSelection() {
    if (selectedChamber) {
        selectedChamber.highlighted = false;
    }
    selectedChamber = null;

    let elements = document.getElementsByClassName("chamber-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).setAttribute("disabled", true);
    }
}

function resetPinSelection() {
    resetChamberSelection();
    if (selectedPin) {
        selectedPin.highlighted = false;
    } 
    selectedPin = null;
    let elements = document.getElementsByClassName("pin-specific-btn");
    for (let i=0; i<elements.length; i++) {
        elements.item(i).setAttribute("disabled", true);
    }
    selectedPinHeight.textContent = "n/a";
}

function handleClick(event) {
    if (Simulator.isOpen()) {
        return;
    }
    console.debug("click");
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
            deletePin(pin);
            return;
        } else if (chamber) {
            deleteChamber(chamber.chamberIdx);
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
            updateUrl();
            return;
        }

        selectPin(pin);
        redraw();
    } else if (chamber) {
        if (selectedPin) {
            selectedPin.moveToChamber(chamber);
            resetPinSelection();
            redraw();
            updateUrl();
        } else if (selectedChamber) {
            // Swap the entire selected chamber for the new chamber
            Chamber.swap(chamber, selectedChamber);
            resetPinSelection();
            redraw();
            updateUrl();
        } else {
            selectChamber(chamber, true);
            redraw();
        }
    } else {
        resetPinSelection();
        redraw();
    }

    if (selectedPin) {
        selectedPinHeight.textContent = selectedPin.pinHeight;
    }
}

canvas.addEventListener("click", event => {
    handleClick(event);
});

function deletePin(pin) {
    if (pin) {
        console.log("Deleting", pin);
        pin.chamber.removePin(pin.pinIdx);

        resetPinSelection();
        redraw();
        updateUrl();
        return;
    }
}

let mouseDown = false;
canvas.addEventListener("mousemove", event => {
    if (Simulator.isOpen()) {
        return;
    }
    if (PinEditor.isPinEditorOpen()) {
        if (mouseDown) {
            PinEditor.handleMouseDrag(event);
        } else {
            PinEditor.handleMouseMove(event);
        }
    } else {
        if (mouseDown) {
            if (dragging && selectedPin) {
                let canvasBounds = canvas.getBoundingClientRect();
                const mouseX = event.clientX - canvasBounds.left;
                const mouseY = canvasBounds.height - (event.clientY - canvasBounds.top);
                redraw();
                ctx.fillStyle = "#aaae";
                drawPin(selectedPin, mouseX - 25, mouseY, 50, 50 * selectedPin.pinHeight / chamberHeightToWidthRatio, false);
            } else if (!dragging) {
                // Make sure clicks don't register as drags
                if (Math.max(Math.abs(event.clientX - mouseDownX), Math.abs(event.clientY - mouseDownY) > 10)) {
                    // Autoselect pin under mouse when a drag event starts
                    resetPinSelection();
                    handleClick(event);
                    dragging = true;
                }
            }
        }
    }
});

canvas.addEventListener("mousedown", event => {
    if (Simulator.isOpen()) {
        return;
    }
    mouseDown = true;
    mouseDownX = event.clientX;
    mouseDownY = event.clientY;
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.handleMouseDown(event);
    }
});
canvas.addEventListener("mouseup", event => {
    if (Simulator.isOpen()) {
        return;
    }
    mouseDown = false;
    dragging = false;
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.handleMouseUp(event);
    }
});

document.getElementById("edit-pin").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        // Convert pin to raw pin for editing
        const rawPin = selectedPin.asRawPin();
        selectedChamber.replacePin(selectedPin.pinIdx, rawPin);
        selectPin(rawPin);
        plannerOpts.setAttribute("hidden", true);
        PinEditor.openPinEditor(selectedPin, onPinEditorExit);
        updateUrl();
    } else if (PinEditor.isPinEditorOpen()) {
        PinEditor.closePinEditor();
    }
});

document.getElementById("delete-pin").addEventListener("click", () => deletePin(selectedPin));

document.getElementById("increase-pin-height").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        setSelectedPinHeight(selectedPin.pinHeight + 1);
        redraw();
        updateUrl();
    }
});

document.getElementById("decrease-pin-height").addEventListener("click", () => {
    if (selectedPin && !PinEditor.isPinEditorOpen()) {
        setSelectedPinHeight(selectedPin.pinHeight - 1);
        redraw();
        updateUrl();
    }
});

document.getElementById("mirrored-editor").addEventListener("change", event => {
    PinEditor.setMirroredEditor(event.target.checked);
});

document.getElementById("close-pin-editor").addEventListener("click", event => {
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.closePinEditor();
    }
});

document.getElementById("export-pin").addEventListener("click", () => {
    if (selectedPin) {
        document.getElementById("pin-def").value = selectedPin.serialize();
    }
});

document.getElementById("import-pin").addEventListener("click", () => {
    const newPin = PinFactory.deserialize(document.getElementById("pin-def").value);
    let chamber;
    if (selectedChamber) {
        chamber = selectedChamber;
    } else {
        chamber = addChamber(new Chamber([]));
    }
    chamber.addPin(newPin);
    redraw();
    updateUrl();
});

document.getElementById("add-pin").addEventListener("click", () => {
    let pinTypeName = addPinTypeSelect.value;
    let pin = PinFactory.fromClass(pinTypeName);
    if (selectedChamber) {
        selectedChamber.addPin(pin);
    } else {
        let chamberToAdd = null;
        for (let i=0; i<chambers.length && chamberToAdd == null; i++) {
            if (chambers[i].pinStack.length <= 1) {
                chamberToAdd = chambers[i];
            }
        }
        if (chamberToAdd == null) {
            chamberToAdd = new Chamber();
            addChamber(chamberToAdd);
        }
        chamberToAdd.addPin(pin);
    }
    redraw();
    updateUrl();
});

function onPinEditorExit() {
    plannerOpts.removeAttribute("hidden");
    redraw();
    if (selectedPin) {
        document.getElementById("edit-pin").removeAttribute("disabled");
    }
}

export function redraw() {
    redrawChambers(chambers);
}

export function updateUrl() {
    UrlManager.updateUrlParams(chambers);
}

export function setSelectedPinHeight(pinHeight) {
    selectedPin.setHeight(pinHeight).points;
    selectedPinHeight.textContent = pinHeight;
}

export function simulateSelectedChamber() {
    if (selectedChamber) {
        plannerOpts.setAttribute("hidden", true);
        let simulatorControls = document.getElementById("simulator-controls");
        simulatorControls.removeAttribute("hidden")

        Simulator.openSimulator(selectedChamber, () => {
            plannerOpts.removeAttribute("hidden")
            simulatorControls.setAttribute("hidden", true);
            redraw();
        });
    }
}

chambers = UrlManager.loadFromUrlParams();
UrlManager.updateUrlParams(chambers);
redraw();

// Populate pintype options from our json data
Object.entries(PinTypes)
    .forEach(entry => {
        let opt = document.createElement("option");
        opt.text = entry[1].displayName;
        opt.value = entry[0];
        addPinTypeSelect.add(opt);
    });
Object.entries(MillingType)
    .forEach(entry => {
        let opt = document.createElement("option");
        opt.text = entry[0];
        opt.value = entry[1];
        millingTypeSelect.add(opt);
    });

registerAllListeners();

export {chambers};