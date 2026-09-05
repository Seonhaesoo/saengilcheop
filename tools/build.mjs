/* 생일첩 정적 사이트 생성기
 *  /{y}/{mm}/{dd}/   날짜별 생일 페이지 (Y0 ~ 올해)
 *  /{y}/{mm}/        월별 출생 달력
 *  /{y}/             연도별 (띠·나이·학번)
 *  /md/{mm}-{dd}/    월일별 (별자리·탄생석·연도표)
 *  /ddi/{slug}/      12띠
 *  /zodiac/{slug}/   12별자리
 *  사용: node tools/build.mjs [--from 1990 --to 1995]  (범위 생략 시 1940 ~ 올해)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, kstToday, ROOT_DIR } from './engine.mjs';
import { ILJU, UN_LINE, SPOUSE_LINE } from '../data/ilju.mjs';
import { DDI, STEM_COLOR, STEM_COLOR_WORD, ZODIAC, BIRTHSTONE, pensionAge, zodiacOf } from '../data/meta.mjs';
import { buildHubs } from './hubs.mjs';

const { M, I, C, Lunar } = loadEngine();
const SITE = 'https://saengil.sajucheop.com';
const SAJU = 'https://sajucheop.com';
const OUT = path.join(ROOT_DIR, 'dist');
const SRC = path.join(ROOT_DIR, 'src');
const today = kstToday();
const argv = process.argv.slice(2);
const argOf = (k, dflt) => { const i = argv.indexOf(k); return i >= 0 ? +argv[i + 1] : dflt; };
const Y0 = argOf('--from', 1940);
const Y1 = argOf('--to', today.y);
const FULL = Y0 === 1940 && Y1 === today.y;
const BUILD_ISO = `${today.y}-${String(today.m).padStart(2, '0')}-${String(today.d).padStart(2, '0')}`;

const WD = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const fmt = (y, m, d) => `${y}년 ${m}월 ${d}일`;
const num = (n) => n.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dayUrl = (y, m, d) => `/${y}/${pad(m)}/${pad(d)}/`;
const monthUrl = (y, m) => `/${y}/${pad(m)}/`;
const yearUrl = (y) => `/${y}/`;
const mdUrl = (m, d) => `/md/${pad(m)}-${pad(d)}/`;

/* ---------- 달력 유틸 ---------- */
const dn = (y, m, d) => I.daysFromCivil(y, m, d);
const civ = (n) => I.civilFromDays(n);
const weekday = (y, m, d) => ((dn(y, m, d) + 4) % 7 + 7) % 7;
const isLeap = (y) => I.isLeap(y);
const dim = (y, m) => I.daysInMonth(y, m);
function addYears(y, m, d, n) {
  const yy = y + n;
  if (m === 2 && d === 29 && !isLeap(yy)) return { y: yy, m: 2, d: 28 };
  return { y: yy, m, d };
}
const addDays = (y, m, d, n) => civ(dn(y, m, d) + n);
const norm360 = (x) => ((x % 360) + 360) % 360;

function lunarOf(y, m, d) {
  if (!Lunar.setSolarDate(y, m, d)) return null;
  const l = Lunar.getLunarCalendar();
  return { y: l.year, m: l.month, d: l.day, leap: !!l.intercalation, son: l.day % 10 === 9 || l.day % 10 === 0 };
}
const lnyCache = {};
function lunarNewYear(y) {
  if (lnyCache[y]) return lnyCache[y];
  Lunar.setLunarDate(y, 1, 1, false);
  const s = Lunar.getSolarCalendar();
  return (lnyCache[y] = { y: s.year, m: s.month, d: s.day });
}
/* JD(UT) → KST 날짜·시각 */
function jdToKst(jd) {
  const tk = jd - I.JDN_EPOCH + 0.5 + 9 / 24;
  const n = Math.floor(tk);
  const c = civ(n);
  let hh = Math.floor((tk - n) * 24), mm = Math.round(((tk - n) * 24 - hh) * 60);
  if (mm === 60) { hh += 1; mm = 0; }
  return { y: c.y, m: c.m, d: c.d, hh, mm };
}
const midnightJd = (y, m, d) => dn(y, m, d) + I.JDN_EPOCH - 0.5 - 9 / 24;

/* 24절기 (황경 i*15°) */
const TERM_NAMES = ['춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩'];
const TERM_APPROX = [[3, 20], [4, 5], [4, 20], [5, 5], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22], [1, 5], [1, 20], [2, 4], [2, 19], [3, 5]];
const termCache = {};
function yearTerms(y) {
  if (termCache[y]) return termCache[y];
  const out = TERM_NAMES.map((name, i) => {
    const approx = midnightJd(y, TERM_APPROX[i][0], TERM_APPROX[i][1]);
    const jd = I.findTermJd(i * 15, approx - 6, approx + 6);
    const k = jdToKst(jd);
    return { i, name, jeol: i % 2 === 1, jd, ...k };
  });
  return (termCache[y] = out);
}
const termsOn = (y, m, d) => yearTerms(y).filter((t) => t.m === m && t.d === d);
const ipchunCache = {};
function ipchunJd(y) { return ipchunCache[y] || (ipchunCache[y] = I.ipchunJd(y)); }

/* ---------- 하루의 데이터 ---------- */
const ddiOfYear = (y) => DDI[((y - 4) % 12 + 12) % 12];
const stemOfYear = (y) => ((y - 4) % 10 + 10) % 10;
const colorDdi = (y) => STEM_COLOR_WORD[STEM_COLOR[stemOfYear(y)]] + ' ' + ddiOfYear(y).animal;
const colorDdiShort = (y) => STEM_COLOR[stemOfYear(y)] + ddiOfYear(y).animal;
const yearGanji = (y) => M.ganjiName(stemOfYear(y), ((y - 4) % 12 + 12) % 12);

function dayData(y, m, d) {
  const dayP = M.dayPillarOf(y, m, d);
  const idx60 = I.dayPillarIndex(dn(y, m, d) + I.JDN_EPOCH);
  const offset = I.utcOffsetMinutes(y, m, d);
  const jdUt = dn(y, m, d) + I.JDN_EPOCH - 0.5 + (720 - offset) / 1440;   /* 정오 기준 */
  const effYear = jdUt < ipchunJd(y) ? y - 1 : y;
  const yearP = { stem: stemOfYear(effYear), branch: ((effYear - 4) % 12 + 12) % 12 };
  const lambda = I.solarLongitude(jdUt);
  const monthIdx = Math.floor(norm360(lambda - 315) / 30);
  const inStem = ((yearP.stem % 5) * 2 + 2) % 10;
  const monthP = { stem: (inStem + monthIdx) % 10, branch: (2 + monthIdx) % 12 };
  const lun = lunarOf(y, m, d);
  const ddiYear = lun ? lun.y : y;
  return {
    y, m, d, w: weekday(y, m, d), lun, idx60, ilju: ILJU[idx60],
    dayP, yearP, monthP, effYear,
    dayG: M.ganjiName(dayP.stem, dayP.branch), yearG: M.ganjiName(yearP.stem, yearP.branch), monthG: M.ganjiName(monthP.stem, monthP.branch),
    ddi: ddiOfYear(ddiYear), ddiYear, sajuDdi: ddiOfYear(effYear),
    zodiac: zodiacOf(m, d), stone: BIRTHSTONE[m], terms: termsOn(y, m, d),
    ch: C.of(M.STEMS[dayP.stem].han), stem: M.STEMS[dayP.stem], branch: M.BRANCHES[dayP.branch]
  };
}

