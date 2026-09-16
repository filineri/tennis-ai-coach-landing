from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
js=(root/'assets'/'landing-experience.js').read_text(encoding='utf-8')
checks={
 'system_positioning':'Un sistema di intelligenza tennistica, non una singola AI.' in html,
 'lifecycle_language':'TennisAgents accompagna il tennis lifecycle' in html,
 'explorer':'EXPLORER · scopre' in html and 'Explorer non decide il piano' in html,
 'strategist':'STRATEGIST · decide' in html and 'Strategist non esplora tutto' in html,
 'living_graph':'id="ta-live-graph"' in html and 'knowledge-edge' in js,
 'quick_detailed_tracked':all(x in html for x in ['>QUICK<','>DETAILED<','>TRACKED<']),
 'app_asset_slots':html.count('data-asset-slot=') >= 7,
 'tracked_gesture':'gesture-finger' in html and 'track-gesture' in html,
 'real_match_proof':'id="real-match-proof"' in html and 'Finale Grand Slam 2026' in html,
 'real_match_model':'realMatch:[' in js and 'EXPLORER' in js and 'STRATEGIST' in js,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(f'{k}={"PASS" if v else "FAIL"}')
if failed: raise SystemExit('system story checks failed: '+', '.join(failed))
print('system_story_contract=PASS')
