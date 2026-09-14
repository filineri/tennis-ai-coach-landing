const crypto=require('node:crypto');
const clean=(v,max=120)=>String(v??'').trim().slice(0,max);
const num=(v,label,min=0)=>{const x=Number(v);if(!Number.isFinite(x)||x<min)throw new Error(`Valore non valido: ${label}`);return x;};
const day=(iso)=>Date.parse(`${iso}T12:00:00Z`),round=(v)=>Math.round(v*100)/100;
const addDays=(iso,n)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const avg=(xs)=>round(xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length));
const official=(label,query,estimatedCost=null)=>({kind:'ORGANIZER_OFFICIAL',label,query,estimatedCost,bookingAuthority:false});
const ev=(id,name,circuit,level,city,date,deadline,travel,cost,sport,prob,points,difficulty,organizer={})=>({id,name,circuit,level,city,date,entryDeadline:deadline,travelMinutes:travel,cost,sportValue:sport,pointsProbability:prob,expectedPoints:points,drawDifficulty:difficulty,organizer});
const PROVIDERS={hotel:['Booking.com','Skyscanner Hotels'],rail:['Trainline','Omio'],flight:['Skyscanner','Omio'],car:['DiscoverCars','Booking.com'],practice:['Playtomic','Google Maps'],stringer:['Google Maps','TA Local Partner'],physio:['Google Maps','TA Local Partner'],gym:['Google Maps','TA Local Partner'],coach:['Google Maps','TA Local Partner'],localTransport:['Google Maps']};
const PREVIEW_DISTANCE_KM={
 'finale emilia':{modena:45,parma:92,milano:190,firenze:165,padova:135,verona:105,trieste:285,bolzano:220,bergamo:175,prato:155,trento:205,bologna:55,reggioemilia:65,ferrara:45,rimini:175,ravenna:125},
 'bologna':{modena:45,parma:100,milano:215,firenze:105,padova:120,verona:145,trieste:300,bolzano:280,bergamo:240,prato:90,trento:230,reggioemilia:75,ferrara:50,rimini:120,ravenna:80}
};
const cityKey=(v)=>clean(v,80).toLowerCase().replace(/[^a-zà-ÿ0-9]/g,'');
function travelPolicy(raw={}){const mode=raw.mode==='ALWAYS_LOCAL'?'ALWAYS_LOCAL':'LOCAL_UP_TO_KM';const localMaxKm=mode==='ALWAYS_LOCAL'?null:num(raw.localMaxKm??80,'localMaxKm',0);return {mode,localMaxKm};}
function estimateDistanceKm(originCity,destinationCity,fallbackMinutes=90){const origin=clean(originCity,80).toLowerCase(),dest=cityKey(destinationCity);const hit=PREVIEW_DISTANCE_KM[origin]?.[dest];return Number.isFinite(hit)?hit:Math.max(1,Math.round(Number(fallbackMinutes||90)*0.9));}
function isLocalCommute(distanceKm,policy){return policy.mode==='ALWAYS_LOCAL'||distanceKm<=policy.localMaxKm;}
const CATALOG=[
ev('fitp-modena','Open Città di Modena','FITP','FITP_OPEN','Modena','2026-10-03','2026-09-30',45,95,64,82,48,42,{practice:official('Practice al circolo','tennis club Modena'),stringer:official('Stringer in sede','tennis stringer Modena')}),
ev('fitp-parma','Open Emilia Cup','FITP','FITP_OPEN','Parma','2026-10-10','2026-10-07',75,230,72,74,58,55,{hotel:official('Hotel convenzionato torneo','hotel tennis Parma',150),practice:official('Practice court riservata','tennis club Parma'),stringer:official('Incordatura partner torneo','tennis stringer Parma'),physio:official('Fisioterapia partner torneo','sports physiotherapy Parma'),coach:official('Practice coach del club','tennis coach Parma'),localTransport:official('Shuttle hotel-circolo','tennis club Parma shuttle')}),
ev('fitp-milano','Open Lombardia Challenge','FITP','FITP_OPEN','Milano','2026-10-17','2026-10-14',150,390,86,53,76,78,{hotel:official('Hotel giocatori','hotel tennis Milano',220),practice:official('Practice ufficiale','tennis club Milano'),stringer:official('Stringer torneo','tennis stringer Milano'),physio:official('Physio onsite','sports physiotherapy Milano'),gym:official('Palestra partner','gym Milano')}),
ev('fitp-firenze','Open Toscana Firenze','FITP','FITP_OPEN','Firenze','2026-10-24','2026-10-21',95,340,79,66,68,64,{practice:official('Practice al club','tennis club Firenze'),physio:official('Fisio consigliato dal club','sports physiotherapy Firenze')}),
ev('fitp-padova','Open Veneto Performance','FITP','FITP_OPEN','Padova','2026-11-01','2026-10-29',110,305,74,71,61,58,{hotel:official('Hotel convenzionato','hotel tennis Padova',180),practice:official('Practice court','tennis club Padova')}),
ev('te-verona','Tennis Europe 14U Verona','TENNIS_EUROPE','TE_U14_CAT2','Verona','2026-10-11','2026-09-28',100,520,80,57,65,70,{hotel:official('Tournament hotel','hotel tennis Verona',260),practice:official('Official practice','tennis club Verona'),stringer:official('Tournament stringer','tennis stringer Verona')}),
ev('te-trieste','Tennis Europe 16U Trieste','TENNIS_EUROPE','TE_U16_CAT2','Trieste','2026-10-25','2026-10-12',190,680,85,49,72,76,{hotel:official('Tournament hotel','hotel tennis Trieste',330),practice:official('Official practice','tennis club Trieste')})
];
function profile(raw={}){return {ageYears:num(raw.ageYears,'ageYears',8),fitpClassification:clean(raw.fitpClassification,24),originCity:clean(raw.originCity,80)||'Bologna',pathway:clean(raw.pathway,24)||'FITP'};}
function normalizeDateInput(value){
 const v=clean(value,10);let y,m,d;
 let hit=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(hit){[,y,m,d]=hit;}
 else{hit=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(hit){[,d,m,y]=hit;}}
 if(!hit)return null;const iso=`${y}-${m}-${d}`,dt=new Date(`${iso}T12:00:00Z`);
 if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==iso)return null;return iso;
}
function timeframe(raw={}){const startDate=normalizeDateInput(raw.startDate),endDate=normalizeDateInput(raw.endDate);if(!startDate||!endDate||day(endDate)<day(startDate))throw new Error('Timeframe non valido');return {startDate,endDate};}
// scoring follows
function score(e,s){const admission=(e.admissionProbability??100)/100,pts=e.expectedPoints*admission;if(s==='RANKING')return pts*0.6+e.sportValue*0.3-e.cost/60;if(s==='LOCAL_VOLUME')return e.pointsProbability*admission*0.5-e.travelMinutes/6-e.cost/70;return pts*0.35+e.pointsProbability*admission*0.35-e.cost/70-e.travelMinutes/10;}
function pool(){
 const out=[];
 for(let i=0;i<5;i++)out.push(CATALOG[i]);
 return out;
}
function pick(list,strategy,budget,offset){
 const ranked=[...list].sort((a,b)=>score(b,strategy)-score(a,strategy));
 const out=[]; let total=0;
 for(let i=0;i<ranked.length;i++){
  const e=ranked[(i+offset)%ranked.length];
  if(out.length>=2)break;
  if(total+e.cost>budget)continue;
  out.push(e); total+=e.cost;
 }
 return out.sort((a,b)=>day(a.date)-day(b.date));
}
function external(type,label,providers,query){
 return {kind:'EXTERNAL_ALTERNATIVE',type,label,providers,query,affiliateReady:true,bookingAuthority:false};
}
function choices(found,type,label,providers,query){const alt=external(type,label,providers,query);return found?[{...found,type},alt]:[alt];}
function resourcePack(e,p={originCity:'Bologna'},policy={mode:'LOCAL_UP_TO_KM',localMaxKm:80}){const o=e.organizer||{},c=e.city,distanceKm=e.distanceKm??estimateDistanceKm(p.originCity,c,e.travelMinutes),local=isLocalCommute(distanceKm,policy);const sport=[
 ...choices(o.practice,'PRACTICE','Practice court / hitting',PROVIDERS.practice,`tennis practice ${c}`),
 ...choices(o.stringer,'STRINGER','Stringer / incordatura',PROVIDERS.stringer,`tennis stringer ${c}`),
 ...choices(o.physio,'PHYSIO','Fisioterapista / recovery',PROVIDERS.physio,`sports physiotherapy ${c}`),
 ...choices(o.gym,'GYM','Palestra / conditioning',PROVIDERS.gym,`gym ${c}`),
 ...choices(o.coach,'COACH','Practice coach',PROVIDERS.coach,`tennis coach ${c}`)
];if(local)return [{kind:'LOCAL_SELF_TRANSFER',type:'DAILY_COMMUTE',label:'Rientro in giornata · auto / mezzi pubblici',providers:['Google Maps'],query:`${p.originCity} to ${c}`,distanceKm,distanceMode:'PREVIEW_ESTIMATE',affiliateReady:false,bookingAuthority:false},...sport];return [
 ...choices(o.hotel,'HOTEL','Hotel / alloggio',PROVIDERS.hotel,`hotel ${c}`),
 external('TRAVEL','Treno / volo / auto',[...PROVIDERS.rail,...PROVIDERS.flight,...PROVIDERS.car],`${p.originCity} ${c} travel`),
 ...choices(o.localTransport,'LOCAL_TRANSPORT','Trasporto locale',PROVIDERS.localTransport,`local transport ${c}`),...sport
];}
CATALOG.push(
 ev('itfj-bolzano','ITF J30 Bolzano','ITF_JUNIOR','J30','Bolzano','2026-11-02','2026-10-13',175,760,88,44,75,82,{hotel:official('Official hotel','hotel tennis Bolzano',360),practice:official('Official practice','tennis club Bolzano'),stringer:official('Official stringer','tennis stringer Bolzano')}),
 ev('itfpro-bergamo','ITF M15/W15 Bergamo','ITF_PRO','M15','Bergamo','2026-10-19','2026-10-06',155,980,93,35,81,90,{hotel:official('Player hotel','hotel tennis Bergamo',420),practice:official('Official practice','tennis club Bergamo'),physio:official('Tournament physio','sports physiotherapy Bergamo')})
);
function between(iso,start,end){const d=day(iso);return Number.isFinite(d)&&d>=day(start)&&d<=day(end);}
function eligible(e,p){
 if(p.pathway==='FITP')return e.circuit==='FITP';
 if(p.pathway==='MIXED_JUNIOR'){
  if(e.circuit==='FITP')return true;
  if(e.circuit==='TENNIS_EUROPE'){
   if(p.ageYears<10||p.ageYears>16)return false;
   if(e.level.includes('U14'))return p.ageYears<=14;
   return p.ageYears<=16;
  }
  return e.circuit==='ITF_JUNIOR'&&p.ageYears>=13&&p.ageYears<=18;
 }
 if(p.pathway==='ITF')return e.circuit==='ITF_PRO'||(e.circuit==='ITF_JUNIOR'&&p.ageYears>=13&&p.ageYears<=18);
 return false;
}
function pickPlan(list,strategy,budget,maxEvents=3){
 const ranked=[...list].sort((a,b)=>score(b,strategy)-score(a,strategy));const out=[];let spent=0;
 for(const e of ranked){
  if(out.length>=maxEvents)break;
  if(spent+e.cost>budget)continue;
  if(out.some(x=>Math.abs(day(x.date)-day(e.date))<5*86400000))continue;
  out.push(e);spent+=e.cost;
 }
 return out.sort((a,b)=>day(a.date)-day(b.date));
}
CATALOG.push(
 ev('itfj-prato','ITF J60 Italia Preview','ITF_JUNIOR','J60','Prato','2026-10-12','2026-09-22',105,690,90,38,88,86,{hotel:official('Official hotel','hotel tennis Prato',320),practice:official('Official practice','tennis club Prato')}),
 ev('itfpro-sardegna','ITF M15/W15 Italia Preview','ITF_PRO','M15','Santa Margherita di Pula','2026-10-26','2026-10-13',320,1250,94,31,92,93,{hotel:official('Player hotel','hotel tennis Santa Margherita di Pula',480),practice:official('Official practice','tennis club Santa Margherita di Pula')}),
 ev('itfpro-trento','ITF M25/W35 Italia Preview','ITF_PRO','M25','Trento','2026-11-05','2026-10-22',165,1100,96,27,98,95,{practice:official('Official practice','tennis club Trento'),stringer:official('Tournament stringer','tennis stringer Trento')})
);

