import { handleReset } from "../../main.js";

export function registerResetListener() {
    document.getElementById("reset").addEventListener("click", () => {
        handleReset();
    });
}
