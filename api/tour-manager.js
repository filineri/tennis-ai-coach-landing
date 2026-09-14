const clamp=(v)=>Math.max(0,Math.min(1,v));
const round=(v)=>Math.round(v*100)/100;
const clean=(v,max=120)=>String(v??'').trim().slice(0,max);
const CIRCUITS=Object.freeze({FITP:'FITP',TENNIS_EUROPE:'TENNIS_EUROPE',ITF_JUNIOR:'ITF_JUNIOR',ITF_PRO:'ITF_PRO'});
const LEVELS=Object.freeze({
  FITP:['FITP_OPEN','FITP_CATEGORY','FITP_JUNIOR','FITP_TPRA','FITP_TEAM'],
  TENNIS_EUROPE:['TE_U12_CAT1','TE_U12_CAT2','TE_U14_CAT3','TE_U14_CAT2','TE_U14_CAT1','TE_U14_SUPER','TE_U16_CAT3','TE_U16_CAT2','TE_U16_CAT1','TE_U16_SUPER'],
  ITF_JUNIOR:['J30','J60','J100','J200','J300','J500','JGS'],
  ITF_PRO:['M15','M25','W15','W35','W50','W75','W100'],
});
const strictNum=(value,label,{min=0,max=Number.POSITIVE_INFINITY}={})=>{
  const x=Number(value);
  if(!Number.isFinite(x)||x<min||x>max) throw new Error(`Valore non valido: ${label}`);
  return x;
};
const optionalNum=(value,label,range)=>value===undefined||value===null||value===''?null:strictNum(value,label,range);
function normalizePlayerProfile(raw={}){
  return {ageYears:optionalNum(raw.ageYears,'ageYears',{min:5,max:100}),fitpClassification:clean(raw.fitpClassification,24)};
}
function normalizeConstraints(raw={}){
  return {
    maxBudget:strictNum(raw.maxBudget,'maxBudget',{min:1}),
    maxTravelMinutes:strictNum(raw.maxTravelMinutes,'maxTravelMinutes',{min:1}),
    maxVenueDistanceKm:strictNum(raw.maxVenueDistanceKm,'maxVenueDistanceKm',{min:0.1}),
    minRecoveryHours:strictNum(raw.minRecoveryHours,'minRecoveryHours',{min:0}),
  };
}
function normalizeCandidate(raw={}){
  const name=clean(raw.name),circuit=clean(raw.circuit,32),level=clean(raw.level,32);
  if(!name) throw new Error('Nome alternativa mancante');
  if(!Object.values(CIRCUITS).includes(circuit)) throw new Error('Circuito non supportato');
  if(!LEVELS[circuit].includes(level)) throw new Error('Livello torneo non supportato');
  return {
    name,circuit,level,
    entryFee:strictNum(raw.entryFee,'entryFee'),travelCost:strictNum(raw.travelCost,'travelCost'),
    lodgingCost:strictNum(raw.lodgingCost,'lodgingCost'),practiceCost:strictNum(raw.practiceCost,'practiceCost'),
    travelMinutes:strictNum(raw.travelMinutes,'travelMinutes'),venueDistanceKm:strictNum(raw.venueDistanceKm,'venueDistanceKm'),
    recoveryHours:strictNum(raw.recoveryHours,'recoveryHours'),tournamentValue:strictNum(raw.tournamentValue,'tournamentValue',{min:0,max:100}),
  };
}
function eligibilityViolations(candidate,profile){
  const issues=[],age=profile.ageYears;
  if(candidate.circuit===CIRCUITS.TENNIS_EUROPE){
    if(age===null) issues.push('Età giocatore richiesta per Tennis Europe');
    else {
      const match=candidate.level.match(/TE_U(12|14|16)_/),maxAge=match?Number(match[1]):16;
      if(age<10||age>16||age>maxAge) issues.push(`Non eleggibile per Tennis Europe ${maxAge}&U`);
    }
  }
  if(candidate.circuit===CIRCUITS.ITF_JUNIOR){
    if(age===null) issues.push('Età giocatore richiesta per ITF Juniors');
    else if(age<13||age>18) issues.push('Non eleggibile per ITF World Tennis Tour Juniors');
  }
  return issues;
}
function evaluateCandidate(candidate={},constraints={},playerProfile={}){
  const c=normalizeCandidate(candidate),k=normalizeConstraints(constraints),profile=normalizePlayerProfile(playerProfile);
  const totalCost=round(c.entryFee+c.travelCost+c.lodgingCost+c.practiceCost);
  const violations=eligibilityViolations(c,profile);
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
function compareCandidates(candidates,constraints,playerProfile={}){
  if(!Array.isArray(candidates)||candidates.length<2||candidates.length>3) throw new Error('Servono 2 o 3 alternative');
  const profile=normalizePlayerProfile(playerProfile),normalizedConstraints=normalizeConstraints(constraints);
  const evaluated=candidates.map((candidate)=>evaluateCandidate(candidate,normalizedConstraints,profile));
  const feasible=evaluated.filter((item)=>item.feasible).sort((a,b)=>b.score-a.score||a.totalCost-b.totalCost||a.name.localeCompare(b.name));
  return {contract:'TOUR_MANAGER_PREVIEW_API_V2',supportedCircuits:Object.values(CIRCUITS),playerProfile:profile,status:feasible.length?'VERIFIED_PREVIEW':'NO_FEASIBLE_PLAN',recommended:feasible[0]||null,feasible,rejected:evaluated.filter((item)=>!item.feasible),usageUnits:1,bookingAuthority:false,liveInventory:false};
}
function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try{return res.status(200).json(compareCandidates(req.body?.candidates,req.body?.constraints,req.body?.playerProfile));}
  catch(error){return res.status(400).json({error:'INVALID_TOUR_REQUEST',message:String(error?.message||error)});}
}
module.exports=handler;
module.exports.compareCandidates=compareCandidates;
module.exports.evaluateCandidate=evaluateCandidate;
module.exports.CIRCUITS=CIRCUITS;
module.exports.LEVELS=LEVELS;