function ages(y, m, d) {
  const before = today.m < m || (today.m === m && today.d < d);
  const man = today.y - y - (before ? 1 : 0);
  const days = dn(today.y, today.m, today.d) - dn(y, m, d);
  let nb = addYears(y, m, d, today.y - y);
  if (dn(nb.y, nb.m, nb.d) < dn(today.y, today.m, today.d)) nb = addYears(y, m, d, today.y - y + 1);
  const dday = dn(nb.y, nb.m, nb.d) - dn(today.y, today.m, today.d);
  return { man, yeon: today.y - y, se: today.y - y + 1, days, weeks: Math.floor(days / 7), nb, dday };
}
function school(y, m) {
  const early = y <= 2002 && m <= 2;            /* 빠른 생일: 2002년생까지 */
  const base = early ? y - 1 : y;
  return { early, elem: base + 7, hsGrad: base + 19, univ: base + 19, hakbun: pad((base + 19) % 100) };
}

/* ---------- 셸 ---------- */
const GA = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-JCDJSNZX4J"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-JCDJSNZX4J');</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9924140539322407" crossorigin="anonymous"></script>`;
const SAJU_ICON = `<svg width="18" height="18" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="6" fill="#B8382D"/><text x="15" y="20.5" text-anchor="middle" font-family="'Noto Serif KR',serif" font-size="15" font-weight="600" fill="#F6F1E8">四</text></svg>`;
const DREAM_ICON = `<svg width="18" height="18" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="6" fill="#B8382D"/><text x="15" y="20.5" text-anchor="middle" font-family="'Noto Serif KR',serif" font-size="15" font-weight="600" fill="#F6F1E8">夢</text></svg>`;
const BRAND_SVG = `<svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="5" fill="#B8382D"/><text x="15" y="13.5" text-anchor="middle" font-family="'Noto Serif KR',serif" font-size="10" font-weight="600" fill="#F6F1E8">生</text><text x="15" y="25" text-anchor="middle" font-family="'Noto Serif KR',serif" font-size="10" font-weight="600" fill="#F6F1E8">日</text></svg>`;

function shell(o) {
  const ld = o.jsonld ? `<script type="application/ld+json">${JSON.stringify(o.jsonld)}</script>` : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${GA}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITE}${o.url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/css/style.css">
${ld}
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}${o.url}">
</head>
<body>
<div class="app"${o.birth ? ` data-birth="${o.birth}"` : ''}>
<header class="hdr">
  <div class="brand-row">
    <a class="brand" href="/">${BRAND_SVG}<span class="brand-name">생일첩</span></a>
    <a class="sis-chip" href="${SAJU}/" title="사주첩 — 여덟 글자에 담긴 당신의 이야기">${SAJU_ICON}<span>사주첩</span></a>
    <a class="sis-chip" href="https://dream.sajucheop.com/" title="꿈첩 — 상황별 꿈해몽">${DREAM_ICON}<span>꿈첩</span></a>
  </div>
  <nav class="nav"><a href="/age/">만나이</a><a href="/cal/${today.y}/">달력</a><a href="/ddi/">띠</a><a href="/zodiac/">별자리</a></nav>
</header>
${o.body}
<footer>
  <div class="frow"><span>© 생일첩 · <a href="${SAJU}/">사주첩</a> · <a href="https://dream.sajucheop.com/">꿈첩</a> 자매 사이트</span><nav><a href="/about/">소개</a><a href="/terms/">이용약관</a><a href="/privacy/">개인정보</a></nav></div>
  <p class="fnote">${o.footNote || '나이·기념일은 계산 결과이며, 띠·별자리·사주 풀이는 전통 명리학과 점성술 이론에 바탕한 참고용 콘텐츠입니다.'}</p>
</footer>
</div>
${o.extraBody || ''}
<script src="/js/live.js" defer></script>
</body>
</html>
`;
}
const crumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE + it.url }))
});

