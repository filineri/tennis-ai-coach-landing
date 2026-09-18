const DATA_URL='./data/parent-junior-club-report-public.json';
const $=id=>document.getElementById(id);
let report=null,clubTable=null,establishedTable=null,emergingTable=null,chart=null,compareChart=null;
const selectedClubs=new Map(),selectedPlayers=new Map();
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const genderLabel=g=>g==='female'?'F':g==='male'?'M':'—';
const benchmarkLabel=p=>`Benchmark ${p.ageCategory||'Junior'} · ${genderLabel(p.gender)}`;
function metric(label,value){return `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;}
function contextLabel(){const age=$('age')?.value||'ALL',gender=$('gender')?.value||'ALL';return `${age==='ALL'?'U12–U18':age} · ${gender==='male'?'M':gender==='female'?'F':'M+F'}`;}
function selectionClone(row){return {...row,_scope:contextLabel()};}
function playerKey(row){return row.benchmarkId||row.playerId;}
function renderCompareBar(){const c=selectedClubs.size,p=selectedPlayers.size;$('compareBar').hidden=!(c||p);$('compareSummary').textContent=`${c} club · ${p} benchmark selezionati (max 4 per tipo)`;$('compareClubs').disabled=c<2;$('comparePlayers').disabled=p<2;$('compareClubs').textContent=`Confronta club (${c})`;$('comparePlayers').textContent=`Confronta benchmark (${p})`;}
function toggleClubCompare(row){const id=row.clubId;if(selectedClubs.has(id))selectedClubs.delete(id);else if(selectedClubs.size<4)selectedClubs.set(id,selectionClone(row));renderCompareBar();clubTable?.redraw(true);}
function togglePlayerCompare(row){const id=playerKey(row);if(selectedPlayers.has(id))selectedPlayers.delete(id);else if(selectedPlayers.size<4)selectedPlayers.set(id,selectionClone(row));renderCompareBar();establishedTable?.redraw(true);emergingTable?.redraw(true);}
function clearCompare(){selectedClubs.clear();selectedPlayers.clear();$('comparePanel').hidden=true;compareChart?.dispose();compareChart=null;renderCompareBar();clubTable?.redraw(true);establishedTable?.redraw(true);emergingTable?.redraw(true);}
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
  $('metrics').innerHTML=metric('Junior nel campione',total)+metric('Club nel filtro',visible.length)+metric('Storico profili',`${report.coverage.historyCoveragePct}%`)+metric('Modalità','Privacy-first');
}
function clubColumns(){return [
  {title:'⇄',field:'clubId',width:54,hozAlign:'center',headerSort:false,formatter:c=>selectedClubs.has(c.getRow().getData().clubId)?'✓':'＋',cellClick:(e,c)=>{e.stopPropagation();toggleClubCompare(c.getRow().getData());}},
  {title:'Club',field:'club',minWidth:300,frozen:true,tooltip:true},{title:'Prov.',field:'province',width:70},{title:'Junior',field:'juniors',width:78,hozAlign:'right'},
  {title:'Competitive %',field:'competitiveYieldPct',width:115,hozAlign:'right'},{title:'Progressori %',field:'progressorRatePct',width:115,hozAlign:'right'},
  {title:'Quality win %',field:'qualityWinRatePct',width:115,hozAlign:'right'},{title:'Pipeline',field:'agePipelineCoverage',width:85,hozAlign:'right'},
  {title:'Score',field:'decisionSupportScore',width:82,hozAlign:'right',sorter:'number'},{title:'Conf.',field:'confidence',width:88}
];}
function playerColumns(){return [
  {title:'⇄',field:'benchmarkId',width:54,hozAlign:'center',headerSort:false,formatter:c=>selectedPlayers.has(playerKey(c.getRow().getData()))?'✓':'＋',cellClick:(e,c)=>{e.stopPropagation();togglePlayerCompare(c.getRow().getData());}},
  {title:'Fascia',field:'ageCategory',width:75},{title:'Benchmark',field:'benchmarkId',minWidth:175,frozen:true,formatter:c=>benchmarkLabel(c.getRow().getData())},
  {title:'M/F',field:'gender',width:65,formatter:c=>genderLabel(c.getValue())},{title:'Class. band',field:'classificationBand',width:110},
  {title:'Traiettoria',field:'trajectoryBand',minWidth:125},{title:'Vs pari+',field:'qualityBand',width:95},{title:'Forza',field:'strengthBand',width:100},{title:'Forma',field:'recentFormBand',width:100}
];}
function showClub(row){
  $('clubTitle').textContent=row.club;
  const cats=Object.entries(row.byCategory||{}).map(([k,v])=>`<span class="btn">${esc(k)} ${v}</span>`).join('');
  $('clubDetail').innerHTML=`<div class="score">${fmt(row.decisionSupportScore)}</div><div class="muted">Development evidence score · confidence ${esc(row.confidence)}</div><div class="drawer-section"><h3>Perché compare qui</h3><div class="detail-grid"><div><small>Junior osservati</small><b>${row.juniors}</b></div><div><small>Competitive yield</small><b>${fmt(row.competitiveYieldPct)}%</b></div><div><small>Progressori 12m</small><b>${row.progressors12m} · ${fmt(row.progressorRatePct)}%</b></div><div><small>Quality win rate</small><b>${fmt(row.qualityWinRatePct)}%</b></div><div><small>Pipeline U12–U18</small><b>${row.agePipelineCoverage}/4</b></div><div><small>History coverage</small><b>${fmt(row.historyCoveragePct)}%</b></div></div></div><div class="drawer-section"><h3>Pipeline per fascia</h3><div class="pills">${cats}</div></div><div class="drawer-section"><h3>Privacy del dettaglio</h3><p class="muted">La versione pubblica usa evidenze aggregate del club. I singoli junior che contribuiscono allo score non sono inclusi nel dataset distribuito al browser.</p></div>`;
  $('clubDrawer').classList.add('open');$('drawerBackdrop').classList.add('open');$('clubDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){$('clubDrawer').classList.remove('open');$('drawerBackdrop').classList.remove('open');$('clubDrawer').setAttribute('aria-hidden','true');}
const strengthValue=s=>s==='Top 10%'?95:s==='Top 25%'?82:s==='Top 50%'?62:35;
const rangeValue=s=>s==='75–100%'?88:s==='50–74%'?62:s==='25–49%'?37:s==='0–24%'?12:0;
const trendValue=s=>s==='Crescita forte'?90:s==='In crescita'?70:s==='Stabile'?50:s==='In calo'?25:0;
function showPlayer(p){
  if(!p)return;
  $('playerTitle').textContent=benchmarkLabel(p);
  chart?.dispose();chart=echarts.init($('playerChart'));
  const values=[strengthValue(p.strengthBand),trendValue(p.trajectoryBand),rangeValue(p.qualityBand),rangeValue(p.recentFormBand)];
  chart.setOption({tooltip:{},radar:{indicator:[{name:'Forza',max:100},{name:'Trend',max:100},{name:'Vs pari+',max:100},{name:'Forma',max:100}]},series:[{type:'radar',data:[{name:benchmarkLabel(p),value:values}]}]});
  $('playerDetail').innerHTML=`<div class="detail-grid"><div><small>Classifica</small><b>${esc(p.classificationBand||'—')}</b></div><div><small>Forza cohort</small><b>${esc(p.strengthBand||'—')}</b></div><div><small>Traiettoria 12m</small><b>${esc(p.trajectoryBand||'—')}</b></div><div><small>Vs pari+</small><b>${esc(p.qualityBand||'—')}</b></div><div><small>Forma recente</small><b>${esc(p.recentFormBand||'—')}</b></div><div><small>Profilo</small><b>De-identificato</b></div></div>`;
  setTimeout(()=>chart.resize(),0);
}
function renderComparison(kind){
  const rows=[...(kind==='club'?selectedClubs:selectedPlayers).values()];if(rows.length<2)return;
  $('comparePanel').hidden=false;
  $('compareTitle').textContent=kind==='club'?'Confronto evidenze club':'Confronto benchmark junior';
  compareChart?.dispose();compareChart=echarts.init($('compareChart'));
  if(kind==='club'){
    $('compareCards').innerHTML=rows.map(x=>`<div class="compare-card"><h3>${esc(x.club)}</h3><div class="scope">${esc(x._scope)}</div><div class="compare-kv"><span>Score</span><b>${fmt(x.decisionSupportScore)}</b><span>Competitive yield</span><b>${fmt(x.competitiveYieldPct)}%</b><span>Progressori</span><b>${fmt(x.progressorRatePct)}%</b><span>Quality win</span><b>${fmt(x.qualityWinRatePct)}%</b><span>Pipeline U12–U18</span><b>${x.agePipelineCoverage}/4</b><span>Junior osservati</span><b>${x.juniors}</b><span>Confidence</span><b>${esc(x.confidence)}</b></div></div>`).join('');
    compareChart.setOption({tooltip:{},legend:{top:0,textStyle:{color:'#eef2ff'}},radar:{radius:'62%',indicator:[{name:'Score',max:100},{name:'Competitive',max:100},{name:'Progressori',max:100},{name:'Quality wins',max:100},{name:'Pipeline',max:100},{name:'Storico',max:100}]},series:[{type:'radar',data:rows.map(x=>({name:x.club,value:[x.decisionSupportScore,x.competitiveYieldPct,x.progressorRatePct,x.qualityWinRatePct,(x.agePipelineCoverage||0)*25,x.historyCoveragePct]}))}]});
  }else{
    $('compareCards').innerHTML=rows.map(x=>`<div class="compare-card"><h3>${esc(benchmarkLabel(x))}</h3><div class="scope">${esc(x._scope)}</div><div class="compare-kv"><span>Classifica</span><b>${esc(x.classificationBand)}</b><span>Forza</span><b>${esc(x.strengthBand)}</b><span>Traiettoria</span><b>${esc(x.trajectoryBand)}</b><span>Vs pari+</span><b>${esc(x.qualityBand)}</b><span>Forma</span><b>${esc(x.recentFormBand)}</b></div></div>`).join('');
    const data=rows.map(x=>({name:benchmarkLabel(x),value:[strengthValue(x.strengthBand),trendValue(x.trajectoryBand),rangeValue(x.qualityBand),rangeValue(x.recentFormBand)]}));
    compareChart.setOption({tooltip:{},legend:{top:0,textStyle:{color:'#eef2ff'}},radar:{radius:'62%',indicator:[{name:'Forza',max:100},{name:'Trend',max:100},{name:'Vs pari+',max:100},{name:'Forma',max:100}]},series:[{type:'radar',data}]});
  }
  setTimeout(()=>compareChart?.resize(),0);
  $('comparePanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderTables(){
  const clubs=clubRows(),est=cohortRows('established'),em=cohortRows('emerging');
  const common={layout:'fitColumns',responsiveLayout:'collapse',responsiveLayoutCollapseStartOpen:false,height:440,columnDefaults:{resizable:true,tooltip:true}};
  if(!clubTable){clubTable=new Tabulator('#clubTable',{...common,data:clubs,initialSort:[{column:'decisionSupportScore',dir:'desc'}],columns:clubColumns()});clubTable.on('rowClick',(e,row)=>{if(e.target?.closest?.('[tabulator-field="clubId"]'))return;showClub(row.getData());});}else clubTable.replaceData(clubs);
  const opts=data=>({...common,data,columns:playerColumns()});
  if(!establishedTable){establishedTable=new Tabulator('#establishedTable',opts(est));establishedTable.on('rowClick',(e,row)=>{if(e.target?.closest?.('[tabulator-field="benchmarkId"]'))return;showPlayer(row.getData());});}else establishedTable.replaceData(est);
  if(!emergingTable){emergingTable=new Tabulator('#emergingTable',opts(em));emergingTable.on('rowClick',(e,row)=>{if(e.target?.closest?.('[tabulator-field="benchmarkId"]'))return;showPlayer(row.getData());});}else emergingTable.replaceData(em);
  renderMetrics();
}
function fillProvince(){const values=[...new Set((report.clubs||[]).map(x=>x.province).filter(Boolean))].sort();for(const p of values){const o=document.createElement('option');o.value=p;o.textContent=p;$('province').appendChild(o);}}
function exportWorkbook(){
  if(!globalThis.XLSX)return alert('Modulo Excel non disponibile');
  const cleanClub=x=>({Club:x.club,Provincia:x.province,Junior:x.juniors,'Competitive %':x.competitiveYieldPct,'Progressori %':x.progressorRatePct,'Quality win %':x.qualityWinRatePct,Pipeline:x.agePipelineCoverage,Score:x.decisionSupportScore,Confidence:x.confidence});
  const cleanPlayer=x=>({Fascia:x.ageCategory,Sesso:genderLabel(x.gender),Benchmark:benchmarkLabel(x),'Classifica band':x.classificationBand,Traiettoria:x.trajectoryBand,'Quality win band':x.qualityBand,'Forza cohort':x.strengthBand,'Forma band':x.recentFormBand});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clubRows().map(cleanClub)),'Club');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cohortRows('established').map(cleanPlayer)),'Benchmark established');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cohortRows('emerging').map(cleanPlayer)),'Benchmark emerging');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Snapshot:report.snapshotDate,Regione:report.region,Fascia:$('age').value,Sesso:$('gender').value,Provincia:$('province').value,Confidence:$('confidence').value,Privacy:report.privacy?.mode}]),'Filtri');
  if(selectedClubs.size)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([...selectedClubs.values()].map(cleanClub)),'Club confronto');
  if(selectedPlayers.size)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([...selectedPlayers.values()].map(cleanPlayer)),'Benchmark confronto');
  XLSX.writeFile(wb,`tennisagents-junior-club-public-${report.snapshotDate}.xlsx`);
}
function bind(){
  for(const id of ['age','gender','province','confidence'])$(id).addEventListener('change',()=>{closeDrawer();renderTables();});
  $('clubSearch').addEventListener('input',renderTables);
  $('exportExcel').addEventListener('click',exportWorkbook);
  $('compareClubs').addEventListener('click',()=>renderComparison('club'));
  $('comparePlayers').addEventListener('click',()=>renderComparison('player'));
  $('clearCompare').addEventListener('click',clearCompare);
  $('closeCompare').addEventListener('click',()=>{$('comparePanel').hidden=true;compareChart?.dispose();compareChart=null;});
  $('drawerClose').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();$('comparePanel').hidden=true;}});
  window.addEventListener('resize',()=>{chart?.resize();compareChart?.resize();});
}
async function boot(){
  try{
    const r=await fetch(DATA_URL,{cache:'no-store'});if(!r.ok)throw new Error(`DATA_HTTP_${r.status}`);
    report=await r.json();fillProvince();bind();renderTables();
    $('status').innerHTML=`Dataset <b>${esc(report.snapshotDate)}</b> · ${report.coverage.players} junior · ${report.coverage.clubs} club · storico ${report.coverage.historyCoveragePct}% · <span class="good">${esc(report.privacy?.mode||'PUBLIC')}</span>. <span class="warning">Il file pubblico non contiene nomi, player ID, punti FITP o traiettorie individuali esatte dei profili non reclamati.</span>`;
  }catch(e){$('status').textContent=`Dataset non disponibile: ${e.message}`;}
}
boot();
