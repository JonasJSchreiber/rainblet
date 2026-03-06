import fs from "node:fs";
import path from "node:path";
import { generateAllRawCandidates } from "./trivia_sources.mjs";

const output = process.argv[2] || "backend/tools/trivia/data/raw_questions.jsonl";
const rows = generateAllRawCandidates();

fs.mkdirSync(path.dirname(output), { recursive: true });
const lines = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
fs.writeFileSync(output, lines, "utf8");

console.log(`Wrote ${rows.length} staged rows to ${output}`);