const urls = { pages: [], days: {} };
function write(url, html, kind) {
  const file = path.join(OUT, url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (kind === 'day') { const dec = url.slice(1, 4) + '0'; (urls.days[dec] = urls.days[dec] || []).push(url); }
  else urls.pages.push(url);
}

/* ---------- 날짜 페이지 ---------- */
const NEXT_BDAY = (nb) => `${fmt(nb.y, nb.m, nb.d)} (${WD[weekday(nb.y, nb.m, nb.d)].slice(0, 1)})`;
const el = (s) => `<span class="el-${s.el}">${s.el}</span>`;

function dayPage(x) {
  const { y, m, d } = x;
  const a = ages(y, m, d);
  const sc = school(y, m);
  const url = dayUrl(y, m, d);
  const wd = WD[x.w];
  const lunTxt = x.lun ? `${x.lun.y}년 ${x.lun.leap ? '윤' : ''}${x.lun.m}월 ${x.lun.d}일` : '-';
  const ilju = x.ilju;
  const ddiNote = x.ddi !== x.sajuDdi
    ? `<p class="note">설날(음력 1월 1일) 기준으로는 <b>${x.ddi.animal}</b>이지만, 사주(명리)에서는 입춘을 새해의 시작으로 보기 때문에 <b>${x.sajuDdi.animal}</b>(${x.yearG.kor}년)로 계산합니다. 1~2월생에게 자주 생기는 차이예요.</p>`
    : '';
  const jeolNote = x.terms.filter((t) => t.jeol).map((t) => `<p class="note">이 날은 <b>${t.name}</b>(${pad(t.hh)}:${pad(t.mm)} KST) 절입일입니다. 사주에서는 이 시각을 기준으로 ${t.name === '입춘' ? '년주와 월주가' : '월주가'} 바뀌므로, 출생 시각에 따라 ${t.name === '입춘' ? '띠와 월주' : '월주'}가 달라질 수 있어요.`).join('');
  const chungi = x.terms.filter((t) => !t.jeol).map((t) => t.name);
  const mile = [
    ['100일', addDays(y, m, d, 99)], ['첫돌 (만 1세)', addYears(y, m, d, 1)], ['1,000일', addDays(y, m, d, 999)],
    ['10,000일', addDays(y, m, d, 9999)], ['20,000일', addDays(y, m, d, 19999)],
    ['성년 (만 19세)', addYears(y, m, d, 19)], ['서른 (만 30세)', addYears(y, m, d, 30)], ['마흔 (만 40세)', addYears(y, m, d, 40)],
    ['환갑 (만 60세)', addYears(y, m, d, 60)], ['칠순 (세는나이 70, 만 69세)', addYears(y, m, d, 69)], ['팔순 (세는나이 80, 만 79세)', addYears(y, m, d, 79)],
    [`국민연금 수급 개시 (만 ${pensionAge(y)}세)`, addYears(y, m, d, pensionAge(y))]
  ];
  const mileRows = mile.map(([k, v]) => {
    const past = dn(v.y, v.m, v.d) <= dn(today.y, today.m, today.d);
    const link = v.y <= Y1 && v.y >= Y0 ? `<a href="${dayUrl(v.y, v.m, v.d)}">${fmt(v.y, v.m, v.d)}</a>` : fmt(v.y, v.m, v.d);
    return `<tr><td>${k}</td><td>${link}</td><td>${WD[weekday(v.y, v.m, v.d)]}</td><td class="note">${past ? '지남' : ''}</td></tr>`;
  }).join('\n');
  const sameDay = [];
  for (let yy = y - 6; yy <= y + 6; yy++) {
    if (yy < Y0 || yy > Y1 || (m === 2 && d === 29 && !isLeap(yy))) continue;
    const g = M.ganjiName(...Object.values(M.dayPillarOf(yy, m, d)));
    sameDay.push(`<a href="${dayUrl(yy, m, d)}"${yy === y ? ' class="cur"' : ''}><b>${yy}</b><small>${WD[weekday(yy, m, d)].slice(0, 1)} · ${g.kor}일</small></a>`);
  }
  const pv = addDays(y, m, d, -1), nx = addDays(y, m, d, 1);
  const pvOk = pv.y >= Y0, nxOk = nx.y <= Y1 && dn(nx.y, nx.m, nx.d) <= dn(today.y, today.m, today.d);
  const sajuDay = (y >= today.y && y <= today.y + 1) ? `<a href="${SAJU}/day/${iso(y, m, d)}/">이 날의 일진 보기(사주첩)</a> · ` : '';
  const seasonName = ['봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울', '겨울', '겨울'][x.monthP.branch >= 2 ? x.monthP.branch - 2 : x.monthP.branch + 10];

  const title = `${y}년 ${m}월 ${d}일생 나이·띠·별자리·음력 생일 (${wd.slice(0, 1)}요일, ${ilju.kor}일주)`;
  const desc = `${fmt(y, m, d)}(${wd}) 태어난 사람은 ${today.y}년 기준 만 ${a.man}세. ${x.ddi.animal}, ${x.zodiac.kor}, 음력 ${lunTxt}, ${x.yearG.kor}년 ${x.monthG.kor}월 ${ilju.kor}일. 환갑·칠순 날짜와 학번, 사주 일주 풀이까지.`;

  const body = `
<div class="overline"><a href="${yearUrl(y)}">${y}년생</a> · <a href="${monthUrl(y, m)}">${m}월</a> · <a href="${mdUrl(m, d)}">${m}월 ${d}일생</a></div>
<h1>${fmt(y, m, d)}생 — 만 <span data-live="man">${a.man}</span>세, ${x.ddi.animal}, ${x.zodiac.kor}</h1>
<p class="lead">${fmt(y, m, d)}은 <strong>${wd}</strong>이었습니다. 음력으로는 <strong>${lunTxt}</strong>, 간지로는 <strong>${x.yearG.kor}(${x.yearG.han})년 ${x.monthG.kor}(${x.monthG.han})월 ${x.dayG.kor}(${x.dayG.han})일</strong>입니다. 이 날 태어난 사람은 <span data-live="today">${fmt(today.y, today.m, today.d)}</span> 기준 <strong>만 <span data-live="man">${a.man}</span>세</strong>(연나이 <span data-live="yeon">${a.yeon}</span>세, 세는나이 <span data-live="se">${a.se}</span>세)이고, 태어난 지 <strong><span data-live="days">${num(a.days)}</span>일</strong>째입니다.</p>
<div class="chips"><span>${wd}</span><span>음력 <b>${x.lun ? (x.lun.leap ? '윤' : '') + x.lun.m + '월 ' + x.lun.d + '일' : '-'}</b></span><span><b>${x.ddi.animal}</b></span><span>${x.zodiac.sym} <b>${x.zodiac.kor}</b></span><span><b>${ilju.kor}일주</b> ${ilju.han}</span><span>주민번호 앞자리 <b>${pad(y % 100)}${pad(m)}${pad(d)}</b></span>${x.lun && x.lun.son ? '<span>손없는 날</span>' : ''}</div>

<section>
<h2>나이</h2>
<div class="facts">
  <div class="fact hi"><small>만 나이</small><b><span data-live="man">${a.man}</span>세</b><i>법적 나이 (2023.6.28~)</i></div>
  <div class="fact"><small>연나이</small><b><span data-live="yeon">${a.yeon}</span>세</b><i>올해 − 출생연도</i></div>
  <div class="fact"><small>세는나이</small><b><span data-live="se">${a.se}</span>세</b><i>한국식 나이</i></div>
  <div class="fact"><small>태어난 지</small><b><span data-live="days">${num(a.days)}</span>일</b><i><span data-live="weeks">${num(a.weeks)}</span>주</i></div>
  <div class="fact"><small>다음 생일</small><b><span data-live="dday">${a.dday === 0 ? '오늘!' : 'D-' + a.dday}</span></b><i><span data-live="nextb">${NEXT_BDAY(a.nb)}</span></i></div>
  <div class="fact"><small>태어난 요일</small><b>${wd}</b><i>${y}년 ${m}월 ${d}일</i></div>
</div>
<p class="note">나이는 이 페이지를 여는 날짜 기준으로 자동 계산됩니다. 만 나이는 생일이 지났는지에 따라 달라지고, 세는나이는 태어난 해를 1살로 셉니다.</p>
</section>

<section>
<h2>기념일과 나이 마일스톤</h2>
<div class="tw"><table>
<thead><tr><th>기념일</th><th>날짜</th><th>요일</th><th></th></tr></thead>
<tbody>
${mileRows}
</tbody></table></div>
<p class="note">100일·1,000일은 태어난 날을 1일로 셉니다. 국민연금 수급 개시 연령은 ${y}년생 기준 만 ${pensionAge(y)}세입니다.</p>
</section>

<section>
<h2>학교와 학번</h2>
<ul>
  <li><strong>초등학교 입학</strong> — ${sc.elem}년 3월${sc.early ? ' (1~2월생 빠른 입학 기준)' : ''}</li>
  <li><strong>고등학교 졸업</strong> — ${sc.hsGrad}년 2월</li>
  <li><strong>대학 입학 (재수 없이)</strong> — ${sc.univ}년, <strong>${sc.hakbun}학번</strong></li>
  <li><strong>성년</strong> — ${addYears(y, m, d, 19).y}년 ${m}월 ${d}일 (만 19세)</li>
</ul>
<p class="note">${sc.early ? `${y}년 1~2월생은 이른바 '빠른 ${pad(y % 100)}'으로, 제도상 ${y - 1}년생과 같은 학년으로 입학했습니다. 실제 입학 연도는 취학 유예·조기 입학 여부에 따라 다를 수 있어요.` : (y >= 2003 && m <= 2 ? '2003년생부터는 1~2월생도 같은 해 출생자와 함께 입학합니다(빠른 생일 제도 폐지).' : '취학 유예·조기 입학·재수 여부에 따라 실제와 다를 수 있습니다.')}</p>
</section>

<section>
<h2>띠와 별자리</h2>
<h3>${colorDdi(x.ddiYear)} (${yearGanji(x.ddiYear).kor}년)</h3>
<p>${x.ddi.trait}</p>
${ddiNote}
<p class="note">${x.ddiYear}년의 설날은 ${(() => { const l = lunarNewYear(x.ddiYear); return fmt(l.y, l.m, l.d); })()}입니다. <a href="/ddi/${x.ddi.slug}/">${x.ddi.animal} 해와 나이 전체 보기</a></p>
<h3>${x.zodiac.sym} ${x.zodiac.kor} (${x.zodiac.from[0]}월 ${x.zodiac.from[1]}일 ~ ${x.zodiac.to[0]}월 ${x.zodiac.to[1]}일)</h3>
<p>${x.zodiac.trait}</p>
<p class="note">${m}월의 탄생석은 <strong>${x.stone.name}</strong>(${x.stone.en}) — ${x.stone.meaning}. <a href="/zodiac/${x.zodiac.slug}/">${x.zodiac.kor} 더 보기</a> · <a href="${mdUrl(m, d)}">${m}월 ${d}일생 연도별 보기</a></p>
</section>

<section>
<h2>사주로 본 ${fmt(y, m, d)}</h2>
<div class="chips"><span>년주 <b>${x.yearG.kor} ${x.yearG.han}</b></span><span>월주 <b>${x.monthG.kor} ${x.monthG.han}</b></span><span>일주 <b>${x.dayG.kor} ${x.dayG.han}</b></span><span>일간 <b>${x.stem.kor}${el(x.stem)}</b></span><span>${seasonName}에 태어남</span></div>
${jeolNote}
<h3>일간 ${x.stem.kor}(${x.stem.han}) — ${x.ch.name}</h3>
<p><strong>${x.ch.metaphor}.</strong> ${x.ch.body}</p>
<p class="note">키워드: ${x.ch.keywords.join(' · ')}</p>
<h3>${ilju.kor}일주(${ilju.han}) — ${ilju.alias}</h3>
<p>${ilju.core}</p>
<p>${UN_LINE[ilju.un]}</p>
<p>${SPOUSE_LINE[M.branchSipseong(x.dayP.stem, x.dayP.branch)]}</p>
<p class="callout">일주는 태어난 날의 간지로 정해져 시각과 상관없이 같지만, 시주(태어난 시간)와 대운·오행 균형까지 보려면 정확한 출생 시각이 필요합니다. <a href="${SAJU}/ilju/${ilju.slug}/">${ilju.kor}일주 풀이 전문</a> · <a href="${SAJU}/">사주첩에서 내 사주 보기</a></p>
${chungi.length ? `<p class="note">이 날은 절기 <b>${chungi.join(', ')}</b>입니다.</p>` : ''}
${x.lun && x.lun.son ? '<p class="note">음력 ' + x.lun.d + '일은 손없는 날 — 이사·개업 같은 큰일을 하기 좋다고 여기는 날에 태어났습니다.</p>' : ''}
</section>

<section>
<h2>같은 ${m}월 ${d}일, 다른 해</h2>
<div class="grid">
${sameDay.join('\n')}
</div>
<p class="note"><a href="${mdUrl(m, d)}">${m}월 ${d}일생 ${Y0}~${Y1}년 전체 표</a></p>
</section>

<section>
<h2>자주 묻는 질문</h2>
<h3>${y}년 ${m}월 ${d}일생은 올해 몇 살인가요?</h3>
<p><span data-live="year">${today.y}</span>년 기준 만 <span data-live="man">${a.man}</span>세입니다. 연나이로는 <span data-live="yeon">${a.yeon}</span>세, 세는나이로는 <span data-live="se">${a.se}</span>세예요. 2023년 6월 28일부터 법적·행정적 나이는 만 나이로 통일되었습니다.</p>
<h3>${y}년 ${m}월 ${d}일은 무슨 요일이었나요?</h3>
<p>${wd}입니다. 다음 생일인 <span data-live="nextb">${NEXT_BDAY(a.nb)}</span>까지 <span data-live="ddays">${a.dday === 0 ? "오늘" : a.dday + "일"}</span> 남았습니다.</p>
<h3>${y}년 ${m}월 ${d}일생의 음력 생일과 띠는?</h3>
<p>음력 ${lunTxt}이고, ${x.ddi === x.sajuDdi ? `${colorDdi(x.ddiYear)}입니다.` : `설날 기준으로는 ${x.ddi.animal}, 사주 기준(입춘)으로는 ${x.sajuDdi.animal}입니다.`} 별자리는 ${x.zodiac.kor}, 사주의 일주는 ${ilju.kor}일주(${ilju.han})입니다.</p>
</section>

<p class="pn">${pvOk ? `<a href="${dayUrl(pv.y, pv.m, pv.d)}">← ${fmt(pv.y, pv.m, pv.d)}</a>` : '<span></span>'}${nxOk ? `<a href="${dayUrl(nx.y, nx.m, nx.d)}">${fmt(nx.y, nx.m, nx.d)} →</a>` : '<span></span>'}</p>
<p class="note">${sajuDay}<a href="${monthUrl(y, m)}">${y}년 ${m}월 달력</a> · <a href="${yearUrl(y)}">${y}년생</a> · <a href="/">다른 생일 찾기</a></p>
`;
  write(url, shell({
    url, title, desc, body, birth: iso(y, m, d),
    jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년생`, url: yearUrl(y) }, { name: `${y}년 ${m}월`, url: monthUrl(y, m) }, { name: `${m}월 ${d}일`, url }]),
      { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, datePublished: BUILD_ISO, dateModified: BUILD_ISO, inLanguage: 'ko', author: { '@type': 'Organization', name: '생일첩' }, publisher: { '@type': 'Organization', name: '생일첩' }, mainEntityOfPage: SITE + url }]
  }), 'day');
}

/* ---------- 월 페이지 ---------- */
function monthPage(y, m, days) {
  const url = monthUrl(y, m);
  const first = weekday(y, m, 1);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span></span>');
  for (const x of days) {
    const cls = [x.w === 0 ? 'sun' : x.w === 6 ? 'sat' : '', x.lun && x.lun.son ? 'son' : '', x.terms.some((t) => t.jeol) ? 'term' : ''].filter(Boolean).join(' ');
    cells.push(`<a href="${dayUrl(y, m, x.d)}" class="${cls}">${x.d}<small>${x.dayG.kor}</small><small>${x.lun ? (x.lun.leap ? '윤' : '') + x.lun.m + '.' + x.lun.d : ''}</small></a>`);
  }
  const zs = [...new Set(days.map((x) => x.zodiac.slug))].map((s) => ZODIAC.find((z) => z.slug === s));
  const terms = yearTerms(y).filter((t) => t.m === m).sort((a, b) => a.d - b.d);
  const months = Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => `<a href="${monthUrl(y, mm)}"${mm === m ? ' class="cur"' : ''}><b>${mm}월</b></a>`).join('');
  const sons = days.filter((x) => x.lun && x.lun.son).map((x) => `<a href="${dayUrl(y, m, x.d)}">${x.d}일</a>`).join(', ');
  const lunFirst = days[0].lun, lunLast = days[days.length - 1].lun;
  const title = `${y}년 ${m}월 출생 달력 — 날짜별 일주·음력·요일 (${colorDdi(y)})`;
  const desc = `${y}년 ${m}월에 태어난 사람의 날짜별 요일, 음력 날짜, 사주 일주, 절기, 손없는 날. ${y}년생은 ${colorDdi(y)}, ${m}월 탄생석은 ${BIRTHSTONE[m].name}.`;
  const pvM = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }, nxM = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const body = `
<div class="overline"><a href="${yearUrl(y)}">${y}년생</a> · ${m}월</div>
<h1>${y}년 ${m}월 출생 달력</h1>
<p class="lead">${y}년 ${m}월 1일은 ${WD[first]}로 시작합니다. 음력으로는 ${lunFirst ? `${lunFirst.y}년 ${lunFirst.leap ? '윤' : ''}${lunFirst.m}월 ${lunFirst.d}일` : '-'}부터 ${lunLast ? `${lunLast.leap ? '윤' : ''}${lunLast.m}월 ${lunLast.d}일` : '-'}까지예요. 날짜를 누르면 그 날 태어난 사람의 나이·띠·별자리·일주 풀이를 볼 수 있습니다.</p>
<div class="chips"><span><b>${colorDdi(y)}</b></span><span>${zs.map((z) => z.sym + ' ' + z.kor).join(' / ')}</span><span>탄생석 <b>${BIRTHSTONE[m].name}</b></span></div>
<section>
<div class="cal">
${['일', '월', '화', '수', '목', '금', '토'].map((w, i) => `<span class="wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</span>`).join('')}
${cells.join('\n')}
</div>
<p class="note">숫자 아래는 그 날의 일주와 음력 날짜. 붉은 날짜는 절기(절입일), 테두리가 있는 날은 손없는 날입니다.</p>
</section>
<section>
<h2>${y}년 ${m}월의 절기</h2>
<ul>${terms.map((t) => `<li><strong>${t.name}</strong> — <a href="${dayUrl(y, m, t.d)}">${m}월 ${t.d}일</a> ${pad(t.hh)}:${pad(t.mm)}${t.jeol ? ' (절입 — 이 시각부터 사주의 월주가 바뀝니다)' : ''}</li>`).join('')}</ul>
${sons ? `<p class="note">손없는 날: ${sons}</p>` : ''}
</section>
<section>
<h2>이 달의 별자리와 탄생석</h2>
${zs.map((z) => `<h3>${z.sym} ${z.kor} (${z.from[0]}월 ${z.from[1]}일 ~ ${z.to[0]}월 ${z.to[1]}일)</h3><p>${z.trait} <a href="/zodiac/${z.slug}/">더 보기</a></p>`).join('')}
<p><strong>${m}월의 탄생석 ${BIRTHSTONE[m].name}</strong>(${BIRTHSTONE[m].en})은 ${BIRTHSTONE[m].meaning}을 뜻합니다.</p>
</section>
<section>
<h2>${y}년의 다른 달</h2>
<div class="grid g6">${months}</div>
</section>
<p class="pn">${pvM.y >= Y0 ? `<a href="${monthUrl(pvM.y, pvM.m)}">← ${pvM.y}년 ${pvM.m}월</a>` : '<span></span>'}${nxM.y <= Y1 && (nxM.y < today.y || nxM.m <= today.m) ? `<a href="${monthUrl(nxM.y, nxM.m)}">${nxM.y}년 ${nxM.m}월 →</a>` : '<span></span>'}</p>
`;
  write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년생`, url: yearUrl(y) }, { name: `${m}월`, url }]) }));
}

