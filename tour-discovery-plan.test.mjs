import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { requestTourDiscovery,requestPersonalProposal,saveSelectedProposal,loadSelectedProposal } from './tour-discovery-preview.js';
import { requestProposalPlan,requestTourReplan } from './tour-plan-preview.js';
const require=createRequire(import.meta.url);
const discovery=require('./api/tour-discovery.js');
const tourPlan=require('./api/tour-plan.js');
const base={playerProfile:{originCity:'Bologna',ageYears:16,fitpClassification:'3.1',pathway:'FITP'},timeframe:{startDate:'2026-10-01',endDate:'2026-11-08'},budget:1200,objective:'BALANCED'};

test('FITP-first discovery generates three FITP-only proposals',()=>{
 const result=discovery.generate(base);
 assert.equal(result.contract,'TOUR_DISCOVERY_PREVIEW_V1');
 assert.equal(result.plans.length,3);
 assert.equal(result.plans.every(p=>p.events.every(e=>e.circuit==='FITP')),true);
 assert.equal(result.recommendedProposalId,result.plans.find(p=>p.strategy==='BALANCED').proposalId);
});

test('ranking objective recommends ranking strategy',()=>{
 const result=discovery.generate({...base,objective:'RANKING'});
 assert.equal(result.recommendedProposalId,result.plans.find(p=>p.strategy==='RANKING').proposalId);
});

test('organizer resources outrank external fallbacks without booking authority',()=>{
 const parma=discovery.CATALOG.find(e=>e.id==='fitp-parma');
 const resources=discovery.resourcePack(parma);
 assert.equal(resources.find(r=>r.type==='HOTEL').kind,'ORGANIZER_OFFICIAL');
 assert.equal(resources.find(r=>r.type==='GYM').kind,'EXTERNAL_ALTERNATIVE');
 assert.equal(resources.every(r=>r.bookingAuthority===false),true);
});

test('confirmed proposal becomes an operational Tour Plan V2',()=>{
 const result=discovery.generate(base),proposal=result.plans[1];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe,objective:result.objective}});
 assert.equal(plan.contract,'TOUR_PLAN_PREVIEW_V2');
 assert.equal(plan.proposal.events.length,proposal.events.length);
 assert.equal(plan.monitoring.status,'ACTIVE_PREVIEW');
 assert.equal(plan.bookingAuthority,false);
 assert.ok(plan.resources.some(r=>r.sourceKind==='ORGANIZER_OFFICIAL'));
});

test('entrant-field deterioration raises actionable reconsider-plan alert before deadline',()=>{
 const result=discovery.generate(base),proposal=result.plans[1];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe}});
 const eventId=proposal.events.find(e=>e.entryDeadline>'2026-09-14').id;
 const replanned=tourPlan.replan(plan,{type:'ENTRANT_FIELD_CHANGE',eventId,probabilityDelta:-20});
 const alert=replanned.alerts.at(-1);
 assert.equal(alert.actionable,true);
 assert.equal(alert.severity,'RECONSIDER_PLAN');
 assert.match(alert.message,/probabilità di fare punti/);
});

test('hotel failure selectively replans only hotel resource for that tournament',()=>{
 const result=discovery.generate(base),proposal=result.plans[1];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe}});
 const eventId=proposal.events.find(e=>e.resources.some(r=>r.type==='HOTEL'))?.id;
 assert.ok(eventId,'expected at least one non-local event with hotel resources');
 const replanned=tourPlan.replan(plan,{type:'HOTEL_UNAVAILABLE',eventId});
 assert.equal(replanned.lastReplan.selective,true);
 assert.ok(replanned.lastReplan.affectedResourceIds.length>=1);
 assert.equal(replanned.resources.filter(r=>replanned.lastReplan.affectedResourceIds.includes(r.id)).every(r=>r.type==='HOTEL'),true);
});

test('mixed junior pathway may mix FITP with junior international events',()=>{
 const result=discovery.generate({...base,playerProfile:{...base.playerProfile,pathway:'MIXED_JUNIOR'},budget:2500});
 const circuits=new Set(result.plans.flatMap(p=>p.events.map(e=>e.circuit)));
 assert.equal(circuits.has('FITP'),true);
 assert.equal(circuits.has('ITF_JUNIOR')||circuits.has('TENNIS_EUROPE'),true);
});

test('entry caps expose admission probability and explicit admission criterion',()=>{
 const result=discovery.generate(base);
 const events=result.plans.flatMap(p=>p.events);
 const capped=events.find(e=>e.entryMeta?.maxParticipants);
 assert.ok(capped);
 assert.ok(['RANKING','REGISTRATION_ORDER'].includes(capped.entryMeta.criterion));
 assert.equal(typeof capped.admissionProbability,'number');
 assert.ok(capped.admissionProbability>=0&&capped.admissionProbability<=100);
});

