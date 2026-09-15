import test from 'node:test';import assert from 'node:assert/strict';
import {validateDashboard,drilldownModel,dashboardPath,CUSTOMER_CONTRACT} from './player-intelligence-contract.mjs';
const sample={contract:'SCOUT_PLAYER_INTELLIGENCE_UI_V1',authority:'STRUCTURED_DATA_ONLY',catalog:{players:[{id:'p1',name:'A',clubId:'c1'}],clubs:[{id:'c1',name:'Club',playerIds:['p1']}],tournaments:[{id:'t1',name:'Open',playerIds:['p1'],clubId:'c1'}]},dossier:{player:{playerId:'p1'}}};
test('customer contract is stable',()=>assert.equal(CUSTOMER_CONTRACT,'TENNISAGENTS_PLAYER_CLUB_INTELLIGENCE_V1'));
test('dashboard accepts only structured SCOUT authority',()=>{assert.equal(validateDashboard(sample),sample);assert.throws(()=>validateDashboard({...sample,authority:'AI'}),/STRUCTURED_AUTHORITY_REQUIRED/);});
test('drilldown links player club tournament',()=>{const d=drilldownModel(sample);assert.equal(d.player('p1').club.name,'Club');assert.equal(d.club('c1').players[0].name,'A');assert.equal(d.tournament('t1').players[0].id,'p1');});
test('dashboard path carries selected player and region',()=>assert.match(dashboardPath('p1','Emilia-Romagna'),/playerId=p1.*region=Emilia-Romagna|region=Emilia-Romagna.*playerId=p1/));
