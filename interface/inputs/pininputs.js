import { setPinType, getSelectedPin } from "../../main.js";

const pinTypeSelect = document.getElementById("pin-type");

export function addPinTypeListeners() {
    pinTypeSelect.addEventListener("change", () => {
        const selectedPin = getSelectedPin();
        if (selectedPin) {
            setPinType(selectedPin, pinTypeSelect.value);
        }
    })
}