/* ---------- 연도 페이지 ---------- */
function yearPage(y) {
  const url = yearUrl(y);
  const ddi = ddiOfYear(y), g = yearGanji(y), lny = lunarNewYear(y), ip = jdToKst(ipchunJd(y));
  const yeon = today.y - y;
  const sc = school(y, 6), scE = school(y, 1);
  const sameDdi = [];
  for (let yy = y - 60; yy <= y + 60; yy += 12) if (yy >= Y0 && yy <= Y1) sameDdi.push(`<a href="${yearUrl(yy)}"${yy === y ? ' class="cur"' : ''}><b>${yy}</b><small>${colorDdiShort(yy)}</small></a>`);
  const months = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => y < today.y || m <= today.m).map((m) => `<a href="${monthUrl(y, m)}"><b>${m}월</b><small>${BIRTHSTONE[m].name}</small></a>`).join('');
  const zrows = ZODIAC.map((z) => `<tr><td><a href="/zodiac/${z.slug}/">${z.sym} ${z.kor}</a></td><td>${z.from[0]}월 ${z.from[1]}일 ~ ${z.to[0]}월 ${z.to[1]}일</td></tr>`).join('');
  const title = `${y}년생 나이·띠·학번 — ${g.kor}년 ${colorDdi(y)}, 올해 만 ${yeon - 1}~${yeon}세`;
  const desc = `${y}년생은 ${g.kor}(${g.han})년 ${colorDdi(y)}. ${today.y}년 기준 만 ${yeon - 1}~${yeon}세(연나이 ${yeon}세, 세는나이 ${yeon + 1}세), ${sc.hakbun}학번. 설날 ${lny.m}월 ${lny.d}일, 입춘 ${ip.m}월 ${ip.d}일. 월별 출생 달력과 날짜별 일주.`;
  const body = `
<div class="overline">생일첩 · 연도별</div>
<h1>${y}년생 — ${g.kor}년 ${colorDdi(y)}</h1>
<p class="lead">${y}년에 태어난 사람은 <strong>${g.kor}(${g.han})년 ${colorDdi(y)}</strong>입니다. <span data-live="year">${today.y}</span>년 기준 <strong>만 ${yeon - 1}세 또는 ${yeon}세</strong>(생일이 지났으면 ${yeon}세), 연나이 <strong>${yeon}세</strong>, 세는나이 <strong>${yeon + 1}세</strong>예요. 재수 없이 대학에 갔다면 <strong>${sc.hakbun}학번</strong>입니다.</p>
<div class="facts">
  <div class="fact hi"><small>만 나이 (${today.y}년)</small><b>${yeon - 1}~${yeon}세</b><i>생일 전 ${yeon - 1} · 생일 후 ${yeon}</i></div>
  <div class="fact"><small>연나이 / 세는나이</small><b>${yeon} / ${yeon + 1}세</b><i>${today.y} − ${y}</i></div>
  <div class="fact"><small>띠</small><b>${ddi.animal}</b><i>${STEM_COLOR[stemOfYear(y)]}(${STEM_COLOR_WORD[STEM_COLOR[stemOfYear(y)]]}) ${ddi.han}</i></div>
  <div class="fact"><small>설날 (음력 1월 1일)</small><b>${lny.m}월 ${lny.d}일</b><i>${y}년</i></div>
  <div class="fact"><small>입춘 (사주의 새해)</small><b>${ip.m}월 ${ip.d}일</b><i>${pad(ip.hh)}:${pad(ip.mm)} KST</i></div>
  <div class="fact"><small>학번</small><b>${sc.hakbun}학번</b><i>1~2월생 ${scE.early ? scE.hakbun + '학번' : '동일'}</i></div>
</div>
<section>
<h2>${y}년 몇 월생인가요?</h2>
<div class="grid g6">${months}</div>
<p class="note">달을 고르면 날짜별 달력이 나오고, 날짜를 고르면 그 날 태어난 사람의 나이·기념일·별자리·사주 일주를 볼 수 있습니다.</p>
</section>
<section>
<h2>${y}년생의 나이와 기념일</h2>
<ul>
  <li><strong>초등학교 입학</strong> — ${sc.elem}년 3월${scE.early ? ` (1~2월생은 ${scE.elem}년, 빠른 ${pad(y % 100)})` : ''}</li>
  <li><strong>고등학교 졸업</strong> — ${sc.hsGrad}년 2월</li>
  <li><strong>성년(만 19세)</strong> — ${y + 19}년 생일</li>
  <li><strong>서른(만 30세)</strong> — ${y + 30}년 · <strong>마흔</strong> — ${y + 40}년 · <strong>쉰</strong> — ${y + 50}년</li>
  <li><strong>환갑(만 60세)</strong> — ${y + 60}년 생일 · <strong>칠순</strong> — ${y + 69}년 · <strong>팔순</strong> — ${y + 79}년</li>
  <li><strong>국민연금 수급 개시</strong> — 만 ${pensionAge(y)}세, ${y + pensionAge(y)}년 생일부터</li>
</ul>
</section>
<section>
<h2>${colorDdi(y)}의 성격</h2>
<p>${ddi.trait}</p>
<p>${ddi.love}</p>
<p>${ddi.work}</p>
<p class="callout">띠는 보통 설날(음력 1월 1일, ${y}년은 ${lny.m}월 ${lny.d}일)을 기준으로 바뀝니다. ${y}년 1월 1일~${lny.m}월 ${lny.d - 1 > 0 ? lny.d - 1 + '일' : '설날 전날'}생은 설날 기준으로 ${ddiOfYear(y - 1).animal}이고, 사주(명리)에서는 입춘(${ip.m}월 ${ip.d}일 ${pad(ip.hh)}:${pad(ip.mm)}) 이후 출생부터 ${ddi.animal}로 봅니다. <a href="/ddi/${ddi.slug}/">${ddi.animal} 해 전체 보기</a></p>
</section>
<section>
<h2>같은 ${ddi.animal} 해</h2>
<div class="grid">${sameDdi.join('')}</div>
</section>
<section>
<h2>별자리 날짜표</h2>
<div class="tw"><table><thead><tr><th>별자리</th><th>기간</th></tr></thead><tbody>${zrows}</tbody></table></div>
</section>
<p class="pn">${y - 1 >= Y0 ? `<a href="${yearUrl(y - 1)}">← ${y - 1}년생</a>` : '<span></span>'}${y + 1 <= Y1 ? `<a href="${yearUrl(y + 1)}">${y + 1}년생 →</a>` : '<span></span>'}</p>
`;
  write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년생`, url }]) }));
}

/* ---------- 월일 페이지 ---------- */
function mdPage(m, d, rows) {
  const url = mdUrl(m, d);
  const z = zodiacOf(m, d), st = BIRTHSTONE[m];
  const trs = rows.map((x) => `<tr><td><a href="${dayUrl(x.y, m, d)}">${x.y}년</a></td><td>${WD[x.w]}</td><td>${colorDdiShort(x.ddiYear)}</td><td><a href="${dayUrl(x.y, m, d)}">${x.dayG.kor}일주</a></td><td>${x.lun ? (x.lun.leap ? '윤' : '') + x.lun.m + '.' + x.lun.d : ''}</td></tr>`).join('\n');
  const pv = m === 1 && d === 1 ? { m: 12, d: 31 } : d === 1 ? { m: m - 1, d: dim(2000, m - 1) } : { m, d: d - 1 };
  const nx = m === 12 && d === 31 ? { m: 1, d: 1 } : d === dim(2000, m) ? { m: m + 1, d: 1 } : { m, d: d + 1 };
  const title = `${m}월 ${d}일생 별자리·탄생석 — ${z.kor}, 연도별 요일·띠·일주표`;
  const desc = `${m}월 ${d}일에 태어난 사람은 ${z.kor}(${z.sym}), 탄생석은 ${st.name}. ${Y0}년부터 ${Y1}년까지 ${m}월 ${d}일의 요일, 띠, 사주 일주, 음력 날짜를 한 표로.`;
  const body = `
