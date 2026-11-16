/* 생일첩 허브 페이지 — 만나이 계산기(/age/), 디데이·100일 계산기(/dday/), 연도별 달력·공휴일(/cal/{y}/, /cal/{y}/{mm}/)
 * build.mjs 가 헬퍼를 담은 컨텍스트로 buildHubs(c) 를 호출한다. */
import { holidaysOf, samjaeOf, SUBST_NOTE, ALMANAC } from '../data/holidays.mjs';
import { spanDays, planLeave, yearCounts } from './leave.mjs';

/* 2026-11-16 연도 달력(/cal/{y}/)에 공휴일 비고·연휴 표·FAQ 구조화 데이터, 연차 꿀팁(/holidays/{y}/)을 더한 날 — 이 페이지들의 lastmod.
 * 월 달력(/cal/{y}/{mm}/)은 그대로라 날짜를 바꾸지 않는다 */
export const HOL_DATE = '2026-11-16';
const LAW_HOL = 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B4%80%EA%B3%B5%EC%84%9C%EC%9D%98%EA%B3%B5%ED%9C%B4%EC%9D%BC%EC%97%90%EA%B4%80%ED%95%9C%EA%B7%9C%EC%A0%95';
const LAW_LSA = 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B7%BC%EB%A1%9C%EA%B8%B0%EC%A4%80%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9';

