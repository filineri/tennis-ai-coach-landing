const DISCOVERY_KEY='tennisagents.tourDiscovery.v1';
const SELECTED_KEY='tennisagents.selectedTourProposal.v1';
async function post(body,fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=='function')throw new Error('FETCH_UNAVAILABLE');
  const response=await fetchImpl('/api/tour-discovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const type=response?.headers?.get?.('content-type')||'';
  if(type&&!type.toLowerCase().includes('application/json'))throw new Error(`TOUR_DISCOVERY_NON_JSON_RESPONSE_${response.status||'UNKNOWN'}`);
  let payload;try{payload=await response.json();}catch{throw new Error(`TOUR_DISCOVERY_INVALID_JSON_${response.status||'UNKNOWN'}`);}
  if(!response.ok)throw new Error(payload?.message||payload?.error||'TOUR_DISCOVERY_REQUEST_FAILED');
  return payload;
}
export function requestTourDiscovery(payload,fetchImpl=globalThis.fetch){return post(payload,fetchImpl);}
export function requestPersonalProposal(payload,fetchImpl=globalThis.fetch){return post({action:'COMPOSE_PERSONAL',...payload},fetchImpl);}
export function saveDiscovery(result,storage=globalThis.localStorage){storage?.setItem?.(DISCOVERY_KEY,JSON.stringify(result));return result;}
export function saveSelectedProposal(proposal,context={},storage=globalThis.localStorage){const value={proposal,context};storage?.setItem?.(SELECTED_KEY,JSON.stringify(value));return value;}
export function loadSelectedProposal(storage=globalThis.localStorage){try{return JSON.parse(storage?.getItem?.(SELECTED_KEY)||'null');}catch{return null;}}
export const PREVIEW_RUNS=3;
const USAGE_KEY='tennisagents.tourManagerPreviewRuns.v1';
export function previewUsage(storage=globalThis.localStorage){const used=Math.max(0,Number(storage?.getItem?.(USAGE_KEY)||0));return {used,remaining:Math.max(0,PREVIEW_RUNS-used),limit:PREVIEW_RUNS};}
export function consumePreviewRun(storage=globalThis.localStorage){const u=previewUsage(storage);if(u.remaining<=0)return {...u,allowed:false};storage?.setItem?.(USAGE_KEY,String(u.used+1));return {used:u.used+1,remaining:u.remaining-1,limit:u.limit,allowed:true};}
