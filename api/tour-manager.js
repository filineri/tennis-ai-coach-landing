const clamp=(v)=>Math.max(0,Math.min(1,v));
const round=(v)=>Math.round(v*100)/100;
const cleanName=(v)=>String(v??'').trim().slice(0,120);
const strictNum=(value,label,{min=0,max=Number.POSITIVE_INFINITY}={})=>{
  const x=Number(value);
  if(!Number.isFinite(x)||x<min||x>max) throw new Error(`Valore non valido: ${label}`);
  return x;
};

function normalizeConstraints(raw={}){
  return {
    maxBudget:strictNum(raw.maxBudget,'maxBudget',{min:1}),
    maxTravelMinutes:strictNum(raw.maxTravelMinutes,'maxTravelMinutes',{min:1}),
    maxVenueDistanceKm:strictNum(raw.maxVenueDistanceKm,'maxVenueDistanceKm',{min:0.1}),
    minRecoveryHours:strictNum(raw.minRecoveryHours,'minRecoveryHours',{min:0}),
  };
}
function normalizeCandidate(raw={}){
  const name=cleanName(raw.name);
  if(!name) throw new Error('Nome alternativa mancante');
  return {
    name,
    entryFee:strictNum(raw.entryFee,'entryFee'),travelCost:strictNum(raw.travelCost,'travelCost'),
    lodgingCost:strictNum(raw.lodgingCost,'lodgingCost'),practiceCost:strictNum(raw.practiceCost,'practiceCost'),
    travelMinutes:strictNum(raw.travelMinutes,'travelMinutes'),venueDistanceKm:strictNum(raw.venueDistanceKm,'venueDistanceKm'),
    recoveryHours:strictNum(raw.recoveryHours,'recoveryHours'),tournamentValue:strictNum(raw.tournamentValue,'tournamentValue',{min:0,max:100}),
  };
}function evaluateCandidate(candidate={},constraints={}){
  const c=normalizeCandidate(candidate),k=normalizeConstraints(constraints);
  const totalCost=round(c.entryFee+c.travelCost+c.lodgingCost+c.practiceCost);
  const violations=[];
  if(totalCost>k.maxBudget) violations.push('Budget superato');
  if(c.travelMinutes>k.maxTravelMinutes) violations.push('Viaggio troppo lungo');
  if(c.venueDistanceKm>k.maxVenueDistanceKm) violations.push('Alloggio troppo lontano');
  if(c.recoveryHours<k.minRecoveryHours) violations.push('Recupero insufficiente');
  const costScore=clamp(1-totalCost/k.maxBudget);
  const travelScore=clamp(1-c.travelMinutes/k.maxTravelMinutes);
  const distanceScore=clamp(1-c.venueDistanceKm/k.maxVenueDistanceKm);
  const recoveryScore=clamp(c.recoveryHours/Math.max(1,k.minRecoveryHours*2));
  const tournamentScore=clamp(c.tournamentValue/100);
  const score=round((tournamentScore*.45+costScore*.25+travelScore*.15+distanceScore*.05+recoveryScore*.10)*100);
  return {...c,totalCost,score,feasible:violations.length===0,violations};
}
function compareCandidates(candidates,constraints){
  if(!Array.isArray(candidates)||candidates.length<2||candidates.length>3) throw new Error('Servono 2 o 3 alternative');
  const normalizedConstraints=normalizeConstraints(constraints);
  const evaluated=candidates.map((c)=>evaluateCandidate(c,normalizedConstraints));
  const feasible=evaluated.filter((x)=>x.feasible).sort((a,b)=>b.score-a.score||a.totalCost-b.totalCost||a.name.localeCompare(b.name));
  return {contract:'TOUR_MANAGER_PREVIEW_API_V1',status:feasible.length?'VERIFIED_PREVIEW':'NO_FEASIBLE_PLAN',recommended:feasible[0]||null,feasible,rejected:evaluated.filter((x)=>!x.feasible),usageUnits:1,bookingAuthority:false,liveInventory:false};
}
function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try{return res.status(200).json(compareCandidates(req.body?.candidates,req.body?.constraints));}
  catch(error){return res.status(400).json({error:'INVALID_TOUR_REQUEST',message:String(error?.message||error)});}
}
module.exports=handler;
module.exports.compareCandidates=compareCandidates;
module.exports.evaluateCandidate=evaluateCandidate;