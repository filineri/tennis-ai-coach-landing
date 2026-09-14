import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_RUNS, compareCandidates, evaluateCandidate, previewUsage, consumePreviewRun } from './tour-manager-preview.js';

const constraints={maxBudget:2000,maxTravelMinutes:600,maxVenueDistanceKm:15,minRecoveryHours:16};
const spain={name:'Spagna',entryFee:40,travelCost:310,lodgingCost:820,practiceCost:120,travelMinutes:145,venueDistanceKm:2.4,recoveryHours:28,tournamentValue:94};
const croatia={name:'Croazia',entryFee:35,travelCost:180,lodgingCost:590,practiceCost:80,travelMinutes:430,venueDistanceKm:1.1,recoveryHours:22,tournamentValue:79};

test('preview compares two feasible options and recommends one',()=>{
  const result=compareCandidates([spain,croatia],constraints);
  assert.equal(result.status,'VERIFIED_PREVIEW');
  assert.equal(result.feasible.length,2);
  assert.equal(result.recommended.name,'Spagna');
  assert.equal(result.bookingAuthority,false);
  assert.equal(result.usageUnits,1);
});

test('hard budget wins over tournament preference',()=>{
  const plan=evaluateCandidate({...spain,lodgingCost:1900,tournamentValue:100},constraints);
  assert.equal(plan.feasible,false);
  assert.match(plan.violations.join(','),/Budget superato/);
});
test('travel, distance and recovery are hard constraints',()=>{
  const plan=evaluateCandidate({...croatia,travelMinutes:900,venueDistanceKm:30,recoveryHours:5},constraints);
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
  const blocked=consumePreviewRun(storage);
  assert.equal(blocked.allowed,false);
  assert.equal(blocked.remaining,0);
});
