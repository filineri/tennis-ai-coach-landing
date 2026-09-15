export const CUSTOMER_CONTRACT='TENNISAGENTS_PLAYER_CLUB_INTELLIGENCE_V1';
export const EXPECTED_SCOUT_CONTRACT='SCOUT_PLAYER_INTELLIGENCE_UI_V1';
export const byId=(rows=[])=>new Map(rows.map(x=>[String(x.id),x]));
export function validateDashboard(data){
  if(data?.contract!==EXPECTED_SCOUT_CONTRACT)throw new Error('SCOUT_CONTRACT_MISMATCH');
  if(data?.authority!=='STRUCTURED_DATA_ONLY')throw new Error('STRUCTURED_AUTHORITY_REQUIRED');
  if(!data?.catalog||!data?.dossier)throw new Error('SCOUT_DASHBOARD_INCOMPLETE');
  return data;
}
export function drilldownModel(data){
  validateDashboard(data);const players=byId(data.catalog.players),clubs=byId(data.catalog.clubs),tournaments=byId(data.catalog.tournaments);
  return {
    player(id){const p=players.get(String(id));if(!p)return null;return {...p,club:clubs.get(String(p.clubId))||null};},
    club(id){const c=clubs.get(String(id));if(!c)return null;return {...c,players:(c.playerIds||[]).map(x=>players.get(String(x))).filter(Boolean)};},
    tournament(id){const t=tournaments.get(String(id));if(!t)return null;return {...t,players:(t.playerIds||[]).map(x=>players.get(String(x))).filter(Boolean),club:clubs.get(String(t.clubId))||null};}
  };
}
export function dashboardPath(playerId='',region='Emilia-Romagna'){
  const q=new URLSearchParams();if(playerId)q.set('playerId',playerId);if(region)q.set('region',region);return `/api/player-intelligence?${q}`;
}