test('overlapping tournament windows produce an approximate same-day dual-play risk',()=>{
 const result=discovery.generate(base);
 const balanced=result.plans.find(p=>p.strategy==='BALANCED');
 assert.ok(balanced.scheduleConflicts.length>=1);
 assert.ok(balanced.metrics.dualPlayConflictProbability>0);
 const conflict=balanced.scheduleConflicts[0];
 assert.notEqual(conflict.cities[0],conflict.cities[1]);
 assert.ok(conflict.date);
});
test('admission-risk monitoring can trigger actionable replan before deadline',()=>{
 const result=discovery.generate(base),proposal=result.plans[1];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe}});
 const eventId=proposal.events.find(e=>e.entryDeadline>'2026-09-14').id;
 const before=plan.proposal.events.find(e=>e.id===eventId).admissionProbability;
 const replanned=tourPlan.replan(plan,{type:'ADMISSION_RISK_CHANGE',eventId,admissionDelta:-45});
 const alert=replanned.alerts.at(-1);
 assert.equal(alert.type,'ADMISSION_RISK_CHANGE');
 assert.equal(alert.actionable,true);
 assert.ok(replanned.proposal.events.find(e=>e.id===eventId).admissionProbability<before);
 assert.ok(Number.isFinite(replanned.proposal.metrics.dualPlayConflictProbability));
});

test('tournament-window monitoring recomputes same-day conflict risk',()=>{
 const result=discovery.generate(base),proposal=result.plans[1];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe}});
 const first=proposal.events[0],before=plan.proposal.metrics.dualPlayConflictProbability;
 const replanned=tourPlan.replan(plan,{type:'TOURNAMENT_WINDOW_CHANGE',eventId:first.id,newEndDate:'2026-10-18'});
 assert.equal(replanned.lastReplan.event,'TOURNAMENT_WINDOW_CHANGE');
 assert.ok(replanned.proposal.metrics.dualPlayConflictProbability>=before);
 assert.equal(replanned.proposal.events.find(e=>e.id===first.id).endDate,'2026-10-18');
});


test('Italian DD/MM/YYYY timeframe is normalized and accepted',()=>{
 const result=discovery.generate({...base,timeframe:{startDate:'12/09/2026',endDate:'03/11/2026'}});
 assert.equal(result.timeframe.startDate,'2026-09-12');
 assert.equal(result.timeframe.endDate,'2026-11-03');
 assert.equal(result.plans.length,3);
});

test('invalid localized timeframe is rejected deterministically',()=>{
 assert.throws(()=>discovery.generate({...base,timeframe:{startDate:'12/09/2026',endDate:'03/11/0002'}}),/Timeframe non valido/);
 assert.throws(()=>discovery.generate({...base,timeframe:{startDate:'31/02/2026',endDate:'03/11/2026'}}),/Timeframe non valido/);
});

