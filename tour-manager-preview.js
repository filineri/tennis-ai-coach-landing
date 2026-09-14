export const PREVIEW_RUNS = 3;
const clamp=(v)=>Math.max(0,Math.min(1,v));
const round=(v)=>Math.round(v*100)/100;
const num=(v,fallback=0)=>{const x=Number(v);return Number.isFinite(x)?x:fallback;};

export function evaluateCandidate(candidate,constraints){
  const totalCost=round(num(candidate.entryFee)+num(candidate.travelCost)+num(candidate.lodgingCost)+num(candidate.practiceCost));
  const violations=[];
  if(totalCost>num(constraints.maxBudget)) violations.push('Budget superato');
  if(num(candidate.travelMinutes)>num(constraints.maxTravelMinutes)) violations.push('Viaggio troppo lungo');
  if(num(candidate.venueDistanceKm)>num(constraints.maxVenueDistanceKm)) violations.push('Alloggio troppo lontano');
  if(num(candidate.recoveryHours)<num(constraints.minRecoveryHours)) violations.push('Recupero insufficiente');
  const costScore=clamp(1-totalCost/Math.max(1,num(constraints.maxBudget)));
  const travelScore=clamp(1-num(candidate.travelMinutes)/Math.max(1,num(constraints.maxTravelMinutes)));
  const distanceScore=clamp(1-num(candidate.venueDistanceKm)/Math.max(1,num(constraints.maxVenueDistanceKm)));
  const recoveryScore=clamp(num(candidate.recoveryHours)/Math.max(1,num(constraints.minRecoveryHours)*2));
  const tournamentScore=clamp(num(candidate.tournamentValue)/100);
  const score=round((tournamentScore*.45+costScore*.25+travelScore*.15+distanceScore*.05+recoveryScore*.10)*100);
  return {...candidate,totalCost,score,feasible:violations.length===0,violations};
}
export function compareCandidates(candidates,constraints){
  if(!Array.isArray(candidates)||candidates.length<2) throw new Error('Servono almeno due alternative');
  const evaluated=candidates.map((c)=>evaluateCandidate(c,constraints));
  const feasible=evaluated.filter((x)=>x.feasible).sort((a,b)=>b.score-a.score||a.totalCost-b.totalCost);
  return {
    status:feasible.length?'VERIFIED_PREVIEW':'NO_FEASIBLE_PLAN',
    recommended:feasible[0]||null,
    feasible,
    rejected:evaluated.filter((x)=>!x.feasible),
    usageUnits:1,
    bookingAuthority:false,
  };
}

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
