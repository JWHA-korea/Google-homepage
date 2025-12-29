/*** Code.gs — Publications 리스트 웹앱 ***/

// 시트 ID / 탭 이름 / 페이지 크기
const SHEET_ID   = '1y2TMEbFd3GaVhE2nyFmuKejg4-iF7Q8PeRAJIIT4u68';
const SHEET_NAME = 'pubs';
const PAGE_SIZE  = 10;

// (옵션) 우리 연구실 사람들 이름 — 필요 없으면 []로 두면 됨
const LAB_MEMBERS = [
  'Kyung Do Kim',
  'Ji-Hun Hwang',
  'Jiheon Han',
  'Jae Eun Jo',
  'Amen Seo',
  'Soyeon Park',
  'Ji Wook Ha',
  'Na kyeon Lee',
  'Hyeon Do Lim',
  'Jaehwan Kim',
  'Jiyong Song',
  // 필요하면 더 추가
];

// HTML 이스케이프 (서버쪽용)
function escapeHtml_(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":"&#39;"
    })[m];
  });
}

// RichTextValue → HTML(<strong>, <em>) 로 변환
function richToHtml_(rt) {
  if (!rt) return '';
  try {
    const runs = rt.getRuns();
    if (!runs || !runs.length) {
      return escapeHtml_(rt.getText());
    }
    return runs.map(run => {
      const t = escapeHtml_(run.getText());
      const style = run.getTextStyle();
      let open = '', close = '';
      if (style.isBold())   { open += '<strong>'; close = '</strong>' + close; }
      if (style.isItalic()) { open += '<em>';     close = '</em>'     + close; }
      return open + t + close;
    }).join('');
  } catch (e) {
    // 문제가 나면 그냥 텍스트만
    return escapeHtml_(rt.getText());
  }
}

// 저자 문자열에서 LAB_MEMBERS 이름만 자동 굵게 처리
function highlightLabAuthors_(html) {
  if (!html) return '';
  LAB_MEMBERS.forEach(name => {
    if (!name) return;
    const pattern = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 정규식 이스케이프
    const re = new RegExp(pattern, 'g');
    html = html.replace(
      re,
      '<span class="lab-author">' + escapeHtml_(name) + '</span>'
    );
  });
  return html;
}

function doGet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    return HtmlService.createHtmlOutput('Sheet "' + SHEET_NAME + '" not found.');
  }

  const range  = sh.getDataRange();
  const values = range.getValues();
  const rich   = range.getRichTextValues();

  if (values.length < 2) {
    return HtmlService.createHtmlOutput('No data.');
  }

  // 헤더 파싱 (소문자)
  const head = values[0].map(h => String(h).trim().toLowerCase());
  const idx = {
    title:   head.indexOf('title'),
    authors: head.indexOf('authors'),
    year:    head.indexOf('year'),
    journal: head.indexOf('journal'),
    link:    head.indexOf('link'),
    tags:    head.indexOf('tags')
  };

  // 본문 → 객체 배열
  const rows = values.slice(1).map((r, i) => {
    const rr = rich[i + 1] || [];  // 같은 행의 RichText

    const titleRich   = idx.title   >= 0 ? rr[idx.title]   : null;
    const authorsRich = idx.authors >= 0 ? rr[idx.authors] : null;

    const titlePlain   = idx.title   >= 0 ? r[idx.title]   : '';
    const authorsPlain = idx.authors >= 0 ? r[idx.authors] : '';

    const titleHtmlRaw   = titleRich   ? richToHtml_(titleRich)   : escapeHtml_(titlePlain);
    let   authorsHtmlRaw = authorsRich ? richToHtml_(authorsRich) : escapeHtml_(authorsPlain);

    // 연구실 사람 이름 자동 강조
    authorsHtmlRaw = highlightLabAuthors_(authorsHtmlRaw);

    return {
      i,
      // plain text
      title:   titlePlain,
      authors: authorsPlain,
      year:    idx.year    >= 0 ? String(r[idx.year] || '').trim() : '',
      journal: idx.journal >= 0 ? r[idx.journal] : '',
      link:    idx.link    >= 0 ? r[idx.link]    : '',
      tags:    idx.tags    >= 0 ? r[idx.tags]    : '',
      // html 버전 (Bold / Italic / lab-author 반영)
      titleHtml:   titleHtmlRaw,
      authorsHtml: authorsHtmlRaw
    };
  }).filter(x => x.title);

  // 정렬: year(문자열) 내림차순 → title 가나다
  rows.sort((a, b) => {
    const ay = String(a.year || '');
    const by = String(b.year || '');
    if (ay && by && ay !== by) {
      return by.localeCompare(ay); // 내림차순
    }
    return String(a.title).localeCompare(String(b.title));
  });

  const t = HtmlService.createTemplateFromFile('index');
  t.itemsJson = JSON.stringify(rows);
  t.pageSize  = PAGE_SIZE;

  return t.evaluate()
          .setTitle('Publications')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
