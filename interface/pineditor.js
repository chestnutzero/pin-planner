import {Pin} from "../models/pin.js";
import Point from "../models/point.js";
import {drawPin, drawPinPoints, screenToCanvas} from "./renderer.js";
import UrlManager from "./urlmanager.js";
import {chambers} from "../main.js";
import * as Colors from "./colors.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
const pointOptions = document.getElementById("point-options");
const pointX = document.getElementById("point-x");
const pointY = document.getElementById("point-y");
const lockDropDown = document.getElementById("point-lock-type");
const pointLockCustomValue = document.getElementById("point-custom-l");
const customLInputSection = document.getElementById("custom-l-input");
const deletePointButton = document.getElementById("delete-point");

let open = false;
let mirroredEditor = true;
let isDragging = false;

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

    pointOptions.style.display = 'block';

    ctx.fillStyle = `rgba(40, 40, 40, .4)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    resetPointSelection();
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

    pointOptions.style.display = 'none';

    UrlManager.updateUrlParams(chambers);

    if (exitCallback) {
        exitCallback.call();
    }
}

function isPinEditorOpen() {
    return open;
}

function selectPoint(point, pointIdx, mirroredPointIdx = null) {
    console.log("Selected point ", point);
    selectedNormalizedPoint = point;
    selectedPointIdx = pointIdx;
    selectedMirroredPointIdx = mirroredPointIdx;
    for (let element of document.getElementsByClassName("point-specific-input")) {
        element.removeAttribute("disabled");
    }
}

function resetPointSelection() {
    console.log("Resetting point selection");
    selectedNormalizedPoint = null;
    selectedPointIdx = null;
    selectedMirroredPointIdx = null;
    for (let element of document.getElementsByClassName("point-specific-input")) {
        element.setAttribute("disabled", true);
    }
}

function handleClick(event) {
    const mouseCoords = screenToCanvas(event.clientX, event.clientY);
    if (!displayRect.contains(mouseCoords[0], mouseCoords[1])) {
        closePinEditor();
        return;
    }

    const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
    const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);
    let { nearest, pointIdx, isExistingPoint } = closestPointToPos(normalizedMouseX, normalizedMouseY);

    if (nearest == null) {
        resetPointSelection();
        redraw();
        return;
    }

    if (event.altKey) {
        console.log("Alt key held");
        deleteSelectedPoint();
        return;
    }


    if (!isExistingPoint) {
        // Need to create a new point
        console.log("Current points: %d", currentPin.points.length);
        currentPin.points.splice(pointIdx, 0, nearest);
        console.log("Created point at index %d, now points: %d", pointIdx, currentPin.points.length);
        if (mirroredEditor) {
            if (pointIdx >= currentPin.points.length / 2) {
                pointIdx++;
            }            
            selectedMirroredPointIdx = currentPin.points.length - pointIdx;
            const mirroredNearest = new Point(1 - nearest.x, nearest.y);
            currentPin.points.splice(selectedMirroredPointIdx, 0, mirroredNearest);
            console.log("Created mirrored point at %d, now points: %d", selectedMirroredPointIdx, currentPin.points.length);
        } else {
            selectedMirroredPointIdx = null;
        }
    } else if (mirroredEditor) {
        selectedMirroredPointIdx = currentPin.points.length - 1 - pointIdx;
    } else {
        selectedMirroredPointIdx = null;
    }

    selectPoint(nearest, pointIdx, selectedMirroredPointIdx);

    pointX.value = selectedNormalizedPoint.x;
    pointY.value = selectedNormalizedPoint.y * currentPin.pinHeight;
    if (selectedNormalizedPoint.lockRelativeToHeight == null) {
        lockDropDown.value = "none";
    } else if (selectedNormalizedPoint.lockRelativeToHeight == 0) {
        lockDropDown.value = "bottom";
    } else if (selectedNormalizedPoint.lockRelativeToHeight == 0.5) {
        lockDropDown.value = "middle";
    } else if (selectedNormalizedPoint.lockRelativeToHeight == 1) {
        lockDropDown.value = "top";
    } else {
        lockDropDown.value = "custom";
        pointLockCustomValue.value = selectedNormalizedPoint.lockRelativeToHeight;
    }

    if (lockDropDown.value == "custom") {
        customLInputSection.style.display = "block";
    } else {
        customLInputSection.style.display = "none";
    }

    precalculateEdgeValues();
    redraw();
}

function deleteSelectedPoint() {
    if (selectedPointIdx == null) {
        console.log("Doing nothing since no point selected");
        return;
    }

    // remove selected point
    console.log("Removing point at %d", selectedPointIdx);
    currentPin.points.splice(selectedPointIdx, 1);
    if (selectedMirroredPointIdx) {
        let mirroredIdxToDelete = selectedMirroredPointIdx;
        if (selectedMirroredPointIdx > selectedPointIdx) {
            mirroredIdxToDelete--;
        }
        console.log("Removing point at %d", mirroredIdxToDelete);
        currentPin.points.splice(mirroredIdxToDelete, 1);
    }

    resetPointSelection();
    precalculateEdgeValues();
    redraw();
}

function handleMouseDown(event) {
    if (selectedNormalizedPoint) {
        const mouseCoords = screenToCanvas(event.clientX, event.clientY);
        if (!displayRect.contains(mouseCoords[0], mouseCoords[1])) {
            closePinEditor();
            return;
        }

        const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
        const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);
        let { nearest, pointIdx, isExistingPoint } = closestPointToPos(normalizedMouseX, normalizedMouseY);

        if (pointIdx == selectedPointIdx) {
            console.log("Mouse down near selected point, beginning drag");
            isDragging = true;
        } else if (pointIdx == selectedMirroredPointIdx) {
            console.log("Mouse down near mirrored selected point, switching that to be active selected point then beginning drag");
            handleClick(event);
            isDragging = true;
        }
    }
}

function handleMouseDrag(event) {
    if (!isDragging) {
        return;
    }

    const mouseCoords = screenToCanvas(event.clientX, event.clientY);
    const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
    const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);

    if (selectedNormalizedPoint) {
        currentPin.points[selectedPointIdx].x = normalizedMouseX;
        currentPin.points[selectedPointIdx].y = normalizedMouseY;
        currentPin.serOverride = null;
    }
    if (selectedMirroredPointIdx != null) {
        currentPin.points[selectedMirroredPointIdx].x = 1 - normalizedMouseX;
        currentPin.points[selectedMirroredPointIdx].y = normalizedMouseY;
    }

    redraw();
}

function handleMouseMove(event) {
    const mouseCoords = screenToCanvas(event.clientX, event.clientY);
    const normalizedMouseX = Math.min(Math.max((mouseCoords[0] - pinRect.x) / pinRect.width, 0), 1);
    const normalizedMouseY = Math.min(Math.max((mouseCoords[1] - pinRect.y) / pinRect.height, 0), 1);
    if (currentPin.points.length >= 3) {
        // Figure out which point to select, or where to add a new point
        redraw();
        const {nearest, isExistingPoint} = closestPointToPos(normalizedMouseX, normalizedMouseY);

        if (nearest == null) {
            return;
        }

        let cursorRect = new DOMRect(nearest.x * pinRect.width + pinRect.x - 4, nearest.y * pinRect.height + pinRect.y - 4, 8, 8);
        if (isExistingPoint) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 5;
            ctx.strokeRect(cursorRect.x, cursorRect.y, cursorRect.width, cursorRect.height);
        }
        ctx.fillStyle = "black";
        ctx.fillRect(cursorRect.x, cursorRect.y, cursorRect.width, cursorRect.height);
        return;
    }

    redraw();
}

function handleMouseUp(event) {
    isDragging = false;
}

function precalculateEdgeValues() {
    precalcEdgeDists = [];
    let nextPoint = currentPin.points[currentPin.points.length - 1];
    for (let i = 0; i < currentPin.points.length; i++) {
        let point = nextPoint;
        nextPoint = currentPin.points[i];
        const xDiff = nextPoint.x - point.x;
        const yDiff = nextPoint.y - point.y;
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

            let tx = (x - point.x) * precalcEdgeDists[i][0];
            let ty = (y - point.y) * precalcEdgeDists[i][1];
            let t = tx + ty;
            let nearestPointIdx;
            let isCurrOnExistingPoint = false;
            if (t <= snapToPointRadius) {
                q = point
                nearestPointIdx = (i - 1 + n) % n;
                isCurrOnExistingPoint = true;
            } else if (t < 1 - snapToPointRadius) {
                q = new Point(((1 - t) * point.x) + (t * nextPoint.x), ((1 - t) * point.y) + (t * nextPoint.y));
                nearestPointIdx = i;
                isCurrOnExistingPoint = false;
            } else {
                q = nextPoint
                nearestPointIdx = i;
                isCurrOnExistingPoint = true;
            }

            let qx = q.x - x;
            let qy = q.y - y;
            let qq = (qx * qx) + (qy * qy);

            if (qq < nearestNormsqr && qq < .01) {
                console.log("Checking point ", i, "qq val is ", qq);
                nearest = q
                nearestNormsqr = qq
                bestT = t;
                bestI = i;
                isExistingPoint = isCurrOnExistingPoint;
                existingPointIdx = nearestPointIdx;
            }

        }
    } else if (n == 1) {
        nearest = currentPin.points.x
        let dx = nearest.x - x;
        let dy = nearest.y - y;
        nearestNormsqr = dx * dx + dy * dy;

    } else {
        nearest = null
        nearestNormsqr = Number.MAX_VALUE;
    }

    console.log("Nearest point is", nearest, existingPointIdx, isExistingPoint);

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

    ctx.fillStyle = "grey";
    ctx.fillRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);

    ctx.fillStyle = "white";
    ctx.fillRect(pinRect.x, pinRect.y, pinRect.width, pinRect.height);

    ctx.fillStyle = Colors.pinFillColor;
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(0, 0, 0, .35)`;
    drawPin(currentPin, pinRect.x, pinRect.y, pinRect.width, pinRect.height);
    drawPinPoints(currentPin, pinRect.x, pinRect.y, pinRect.width, pinRect.height);

    let i = 0;
    currentPin.points.forEach(point => {
        if (point.lastRenderMetadata) {
            if (i == selectedPointIdx || i == selectedMirroredPointIdx) {
                ctx.strokeStyle = "black";
                ctx.lineWidth = 5;
                ctx.stroke(point.lastRenderMetadata);
            }
            if (point.lockRelativeToHeight != null) {
                ctx.fillStyle = `hsl(${150 + point.lockRelativeToHeight * 200}, 100%, 60%)`
            } else {
                ctx.fillStyle = `rgba(0, 0, 0, .35)`;
            }
            ctx.fill(point.lastRenderMetadata);
        }
        i++;
    });
}

