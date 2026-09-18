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
  assert.match(js,/\.\/data\/parent-junior-club-report-public\.json/);assert.doesNotMatch(js,/fixture|mock|fallback/i);
});
test('junior surface preserves non-causal decision support warning',()=>{
  assert.match(html,/non dimostrano causalità|non attribuiscono causalmente/i);assert.match(html,/non dimostra che il club abbia/i);
});
test('Tabulator row interactions are registered with runtime events',()=>{
  assert.doesNotMatch(js,/rowClick\s*:/);
  assert.ok((js.match(/\.on\('rowClick'/g)||[]).length>=3);
});

test('junior UX uses on-demand drawer, responsive tables and Excel OSS export',()=>{assert.match(html,/id="clubDrawer"/);assert.match(html,/xlsx@0\.18\.5/);assert.match(js,/responsiveLayout:'collapse'/);assert.match(js,/XLSX\.writeFile/);assert.match(js,/genderScopes/);});

test('junior surface supports multi-club and multi-player evidence comparison',()=>{for(const id of ['compareBar','compareClubs','comparePlayers','comparePanel','compareChart'])assert.match(html,new RegExp(`id=\"${id}\"`));assert.match(js,/selectedClubs=new Map/);assert.match(js,/selectedPlayers=new Map/);assert.match(js,/renderComparison\('club'\)/);assert.match(js,/renderComparison\('player'\)/);assert.match(js,/type:'radar'/);});

test('compare action cells do not open detail drawers',()=>{assert.match(js,/tabulator-field=\"clubId\"/);assert.match(js,/tabulator-field=\"benchmarkId\"/);});
test('public Junior consumes privacy-first asset and exposes de-identified benchmarks',()=>{assert.match(js,/parent-junior-club-report-public\.json/);assert.match(html,/Privacy-by-design/i);assert.match(html,/benchmark junior/i);assert.match(js,/classificationBand/);assert.doesNotMatch(js,/trajectory\?\.history/);assert.doesNotMatch(js,/fitPoints/);});
test('landing explains claim plus explicit visibility model',()=>{assert.match(html,/claim verificato/i);assert.match(html,/scelta esplicita di visibilità/i);});
