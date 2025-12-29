/***** CONFIG *****/
const SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68';  // 예: 1AbC...xyz
const SHEET_NAME = 'funding';

/***** DATA LOADER *****/
function readFunding_() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sh.getDataRange().getValues();
  const header = rows.shift().map(h => String(h).trim().toLowerCase());

  const idx = {};
  ['status','title','agency','start','end'].forEach(k=>{
    idx[k] = header.indexOf(k);
    if (idx[k] === -1) throw new Error(`헤더 누락: ${k}`);
  });

  const parse = v => (v==null?'':String(v).trim());

  const items = rows
    .map(r => ({
      status: parse(r[idx.status]).toLowerCase(),
      title : parse(r[idx.title]),
      agency: parse(r[idx.agency]),
      start : parse(r[idx.start]),
      end   : parse(r[idx.end]),
    }))
    .filter(x => x.title);

  // status 비었으면 end 기준으로 자동 추정(옵션)
  const todayKey = new Date().toISOString().slice(0,7).replace('-','.');
  items.forEach(x=>{
    if (!x.status) x.status = (x.end && x.end >= todayKey) ? 'now' : 'past';
    x.period = [x.agency, '·', `${x.start} – ${x.end}`].filter(Boolean).join(' ');
  });

  return {
    now : items.filter(x=>x.status==='now'),
    past: items.filter(x=>x.status==='past'),
    total: items.length
  };
}

/***** ROUTER: ?mode=json → JSON, 그 외 → HTML *****/
function doGet(e) {
  const mode = (e.parameter.mode || 'html').toLowerCase();

  if (mode === 'json') {
    return ContentService
      .createTextOutput(JSON.stringify(readFunding_()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const t = HtmlService.createTemplateFromFile('index'); // index.html
  t.apiBase = ScriptApp.getService().getUrl();           // 웹앱 자기 URL 주입
  return t.evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // URL 임베드 허용
}
