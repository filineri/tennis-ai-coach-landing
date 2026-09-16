(() => {
  const form = document.getElementById('ta-ai-form');
  if (!form) return;
  const input = document.getElementById('ta-ai-input');
  const transcript = document.getElementById('ta-ai-transcript');
  const state = document.getElementById('ta-ai-state');
  const meta = document.getElementById('ta-ai-meta');
  const reset = document.getElementById('ta-ai-reset');
  const prompts = [...document.querySelectorAll('.ai-prompt')];
  const endpointMeta = document.querySelector('meta[name="ta-customer-ai-endpoint"]');
  const endpoint = String(window.TA_CUSTOMER_AI_ENDPOINT || endpointMeta?.content || '').trim();
  const SESSION_KEY = 'ta-customer-ai-session-v1';
  let persona = '';
  let busy = false;

  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'it';
  const copy = (it, en) => lang() === 'en' ? en : it;
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `ta-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const sessionRef = () => {
    let value = localStorage.getItem(SESSION_KEY);
    if (!value || !/^[A-Za-z0-9_.:-]{8,120}$/.test(value)) {
      value = `landing-${uuid()}`.slice(0, 120);
      localStorage.setItem(SESSION_KEY, value);
    }
    return value;
  };
  const addMessage = (role, text) => {
    const el = document.createElement('div');
    el.className = `ai-message ${role}`;
    el.textContent = String(text || '');
    transcript.appendChild(el);
    transcript.scrollTop = transcript.scrollHeight;
    return el;
  };
  const setState = (text) => { state.textContent = text; };
  const setMeta = (text) => { meta.textContent = text; };
  const setBusy = (value) => {
    busy = value;
    input.disabled = value;
    form.querySelector('button[type="submit"]').disabled = value;
  };
  const welcome = () => {
    if (transcript.children.length) return;
    addMessage('assistant', copy(
      'Raccontami cosa vuoi ottenere nel tuo tennis. Posso capire il contesto e coinvolgere lo specialista TennisAgents giusto.',
      'Tell me what you want to achieve in your tennis. I can understand the context and involve the right TennisAgents specialist.'
    ));
  };
  welcome();
  if (!endpoint) setState(copy('Preview AI non collegata', 'AI preview not connected'));
  else setState(copy('AI pronta', 'AI ready'));
  async function sendMessage(message) {
    if (busy) return;
    if (!endpoint) {
      addMessage('assistant', copy('La preview AI non è ancora collegata al runtime.', 'The AI preview is not connected to the runtime yet.'));
      return;
    }
    setBusy(true);
    addMessage('user', message);
    setState(copy('Il team sta ragionando...', 'The team is thinking...'));
    setMeta(copy('ChatGPT orchestra; dati, memoria ed evidenze restano governati da TennisAgents.', 'ChatGPT orchestrates; data, memory and evidence remain governed by TennisAgents.'));
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionRef: sessionRef(),
          turnId: `turn-${uuid()}`.slice(0, 120),
          language: lang(),
          persona: persona || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.reply) throw new Error(body?.error || `HTTP_${response.status}`);
      addMessage('assistant', body.reply);
      const specialist = body.domainAuthority || body.selectedAgent || '';
      setState(body.persistentConversation ? copy('Conversazione persistente', 'Persistent conversation') : copy('TennisAgents AI', 'TennisAgents AI'));
      setMeta(specialist
        ? `${copy('Autorità', 'Authority')}: ${specialist} · ${copy('memoria canonica', 'canonical memory')}: TennisAgents`
        : copy('ChatGPT orchestra la conversazione; TennisAgents resta l’autorità sui contenuti specialistici.', 'ChatGPT orchestrates the conversation; TennisAgents remains the authority for specialist content.'));
    } catch (error) {
      addMessage('assistant', copy('Non riesco a completare questa risposta adesso. Riprova tra poco.', 'I cannot complete this response right now. Please try again shortly.'));
      setState(copy('AI temporaneamente non disponibile', 'AI temporarily unavailable'));
      setMeta(String(error?.message || 'customer_ai_failed').slice(0, 120));
    } finally {
      setBusy(false);
      input.focus();
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = String(input.value || '').trim();
    if (!message) return;
    input.value = '';
    sendMessage(message);
  });
  prompts.forEach((button) => button.addEventListener('click', () => {
    persona = button.dataset.persona || '';
    input.value = button.textContent.replace(/^[^·]+·\s*/, '').trim();
    input.focus();
  }));
  reset.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    persona = '';
    transcript.textContent = '';
    welcome();
    setState(endpoint ? copy('Nuova conversazione pronta', 'New conversation ready') : copy('Preview AI non collegata', 'AI preview not connected'));
    setMeta(copy('Nuova sessione opaca creata al prossimo messaggio.', 'A new opaque session will be created with your next message.'));
  });
})();
