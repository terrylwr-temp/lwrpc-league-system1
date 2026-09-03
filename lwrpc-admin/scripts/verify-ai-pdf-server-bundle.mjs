import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const chunksDirectory = join(process.cwd(), ".next", "server", "chunks");
const entries = await readdir(chunksDirectory, { withFileTypes: true }).catch(() => []);
const chunkFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));

if (chunkFiles.length === 0) {
  throw new Error("No compiled server chunks were found. Run `next build` before verifying the AI PDF bundle.");
}

const chunks = await Promise.all(chunkFiles.map(async (entry) => ({
  name: entry.name,
  content: await readFile(join(chunksDirectory, entry.name), "utf8"),
})));

const bundledHandler = chunks.find(({ content }) => /globalThis\.pdfjsWorker=\{WorkerMessageHandler:/.test(content));
if (!bundledHandler) {
  throw new Error("The compiled AI document route does not preload PDF.js WorkerMessageHandler.");
}

console.log(`Verified PDF.js WorkerMessageHandler is bundled in ${bundledHandler.name}.`);
