const systemModel={
  graph:{
    nodes:[
      ['player','Player / Coach / Parent',8,48,'human'],['club','Player & Club Intelligence',25,16,'intel'],['tour','Tour Manager',25,80,'intel'],
      ['scout','Scout',42,20,'agent'],['observer','Observer',42,48,'agent'],['match','Quick / Detailed / Tracked',42,78,'data'],
      ['explorer','EXPLORER',61,18,'engine'],['analyst','Analyst',61,48,'agent'],['strategist','STRATEGIST',78,48,'engine'],
      ['coach','Match Coach',92,48,'agent'],['trainer','Trainer / Mental',78,82,'agent']
    ],
    edges:[
      ['player','club'],['player','tour'],['club','scout'],['tour','scout'],['player','observer'],['player','match'],['scout','explorer'],
      ['observer','analyst'],['match','analyst'],['explorer','strategist'],['analyst','strategist'],['strategist','coach'],['coach','player'],['analyst','trainer'],['trainer','player']
    ]
  },
  realMatch:[
    {phase:'Checkpoint 1',signal:'Evidence window',explorer:'Esplora pattern e alternative plausibili.',strategist:'Seleziona il piano da testare e cosa osservare.',adherence:'A — / B —'},
    {phase:'Checkpoint 2',signal:'Pattern shift',explorer:'Confronta ciò che cambia con ipotesi e precedenti.',strategist:'Conferma, modifica o abbandona il piano.',adherence:'A — / B —'},
    {phase:'Checkpoint 3',signal:'Pressure moment',explorer:'Cerca rischio, opportunità e contro-evidenza.',strategist:'Prioritizza una consegna breve e giocabile.',adherence:'A — / B —'},
    {phase:'Checkpoint 4',signal:'Post-match',explorer:'Riapre domande e pattern da investigare.',strategist:'Trasforma evidenza utile nel prossimo piano.',adherence:'A — / B —'}
  ]
};

const svgNS='http://www.w3.org/2000/svg';
const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
function renderGraph(){
  const host=document.getElementById('ta-live-graph'); if(!host)return;
  host.replaceChildren();
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 1000 620');svg.classList.add('knowledge-graph-lines');
  const byId=new Map(systemModel.graph.nodes.map(n=>[n[0],n]));
  for(const [a,b] of systemModel.graph.edges){
    const from=byId.get(a),to=byId.get(b);if(!from||!to)continue;
    const path=document.createElementNS(svgNS,'path');
    const x1=from[2]*10,y1=from[3]*6.2,x2=to[2]*10,y2=to[3]*6.2,m=(x1+x2)/2;
    path.setAttribute('d',`M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`);path.classList.add('knowledge-edge');svg.appendChild(path);
  }
  host.appendChild(svg);
  for(const [id,label,x,y,kind] of systemModel.graph.nodes){
    const n=el('button',`knowledge-node ${kind}`);n.type='button';n.dataset.node=id;n.style.left=`${x}%`;n.style.top=`${y}%`;n.textContent=label;
    n.addEventListener('mouseenter',()=>focusNode(id));n.addEventListener('focus',()=>focusNode(id));n.addEventListener('mouseleave',clearFocus);n.addEventListener('blur',clearFocus);host.appendChild(n);
  }
}
function focusNode(id){
  document.querySelectorAll('.knowledge-node').forEach(n=>n.classList.toggle('dim',n.dataset.node!==id));
  const related=new Set([id]);for(const [a,b] of systemModel.graph.edges)if(a===id)related.add(b);else if(b===id)related.add(a);
  document.querySelectorAll('.knowledge-node').forEach(n=>{if(related.has(n.dataset.node))n.classList.remove('dim');});
}
function clearFocus(){document.querySelectorAll('.knowledge-node').forEach(n=>n.classList.remove('dim'));}
function renderRealMatch(){
  const body=document.getElementById('real-match-timeline');if(!body)return;body.replaceChildren();
  for(const row of systemModel.realMatch){
    const item=el('article','match-proof-row');
    for(const [label,value] of [['Momento',row.phase],['Segnale',row.signal],['EXPLORER',row.explorer],['STRATEGIST',row.strategist],['Aderenza',row.adherence]]){
      const cell=el('div','match-proof-cell');const k=el('span','match-proof-label');k.textContent=label;const v=el('strong');v.textContent=value;cell.append(k,v);item.appendChild(cell);
    }
    body.appendChild(item);
  }
}
function syncLanguage(){
  const lang=document.documentElement.lang?.toLowerCase().startsWith('it')?'it':'en';
  document.querySelectorAll('[data-asset-slot]').forEach(slot=>{
    const label=slot.querySelector('.asset-slot-label');if(!label)return;
    label.textContent=lang==='it'?'Slot screenshot / video dalla app':'App screenshot / video slot';
  });
}
renderGraph();renderRealMatch();syncLanguage();
new MutationObserver(syncLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
window.addEventListener('resize',()=>{clearTimeout(window.__taGraphResize);window.__taGraphResize=setTimeout(renderGraph,120);});