CATALOG.push(
 ev('fitp-bologna-dec','Open Bologna Winter','FITP','FITP_OPEN','Bologna','2026-12-05','2026-12-02',55,120,70,76,56,52,{practice:official('Practice al circolo','tennis club Bologna'),stringer:official('Stringer del club','tennis stringer Bologna')}),
 ev('fitp-reggio-jan','Open Reggio Emilia Indoor','FITP','FITP_OPEN','Reggio Emilia','2027-01-09','2027-01-06',80,180,74,69,62,59,{practice:official('Practice indoor','tennis club Reggio Emilia'),physio:official('Fisio partner','sports physiotherapy Reggio Emilia')}),
 ev('fitp-ferrara-feb','Open Ferrara Indoor','FITP','FITP_OPEN','Ferrara','2027-02-06','2027-02-03',60,145,68,79,54,48,{practice:official('Practice al club','tennis club Ferrara')}),
 ev('fitp-rimini-feb','Open Riviera Indoor','FITP','FITP_OPEN','Rimini','2027-02-20','2027-02-17',125,285,81,61,71,67,{hotel:official('Hotel convenzionato','hotel tennis Rimini',170),practice:official('Practice ufficiale','tennis club Rimini')}),
 ev('fitp-ravenna-mar','Open Ravenna Spring','FITP','FITP_OPEN','Ravenna','2027-03-06','2027-03-03',95,220,77,68,65,61,{practice:official('Practice al circolo','tennis club Ravenna'),stringer:official('Stringer torneo','tennis stringer Ravenna')})
);

