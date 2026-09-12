const CURRENT=process.env.LANDING_CURRENT_URL||'https://tennisagents-landing.pages.dev';
const CANDIDATE=process.env.LANDING_CANDIDATE_URL;
if(!CANDIDATE) throw new Error('LANDING_CANDIDATE_URL is required');

module.exports={
  id:'tennisagents_landing_review',
  viewports:[
    {label:'mobile',width:390,height:844},
    {label:'tablet',width:768,height:1024},
    {label:'desktop',width:1440,height:1100},
    {label:'wide',width:1920,height:1080}
  ],
  scenarios:[
    {
      label:'Landing homepage',
      url:CANDIDATE,
      referenceUrl:CURRENT,
      delay:1200,
      readySelector:'body',
      selectors:['document'],
      misMatchThreshold:0.1,
      requireSameDimensions:false
    }
  ],
  paths:{
    bitmaps_reference:'visual-review/backstop_data/bitmaps_reference',
    bitmaps_test:'visual-review/backstop_data/bitmaps_test',
    engine_scripts:'visual-review/backstop_data/engine_scripts',
    html_report:'visual-review/backstop_data/html_report',
    json_report:'visual-review/backstop_data/json_report',
    ci_report:'visual-review/backstop_data/ci_report'
  },
  report:['CI','json'],
  engine:'playwright',
  engineOptions:{browser:'chromium',args:['--no-sandbox']},
  asyncCaptureLimit:2,
  asyncCompareLimit:20,
  debug:false,
  debugWindow:false,
  archiveReport:true,
  scenarioLogsInReports:true
};