export function buildHubs(c) {
  const { shell, write, esc, pad, fmt, WD, today, Y0, Y1, SAJU, dayUrl, yearUrl, dn, weekday, dim, addDays, lunarOf, lunarNewYear, yearTerms, ddiOfYear, colorDdi, colorDdiShort, yearGanji, crumbs, M, Lunar, DDI } = c;
  const CAL_YEARS = [today.y, today.y + 1, today.y + 2];
  const calUrl = (y, m) => (m ? `/cal/${y}/${pad(m)}/` : `/cal/${y}/`);
  const W1 = (w) => WD[w].slice(0, 1);
  const uniq = (a) => [...new Set(a)];
  const shortName = (n) => (n.startsWith('대체공휴일') ? '대체공휴일' : n.replace(' 연휴', ''));
  const lunarToSolar = (y, m, d) => { Lunar.setLunarDate(y, m, d, false); const s = Lunar.getSolarCalendar(); return { y: s.year, m: s.month, d: s.day }; };
  const H = { lunarToSolar, weekday, addDays: (dt, n) => addDays(dt.y, dt.m, dt.d, n) };
  const holCache = {};
  const holidays = (y) => holCache[y] || (holCache[y] = holidaysOf(y, H));
  const leapMonthOf = (y) => { for (let m = 1; m <= 12; m++) if (Lunar.setLunarDate(y, m, 1, true)) return m; return 0; };
  const todayN = dn(today.y, today.m, today.d);
  const wdCls = (w) => (w === 0 ? 'sun' : w === 6 ? 'sat' : '');

  /* ---------- 연도의 모든 날 ---------- */
  const ydCache = {};
  function yearDays(y) {
    if (ydCache[y]) return ydCache[y];
    const hol = holidays(y);
    const terms = yearTerms(y);
    const out = [];
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= dim(y, m); d++) {
        const p = M.dayPillarOf(y, m, d);
        const w = weekday(y, m, d);
        const hs = hol.filter((h) => h.m === m && h.d === d);
        out.push({ y, m, d, w, n: dn(y, m, d), g: M.ganjiName(p.stem, p.branch), lun: lunarOf(y, m, d), hol: hs, terms: terms.filter((t) => t.m === m && t.d === d), off: w === 0 || w === 6 || hs.length > 0 });
      }
    }
    return (ydCache[y] = out);
  }

  /* 3일 이상 연휴 + 연차 하루 징검다리 */
  function breaks(y) {
    const days = yearDays(y);
    const runs = [];
    let cur = null;
    days.forEach((x, i) => {
      if (x.off) { if (!cur) cur = { s: i, e: i }; else cur.e = i; }
      else if (cur) { runs.push(cur); cur = null; }
    });
    if (cur) runs.push(cur);
    const names = (s, e) => uniq(days.slice(s, e + 1).flatMap((x) => x.hol.map((h) => shortName(h.name))));
    const long = runs.filter((r) => r.e - r.s + 1 >= 3).map((r) => ({ from: days[r.s], to: days[r.e], len: r.e - r.s + 1, names: names(r.s, r.e) }));
    const bridges = [];
    for (let i = 0; i + 1 < runs.length; i++) {
      if (runs[i + 1].s - runs[i].e - 1 !== 1) continue;
      const len = runs[i + 1].e - runs[i].s + 1;
      if (len >= 4) bridges.push({ day: days[runs[i].e + 1], from: days[runs[i].s], to: days[runs[i + 1].e], len, names: names(runs[i].s, runs[i + 1].e) });
    }
    return { long, bridges };
  }

  function cellLink(x) {
    if (x.n <= todayN && x.y >= Y0) return dayUrl(x.y, x.m, x.d);
    if (x.y <= today.y + 1) return `${SAJU}/day/${x.y}-${pad(x.m)}-${pad(x.d)}/`;
    return null;
  }
  const holShort = (h) => (h.kind === '대체공휴일' ? '대체휴일' : h.name.replace(' 연휴', '').replace(/^제\d+회 /, '').replace('전국동시', '').replace('국회의원 선거', '총선'));

  function calGrid(y, m) {
    const days = yearDays(y).filter((x) => x.m === m);
    const cells = [];
    for (let i = 0; i < weekday(y, m, 1); i++) cells.push('<span class="e"></span>');
    for (const x of days) {
      const cls = ['d', wdCls(x.w), x.hol.length ? 'hol' : '', x.lun && x.lun.son ? 'son' : '', x.terms.some((t) => t.jeol) ? 'term' : '', x.n === todayN ? 'today' : ''].filter(Boolean).join(' ');
      const sub = x.hol.length ? esc(holShort(x.hol[0])) : (x.terms.length ? x.terms[0].name : (x.lun ? (x.lun.leap ? '윤' : '') + x.lun.m + '.' + x.lun.d : ''));
      const inner = `${x.d}<small>${x.g.kor}</small><small>${sub}</small>`;
      const href = cellLink(x);
      cells.push(href ? `<a href="${href}" class="${cls}">${inner}</a>` : `<span class="${cls}">${inner}</span>`);
    }
    return `<div class="cal">${['일', '월', '화', '수', '목', '금', '토'].map((w, i) => `<span class="wd ${wdCls(i)}">${w}</span>`).join('')}${cells.join('')}</div>`;
  }
  const holTable = (hol) => `<div class="tw"><table><thead><tr><th>날짜</th><th>요일</th><th>공휴일</th><th></th></tr></thead><tbody>${hol.map((h) => { const w = weekday(h.y, h.m, h.d); return `<tr${h.kind === '대체공휴일' ? ' class="sub"' : ''}><td>${h.m}월 ${h.d}일</td><td class="${wdCls(w)}">${WD[w]}</td><td>${esc(h.name)}</td><td class="note">${h.kind === '대체공휴일' ? '대체공휴일' : (h.group === 'seol' || h.group === 'chuseok') ? '연휴' : h.group === 'election' ? '선거일' : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const iga = (w) => ((w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? '이' : '가');
  /* 연도 페이지용 공휴일 표 — 주말과 겹친 날과 그 대체공휴일을 비고에 */
  const holYearTable = (hol) => `<div class="tw"><table><thead><tr><th>날짜</th><th>요일</th><th>공휴일</th><th>비고</th></tr></thead><tbody>${hol.map((h) => {
    const w = weekday(h.y, h.m, h.d);
    const sb = hol.find((x) => x.kind === '대체공휴일' && x.on === `${h.y}-${h.m}-${h.d}` && x.base === h.name);
    const note = h.kind === '대체공휴일' ? `${esc(h.base.replace(' 연휴', ''))}${iga(h.base)} ${(() => { const [, mm, dd] = h.on.split('-').map(Number); const ww = weekday(h.y, mm, dd); return `${mm}월 ${dd}일 ${W1(ww)}요일과 겹쳐서`; })()}`
      : (w === 0 || w === 6) ? `${W1(w)}요일과 겹침 · ${sb ? `<b>${sb.m}월 ${sb.d}일(${W1(weekday(sb.y, sb.m, sb.d))})</b> 대체공휴일` : '대체공휴일 없음'}`
        : (h.group === 'seol' || h.group === 'chuseok') ? '연휴' : h.group === 'election' ? '선거일' : '';
    return `<tr${h.kind === '대체공휴일' ? ' class="sub"' : ''}><td>${h.m}월 ${h.d}일</td><td class="${wdCls(w)}">${WD[w]}</td><td>${esc(h.name)}</td><td class="note">${note}</td></tr>`;
  }).join('')}</tbody></table></div>`;
  const yearsNav = (cur) => `<div class="grid g3">${CAL_YEARS.map((y) => `<a href="${calUrl(y)}"${y === cur ? ' class="cur"' : ''}><b>${y}년</b><small>${colorDdiShort(y)}</small></a>`).join('')}</div>`;

  /* ---------- 연도 달력·공휴일 ---------- */
  function calYearPage(y) {
    const url = calUrl(y);
    const hol = holidays(y), days = yearDays(y);
    const g = yearGanji(y), ddi = ddiOfYear(y);
    const seol = hol.find((h) => h.name === '설날'), chu = hol.find((h) => h.name === '추석'), bud = hol.find((h) => h.name === '부처님오신날');
    const subs = hol.filter((h) => h.kind === '대체공휴일');
    const holDates = uniq(hol.map((h) => `${h.m}-${h.d}`));
    const weekdayHol = holDates.filter((k) => { const [m, d] = k.split('-').map(Number); const w = weekday(y, m, d); return w !== 0 && w !== 6; }).length;
    const { long, bridges } = breaks(y);
    const seolRun = long.find((b) => b.names.includes('설날')), chuRun = long.find((b) => b.names.includes('추석'));
    const sj = samjaeOf(y);
    const leapM = leapMonthOf(y);
    const terms = yearTerms(y).slice().sort((a, b) => a.jd - b.jd);
    const sonByMonth = Array.from({ length: 12 }, (_, i) => days.filter((x) => x.m === i + 1 && x.lun && x.lun.son).map((x) => x.d));
    const inSaju = y <= today.y + 1;
    const runTxt = (r, h) => (r ? `${r.from.m}월 ${r.from.d}일(${W1(r.from.w)}) ~ ${r.to.m}월 ${r.to.d}일(${W1(r.to.w)}) · ${r.len}일` : `${h.m}월 ${h.d - 1}일 ~ ${h.m}월 ${h.d + 1}일 · 3일`);
    const alm = ALMANAC[y];
    const leaveUrl = alm && y >= today.y ? `/holidays/${y}/` : null;
    const sundays = days.filter((x) => x.w === 0).length;
    const govTotal = days.filter((x) => x.w === 0 || x.hol.length).length;   /* 월력요항의 '공휴일' 셈 — 일요일 포함 */
    const restDays = days.filter((x) => x.off).length;
    const md = (h) => `${h.m}/${h.d}`;
    const runMd = (r, h) => (r ? `${r.from.m}/${r.from.d}~${r.to.m}/${r.to.d}` : `${h.m}/${h.d - 1}~${h.m}/${h.d + 1}`);
    const title = `${y}년 달력·공휴일 — 대체공휴일 ${subs.length}일, 설날·추석 연휴, 3일 이상 연휴 ${long.length}번 (${g.kor}년 ${colorDdi(y)})`;
    const desc = `${y} 공휴일 ${govTotal}일(일요일 포함), 대체공휴일 ${subs.length}일${subs.length ? '(' + subs.map(md).join('·') + ')' : ''}. 설 연휴 ${runMd(seolRun, seol)}, 추석 연휴 ${runMd(chuRun, chu)}, 3일 이상 연휴 ${long.length}번, 주 5일 기준 쉬는 날 ${restDays}일. ${leaveUrl ? '연차 붙이기 꿀팁, ' : '연차 하루로 길어지는 징검다리, '}24절기·손없는 날까지 ${y}년 달력 한 장에.`;
    const faq = [
      [`${y}년 공휴일은 며칠인가요?`, `일요일 ${sundays}일을 포함한 관공서 공휴일은 ${govTotal}일입니다. 일요일이 아닌 공휴일·대체공휴일이 ${govTotal - sundays}일이고, 그중 토요일과 겹치지 않아 실제로 평일에 쉬는 날은 ${weekdayHol}일입니다. 정부가 따로 지정하는 임시공휴일이 생기면 더 늘어납니다.`],
      [`${y}년 대체공휴일은 언제인가요?`, subs.length ? subs.map((h) => `${h.m}월 ${h.d}일(${W1(weekday(h.y, h.m, h.d))}, ${h.base.replace(' 연휴', '')})`).join(', ') + `로 모두 ${subs.length}일입니다.` : '토·일요일과 겹치는 대상 공휴일이 없어 대체공휴일이 없는 해입니다.'],
      [`${y}년 설 연휴와 추석 연휴는 언제인가요?`, `설 연휴는 ${runTxt(seolRun, seol)}, 추석 연휴는 ${runTxt(chuRun, chu)}입니다.`],
      [`${y}년에 쉬는 날은 모두 며칠인가요?`, `토·일요일만 쉬는 주 5일 근무 기준으로 ${restDays}일입니다. 토·일요일 ${days.filter((x) => x.w === 0 || x.w === 6).length}일에 평일 공휴일 ${weekdayHol}일을 더한 수입니다.`],
      [`${y}년 3일 이상 연휴는 몇 번인가요?`, `${long.length}번입니다. ${long.map((b) => `${b.from.m}/${b.from.d}~${b.to.m}/${b.to.d}`).join(', ')}.`]
    ];
    if (leaveUrl) faq.push([`${y}년 연차는 언제 쓰면 좋나요?`, `연휴 앞뒤의 징검다리 평일에 쓰면 적은 연차로 길게 쉴 수 있습니다. 날짜별 계산은 생일첩 '${y} 연차 꿀팁' 페이지에 정리했습니다.`]);
    const body = `
<div class="overline">생일첩 · 달력</div>
<h1>${y}년 달력 · 공휴일</h1>
<p class="lead">${y}년은 <strong>${g.kor}(${g.han})년 ${colorDdi(y)}</strong>의 해입니다. 공휴일은 일요일을 포함해 <strong>${govTotal}일</strong>(일요일과 겹치지 않는 공휴일·대체공휴일 ${govTotal - sundays}일)이고, 그중 평일에 드는 날이 <strong>${weekdayHol}일</strong>, 대체공휴일이 <strong>${subs.length}일</strong>입니다. 설날은 ${seol.m}월 ${seol.d}일(${WD[weekday(y, seol.m, seol.d)]}), 추석은 ${chu.m}월 ${chu.d}일(${WD[weekday(y, chu.m, chu.d)]})입니다.</p>
<div class="facts">
  <div class="fact hi"><small>공휴일 (일요일 포함)</small><b>${govTotal}일</b><i>평일 ${weekdayHol}일 · 대체 ${subs.length}일</i></div>
  <div class="fact"><small>설날 연휴</small><b>${seol.m}/${seol.d - 1}~${seol.m}/${seol.d + 1}</b><i>${seolRun ? seolRun.len + '일 쉼' : '3일'}</i></div>
  <div class="fact"><small>추석 연휴</small><b>${chu.m}/${chu.d - 1}~${chu.m}/${chu.d + 1}</b><i>${chuRun ? chuRun.len + '일 쉼' : '3일'}</i></div>
  <div class="fact"><small>3일 이상 연휴</small><b>${long.length}번</b><i>징검다리 ${bridges.length}곳</i></div>
  <div class="fact"><small>삼재</small><b>${sj.ddi.map((i) => DDI[i].kor).join('·')}띠</b><i>${sj.stage}</i></div>
  <div class="fact"><small>주말 포함 쉬는 날</small><b>${days.filter((x) => x.off).length}일</b><i>${y}년 ${days.length}일 중</i></div>
</div>
<p class="note">${yearsNav(y)}</p>
${leaveUrl ? `<p class="callout"><a href="${leaveUrl}"><b>${y} 연차 꿀팁</b> — 연휴마다 연차 며칠을 쓰면 며칠 쉬는지, 효율 순위와 연차 계산기 →</a></p>` : ''}

<section>
<h2>${y}년 공휴일 표</h2>
${holYearTable(hol)}
<p class="note">${SUBST_NOTE}</p>
<p class="note">${alm ? `출처: ${alm.by} '${y}년도 월력요항'(${alm.published.slice(0, 4)}년 ${+alm.published.slice(5, 7)}월 ${+alm.published.slice(8)}일 관보 게재)과 대조했습니다. 월력요항 기준 공휴일 ${alm.total}일, 3일 이상 연휴 ${alm.long}번, 주 5일 기준 쉬는 날 ${alm.rest}일로 이 페이지의 계산과 같습니다. <a href="${alm.href}" rel="noopener">한국천문연구원 ${y}년 달력자료</a> · <a href="${LAW_HOL}" rel="noopener">관공서의 공휴일에 관한 규정</a>` : `「<a href="${LAW_HOL}" rel="noopener">관공서의 공휴일에 관한 규정</a>」으로 계산한 날짜입니다.${y > today.y ? ` ${y}년 월력요항은 보통 ${y - 1}년 6월쯤 우주항공청이 발표하며, 발표되면 대조해 고칩니다.` : ''}`}</p>
</section>

<section>
<h2>연휴와 징검다리</h2>
<h3>3일 이상 연휴 ${long.length}번</h3>
${long.length ? `<div class="tw"><table><thead><tr><th>기간</th><th>쉬는 날</th><th>공휴일</th></tr></thead><tbody>${long.map((b) => `<tr${b.len >= 4 ? ' class="sub"' : ''}><td><b>${b.from.m}월 ${b.from.d}일(${W1(b.from.w)}) ~ ${b.to.m}월 ${b.to.d}일(${W1(b.to.w)})</b></td><td>${b.len}일</td><td class="note">${b.names.length ? b.names.join(', ') : '주말'}</td></tr>`).join('')}</tbody></table></div>` : '<p>없음</p>'}
<h3>연차 하루로 길어지는 날</h3>
<ul>${bridges.map((b) => `<li><b>${b.day.m}월 ${b.day.d}일(${W1(b.day.w)})</b>에 연차를 쓰면 ${b.from.m}월 ${b.from.d}일 ~ ${b.to.m}월 ${b.to.d}일 <b>${b.len}일</b> 연휴${b.names.length ? ' · ' + b.names.join(', ') : ''}</li>`).join('') || '<li>없음</li>'}</ul>
${leaveUrl ? `<p class="note">연차 2~4일로 9~10일을 쉬는 방법은 <a href="${leaveUrl}">${y} 연차 꿀팁</a>에 연휴별로 정리했습니다.</p>` : ''}
</section>

<section>
<h2>${y}년 월별 달력</h2>
<p class="note">날짜 아래는 그 날의 일진(60갑자)과 음력 날짜. 붉은 칸은 공휴일, 붉은 글씨 날짜는 절기(절입일), 테두리가 진한 날은 손없는 날입니다. 날짜를 누르면 ${y <= today.y ? '지난 날은 그 날 태어난 사람의 생일 페이지, ' : ''}${inSaju ? '앞으로의 날은 사주첩의 그 날 일진 풀이' : '상세 페이지'}로 이어집니다.</p>
${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `<h3><a href="${calUrl(y, m)}">${m}월</a> <span class="note">${uniq(hol.filter((h) => h.m === m).map((h) => shortName(h.name))).join(' · ')}</span></h3>${calGrid(y, m)}`).join('')}
</section>

<section>
<h2>설날·추석과 음력</h2>
<ul>
  <li><strong>설날</strong> (음력 1월 1일): ${seol.m}월 ${seol.d}일 ${WD[weekday(y, seol.m, seol.d)]} · 연휴 ${runTxt(seolRun, seol)}</li>
  <li><strong>부처님오신날</strong> (음력 4월 8일): ${bud.m}월 ${bud.d}일 ${WD[weekday(y, bud.m, bud.d)]}</li>
  <li><strong>추석</strong> (음력 8월 15일): ${chu.m}월 ${chu.d}일 ${WD[weekday(y, chu.m, chu.d)]} · 연휴 ${runTxt(chuRun, chu)}</li>
  <li><strong>윤달</strong>: ${leapM ? `음력 윤${leapM}월이 있는 해입니다.` : '없는 해입니다.'}</li>
</ul>
<p class="note">띠는 설날(${seol.m}월 ${seol.d}일)에 ${ddiOfYear(y - 1).animal}에서 ${ddi.animal}로 바뀌고, 사주에서는 입춘(${(() => { const t = terms.find((x) => x.name === '입춘'); return `${t.m}월 ${t.d}일 ${pad(t.hh)}:${pad(t.mm)}`; })()})부터 ${g.kor}년으로 봅니다. <a href="${yearUrl(Math.min(y, Y1))}">${Math.min(y, Y1)}년생 나이·띠 보기</a></p>
</section>

<section>
<h2>${y}년 24절기</h2>
<div class="tw"><table><thead><tr><th>절기</th><th>날짜</th><th>요일</th><th>시각(KST)</th></tr></thead><tbody>
${terms.map((t) => `<tr><td><b>${t.name}</b>${t.jeol ? ' <span class="note">절</span>' : ''}</td><td>${t.m}월 ${t.d}일</td><td class="${wdCls(weekday(t.y, t.m, t.d))}">${WD[weekday(t.y, t.m, t.d)]}</td><td>${pad(t.hh)}:${pad(t.mm)}</td></tr>`).join('')}
</tbody></table></div>
<p class="note">'절'로 표시한 12절기는 사주의 월주가 바뀌는 기준 시각입니다.${inSaju ? ` <a href="${SAJU}/jeolgi/${y}/">사주첩 ${y}년 절기 풀이</a>` : ''}</p>
</section>

<section>
<h2>${y}년 손없는 날</h2>
<div class="tw"><table><thead><tr><th>월</th><th>손없는 날 (양력)</th></tr></thead><tbody>
${sonByMonth.map((ds, i) => `<tr><td>${i + 1}월</td><td>${ds.map((d) => `<a href="${calUrl(y, i + 1)}">${d}일</a>`).join(', ') || '-'}</td></tr>`).join('')}
</tbody></table></div>
<p class="note">음력 9·10·19·20·29·30일이 손없는 날입니다. 이사·개업·혼례처럼 큰일을 잡을 때 참고하는 날입니다.${inSaju ? ` <a href="${SAJU}/son/${y}-01/">사주첩 손없는날 달력</a>` : ''}</p>
</section>

<section>
<h2>${y}년 삼재 띠</h2>
<p>${y}년 ${g.kor}년은 <strong>${sj.ddi.map((i) => DDI[i].animal).join('·')}</strong>의 <strong>${sj.stage}</strong>입니다. 삼재는 3년 동안 이어지며 들삼재(첫해)·눌삼재(둘째 해)·날삼재(마지막 해)로 부릅니다. ${sj.stage === '들삼재' ? '이 해에 들어와 ' + (y + 2) + '년에 나갑니다.' : sj.stage === '눌삼재' ? (y - 1) + '년에 들어와 ' + (y + 1) + '년에 나갑니다.' : (y - 2) + '년에 들어와 이 해에 나갑니다.'}</p>
<p class="note">삼재는 띠(연지)만 보는 민속 관념이고, 실제 운의 흐름은 사주 전체로 봅니다. <a href="${SAJU}/samjae/">사주첩 삼재 계산기</a></p>
</section>

<section>
<h2>자주 묻는 질문</h2>
${faq.map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`).join('\n')}
${leaveUrl ? `<p class="note"><a href="${leaveUrl}">${y} 연차 꿀팁 — 연휴별 연차 붙이기·연차 계산기</a></p>` : ''}
</section>

<section>
<h2>다른 해</h2>
${yearsNav(y)}
</section>
`;
    c.lastmod[url] = HOL_DATE;
    write(url, shell({ url, title, desc, body, jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년 달력`, url }]), c.faqLd(faq)] }));
  }

  /* ---------- 월 달력 ---------- */
  function calMonthPage(y, m) {
    const url = calUrl(y, m);
    const days = yearDays(y).filter((x) => x.m === m);
    const hol = holidays(y).filter((h) => h.m === m);
    const terms = yearTerms(y).filter((t) => t.m === m).sort((a, b) => a.d - b.d);
    const sons = days.filter((x) => x.lun && x.lun.son);
    const inSaju = y <= today.y + 1;
    const pv = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }, nx = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
    const l0 = days[0].lun, l1 = days[days.length - 1].lun;
    const title = `${y}년 ${m}월 달력 — 공휴일·음력·절기·손없는 날·일진`;
    const desc = `${y}년 ${m}월 달력. ${hol.length ? '공휴일 ' + uniq(hol.map((h) => `${h.d}일 ${shortName(h.name)}`)).join(', ') + '. ' : '공휴일 없음. '}음력 ${l0 ? (l0.leap ? '윤' : '') + l0.m + '월 ' + l0.d + '일' : ''}부터, 절기 ${terms.map((t) => t.name).join('·')}, 손없는 날 ${sons.map((x) => x.d + '일').join('·') || '없음'}.`;
    const body = `
<div class="overline"><a href="${calUrl(y)}">${y}년 달력</a> · ${m}월</div>
<h1>${y}년 ${m}월 달력</h1>
<p class="lead">${y}년 ${m}월 1일은 ${WD[days[0].w]}로 시작해 ${dim(y, m)}일 ${WD[days[days.length - 1].w]}에 끝납니다. 음력으로는 ${l0 ? `${l0.y}년 ${l0.leap ? '윤' : ''}${l0.m}월 ${l0.d}일` : ''}부터 ${l1 ? `${l1.leap ? '윤' : ''}${l1.m}월 ${l1.d}일` : ''}까지입니다. ${hol.length ? '이 달의 공휴일은 ' + uniq(hol.map((h) => `${h.d}일(${W1(weekday(y, m, h.d))}) ${shortName(h.name)}`)).join(', ') + '입니다.' : '이 달에는 공휴일이 없습니다.'}</p>
<section>
${calGrid(y, m)}
<p class="note">날짜 아래는 일진(60갑자)과 음력 날짜 또는 공휴일·절기 이름. 붉은 칸은 공휴일, 테두리가 진한 날은 손없는 날입니다.</p>
</section>
<section>
<h2>${m}월의 공휴일</h2>
${hol.length ? holTable(hol) : '<p>공휴일이 없는 달입니다.</p>'}
</section>
<section>
<h2>${m}월의 절기와 손없는 날</h2>
<ul>${terms.map((t) => `<li><strong>${t.name}</strong>: ${m}월 ${t.d}일 ${WD[weekday(y, m, t.d)]} ${pad(t.hh)}:${pad(t.mm)}${t.jeol ? ' (절입: 이 시각부터 사주의 월주가 바뀝니다)' : ''}</li>`).join('')}</ul>
<p>손없는 날: ${sons.map((x) => `<b>${x.d}일</b>(${W1(x.w)}, 음력 ${x.lun.m}.${x.lun.d})`).join(', ') || '없음'}</p>
${inSaju ? `<p class="note"><a href="${SAJU}/son/${y}-${pad(m)}/">사주첩 ${m}월 손없는날·이사 길일</a> · <a href="${SAJU}/jeolgi/${y}/">${y}년 절기</a></p>` : ''}
</section>
<section>
<h2>${m}월 일진표</h2>
<div class="tw"><table><thead><tr><th>날짜</th><th>요일</th><th>일진</th><th>음력</th><th></th></tr></thead><tbody>
${days.map((x) => { const href = cellLink(x); return `<tr class="${x.hol.length ? 'sub' : ''}"><td>${href ? `<a href="${href}">${m}월 ${x.d}일</a>` : `${m}월 ${x.d}일`}</td><td class="${wdCls(x.w)}">${WD[x.w]}</td><td>${x.g.kor}(${x.g.han})</td><td>${x.lun ? (x.lun.leap ? '윤' : '') + x.lun.m + '.' + x.lun.d : ''}</td><td class="note">${[...x.hol.map((h) => shortName(h.name)), ...x.terms.map((t) => t.name), x.lun && x.lun.son ? '손없는 날' : ''].filter(Boolean).join(' · ')}</td></tr>`; }).join('')}
</tbody></table></div>
</section>
<section>
<h2>${y}년 다른 달</h2>
<div class="grid g6">${Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => `<a href="${calUrl(y, mm)}"${mm === m ? ' class="cur"' : ''}><b>${mm}월</b></a>`).join('')}</div>
</section>
<p class="pn">${CAL_YEARS.includes(pv.y) ? `<a href="${calUrl(pv.y, pv.m)}">← ${pv.y}년 ${pv.m}월</a>` : '<span></span>'}${CAL_YEARS.includes(nx.y) ? `<a href="${calUrl(nx.y, nx.m)}">${nx.y}년 ${nx.m}월 →</a>` : '<span></span>'}</p>
`;
    write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년 달력`, url: calUrl(y) }, { name: `${m}월`, url }]) }));
  }

  /* ---------- 만나이 계산기 ---------- */
  function agePage() {
    const url = '/age/';
    const lny = {};
    for (let y = 1900; y <= 2050; y++) { const l = lunarNewYear(y); lny[y] = [l.m, l.d]; }
    const rows = [];
    for (let y = Y1; y >= Y0; y--) rows.push(`<tr><td><a href="${yearUrl(y)}">${y}년생</a></td><td>${today.y - y - 1}~${today.y - y}세</td><td>${today.y - y}세</td><td>${today.y - y + 1}세</td><td>${colorDdiShort(y)}</td></tr>`);
    const title = '만 나이 계산기 — 만 나이·연나이·세는나이, 태어난 지 며칠, 띠·별자리';
    const desc = `생년월일을 넣으면 만 나이(법적 나이)·연나이·세는나이를 오늘 또는 원하는 기준일로 계산합니다. 태어난 지 며칠째인지, 다음 생일까지 D-day, 띠와 별자리까지. ${today.y}년 출생연도별 나이 표 포함.`;
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>만 나이 계산기</h1>
<p class="lead">생년월일을 고르면 <strong>만 나이</strong>(2023년 6월 28일부터 법적 나이), <strong>연나이</strong>, <strong>세는나이</strong>를 한 번에 계산합니다. 기준일을 바꾸면 "그 날짜에 몇 살인지"도 알 수 있습니다. 계산은 브라우저 안에서만 이뤄지고 아무것도 저장되지 않습니다.</p>
<form class="form" id="age-form">
  <div class="row"><select name="y" data-min="1900" data-max="${today.y}" aria-label="년"></select><select name="m" aria-label="월"></select><select name="d" aria-label="일"></select></div>
  <label class="frow-label">기준일 <input type="date" name="base" aria-label="기준일"></label>
  <button type="submit">나이 계산하기</button>
</form>
<div id="age-out" class="out" hidden></div>
<section>
<h2>세 가지 나이, 무엇이 다른가요</h2>
<div class="tw"><table><thead><tr><th>나이</th><th>계산법</th><th>쓰는 곳</th></tr></thead><tbody>
<tr><td><b>만 나이</b></td><td>태어난 날 0세, 생일마다 +1</td><td>법률·행정·계약·의료 등 기본 (2023.6.28 만 나이 통일법)</td></tr>
<tr><td><b>연나이</b></td><td>올해 − 출생연도</td><td>병역법(병역판정검사), 청소년보호법(술·담배 구매), 초·중등교육법(취학), 공무원 임용시험 응시 연령</td></tr>
<tr><td><b>세는나이</b></td><td>태어난 해 1세, 새해마다 +1</td><td>일상의 관습 (한국식 나이). 공식 문서에는 쓰지 않음</td></tr>
</tbody></table></div>
<p>예를 들어 ${today.y - 30}년 ${today.m}월 ${today.d}일생은 ${fmt(today.y, today.m, today.d)} 기준으로 만 30세, 연나이 30세, 세는나이 31세입니다. 같은 사람이 생일 하루 전이라면 만 29세가 되고, 연나이와 세는나이는 그대로입니다. 만 나이는 "생일이 지났는가"가 핵심이고, 연나이와 세는나이는 "해가 바뀌었는가"만 봅니다.</p>
<p class="callout">2023년 6월 28일 「행정기본법」·「민법」 개정으로 별도 규정이 없으면 모든 나이는 만 나이입니다. 다만 위 표의 연나이를 쓰는 법령은 그대로 유지되므로, 술·담배 구매 가능 연령(그 해에 19세가 되는 사람)이나 병역 검사 시기는 연나이로 봅니다.</p>
</section>
<section>
<h2>${today.y}년 출생연도별 나이 표</h2>
<p class="note">만 나이는 생일 전이면 앞의 숫자, 생일이 지났으면 뒤의 숫자입니다. 연도를 누르면 그 해 태어난 사람의 띠·학번·환갑 연도가 나옵니다.</p>
<div class="tw"><table><thead><tr><th>출생연도</th><th>만 나이</th><th>연나이</th><th>세는나이</th><th>띠</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table></div>
</section>
<section>
<h2>자주 묻는 질문</h2>
<h3>만 나이는 어떻게 계산하나요?</h3>
<p>올해에서 출생연도를 뺀 뒤, 올해 생일이 아직 안 지났으면 1을 더 뺍니다. 태어난 날은 0세이고 첫 생일에 1세가 됩니다. 돌이 곧 만 1세입니다.</p>
<h3>2월 29일생은 생일이 언제인가요?</h3>
<p>평년에는 2월 28일이 지나면(즉 3월 1일부터) 한 살을 더 먹는 것으로 봅니다. 이 계산기도 같은 방식입니다.</p>
<h3>기준일을 과거나 미래로 바꿔도 되나요?</h3>
<p>됩니다. 입학·입사 당시 나이나, 특정 날짜에 만 19세가 되는지 같은 걸 확인할 때 기준일을 바꿔 보세요.</p>
</section>
<p class="note"><a href="/school/">학년 계산기(출생연도별 입학·졸업 연도)</a> · <a href="/dday/">디데이·100일 계산기</a> · <a href="${calUrl(today.y)}">${today.y}년 달력·공휴일</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
<p class="note">날짜 계산기: <a href="/army/">전역일 계산기</a> · <a href="/suneung/">수능 D-day</a> · <a href="/couple/">연애 기념일</a> · <a href="/wedding/">결혼기념일</a></p>
`;
    write(url, shell({ url, title, desc, body, extraBody: `<script>window.LNY=${JSON.stringify(lny)};</script><script src="/js/tools.js" defer></script>`, jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '만 나이 계산기', url }]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: '만 나이 계산기', url: c.SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0' } }] }));
  }

  /* ---------- 디데이·100일 계산기 ---------- */
  function ddayPage() {
    const url = '/dday/';
    const title = '디데이 · 100일 계산기 — 100일·1000일 날짜, 기념일까지 D-day, N일 후 날짜';
    const desc = '시작일을 넣으면 100일·200일·300일·500일·1000일·10000일이 무슨 날짜·요일인지, 목표일까지 D-day가 며칠인지, N일 후가 언제인지 계산합니다. 커플 기념일, 아기 100일·돌, 시험·전역 디데이에.';
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>디데이 · 100일 계산기</h1>
<p class="lead">사귄 날, 태어난 날, 시작한 날을 넣으면 <strong>100일·200일·1000일</strong>이 언제인지 요일까지 알려주고, 목표일까지 <strong>D-day</strong>와 <strong>N일 후 날짜</strong>도 계산합니다.</p>
<form class="form" id="dday-form">
  <label class="frow-label">시작일 <input type="date" name="start" aria-label="시작일"></label>
  <label class="frow-label chk"><input type="checkbox" name="inclusive" checked> 시작한 날을 1일로 셉니다 (100일 = 시작일 + 99일)</label>
  <button type="submit">기념일 계산하기</button>
</form>
<div id="dday-out" class="out" hidden></div>
<section>
<h2>목표일까지 D-day</h2>
<form class="form" id="target-form">
  <label class="frow-label">목표일 <input type="date" name="target" aria-label="목표일"></label>
  <button type="submit">D-day 계산하기</button>
</form>
<div id="target-out" class="out" hidden></div>
</section>
<section>
<h2>N일 후·전 날짜</h2>
<form class="form" id="after-form">
  <label class="frow-label">기준일 <input type="date" name="base" aria-label="기준일"></label>
  <label class="frow-label">일수 <input type="number" name="n" value="100" min="-100000" max="100000" aria-label="일수"> <span class="note">(음수면 N일 전)</span></label>
  <button type="submit">날짜 계산하기</button>
</form>
<div id="after-out" class="out" hidden></div>
</section>
<section>
<h2>100일은 어떻게 세나요</h2>
<p>두 가지 방식이 있습니다. <strong>시작한 날을 1일로 세면</strong> 100일은 시작일에서 99일 뒤이고, 커플 기념일과 아기 백일이 보통 이 방식입니다. <strong>시작한 날을 0일로 세면</strong>(만 100일) 시작일에서 100일 뒤가 됩니다. 위 체크박스로 바꿀 수 있습니다.</p>
<p>아기 백일은 태어난 날을 1일로 세어 99일 뒤, 돌은 첫 번째 생일입니다. 아기의 생년월일로 <a href="/">생일첩 페이지</a>를 열면 100일·돌·1,000일 날짜가 자동으로 나옵니다.</p>
<h3>자주 찾는 기념일</h3>
<ul>
  <li><strong>커플</strong>: 100일, 200일, 300일, 1주년, 500일, 1000일, 2000일</li>
  <li><strong>아기</strong>: 백일(100일), 돌(1주년), 1000일</li>
  <li><strong>시험·전역·개업</strong>: 목표일까지 D-day, 시작일부터 D+N</li>
</ul>
<h3>자주 묻는 질문</h3>
<h3>D-day와 D+N은 무엇이 다른가요?</h3>
<p>D-day는 목표일까지 남은 날(D-30이면 30일 남음), D+N은 시작일부터 지난 날(D+100이면 100일째)입니다. 목표일 당일이 D-day(D-0)입니다.</p>
<h3>1주년은 365일인가요?</h3>
<p>1주년은 다음 해 같은 날짜로, 윤년이 끼면 366일입니다. 이 계산기의 365일 행은 "365일째"이고 1주년과 하루 차이가 날 수 있습니다.</p>
</section>
<p class="note"><a href="/age/">만 나이 계산기</a> · <a href="${calUrl(today.y)}">${today.y}년 달력·공휴일</a></p>
<p class="note">목적별 계산기: <a href="/couple/">연애 기념일(주년·요일까지)</a> · <a href="/wedding/">결혼기념일</a> · <a href="/army/">전역일 계산기</a> · <a href="/suneung/">수능 D-day</a></p>
`;
    write(url, shell({ url, title, desc, body, extraBody: '<script src="/js/tools.js" defer></script>', jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '디데이 계산기', url }]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: '디데이·100일 계산기', url: c.SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0' } }] }));
  }

  /* ---------- 연차 꿀팁 (/holidays/{y}/) — 월력요항이 나온 해만. 조합은 tools/leave.mjs 가 공휴일 데이터로 계산 ---------- */
  function leavePage(y) {
    const url = `/holidays/${y}/`;
    const alm = ALMANAC[y];
    const days3 = spanDays(y - 1, y + 1, H);
    const { blocks, ranking } = planLeave(days3, y);
    const cnt = yearCounts(days3, y);
    const label = (b) => { const n = uniq(b.names.map(shortName)).filter((x) => x !== '대체공휴일').join('·'); return n === '신정' ? '연말연시' : n; };
    const dY = (x) => (x.y !== y ? `${x.y}년 ` : '');
    const fD = (x) => `${dY(x)}${x.m}월 ${x.d}일(${W1(x.w)})`;
    const span = (a, b) => (a.y === b.y && a.m === b.m && a.d === b.d ? fD(a)
      : a.y !== b.y ? `${a.y}년 ${a.m}월 ${a.d}일(${W1(a.w)}) ~ ${b.y}년 ${b.m}월 ${b.d}일(${W1(b.w)})`
        : `${fD(a)} ~ ${a.m === b.m ? `${b.d}일(${W1(b.w)})` : fD(b)}`);
    const lv = (o) => o.leave.map((x, i) => `${x.y !== y && (i === 0 || o.leave[i - 1].y !== x.y) ? `${x.y}년 ` : ''}${x.m}/${x.d}(${W1(x.w)})`).join(', ');
    const bestByL = [];
    for (let L = 1; L <= 5; L++) {
      const os = ranking.filter((o) => o.L === L);
      if (!os.length) continue;
      const max = Math.max(...os.map((o) => o.len));
      bestByL.push({ L, len: max, os: os.filter((o) => o.len === max) });
    }
    const hl = ranking.filter((o) => o.len >= 9).sort((a, b) => a.L - b.L || a.s - b.s)[0] || ranking[0];
    const maxLen = Math.max(...ranking.map((o) => o.len));
    const longest = ranking.filter((o) => o.len === maxLen);
    const byName = (n) => blocks.find((b) => b.names.some((x) => x.includes(n)));
    const blockTxt = (b) => (b ? b.options.map((o) => `연차 ${o.L}일(${lv(o)})이면 ${span(o.from, o.to)} ${o.len}일`).join(', ') : '');
    const seolB = byName('설날'), chuB = byName('추석'), mayB = byName('어린이날');
    const deflt = hl;
    const iso = (x) => `${x.y}-${pad(x.m)}-${pad(x.d)}`;
    const HOLI = {};
    days3.forEach((x) => { if (x.hol.length) HOLI[iso(x)] = uniq(x.hol.map((h) => shortName(h.name))).join('·'); });

    const title = `${y} 연차 꿀팁 — 연차 ${hl.L}일로 ${label(hl.block)} ${hl.len}일 연휴, 연휴별 연차 붙이기·효율 순위`;
    const desc = `${y}년 공휴일·대체공휴일로 계산한 연차 붙이기. ${bestByL.map((b) => `연차 ${b.L}일로 ${b.len}일(${uniq(b.os.map((o) => label(o.block))).join('·')})`).join(', ')}. 연휴별 연차 쓸 날과 효율 순위, 날짜를 고르면 필요한 연차를 세는 계산기까지.`;
    const faq = [
      [`${y}년 연차는 언제 쓰면 가장 좋나요?`, `연차 하루로 쉬는 날이 가장 많이 늘어나는 날은 ${ranking.slice(0, 3).map((o) => `${label(o.block)}(${lv(o)} → ${o.len}일)`).join(', ')} 순입니다. 쉬는 날 ÷ 연차 일수로 매긴 순위입니다.`],
      chuB && [`${y} 추석 연휴에 연차를 붙이면 며칠 쉬나요?`, `추석 연휴는 ${span(chuB.runs[0].from, chuB.runs[0].to)} ${chuB.runs[0].len}일입니다. ${blockTxt(chuB)}을 쉽니다.`],
      seolB && [`${y} 설 연휴에 연차를 붙이면 며칠 쉬나요?`, `설 연휴는 ${span(seolB.runs[0].from, seolB.runs[0].to)} ${seolB.runs[0].len}일입니다. ${blockTxt(seolB)}을 쉽니다.`],
      mayB && [`${y}년 5월 황금연휴는 어떻게 만드나요?`, `${mayB.names.map(shortName).filter((x) => x !== '대체공휴일').filter((x, i, a) => a.indexOf(x) === i).join('·')}이 이어지는 5월 초에 ${blockTxt(mayB)}을 쉴 수 있습니다.`],
      [`${y}년에 연차로 가장 길게 쉬려면?`, `연차 5일 안에서는 ${longest.map((o) => `${label(o.block)} ${span(o.from, o.to)}(연차 ${o.L}일)`).join(', ')}이 ${maxLen}일로 가장 깁니다.`],
      ['5인 미만 사업장도 공휴일과 대체공휴일에 쉬나요?', '근로기준법 제55조 제2항(관공서 공휴일·대체공휴일을 유급휴일로 보장)은 상시 5인 이상 사업장에 적용되고, 5인 이상 30인 미만 사업장은 2022년 1월 1일부터 적용됐습니다. 5인 미만 사업장은 이 조항과 연차휴가 조항(제60조)이 적용되지 않아 취업규칙이나 근로계약에 따릅니다.'],
      ['임시공휴일도 계산에 들어가나요?', `아닙니다. 「관공서의 공휴일에 관한 규정」에 정해진 공휴일과 대체공휴일만 넣었습니다. 정부가 임시공휴일을 지정하면 더해서 다시 계산합니다.`]
    ].filter(Boolean);

    const body = `
<div class="overline"><a href="${calUrl(y)}">${y}년 달력</a> · 연차 꿀팁</div>
<h1>${y} 연차 꿀팁 — 연휴에 연차 붙이기</h1>
<p class="lead">${y}년 관공서 공휴일은 <strong>${cnt.total}일</strong>(일요일 포함), 대체공휴일 <strong>${cnt.subst}일</strong>, 3일 이상 연휴는 <strong>${cnt.long}번</strong>입니다. 연차를 가장 알뜰하게 쓰는 날은 <strong>${label(ranking[0].block)}</strong> 앞뒤로, ${lv(ranking[0])} 하루만 쓰면 ${span(ranking[0].from, ranking[0].to)} <strong>${ranking[0].len}일</strong>을 쉽니다. 연차 ${hl.L}일이면 ${span(hl.from, hl.to)} <strong>${hl.len}일</strong> 연휴가 됩니다.</p>
<div class="facts">
${bestByL.map((b, i) => `  <div class="fact${i === 0 ? ' hi' : ''}"><small>연차 ${b.L}일 쓰면</small><b>${b.len}일 쉼</b><i>${uniq(b.os.map((o) => label(o.block))).join('·')}</i></div>`).join('\n')}
  <div class="fact"><small>공휴일</small><b>${cnt.total}일</b><i>일요일 포함 · 대체 ${cnt.subst}일</i></div>
  <div class="fact"><small>주 5일 기준 쉬는 날</small><b>${cnt.rest}일</b><i>토·일 + 평일 공휴일 ${cnt.weekday}일</i></div>
</div>

<section>
<h2>${y} 연차 효율 순위</h2>
<p class="note">쉬는 날 ÷ 연차 일수가 큰 순서입니다. 쉬는 날은 토·일요일과 공휴일·대체공휴일을 이어 붙인 연속 휴일이고, 연차는 그 사이 평일에 쓴다고 계산했습니다.</p>
<div class="tw"><table><thead><tr><th>순위</th><th>연차 → 쉼</th><th>기간</th><th>연차 쓸 날</th></tr></thead><tbody>
${ranking.map((o, i) => `<tr${i < 3 ? ' class="sub"' : ''}><td>${i + 1}</td><td><b>${o.L}일 → ${o.len}일</b></td><td>${span(o.from, o.to)}<br><span class="note">${label(o.block)}</span></td><td>${lv(o)}${o.alts.length ? `<br><span class="note">또는 ${o.alts.map((a) => lv(a)).join(' / ')}</span>` : ''}</td></tr>`).join('\n')}
</tbody></table></div>
</section>

<section>
<h2>연휴별 연차 붙이기</h2>
${blocks.map((b) => `<h3>${label(b)} <span class="note">${b.runs.map((r) => (r.len > 1 ? `${span(r.from, r.to)} ${r.len}일` : span(r.from, r.to))).join(' · ')}</span></h3>
<div class="tw"><table><thead><tr><th>연차</th><th>쉬는 날</th><th>기간</th><th>연차 쓸 날</th></tr></thead><tbody>
${b.options.map((o) => `<tr><td><b>${o.L}일</b></td><td><b>${o.len}일</b></td><td>${span(o.from, o.to)}</td><td>${lv(o)}${o.alts.length ? `<br><span class="note">또는 ${o.alts.map((a) => `${lv(a)} (${span(a.from, a.to)})`).join(' / ')}</span>` : ''}</td></tr>`).join('\n')}
</tbody></table></div>`).join('\n')}
<p class="note">연차 5일까지, 연차 일수보다 쉬는 날이 더 많이 늘어나는 경우만 적었습니다. 토~월 3일 연휴에 금요일이나 화요일 연차 하루를 붙여 4일을 쉬는 것처럼 연차만큼만 늘어나는 경우는 뺐습니다. 묶음이 연말·연초에 걸치면 ${y - 1}년 성탄절이나 ${y + 1}년 신정까지 이어서 셉니다.</p>
</section>

<section>
<h2>연차 계산기 — 이 기간에 연차 며칠?</h2>
<p class="note">쉬고 싶은 첫날과 마지막 날을 고르면 그 사이의 주말·공휴일을 빼고 필요한 연차 일수를 셉니다. ${y - 1}~${y + 1}년 공휴일이 들어 있고, 계산은 브라우저 안에서만 합니다.</p>
<form class="form" id="leave-form">
  <label class="frow-label">첫날 <input type="date" name="from" min="${y - 1}-01-01" max="${y + 1}-12-31" value="${iso(deflt.from)}" aria-label="첫날"></label>
  <label class="frow-label">마지막 날 <input type="date" name="to" min="${y - 1}-01-01" max="${y + 1}-12-31" value="${iso(deflt.to)}" aria-label="마지막 날"></label>
  <button type="submit">필요한 연차 계산하기</button>
</form>
<div id="leave-out" class="out" hidden></div>
</section>

<section>
<h2>회사마다 다를 수 있는 것</h2>
<ul>
  <li><strong>5인 이상 사업장</strong>: 근로기준법 제55조 제2항과 시행령 제30조 제2항에 따라 관공서 공휴일(일요일 제외)과 대체공휴일을 유급휴일로 줘야 합니다. 300인 이상은 2020년, 30~299인은 2021년, 5~29인은 2022년 1월 1일부터 적용됐습니다.</li>
  <li><strong>5인 미만 사업장</strong>: 위 조항과 연차휴가(제60조)가 적용되지 않아, 공휴일에 쉬는지와 연차는 취업규칙·근로계약에 따릅니다.</li>
  <li><strong>휴일 대체</strong>: 근로자대표와 서면으로 합의하면 공휴일을 다른 근로일로 바꿀 수 있습니다(제55조 제2항 단서). 공휴일에 출근하고 다른 날 쉬는 회사도 있습니다.</li>
  <li><strong>5월 1일 노동절</strong>: 2026년 전에도 근로자의 날로 사업장 규모와 관계없이 유급휴일이었고, 2026년부터는 관공서 공휴일이기도 합니다. 5인 미만 사업장이 노동절 대체공휴일까지 쉬는지는 공식 안내를 확인하지 못했으니 회사에 확인하세요.</li>
  <li><strong>공무원·교대 근무</strong>: 공무원은 관공서 공휴일에 쉬고 연차 대신 연가를 씁니다. 주말에 일하는 교대·서비스 직장은 이 계산과 다릅니다.</li>
</ul>
</section>

<section>
<h2>자주 묻는 질문</h2>
${faq.map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`).join('\n')}
</section>
<p class="note">출처: ${alm.by} '${y}년도 월력요항'(${alm.published.slice(0, 4)}년 ${+alm.published.slice(5, 7)}월 ${+alm.published.slice(8)}일 관보 게재) — 공휴일 ${alm.total}일, 3일 이상 연휴 ${alm.long}번, 주 5일 기준 쉬는 날 ${alm.rest}일로 이 페이지의 계산과 같습니다. <a href="${alm.href}" rel="noopener">한국천문연구원 ${y}년 달력자료</a> · <a href="${LAW_HOL}" rel="noopener">관공서의 공휴일에 관한 규정</a> · <a href="${LAW_LSA}" rel="noopener">근로기준법 시행령</a>. 임시공휴일은 넣지 않았습니다.</p>
<p class="note"><a href="${calUrl(y)}">${y}년 달력·공휴일 표</a> · <a href="/dday/">디데이 계산기</a> · <a href="/age/">만 나이 계산기</a></p>
`;
    c.lastmod[url] = HOL_DATE;
    write(url, shell({ url, title, desc, body, extraBody: `<script>window.HOLI=${JSON.stringify(HOLI)};</script><script src="/js/leave.js" defer></script>`, jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년 달력`, url: calUrl(y) }, { name: '연차 꿀팁', url }]), c.faqLd(faq)] }));
  }

  /* ---------- 실행 ---------- */
  for (const y of CAL_YEARS) {
    calYearPage(y);
    for (let m = 1; m <= 12; m++) calMonthPage(y, m);
  }
  const LEAVE_YEARS = CAL_YEARS.filter((y) => ALMANAC[y]);
  LEAVE_YEARS.forEach(leavePage);
  agePage();
  ddayPage();
  return { CAL_YEARS, holidays, LEAVE_YEARS };
}