const ENTRY_META={
 'fitp-ravenna-mar':{endDate:'2027-03-14',maxParticipants:64,criterion:'RANKING',currentEntries:57,estimatedPosition:42},
 'fitp-rimini-feb':{endDate:'2027-02-28',maxParticipants:64,criterion:'RANKING',currentEntries:69,estimatedPosition:56},
 'fitp-ferrara-feb':{endDate:'2027-02-14',maxParticipants:64,criterion:'REGISTRATION_ORDER',currentEntries:41,estimatedPosition:28},
 'fitp-reggio-jan':{endDate:'2027-01-17',maxParticipants:64,criterion:'RANKING',currentEntries:54,estimatedPosition:39},
 'fitp-bologna-dec':{endDate:'2026-12-13',maxParticipants:64,criterion:'RANKING',currentEntries:49,estimatedPosition:32},
 'fitp-modena':{endDate:'2026-10-11',maxParticipants:64,criterion:'RANKING',currentEntries:58,estimatedPosition:44},
 'fitp-parma':{endDate:'2026-10-18',maxParticipants:64,criterion:'REGISTRATION_ORDER',currentEntries:61,estimatedPosition:38},
 'fitp-milano':{endDate:'2026-10-25',maxParticipants:96,criterion:'RANKING',currentEntries:103,estimatedPosition:82},
 'fitp-firenze':{endDate:'2026-11-01',maxParticipants:64,criterion:'RANKING',currentEntries:72,estimatedPosition:59},
 'fitp-padova':{endDate:'2026-11-08',maxParticipants:64,criterion:'REGISTRATION_ORDER',currentEntries:48,estimatedPosition:27},
 'te-verona':{endDate:'2026-10-17',maxParticipants:64,criterion:'RANKING',currentEntries:70,estimatedPosition:49},
 'te-trieste':{endDate:'2026-10-31',maxParticipants:64,criterion:'RANKING',currentEntries:68,estimatedPosition:55},
 'itfj-bolzano':{endDate:'2026-11-08',maxParticipants:64,criterion:'RANKING',currentEntries:75,estimatedPosition:58},
 'itfpro-bergamo':{endDate:'2026-10-25',maxParticipants:32,criterion:'RANKING',currentEntries:51,estimatedPosition:36},
 'itfj-prato':{endDate:'2026-10-18',maxParticipants:64,criterion:'RANKING',currentEntries:83,estimatedPosition:61},
 'itfpro-sardegna':{endDate:'2026-11-01',maxParticipants:32,criterion:'RANKING',currentEntries:47,estimatedPosition:31},
 'itfpro-trento':{endDate:'2026-11-11',maxParticipants:32,criterion:'RANKING',currentEntries:45,estimatedPosition:29}
};

