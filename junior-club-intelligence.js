const DATA_URL='./data/parent-junior-club-report.json';
const $=id=>document.getElementById(id);
let report=null,clubTable=null,establishedTable=null,emergingTable=null,chart=null;
const playerLookup=new Map();
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metric(label,value){return `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;}
function indexPlayers(){
  for(const cat of Object.values(report.ageCategories||{}))for(const group of ['established','emerging'])for(const p of cat[group]||[])playerLookup.set(p.playerId,p);
  for(const rows of [report.clubs||[],...Object.values(report.clubRankingsByAgeCategory||{})])for(const c of rows)for(const p of c.topPlayers||[])playerLookup.set(p.playerId,p);
}
function clubRows(){
  const age=$('age').value,province=$('province').value,conf=$('confidence').value,q=$('clubSearch').value.trim().toLowerCase();
  let rows=age==='ALL'?(report.clubs||[]):(report.clubRankingsByAgeCategory?.[age]||[]);
  return rows.filter(r=>(province==='ALL'||r.province===province)&&(conf==='ALL'||(conf==='HIGH'?r.confidence==='HIGH':r.confidence!=='LOW'))&&(!q||String(r.club).toLowerCase().includes(q)));
}
function cohortRows(kind){
  const age=$('age').value,cats=age==='ALL'?['U12','U14','U16','U18']:[age],rows=[];
  for(const cat of cats)for(const p of report.ageCategories?.[cat]?.[kind]||[])rows.push({...p,ageCategory:cat});
  return rows;
}
function renderMetrics(){
  const age=$('age').value,total=age==='ALL'?report.coverage.players:(report.coverage.ageCategories?.[age]||0),visible=clubRows();
  $('metrics').innerHTML=metric('Junior coperti',total)+metric('Club nel filtro',visible.length)+metric('Storico profili',`${report.coverage.historyCoveragePct}%`)+metric('Authority','Public structured');
}
function clubColumns(){return [
  {title:'Club',field:'club',minWidth:240,headerFilter:'input'},{title:'Prov.',field:'province',width:70},{title:'Junior',field:'juniors',width:75,hozAlign:'right'},
  {title:'Top quartile',field:'competitiveTopQuartile',width:105,hozAlign:'right'},{title:'Yield %',field:'competitiveYieldPct',width:85,hozAlign:'right'},
  {title:'Progressori %',field:'progressorRatePct',width:110,hozAlign:'right'},{title:'Quality win %',field:'qualityWinRatePct',width:110,hozAlign:'right'},
  {title:'Pipeline',field:'agePipelineCoverage',width:80,hozAlign:'right'},{title:'Score',field:'decisionSupportScore',width:80,hozAlign:'right',sorter:'number'},
  {title:'Conf.',field:'confidence',width:85}
];}
function playerColumns(){return [
  {title:'Fascia',field:'ageCategory',width:75},{title:'Giocatore',field:'name',minWidth:170,headerFilter:'input'},{title:'Club',field:'club',minWidth:210},
  {title:'Class.',field:'classification',width:80},{title:'1 anno fa',field:'trajectory.oneYearAgo',width:90},{title:'Δ 12m',field:'trajectory.delta12',width:75,hozAlign:'right'},
  {title:'Vs pari+',field:'quality.winRate',width:90,hozAlign:'right'},{title:'Percentile',field:'strengthPercentile',width:90,hozAlign:'right'}
];}function showClub(row){
  $('clubTitle').textContent=row.club;
  const cats=Object.entries(row.byCategory||{}).map(([k,v])=>`<span class="btn">${esc(k)} ${v}</span>`).join('');
  const top=(row.topPlayers||[]).map(p=>`<button class="btn player-link" data-player="${esc(p.playerId)}">${esc(p.name)} · ${esc(p.classification)}</button>`).join(' ');
  $('clubDetail').innerHTML=`<div class="score">${fmt(row.decisionSupportScore)}</div><div class="muted">Development evidence score · confidence ${esc(row.confidence)}</div><div class="detail-grid" style="margin-top:10px"><div><small>Junior osservati</small><b>${row.juniors}</b></div><div><small>Top quartile</small><b>${row.competitiveTopQuartile}</b></div><div><small>Progressori 12m</small><b>${row.progressors12m} · ${fmt(row.progressorRatePct)}%</b></div><div><small>Fast progressors</small><b>${row.fastProgressors12m}</b></div><div><small>Quality win rate</small><b>${fmt(row.qualityWinRatePct)}%</b></div><div><small>History coverage</small><b>${fmt(row.historyCoveragePct)}%</b></div></div><div class="pills" style="margin-top:10px">${cats}</div><h3>Junior da esplorare</h3><div class="pills">${top||'<span class="muted">Nessun dettaglio</span>'}</div>`;
  $('clubDetail').querySelectorAll('.player-link').forEach(b=>b.addEventListener('click',()=>showPlayer(playerLookup.get(b.dataset.player))));
}
function showPlayer(p){
  if(!p)return;$('playerTitle').textContent=`${p.name} · ${p.ageCategory}`;
  const h=p.trajectory?.history||[];
  chart?.dispose();chart=echarts.init($('playerChart'));
  chart.setOption({tooltip:{trigger:'axis',formatter:ps=>{const i=ps?.[0]?.dataIndex??0;return `${esc(h[i]?.period||'')}<br>${esc(h[i]?.classification||'')}`;}},xAxis:{type:'category',data:h.map(x=>x.period)},yAxis:{type:'value',name:'Forza classifica'},series:[{type:'line',smooth:true,data:h.map(x=>x.plain),symbolSize:7}]});
  $('playerDetail').innerHTML=`<div class="detail-grid"><div><small>Club</small><b>${esc(p.club||'—')}</b></div><div><small>Classifica</small><b>${esc(p.classification||'—')}</b></div><div><small>1 anno fa</small><b>${esc(p.trajectory?.oneYearAgo||'—')}</b></div><div><small>Δ 12m</small><b>${fmt(p.trajectory?.delta12)}</b></div><div><small>Quality record</small><b>${p.quality?.wins||0}-${p.quality?.losses||0} · ${fmt(p.quality?.winRate)}%</b></div><div><small>Forma</small><b>${fmt(p.recentFormPct)}%</b></div></div>`;
  setTimeout(()=>chart.resize(),0);
}
function renderTables(){
  const clubs=clubRows(),est=cohortRows('established'),em=cohortRows('emerging');
  if(!clubTable){clubTable=new Tabulator('#clubTable',{data:clubs,layout:'fitColumns',height:410,initialSort:[{column:'decisionSupportScore',dir:'desc'}],columns:clubColumns()});clubTable.on('rowClick',(_,row)=>showClub(row.getData()));}else clubTable.replaceData(clubs);
  const opts=(data)=>({data,layout:'fitColumns',height:410,columns:playerColumns()});
  if(!establishedTable){establishedTable=new Tabulator('#establishedTable',opts(est));establishedTable.on('rowClick',(_,row)=>showPlayer(row.getData()));}else establishedTable.replaceData(est);
  if(!emergingTable){emergingTable=new Tabulator('#emergingTable',opts(em));emergingTable.on('rowClick',(_,row)=>showPlayer(row.getData()));}else emergingTable.replaceData(em);
  renderMetrics();
}
function fillProvince(){const values=[...new Set((report.clubs||[]).map(x=>x.province).filter(Boolean))].sort();for(const p of values){const o=document.createElement('option');o.value=p;o.textContent=p;$('province').appendChild(o);}}
function bind(){for(const id of ['age','province','confidence'])$(id).addEventListener('change',renderTables);$('clubSearch').addEventListener('input',renderTables);window.addEventListener('resize',()=>chart?.resize());}
async function boot(){
  try{const r=await fetch(DATA_URL,{cache:'no-store'});if(!r.ok)throw new Error(`DATA_HTTP_${r.status}`);report=await r.json();indexPlayers();fillProvince();bind();renderTables();$('status').innerHTML=`Dataset <b>${esc(report.snapshotDate)}</b> · ${report.coverage.players} junior · ${report.coverage.clubs} club · storico ${report.coverage.historyCoveragePct}% · <span class="good">${esc(report.authority)}</span>. <span class="warning">Score = evidenza competitiva osservata, non prova causale della qualità del club.</span>`;}
  catch(e){$('status').textContent=`Dataset non disponibile: ${e.message}`;}
}
boot();