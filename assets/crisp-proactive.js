(function(){
  "use strict";

  const SESSION_KEY = "ta-crisp-proactive-opened-v1";
  const DESKTOP_DELAY_MS = 25000;
  const MOBILE_DELAY_MS = 40000;
  const MOBILE_QUERY = "(max-width: 720px), (pointer: coarse)";

  window.$crisp = window.$crisp || [];

  let timer = null;
  let startedAt = 0;
  let stopped = false;
  let proactiveRequested = false;
  const isMobile = Boolean(window.matchMedia && window.matchMedia(MOBILE_QUERY).matches);
  const configuredDelayMs = isMobile ? MOBILE_DELAY_MS : DESKTOP_DELAY_MS;
  let remainingMs = configuredDelayMs;

  function hasShown(){
    try{return window.sessionStorage.getItem(SESSION_KEY) === "1";}catch(_){return false;}
  }

  function markShown(){
    try{window.sessionStorage.setItem(SESSION_KEY, "1");}catch(_){}
  }

  function clearScheduled(){
    if(timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function stopAndRemember(){
    stopped = true;
    clearScheduled();
    markShown();
  }

  function pauseVisibleTimer(){
    if(timer === null) return;
    remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
    clearScheduled();
  }

  function openProactively(){
    timer = null;
    if(stopped || hasShown() || document.visibilityState !== "visible") return;
    stopped = true;
    proactiveRequested = true;
    window.$crisp.push(["set", "session:data", [[
      ["support_entry", "landing_proactive"]
    ]]]);
    window.$crisp.push(["do", "chat:open"]);

    if(window.TAAnalytics && typeof window.TAAnalytics.capture === "function"){
      window.TAAnalytics.capture("support_proactive_open", {
        delay_ms: configuredDelayMs,
        device: isMobile ? "mobile" : "desktop"
      });
    }
  }

  function schedule(){
    if(stopped || hasShown() || timer !== null || document.visibilityState !== "visible") return;
    startedAt = Date.now();
    timer = setTimeout(openProactively, Math.max(0, remainingMs));
  }

  window.$crisp.push(["on", "chat:opened", function(){
    stopAndRemember();
    if(!proactiveRequested && window.TAAnalytics && typeof window.TAAnalytics.capture === "function"){
      window.TAAnalytics.capture("support_chat_open", {source: "manual"});
    }
  }]);
  window.$crisp.push(["on", "message:sent", stopAndRemember]);

  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "visible") schedule();
    else pauseVisibleTimer();
  });

  schedule();
})();
