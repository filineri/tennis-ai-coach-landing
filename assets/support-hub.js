(function(){
  "use strict";

  const cfg = window.__TA_SUPPORT__ || {};
  const recentKey = "ta-support-recent-v1";
  const rootId = "ta-support-panel";
  let lastTrigger = null;
  let currentView = "home";
  let crispReady = false;
  let mounted = false;

  const copy = {
    it: {
      launcher: "Apri supporto TennisAgents",
      title: "Serve aiuto?",
      subtitle: "Come possiamo aiutarti?",
      recent: "Messaggio recente",
      recentEmpty: "Nessun messaggio recente su questo dispositivo.",
      status: "Stato supporto",
      statusReady: "Messaggistica disponibile",
      statusWaiting: "Verifica canale in corso…",
      statusUnavailable: "Stato non disponibile",
      faq: "FAQ TennisAgents",
      faqSub: "Risposte rapide alle domande più comuni",
      send: "Invia un messaggio",
      sendSub: "Continua nella stessa conversazione CRISP",
      search: "Cerca aiuto",
      searchPlaceholder: "Cerca nelle FAQ…",
      noResults: "Nessun risultato. Puoi inviarci un messaggio.",
      home: "Home",
      messages: "Messaggi",
      help: "Aiuto",
      privacy: "Le conversazioni possono essere analizzate da TennisAgents per migliorare Support Agent, KB e Workforce secondo le regole di privacy e retention applicabili.",
      close: "Chiudi supporto"
    },
    en: {
      launcher: "Open TennisAgents support",
      title: "Need support?",
      subtitle: "How can we help?",
      recent: "Recent message",
      recentEmpty: "No recent message on this device.",
      status: "Support status",
      statusReady: "Messaging available",
      statusWaiting: "Checking support channel…",
      statusUnavailable: "Status unavailable",
      faq: "TennisAgents FAQ",
      faqSub: "Quick answers to common questions",
      send: "Send us a message",
      sendSub: "Continue in the same CRISP conversation",
      search: "Search for help",
      searchPlaceholder: "Search the FAQ…",
      noResults: "No result. You can send us a message.",
      home: "Home",
      messages: "Messages",
      help: "Help",
      privacy: "Conversations may be analyzed by TennisAgents to improve the Support Agent, knowledge base and Workforce under the applicable privacy and retention rules.",
      close: "Close support"
    }
  };

  function lang(){return document.documentElement.lang === "en" ? "en" : "it";}
  function t(key){return copy[lang()][key] || copy.it[key] || key;}
  function analytics(event, properties){
    try{
      if(window.TAAnalytics && typeof window.TAAnalytics.capture === "function"){
        window.TAAnalytics.capture(event, Object.assign({surface:"landing",support_provider:"crisp-free"}, properties || {}));
      }
    }catch(_){}
  }
  function crisp(command){
    window.$crisp = window.$crisp || [];
    window.$crisp.push(command);
  }
  function escapeHtml(value){
    return String(value || "").replace(/[&<>'"]/g, function(ch){return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[ch];});
  }
  function compactText(value){return String(value || "").replace(/\s+/g," ").trim();}

  function rememberMessage(message, direction){
    try{
      const text = compactText(message && (message.content || message.text || message.message || ""));
      if(!text) return;
      localStorage.setItem(recentKey, JSON.stringify({text:text.slice(0,180),direction:direction || "message",at:Date.now()}));
      renderRecent();
    }catch(_){}
  }
  function recentMessage(){
    try{
      const raw = localStorage.getItem(recentKey);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.text ? parsed : null;
    }catch(_){return null;}
  }

  function localFaqs(){
    return Array.from(document.querySelectorAll("#faq details")).map(function(details){
      const summary = compactText(details.querySelector("summary") && details.querySelector("summary").textContent);
      const body = compactText(details.querySelector("p") && details.querySelector("p").textContent);
      return {title:summary,summary:body,source:"landing-faq"};
    }).filter(function(item){return item.title;});
  }

  async function remoteKnowledge(query){
    if(!cfg.knowledgeSearchUrl || !query) return [];
    try{
      const url = new URL(cfg.knowledgeSearchUrl, window.location.origin);
      url.searchParams.set("q", query);
      url.searchParams.set("surface", "landing-support");
      const response = await fetch(url.toString(), {headers:{accept:"application/json"},credentials:"omit"});
      if(!response.ok) return [];
      const payload = await response.json();
      const rows = Array.isArray(payload.results) ? payload.results : [];
      return rows.slice(0,5).map(function(row){
        return {title:compactText(row.title || row.key || ""),summary:compactText(row.summary || row.snippet || ""),source:"compiled-kb"};
      }).filter(function(item){return item.title;});
    }catch(_){return [];}
  }

  async function renderSearch(query){
    const results = document.getElementById("ta-support-results");
    if(!results) return;
    const q = compactText(query).toLowerCase();
    const local = localFaqs().filter(function(item){return !q || (item.title + " " + item.summary).toLowerCase().includes(q);}).slice(0,5);
    let rows = local;
    if(q.length >= 3){
      const remote = await remoteKnowledge(q);
      const seen = new Set(local.map(function(item){return item.title.toLowerCase();}));
      rows = local.concat(remote.filter(function(item){const key=item.title.toLowerCase();if(seen.has(key)) return false;seen.add(key);return true;})).slice(0,7);
    }
    if(!rows.length){results.innerHTML='<div class="ta-support-empty">'+escapeHtml(t("noResults"))+'</div>';return;}
    results.innerHTML = rows.map(function(item){
      return '<button type="button" class="ta-support-result" data-support-result-source="'+escapeHtml(item.source)+'"><strong>'+escapeHtml(item.title)+'</strong><span>'+escapeHtml(item.summary)+'</span></button>';
    }).join("");
    results.querySelectorAll(".ta-support-result").forEach(function(button){
      button.addEventListener("click", function(){
        analytics("support_help_result_open", {source:button.dataset.supportResultSource || "unknown",query:q});
      });
    });
  }

  function renderRecent(){
    const target = document.getElementById("ta-support-recent-copy");
    if(!target) return;
    const recent = recentMessage();
    if(!recent){target.textContent=t("recentEmpty");return;}
    target.textContent=recent.text;
  }

  async function refreshStatus(){
    const label = document.getElementById("ta-support-status-copy");
    const dot = document.getElementById("ta-support-status-dot");
    if(!label || !dot) return;
    label.textContent=t("statusWaiting");dot.className="ta-support-status-dot warn";
    if(cfg.statusUrl){
      try{
        const response = await fetch(cfg.statusUrl,{headers:{accept:"application/json"},credentials:"omit",cache:"no-store"});
        if(response.ok){
          const payload=await response.json();
          const status=String(payload.status || payload.state || "").toLowerCase();
          if(["ok","operational","healthy","pass","up"].includes(status)){
            label.textContent=payload.message || t("statusReady");dot.className="ta-support-status-dot ok";return;
          }
          label.textContent=payload.message || t("statusUnavailable");dot.className="ta-support-status-dot warn";return;
        }
      }catch(_){}
    }
    if(crispReady || window.CRISP_WEBSITE_ID){label.textContent=t("statusReady");dot.className="ta-support-status-dot ok";}
    else{label.textContent=t("statusUnavailable");dot.className="ta-support-status-dot warn";}
  }

  function hideNativeCrisp(){try{crisp(["do","chat:hide"]);}catch(_){} }
  function restoreLauncher(){const launcher=document.getElementById("ta-support-launcher");if(launcher) launcher.hidden=false;}
  function openCrisp(source){
    closePanel(false);
    const launcher=document.getElementById("ta-support-launcher");if(launcher) launcher.hidden=true;
    crisp(["config","locale",[lang()]]);
    crisp(["do","chat:show"]);
    crisp(["do","chat:open"]);
    analytics("support_message_open", {source:source || "unknown"});
  }

  function setView(view){
    if(view === "messages"){openCrisp("messages-tab");return;}
    currentView=view === "help" ? "help" : "home";
    document.querySelectorAll(".ta-support-view").forEach(function(node){node.dataset.active=String(node.dataset.supportView===currentView);});
    document.querySelectorAll(".ta-support-tab").forEach(function(node){node.dataset.active=String(node.dataset.supportTab===currentView);});
    if(currentView === "help"){
      const input=document.getElementById("ta-support-search");
      renderSearch(input ? input.value : "");
      setTimeout(function(){if(input) input.focus();},0);
    }
  }

  function openPanel(trigger){
    const panel=document.getElementById(rootId);if(!panel) return;
    lastTrigger=trigger || document.activeElement;
    panel.dataset.open="true";
    panel.setAttribute("aria-hidden","false");
    renderLanguage();renderRecent();refreshStatus();setView(currentView);
    analytics("support_hub_open", {view:currentView});
    const close=document.querySelector(".ta-support-close");if(close) close.focus();
  }
  function closePanel(returnFocus){
    const panel=document.getElementById(rootId);if(!panel) return;
    panel.dataset.open="false";panel.setAttribute("aria-hidden","true");
    if(returnFocus !== false && lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }

  function renderLanguage(){
    const panel=document.getElementById(rootId);if(!panel) return;
    panel.querySelector(".ta-support-head h2").textContent=t("title");
    panel.querySelector(".ta-support-head p").textContent=t("subtitle");
    panel.querySelector(".ta-support-close").setAttribute("aria-label",t("close"));
    document.getElementById("ta-support-recent-title").textContent=t("recent");
    document.getElementById("ta-support-status-title").textContent=t("status");
    document.getElementById("ta-support-faq-title").textContent=t("faq");
    document.getElementById("ta-support-faq-copy").textContent=t("faqSub");
    document.getElementById("ta-support-send-title").textContent=t("send");
    document.getElementById("ta-support-send-copy").textContent=t("sendSub");
    document.getElementById("ta-support-search-title").textContent=t("search");
    document.getElementById("ta-support-search").placeholder=t("searchPlaceholder");
    document.getElementById("ta-support-note").textContent=t("privacy");
    document.querySelector('[data-support-tab="home"] b').textContent=t("home");
    document.querySelector('[data-support-tab="messages"] b').textContent=t("messages");
    document.querySelector('[data-support-tab="help"] b').textContent=t("help");
    const launcher=document.getElementById("ta-support-launcher");if(launcher) launcher.setAttribute("aria-label",t("launcher"));
  }

  function mount(){
    if(mounted || document.getElementById(rootId)) return;
    mounted=true;
    const css=document.createElement("link");css.rel="stylesheet";css.href="/assets/support-hub.css";css.dataset.taSupport="styles";document.head.appendChild(css);
    const launcher=document.createElement("button");
    launcher.type="button";launcher.id="ta-support-launcher";launcher.setAttribute("aria-haspopup","dialog");
    launcher.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.5 5.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"/></svg>';
    const panel=document.createElement("section");panel.id=rootId;panel.dataset.open="false";panel.setAttribute("aria-hidden","true");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","false");panel.setAttribute("aria-labelledby","ta-support-title");
    panel.innerHTML='<header class="ta-support-head"><div class="ta-support-brand"><span class="ta-support-mark">TA</span>TennisAgents Support</div><button type="button" class="ta-support-close">×</button><h2 id="ta-support-title"></h2><p></p></header><div class="ta-support-body"><div class="ta-support-view" data-support-view="home" data-active="true"><div class="ta-support-stack"><div class="ta-support-card"><div class="ta-support-card-row"><div class="ta-support-card-icon">💬</div><div class="ta-support-card-copy"><strong id="ta-support-recent-title"></strong><small id="ta-support-recent-copy"></small></div></div></div><div class="ta-support-card"><div class="ta-support-card-row"><div class="ta-support-card-icon">◉</div><div class="ta-support-card-copy"><strong id="ta-support-status-title"></strong><small><span id="ta-support-status-dot" class="ta-support-status-dot warn"></span><span id="ta-support-status-copy"></span></small></div></div></div><div class="ta-support-card"><button class="ta-support-action" type="button" id="ta-support-open-help"><div class="ta-support-card-row"><div class="ta-support-card-icon">?</div><div class="ta-support-card-copy"><strong id="ta-support-faq-title"></strong><small id="ta-support-faq-copy"></small></div><span class="ta-support-chevron">›</span></div></button></div><div class="ta-support-card"><button class="ta-support-action" type="button" id="ta-support-send"><div class="ta-support-card-row"><div class="ta-support-card-icon">➤</div><div class="ta-support-card-copy"><strong id="ta-support-send-title"></strong><small id="ta-support-send-copy"></small></div><span class="ta-support-chevron">›</span></div></button></div></div></div><div class="ta-support-view" data-support-view="help" data-active="false"><strong id="ta-support-search-title" style="display:block;margin:2px 2px 9px"></strong><input id="ta-support-search" class="ta-support-search" type="search" autocomplete="off"><div id="ta-support-results" class="ta-support-results"></div><div id="ta-support-note" class="ta-support-note"></div></div></div><nav class="ta-support-tabs" aria-label="Support"><button type="button" class="ta-support-tab" data-support-tab="home" data-active="true"><span>⌂</span><b></b></button><button type="button" class="ta-support-tab" data-support-tab="messages" data-active="false"><span>▣</span><b></b></button><button type="button" class="ta-support-tab" data-support-tab="help" data-active="false"><span>?</span><b></b></button></nav>';
    document.body.appendChild(launcher);document.body.appendChild(panel);
    launcher.addEventListener("click",function(){openPanel(launcher);});
    panel.querySelector(".ta-support-close").addEventListener("click",function(){closePanel(true);});
    document.getElementById("ta-support-open-help").addEventListener("click",function(){setView("help");analytics("support_help_open",{source:"home-card"});});
    document.getElementById("ta-support-send").addEventListener("click",function(){openCrisp("home-send");});
    panel.querySelectorAll(".ta-support-tab").forEach(function(button){button.addEventListener("click",function(){setView(button.dataset.supportTab);});});
    const search=document.getElementById("ta-support-search");let timer=null;search.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(function(){renderSearch(search.value);analytics("support_help_search",{query_length:compactText(search.value).length});},120);});
    document.addEventListener("keydown",function(event){if(event.key === "Escape" && panel.dataset.open === "true") closePanel(true);});
    renderLanguage();renderRecent();refreshStatus();

    crisp(["on","session:loaded",function(){crispReady=true;refreshStatus();}]);
    crisp(["on","message:received",function(message){rememberMessage(message,"received");}]);
    crisp(["on","message:sent",function(message){rememberMessage(message,"sent");}]);
    crisp(["on","chat:closed",function(){hideNativeCrisp();restoreLauncher();}]);
    crisp(["on","chat:opened",function(){const button=document.getElementById("ta-support-launcher");if(button) button.hidden=true;}]);

    // Only hide CRISP's default launcher after our replacement is fully mounted.
    hideNativeCrisp();
    const langObserver=new MutationObserver(function(){renderLanguage();renderRecent();refreshStatus();});
    langObserver.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  }

  function whenReady(){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
    else mount();
  }

  window.TennisAgentsSupport = Object.freeze({
    provider:"crisp-free",
    open:function(){openPanel(document.activeElement);},
    openMessages:function(){openCrisp("api");},
    openHelp:function(){openPanel(document.activeElement);setView("help");},
    close:function(){closePanel(true);},
    status:function(){return {mounted:mounted,crispReady:crispReady,provider:"crisp-free"};}
  });

  whenReady();
})();
