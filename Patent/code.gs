/*** Patents web app (text-only, divider, ‹ › pager) ***/

// ▶ 여기에 네 시트 ID 붙여넣기
const SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68';
// ▶ 탭 이름
const SHEET_NAME = 'patents';

function doGet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return HtmlService.createHtmlOutput('Sheet "patents" not found.');

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return HtmlService.createHtmlOutput('No data.');

  // header → index
  const head = values[0].map(h => String(h).trim().toLowerCase());
  const idx = {
    title:       head.indexOf('title'),
    inventors:   head.indexOf('inventors'),
    year:        head.indexOf('year'),
    number:      head.indexOf('number'),
    description: head.indexOf('description'),
  };

  const rows = values.slice(1).map(r => ({
    title:       idx.title       >= 0 ? r[idx.title]       : '',
    inventors:   idx.inventors   >= 0 ? r[idx.inventors]   : '',
    year:        idx.year        >= 0 ? (Number(r[idx.year]) || '') : '',
    number:      idx.number      >= 0 ? r[idx.number]      : '',
    description: idx.description >= 0 ? r[idx.description] : '',
  })).filter(x => x.title);

  // 최신순(연도 desc) 정렬
  rows.sort((a,b)=> (b.year||0)-(a.year||0) || String(a.title).localeCompare(String(b.title)));

  const t = HtmlService.createTemplateFromFile('index'); // 아래에서 만들 index.html
  t.itemsJson = JSON.stringify(rows);
  return t.evaluate()
          .setTitle('Patents')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Sites 임베드 허용
}
