/* 생일첩 — 날짜 계산기 테스트 (node tools/test-calc.mjs)
 * src/js/calc.js 의 계산을 만세력 엔진의 날짜 함수와 대조하고, 월말·윤년 경계를 확인한다 */
import { loadEngine } from './engine.mjs';
import { K } from './calc.mjs';

const { I } = loadEngine();
let pass = 0, fail = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };
const s = (o) => `${o.y}-${o.m}-${o.d}`;
const D = (y, m, d) => K.date(y, m, d);

/* 엔진과 대조 — 날짜 더하기, 요일 */
for (const [y, m, d, n] of [[2024, 2, 29, 99], [2025, 12, 31, 1], [2000, 1, 1, 10000], [2026, 11, 11, -100], [1999, 12, 31, 366]]) {
  const e = I.civilFromDays(I.daysFromCivil(y, m, d) + n);
  eq(`addDays ${y}-${m}-${d} +${n}`, s(K.addDays(D(y, m, d), n)), s(e));
  eq(`weekday ${y}-${m}-${d}`, D(y, m, d).w, ((I.daysFromCivil(y, m, d) + 4) % 7 + 7) % 7);
}

/* 전역일 — N개월 뒤 같은 날의 하루 전, 같은 날이 없으면 말일 */
eq('육군 보통', s(K.termEnd(D(2025, 5, 12), 18)), '2026-11-11');
eq('육군 1일 입대', s(K.termEnd(D(2025, 3, 1), 18)), '2026-8-31');
eq('육군 8/31 → 평년 2월', s(K.termEnd(D(2025, 8, 31), 18)), '2027-2-28');
eq('육군 8/29 → 평년 2월', s(K.termEnd(D(2025, 8, 29), 18)), '2027-2-28');
eq('육군 8/28 → 평년 2월', s(K.termEnd(D(2025, 8, 28), 18)), '2027-2-27');
eq('육군 8/30 → 윤년 2월', s(K.termEnd(D(2026, 8, 30), 18)), '2028-2-29');
eq('육군 8/29 → 윤년 2월', s(K.termEnd(D(2026, 8, 29), 18)), '2028-2-28');
eq('육군 9/1 → 윤년 2월 말', s(K.termEnd(D(2026, 9, 1), 18)), '2028-2-29');
eq('해군 1/31 → 9/30', s(K.termEnd(D(2026, 1, 31), 20)), '2027-9-30');
eq('공군 3/31 → 12/30', s(K.termEnd(D(2026, 3, 31), 21)), '2027-12-30');
eq('공군 해 넘김', s(K.termEnd(D(2026, 12, 15), 21)), '2028-9-14');
eq('윤년 2/29 입대', s(K.termEnd(D(2024, 2, 29), 18)), '2025-8-28');
{
  const r = K.service(D(2025, 5, 12), 18, D(2026, 11, 11));
  eq('전역일 당일', [r.left, r.pct, r.state, r.served === r.total], [0, 100, 'serving', true]);
  const b = K.service(D(2025, 5, 12), 18, D(2025, 5, 12));
  eq('입대일 당일', [b.served, b.left, b.total], [1, 548, 549]);
  eq('입대 전', K.service(D(2025, 5, 12), 18, D(2025, 5, 1)).state, 'before');
  const a = K.service(D(2025, 5, 12), 18, D(2026, 12, 1));
  eq('전역 뒤', [a.state, a.pct], ['done', 100]);
}

/* 연애 기념일 */
{
  const r = K.couple(D(2026, 1, 1), true, D(2026, 4, 10));
  const row = (label) => s(r.rows.find((x) => x.label === label).date);
  eq('100일(1일로 셈)', row('100일'), '2026-4-10');
  eq('오늘 100일째', [r.count, r.next.label, r.next.left], [100, '100일', 0]);
  eq('1주년', row('1주년'), '2027-1-1');
  eq('1,000일', row('1,000일'), '2028-9-26');
  const z = K.couple(D(2026, 1, 1), false, D(2026, 4, 10));
  eq('100일(다음 날부터)', s(z.rows.find((x) => x.label === '100일').date), '2026-4-11');
  const l = K.couple(D(2024, 2, 29), true, D(2024, 2, 29));
  eq('2/29 1주년', s(l.rows.find((x) => x.label === '1주년').date), '2025-2-28');
  eq('2/29 4주년', s(l.rows.find((x) => x.label === '4주년').date), '2028-2-29');
  eq('2/29 100일', s(l.rows.find((x) => x.label === '100일').date), '2024-6-7');
  eq('사귀기 전', K.couple(D(2026, 5, 1), true, D(2026, 4, 10)).passed, -21);
}

/* 결혼기념일 */
{
  const r = K.wedding(D(2001, 11, 11), D(2026, 11, 11));
  eq('25주년 당일', [r.years, r.next.n, r.next.left, r.next.name], [25, 25, 0, '은혼식']);
  const b = K.wedding(D(2001, 11, 12), D(2026, 11, 11));
  eq('25주년 전날', [b.years, b.next.n, b.next.left], [24, 25, 1]);
  const l = K.wedding(D(2020, 2, 29), D(2026, 2, 28));
  eq('2/29 결혼, 평년 2/28', [l.years, l.next.n, l.next.left, s(l.next.date)], [6, 6, 0, '2026-2-28']);
  const l2 = K.wedding(D(2020, 2, 29), D(2026, 3, 1));
  eq('2/29 결혼, 3/1', [l2.years, l2.next.n, s(l2.next.date)], [6, 7, '2027-2-28']);
  const t = K.wedding(D(2026, 11, 11), D(2026, 11, 11));
  eq('결혼 당일', [t.passed, t.next.n], [0, 0]);
  const f = K.wedding(D(2027, 5, 1), D(2026, 11, 11));
  eq('결혼 전', [f.years, f.next.n, f.next.left], [0, 0, 171]);
  eq('지난 날수', K.wedding(D(2017, 5, 20), D(2026, 11, 11)).passed, I.daysFromCivil(2026, 11, 11) - I.daysFromCivil(2017, 5, 20));
}

console.log(`날짜 계산기 테스트: ${pass} 통과, ${fail} 실패`);
if (fail) process.exit(1);
