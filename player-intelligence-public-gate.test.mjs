import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('./player-intelligence.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./player-intelligence.html',import.meta.url),'utf8');
test('public player intelligence is fail-closed for named dossiers',()=>{assert.match(js,/PUBLIC_NAMED_PLAYER_ENABLED=false/);assert.match(js,/if\(!PUBLIC_NAMED_PLAYER_ENABLED\)return showPublicGate/);assert.match(js,/Nessun catalogo nominativo caricato/);});
test('public player page explains privacy-first boundary',()=>{assert.match(html,/PRIVACY-FIRST PREVIEW/i);assert.match(html,/non carica dossier nominativi/i);assert.match(html,/Founder\/internal/i);});
