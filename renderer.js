import {Chamber, Pin} from "./chamber.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
export const chamberHeightToWidthRatio = 4;
const chamberPaddingRatio = .1;
// % of chamber height that one unit of pin height takes up
// 20 units per chamber
const pinUnitHeightRatio = .05;

// We do a lot of bounds checking, this is just convenience
Object.defineProperty(DOMRect.prototype, 'contains', {
    value: function (x, y) {
        return this.x <= x && this.y <= y &&
            x <= this.x + this.width && y <= this.y + this.height;
    }
});

function drawChamber(chamber, chamberNum, chamberWidth, chamberHeight) {
    let paddingSize = chamberWidth * chamberPaddingRatio;
    let x = chamberNum * chamberWidth + paddingSize;
    let y = 0;
    let w = chamberWidth - (paddingSize * 2);
    let h = chamberHeight;
    if (chamber.highlighted) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "solid 3px black";
    } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "solid 1px black";
    }
    ctx.strokeRect(x, y, w, h);

    let currentHeight = 0;
    let idx = 0;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    chamber.pinStack.forEach(pin => {
        ctx.fillStyle = `hsl(${150 + pin.pinHeight * 10 + (idx++ * 7)}, 50%, 50%)`
        let pinHeight = pin.pinHeight * chamberHeight * pinUnitHeightRatio;
        drawPin(pin, x, currentHeight, w, pinHeight);
        currentHeight += pinHeight;
    });
    chamber.lastRenderMetadata = new DOMRect(x, y, w, h);
}

// Pin is an array of points normalized to 1x1 rect
// Origin starting at bottom left corner
// will be rescaled to w by h rect at (x, y)
function drawPin(pin, x, y, w, h) {
    ctx.moveTo(x, y);
    ctx.beginPath();
    pin.points.forEach(point => {
        let px = point[0] * w + x;
        let py = point[1] * h + y;
        ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    if (pin.highlighted) {
        ctx.stroke();
    }
    pin.lastRenderMetadata = new DOMRect(x, y, w, h);
}

// Coordinates use bottom left as origin for ease of use
function findPinUnderCoordinates(chambers, x, y) {
    console.log("Searching chambers ", chambers, "for coordinates", x, y);

    if (chambers.length == 0) {
        return {};
    }

    const chamberWidth = chambers[0].lastRenderMetadata.width + (chambers[0].lastRenderMetadata.x * 2);
    const chamberIdx = Math.floor(x / chamberWidth);
    const chamber = chambers[chamberIdx];

    if (!chamber) {
        return {};
    }

    let pinIdx = 0;
    let foundPin;
    for (let pin of chamber.pinStack) {
        let pinRect = pin.lastRenderMetadata;
        if (pinRect.contains(x, y)) {
            foundPin = pin;
            break;
        }
        pinIdx++;
    }

    console.log("Found match: %s, pin: %s", foundPin, pinIdx);

    return {chamber, pin:foundPin, pinIdx, chamberIdx};
}

function redrawChambers(chambers) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let chamberWidth = canvas.width / chambers.length;
    const chamberHeight = Math.min(chamberWidth * chamberHeightToWidthRatio, canvas.height);
    chamberWidth = chamberHeight / chamberHeightToWidthRatio;

    let chamberNum = 0;
    chambers.forEach(chamber => {
        drawChamber(chamber, chamberNum++, chamberWidth, chamberHeight);
    });
}

function screenToCanvas(x, y) {
    const canvasBounds = canvas.getBoundingClientRect();
    return [x - canvasBounds.left, canvasBounds.height - (y - canvasBounds.top)];
}

export {redrawChambers, drawPin, drawChamber, findPinUnderCoordinates, screenToCanvas};