test('test preview uses compact hero and explicit localized date fields',()=>{
 const html=require('node:fs').readFileSync(new URL('./tour-manager.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/DIMMI QUANDO PUOI GIOCARE/);
 assert.match(html,/Costruisci il tuo calendario agonistico/);
 assert.match(html,/placeholder="GG\/MM\/AAAA"/);
 assert.match(html,/vis-timeline@8\.5\.1/);
 assert.match(html,/PIANI A\/B\/C \+ D PERSONALE/);
 assert.match(html,/detailPanel/);
 assert.match(html,/groupTemplate:groupElement/);
 assert.match(html,/bar-0/);
});


test('local commute policy suppresses hotel and long-haul travel for Finale Emilia to Modena',()=>{
 const e=discovery.decorateTournament(discovery.CATALOG.find(x=>x.id==='fitp-modena'));
 const distanceKm=discovery.estimateDistanceKm('Finale Emilia',e.city,e.travelMinutes);
 const resources=discovery.resourcePack({...e,distanceKm},{originCity:'Finale Emilia'},{mode:'LOCAL_UP_TO_KM',localMaxKm:80});
 assert.ok(distanceKm<=80);
 assert.equal(resources.some(r=>r.type==='HOTEL'),false);
 assert.equal(resources.some(r=>r.type==='TRAVEL'),false);
 assert.equal(resources.some(r=>r.type==='DAILY_COMMUTE'&&r.kind==='LOCAL_SELF_TRANSFER'),true);
});

test('always-local mode suppresses lodging even beyond the km threshold',()=>{
 const e=discovery.decorateTournament(discovery.CATALOG.find(x=>x.id==='fitp-milano'));
 const distanceKm=discovery.estimateDistanceKm('Finale Emilia',e.city,e.travelMinutes);
 const resources=discovery.resourcePack({...e,distanceKm},{originCity:'Finale Emilia'},{mode:'ALWAYS_LOCAL',localMaxKm:0});
 assert.ok(distanceKm>80);
 assert.equal(resources.some(r=>r.type==='HOTEL'||r.type==='TRAVEL'),false);
 assert.equal(resources.some(r=>r.type==='DAILY_COMMUTE'),true);
});

test('six-month horizon can build a distributed FITP plan with 2027 events',()=>{
 const result=discovery.generate({...base,playerProfile:{...base.playerProfile,originCity:'Finale Emilia'},timeframe:{startDate:'15/09/2026',endDate:'15/03/2027'},travelPolicy:{mode:'LOCAL_UP_TO_KM',localMaxKm:80},budget:1800});
 assert.equal(result.plans.length,3);
 assert.ok(result.plans.some(p=>p.events.length>=4));
 assert.ok(result.plans.flatMap(p=>p.events).some(e=>e.date>='2027-01-01'));
 assert.equal(result.travelPolicy.localMaxKm,80);
});

test('Tour Plan keeps local commute semantics and localized date rendering hooks',()=>{
 const result=discovery.generate({...base,playerProfile:{...base.playerProfile,originCity:'Finale Emilia'},travelPolicy:{mode:'LOCAL_UP_TO_KM',localMaxKm:80}});
 const proposal=result.plans.find(p=>p.events.some(e=>e.id==='fitp-modena'))||result.plans[0];
 const plan=tourPlan.createProposalPlan({proposal,context:{playerProfile:result.playerProfile,timeframe:result.timeframe,travelPolicy:result.travelPolicy}});
 if(proposal.events.some(e=>e.commuteEligible))assert.ok(plan.resources.some(r=>r.sourceKind==='LOCAL_SELF_TRANSFER'));
 const html=require('node:fs').readFileSync(new URL('./tour-plan.html',import.meta.url),'utf8');
 assert.match(html,/fmtDate\(e\.date\)/);
 assert.match(html,/RIENTRO GIORNALIERO/);
});


test('personal plan is composed server-side from explicit tournament selection',()=>{
 const input={...base,playerProfile:{...base.playerProfile,originCity:'Finale Emilia'},timeframe:{startDate:'15/09/2026',endDate:'15/03/2027'},travelPolicy:{mode:'LOCAL_UP_TO_KM',localMaxKm:80},budget:1800};
 const generated=discovery.generate(input);
 const ids=[generated.plans[0].events[0].id,generated.plans[1].events.at(-1).id].filter((v,i,a)=>a.indexOf(v)===i);
 const personal=discovery.composePersonal({...input,selectedEventIds:ids});
 assert.equal(personal.contract,'TOUR_PERSONAL_PREVIEW_V1');
 assert.equal(personal.plan.strategy,'PERSONAL');
 assert.equal(personal.plan.label,'Personale');
 assert.deepEqual(personal.plan.events.map(e=>e.id).sort(),ids.sort());
 assert.equal(personal.plan.events.every(e=>Array.isArray(e.resources)),true);
});

test('client personal composition uses governed discovery endpoint',async()=>{
 let seen;
 const fetchImpl=async(url,opts)=>{seen={url,opts};return {ok:true,json:async()=>({contract:'TOUR_PERSONAL_PREVIEW_V1',plan:{strategy:'PERSONAL'}})};};
 const result=await requestPersonalProposal({selectedEventIds:['fitp-modena'],playerProfile:base.playerProfile,timeframe:base.timeframe,budget:1200},fetchImpl);
 assert.equal(seen.url,'/api/tour-discovery');
 const body=JSON.parse(seen.opts.body);
 assert.equal(body.action,'COMPOSE_PERSONAL');
 assert.deepEqual(body.selectedEventIds,['fitp-modena']);
 assert.equal(result.plan.strategy,'PERSONAL');
});

test('single-page workspace keeps detail categories fixed and second page only as fallback',()=>{
 const html=require('node:fs').readFileSync(new URL('./tour-manager.html',import.meta.url),'utf8');
 for(const marker of ['A · Identità torneo','B · Accesso e rischio','C · Logistica','D · Servizi'])assert.match(html,new RegExp(marker.replace('·','\\·')));
 assert.match(html,/D · Personale/);
 assert.match(html,/Imposta come piano attivo/);
 assert.match(html,/Vista operativa estesa \(fallback\)/);
 assert.doesNotMatch(html,/location\.href=['"]\.\/tour-plan\.html/);
});

test('tour discovery client reports empty or non-JSON responses explicitly',async()=>{
 const empty=async()=>({ok:false,status:502,headers:{get:()=> 'application/json'},json:async()=>{throw new SyntaxError('Unexpected end of JSON input');}});
 await assert.rejects(()=>requestTourDiscovery(base,empty),/TOUR_DISCOVERY_INVALID_JSON_502/);
 const html=async()=>({ok:false,status:404,headers:{get:()=> 'text/html'},json:async()=>({})});
 await assert.rejects(()=>requestTourDiscovery(base,html),/TOUR_DISCOVERY_NON_JSON_RESPONSE_404/);
});

test('tour timeline selection is non-recursive and shows today reference',()=>{const html=require('node:fs').readFileSync(new URL('./tour-manager.html',import.meta.url),'utf8');assert.match(html,/showCurrentTime:true/);assert.match(html,/selectEvent\(p\.items\[0\],false\)/);assert.match(html,/timeline\.getSelection/);assert.match(html,/id="todayRef"/);});
