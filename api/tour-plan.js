const crypto=require('node:crypto');
const clean=(v,max=120)=>String(v??'').trim().slice(0,max);
const money=(v)=>Math.round(Number(v||0)*100)/100;
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const round=(v)=>Math.round(Number(v||0)*100)/100;
const day=(iso)=>Date.parse(`${iso}T12:00:00Z`);
const maps=(q)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const providerHome={
 'Booking.com':'https://www.booking.com/','Skyscanner Hotels':'https://www.skyscanner.it/hotel/',Trainline:'https://www.thetrainline.com/it',Omio:'https://www.omio.it/',Skyscanner:'https://www.skyscanner.it/',DiscoverCars:'https://www.discovercars.com/it','Playtomic':'https://playtomic.com/','Google Maps':'https://www.google.com/maps','TA Local Partner':'#'
};
const link=(label,url,extra={})=>({label,url,bookingAuthority:false,...extra});
const addDays=(iso,days)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const planId=(proposal)=>`tour_${crypto.createHash('sha1').update(proposal.proposalId||JSON.stringify(proposal.events||[])).digest('hex').slice(0,10)}`;
function survivalToDate(e,iso){if(day(iso)<day(e.date)||day(iso)>day(e.endDate))return 0;const offset=Math.max(0,Math.round((day(iso)-day(e.date))/86400000));const base=clamp(0.35+(e.pointsProbability/100)*0.45+(1-e.drawDifficulty/100)*0.2,0.2,0.92);return offset===0?1:Math.pow(base,Math.min(offset,5));}
function conflictRisk(a,b){const start=day(a.date)>day(b.date)?a.date:b.date,end=day(a.endDate)<day(b.endDate)?a.endDate:b.endDate;if(day(start)>day(end))return null;let maxRisk=0,riskDate=start;for(let t=day(start);t<=day(end);t+=86400000){const iso=new Date(t).toISOString().slice(0,10);const risk=survivalToDate(a,iso)*survivalToDate(b,iso)*(a.admissionProbability/100)*(b.admissionProbability/100);if(risk>maxRisk){maxRisk=risk;riskDate=iso;}}return {eventA:a.id,eventB:b.id,eventAName:a.name,eventBName:b.name,date:riskDate,probability:round(maxRisk*100),cities:[a.city,b.city]};}
function scheduleConflicts(events){const out=[];for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){const r=conflictRisk(events[i],events[j]);if(r)out.push(r);}return out.sort((a,b)=>b.probability-a.probability);}
function refreshProposal(proposal,events){const conflicts=scheduleConflicts(events);const admission=events.reduce((s,e)=>s+(e.admissionProbability||100),0)/Math.max(1,events.length);const expected=events.reduce((s,e)=>s+e.expectedPoints*((e.admissionProbability||100)/100),0);return {...proposal,events,scheduleConflicts:conflicts,metrics:{...proposal.metrics,expectedPoints:round(expected),admissionProbability:round(admission),dualPlayConflictProbability:conflicts[0]?.probability||0}};}
function resourceLinks(resource){
 if(resource.kind==='ORGANIZER_OFFICIAL')return [link('Apri risorsa ufficiale',maps(resource.query),{sourceKind:'ORGANIZER_OFFICIAL'})];
 const providers=resource.providers||[];
 return providers.map(provider=>link(provider,provider==='Google Maps'?maps(resource.query):(providerHome[provider]||'#'),{provider,affiliateReady:Boolean(resource.affiliateReady),affiliateTracking:'PENDING_PARTNER_ID'}));
}
function buildResources(proposal){
 const resources=[];
 for(const event of proposal.events||[]){
  for(const [i,r] of (event.resources||[]).entries())resources.push({id:`${event.id}-${r.type||r.kind}-${i}`,eventId:event.id,eventName:event.name,city:event.city,type:r.type||r.kind,label:r.label,sourceKind:r.kind,status:'TO_REVIEW',estimatedCost:r.estimatedCost??null,providers:r.providers||[r.provider].filter(Boolean),links:resourceLinks(r)});
 }
 return resources;
}
function buildTimeline(proposal){
 const rows=[];
 for(const e of proposal.events||[]){
  rows.push({id:`${e.id}-entry`,date:e.entryDeadline,label:`Deadline / entry check · ${e.name}`,status:'PENDING',sourceRequired:true,eventId:e.id});
  rows.push({id:`${e.id}-logistics`,date:addDays(e.date,-7),label:`Blocca viaggio e alloggio flessibili · ${e.name}`,status:'PENDING',eventId:e.id});
  rows.push({id:`${e.id}-arrival`,date:addDays(e.date,-1),label:`Practice, stringer e recovery · ${e.city}`,status:'PENDING',eventId:e.id});
  rows.push({id:`${e.id}-play`,date:e.date,label:`Inizio torneo · ${e.name}`,status:'PENDING',sourceRequired:true,eventId:e.id});
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
function checklist(proposal){
 return [{id:'selected',label:'Tour scelto',status:'DONE'},...proposal.events.flatMap(e=>[
  {id:`${e.id}-entry`,label:`Iscrizione / acceptance · ${e.name}`,status:'PENDING'},
  {id:`${e.id}-travel`,label:`Viaggio / hotel · ${e.city}`,status:'PENDING'},
  {id:`${e.id}-performance`,label:`Practice / stringer / recovery · ${e.city}`,status:'PENDING'}
 ])];
}
function readiness(items){const done=items.filter(x=>x.status==='DONE').length;return {done,total:items.length,percent:Math.round(done/Math.max(1,items.length)*100)};}
function createProposalPlan(payload={}){
 const proposal=payload.proposal,context=payload.context||{};
 if(!proposal?.proposalId||!Array.isArray(proposal.events)||proposal.events.length<1)throw new Error('Proposta Tour non valida');
 const resources=buildResources(proposal),items=checklist(proposal);
 return {contract:'TOUR_PLAN_PREVIEW_V2',planId:planId(proposal),status:'ACTIVE_PREVIEW',proposal,playerProfile:context.playerProfile||{},timeframe:context.timeframe||{},objective:clean(context.objective,80),budget:{knownCosts:money(proposal.metrics?.knownCost),maxBudget:money(proposal.metrics?.budget),remaining:money(proposal.metrics?.remaining),unpricedResources:resources.filter(r=>r.estimatedCost==null).map(r=>r.id)},readiness:readiness(items),resources,checklist:items,timeline:buildTimeline(proposal),monitoring:{status:'ACTIVE_PREVIEW',mode:'MANUAL_EVENT_SIMULATION',watches:['entrant-list','entry-cap','admission-criteria','entry-deadline','draw-progress','tournament-end-date','dual-registration-conflict','organizer-services','travel','hotel','practice'],alertPolicy:'ALERT_IF_RECOMMENDATION_CHANGES_BEFORE_DEADLINE'},bookingAuthority:false,liveInventory:false,lastReplan:null,alerts:[]};
}
const RULES={
 TRAVEL_DELAY:{types:['TRAVEL','PRACTICE','PHYSIO','GYM'],summary:'Ritardo viaggio: proteggi arrivo, practice e recovery.'},
 HOTEL_UNAVAILABLE:{types:['HOTEL'],summary:'Hotel non disponibile: sostituisci alloggio e ricontrolla logistica.'},
 PRACTICE_UNAVAILABLE:{types:['PRACTICE'],summary:'Practice non disponibile: cerca court/hitting alternativo.'},
 ORGANIZER_SERVICE_CHANGE:{types:['ORGANIZER_OFFICIAL'],summary:'Il torneo ha cambiato un servizio ufficiale: ricontrolla solo le risorse coinvolte.'}
};
function replan(plan,event={}){
 if(plan?.contract!=='TOUR_PLAN_PREVIEW_V2')throw new Error('Tour Plan non valido');
 const type=clean(event.type,40),eventId=clean(event.eventId,80)||plan.proposal.events[0]?.id;
 if(type==='ENTRANT_FIELD_CHANGE'){
  const current=plan.proposal.events.find(e=>e.id===eventId);if(!current)throw new Error('Torneo monitorato non trovato');
  const delta=Number(event.probabilityDelta??-20),before=current.pointsProbability,after=Math.max(0,Math.min(100,before+delta));
  const beforeExpected=current.expectedPoints,afterExpected=money(beforeExpected*(after/Math.max(1,before)));
  const deadlineOpen=Date.parse(`${current.entryDeadline}T23:59:59Z`)>Date.now();
  const actionable=deadlineOpen&&after<before-12;
  const alert={type:'FIELD_STRENGTH_CHANGE',eventId,currentTournament:current.name,beforeProbability:before,afterProbability:after,beforeExpectedPoints:beforeExpected,afterExpectedPoints:afterExpected,actionable,severity:actionable?'RECONSIDER_PLAN':'INFO',message:actionable?`La probabilità di fare punti su ${current.name} è scesa dal ${before}% al ${after}%. Sei ancora in tempo per rivalutare il piano.`:`Campo iscritti aggiornato su ${current.name}: nessun cambio piano richiesto.`};
  return {...plan,lastReplan:{event:type,affectedResourceIds:[],preservedResourceIds:plan.resources.map(r=>r.id),summary:alert.message,actions:actionable?['Riapri le 3 alternative','Confronta il nuovo field snapshot','Cambia piano solo se il vantaggio è materiale']:['Mantieni il piano'],selective:true},alerts:[...(plan.alerts||[]),alert]};
 }
 if(type==='ADMISSION_RISK_CHANGE'){
  const current=plan.proposal.events.find(e=>e.id===eventId);if(!current)throw new Error('Torneo monitorato non trovato');const before=current.admissionProbability||100,after=clamp(before+Number(event.admissionDelta??-25));const updatedEvents=plan.proposal.events.map(e=>e.id===eventId?{...e,admissionProbability:round(after),admissionStatus:after>=80?'PROBABILMENTE_AMMESSO':after>=55?'BORDERLINE':'PROBABILMENTE_ESCLUSO'}:e);const proposal=refreshProposal(plan.proposal,updatedEvents),deadlineOpen=Date.parse(`${current.entryDeadline}T23:59:59Z`)>Date.now(),actionable=deadlineOpen&&(after<60||after<before-15);const criterion=current.entryMeta?.criterion||'UNKNOWN',cap=current.entryMeta?.maxParticipants??null;const alert={type:'ADMISSION_RISK_CHANGE',eventId,currentTournament:current.name,beforeAdmission:before,afterAdmission:round(after),criterion,maxParticipants:cap,actionable,severity:actionable?'RECONSIDER_PLAN':'INFO',message:actionable?`La probabilità di ammissione a ${current.name} è scesa dal ${before}% al ${round(after)}% (${criterion}, cap ${cap??'n/d'}). Sei ancora in tempo per rivalutare il Tour.`:`Ammissione aggiornata su ${current.name}: nessun cambio piano richiesto.`};return {...plan,proposal,lastReplan:{event:type,affectedResourceIds:[],preservedResourceIds:plan.resources.map(r=>r.id),summary:alert.message,actions:actionable?['Riapri le 3 alternative','Confronta cutoff e criterio di ammissione','Controlla il rischio di doppio impegno aggiornato']:['Mantieni il piano'],selective:true},alerts:[...(plan.alerts||[]),alert]};
 }
 if(type==='TOURNAMENT_WINDOW_CHANGE'){const current=plan.proposal.events.find(e=>e.id===eventId);if(!current)throw new Error('Torneo monitorato non trovato');const newEndDate=clean(event.newEndDate,10)||addDays(current.endDate||current.date,2);const updatedEvents=plan.proposal.events.map(e=>e.id===eventId?{...e,endDate:newEndDate}:e),proposal=refreshProposal(plan.proposal,updatedEvents),risk=proposal.metrics.dualPlayConflictProbability;return {...plan,proposal,lastReplan:{event:type,affectedResourceIds:[],preservedResourceIds:plan.resources.map(r=>r.id),summary:`Fine torneo aggiornata a ${newEndDate}. Rischio massimo di doppio impegno: ${risk}%.`,actions:risk>=25?['Rivaluta le iscrizioni sovrapposte','Confronta il piano alternativo','Proteggi viaggio e cancellazioni flessibili']:['Mantieni il piano e continua il monitoraggio'],selective:true}};
 }
 const rule=RULES[type];if(!rule)throw new Error('Evento di monitoraggio non supportato');
 const affected=plan.resources.filter(r=>(r.eventId===eventId)&&(rule.types.includes(r.type)||rule.types.includes(r.sourceKind))).map(r=>r.id);
 const updated=plan.resources.map(r=>affected.includes(r.id)?{...r,status:'REPLAN_REQUIRED'}:r);
 return {...plan,resources:updated,lastReplan:{event:type,affectedResourceIds:affected,preservedResourceIds:plan.resources.filter(r=>!affected.includes(r.id)).map(r=>r.id),summary:rule.summary,actions:['Verifica la nuova disponibilità','Confronta alternativa ufficiale ed esterna','Aggiorna solo questa parte del Tour'],selective:true}};
}
function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{
  const action=clean(req.body?.action,24)||'CREATE_PROPOSAL';
  const result=action==='CREATE_PROPOSAL'?createProposalPlan(req.body):action==='REPLAN'?replan(req.body?.plan,req.body?.event||{}):null;
  if(!result)throw new Error('Azione Tour Plan non supportata');
  return res.status(200).json(result);
 }catch(error){return res.status(400).json({error:'INVALID_TOUR_PLAN_REQUEST',message:String(error?.message||error)});}
}
module.exports=handler;
module.exports.createProposalPlan=createProposalPlan;
module.exports.replan=replan;
module.exports.RULES=RULES;

