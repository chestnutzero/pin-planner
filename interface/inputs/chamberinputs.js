import { setChamberMillingType, getSelectedChamber, addChamber, deleteChamber, redraw, updateUrl, simulateSelectedChamber } from "../../main.js";
import PinFactory from "../../models/pinfactory.js";
import { Chamber, MillingType } from "../../models/chamber.js";
import Simulator from "../../simulator/simulator.js";

const millingTypeSelect = document.getElementById("milling-type");

export function registerChamberListeners() {
    document.getElementById("add-chamber").addEventListener("click", () => {
        const chamber = addChamber(Chamber.forMillingType(millingTypeSelect.value));
        chamber.addPin(PinFactory.keyPin(Math.ceil(Math.random() * 7) + 3));
        chamber.addPin(PinFactory.standardDriver(Math.ceil(Math.random() * 5) + 5));
        redraw();
        updateUrl();
    });

    document.getElementById("delete-chamber").addEventListener("click", () => {
        let selectedChamber = getSelectedChamber();
        if (selectedChamber) {
            deleteChamber(selectedChamber.chamberIdx);
        }
    });

    document.getElementById("simulate-chamber").addEventListener("click", () => {
        simulateSelectedChamber();
    });

    millingTypeSelect.addEventListener("change", () => {
        const selectedChamber = getSelectedChamber();
        if (selectedChamber) {
            setChamberMillingType(selectedChamber, millingTypeSelect.value);
            console.log("Changed chamber", selectedChamber.chamberIdx, "milling type to", millingTypeSelect.value);
        }
    });
}