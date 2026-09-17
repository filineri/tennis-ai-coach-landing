const DATA_URL='./data/parent-junior-club-report.json';
const $=id=>document.getElementById(id);
let report=null,clubTable=null,establishedTable=null,emergingTable=null,chart=null;
const playerLookup=new Map();
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metric(label,value){return `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;}
function indexPlayers(){
  const scopes=[report,...Object.values(report.genderScopes||{})];
  for(const scope of scopes){for(const cat of Object.values(scope.ageCategories||{}))for(const group of ['established','emerging'])for(const p of cat[group]||[])playerLookup.set(p.playerId,p);for(const rows of [scope.clubs||[],...Object.values(scope.clubRankingsByAgeCategory||{})])for(const c of rows)for(const p of c.topPlayers||[])playerLookup.set(p.playerId,p);}
}
function scope(){const g=$('gender').value;return g==='ALL'?report:(report.genderScopes?.[g]||{players:0,clubs:[],clubRankingsByAgeCategory:{},ageCategories:{}});}
function clubRows(){
  const sc=scope(),age=$('age').value,province=$('province').value,conf=$('confidence').value,q=$('clubSearch').value.trim().toLowerCase();
  let rows=age==='ALL'?(sc.clubs||[]):(sc.clubRankingsByAgeCategory?.[age]||[]);
  return rows.filter(r=>(province==='ALL'||r.province===province)&&(conf==='ALL'||(conf==='HIGH'?r.confidence==='HIGH':r.confidence!=='LOW'))&&(!q||String(r.club).toLowerCase().includes(q)));
}
function cohortRows(kind){
  const sc=scope(),age=$('age').value,cats=age==='ALL'?['U12','U14','U16','U18']:[age],rows=[];
  for(const cat of cats)for(const p of sc.ageCategories?.[cat]?.[kind]||[])rows.push({...p,ageCategory:cat});
  return rows;
}
function renderMetrics(){
  const sc=scope(),age=$('age').value,total=age==='ALL'?(sc.players??report.coverage.players):(sc.ageCategories?.[age]?.players??0),visible=clubRows();
  $('metrics').innerHTML=metric('Junior nel filtro',total)+metric('Club nel filtro',visible.length)+metric('Storico profili',`${report.coverage.historyCoveragePct}%`)+metric('Authority','Public structured');
}
function clubColumns(){return [
  {title:'Club',field:'club',minWidth:300,frozen:true,tooltip:true},{title:'Prov.',field:'province',width:70},{title:'Junior',field:'juniors',width:78,hozAlign:'right'},
  {title:'Competitive %',field:'competitiveYieldPct',width:115,hozAlign:'right'},{title:'Progressori %',field:'progressorRatePct',width:115,hozAlign:'right'},
  {title:'Quality win %',field:'qualityWinRatePct',width:115,hozAlign:'right'},{title:'Pipeline',field:'agePipelineCoverage',width:85,hozAlign:'right'},
  {title:'Score',field:'decisionSupportScore',width:82,hozAlign:'right',sorter:'number'},{title:'Conf.',field:'confidence',width:88}
];}
function playerColumns(){return [
  {title:'Fascia',field:'ageCategory',width:75},{title:'Giocatore',field:'name',minWidth:190,frozen:true,headerFilter:'input'},{title:'M/F',field:'gender',width:65,formatter:c=>c.getValue()==='female'?'F':'M'},
  {title:'Club',field:'club',minWidth:260},{title:'Class.',field:'classification',width:80},{title:'1 anno fa',field:'trajectory.oneYearAgo',width:90},{title:'Δ 12m',field:'trajectory.delta12',width:75,hozAlign:'right'},
  {title:'Vs pari+',field:'quality.winRate',width:90,hozAlign:'right'},{title:'Percentile',field:'strengthPercentile',width:90,hozAlign:'right'}
];}
function showClub(row){
  $('clubTitle').textContent=row.club;
  const cats=Object.entries(row.byCategory||{}).map(([k,v])=>`<span class="btn">${esc(k)} ${v}</span>`).join('');
  const groups={U12:[],U14:[],U16:[],U18:[]};for(const p of row.topPlayers||[])(groups[p.ageCategory]||groups.U18).push(p);
  const top=Object.entries(groups).filter(([,xs])=>xs.length).map(([cat,xs])=>`<div class="drawer-section"><b>${cat}</b><div class="pills" style="margin-top:8px">${xs.map(p=>`<button class="btn player-link" data-player="${esc(p.playerId)}">${esc(p.name)} · ${esc(p.classification)}</button>`).join(' ')}</div></div>`).join('');
  $('clubDetail').innerHTML=`<div class="score">${fmt(row.decisionSupportScore)}</div><div class="muted">Development evidence score · confidence ${esc(row.confidence)}</div><div class="drawer-section"><h3>Perché compare qui</h3><div class="detail-grid"><div><small>Junior osservati</small><b>${row.juniors}</b></div><div><small>Competitive yield</small><b>${fmt(row.competitiveYieldPct)}%</b></div><div><small>Progressori 12m</small><b>${row.progressors12m} · ${fmt(row.progressorRatePct)}%</b></div><div><small>Quality win rate</small><b>${fmt(row.qualityWinRatePct)}%</b></div><div><small>Pipeline U12–U18</small><b>${row.agePipelineCoverage}/4</b></div><div><small>History coverage</small><b>${fmt(row.historyCoveragePct)}%</b></div></div></div><div class="drawer-section"><h3>Pipeline per fascia</h3><div class="pills">${cats}</div></div><div class="drawer-section"><h3>Junior che sostengono l’evidenza</h3>${top||'<span class="muted">Nessun dettaglio</span>'}</div>`;
  $('clubDetail').querySelectorAll('.player-link').forEach(b=>b.addEventListener('click',()=>{showPlayer(playerLookup.get(b.dataset.player));closeDrawer();document.getElementById('playerTitle').scrollIntoView({behavior:'smooth',block:'center'});}));
  $('clubDrawer').classList.add('open');$('drawerBackdrop').classList.add('open');$('clubDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){$('clubDrawer').classList.remove('open');$('drawerBackdrop').classList.remove('open');$('clubDrawer').setAttribute('aria-hidden','true');}
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
  const common={layout:'fitColumns',responsiveLayout:'collapse',responsiveLayoutCollapseStartOpen:false,height:440,columnDefaults:{resizable:true,tooltip:true}};
  if(!clubTable){clubTable=new Tabulator('#clubTable',{...common,data:clubs,initialSort:[{column:'decisionSupportScore',dir:'desc'}],columns:clubColumns()});clubTable.on('rowClick',(_,row)=>showClub(row.getData()));}else clubTable.replaceData(clubs);
  const opts=data=>({...common,data,columns:playerColumns()});
  if(!establishedTable){establishedTable=new Tabulator('#establishedTable',opts(est));establishedTable.on('rowClick',(_,row)=>showPlayer(row.getData()));}else establishedTable.replaceData(est);
  if(!emergingTable){emergingTable=new Tabulator('#emergingTable',opts(em));emergingTable.on('rowClick',(_,row)=>showPlayer(row.getData()));}else emergingTable.replaceData(em);
  renderMetrics();
}
function fillProvince(){const values=[...new Set((report.clubs||[]).map(x=>x.province).filter(Boolean))].sort();for(const p of values){const o=document.createElement('option');o.value=p;o.textContent=p;$('province').appendChild(o);}}
function exportWorkbook(){
  if(!globalThis.XLSX)return alert('Modulo Excel non disponibile');
  const cleanClub=x=>({Club:x.club,Provincia:x.province,Junior:x.juniors,'Competitive %':x.competitiveYieldPct,'Progressori %':x.progressorRatePct,'Quality win %':x.qualityWinRatePct,Pipeline:x.agePipelineCoverage,Score:x.decisionSupportScore,Confidence:x.confidence});
  const cleanPlayer=x=>({Fascia:x.ageCategory,Sesso:x.gender==='female'?'F':'M',Giocatore:x.name,Club:x.club,Provincia:x.province,Classifica:x.classification,'1 anno fa':x.trajectory?.oneYearAgo,'Delta 12m':x.trajectory?.delta12,'Quality win %':x.quality?.winRate,Percentile:x.strengthPercentile});
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clubRows().map(cleanClub)),'Club');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cohortRows('established').map(cleanPlayer)),'Established');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cohortRows('emerging').map(cleanPlayer)),'Emerging');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Snapshot:report.snapshotDate,Regione:report.region,Fascia:$('age').value,Sesso:$('gender').value,Provincia:$('province').value,Confidence:$('confidence').value}]),'Filtri');XLSX.writeFile(wb,`tennisagents-junior-club-${report.snapshotDate}.xlsx`);
}
function bind(){for(const id of ['age','gender','province','confidence'])$(id).addEventListener('change',()=>{closeDrawer();renderTables();});$('clubSearch').addEventListener('input',renderTables);$('exportExcel').addEventListener('click',exportWorkbook);$('drawerClose').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);window.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});window.addEventListener('resize',()=>chart?.resize());}
async function boot(){
  try{const r=await fetch(DATA_URL,{cache:'no-store'});if(!r.ok)throw new Error(`DATA_HTTP_${r.status}`);report=await r.json();indexPlayers();fillProvince();bind();renderTables();$('status').innerHTML=`Dataset <b>${esc(report.snapshotDate)}</b> · ${report.coverage.players} junior (${report.coverage.gender?.male||0} M / ${report.coverage.gender?.female||0} F) · ${report.coverage.clubs} club · storico ${report.coverage.historyCoveragePct}% · <span class="good">${esc(report.authority)}</span>. <span class="warning">Score = evidenza competitiva osservata, non prova causale della qualità del club.</span>`;}
  catch(e){$('status').textContent=`Dataset non disponibile: ${e.message}`;}
}
boot();