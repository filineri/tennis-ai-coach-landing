import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PREVIEW_RUNS, previewUsage, consumePreviewRun, requestTourComparison } from './tour-manager-preview.js';
const require=createRequire(import.meta.url);
const api=require('./api/tour-manager.js');

const constraints={maxBudget:2000,maxTravelMinutes:600,maxVenueDistanceKm:15,minRecoveryHours:16};
const spain={name:'Spagna',entryFee:40,travelCost:310,lodgingCost:820,practiceCost:120,travelMinutes:145,venueDistanceKm:2.4,recoveryHours:28,tournamentValue:94};
const croatia={name:'Croazia',entryFee:35,travelCost:180,lodgingCost:590,practiceCost:80,travelMinutes:430,venueDistanceKm:1.1,recoveryHours:22,tournamentValue:79};

test('server compares two feasible options and recommends one',()=>{
  const result=api.compareCandidates([spain,croatia],constraints);
  assert.equal(result.contract,'TOUR_MANAGER_PREVIEW_API_V1');
  assert.equal(result.status,'VERIFIED_PREVIEW');
  assert.equal(result.feasible.length,2);
  assert.equal(result.recommended.name,'Spagna');
  assert.equal(result.bookingAuthority,false);
  assert.equal(result.liveInventory,false);
});

test('server hard constraints beat tournament preference',()=>{
  const plan=api.evaluateCandidate({...spain,lodgingCost:1900,tournamentValue:100},constraints);
  assert.equal(plan.feasible,false);
  assert.match(plan.violations.join(','),/Budget superato/);
});
test('server rejects travel, distance and recovery violations',()=>{
  const plan=api.evaluateCandidate({...croatia,travelMinutes:900,venueDistanceKm:30,recoveryHours:5},constraints);
  assert.equal(plan.feasible,false);
  assert.match(plan.violations.join(','),/Viaggio troppo lungo/);
  assert.match(plan.violations.join(','),/Alloggio troppo lontano/);
  assert.match(plan.violations.join(','),/Recupero insufficiente/);
});

test('browser preview meter grants exactly three runs',()=>{
  const state=new Map();
  const storage={getItem:(k)=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)};
  assert.equal(PREVIEW_RUNS,3);
  assert.deepEqual(previewUsage(storage),{used:0,remaining:3,limit:3});
  assert.equal(consumePreviewRun(storage).allowed,true);
  assert.equal(consumePreviewRun(storage).allowed,true);
  assert.equal(consumePreviewRun(storage).allowed,true);
  assert.equal(consumePreviewRun(storage).allowed,false);
});

test('client calls server endpoint instead of scoring locally',async()=>{
  let called=false;
  const fakeFetch=async(url,opts)=>{called=true;assert.equal(url,'/api/tour-manager');assert.equal(opts.method,'POST');return {ok:true,json:async()=>({status:'VERIFIED_PREVIEW',bookingAuthority:false})};};
  const result=await requestTourComparison({candidates:[spain,croatia],constraints},fakeFetch);
  assert.equal(called,true);
  assert.equal(result.status,'VERIFIED_PREVIEW');
});

test('HTTP handler returns the governed preview contract',()=>{
  const response={code:null,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return body;}};
  api({method:'POST',body:{candidates:[spain,croatia],constraints}},response);
  assert.equal(response.code,200);
  assert.equal(response.body.contract,'TOUR_MANAGER_PREVIEW_API_V1');
  assert.equal(response.body.usageUnits,1);
});

test('server fails closed on malformed numeric input',()=>{
  assert.throws(()=>api.compareCandidates([{...spain,travelCost:'oops'},croatia],constraints),/Valore non valido: travelCost/);
});