import Simulator from "../../simulator/simulator.js"

export function registerSimulatorInputs() {
    document.getElementById("close-simulator")
    .addEventListener("click", event => {
        Simulator.closeSimulator();
    });
    const difficultySelect = document.getElementById("difficulty");
    for (let i=0; i<=10; i++) {
        let opt = document.createElement("option");
        opt.text = i;
        opt.value = i;
        difficultySelect.add(opt);
    }
    difficultySelect.value = Simulator.getDifficultyLevel();

    difficultySelect.addEventListener("change", () => {
        Simulator.setDifficultyLevelAndReload(difficultySelect.value);
    });
}