function estimateAdmission(e){
 const m=e.entryMeta;if(!m||!m.maxParticipants)return 100;
 const inside=m.estimatedPosition<=m.maxParticipants,margin=m.maxParticipants-m.estimatedPosition;
 const crowd=Math.max(0,m.currentEntries-m.maxParticipants);
 const volatility=m.criterion==='RANKING'?Math.min(24,crowd*1.6):4;
 return round(clamp((inside?88:38)+margin*1.8-volatility,3,98));
}
function decorateTournament(e){const entryMeta=ENTRY_META[e.id]||{endDate:addDays(e.date,7),maxParticipants:null,criterion:'UNKNOWN',currentEntries:null,estimatedPosition:null};const out={...e,endDate:entryMeta.endDate,entryMeta};out.admissionProbability=estimateAdmission(out);out.admissionStatus=out.admissionProbability>=80?'PROBABILMENTE_AMMESSO':out.admissionProbability>=55?'BORDERLINE':'PROBABILMENTE_ESCLUSO';return out;}
function survivalToDate(e,iso){if(day(iso)<day(e.date)||day(iso)>day(e.endDate))return 0;const offset=Math.max(0,Math.round((day(iso)-day(e.date))/86400000));const base=clamp(0.35+(e.pointsProbability/100)*0.45+(1-e.drawDifficulty/100)*0.2,0.2,0.92);return offset===0?1:Math.pow(base,Math.min(offset,5));}
function conflictRisk(a,b){const start=day(a.date)>day(b.date)?a.date:b.date,end=day(a.endDate)<day(b.endDate)?a.endDate:b.endDate;if(day(start)>day(end))return null;let maxRisk=0,riskDate=start;for(let t=day(start);t<=day(end);t+=86400000){const iso=new Date(t).toISOString().slice(0,10);const risk=survivalToDate(a,iso)*survivalToDate(b,iso)*(a.admissionProbability/100)*(b.admissionProbability/100);if(risk>maxRisk){maxRisk=risk;riskDate=iso;}}return {eventA:a.id,eventB:b.id,eventAName:a.name,eventBName:b.name,date:riskDate,probability:round(maxRisk*100),cities:[a.city,b.city]};}
function scheduleConflicts(events){const out=[];for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){const r=conflictRisk(events[i],events[j]);if(r)out.push(r);}return out.sort((a,b)=>b.probability-a.probability);}

