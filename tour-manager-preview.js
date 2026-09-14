export const PREVIEW_RUNS = 3;
export function usageMeterKey(){return 'tennisagents.tourManagerPreviewRuns.v1';}
export function previewUsage(storage=globalThis.localStorage){
  const used=Math.max(0,Number(storage?.getItem?.(usageMeterKey())||0));
  return {used,remaining:Math.max(0,PREVIEW_RUNS-used),limit:PREVIEW_RUNS};
}
export function consumePreviewRun(storage=globalThis.localStorage){
  const current=previewUsage(storage);
  if(current.remaining<=0) return {...current,allowed:false};
  storage?.setItem?.(usageMeterKey(),String(current.used+1));
  return {used:current.used+1,remaining:current.remaining-1,limit:PREVIEW_RUNS,allowed:true};
}
export async function requestTourComparison(payload,fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=='function') throw new Error('FETCH_UNAVAILABLE');
  const response=await fetchImpl('/api/tour-manager',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const body=await response.json();
  if(!response.ok) throw new Error(body?.message||body?.error||'TOUR_MANAGER_REQUEST_FAILED');
  return body;
}
