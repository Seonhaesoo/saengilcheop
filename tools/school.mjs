/* 생일첩 학년 계산 — /school/ (인덱스·라이브 폼), /school/{y}/ 출생연도별 학년·입학·졸업 연도·법적 나이 (1950 ~ 올해)
 * build.mjs 가 헬퍼를 담은 컨텍스트로 buildSchool(c) 를 호출한다. schoolTitle·schoolDesc 는 순수 함수라 test-school.mjs 에서 길이를 검사한다. */
import { schoolOf, gradeOn, gradeList, legalAges, schoolYearOf, seasonYears, gradeInYear, agesInYear, EARLY_LAST_YEAR, EARLY_OPTIONAL_YEAR } from '../data/school.mjs';
import { pensionAge } from '../data/meta.mjs';

/* 2026-11-25 쿠팡 파트너스 '간편 링크'(초등학교 입학 준비물 검색 결과) — 학년 계산기는 방문 1위이고, 다음 해 입학할
 * 아이의 부모가 많이 본다. 표 바로 아래(30~40% 깊이)에 한 칸만, 공정위 대가성 문구를 함께 */
const ENTRY_CP = 'https://link.coupang.com/a/iWCvNmba5A';
const entryBox = (year) => `<aside class="cp-inline"><p class="cp-lead">${year}년 3월 초등학교 입학이라면 —</p><a class="cp-go" href="${ENTRY_CP}" target="_blank" rel="sponsored noopener"><b>초등학교 입학 준비물 보기</b><small>책가방·실내화·필통·이름 스티커 등 쿠팡에서 한 번에</small></a><p class="cp-note">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p></aside>`;

/* 2026-11-21 학년·나이 페이지에 두 학년도(지금·다음)를 함께 싣고, 10월~2월에는 다음 학년도(2027)를 제목에 앞세운 날 — 이 페이지들의 lastmod */
export const SEASON_DATE = '2026-11-21';
const SCHOOL_PUBLISHED = '2026-09-08';   /* /school/{y}/ 를 처음 낸 날 — Article datePublished */
export const SCHOOL_Y0 = 1950;
export const schoolUrl = (y) => `/school/${y}/`;
const pad2 = (n) => String(n).padStart(2, '0');
const manRange = (y, today) => { const n = today.y - y; return n <= 0 ? '0' : `${n - 1}~${n}`; };
const shortG = (g) => (g.stage === 'unborn' ? '출생 전' : g.short);
/* 제목 70자 안에서 ' (15년생)' 을 붙일 수 있으면 붙인다 */
const fit = (t, y) => { const tail = ` (${pad2(y % 100)}년생)`; return (t + tail).length <= 70 ? t + tail : t; };
const inSch = (g) => g.k >= 0 && g.k <= 11;
/* 제목 틀 — 'pre'(미취학), 'entry'(앞세운 학년도에 초1), 'school'(어느 한 해라도 초·중·고), 'adult' */
export function schoolKind(y, today) {
  const { focus: F, other: O } = seasonYears(today);
  const s = schoolOf(y), gF = gradeInYear(s.base, F), gO = gradeInYear(s.base, O);
  return gF.k < 0 ? 'pre' : gF.k === 0 ? 'entry' : inSch(gF) || inSch(gO) ? 'school' : 'adult';
}

export function schoolTitle(y, today) {
  const { focus: F, other: O } = seasonYears(today);
  const s = schoolOf(y), gF = gradeInYear(s.base, F), gO = gradeInYear(s.base, O);
  const aF = agesInYear(y, F), aO = agesInYear(y, O);
  const kind = schoolKind(y, today);
  if (kind === 'pre') return fit(`${y}년생 몇 학년? ${F}년 미취학(만 ${aF.man}세) — 초등학교 입학 ${s.elem}년 3월·고등 졸업 ${s.hsGrad}년`, y);
  if (kind === 'entry') return fit(`${y}년생 ${F}년 몇 학년? 초등학교 입학(초1) — ${O}년 ${shortG(gO)}, 만 ${aF.man}세·고등 졸업 ${s.hsGrad}년`, y);
  if (kind === 'school') return fit(`${y}년생 ${F}년 몇 학년? ${gF.label}(${O}년 ${shortG(gO)}) — 입학 ${s.elem}년·졸업 ${s.hsGrad}년, 만 나이`, y);
  return fit(`${y}년생 나이는? ${F}년 만 ${aF.man}세(${O}년 ${aO.man}세) — 입학 ${s.elem}년·졸업 ${s.hsGrad}년·${s.hakbun}학번`, y);
}

