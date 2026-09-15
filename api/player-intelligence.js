const cleanOrigin=(value)=>String(value||'').trim().replace(/\/$/,'');
const allowed=(value,max=120)=>String(value||'').trim().slice(0,max);
async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const origin=cleanOrigin(process.env.SCOUT_PLAYER_INTELLIGENCE_ORIGIN);
  if(!origin)return res.status(503).json({error:'SCOUT_PLAYER_INTELLIGENCE_ORIGIN_UNAVAILABLE'});
  const playerId=allowed(req.query?.playerId),region=allowed(req.query?.region)||'Emilia-Romagna';
  const q=new URLSearchParams({region});if(playerId)q.set('playerId',playerId);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const upstream=await fetch(`${origin}/player-intelligence/dashboard?${q}`,{headers:{accept:'application/json'},signal:controller.signal});
    const text=await upstream.text();res.status(upstream.status);res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');return res.send(text);
  }catch(error){
    return res.status(502).json({error:'SCOUT_PLAYER_INTELLIGENCE_UPSTREAM_FAILED',message:String(error?.name==='AbortError'?'UPSTREAM_TIMEOUT':error?.message||error)});
  }finally{clearTimeout(timer);}
}
module.exports=handler;
module.exports.cleanOrigin=cleanOrigin;
