import UrlManager from "./interface/urlmanager.js";
import {Chamber} from "./models/chamber.js";
import {Pin} from "./models/pin.js";
import PinFactory from "./models/pinfactory.js";
import {redrawChambers, findPinUnderCoordinates} from "./interface/renderer.js";
import PinEditor from "./interface/pineditor.js";
import PinTypes from "./data/pintypes.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
const selectedPinHeight = document.getElementById("pin-height");
const addPinTypeSelect = document.getElementById("pin-type");

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
    chamber.addPin(PinFactory.keyPin(Math.ceil(Math.random() * 7) + 3));
    chamber.addPin(PinFactory.standardDriver(Math.ceil(Math.random() * 5) + 5));
    redraw();
    updateUrl();
});

document.getElementById("reset").addEventListener("click", () => {
    resetPinSelection();
    PinEditor.closePinEditor();
    chambers = [];
    redraw();
    updateUrl();
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
    console.log("click");
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
            removeChamber(chamber.chamberIdx);
            if (selectedChamber == chamber) {
                resetPinSelection();
            }
            redraw();
            updateUrl();
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
    }
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
    if (PinEditor.isPinEditorOpen()) {
        if (mouseDown) {
            console.log("drag");
            PinEditor.handleMouseDrag(event);
        } else {
            console.log("move");
            PinEditor.handleMouseMove(event);
        }
    }
});

canvas.addEventListener("mousedown", event => {
    console.log("down");
    mouseDown = true;
    if (PinEditor.isPinEditorOpen()) {
        PinEditor.handleMouseDown(event);
    }
});
canvas.addEventListener("mouseup", event => {
    console.log("up");
    mouseDown = false;
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
    console.log(event);
    PinEditor.setMirroredEditor(event.target.checked);
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

document.getElementById("toggle-instructions").addEventListener("click", () => {
    let instructions = document.getElementById("instructions");
    let hidden = instructions.toggleAttribute("hidden");
    document.getElementById("toggle-instructions").textContent = hidden ? "Show instructions" : "Hide instructions";
});

document.getElementById("add-pin").addEventListener("click", () => {
    let pinTypeName = document.getElementById("pin-type").value;
    let pin = PinFactory.fromClass(pinTypeName);
    if (selectedChamber) {
        selectedChamber.addPin(pin);
    } else {
        addChamber(new Chamber()).addPin(pin);
    }
    redraw();
    updateUrl();
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
}

function updateUrl() {
    UrlManager.updateUrlParams(chambers);
}

function setSelectedPinHeight(pinHeight) {
    selectedPin.setHeight(pinHeight).points;
    selectedPinHeight.textContent = pinHeight;
}

chambers = UrlManager.loadFromUrlParams();
redraw();

// Populate pintype options from our json data
Object.entries(PinTypes)
    .forEach(entry => {
        let opt = document.createElement("option");
        opt.text = entry[1].displayName;
        opt.value = entry[0];
        addPinTypeSelect.add(opt);
    });

export {chambers};