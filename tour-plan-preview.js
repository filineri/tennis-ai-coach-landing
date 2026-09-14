const PLAN_KEY='tennisagents.tourPlan.v2';
const SELECTED_KEY='tennisagents.selectedTourProposal.v1';
const jsonGet=(storage,key)=>{try{return JSON.parse(storage?.getItem?.(key)||'null');}catch{return null;}};
export function loadSelectedProposal(storage=globalThis.localStorage){return jsonGet(storage,SELECTED_KEY);}
export function saveTourPlan(plan,storage=globalThis.localStorage){storage?.setItem?.(PLAN_KEY,JSON.stringify(plan));return plan;}
export function loadTourPlan(storage=globalThis.localStorage){return jsonGet(storage,PLAN_KEY);}
async function post(body,fetchImpl=globalThis.fetch){
 if(typeof fetchImpl!=='function')throw new Error('FETCH_UNAVAILABLE');
 const response=await fetchImpl('/api/tour-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json();if(!response.ok)throw new Error(payload?.message||payload?.error||'TOUR_PLAN_REQUEST_FAILED');return payload;
}
export function requestProposalPlan(selected,fetchImpl=globalThis.fetch){return post({action:'CREATE_PROPOSAL',proposal:selected.proposal,context:selected.context},fetchImpl);}
export function requestTourReplan(plan,event,fetchImpl=globalThis.fetch){return post({action:'REPLAN',plan,event},fetchImpl);}
