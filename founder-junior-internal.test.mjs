import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('./internal-founder/junior-club-intelligence-founder.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./internal-founder/junior-club-intelligence-founder.js',import.meta.url),'utf8');
const launcher=fs.readFileSync(new URL('./tools/start-founder-junior-preview.ps1',import.meta.url),'utf8');

test('Founder named Junior view remains explicitly internal',()=>{
  assert.match(html,/FOUNDER · INTERNAL NAMED VIEW/);
  assert.match(html,/Solo Founder \/ uso interno/);
  assert.match(js,/parent-junior-club-report\.json/);
});
test('Founder named preview binds localhost and is excluded from public root build',()=>{
  assert.match(launcher,/--bind','127\.0\.0\.1/);
  assert.match(launcher,/founder-junior-private-preview/);
  assert.doesNotMatch(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),/internal-founder|parent-junior-club-report\.json/);
});
