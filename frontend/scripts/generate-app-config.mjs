import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const templatePath = resolve(rootDir, 'src/assets/app-config.template.json');
const outputPath = resolve(rootDir, 'src/assets/app-config.json');

const defaultApiBaseUrl = 'http://localhost:8080';
const apiBaseUrl = (process.env.API_BASE_URL ?? defaultApiBaseUrl).trim().replace(/\/$/, '');

const template = readFileSync(templatePath, 'utf8');
const output = template.replace('__API_BASE_URL__', apiBaseUrl);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output, 'utf8');

console.log(`Generated ${outputPath} with API base URL: ${apiBaseUrl}`);
