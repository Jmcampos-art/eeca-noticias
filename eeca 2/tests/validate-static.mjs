import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const rules = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url), 'utf8'));
JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`IDs duplicados: ${[...new Set(duplicates)].join(', ')}`);
if (!html.includes('<main id="conteudo">')) throw new Error('O documento precisa de um elemento main.');
if (!html.includes('class="skip-link"')) throw new Error('O documento precisa de um link de salto.');
if (rules.rules['.write'] !== false) throw new Error('A escrita global do banco deve permanecer bloqueada.');

console.log(`Validação estática concluída: ${ids.length} IDs únicos e regras fechadas por padrão.`);
