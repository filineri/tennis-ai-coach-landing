(function(){
  "use strict";

  const cfg = window.__TA_ANALYTICS__ || {};
  const consentKey = "ta-analytics-consent";
  let active = false;
  let booting = false;

  function dntEnabled(){
    return cfg.respectDoNotTrack !== false && (navigator.doNotTrack === "1" || window.doNotTrack === "1");
  }

  function consentGranted(){
    if(cfg.consentRequired === false) return true;
    try{return localStorage.getItem(consentKey) === "granted";}catch(_){return false;}
  }

  function referrerHost(){
    if(!document.referrer) return "";
    try{return new URL(document.referrer).hostname;}catch(_){return "";}
  }

  function baseProps(){
    const url = new URL(window.location.href);
    return {
      path: url.pathname,
      language: document.documentElement.lang || "",
      theme: document.documentElement.dataset.theme || "default",
      environment: cfg.environment || "unknown",
      release: cfg.release || "unknown",
      referrer_host: referrerHost(),
      utm_source: url.searchParams.get("utm_source") || undefined,
      utm_medium: url.searchParams.get("utm_medium") || undefined,
      utm_campaign: url.searchParams.get("utm_campaign") || undefined
    };
  }

  function ensurePostHogStub(){
    if(window.posthog && window.posthog.__SV) return window.posthog;
    const ph = window.posthog = window.posthog || [];
    ph._i = ph._i || [];
    ph.init = ph.init || function(token, options, name){
      function stub(target, method){
        target[method] = function(){target.push([method].concat(Array.prototype.slice.call(arguments)));};
      }
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.crossOrigin = "anonymous";
      script.async = true;
      const apiHost = (options && options.api_host) || cfg.apiHost;
      script.src = apiHost.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
      const first = document.getElementsByTagName("script")[0];
      first.parentNode.insertBefore(script, first);
      const instance = name ? (ph[name] = []) : ph;
      ["capture","identify","reset","opt_in_capturing","opt_out_capturing","has_opted_in_capturing","has_opted_out_capturing","set_config"].forEach(m=>stub(instance,m));
      ph._i.push([token, options, name]);
    };
    ph.__SV = 1;
    return ph;
  }

  function capture(event, properties){
    if(!active || !window.posthog || typeof window.posthog.capture !== "function") return;
    window.posthog.capture(event, Object.assign(baseProps(), properties || {}));
  }

  function boot(){
    if(active || booting || !cfg.enabled || !cfg.projectKey || !cfg.apiHost) return;
    if(dntEnabled() || !consentGranted()) return;
    booting = true;
    const ph = ensurePostHogStub();
    ph.init(cfg.projectKey, {
      api_host: cfg.apiHost,
      defaults: cfg.defaults || "2026-05-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
      loaded: function(){
        active = true;
        booting = false;
        capture("landing_view", {page_type: window.location.pathname.startsWith("/demo/") ? "proof" : "landing"});
      }
    });
  }

  function setConsent(granted){
    try{localStorage.setItem(consentKey, granted ? "granted" : "denied");}catch(_){}
    if(granted){boot();return;}
    active = false;
    if(window.posthog && typeof window.posthog.opt_out_capturing === "function") window.posthog.opt_out_capturing();
  }

  function identify(stableUserId, properties){
    if(!active || !stableUserId || !window.posthog || typeof window.posthog.identify !== "function") return;
    window.posthog.identify(String(stableUserId), properties || {});
  }

  function reset(){
    if(window.posthog && typeof window.posthog.reset === "function") window.posthog.reset();
  }

  function locationFor(el){
    const section = el.closest("header[id],section[id],nav,footer");
    return section ? (section.id || section.tagName.toLowerCase()) : "unknown";
  }

  document.addEventListener("click", function(event){
    const el = event.target.closest("a,button");
    if(!el) return;

    if(el.dataset.track){
      capture("landing_cta_click", {
        cta: el.dataset.track,
        location: locationFor(el),
        href: el.getAttribute("href") || ""
      });
    }else if(el.matches('a[href^="/demo/"]')){
      capture("landing_proof_click", {
        location: locationFor(el),
        href: el.getAttribute("href") || ""
      });
    }

    if(el.dataset.lang){
      capture("landing_language_change", {language_selected: el.dataset.lang, location: locationFor(el)});
    }
    if(el.dataset.themeChoice){
      capture("landing_theme_change", {theme_selected: el.dataset.themeChoice, location: locationFor(el)});
    }
  }, {passive:true});

  window.TAAnalytics = Object.freeze({
    provider: "posthog",
    boot: boot,
    capture: capture,
    identify: identify,
    reset: reset,
    setConsent: setConsent,
    isActive: function(){return active;},
    consentStatus: function(){
      if(cfg.consentRequired === false) return "not-required";
      try{return localStorage.getItem(consentKey) || "unset";}catch(_){return "unset";}
    }
  });

  boot();
})();

// Support is operationally independent from analytics consent. The analytics
// bundle is already injected on Landing V3, so it is used only as a tiny,
// dependency-free loader for the support shell. Demo/proof pages keep their
// existing behavior and do not get another customer-support launcher.
(function(){
  "use strict";
  if(window.location.pathname.startsWith("/demo/")) return;
  function load(src, done){
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    if(done) script.addEventListener("load",done,{once:true});
    document.head.appendChild(script);
  }
  load("/assets/support-config.js",function(){load("/assets/support-hub.js");});
})();
