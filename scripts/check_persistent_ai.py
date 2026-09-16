from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
js=(root/'assets'/'landing-ai.js').read_text(encoding='utf-8')
checks={
 'native_section':'id="ask-tennisagents"' in html,
 'endpoint_config':'name="ta-customer-ai-endpoint"' in html,
 'session_storage':'ta-customer-ai-session-v1' in js,
 'safe_dom':'innerHTML' not in js and 'textContent' in js,
 'no_client_secret':all(x not in js for x in ['OPENAI_API_KEY','CUSTOMER_OPENHANDS_BRIDGE_TOKEN','FOUNDER_AI_BRIDGE_TOKEN','TA_API_TOKEN']),
 'bounded_payload':all(x in js for x in ['message','sessionRef','turnId','language','persona']),
 'reset':'ta-ai-reset' in html and 'localStorage.removeItem' in js,
 'personas':all(x in html for x in ['data-persona="player"','data-persona="coach"','data-persona="parent"']),
 'crisp_retained':'CRISP_WEBSITE_ID' in html,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(f'{k}={"PASS" if v else "FAIL"}')
if failed: raise SystemExit('persistent AI checks failed: '+', '.join(failed))
print('persistent_ai_contract=PASS')
