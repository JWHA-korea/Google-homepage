/***** CONFIG *****/
const SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68'; // 스프레드시트 ID
const SHEET_NAME = 'member';

/***** 섹션 표시 순서 (원하는 대로 수정) *****/
// 👉 요구대로 Ph.D.가 M.S.보다 위로 오게 설정
const SECTION_ORDER = [
  'Post Doc.',
  'Ph.D. Course',
  'M.S. Course',
  'Researcher',
  'Undergraduate internship', // ← 나중에 사용할 예정(지금은 주석)
];

/***** UTIL *****/
const v = s => (s == null ? '' : String(s).trim());
const n = s => Number(s) || 0;
const lower = s => String(s||'').toLowerCase();

/***** DATA LOAD *****/
function readPeople_() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sh.getDataRange().getValues();
  const header = rows.shift().map(h => v(h).toLowerCase());

  const need = ['section','name','email','photo','interest'];
  const idx = {};
  need.forEach(k => {
    idx[k] = header.indexOf(k);
    if (idx[k] === -1) throw new Error('헤더 누락: ' + k);
  });

  const hasOrder  = header.indexOf('order');
  const hasActive = header.indexOf('active');

  const items = rows.map((r, i) => ({   // ← i가 엑셀의 데이터 행 인덱스(0부터 시작)
    row: i,                              // ← 엑셀 순서 유지용 키 추가
    section : v(r[idx.section]),
    name    : v(r[idx.name]),
    email   : v(r[idx.email]),
    photo   : v(r[idx.photo]),
    interest: v(r[idx.interest]),
    order   : hasOrder  >= 0 ? n(r[hasOrder]) : 0,
    active  : hasActive >= 0 ? v(r[hasActive]).toLowerCase() : 'yes',
  }))
  .filter(x => x.active !== 'no' && x.name);

  // group by section
  const map = new Map();
  items.forEach(p => {
    const key = p.section || 'Members';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  });

  // custom section rank
  const orderIndex = Object.fromEntries(SECTION_ORDER.map((t,i)=>[lower(t), i]));
  const getRank = title => {
    const k = lower(title);
    return (k in orderIndex) ? orderIndex[k] : 999; // 지정 없으면 뒤로
  };

  const sections = [...map.entries()].map(([title, people]) => ({
    title,
    people: people.sort((a,b)=> (a.order - b.order) || (a.row - b.row)),
  }))
  .sort((a,b)=> {
    const r = getRank(a.title) - getRank(b.title);
    return r !== 0 ? r : a.title.localeCompare(b.title, 'en');
  });

  return { sections, updatedAt: new Date().toISOString() };
}

/***** ROUTER *****/
function doGet(e){
  const mode = (e?.parameter?.mode || 'html').toLowerCase();
  if (mode === 'json') {
    return ContentService.createTextOutput(JSON.stringify(readPeople_()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const t = HtmlService.createTemplateFromFile('index');
  t.apiBase = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('People')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