<div class="overline">생일첩 · 월일별</div>
<h1>${m}월 ${d}일생 — ${z.sym} ${z.kor}, 탄생석 ${st.name}</h1>
<p class="lead">${m}월 ${d}일에 태어난 사람의 별자리는 <strong>${z.kor}</strong>(${z.from[0]}월 ${z.from[1]}일 ~ ${z.to[0]}월 ${z.to[1]}일), 탄생석은 <strong>${st.name}</strong>(${st.en}, ${st.meaning})입니다. 띠와 사주 일주는 태어난 해에 따라 달라지므로 아래 표에서 연도를 고르세요.</p>
<section>
<h2>${z.kor}의 성격</h2>
<p>${z.trait} <a href="/zodiac/${z.slug}/">${z.kor} 더 보기</a></p>
</section>
<section>
<h2>${m}월 ${d}일생 연도별 표 (${Y0}~${Y1})</h2>
<div class="tw"><table><thead><tr><th>연도</th><th>요일</th><th>띠</th><th>일주</th><th>음력</th></tr></thead><tbody>
${trs}
</tbody></table></div>
<p class="note">연도를 누르면 그 날 태어난 사람의 나이·기념일·사주 풀이 페이지로 이동합니다.${m === 2 && d === 29 ? ' 2월 29일은 윤년에만 있어 4년에 한 번 생일이 돌아옵니다. 평년에는 보통 2월 28일에 생일을 지냅니다.' : ''}</p>
</section>
<p class="pn"><a href="${mdUrl(pv.m, pv.d)}">← ${pv.m}월 ${pv.d}일생</a><a href="${mdUrl(nx.m, nx.d)}">${nx.m}월 ${nx.d}일생 →</a></p>
`;
  write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '월일별', url: '/md/' }, { name: `${m}월 ${d}일`, url }]) }));
}

/* ---------- 띠 페이지 ---------- */
function ddiPage(ddi) {
  const url = `/ddi/${ddi.slug}/`;
  const years = [];
  for (let y = Y0; y <= Y1; y++) if (ddiOfYear(y) === ddi) years.push(y);
  if (!years.length) return;
  const rows = years.map((y) => { const l = lunarNewYear(y); const ip = jdToKst(ipchunJd(y)); return `<tr><td><a href="${yearUrl(y)}">${y}년</a></td><td>${yearGanji(y).kor} · ${colorDdi(y)}</td><td>${today.y - y - 1}~${today.y - y}세</td><td>${today.y - y + 1}세</td><td>${l.m}.${l.d}</td><td>${ip.m}.${ip.d}</td></tr>`; }).join('\n');
  const title = `${ddi.animal} 해와 나이 — ${years.join(', ')}년생`;
  const desc = `${ddi.animal}(${ddi.han}) 태어난 해 ${years.join(', ')}년. 각 해의 색띠(${years.slice(-3).map(colorDdiShort).join('·')}), ${today.y}년 기준 나이, 설날과 입춘 날짜, ${ddi.animal}의 성격·연애·직업.`;
  const others = DDI.map((x) => `<a href="/ddi/${x.slug}/"${x === ddi ? ' class="cur"' : ''}><b>${x.kor}</b><small>${x.han}</small></a>`).join('');
  const body = `