export function schoolDesc(y, today, ddiWord) {
  const { focus: F, other: O } = seasonYears(today);
  const s = schoolOf(y), e = schoolOf(y, 1), gF = gradeInYear(s.base, F), gO = gradeInYear(s.base, O);
  const aF = agesInYear(y, F), aO = agesInYear(y, O);
  const kind = schoolKind(y, today);
  if (kind === 'pre') return `${y}년생은 ${F}년 미취학(만 ${aF.man}세, 연나이 ${aF.yeon}세). 초등학교 입학 ${s.elem}년 3월, 중학교 ${s.mid}년, 고등학교 ${s.high}년, 수능 ${s.suneung}년, 대학 ${s.univ}년(${s.hakbun}학번). ${Math.min(F, O)}·${Math.max(F, O)}년 학년과 나이, 성년이 되는 해까지.`;
  if (kind !== 'adult') return `${y}년생은 ${F}학년도(${F}년 3월~${F + 1}년 2월) ${gF.label}, ${O}학년도 ${gO.label}. ${F}년 만 ${aF.man}세(연나이 ${aF.yeon}세). 초등학교 입학 ${s.elem}년, 중학교 ${s.mid}년, 고등학교 ${s.high}년, 수능 ${s.suneung}년, 대학 ${s.univ}년(${s.hakbun}학번).`;
  const early = e.early ? ` 1~2월생은 빠른 ${pad2(y % 100)}(${e.elem}년 입학·${e.hakbun}학번).` : y === EARLY_OPTIONAL_YEAR ? ' 1~2월생 조기입학 시 2002년생과 같은 학년.' : '';
  return `${y}년생은 ${F}년 만 ${aF.man}세(연나이 ${aF.yeon}세, 세는나이 ${aF.se}세), ${O}년 만 ${aO.man}세, ${ddiWord}. 초등학교 입학 ${s.elem}년, 고등학교 졸업 ${s.hsGrad}년, 대학 ${s.univ}년(${s.hakbun}학번).${early} 성년·국민연금 받는 해까지.`;
}

