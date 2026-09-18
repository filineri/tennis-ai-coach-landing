const PUBLIC_NAMED_PLAYER_ENABLED=false;
const $=q=>document.querySelector(q);

function showPublicGate(){
  $('#status').innerHTML='<span class="warning"><b>Profili nominativi non pubblicati in questa Preview.</b> Usa Junior & Club per club aggregati e benchmark de-identificati. La vista nominativa completa resta Founder/internal.</span>';
  $('#detailTitle').textContent='Privacy-first public preview';
  $('#detailBody').innerHTML='<p class="muted">La ricerca nominativa e i dossier individuali sono disabilitati sul canale pubblico durante la validazione LIA/DPIA. I dati interni non vengono inviati al browser.</p>';
  $('#metrics').innerHTML='';
  $('#entities').innerHTML='<div class="muted">Nessun catalogo nominativo caricato.</div>';
  $('#matches').innerHTML='';
  for(const id of ['search','region','entityType','refresh']){const el=$('#'+id);if(el)el.disabled=true;}
  for(const id of ['rankingChart','formChart','network']){
    const el=$('#'+id);
    if(el)el.innerHTML='<div class="muted" style="padding:14px">Disponibile solo nella vista autorizzata.</div>';
  }
  const table=$('#intelTable');
  if(table)table.innerHTML='<div class="muted" style="padding:14px">La tabella nominativa non viene caricata sul canale pubblico.</div>';
}

function load(){
  if(!PUBLIC_NAMED_PLAYER_ENABLED)return showPublicGate();
}

load();
