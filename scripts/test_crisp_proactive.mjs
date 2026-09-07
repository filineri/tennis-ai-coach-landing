import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "assets", "crisp-proactive.js"), "utf8");
const SESSION_KEY = "ta-crisp-proactive-opened-v1";

function makeHarness({mobile = false, visible = true, shown = false} = {}){
  let now = 1000;
  let nextTimerId = 1;
  const timers = new Map();
  const listeners = new Map();
  const crispHandlers = new Map();
  const storage = new Map(shown ? [[SESSION_KEY, "1"]] : []);
  const commands = [];
  const analytics = [];
  const document = {
    visibilityState: visible ? "visible" : "hidden",
    addEventListener(name, fn){listeners.set(name, fn);}
  };
  const crisp = {
    push(command){
      commands.push(command);
      if(command[0] === "on") crispHandlers.set(command[1], command[2]);
    }
  };
  const context = {
    window: null,
    document,
    navigator: {language: "it-IT"},
    Date: {now: () => now},
    setTimeout(fn, delay){
      const id = nextTimerId++;
      timers.set(id, {fn, due: now + delay});
      return id;
    },
    clearTimeout(id){timers.delete(id);}
  };
  context.window = {
    $crisp: crisp,
    sessionStorage: {
      getItem(key){return storage.has(key) ? storage.get(key) : null;},
      setItem(key, value){storage.set(key, String(value));}
    },
    matchMedia(){return {matches: mobile};},
    TAAnalytics: {
      capture(event, properties){analytics.push({event, properties});}
    }
  };

  vm.runInNewContext(source, context, {filename: "crisp-proactive.js"});

  function runDue(){
    while(true){
      const due = [...timers.entries()]
        .filter(([,timer]) => timer.due <= now)
        .sort((a,b) => a[1].due - b[1].due)[0];
      if(!due) return;
      timers.delete(due[0]);
      due[1].fn();
    }
  }
  return {
    commands,
    analytics,
    storage,
    fireCrisp(event){crispHandlers.get(event)?.();},
    setVisible(value){
      document.visibilityState = value ? "visible" : "hidden";
      listeners.get("visibilitychange")?.();
    },
    advance(ms){now += ms; runDue();},
    pendingTimers(){return timers.size;}
  };
}

function opens(commands){
  return commands.filter(command => command[0] === "do" && command[1] === "chat:open");
}

test("desktop opens CRISP after 25 seconds exactly once", () => {
  const h = makeHarness();
  h.advance(24999);
  assert.equal(opens(h.commands).length, 0);
  h.advance(1);
  assert.equal(opens(h.commands).length, 1);
  h.advance(60000);
  assert.equal(opens(h.commands).length, 1);
});
test("mobile waits 40 seconds", () => {
  const h = makeHarness({mobile: true});
  h.advance(39999);
  assert.equal(opens(h.commands).length, 0);
  h.advance(1);
  assert.equal(opens(h.commands).length, 1);
});

test("manual open cancels proactive open and remembers the session", () => {
  const h = makeHarness();
  h.advance(5000);
  h.fireCrisp("chat:opened");
  assert.equal(h.storage.get(SESSION_KEY), "1");
  assert.equal(h.pendingTimers(), 0);
  h.advance(60000);
  assert.equal(opens(h.commands).length, 0);
  assert.equal(h.analytics.some(x => x.event === "support_chat_open"), true);
});

test("hidden tab pauses the visible-time budget", () => {
  const h = makeHarness();
  h.advance(10000);
  h.setVisible(false);
  h.advance(60000);
  assert.equal(opens(h.commands).length, 0);
  h.setVisible(true);
  h.advance(14999);
  assert.equal(opens(h.commands).length, 0);
  h.advance(1);
  assert.equal(opens(h.commands).length, 1);
});
test("already-shown session never schedules proactive opening", () => {
  const h = makeHarness({shown: true});
  assert.equal(h.pendingTimers(), 0);
  h.advance(60000);
  assert.equal(opens(h.commands).length, 0);
});

test("proactive open attaches source context and analytics", () => {
  const h = makeHarness();
  h.advance(25000);
  assert.equal(
    h.commands.some(command => command[0] === "set" && command[1] === "session:data"),
    true,
  );
  assert.equal(h.analytics.some(x => x.event === "support_proactive_open"), true);
});

test("mobile telemetry preserves configured device and delay after a pause", () => {
  const h = makeHarness({mobile: true});
  h.advance(10000);
  h.setVisible(false);
  h.advance(50000);
  h.setVisible(true);
  h.advance(30000);
  const event = h.analytics.find(x => x.event === "support_proactive_open");
  assert.equal(event?.properties?.device, "mobile");
  assert.equal(event?.properties?.delay_ms, 40000);
});
