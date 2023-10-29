import { registerChamberListeners } from "./chamberinputs.js";
import { registerResetListener } from "./reset.js";
import { registerSimulatorInputs } from "./simulatorinputs.js";
import { addHistoryListeners } from "./historyinputs.js";

export function registerAllListeners() {
    registerChamberListeners();
    registerResetListener();
    registerSimulatorInputs();
    addHistoryListeners();
}