import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('./junior-club-intelligence.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./junior-club-intelligence.js',import.meta.url),'utf8');
test('junior parent surface exposes age, province and confidence filters',()=>{
  for(const id of ['age','gender','province','confidence','clubSearch','exportExcel'])assert.match(html,new RegExp(`id="${id}"`));
  for(const cat of ['U12','U14','U16','U18'])assert.match(html,new RegExp(cat));
});
test('junior surface reads generated structured report without fabricated fallback',()=>{
  assert.match(js,/\.\/data\/parent-junior-club-report\.json/);assert.doesNotMatch(js,/fixture|mock|fallback/i);
});
test('junior surface preserves non-causal decision support warning',()=>{
  assert.match(html,/non una valutazione assoluta/i);assert.match(html,/non dimostra che il club abbia/i);
});
test('Tabulator row interactions are registered with runtime events',()=>{
  assert.doesNotMatch(js,/rowClick\s*:/);
  assert.ok((js.match(/\.on\('rowClick'/g)||[]).length>=3);
});

test('junior UX uses on-demand drawer, responsive tables and Excel OSS export',()=>{assert.match(html,/id="clubDrawer"/);assert.match(html,/xlsx@0\.18\.5/);assert.match(js,/responsiveLayout:'collapse'/);assert.match(js,/XLSX\.writeFile/);assert.match(js,/genderScopes/);});
