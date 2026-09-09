/* 생일첩 허브 페이지 — 만나이 계산기(/age/), 디데이·100일 계산기(/dday/), 연도별 달력·공휴일(/cal/{y}/, /cal/{y}/{mm}/)
 * build.mjs 가 헬퍼를 담은 컨텍스트로 buildHubs(c) 를 호출한다. */
import { holidaysOf, samjaeOf, SUBST_NOTE } from '../data/holidays.mjs';

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
    const title = `${y}년 달력·공휴일 — 대체공휴일, 설날·추석 연휴, 절기, 손없는 날 (${g.kor}년 ${colorDdi(y)})`;
    const desc = `${y}년 공휴일은 ${holDates.length}일(평일 ${weekdayHol}일), 대체공휴일 ${subs.length}일. 설날 ${seol.m}월 ${seol.d}일, 추석 ${chu.m}월 ${chu.d}일. 3일 이상 연휴 ${long.length}번과 연차 하루로 길어지는 징검다리, 24절기, 손없는 날, 삼재 띠까지 ${y}년 달력 한 장에.`;
    const body = `
<div class="overline">생일첩 · 달력</div>
<h1>${y}년 달력 · 공휴일</h1>
<p class="lead">${y}년은 <strong>${g.kor}(${g.han})년 ${colorDdi(y)}</strong>의 해입니다. 공휴일은 모두 <strong>${holDates.length}일</strong>이고 그중 평일에 드는 날이 <strong>${weekdayHol}일</strong>, 대체공휴일이 <strong>${subs.length}일</strong>입니다. 설날은 ${seol.m}월 ${seol.d}일(${WD[weekday(y, seol.m, seol.d)]}), 추석은 ${chu.m}월 ${chu.d}일(${WD[weekday(y, chu.m, chu.d)]})이에요.</p>
<div class="facts">
  <div class="fact hi"><small>공휴일</small><b>${holDates.length}일</b><i>평일 ${weekdayHol}일 · 대체 ${subs.length}일</i></div>
  <div class="fact"><small>설날 연휴</small><b>${seol.m}/${seol.d - 1}~${seol.m}/${seol.d + 1}</b><i>${seolRun ? seolRun.len + '일 쉼' : '3일'}</i></div>
  <div class="fact"><small>추석 연휴</small><b>${chu.m}/${chu.d - 1}~${chu.m}/${chu.d + 1}</b><i>${chuRun ? chuRun.len + '일 쉼' : '3일'}</i></div>
  <div class="fact"><small>3일 이상 연휴</small><b>${long.length}번</b><i>징검다리 ${bridges.length}곳</i></div>
  <div class="fact"><small>삼재</small><b>${sj.ddi.map((i) => DDI[i].kor).join('·')}띠</b><i>${sj.stage}</i></div>
  <div class="fact"><small>주말 포함 쉬는 날</small><b>${days.filter((x) => x.off).length}일</b><i>${y}년 ${days.length}일 중</i></div>
</div>
<p class="note">${yearsNav(y)}</p>

<section>
<h2>${y}년 공휴일 표</h2>
${holTable(hol)}
<p class="note">${SUBST_NOTE}</p>
</section>

<section>
<h2>연휴와 징검다리</h2>
<h3>3일 이상 연휴</h3>
<ul>${long.map((b) => `<li><b>${b.from.m}월 ${b.from.d}일(${W1(b.from.w)}) ~ ${b.to.m}월 ${b.to.d}일(${W1(b.to.w)})</b> — ${b.len}일${b.names.length ? ' · ' + b.names.join(', ') : ' · 주말'}</li>`).join('') || '<li>없음</li>'}</ul>
<h3>연차 하루로 길어지는 날</h3>
<ul>${bridges.map((b) => `<li><b>${b.day.m}월 ${b.day.d}일(${W1(b.day.w)})</b>에 연차를 쓰면 ${b.from.m}월 ${b.from.d}일 ~ ${b.to.m}월 ${b.to.d}일 <b>${b.len}일</b> 연휴${b.names.length ? ' · ' + b.names.join(', ') : ''}</li>`).join('') || '<li>없음</li>'}</ul>
</section>

<section>
<h2>${y}년 월별 달력</h2>
<p class="note">날짜 아래는 그 날의 일진(60갑자)과 음력 날짜. 붉은 칸은 공휴일, 붉은 글씨 날짜는 절기(절입일), 테두리가 진한 날은 손없는 날입니다. 날짜를 누르면 ${y <= today.y ? '지난 날은 그 날 태어난 사람의 생일 페이지, ' : ''}${inSaju ? '앞으로의 날은 사주첩의 그 날 일진 풀이' : '상세 페이지'}로 이어집니다.</p>
${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `<h3><a href="${calUrl(y, m)}">${m}월</a> <span class="note">${uniq(hol.filter((h) => h.m === m).map((h) => shortName(h.name))).join(' · ')}</span></h3>${calGrid(y, m)}`).join('')}
</section>

<section>
<h2>설날·추석과 음력</h2>
<ul>
  <li><strong>설날</strong> (음력 1월 1일) — ${seol.m}월 ${seol.d}일 ${WD[weekday(y, seol.m, seol.d)]} · 연휴 ${runTxt(seolRun, seol)}</li>
  <li><strong>부처님오신날</strong> (음력 4월 8일) — ${bud.m}월 ${bud.d}일 ${WD[weekday(y, bud.m, bud.d)]}</li>
  <li><strong>추석</strong> (음력 8월 15일) — ${chu.m}월 ${chu.d}일 ${WD[weekday(y, chu.m, chu.d)]} · 연휴 ${runTxt(chuRun, chu)}</li>
  <li><strong>윤달</strong> — ${leapM ? `음력 윤${leapM}월이 있는 해입니다.` : '없는 해입니다.'}</li>
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
<p class="note">음력 9·10·19·20·29·30일이 손없는 날입니다. 이사·개업·혼례처럼 큰일을 잡을 때 참고하는 날이에요.${inSaju ? ` <a href="${SAJU}/son/${y}-01/">사주첩 손없는날 달력</a>` : ''}</p>
</section>

<section>
<h2>${y}년 삼재 띠</h2>
<p>${y}년 ${g.kor}년은 <strong>${sj.ddi.map((i) => DDI[i].animal).join('·')}</strong>의 <strong>${sj.stage}</strong>입니다. 삼재는 3년 동안 이어지며 들삼재(첫해)·눌삼재(둘째 해)·날삼재(마지막 해)로 부릅니다. ${sj.stage === '들삼재' ? '이 해에 들어와 ' + (y + 2) + '년에 나갑니다.' : sj.stage === '눌삼재' ? (y - 1) + '년에 들어와 ' + (y + 1) + '년에 나갑니다.' : (y - 2) + '년에 들어와 이 해에 나갑니다.'}</p>
<p class="note">삼재는 띠(연지)만 보는 민속 관념이고, 실제 운의 흐름은 사주 전체로 봅니다. <a href="${SAJU}/samjae/">사주첩 삼재 계산기</a></p>
</section>

<section>
<h2>자주 묻는 질문</h2>
<h3>${y}년 공휴일은 며칠인가요?</h3>
<p>공휴일은 ${holDates.length}일이고, 주말과 겹치지 않아 실제로 쉬는 평일은 ${weekdayHol}일입니다. 주말까지 합치면 ${y}년에 쉬는 날은 ${days.filter((x) => x.off).length}일이에요. 정부가 따로 지정하는 임시공휴일이 생기면 더 늘어납니다.</p>
<h3>${y}년 대체공휴일은 언제인가요?</h3>
<p>${subs.length ? subs.map((h) => `${h.m}월 ${h.d}일(${W1(weekday(h.y, h.m, h.d))}, ${h.base})`).join(', ') + '입니다.' : '토·일요일과 겹치는 대상 공휴일이 없어 대체공휴일이 없는 해입니다.'}</p>
<h3>${y}년 설 연휴와 추석 연휴는 언제인가요?</h3>
<p>설 연휴는 ${runTxt(seolRun, seol)}, 추석 연휴는 ${runTxt(chuRun, chu)}입니다.</p>
</section>

<section>
<h2>다른 해</h2>
${yearsNav(y)}
</section>
`;
    write(url, shell({ url, title, desc, body, jsonld: crumbs([{ name: '생일첩', url: '/' }, { name: `${y}년 달력`, url }]) }));
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
<p class="lead">${y}년 ${m}월 1일은 ${WD[days[0].w]}로 시작해 ${dim(y, m)}일 ${WD[days[days.length - 1].w]}에 끝납니다. 음력으로는 ${l0 ? `${l0.y}년 ${l0.leap ? '윤' : ''}${l0.m}월 ${l0.d}일` : ''}부터 ${l1 ? `${l1.leap ? '윤' : ''}${l1.m}월 ${l1.d}일` : ''}까지예요. ${hol.length ? '이 달의 공휴일은 ' + uniq(hol.map((h) => `${h.d}일(${W1(weekday(y, m, h.d))}) ${shortName(h.name)}`)).join(', ') + '입니다.' : '이 달에는 공휴일이 없습니다.'}</p>
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
<ul>${terms.map((t) => `<li><strong>${t.name}</strong> — ${m}월 ${t.d}일 ${WD[weekday(y, m, t.d)]} ${pad(t.hh)}:${pad(t.mm)}${t.jeol ? ' (절입 — 이 시각부터 사주의 월주가 바뀝니다)' : ''}</li>`).join('')}</ul>
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
<p class="lead">생년월일을 고르면 <strong>만 나이</strong>(2023년 6월 28일부터 법적 나이), <strong>연나이</strong>, <strong>세는나이</strong>를 한 번에 계산합니다. 기준일을 바꾸면 "그 날짜에 몇 살인지"도 알 수 있어요. 계산은 브라우저 안에서만 이뤄지고 아무것도 저장되지 않습니다.</p>
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
<p>예를 들어 ${today.y - 30}년 ${today.m}월 ${today.d}일생은 ${fmt(today.y, today.m, today.d)} 기준으로 만 30세, 연나이 30세, 세는나이 31세입니다. 같은 사람이 생일 하루 전이라면 만 29세가 되고, 연나이와 세는나이는 그대로예요. 만 나이는 "생일이 지났는가"가 핵심이고, 연나이와 세는나이는 "해가 바뀌었는가"만 봅니다.</p>
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
<p>올해에서 출생연도를 뺀 뒤, 올해 생일이 아직 안 지났으면 1을 더 뺍니다. 태어난 날은 0세이고 첫 생일에 1세가 됩니다. 돌이 곧 만 1세예요.</p>
<h3>2월 29일생은 생일이 언제인가요?</h3>
<p>평년에는 2월 28일이 지나면(즉 3월 1일부터) 한 살을 더 먹는 것으로 봅니다. 이 계산기도 같은 방식입니다.</p>
<h3>기준일을 과거나 미래로 바꿔도 되나요?</h3>
<p>됩니다. 입학·입사 당시 나이나, 특정 날짜에 만 19세가 되는지 같은 걸 확인할 때 기준일을 바꿔 보세요.</p>
</section>
<p class="note"><a href="/school/">학년 계산기 — 출생연도별 입학·졸업 연도</a> · <a href="/dday/">디데이·100일 계산기</a> · <a href="${calUrl(today.y)}">${today.y}년 달력·공휴일</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
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
<p>두 가지 방식이 있습니다. <strong>시작한 날을 1일로 세면</strong> 100일은 시작일에서 99일 뒤이고, 커플 기념일과 아기 백일이 보통 이 방식입니다. <strong>시작한 날을 0일로 세면</strong>(만 100일) 시작일에서 100일 뒤가 됩니다. 위 체크박스로 바꿀 수 있어요.</p>
<p>아기 백일은 태어난 날을 1일로 세어 99일 뒤, 돌은 첫 번째 생일입니다. 아기의 생년월일로 <a href="/">생일첩 페이지</a>를 열면 100일·돌·1,000일 날짜가 자동으로 나옵니다.</p>
<h3>자주 찾는 기념일</h3>
<ul>
  <li><strong>커플</strong> — 100일, 200일, 300일, 1주년, 500일, 1000일, 2000일</li>
  <li><strong>아기</strong> — 백일(100일), 돌(1주년), 1000일</li>
  <li><strong>시험·전역·개업</strong> — 목표일까지 D-day, 시작일부터 D+N</li>
</ul>
<h3>자주 묻는 질문</h3>
<h3>D-day와 D+N은 무엇이 다른가요?</h3>
<p>D-day는 목표일까지 남은 날(D-30이면 30일 남음), D+N은 시작일부터 지난 날(D+100이면 100일째)입니다. 목표일 당일이 D-day(D-0)입니다.</p>
<h3>1주년은 365일인가요?</h3>
<p>1주년은 다음 해 같은 날짜로, 윤년이 끼면 366일입니다. 이 계산기의 365일 행은 "365일째"이고 1주년과 하루 차이가 날 수 있어요.</p>
</section>
<p class="note"><a href="/age/">만 나이 계산기</a> · <a href="${calUrl(today.y)}">${today.y}년 달력·공휴일</a></p>
`;
    write(url, shell({ url, title, desc, body, extraBody: '<script src="/js/tools.js" defer></script>', jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '디데이 계산기', url }]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: '디데이·100일 계산기', url: c.SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0' } }] }));
  }

  /* ---------- 실행 ---------- */
  for (const y of CAL_YEARS) {
    calYearPage(y);
    for (let m = 1; m <= 12; m++) calMonthPage(y, m);
  }
  agePage();
  ddayPage();
  return { CAL_YEARS, holidays };
}
