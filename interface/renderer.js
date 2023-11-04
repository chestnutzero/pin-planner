import * as Colors from "./colors.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");
export const chamberHeightToWidthRatio = 4;
const chamberPaddingRatio = .15
// % of chamber height that one unit of pin height takes up
// 20 units per chamber
const pinUnitHeightRatio = .05;
const outlineWidth = 5;
const pinPaddingX = 0;
const pinPaddingY = 2;


// We do a lot of bounds checking, this is just convenience
Object.defineProperty(DOMRect.prototype, 'contains', {
    value: function (x, y) {
        return this.x <= x && this.y <= y &&
            x <= this.x + this.width && y <= this.y + this.height;
    }
});

export function getChamberWidth(innerWidth) {
    const outerWidth = innerWidth / (1 - chamberPaddingRatio);
    return {innerWidth, outerWidth};
}

function drawChamber(chamber, chamberNum, chamberWidth, chamberHeight) {
    let paddingSize = chamberWidth * chamberPaddingRatio;
    let x = chamberNum * chamberWidth + paddingSize;
    let y = 0;
    let h = chamberHeight;
    let chamberStartX = x - paddingSize;
    let coreHeight = chamberHeight / 2;

    const innerWidth = chamberWidth - (paddingSize * 2);
    const w = innerWidth;

    // chamber.getCorePoints(w, chamberWidth, chamberHeight/2);
    // chamber.getBiblePoints();

    if (chamber.highlighted) {
        ctx.fillStyle = Colors.chamberHighlightColor;
    } else {
        ctx.fillStyle = Colors.chamberFillColor;
    }

    ctx.beginPath();
    chamber.getCorePoints(w, chamberWidth, chamberHeight / 2)
        .map(p => {
            p.x = p.x + chamberStartX;
            p.y = p.y + y;
            return p;
        })
        .forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    chamber.getBiblePoints(w, chamberWidth, chamberHeight / 2)
        .map(p => {
            p.x = p.x + chamberStartX;
            p.y = p.y + y + coreHeight + 2;
            return p;
        })
        .forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();

    // ctx.fillRect(x, y, w, h);

    let currentHeight = 0;
    chamber.pinStack.forEach(pin => {
        let pinHeight = pin.pinHeight * chamberHeight * pinUnitHeightRatio;
        drawPinPath(pin, x + pinPaddingX, currentHeight + pinPaddingY, w - pinPaddingX * 2, pinHeight - pinPaddingY);
        if (pin.highlighted) {
            ctx.strokeStyle = Colors.pinHighlightColor;
            ctx.lineWidth = outlineWidth * 2;
            ctx.stroke();
        }
        ctx.fillStyle = Colors.pinFillColor;
        ctx.fill();
        currentHeight += pinHeight;
    });

    ctx.lineWidth = outlineWidth;
    chamber.lastRenderMetadata = new DOMRect(x, y, w, h);
}

// Pin is an array of points normalized to 1x1 rect
// Origin starting at bottom left corner
// will be rescaled to w by h rect at (x, y)
function drawPin(pin, x, y, w, h, updateLastRenderMetadata = true) {
    drawPinPath(pin, x, y, w, h, updateLastRenderMetadata);
    ctx.fill();
}

function drawPinPoints(pin, x, y, w, h) {
    pin.points.forEach(point => {
        let px = point.x * w + x;
        let py = point.y * h + y;
        let path = new Path2D();
        path.rect(px - 4, py - 4, 8, 8);
        point.lastRenderMetadata = path;
    });
}

function drawPinPath(pin, x, y, w, h, updateLastRenderMetadata = true) {
    ctx.moveTo(x, y);
    ctx.beginPath();
    pin.points.forEach(point => {
        let px = point.x * w + x;
        let py = point.y * h + y;
        ctx.lineTo(px, py);
    });
    ctx.closePath();
    if (updateLastRenderMetadata) {
        pin.lastRenderMetadata = new DOMRect(x, y, w, h);
    }
}

// Coordinates use bottom left as origin for ease of use
function findPinUnderCoordinates(chambers, x, y) {
    console.debug("Searching chambers ", chambers, "for coordinates", x, y);

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
            console.debug("Found match, pinrect", pinRect, "does contain", x, y, "from pin", pin);
            foundPin = pin;
            break;
        }
        pinIdx++;
    }

    console.debug("Found match", foundPin, "pin", pinIdx);

    return {chamber, pin:foundPin, pinIdx, chamberIdx};
}

function redrawChambers(chambers) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let chamberWidth = canvas.width / chambers.length;
    const chamberHeight = Math.min(chamberWidth * chamberHeightToWidthRatio, canvas.height);
    chamberWidth = chamberHeight / chamberHeightToWidthRatio;

    let coreHeight = chamberHeight / 2;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "none";
    ctx.lineWidth = 2;
    ctx.beginPath();

    ctx.moveTo(0, coreHeight + 1);
    // Draw shear line
    ctx.lineTo(canvas.width, coreHeight + 1);
    ctx.stroke();

    let chamberNum = 0;
    chambers.forEach(chamber => {
        drawChamber(chamber, chamberNum++, chamberWidth, chamberHeight);
    });
}

function screenToCanvas(x, y) {
    const canvasBounds = canvas.getBoundingClientRect();
    return [x - canvasBounds.left, canvasBounds.height - (y - canvasBounds.top)];
}

export {redrawChambers, drawPin, drawPinPoints, drawChamber, findPinUnderCoordinates, screenToCanvas};