<div class="overline"><a href="/ddi/">생일첩 · 12띠</a></div>
<h1>${ddi.animal} (${ddi.han}) — 태어난 해와 나이</h1>
<p class="lead">${ddi.animal}는 ${years.map((y) => `<a href="${yearUrl(y)}">${y}</a>`).join(', ')}년생입니다. 띠는 설날(음력 1월 1일)에 바뀌므로 1~2월생은 표의 설날 날짜를 확인하세요. 사주에서는 입춘을 기준으로 봅니다.</p>
<section>
<h2>${ddi.animal} 연도별 나이 (<span data-live="year">${today.y}</span>년 기준)</h2>
<div class="tw"><table><thead><tr><th>연도</th><th>간지·색띠</th><th>만 나이</th><th>세는나이</th><th>설날</th><th>입춘</th></tr></thead><tbody>
${rows}
</tbody></table></div>
<p class="note">천간의 색(갑을 청, 병정 적, 무기 황, 경신 백, 임계 흑)을 붙여 '${colorDdi(years[years.length - 1])}'처럼 부릅니다.</p>
</section>
<section>
<h2>${ddi.animal}의 성격</h2>
<p>${ddi.trait}</p>
<h3>연애</h3><p>${ddi.love}</p>
<h3>일</h3><p>${ddi.work}</p>
<p class="callout">띠는 태어난 해의 지지(地支) 하나만 보는 것이라, 같은 띠라도 태어난 날의 일주에 따라 성격이 크게 다릅니다. 정확한 생년월일로 <a href="/">내 생일 페이지</a>를 열어 일주까지 확인해 보세요.</p>
</section>
<section>
<h2>다른 띠</h2>
<div class="grid g6">${others}</div>
</section>
`;
  write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '12띠', url: '/ddi/' }, { name: ddi.animal, url }]) }));
}

/* ---------- 별자리 페이지 ---------- */
function zodiacPage(z) {
  const url = `/zodiac/${z.slug}/`;
  const dates = [];
  let m = z.from[0], d = z.from[1];
  for (let i = 0; i < 40; i++) {
    dates.push(`<a href="${mdUrl(m, d)}"><b>${m}/${d}</b></a>`);
    if (m === z.to[0] && d === z.to[1]) break;
    d++; if (d > dim(2000, m)) { d = 1; m = m === 12 ? 1 : m + 1; }
  }
  const others = ZODIAC.map((x) => `<a href="/zodiac/${x.slug}/"${x === z ? ' class="cur"' : ''}><b>${x.sym}</b><small>${x.kor}</small></a>`).join('');
  const title = `${z.kor} (${z.from[0]}월 ${z.from[1]}일 ~ ${z.to[0]}월 ${z.to[1]}일) 성격·특징·탄생석`;
  const desc = `${z.kor}(${z.en}, ${z.sym})는 ${z.from[0]}월 ${z.from[1]}일부터 ${z.to[0]}월 ${z.to[1]}일 사이에 태어난 사람. ${z.el}의 별자리. 성격과 특징, 날짜별 생일 페이지.`;
  const body = `
