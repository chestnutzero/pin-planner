import { updateButtons } from "../interface/inputs/historyinputs.js";

const MAX_HISTORY = 20;
let idCounter = 0;

class Node {
    // Track depth from start of the list so we can evict old nodes
    constructor(data, prev=null, next=null, depth=0) {
        this.data = data;
        this.prev = prev;
        this.next = next;
        this.depth = depth;
        this.id = idCounter;

        idCounter += 1;
    }

    setPrev(prev) {
        this.prev = prev;
        prev.next = this;
    }

    setNext(next) {
        this.next = next;
        next.prev = this;
    }
}

let current = null;
let oldest = null;
function updateCurrentData(newData) {
    if (current && current.data === newData) {
        console.log("Skipping history update because no change was made");
        return;
    }

    let oldCurrent = current;
    current = new Node(newData);
    console.log("Updating current history node to id", current.id);
    if (oldCurrent != null) {
        current.setPrev(oldCurrent);
        current.depth = oldCurrent.depth + 1;
        if (current.depth - oldest.depth >= MAX_HISTORY) {
            console.log(
                "Evicting history node with id",
                oldest.id,
                "because depth",
                oldest.depth,
                "is too far behind current depth",
                current.depth
            );
            oldest = oldest.next;
            // Erase reference to prev so js can garbage collect it
            oldest.prev = null;
        }
    } else {
        oldest = current;
    }

    updateButtons();
}

/**
 * Step backwards in history if possible and return the new current node
 * Return null if current.prev is null
 */
function stepBackwards() {
    if (current && current.prev) {
        current = current.prev;
        console.log("Stepping back to node", current.id);
        updateButtons();
        return current.data
    } else {
        return null;
    }
}

/**
 * Step forward in history if possible and return the new current node
 * Return null if current.next is null
 */
function stepForwards() {
    if (current && current.next) {
        current = current.next;
        console.log("Stepping forward to node", current.id);
        updateButtons();
        return current.data;
    } else {
        return null;
    }
}

function hasNext() {
    return current && current.next;
}

function hasPrevious() {
    return current && current.prev;
}

export default {
    hasPrevious,
    hasNext,
    stepForwards,
    stepBackwards,
    updateCurrentData
}