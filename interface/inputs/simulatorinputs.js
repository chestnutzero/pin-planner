import Simulator from "../../simulator/simulator.js"

export function registerSimulatorInputs() {
    document.getElementById("close-simulator")
    .addEventListener("click", event => {
        Simulator.closeSimulator();
    });
}