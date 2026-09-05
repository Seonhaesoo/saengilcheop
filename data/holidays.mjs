/* 대한민국 공휴일 계산 — 「관공서의 공휴일에 관한 규정」 기준
 *  - 고정: 신정 1/1, 삼일절 3/1, 어린이날 5/5, 현충일 6/6, 광복절 8/15, 개천절 10/3, 한글날 10/9, 성탄절 12/25
 *  - 음력: 설날(음 1/1 전날·당일·다음날), 부처님오신날(음 4/8), 추석(음 8/15 전날·당일·다음날)
 *  - 선거일: 공직선거법상 임기 만료 선거일 (아래 표)
 *  - 대체공휴일: 삼일절·광복절·개천절·한글날·어린이날·부처님오신날·성탄절이 토·일 또는 다른 공휴일과 겹치면 다음 비공휴일,
 *               설·추석 연휴는 일요일 또는 다른 공휴일과 겹칠 때만 (토요일은 해당 없음). 신정·현충일·선거일은 대체 없음.
 *  임시공휴일은 예측할 수 없으므로 포함하지 않는다. */

export const SUBST_WEEKEND = new Set(['삼일절', '광복절', '개천절', '한글날', '어린이날', '부처님오신날', '성탄절']);
export const ELECTIONS = {
  2026: [6, 3, '제9회 전국동시지방선거'],
  2028: [4, 12, '제23대 국회의원 선거']
};
export const SUBST_NOTE = '대체공휴일은 삼일절·광복절·개천절·한글날·어린이날·부처님오신날·성탄절이 토·일요일이나 다른 공휴일과 겹칠 때, 설·추석 연휴는 일요일이나 다른 공휴일과 겹칠 때 그 다음 첫 번째 평일에 붙습니다. 신정·현충일·선거일은 대체공휴일이 없고, 정부가 따로 정하는 임시공휴일은 포함하지 않았습니다.';

/* h: { lunarToSolar(y,m,d) → {y,m,d}, weekday(y,m,d) → 0(일)~6(토), addDays({y,m,d}, n) → {y,m,d} } */
export function holidaysOf(y, h) {
  const items = [];
  const add = (dt, name, group) => items.push({ y: dt.y, m: dt.m, d: dt.d, name, group, kind: '공휴일' });
  const D = (m, d) => ({ y, m, d });
  add(D(1, 1), '신정', 'sinjeong');
  const seol = h.lunarToSolar(y, 1, 1);
  add(h.addDays(seol, -1), '설날 연휴', 'seol'); add(seol, '설날', 'seol'); add(h.addDays(seol, 1), '설날 연휴', 'seol');
  add(D(3, 1), '삼일절', 'samil');
  add(h.lunarToSolar(y, 4, 8), '부처님오신날', 'buddha');
  add(D(5, 5), '어린이날', 'children');
  add(D(6, 6), '현충일', 'memorial');
  add(D(8, 15), '광복절', 'liberation');
  const chu = h.lunarToSolar(y, 8, 15);
  add(h.addDays(chu, -1), '추석 연휴', 'chuseok'); add(chu, '추석', 'chuseok'); add(h.addDays(chu, 1), '추석 연휴', 'chuseok');
  add(D(10, 3), '개천절', 'gaecheon');
  add(D(10, 9), '한글날', 'hangul');
  add(D(12, 25), '성탄절', 'christmas');
  if (ELECTIONS[y]) add(D(ELECTIONS[y][0], ELECTIONS[y][1]), ELECTIONS[y][2], 'election');

  const k = (dt) => `${dt.y}-${dt.m}-${dt.d}`;
  const same = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
  const isHol = (dt) => items.some((it) => same(it, dt));
  const overlapsOther = (it) => items.some((o) => o !== it && o.group !== it.group && o.group !== 'sub' && same(o, it));
  const nextFree = (dt) => {
    let c = h.addDays(dt, 1);
    while (isHol(c) || h.weekday(c.y, c.m, c.d) === 0 || h.weekday(c.y, c.m, c.d) === 6) c = h.addDays(c, 1);
    return c;
  };
  const lastOfGroup = (g) => items.filter((it) => it.group === g).sort((a, b) => a.m - b.m || a.d - b.d).pop();

  const base = items.slice().sort((a, b) => a.m - b.m || a.d - b.d);
  const handled = new Set();
  for (const it of base) {
    const w = h.weekday(it.y, it.m, it.d);
    const long = it.group === 'seol' || it.group === 'chuseok';
    let trigger = false;
    if (long) trigger = w === 0 || overlapsOther(it);
    else if (SUBST_WEEKEND.has(it.name)) trigger = w === 0 || w === 6 || overlapsOther(it);
    if (!trigger || handled.has(k(it))) continue;
    handled.add(k(it));
    const start = long ? lastOfGroup(it.group) : it;
    const c = nextFree(start);
    items.push({ y: c.y, m: c.m, d: c.d, name: `대체공휴일 (${it.group === 'seol' ? '설날' : it.group === 'chuseok' ? '추석' : it.name})`, group: 'sub', kind: '대체공휴일', base: it.name });
  }
  return items.filter((it) => it.y === y).sort((a, b) => a.m - b.m || a.d - b.d);
}

/* 삼재 — 연지(年支) 기준. 寅午戌생 ↔ 申酉戌년, 申子辰생 ↔ 寅卯辰년, 巳酉丑생 ↔ 亥子丑년, 亥卯未생 ↔ 巳午未년 */
export function samjaeOf(y) {
  const yb = ((y - 4) % 12 + 12) % 12;
  const groups = [
    { years: [8, 9, 10], ddi: [2, 6, 10] },
    { years: [2, 3, 4], ddi: [8, 0, 4] },
    { years: [11, 0, 1], ddi: [5, 9, 1] },
    { years: [5, 6, 7], ddi: [11, 3, 7] }
  ];
  const g = groups.find((x) => x.years.includes(yb));
  const stage = ['들삼재', '눌삼재', '날삼재'][g.years.indexOf(yb)];
  return { ddi: g.ddi, stage };
}
