export class Point {
    constructor(x, y, lockRelativeToHeight=null, lastRenderMetadata=null) {
        this.x = x;
        this.y = y;
        this.lockRelativeToHeight = lockRelativeToHeight;
        this.lastRenderMetadata = lastRenderMetadata;
    }

    objToSerialize() {
        let objToSerialize;
            objToSerialize = [this.x, this.y, this.lockRelativeToHeight];
        if (this.lockRelativeToHeight == null) {
            objToSerialize = [this.x, this.y];
        } else {
            objToSerialize = [this.x, this.y, this.lockRelativeToHeight];
        }

        return objToSerialize;
    }

    static fromRawObj(pointObj) {
        if (pointObj instanceof Array) {
            return new Point(...pointObj);
        } else {
            return new Point(pointObj.x, pointObj.y, pointObj.l);
        }
    }

    // Used when scaling pin height, account for relative lock
    scale(scaleFactor) {
        if (this.lockRelativeToHeight == null) {
            // If the point is not locked, keep it at the same position within the pinn bounds
            return;
        }

        // if we're scaling from 1 -> 2 height
        // and a point is at .5, locked to 0
        // then we want to keep it .5 units up, so new position as a percentage of pin height is .25
        let yDiff = this.y - this.lockRelativeToHeight;
        yDiff = yDiff / scaleFactor;

        this.y = this.lockRelativeToHeight + yDiff;
    }
}

export default Point;