function planLabel(strategy){return strategy==='RANKING'?'Opportunità ranking':strategy==='LOCAL_VOLUME'?'Volume locale':strategy==='PERSONAL'?'Personale':'Balanced';}
function rationale(strategy){
 if(strategy==='RANKING')return 'Priorità a punti attesi e valore sportivo, accettando più rischio di draw.';
 if(strategy==='LOCAL_VOLUME')return 'Priorità a probabilità di fare punti, costi e viaggio contenuti.';
 if(strategy==='PERSONAL')return 'Composto manualmente dai tornei selezionati dal giocatore.';
 return 'Compromesso fra punti attesi, probabilità, costo e carico di viaggio.';
}
function proposal(events,strategy,budget,index,p,policy){
 const knownCost=round(events.reduce((s,e)=>s+e.cost,0));
 const proposalId=`plan_${crypto.createHash('sha1').update(events.map(e=>e.id).join('|')+strategy).digest('hex').slice(0,10)}`;
 const conflicts=scheduleConflicts(events);return {proposalId,label:planLabel(strategy),strategy,rationale:rationale(strategy),events:events.map(e=>({...e,resources:resourcePack(e,p,policy)})),scheduleConflicts:conflicts,metrics:{knownCost,budget,remaining:round(budget-knownCost),expectedPoints:round(events.reduce((s,e)=>s+e.expectedPoints*(e.admissionProbability/100),0)),pointsProbability:avg(events.map(e=>e.pointsProbability)),admissionProbability:avg(events.map(e=>e.admissionProbability)),dualPlayConflictProbability:conflicts[0]?.probability||0,drawDifficulty:avg(events.map(e=>e.drawDifficulty)),travelMinutes:events.reduce((s,e)=>s+e.travelMinutes,0),sportValue:avg(events.map(e=>e.sportValue))},monitoring:{fieldSnapshot:'PREVIEW_STATIC',cadence:'DAILY_WHEN_LIVE',alertPolicy:'ALERT_IF_RECOMMENDATION_OR_ADMISSION_CONFLICT_CHANGES_BEFORE_DEADLINE',watches:['entrant-list','entry-cap','admission-criteria','entry-deadline','draw-progress','tournament-end-date','dual-registration-conflict','organizer-services','travel','hotel']},bookingAuthority:false,liveInventory:false,index};
}
function composePersonal(payload={}){
 const p=profile(payload.playerProfile),w=timeframe(payload.timeframe),budget=num(payload.budget,'budget',100),policy=travelPolicy(payload.travelPolicy);
 const ids=[...new Set((payload.selectedEventIds||[]).map(x=>clean(x,80)).filter(Boolean))];
 if(!ids.length)throw new Error('Seleziona almeno un torneo per il piano personale');
 const candidates=CATALOG.map(decorateTournament).filter(e=>between(e.date,w.startDate,w.endDate)&&eligible(e,p)).map(e=>{const distanceKm=estimateDistanceKm(p.originCity,e.city,e.travelMinutes);return {...e,distanceKm,commuteEligible:isLocalCommute(distanceKm,policy),distanceMode:'PREVIEW_ESTIMATE'};});
 const selected=ids.map(id=>candidates.find(e=>e.id===id)).filter(Boolean).sort((a,b)=>day(a.date)-day(b.date));
 if(selected.length!==ids.length)throw new Error('Uno o più tornei selezionati non sono più compatibili con profilo/timeframe');
 const plan=proposal(selected,'PERSONAL',budget,3,p,policy);
 return {contract:'TOUR_PERSONAL_PREVIEW_V1',status:'VERIFIED_PREVIEW',dataMode:'PREVIEW_CATALOG_NOT_LIVE',playerProfile:p,timeframe:w,travelPolicy:policy,objective:'PERSONAL',plan,bookingAuthority:false,liveInventory:false};
}
function generate(payload={}){
 const p=profile(payload.playerProfile),w=timeframe(payload.timeframe),budget=num(payload.budget,'budget',100),policy=travelPolicy(payload.travelPolicy);
 if(!Number.isFinite(day(w.startDate))||!Number.isFinite(day(w.endDate)))throw new Error('Timeframe non valido');
 const candidates=CATALOG.map(decorateTournament).filter(e=>between(e.date,w.startDate,w.endDate)&&eligible(e,p)).map(e=>{const distanceKm=estimateDistanceKm(p.originCity,e.city,e.travelMinutes);return {...e,distanceKm,commuteEligible:isLocalCommute(distanceKm,policy),distanceMode:'PREVIEW_ESTIMATE'};});
 if(candidates.length<2)throw new Error('Nel catalogo Preview non ci sono abbastanza tornei compatibili nel timeframe');
 const horizonDays=Math.max(1,Math.round((day(w.endDate)-day(w.startDate))/86400000)),maxEvents=horizonDays>=120?6:horizonDays>=60?4:3;
 const strategies=['RANKING','BALANCED','LOCAL_VOLUME'];
 const plans=strategies.map((strategy,index)=>proposal(pickPlan(candidates,strategy,budget,maxEvents),strategy,budget,index,p,policy));
 if(plans.some(x=>x.events.length<1))throw new Error('Budget insufficiente per costruire tre Tour nel catalogo Preview');
 const objective=clean(payload.objective,80)||'BALANCED';
 const wanted=objective==='RANKING'?'RANKING':objective==='LOCAL_VOLUME'?'LOCAL_VOLUME':'BALANCED';
 const recommendedProposalId=plans.find(x=>x.strategy===wanted)?.proposalId||plans[1].proposalId;
 return {contract:'TOUR_DISCOVERY_PREVIEW_V1',status:'VERIFIED_PREVIEW',dataMode:'PREVIEW_CATALOG_NOT_LIVE',playerProfile:p,timeframe:w,travelPolicy:policy,objective,plans,recommendedProposalId,manualModeUrl:'./tour-manager-manual.html',providerAdapters:PROVIDERS,usageUnits:1,bookingAuthority:false,liveInventory:false};
}
function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{const body=req.body||{},result=body.action==='COMPOSE_PERSONAL'?composePersonal(body):generate(body);return res.status(200).json(result);}
 catch(error){return res.status(400).json({error:'INVALID_TOUR_DISCOVERY_REQUEST',message:String(error?.message||error)});}
}
module.exports=handler;
module.exports.generate=generate;
module.exports.composePersonal=composePersonal;
module.exports.CATALOG=CATALOG;
module.exports.PROVIDERS=PROVIDERS;
module.exports.resourcePack=resourcePack;
module.exports.normalizeDateInput=normalizeDateInput;
module.exports.estimateAdmission=estimateAdmission;
module.exports.decorateTournament=decorateTournament;
module.exports.conflictRisk=conflictRisk;
module.exports.scheduleConflicts=scheduleConflicts;
module.exports.travelPolicy=travelPolicy;
module.exports.estimateDistanceKm=estimateDistanceKm;
module.exports.isLocalCommute=isLocalCommute;