function setMirroredEditor(enabled) {
    console.log("Mirrored editor toggled: s", enabled);
    mirroredEditor = enabled;
}

pointX.addEventListener('input', evt => {
    if (selectedNormalizedPoint) {
        selectedNormalizedPoint.x = parseFloat(evt.target.value);
        if (selectedMirroredPointIdx) {
            currentPin.points[selectedMirroredPointIdx].x = 1 - selectedNormalizedPoint.x;
        }
        redraw();
    }
});
pointY.addEventListener('input', evt => {
    if (selectedNormalizedPoint) {
        selectedNormalizedPoint.y = parseFloat(evt.target.value) / currentPin.pinHeight;
        if (selectedMirroredPointIdx) {
            currentPin.points[selectedMirroredPointIdx].y = selectedNormalizedPoint.y;
        }
        redraw();
    }
});
lockDropDown.addEventListener('input', evt => {
    console.log("Value changed to", evt);
    if (selectedNormalizedPoint) {
        let selectedOption = evt.target.selectedOptions[0];
        let newLValue = null;
        if (selectedOption.attributes.lvalue != null) {
            newLValue = parseFloat(selectedOption.attributes.lvalue.value);
            console.log("New l value ", newLValue, "parsed from ", selectedOption.attributes.lvalue)
        } else if (selectedOption.value == "custom" && selectedNormalizedPoint.lockRelativeToHeight != null) {
            pointLockCustomValue.value = selectedNormalizedPoint.lockRelativeToHeight;
        }

        if (selectedOption.value == "custom") {
            customLInputSection.style.display = "block";
        } else {
            customLInputSection.style.display = "none";
        }

        if (newLValue != null) {
            selectedNormalizedPoint.lockRelativeToHeight = newLValue;
            if (selectedMirroredPointIdx) {
                currentPin.points[selectedMirroredPointIdx].lockRelativeToHeight = newLValue;
            }
        }
        redraw();
    }
});

deletePointButton.addEventListener("click", deleteSelectedPoint);

export default {handleClick, openPinEditor, closePinEditor, isPinEditorOpen, handleMouseMove, setMirroredEditor, redraw, handleMouseDrag, handleMouseDown, handleMouseUp};