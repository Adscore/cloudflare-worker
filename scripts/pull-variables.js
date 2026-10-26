/**
 * Script to move "environment" variables (`src/web-worker/variables.ts`) to the top of the `dist/worker.js` file
 */

import fs from "fs/promises";

const pathToVariables = "./src/web-worker/variables.ts";
const pathToWorker = "./dist/worker.js";

async function getVariables() {
  const data = await fs.readFile(pathToVariables, "utf8");
  const lines = data
    .trim()
    .split("\n")
    .map((x) => x.trim().replace("export ", ""));

  return lines;
}

/**
 * @param {string[]} searchLines
 */
async function processFile(searchLines) {
  try {
    const data = await fs.readFile(pathToWorker, "utf8");
    const lines = data.split("\n");
    const variableLines = [];
    const restLines = [];

    for (const line of lines) {
      if (searchLines.includes(line)) {
        variableLines.push(line);
      } else {
        restLines.push(line);
      }
    }

    const nonDebugVariables = variableLines.filter(
      (line) => !line.startsWith("const DEBUG"),
    );
    const debugVariables = variableLines.filter((line) =>
      line.startsWith("const DEBUG"),
    );
    const orderedVariables = [...nonDebugVariables, ...debugVariables];

    const newData = [...orderedVariables, ...restLines].join("\n");
    await fs.writeFile(pathToWorker, newData, "utf8");
    console.log("Variables moved successfully");
  } catch (err) {
    console.error("Error processing file:", err);
  }
}

getVariables().then((variables) => processFile(variables));
