/***** CONFIG *****/
const SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68';
const NEWS_SHEET = 'news';
const PAGE_SIZE  = 5;

/***** UTIL *****/
function include(name){
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/***** DATA LOAD *****/
function readNews_() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(NEWS_SHEET);
  const rows = sh.getDataRange().getValues();
  const header = rows.shift().map(h => String(h).trim().toLowerCase());

  const idx = {};
  ['id','date','title','summary','imageurl','body','tags','detailurl'].forEach(k=>{
    idx[k] = header.indexOf(k);
    if (idx[k] === -1 && k !== 'detailurl') throw new Error('헤더 누락: ' + k);
  });

  const data = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // id 생성(비었으면 1회 생성 후 시트 기록)
    let id = String(r[idx.id] || '').trim();
    if (!id) {
      id = Utilities.getUuid().slice(0, 8);
      sh.getRange(i + 2, idx.id + 1).setValue(id);
      r[idx.id] = id;
    }

    const dRaw = r[idx.date];
    const d = (dRaw instanceof Date) ? dRaw : new Date(dRaw);

    data.push({
      id,
      date: d,
      title: String(r[idx.title] || ''),
      summary: String(r[idx.summary] || ''),
      imageurl: String(r[idx.imageurl] || ''),
      body: String(r[idx.body] || ''),
      tags: String(r[idx.tags] || ''),
      detailurl: idx.detailurl >= 0 ? String(r[idx.detailurl] || '') : ''
    });
  }

  // 최신순 정렬
  data.sort((a,b) => b.date - a.date);

  // 표시용 날짜 + yearTag
  const tz = Session.getScriptTimeZone();
  data.forEach(d => {
    d.dateStr = Utilities.formatDate(d.date, tz, 'yyyy-MM-dd');
    d.yearTag = d.dateStr.substring(0,4);   // "2025-11-16" → "2025"
  });

  return data;
}

/***** ROUTER *****/
function doGet(e){
  const view = String(e && e.parameter && e.parameter.view || '').toLowerCase();

  // 1) 뉴스 리스트 (필터/페이지네이션은 클라이언트에서)
  if (view === '' || view === 'news') {
    const all = readNews_();
    const t = HtmlService.createTemplateFromFile('news_list');
    t.itemsJson = JSON.stringify(all);   // ← news_list.html 에서 사용하는 변수
    t.pageSize  = PAGE_SIZE;
    return t.evaluate()
      .setTitle('News')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 2) 홈 슬라이더
  if (view === 'home') {
    const t = HtmlService.createTemplateFromFile('homeNews');
    t.baseUrl = ScriptApp.getService().getUrl();
    return t.evaluate()
      .setTitle('Home News')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 3) JSON API (홈 슬라이더용 — 항상 최신 5개만)
  if (view === 'api') {
    const data = readNews_().slice(0, 5).map(d => ({
      id: d.id,
      title: d.title,
      date: d.dateStr,
      imageurl: d.imageurl
    }));
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 기본: 리스트로 리다이렉트
  const url = ScriptApp.getService().getUrl() + '?view=news';
  return HtmlService.createHtmlOutput(
    '<script>top.location.replace(' + JSON.stringify(url) + ');</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
