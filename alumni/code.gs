/***** CONFIG *****/
const ALUMNI_SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68'; // 스프레드시트 ID
const ALUMNI_SHEET_NAME = 'alumni';         // ← 탭 이름(원하는 이름으로 바꿔도 됨)
const PAGE_SIZE         = 10;               // 한 페이지에 10명

/***** UTIL *****/
const _v = s => (s == null ? '' : String(s).trim());
const _n = s => Number(s) || 0;

/***** DATA LOAD *****/
function _readAlumni_() {
  const sh = SpreadsheetApp.openById(ALUMNI_SHEET_ID).getSheetByName(ALUMNI_SHEET_NAME);
  const rows = sh.getDataRange().getValues();
  const header = rows.shift().map(h => _v(h).toLowerCase());

  // 허용 컬럼: name, degree, next, interest, year, topic (없어도 동작)
  const idx = {};
  ['name','degree','next','interest','year','topic'].forEach(k=>{
    idx[k] = header.indexOf(k);
  });

  const items = rows.map(r => ({
    name    : idx.name    >= 0 ? _v(r[idx.name])    : '',
    degree  : idx.degree  >= 0 ? _v(r[idx.degree])  : '',
    next    : idx.next    >= 0 ? _v(r[idx.next])    : '',
    interest: idx.interest>= 0 ? _v(r[idx.interest]): '',
    year    : idx.year    >= 0 ? _n(r[idx.year])    : '',
    topic   : idx.topic   >= 0 ? _v(r[idx.topic])   : '',
  })).filter(x => x.name);  // 이름 없는 행 제거

  // 정렬: year 내림차순 → name 가나다
  items.sort((a,b)=> (b.year||0)-(a.year||0) || a.name.localeCompare(b.name,'en'));

  return items;
}

/***** ROUTER *****/
function doGet(e){
  const page = Math.max(1, Number(e?.parameter?.page || 1));
  const all  = _readAlumni_();

  const total    = all.length;
  const start    = (page-1)*PAGE_SIZE;
  const slice    = all.slice(start, start + PAGE_SIZE);
  const pages    = Math.max(1, Math.ceil(total/PAGE_SIZE));
  const hasPrev  = page > 1;
  const hasNext  = page < pages;

  const t = HtmlService.createTemplateFromFile('alumni_index');
  t.model = {
    items   : slice,         // 현재 페이지 아이템
    page,
    pages,
    hasPrev,
    hasNext,
    pageSize: PAGE_SIZE,
    total,
  };

  return t.evaluate()
    .setTitle('Alumni')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
