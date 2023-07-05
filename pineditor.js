import {Pin} from "./chamber.js";
import {drawPin, screenToCanvas} from "./renderer.js";
import UrlManager from "./urlmanager.js";
import {chambers} from "./planner.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");

let open = false;
let mirroredEditor = true;

let currentPin;
let pinRect;
let displayRect;
let selectedNormalizedPoint, selectedPointIdx, selectedMirroredPointIdx;
let exitCallback;

// For each point, precalculate values for edge between that point and next point to assist with finding closest point to mouse
let precalcEdgeDists = [];

function openPinEditor(pin, onExit) {
    exitCallback = onExit;
    open = true;
    currentPin = pin;

    const editBtn = document.getElementById("edit-pin");
    editBtn.removeAttribute("disabled");
    editBtn.textContent = "Close editor";
    currentPin.highlighted = false;

    ctx.fillStyle = `rgba(40, 40, 40, .4)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    redraw();
    precalculateEdgeValues();
}

function closePinEditor() {
    open = false;
    if (currentPin) {
        currentPin.highlighted = true;
    }
    currentPin = null;
    pinRect = null;
    selectedNormalizedPoint = null;
    selectedPointIdx = null;
    selectedMirroredPointIdx = null;

    const editBtn = document.getElementById("edit-pin");
    editBtn.setAttribute("disabled", true);
    editBtn.textContent = "Edit pin";

    if (exitCallback) {
        exitCallback.call();
    }
}

function isPinEditorOpen() {
    return open;
}

function handleClick(event) {
    if (selectedNormalizedPoint) {
        selectedPointIdx = null;
        selectedNormalizedPoint = null;
        UrlManager.updateUrlParams(chambers);
        precalculateEdgeValues();
        redraw();
        return;
    }

    const mouseCoords = screenToCanvas(event.clientX, event.clientY);
    if (!displayRect.contains(mouseCoords[0], mouseCoords[1])) {
        closePinEditor();
        return;
    }

    const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
    const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);
    const { nearest, pointIdx, isExistingPoint } = closestPointToPos(normalizedMouseX, normalizedMouseY);

    if (event.altKey) {
        console.log("Alt key held");
        if (!isExistingPoint) {
            console.log("Doing nothing since not existing point");
            return;
        }

        // remove selected point
        console.log("Removing point at %d", pointIdx);
        currentPin.points.splice(pointIdx, 1);
        precalculateEdgeValues();
        redraw();
        return;
    }


    if (!isExistingPoint) {
        // Need to create a new point
        selectedMirroredPointIdx = currentPin.points.length + 1 - pointIdx;
        currentPin.points.splice(pointIdx, 0, nearest);
        if (mirroredEditor) {
            const mirroredNearest = [1 - nearest[0], nearest[1]];
            currentPin.points.splice(selectedMirroredPointIdx, 0, mirroredNearest);
        }
    } else if (mirroredEditor) {
        selectedMirroredPointIdx = currentPin.points.length - 1 - pointIdx;
    }

    console.log("Selected point ", pointIdx);
    selectedPointIdx = pointIdx;
    selectedNormalizedPoint = nearest;
    precalculateEdgeValues();
    redraw();
}

function handleMouseMove(event) {
    const mouseCoords = screenToCanvas(event.clientX, event.clientY);
    const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
    const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);
    if (selectedNormalizedPoint) {
        currentPin.points[selectedPointIdx] = [normalizedMouseX, normalizedMouseY];
        currentPin.serOverride = null;

    } else if (currentPin.points.length >= 3) {
        // Figure out which point to select, or where to add a new point
        redraw();
        const {nearest, isExistingPoint} = closestPointToPos(normalizedMouseX, normalizedMouseY);
        let cursorRect = new DOMRect(nearest[0] * pinRect.width + pinRect.x - 4, nearest[1] * pinRect.height + pinRect.y - 4, 8, 8);
        if (isExistingPoint) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 5;
            ctx.strokeRect(cursorRect.x, cursorRect.y, cursorRect.width, cursorRect.height);
        }
        ctx.fillStyle = "black";
        ctx.fillRect(cursorRect.x, cursorRect.y, cursorRect.width, cursorRect.height);
        return;
    }

    if (selectedMirroredPointIdx != null) {
        currentPin.points[selectedMirroredPointIdx] = [1 - normalizedMouseX, normalizedMouseY];
    }

    redraw();
}

function precalculateEdgeValues() {
    precalcEdgeDists = [];
    let nextPoint = currentPin.points[currentPin.points.length - 1];
    for (let i = 0; i < currentPin.points.length; i++) {
        let point = nextPoint;
        nextPoint = currentPin.points[i];
        const xDiff = nextPoint[0] - point[0];
        const yDiff = nextPoint[1] - point[1];
        const xDiffSqr = xDiff * xDiff;
        const yDiffSqr = yDiff * yDiff;
        const denom = xDiffSqr + yDiffSqr;
        if (denom > 0) {
            precalcEdgeDists[i] = [xDiff / denom, yDiff / denom];
        } else {
            precalcEdgeDists[i] = [0, 0];
        }
    }
}

// Adapted from https://math.stackexchange.com/a/4079949
function closestPointToPos(x, y) {
    const snapToPointRadius = .2;
    let n = currentPin.points.length;
    let nearest, nearestNormsqr, existingPointIdx, isExistingPoint;
    if (n > 1) {
        nearestNormsqr = Number.MAX_VALUE;
        nearest = null;

        // Make sure the iedge vectors have been precalculated.
        if (!precalcEdgeDists || precalcEdgeDists.length == 0) {
            precalculateEdgeValues();
        }

        let nextPoint = currentPin.points[n - 1];
        let bestT, bestI;
        for (let i = 0; i < n; i++) {
            let q;
            let point = nextPoint
            nextPoint = currentPin.points[i]

            let tx = (x - point[0]) * precalcEdgeDists[i][0];
            let ty = (y - point[1]) * precalcEdgeDists[i][1];
            let t = tx + ty;
            let nearestPointIdx;
            let isCurrOnExistingPoint = false;
            if (t <= snapToPointRadius) {
                q = point
                nearestPointIdx = (i - 1 + n) % n;
                isCurrOnExistingPoint = true;
            } else if (t < 1 - snapToPointRadius) {
                q = [((1 - t) * point[0]) + (t * nextPoint[0]), ((1 - t) * point[1]) + (t * nextPoint[1])];
                nearestPointIdx = i;
                isCurrOnExistingPoint = false;
            } else {
                q = nextPoint
                nearestPointIdx = i;
                isCurrOnExistingPoint = true;
            }

            let qx = q[0] - x;
            let qy = q[1] - y;
            let qq = (qx * qx) + (qy * qy);
            if (qq < nearestNormsqr) {
                nearest = q
                nearestNormsqr = qq
                bestT = t;
                bestI = i;
                isExistingPoint = isCurrOnExistingPoint;
                existingPointIdx = nearestPointIdx;
            }

        }
    } else if (n == 1) {
        nearest = currentPin.points[0]
        let dx = nearest[0] - x;
        let dy = nearest[1] - y;
        nearestNormsqr = dx * dx + dy * dy;

    } else {
        nearest = null
        nearestNormsqr = Number.MAX_VALUE;
    }

    return { nearest, pointIdx: existingPointIdx, isExistingPoint };
}

function redraw() {
    console.log("Redrawing pin editor");

    let h = canvas.height - 10;
    const widthToHeightRatio = 4 / currentPin.pinHeight;
    let w = Math.min(canvas.width, h * widthToHeightRatio) - 10;
    h = (w / widthToHeightRatio);
    pinRect = new DOMRect(((canvas.width - w) / 2), (canvas.height - h) / 2, w, h);
    displayRect = new DOMRect(pinRect.x - 20, pinRect.y - 20, pinRect.width + 40, pinRect.height + 40);
    ctx.clearRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);
    ctx.fillStyle = "green";
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(0, 0, 0, .35)`;
    drawPin(currentPin, pinRect.x, pinRect.y, pinRect.width, pinRect.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(0, 0, 0, .35)`;
    ctx.strokeRect(pinRect.x, pinRect.y, pinRect.width, pinRect.height);
}

function setMirroredEditor(enabled) {
    mirroredEditor = enabled;
}

export default {handleClick, openPinEditor, closePinEditor, isPinEditorOpen, handleMouseMove, setMirroredEditor};