<div class="overline"><a href="/zodiac/">생일첩 · 12별자리</a></div>
<h1>${z.sym} ${z.kor} — ${z.from[0]}월 ${z.from[1]}일 ~ ${z.to[0]}월 ${z.to[1]}일</h1>
<p class="lead">${z.kor}(${z.en})는 <strong>${z.el}</strong>의 별자리입니다. 탄생석은 ${z.from[0]}월생 ${BIRTHSTONE[z.from[0]].name}, ${z.to[0]}월생 ${BIRTHSTONE[z.to[0]].name}.</p>
<section>
<h2>${z.kor}의 성격</h2>
<p>${z.trait}</p>
<p class="callout">별자리는 태어난 달의 태양 위치로 보는 서양 점성술이고, 띠와 일주는 동양 명리의 관점입니다. 두 가지를 함께 보면 자신을 더 입체적으로 이해할 수 있어요. <a href="/">생년월일로 내 페이지 열기</a></p>
</section>
<section>
<h2>${z.kor} 생일 날짜</h2>
<div class="grid g6">${dates.join('')}</div>
</section>
<section>
<h2>다른 별자리</h2>
<div class="grid g6">${others}</div>
</section>
`;
  write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '12별자리', url: '/zodiac/' }, { name: z.kor, url }]) }));
}

/* ---------- 인덱스·홈·정적 페이지 ---------- */
function indexPages() {
  const ddiList = DDI.map((x) => `<a href="/ddi/${x.slug}/"><b>${x.animal}</b><small>${x.han}</small></a>`).join('');
  const zList = ZODIAC.map((z) => `<a href="/zodiac/${z.slug}/"><b>${z.sym} ${z.kor}</b><small>${z.from[0]}/${z.from[1]}~${z.to[0]}/${z.to[1]}</small></a>`).join('');
  write('/ddi/', shell({ url: '/ddi/', title: '12띠 — 태어난 해, 나이, 성격', desc: '쥐띠부터 돼지띠까지 12띠의 태어난 해와 올해 나이, 색띠 이름, 성격·연애·직업.', body: `<div class="overline">생일첩</div><h1>12띠</h1><p class="lead">띠를 고르면 그 띠에 해당하는 연도와 올해 나이, 설날·입춘 날짜, 성격을 볼 수 있습니다.</p><section><div class="grid g3">${ddiList}</div></section>`, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '12띠', url: '/ddi/' }]) }));
  write('/zodiac/', shell({ url: '/zodiac/', title: '12별자리 날짜와 성격', desc: '물병자리부터 염소자리까지 12별자리의 날짜 범위와 성격, 탄생석.', body: `<div class="overline">생일첩</div><h1>12별자리</h1><p class="lead">태어난 날짜로 별자리를 찾고, 별자리별 성격과 날짜별 생일 페이지로 이어집니다.</p><section><div class="grid g3">${zList}</div></section>`, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '12별자리', url: '/zodiac/' }]) }));
  const mdList = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `<h3>${m}월</h3><div class="grid g6">${Array.from({ length: dim(2000, m) }, (_, j) => j + 1).map((d) => `<a href="${mdUrl(m, d)}">${d}일</a>`).join('')}</div>`).join('');
  write('/md/', shell({ url: '/md/', title: '월일별 생일 — 별자리·탄생석·연도별 일주', desc: '1월 1일부터 12월 31일까지 366개 생일의 별자리, 탄생석, 연도별 요일·띠·일주표.', body: `<div class="overline">생일첩</div><h1>월일별 생일</h1><p class="lead">태어난 해와 상관없이 월일로 보는 페이지입니다. 별자리와 탄생석, 그리고 ${Y0}~${Y1}년 각 해의 요일·띠·일주를 한 표로 볼 수 있어요.</p><section>${mdList}</section>`, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: '월일별', url: '/md/' }]) }));
}

function homePage() {
  const decades = [];
  for (let d0 = Math.floor(Y0 / 10) * 10; d0 <= Y1; d0 += 10) {
    const ys = [];
    for (let y = d0; y < d0 + 10; y++) if (y >= Y0 && y <= Y1) ys.push(`<a href="${yearUrl(y)}"><b>${y}</b><small>${colorDdiShort(y)}</small></a>`);
    decades.push(`<h3>${d0}년대</h3><div class="grid g6">${ys.join('')}</div>`);
  }
  const todayMd = mdUrl(today.m, today.d);
  const body = `
<h1>생일첩 <span style="font-size:15px;color:var(--faint);font-weight:400">生日帖</span></h1>
<p class="lead">생년월일 하나로 <strong>만 나이·연나이·세는나이</strong>, <strong>띠와 별자리</strong>, <strong>음력 생일</strong>, 태어난 요일, 환갑·칠순 날짜, 학번, 그리고 사주의 <strong>일주 풀이</strong>까지 한 장에 담습니다. 나이는 매일 자동으로 계산돼요.</p>
<form class="form" id="bform" data-base="/">
  <div class="row"><select name="y" data-min="${Y0}" data-max="${Y1}" aria-label="년"></select><select name="m" aria-label="월"></select><select name="d" aria-label="일"></select></div>
  <button type="submit">내 생일 페이지 열기</button>
</form>
<p class="note">${Y0}년 1월 1일 ~ ${fmt(today.y, today.m, today.d)} 출생까지. 생년월일은 서버로 전송되지 않으며 주소만 이동합니다. 오늘 태어난 아기는 <a href="${dayUrl(today.y, today.m, today.d)}">${fmt(today.y, today.m, today.d)}생</a>, 오늘이 생일인 사람은 <a href="${todayMd}">${today.m}월 ${today.d}일생</a>.</p>
<section>
<h2>계산기와 달력</h2>
<div class="grid g3">
<a href="/age/"><b>만 나이 계산기</b><small>만·연·세는나이</small></a>
<a href="/dday/"><b>디데이 · 100일</b><small>기념일 날짜 계산</small></a>
<a href="/cal/${today.y}/"><b>${today.y}년 달력</b><small>공휴일·연휴</small></a>
<a href="/cal/${today.y + 1}/"><b>${today.y + 1}년 달력</b><small>공휴일·대체공휴일</small></a>
<a href="/cal/${today.y + 2}/"><b>${today.y + 2}년 달력</b><small>설날·추석 날짜</small></a>
<a href="/md/"><b>월일별 생일</b><small>별자리·탄생석</small></a>
</div>
</section>
<section>
<h2>무엇을 알 수 있나요</h2>
<ul>
  <li><strong>나이</strong> — 만 나이(법적 나이), 연나이, 세는나이를 오늘 날짜 기준으로. 태어난 지 며칠째인지, 다음 생일까지 며칠 남았는지.</li>
  <li><strong>기념일</strong> — 100일·1,000일·10,000일, 성년, 환갑·칠순·팔순 날짜와 요일, 국민연금 수급 개시 연도.</li>
  <li><strong>학교</strong> — 초등학교 입학 연도, 고등학교 졸업 연도, 학번(빠른 생일 반영).</li>
  <li><strong>띠·별자리·음력</strong> — 색띠 이름, 설날과 입춘 기준의 차이, 별자리와 탄생석, 음력 생일과 손없는 날.</li>
  <li><strong>사주</strong> — 년주·월주·일주와 일간 캐릭터, 60일주 풀이. 시주와 대운은 <a href="${SAJU}/">사주첩</a>에서 이어집니다.</li>
</ul>
</section>
<section id="years">
<h2>연도별로 찾기</h2>
${decades.join('')}
</section>
<section>
<h2>띠로 찾기</h2>
<div class="grid g6">${DDI.map((x) => `<a href="/ddi/${x.slug}/"><b>${x.kor}</b><small>${x.han}</small></a>`).join('')}</div>
</section>
<section>
<h2>별자리로 찾기</h2>
<div class="grid g4">${ZODIAC.map((z) => `<a href="/zodiac/${z.slug}/"><b>${z.sym} ${z.kor}</b><small>${z.from[0]}/${z.from[1]}~${z.to[0]}/${z.to[1]}</small></a>`).join('')}</div>
<p class="note"><a href="/md/">월일별 생일 전체 보기</a></p>
</section>
<section>
<h2>나이 계산 기준</h2>
<p><strong>만 나이</strong>는 태어난 날을 0세로 시작해 생일이 지날 때마다 한 살씩 더하는 방식으로, 2023년 6월 28일부터 법적·행정적 나이의 기준입니다. <strong>연나이</strong>는 올해에서 출생연도를 뺀 값으로 병역법·청소년보호법 등 일부 법령에서 씁니다. <strong>세는나이</strong>는 태어난 해를 1살로 세고 새해마다 한 살씩 더하는 한국식 나이입니다.</p>
<p><strong>띠</strong>는 관습적으로 설날(음력 1월 1일)에 바뀌고, 사주(명리학)에서는 입춘 시각을 새해의 시작으로 봅니다. 1~2월생은 두 기준이 다를 수 있어 생일 페이지에 둘 다 표시합니다. <strong>음력</strong> 변환은 한국천문연구원 음양력 자료를 따르는 라이브러리를, <strong>절기</strong>는 태양의 황경을 직접 계산해 판정합니다.</p>
</section>
`;
  write('/', shell({ url: '/', title: '생일첩 — 생년월일로 보는 나이·띠·별자리·음력·일주', desc: `생년월일을 넣으면 만 나이·연나이·세는나이, 띠와 별자리, 음력 생일, 태어난 요일, 환갑·칠순 날짜, 학번, 사주 일주 풀이까지. ${Y0}년부터 오늘까지 모든 날짜.`, body, jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: '생일첩', url: SITE + '/' } }));
}

function staticPages() {
  const doc = (url, title, desc, body) => write(url, shell({ url, title, desc, body: `<div class="overline">생일첩</div><h1>${title}</h1><section>${body}</section>` }));
  doc('/about/', '생일첩 소개', '생일첩은 생년월일 하나로 나이·띠·별자리·음력·사주 일주를 정리해 주는 사주첩의 자매 사이트입니다.', `
