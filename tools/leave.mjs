/* 생일첩 연차 계산 — 공휴일 데이터(data/holidays.mjs)로 "연차 N일 쓰면 M일 연속 쉼"을 빌드할 때 계산한다.
 * 쉬는 날 = 토·일 + 관공서 공휴일(대체공휴일 포함). 연차는 그 밖의 평일에 쓴다고 본다.
 * hubs.mjs(연차 꿀팁 페이지)와 test-holidays.mjs 가 같이 쓴다. */
import { holidaysOf } from '../data/holidays.mjs';

/* y0년 1월 1일 ~ y1년 12월 31일의 날 — { y, m, d, w, off, hol: [공휴일] }
 * H: { lunarToSolar, weekday, addDays } (hubs.mjs 와 test-holidays.mjs 의 헬퍼) */
export function spanDays(y0, y1, H) {
  const hol = {};
  for (let y = y0; y <= y1; y++) for (const h of holidaysOf(y, H)) (hol[`${h.y}-${h.m}-${h.d}`] = hol[`${h.y}-${h.m}-${h.d}`] || []).push(h);
  const out = [];
  for (let c = { y: y0, m: 1, d: 1 }; c.y <= y1; c = H.addDays(c, 1)) {
    const w = H.weekday(c.y, c.m, c.d);
    const hs = hol[`${c.y}-${c.m}-${c.d}`] || [];
    out.push({ y: c.y, m: c.m, d: c.d, w, hol: hs, off: w === 0 || w === 6 || hs.length > 0 });
  }
  return out;
}

/* 평일에 든 공휴일(쉬는 날이 실제로 늘어나는 날) */
const gain = (x) => x.hol.length > 0 && x.w !== 0 && x.w !== 6;

/* y년 연차 계획.
 * blocks: 평일 공휴일이 든 y년의 연휴(쉬는 날이 이어진 묶음). 출근일 4일 이하로 떨어진 연휴는 한 묶음으로 본다(5월 초, 10월 초).
 *   묶음마다 연차 1~maxLeave일로 만들 수 있는 가장 긴 연속 휴식. 연차 일수만큼만 늘고 주말·공휴일이 더 붙지 않으면 그 일수는 뺀다
 *   (월요일 공휴일에 금요일 연차 하루 = 4일 같은 것은 '꿀팁'이 아니라 빼고, 글에서 한 줄로 설명).
 *   후보는 바로 앞뒤 날이 출근일인 기간만 — 앞뒤 하루를 공짜로 늘릴 수 있는 기간은 세지 않는다. 같은 길이가 여럿이면 alts 에.
 * ranking: 모든 후보를 효율(쉬는 날 ÷ 연차) 높은 순, 같으면 긴 순, 이른 순. */
export function planLeave(days, y, maxLeave = 5, mergeGap = 4) {
  const N = days.length;
  const runs = [];
  for (let i = 0; i < N; i++) {
    if (!days[i].off) continue;
    let j = i;
    while (j + 1 < N && days[j + 1].off) j++;
    runs.push([i, j]);
    i = j;
  }
  const W = [0];
  days.forEach((x, i) => W.push(W[i] + (x.off ? 0 : 1)));
  const work = (s, e) => W[e + 1] - W[s];
  const pick = (s, e) => ({ s, e, from: days[s], to: days[e], len: e - s + 1, leave: days.slice(s, e + 1).filter((x) => !x.off) });

  /* 평일 공휴일이 든 y년 연휴, 가까운 것끼리 묶기 */
  const base = runs.filter(([bs, be]) => bs > 0 && be < N - 1 && days.slice(bs, be + 1).some((x) => x.y === y && gain(x)));
  const groups = [];
  for (const r of base) {
    const g = groups[groups.length - 1];
    if (g && work(g[g.length - 1][1], r[0]) <= mergeGap) g.push(r); else groups.push([r]);
  }

  const blocks = groups.map((g) => {
    const byL = {};
    for (const [bs, be] of g) {
      for (let s = bs; s > 0 && work(s, bs) <= maxLeave; s--) {
        if (days[s - 1].off) continue;
        for (let e = be; e < N - 1 && work(be, e) <= maxLeave; e++) {
          if (days[e + 1].off) continue;
          const L = work(s, e);
          if (L < 1 || L > maxLeave) continue;
          const len = e - s + 1;
          const cur = byL[L];
          if (!cur || len > cur[0].len) byL[L] = [pick(s, e)];
          else if (len === cur[0].len && !cur.some((o) => o.s === s && o.e === e)) cur.push(pick(s, e));
        }
      }
    }
    const runsOf = g.map(([bs, be]) => pick(bs, be));
    /* 앞 단계보다 연차를 더 쓴 만큼보다 더 길어질 때만(주말·공휴일을 새로 이어 붙일 때만) 남긴다 */
    const options = [];
    let best = Math.max(...runsOf.map((r) => r.len)), prevL = 0;
    for (let L = 1; L <= maxLeave; L++) {
      if (!byL[L] || byL[L][0].len - best <= L - prevL) continue;
      const [o, ...alts] = byL[L].sort((a, b) => a.s - b.s);
      options.push({ ...o, L, eff: o.len / L, alts });
      best = o.len; prevL = L;
    }
    const names = [...new Set(g.flatMap(([bs, be]) => days.slice(bs, be + 1).flatMap((x) => x.hol.map((h) => h.name))))];
    return { runs: runsOf, from: runsOf[0].from, to: runsOf[runsOf.length - 1].to, names, options };
  });

  const seen = new Set();
  const ranking = [];
  for (const b of blocks) for (const o of b.options) {
    if (seen.has(`${o.s}-${o.e}`)) continue;
    seen.add(`${o.s}-${o.e}`);
    ranking.push({ ...o, block: b });
  }
  ranking.sort((a, b) => b.eff - a.eff || b.len - a.len || a.s - b.s);
  return { blocks, ranking };
}

/* 기간 [a, b] (days 의 인덱스, 양끝 포함) 안의 날 세기 — 연차 계산기와 같은 셈 */
export function countRange(days, a, b) {
  const xs = days.slice(a, b + 1);
  const weekend = xs.filter((x) => x.w === 0 || x.w === 6).length;
  const holiday = xs.filter(gain).length;
  return { total: xs.length, weekend, holiday, leave: xs.length - weekend - holiday };
}

/* 한 해 집계 — 월력요항과 같은 셈. total: 관공서 공휴일(일요일 포함, 겹친 날은 한 번), rest: 주 5일 기준 쉬는 날, long: 3일 이상 연휴 */
export function yearCounts(days, y) {
  const xs = days.filter((x) => x.y === y);
  let long = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!xs[i].off) continue;
    let j = i;
    while (j + 1 < xs.length && xs[j + 1].off) j++;
    if (j - i + 1 >= 3) long++;
    i = j;
  }
  return {
    holidays: xs.filter((x) => x.hol.length).length,
    weekday: xs.filter(gain).length,
    subst: xs.filter((x) => x.hol.some((h) => h.kind === '대체공휴일')).length,
    total: xs.filter((x) => x.w === 0 || x.hol.length).length,
    rest: xs.filter((x) => x.off).length,
    long
  };
}