export function buildSchool(c) {
  const { shell, write, pad, today, Y0, Y1, SAJU, yearUrl, ddiOfYear, colorDdi, crumbs } = c;
  const MOMJA = 'https://bodyzip.com';
  const Y1s = today.y;
  const sy = schoolYearOf(today);
  const { focus: F, other: O, pair: [A, B] } = seasonYears(today);   /* 두 학년도 A<B, 앞세우는 해 F, 나머지 O */
  const past = (yr, mo) => today.y > yr || (today.y === yr && today.m >= mo);
  const status = (yr, mo) => (past(yr, mo) ? '지남' : yr === today.y ? '올해' : `${yr - today.y}년 뒤`);
  const shortOf = (y) => { const g = gradeInYear(schoolOf(y).base, F); return g.k < 12 ? shortG(g) : `만 ${agesInYear(y, F).man}세`; };   /* 앞세운 학년도(F) 기준 */
  const lbl = (g) => (g.stage === 'univ' ? `${g.label}(재수·휴학 없이)` : g.label);
  const yLink = (y, text) => (y >= Y0 && y <= Y1 ? `<a href="${yearUrl(y)}">${text || y + '년생'}</a>` : (text || y + '년생'));
  const sajuDdi = (y) => { const d = ddiOfYear(y); return y >= 1945 && y <= 2010 ? `<a href="${SAJU}/2027/ddi/${d.slug}/${y}/"><b>사주첩 ${y}년생 ${d.animal} 2027년 운세</b></a>` : `<a href="${SAJU}/2027/ddi/${d.slug}/"><b>사주첩 ${d.animal} 2027년 운세</b></a>`; };
  const ruleNote = `학년은 매년 3월에 올라가고 졸업은 2월입니다. 취학 유예·조기 입학·재수·휴학·군 복무에 따라 실제와 다를 수 있으며, 참고용으로 봐 주세요.`;

  /* ---------- 출생연도 페이지 ---------- */
  function yearSchoolPage(y) {
    const url = schoolUrl(y);
    const s = schoolOf(y), e = schoolOf(y, 1), g = gradeOn(s.base, today);
    const yeon = today.y - y, man = manRange(y, today);
    const ddi = ddiOfYear(y), color = colorDdi(y), yy = pad(y % 100);
    const grades = gradeList(s.base);
    const legal = legalAges(y);
    const inSchool = g.k >= 0 && g.k < 12;
    const twoCol = e.early;
    const optional = y === EARLY_OPTIONAL_YEAR;
    const child = g.stage === 'pre' || g.stage === 'elem' || g.stage === 'mid';
    const title = schoolTitle(y, today), desc = schoolDesc(y, today, color);
    const kind = schoolKind(y, today);
    const gF = gradeInYear(s.base, F), gO = gradeInYear(s.base, O), aF = agesInYear(y, F), aO = agesInYear(y, O);
    const headline = kind === 'pre' ? `${F}년 미취학, ${s.elem}년 3월 초등학교 입학`
      : kind === 'entry' ? `${F}년 3월 초등학교 입학 (${F}학년도 초1)`
        : kind === 'school' ? `${F}학년도 ${gF.label}, ${O}학년도 ${gO.label}`
          : `${F}년 만 ${aF.man}세, ${s.hakbun}학번`;
    /* 두 학년도 문장 — 둘 다 미취학이면 나이, 어른이면 오늘이 아닌 쪽 해의 나이 */
    const gA = gradeInYear(s.base, A), gB = gradeInYear(s.base, B), aA = agesInYear(y, A), aB = agesInYear(y, B);
    const otherY = F !== today.y ? F : O, aX = agesInYear(y, otherY);
    const pairSentence = gA.k < 0 && gB.k < 0 ? ` ${F}년 기준으로는 연나이 ${aF.yeon}세, 만 ${aF.man}세입니다.`
      : [gA, gB].some((x) => x.k >= 0 && x.k <= 15) ? ` ${A}학년도(${A}년 3월 ~ ${A + 1}년 2월)에는 ${lbl(gA)}, <strong>${B}학년도(${B}년 3월 ~ ${B + 1}년 2월)에는 ${lbl(gB)}</strong>입니다.`
        : ` <strong>${otherY}년 기준으로는 만 ${aX.man}세</strong>(연나이 ${aX.yeon}세, 세는나이 ${aX.se}세)입니다.`;
    const cell = (Y, f) => (Y < y ? '출생 전' : f());
    const pairRows = [
      ['학년도', (Y) => `${Y}년 3월 ~ ${Y + 1}년 2월`],
      ['학년', (Y) => cell(Y, () => { const x = gradeInYear(s.base, Y); return `<b>${x.label}</b>${x.stage === 'univ' ? ' <span class="note">재수·휴학 없이</span>' : ''}`; })],
      ['연나이', (Y) => cell(Y, () => `${agesInYear(y, Y).yeon}세 <span class="note">1월 1일부터</span>`)],
      ['만 나이', (Y) => cell(Y, () => { const a = agesInYear(y, Y); return Y === y ? '0세' : `생일 전 ${a.manLo}세 · 생일 후 <b>${a.manHi}세</b>`; })],
      ['세는나이', (Y) => cell(Y, () => `${agesInYear(y, Y).se}세`)]
    ].map(([name, f]) => `<tr><td>${name}</td><td>${f(A)}</td><td>${f(B)}</td></tr>`).join('\n');
    const nextLabel = inSchool && g.k < 11 ? grades[g.k + 1].label + (grades[g.k].last ? '으로 진학합니다' : '이 됩니다') : '';

    const lead = g.stage === 'pre'
      ? `${y}년에 태어난 아이는 <strong>${today.y}년 ${today.m}월</strong> 기준 <strong>미취학</strong>(만 ${man}세, 연나이 ${yeon}세)입니다. <strong>${s.elem}년 3월</strong>에 초등학교에 입학해 ${s.elemGrad}년 2월 졸업, ${s.mid}년 중학교, ${s.high}년 고등학교 입학, ${s.suneung}년 11월 수능, ${s.hsGrad}년 2월 고등학교 졸업 순서로 이어집니다. 재수 없이 대학에 가면 <strong>${s.univ}년 ${s.hakbun}학번</strong>입니다.`
      : inSchool
        ? `${y}년에 태어난 사람은 <strong>${today.y}년 ${today.m}월</strong> 기준 <strong>${g.label}</strong>입니다. ${s.elem}년 3월에 초등학교에 입학했고, ${past(s.suneung, 11) ? `${s.suneung}년 11월 수능을 거쳐 ` : `${s.suneung}년 11월 수능을 보고 `}${s.hsGrad}년 2월에 고등학교를 ${past(s.hsGrad, 2) ? '졸업했습니다' : '졸업합니다'}. 만 나이는 생일 전 ${yeon - 1}세·생일 후 ${yeon}세, 연나이 ${yeon}세, 세는나이 ${yeon + 1}세이고 ${color}입니다.`
        : `${y}년에 태어난 사람은 <strong>${today.y}년</strong> 기준 <strong>만 ${man}세</strong>(연나이 ${yeon}세, 세는나이 ${yeon + 1}세)이고 ${color}입니다. 초등학교는 ${s.elem}년 3월 입학, 고등학교는 ${s.hsGrad}년 2월 졸업, 재수 없이 대학에 갔다면 <strong>${s.univ}년 ${s.hakbun}학번</strong>입니다.${twoCol ? ` 1~2월생은 이른바 '빠른 ${yy}'에 해당해 한 해 먼저 ${e.elem}년에 입학했고 ${e.hakbun}학번입니다.` : ''}`;

    /* 사실 칸 — 앞세운 학년도(F)를 먼저, 나머지 해(O)는 아랫줄 */
    const facts = kind === 'adult'
      ? `<div class="fact hi"><small>만 나이 (${F}년)</small><b>${aF.man}세</b><i>${aF.yeon <= 0 ? '그 해 태어남' : `생일 전 ${aF.manLo} · 생일 후 ${aF.manHi}`}</i></div>
  <div class="fact"><small>만 나이 (${O}년)</small><b>${aO.man}세</b><i>${aO.yeon <= 0 ? '그 해 태어남' : `생일 전 ${aO.manLo} · 생일 후 ${aO.manHi}`}</i></div>
  <div class="fact"><small>연나이 / 세는나이 (${F}년)</small><b>${aF.yeon} / ${aF.se}세</b><i>${O}년 ${aO.yeon} / ${aO.se}세</i></div>`
      : `<div class="fact hi"><small>${F}학년도 (${F}년 3월~)</small><b>${gF.label}</b><i>${O}학년도 ${O >= y ? gO.label : '출생 전'}</i></div>
  <div class="fact"><small>만 나이 (${F}년)</small><b>${aF.man}세</b><i>${O >= y ? `${O}년 만 ${aO.man}세` : `생일 전 ${aF.manLo} · 생일 후 ${aF.manHi}`}</i></div>
  <div class="fact"><small>연나이 / 세는나이 (${F}년)</small><b>${aF.yeon} / ${aF.se}세</b><i>${F} − ${y}</i></div>`;

    const ms = [
      ['초등학교 입학 (1학년)', (o) => `${o.elem}년 3월`, s.elem, 3],
      ['초등학교 6학년', (o) => `${o.elem + 5}년`, s.elem + 5, 3],
      ['초등학교 졸업', (o) => `${o.elemGrad}년 2월`, s.elemGrad, 2],
      ['중학교 입학 (1학년)', (o) => `${o.mid}년 3월`, s.mid, 3],
      ['중학교 3학년', (o) => `${o.mid + 2}년`, s.mid + 2, 3],
      ['중학교 졸업', (o) => `${o.midGrad}년 2월`, s.midGrad, 2],
      ['고등학교 입학 (1학년)', (o) => `${o.high}년 3월`, s.high, 3],
      ['고등학교 3학년 · 수능', (o) => `${o.suneung}년 (수능 11월)`, s.suneung, 11],
      ['고등학교 졸업', (o) => `${o.hsGrad}년 2월`, s.hsGrad, 2],
      ['대학 입학 (재수 없이)', (o) => `${o.univ}년 3월 · <b>${o.hakbun}학번</b>`, s.univ, 3],
      ['대학 졸업 (4년제)', (o) => `${o.univGrad}년 2월`, s.univGrad, 2]
    ];
    const msRows = ms.map(([name, f, yr, mo]) => `<tr><td>${name}</td><td>${f(s)}</td>${twoCol ? `<td>${f(e)}</td>` : ''}<td class="note">${status(yr, mo)}</td></tr>`).join('\n');
    const gRows = grades.map((x) => { const cur = inSchool && x.k === g.k, fx = x.year === F && F !== sy; return `<tr${cur || fx ? ' class="sub"' : ''}><td>${x.year}년 3월 ~ ${x.year + 1}년 2월</td><td>${cur ? `<b>${x.label}</b> <span class="note">← 지금</span>` : fx ? `<b>${x.label}</b> <span class="note">← ${F}학년도</span>` : x.label}</td><td>${x.year - y}세</td>${twoCol ? `<td>${x.year - 1}년 3월 ~ ${x.year}년 2월</td>` : ''}</tr>`; }).join('\n');
    const legalRows = legal.map((r) => `<tr><td>${r.name}${r.note ? `<br><span class="note">${r.note}</span>` : ''}</td><td>${r.basis === '연' ? '연나이' : '만'} ${r.age}세</td><td><b>${r.year}년</b> <span class="note">${r.basis === '연' ? '1월 1일부터' : '생일부터'}</span></td><td class="note">${r.year < today.y ? '지남' : r.year === today.y ? '올해' : `${r.year - today.y}년 뒤`}</td></tr>`).join('\n');

    const now = g.stage === 'pre'
      ? `<strong>${today.y}년 ${today.m}월</strong> 기준 아직 초등학교에 들어가기 전(만 ${man}세)입니다. <strong>${g.detail}</strong>이며, 입학하는 해 3월에 연나이 7세가 됩니다.`
      : inSchool
        ? `${today.y}년 ${today.m}월 기준 <strong>${g.label}</strong>입니다. ${g.sy}학년도(${g.sy}년 3월 ~ ${g.sy + 1}년 2월)이고, ${g.k === 11 ? `${s.hsGrad}년 2월에 고등학교를 졸업합니다` : `${g.sy + 1}년 3월부터 ${nextLabel}`}.`
        : g.stage === 'univ'
          ? `고등학교를 ${s.hsGrad}년 2월에 졸업했습니다. 재수·휴학 없이 4년제 대학에 갔다면 ${today.y}년 ${today.m}월 기준 <strong>대학 ${g.k - 11}학년</strong>(${s.hakbun}학번)이고, ${s.univGrad}년 2월에 졸업합니다.`
          : `고등학교는 ${s.hsGrad}년 2월에 졸업했고, 재수 없이 대학에 갔다면 ${s.univ}년 입학 ${s.hakbun}학번, ${s.univGrad}년 2월 졸업입니다. ${today.y}년 기준 만 ${man}세입니다.`;
    const classmates = y < EARLY_LAST_YEAR ? `같은 학년은 ${y}년 3월생부터 ${y + 1}년 2월생까지입니다.` : y === EARLY_LAST_YEAR ? `같은 학년은 ${y}년 3~12월생입니다(2003년 1~2월생부터는 다음 학년).` : `같은 학년은 ${y}년 1월생부터 12월생까지입니다.`;

    const earlySection = twoCol ? `
<section>
<h2>${y}년 1~2월생 — '빠른 ${yy}'</h2>
<p>${y}년 1~2월생은 옛 초·중등교육법의 "만 6세가 된 날의 다음 날 이후 첫 학년초(3월 1일)" 규정에 따라 <strong>${y - 1}년생과 같은 학년</strong>으로 ${e.elem}년 3월에 입학했습니다. 이른바 '빠른 ${yy}'에 해당하며, 고등학교 졸업은 ${e.hsGrad}년 2월, 재수 없이 대학에 갔다면 <strong>${e.hakbun}학번</strong>입니다. 위 표의 '1~2월생' 열이 이 경우입니다.</p>
<p class="note">빠른 년생은 2007년 법 개정으로 2009학년도 입학생부터 없어졌고, ${EARLY_LAST_YEAR}년 1~2월생이 마지막입니다. 취학 유예나 조기 입학을 했다면 실제 학년은 다를 수 있습니다.</p>
</section>` : optional ? `
<section>
<h2>2003년 1~2월생 — 빠른 년생이 없어진 첫해</h2>
<p>2003년생부터는 1~2월생도 같은 해 3~12월생과 함께 <strong>${s.elem}년 3월</strong>에 입학하는 것이 법 기준입니다. 2007년에 개정된 초·중등교육법이 "만 6세가 되는 해의 다음 해 3월 1일"을 취학일로 정했고, 2009학년도 입학생부터 적용됐기 때문입니다. 다만 개정 첫해에는 만 5세 조기입학을 신청만으로 할 수 있어서, 2003년 1~2월생 가운데 <strong>2009년에 입학해 2002년생과 같은 학년</strong>이 된 경우('빠른 03')도 있습니다. 그렇다면 초등학교 입학 2009년, 고등학교 졸업 2021년 2월, 21학번으로 위 표보다 한 해씩 앞당겨 보면 됩니다.</p>
</section>` : '';

    const faq3 = y + 19 <= today.y
      ? `<h3>${y}년생 국민연금은 언제부터 받나요?</h3><p>${y}년생의 국민연금 노령연금 수급 개시 연령은 만 ${pensionAge(y)}세로, ${y + pensionAge(y)}년 생일부터입니다. 기초연금과 지하철 무임승차 같은 노인 복지 기준은 만 65세(${y + 65}년)입니다.</p>`
      : `<h3>${y}년생은 언제 성인이 되나요?</h3><p>민법상 성년은 만 19세로 ${y + 19}년 생일부터입니다. 술·담배는 청소년보호법이 연나이를 쓰기 때문에 ${y + 19}년 1월 1일부터 살 수 있고, 투표와 운전면허(1종·2종 보통)는 만 18세인 ${y + 18}년 생일부터, 주민등록증은 만 17세인 ${y + 17}년부터 발급받습니다.</p>`;
    /* 앞세운 학년도(F) 질문 — 반대쪽 해(O)는 지난 해면 '이었습니다', 다음 해면 '이 됩니다' */
    const oTxt = O < y ? '' : O < F ? ` ${O}학년도에는 ${lbl(gO)}이었습니다.` : ` ${O}학년도(${O}년 3월부터)에는 ${lbl(gO)}${gO.stage === 'done' ? '한 나이입니다' : '이 됩니다'}.`;
    const faq1 = gF.k < 0 ? `${F}년에는 아직 미취학입니다(연나이 ${aF.yeon}세, 만 ${aF.man}세). ${s.elem}년 3월에 초등학교 1학년이 됩니다.`
      : gF.k <= 11 ? `${F}학년도(${F}년 3월 ~ ${F + 1}년 2월) 기준 ${gF.label}입니다.${oTxt} 학년은 3월에 바뀌므로 ${F}년 1~2월에는 아직 ${F - 1}학년도 학년입니다. ${F}년 나이는 연나이 ${aF.yeon}세, 만 ${aF.man}세입니다.`
        : gF.k <= 15 ? `${F}학년도에는 고등학교를 마친 나이(${s.hsGrad}년 2월 졸업)로, 재수·휴학 없이 4년제 대학에 갔다면 ${gF.label}(${s.hakbun}학번)입니다. ${F}년 나이는 연나이 ${aF.yeon}세, 만 ${aF.man}세입니다.`
          : `이미 고등학교를 졸업한 나이입니다(${s.hsGrad}년 2월 졸업). ${F}년 나이는 연나이 ${aF.yeon}세, 만 ${aF.man}세(생일 전 ${aF.manLo}세·생일 후 ${aF.manHi}세), 세는나이 ${aF.se}세입니다.`;

    const near = [];
    for (let z = y - 6; z <= y + 6; z++) if (z >= SCHOOL_Y0 && z <= Y1s) near.push(`<a href="${schoolUrl(z)}"${z === y ? ' class="cur"' : ''}><b>${z}년생</b><small>${shortOf(z)}</small></a>`);

    const body = `
<div class="overline"><a href="/school/">생일첩 · 학년 계산</a> · ${yLink(y)}</div>
<h1>${y}년생 — ${headline}</h1>
<p class="lead">${lead}${pairSentence}</p>
<div class="facts">
  ${facts}
  <div class="fact"><small>초등학교 입학</small><b>${s.elem}년 3월</b><i>${twoCol ? `1~2월생 ${e.elem}년 (빠른 ${yy})` : '1~2월생 동일'}</i></div>
  <div class="fact"><small>고등학교 졸업</small><b>${s.hsGrad}년 2월</b><i>수능 ${s.suneung}년 11월</i></div>
  <div class="fact"><small>학번 · 띠</small><b>${s.hakbun}학번</b><i>${color}</i></div>
</div>

<section>
<h2>${y}년생 ${A}년·${B}년 학년과 나이</h2>
<div class="tw"><table><thead><tr><th></th><th>${A === F ? '<b>' + A + '년</b>' : A + '년'}</th><th>${B === F ? '<b>' + B + '년</b>' : B + '년'}</th></tr></thead><tbody>
${pairRows}
</tbody></table></div>
<p class="note">학년은 3월 1일에 올라가므로 ${B}년 1~2월에는 아직 ${A}학년도 학년입니다. 연나이는 그 해 1월 1일에, 만 나이는 생일에 한 살 늘어납니다. ${today.y}년 ${today.m}월 지금은 만 ${man}세(연나이 ${yeon}세)입니다.</p>
</section>

<section>
<h2>${y}년생 학교 입학·졸업 연도</h2>
<div class="tw"><table><thead><tr><th>과정</th><th>${twoCol ? '3~12월생' : '연도'}</th>${twoCol ? `<th>1~2월생 (빠른 ${yy})</th>` : ''}<th>지금</th></tr></thead><tbody>
${msRows}
</tbody></table></div>
<p class="note">${classmates} ${ruleNote} 남성은 군 복무 기간만큼 대학 졸업이 늦어져 보통 ${s.univGradMil}년 전후에 졸업합니다.${!twoCol && !optional && y > EARLY_OPTIONAL_YEAR ? ' 2003년생부터는 1~2월생도 같은 해 출생자와 함께 입학합니다(빠른 년생 폐지).' : ''}</p>
</section>

<section>
<h2>${y}년생은 지금 몇 학년인가요?</h2>
<p>${now}</p>
<div class="tw"><table><thead><tr><th>학년도</th><th>학년</th><th>연나이</th>${twoCol ? '<th>1~2월생 학년도</th>' : ''}</tr></thead><tbody>
${gRows}
</tbody></table></div>
<p class="note">학년도는 3월 1일에 시작해 다음 해 2월 말에 끝납니다. 1~2월은 아직 이전 학년도입니다. 연나이는 그 학년도가 시작하는 해 기준입니다.</p>
</section>

<section>
<h2>${y}년생이 어른이 되는 해 — 법적 기준 나이</h2>
<div class="tw"><table><thead><tr><th>기준</th><th>나이</th><th>연도</th><th></th></tr></thead><tbody>
${legalRows}
</tbody></table></div>
<p class="note">현행 법령 기준입니다. 만 나이는 생일이 지나야 하고, 연나이는 그 해 1월 1일부터 적용됩니다. 과거에는 성년이 만 20세(2013년 6월까지), 선거권이 만 20세(2005년까지)·만 19세(2019년까지)였으므로 이미 지난 연도는 당시 기준과 다를 수 있습니다. 청소년 관람불가 영화는 만 18세 이상이라도 고등학교 재학생은 볼 수 없습니다. 실제 적용은 해당 기관의 안내를 확인하세요.</p>
</section>
${earlySection}
${y === F - 7 ? entryBox(F) : ''}
<section>
<h2>다른 출생연도</h2>
<div class="grid">${near.join('')}</div>
<p class="note">학년·나이는 ${F}학년도·${F}년 기준입니다.</p>
<p class="note"><a href="/school/">${SCHOOL_Y0}~${Y1s}년생 전체 · 학년 계산기</a></p>
</section>

<section>
<h2>자주 묻는 질문</h2>
<h3>${y}년생은 ${F}년에 ${kind === 'adult' ? '몇 살인가요' : '몇 학년인가요'}?</h3>
<p>${faq1}</p>
<h3>${y}년생 초등학교 입학 연도와 학번은?</h3>
<p>${s.elem}년 3월 초등학교 입학, ${s.hsGrad}년 2월 고등학교 졸업, 재수 없이 대학에 갔다면 ${s.univ}년 입학 ${s.hakbun}학번입니다.${twoCol ? ` 1~2월생(빠른 ${yy})은 ${e.elem}년 입학, ${e.hakbun}학번입니다.` : ''}</p>
${faq3}
</section>

<p class="callout">${child ? `자라는 아이의 예상 키는 부모 키로 계산하는 <a href="${MOMJA}/child-height/"><b>바디집 아이 키 예측</b></a>에서, ${ddi.animal} 아이의 2027년 흐름은 ${sajuDdi(y)}에서 볼 수 있습니다.` : `${y}년생 ${ddi.animal}의 2027년 흐름은 ${sajuDdi(y)}에서, 태어난 날까지 넣은 사주는 <a href="${SAJU}/">사주첩</a>에서 볼 수 있습니다.`}</p>
<p class="pn">${y - 1 >= SCHOOL_Y0 ? `<a href="${schoolUrl(y - 1)}">← ${y - 1}년생</a>` : '<span></span>'}${y + 1 <= Y1s ? `<a href="${schoolUrl(y + 1)}">${y + 1}년생 →</a>` : '<span></span>'}</p>
<p class="note">${yLink(y, `${y}년생 나이·띠·기념일`)} · <a href="/ddi/${ddi.slug}/">${ddi.animal} 해와 나이</a> · <a href="/age/">만 나이 계산기</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
`;
    c.lastmod[url] = SEASON_DATE;
    write(url, shell({
      url, title, desc, body,
      jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '학년 계산', url: '/school/' }, { name: `${y}년생`, url }]),
        { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, datePublished: SCHOOL_PUBLISHED, dateModified: SEASON_DATE, inLanguage: 'ko', author: { '@type': 'Organization', name: '생일첩' }, publisher: { '@type': 'Organization', name: '생일첩' }, mainEntityOfPage: c.SITE + url }]
    }));
  }

  /* ---------- 인덱스 · 학년 계산기 ---------- */
  function indexPage() {
    const url = '/school/';
    /* 학년별 출생연도 — 앞세운 학년도(F)와 나머지 학년도(O)를 나란히. 출생연도 = 학년도 − 7 − k */
    const byLink = (by) => `<a href="${schoolUrl(by)}">${by}년생</a>${by <= EARLY_LAST_YEAR ? ` <span class="note">+ ${by + 1}년 1~2월생</span>` : ''}`;
    const gradeRows = gradeList(F - 7).map((x) => { const by = F - 7 - x.k; return `<tr><td><b>${x.label}</b></td><td>${byLink(by)}</td><td>${byLink(O - 7 - x.k)}</td><td>${agesInYear(by, F).man}세</td><td>${by + 19}년 · ${pad2((by + 19) % 100)}학번</td></tr>`; }).join('\n');
    const preRow = `<tr><td>미취학 <span class="note">(다음 해 입학)</span></td><td>${byLink(F - 6)}</td><td>${byLink(O - 6)}</td><td>${agesInYear(F - 6, F).man}세</td><td>${F + 13}년 · ${pad2((F + 13) % 100)}학번</td></tr>`;
    const decades = [];
    for (let d0 = SCHOOL_Y0; d0 <= Y1s; d0 += 10) {
      const ys = [];
      for (let y = d0; y < d0 + 10; y++) if (y >= SCHOOL_Y0 && y <= Y1s) ys.push(`<a href="${schoolUrl(y)}"><b>${y}</b><small>${shortOf(y)}</small></a>`);
      decades.push(`<h3>${d0}년대생</h3><div class="grid g6">${ys.join('')}</div>`);
    }
    const title = `학년 계산기 — ${F}년 몇 학년(${O}년 함께), 출생연도별 초·중·고 입학·졸업·학번`;
    const desc = `출생연도를 넣으면 ${F}학년도와 ${O}학년도에 몇 학년인지, ${F}년 초등학교 입학 나이(${F - 7}년생), 초·중·고 입학과 졸업 연도, 수능 연도, 학번, 성년이 되는 해를 계산합니다. 빠른 년생(2002년생까지 1~2월생) 반영, ${SCHOOL_Y0}~${Y1s}년생.`;
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>학년 계산기 — ${F}년 몇 학년</h1>
<p class="lead">출생연도를 고르면 <strong>${F}학년도(${F}년 3월 ~ ${F + 1}년 2월)와 ${O}학년도에 몇 학년인지</strong>, 초등학교·중학교·고등학교 입학과 졸업 연도, 수능 연도, 학번, 그리고 주민등록증·투표·운전면허·성년처럼 <strong>법적으로 어른이 되는 해</strong>를 계산합니다. 2002년생까지의 1~2월생(빠른 년생)도 반영합니다. 계산은 브라우저 안에서만 이뤄지고 아무것도 저장되지 않습니다. 오늘(${today.y}년 ${today.m}월)은 ${sy}학년도이고, 학년은 3월 1일에 올라갑니다.</p>
<form class="form" id="school-form">
  <div class="row"><select name="y" data-min="${SCHOOL_Y0}" data-max="${Y1s}" aria-label="출생연도"></select><select name="m" aria-label="출생 월"></select></div>
  <button type="submit">학년·입학 연도 계산하기</button>
</form>
<div id="school-out" class="out" hidden></div>
<section>
<h2>${F}학년도 학년별 출생연도 (${O}학년도 함께)</h2>
<div class="tw"><table><thead><tr><th>학년</th><th><b>${F}학년도</b></th><th>${O}학년도</th><th>만 나이 (${F}년)</th><th>대학 입학</th></tr></thead><tbody>
${preRow}
${gradeRows}
</tbody></table></div>
<p class="note">${F}학년도는 ${F}년 3월 ~ ${F + 1}년 2월, ${O}학년도는 ${O}년 3월 ~ ${O + 1}년 2월입니다. 만 나이와 대학 입학은 ${F}학년도 출생연도 기준이고, 만 나이는 생일 전이면 앞의 숫자, 생일이 지났으면 뒤의 숫자입니다. 출생연도를 누르면 그 해 태어난 사람의 입학·졸업 연도표와 법적 나이가 나옵니다.</p>
</section>
${entryBox(F)}
<section>
<h2>학년 계산 기준</h2>
<p><strong>초등학교 입학</strong>은 초·중등교육법에 따라 만 6세가 되는 해의 다음 해 3월 1일, 즉 <strong>출생연도 + 7년 3월</strong>입니다. 초등학교 6년, 중학교 3년, 고등학교 3년이 이어지고 모두 3월에 입학해 2월에 졸업합니다. 수능은 고3 11월, 학번은 대학 입학 연도의 뒤 두 자리입니다. 4년제 대학은 입학 4년 뒤 2월에 졸업하고, 남성은 군 복무 기간만큼 늦어집니다.</p>
<h3>빠른 년생 (1~2월생)</h3>
<p>2007년 법 개정 전에는 "만 6세가 된 날의 다음 날 이후 첫 학년초"에 입학했기 때문에 1~2월생이 전년도 출생자와 같은 학년이 됐습니다. 그래서 생긴 말이 '빠른 95', '빠른 02' 같은 <strong>빠른 년생</strong>입니다. 개정 규정은 2009학년도 입학생부터 적용되어 <strong>${EARLY_LAST_YEAR}년 1~2월생이 마지막 빠른 년생</strong>이고, 2003년생부터는 1~2월생도 같은 해 출생자와 함께 입학합니다. 2003년 1~2월생은 폐지 첫해 조기입학으로 2002년생과 같은 학년이 된 경우도 있어 <a href="${schoolUrl(2003)}">2003년생 페이지</a>에서 두 경우를 함께 보여 줍니다.</p>
<h3>만 나이 통일 (2023년 6월 28일)</h3>
<p>행정기본법·민법 개정으로 별도 규정이 없으면 나이는 만 나이입니다. 다만 취학 연령(초·중등교육법), 술·담배 구매(청소년보호법), 병역판정검사(병역법)는 여전히 "그 해에 몇 살이 되는가"라는 연나이 방식이라 학년 계산에는 달라진 것이 없습니다. 성년·투표·운전면허·주민등록증은 생일이 지나야 하는 만 나이 기준입니다.</p>
</section>
<section id="years">
<h2>출생연도로 찾기</h2>
<p class="note">칸 아래 학년·나이는 ${F}학년도·${F}년 기준입니다.</p>
${decades.join('')}
</section>
<section>
<h2>자주 묻는 질문</h2>
<h3>${F}년 초등학교 입학은 몇 년생인가요? 입학 나이는?</h3>
<p>${F - 7}년생입니다. ${F - 7}년 1월 1일부터 12월 31일까지 태어난 아이가 ${F}년 3월에 함께 입학합니다. ${F}년 연나이로 7세이고, 만 나이로는 입학하는 3월 1일에 1월 1일~3월 1일생은 만 7세, 그 뒤에 태어난 아이는 만 6세입니다. 취학통지서는 보통 입학 전 해 12월에 주소지 주민센터를 통해 오고, 예비소집은 보통 1월에 학교별로 열립니다.</p>
<h3>${F}년 중학교 1학년·고등학교 1학년·고3은 몇 년생인가요?</h3>
<p>${F}학년도 기준 중학교 1학년은 ${F - 13}년생, 고등학교 1학년은 ${F - 16}년생, 고3(${F}년 11월 수능)은 ${F - 18}년생입니다. ${O}학년도에는 초등학교 1학년 ${O - 7}년생, 중학교 1학년 ${O - 13}년생, 고등학교 1학년 ${O - 16}년생, 고3 ${O - 18}년생입니다.</p>
<h3>1~2월생은 몇 학년인가요?</h3>
<p>2003년생부터는 3~12월생과 같은 학년입니다. 2002년생까지는 1~2월생이 한 해 위 학년(빠른 년생)이었습니다. 예를 들어 1995년 2월생은 1994년생과 같이 2001년에 입학해 13학번, 1995년 5월생은 2002년에 입학해 14학번입니다.</p>
<h3>학년은 언제 바뀌나요?</h3>
<p>매년 3월 1일에 새 학년도가 시작됩니다. 1~2월은 아직 이전 학년이라, 1월에 "몇 학년"을 물으면 지난해 3월에 올라간 학년으로 답하면 됩니다.</p>
</section>
<p class="note"><a href="/suneung/">수능 D-day(시험일까지 남은 날)</a> · <a href="/age/">만 나이 계산기</a> · <a href="/dday/">디데이·100일 계산기</a> · <a href="/cal/${today.y}/">${today.y}년 달력·공휴일</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
`;
    c.lastmod[url] = SEASON_DATE;
    write(url, shell({ url, title, desc, body, extraBody: '<script src="/js/tools.js" defer></script>', jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '학년 계산기', url }]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: '학년 계산기', url: c.SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0' } }] }));
  }

  /* ---------- 실행 ---------- */
  for (let y = SCHOOL_Y0; y <= Y1s; y++) yearSchoolPage(y);
  indexPage();
  return { SCHOOL_Y0, SCHOOL_Y1: Y1s, sy, F, O };
}