<p>생일첩(生日帖)은 <a href="${SAJU}/">사주첩</a>이 만든 자매 사이트입니다. 첩(帖)은 시첩·서첩처럼 글을 모아 묶던 책을 뜻하고, 생일첩은 ${Y0}년부터 오늘까지의 모든 날짜를 한 장씩 담습니다.</p>
<p>날짜마다 만 나이·연나이·세는나이, 태어난 요일, 음력 생일, 띠와 별자리, 100일·환갑·칠순 같은 기념일, 학번, 그리고 사주의 년주·월주·일주와 일주 풀이를 계산해 보여 줍니다. 계산은 사주첩의 만세력 엔진(절기 시각을 태양 황경으로 직접 판정)과 한국천문연구원 자료 기반의 음력 변환을 씁니다.</p>
<p>입력한 생년월일은 서버로 전송되지 않습니다. 모든 페이지는 미리 만들어진 정적 문서이고, 나이·D-day는 방문자의 브라우저에서 오늘 날짜로 다시 계산됩니다.</p>
<p>문의: <a href="${SAJU}/">사주첩</a> 페이지 하단의 연락처를 이용해 주세요.</p>`);
  doc('/terms/', '이용약관', '생일첩 이용약관.', `
<p>생일첩(이하 "사이트")은 생년월일을 바탕으로 나이·기념일·띠·별자리·음력·사주 정보를 계산해 제공하는 무료 정보 서비스입니다.</p>
<h3>1. 콘텐츠의 성격</h3><p>나이·요일·기념일·음력 날짜는 계산 결과이며 최대한 정확하게 제공하도록 노력하지만, 법적 효력이 있는 증명 자료가 아닙니다. 입학·졸업 연도, 연금 수급 연령 등은 일반적인 제도를 기준으로 한 추정치로 개인의 사정에 따라 다를 수 있습니다. 띠·별자리·사주 풀이는 전통 명리학과 점성술 이론을 바탕으로 한 참고·오락용 콘텐츠이며, 중요한 결정의 근거로 삼지 마세요.</p>
<h3>2. 책임의 한계</h3><p>사이트는 콘텐츠의 이용으로 발생한 어떠한 손해에 대해서도 책임지지 않습니다.</p>
<h3>3. 저작권</h3><p>사이트의 글과 디자인은 생일첩에 저작권이 있습니다. 출처를 밝힌 인용과 링크는 자유롭게 하실 수 있으나, 무단 복제·재배포는 금지합니다.</p>
<h3>4. 광고</h3><p>사이트는 Google AdSense 광고를 게재하며, 광고 수익으로 운영됩니다.</p>
<p class="note">시행일: ${BUILD_ISO}</p>`);
  doc('/privacy/', '개인정보처리방침', '생일첩 개인정보처리방침.', `
<p>생일첩은 방문자의 개인정보를 소중히 다룹니다.</p>
<h3>1. 수집하는 정보</h3><p>사이트는 회원가입을 받지 않으며, 이름·연락처 등 개인정보를 직접 수집하지 않습니다. 생년월일 검색은 브라우저 안에서 주소 이동으로만 처리되며 서버에 저장되지 않습니다.</p>
<h3>2. 쿠키와 제3자 서비스</h3><p>사이트는 방문 통계를 위해 Google Analytics를, 광고 게재를 위해 Google AdSense를 사용합니다. Google은 쿠키를 이용해 방문 기록과 관심사에 기반한 광고를 보여줄 수 있습니다. 맞춤 광고는 <a href="https://www.google.com/settings/ads" rel="noopener">Google 광고 설정</a>에서, 쿠키 사용은 브라우저 설정에서 거부할 수 있습니다. Google의 데이터 사용에 대한 자세한 내용은 <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Google 정책 페이지</a>를 참고하세요.</p>
<h3>3. 정보의 보관과 파기</h3><p>사이트가 직접 보관하는 개인정보는 없습니다. 통계·광고 서비스에서 처리되는 정보는 각 서비스의 정책을 따릅니다.</p>
<h3>4. 문의</h3><p>개인정보 관련 문의는 <a href="${SAJU}/">사주첩</a>의 연락처로 보내 주세요.</p>
<p class="note">시행일: ${BUILD_ISO}</p>`);
  fs.writeFileSync(path.join(OUT, '404.html'), shell({ url: '/404', title: '페이지를 찾을 수 없습니다', desc: '생일첩', body: `<h1>이 날짜는 아직 없어요</h1><p class="lead">주소가 잘못되었거나, ${Y0}년 이전 또는 오늘 이후의 날짜입니다.</p><form class="form" id="bform" data-base="/"><div class="row"><select name="y" data-min="${Y0}" data-max="${Y1}"></select><select name="m"></select><select name="d"></select></div><button type="submit">생일 페이지 열기</button></form><p class="note"><a href="/">홈으로</a></p>` }));
}

/* ---------- 사이트맵·정적 파일 ---------- */
function sitemaps() {
  const urlset = (list) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILD_ISO}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  const files = ['sitemap-pages.xml'];
  fs.writeFileSync(path.join(OUT, 'sitemap-pages.xml'), urlset(urls.pages));
  for (const dec of Object.keys(urls.days).sort()) {
    const f = `sitemap-days-${dec}.xml`;
    fs.writeFileSync(path.join(OUT, f), urlset(urls.days[dec]));
    files.push(f);
  }
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map((f) => `<sitemap><loc>${SITE}/${f}</loc><lastmod>${BUILD_ISO}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
}
function copyStatic() {
  fs.cpSync(SRC, OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'CNAME'), SITE.replace('https://', '') + '\n');
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
}

/* ---------- 실행 ---------- */
const t0 = Date.now();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyStatic();

const mdRows = {};
let count = 0;
for (let y = Y0; y <= Y1; y++) {
  for (let m = 1; m <= 12; m++) {
    if (y === today.y && m > today.m) break;
    const days = [];
    for (let d = 1; d <= dim(y, m); d++) {
      if (y === today.y && m === today.m && d > today.d) break;
      const x = dayData(y, m, d);
      days.push(x);
      dayPage(x);
      (mdRows[`${m}-${d}`] = mdRows[`${m}-${d}`] || []).push(x);
      count++;
    }
    monthPage(y, m, days);
  }
  yearPage(y);
  if (y % 10 === 0) console.log(`  ${y}년대 완료 (${count}일, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
for (let m = 1; m <= 12; m++) for (let d = 1; d <= dim(2000, m); d++) if (mdRows[`${m}-${d}`]) mdPage(m, d, mdRows[`${m}-${d}`]);
DDI.forEach(ddiPage);
ZODIAC.forEach(zodiacPage);
indexPages();
homePage();
buildHubs({ shell, write, esc, pad, iso, fmt, num, WD, today, Y0, Y1, SITE, SAJU, dayUrl, monthUrl, yearUrl, mdUrl, dn, civ, weekday, isLeap, dim, addDays, addYears, lunarOf, lunarNewYear, yearTerms, ddiOfYear, stemOfYear, colorDdi, colorDdiShort, yearGanji, crumbs, M, I, Lunar, DDI, BUILD_ISO });
staticPages();
sitemaps();
console.log(`생일첩 빌드 완료: ${Y0}~${Y1}, 날짜 ${count}장 + 기타 ${urls.pages.length}장, ${((Date.now() - t0) / 1000).toFixed(1)}s${FULL ? '' : ' (부분 빌드)'}`);
