/* 생일첩 — 공휴일·대체공휴일 계산 테스트 (node tools/test-holidays.mjs)
 * 기대값은 월력요항(2025·2026·2027년)과 「관공서의 공휴일에 관한 규정」(2026. 4. 30. 대통령령 제36290호) 기준 */
import { loadEngine } from './engine.mjs';
import { holidaysOf, SUBST_NOTE } from '../data/holidays.mjs';

const { I, Lunar } = loadEngine();
const dn = (y, m, d) => I.daysFromCivil(y, m, d);
const H = {   /* hubs.mjs 가 넘기는 것과 같은 헬퍼 */
  lunarToSolar: (y, m, d) => { Lunar.setLunarDate(y, m, d, false); const s = Lunar.getSolarCalendar(); return { y: s.year, m: s.month, d: s.day }; },
  weekday: (y, m, d) => ((dn(y, m, d) + 4) % 7 + 7) % 7,
  addDays: (dt, n) => I.civilFromDays(dn(dt.y, dt.m, dt.d) + n)
};

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};
const list = (y) => holidaysOf(y, H).map((h) => `${h.m}/${h.d} ${h.name}`);
const subs = (y) => list(y).filter((s) => s.includes('대체공휴일'));
const has = (y, name) => holidaysOf(y, H).some((h) => h.name === name);

/* 노동절·제헌절은 2026년부터 */
eq('2025년엔 노동절·제헌절 없음', [has(2025, '노동절'), has(2025, '제헌절')], [false, false]);
eq('2026·2030년 노동절·제헌절', [has(2026, '노동절'), has(2026, '제헌절'), has(2030, '노동절'), has(2030, '제헌절')], [true, true, true, true]);

/* 2025년 — 개정 전 규칙 (임시공휴일 1/27, 조기 대선 6/3은 계산 대상 아님) */
eq('2025년 대체공휴일', subs(2025), ['3/3 대체공휴일 (삼일절)', '5/6 대체공휴일 (부처님오신날)', '10/8 대체공휴일 (추석)']);

/* 2026년 — 월력요항 + 노동절·제헌절 (둘 다 금요일이라 대체공휴일 없음) */
eq('2026년 공휴일 전체', list(2026), [
  '1/1 신정', '2/16 설날 연휴', '2/17 설날', '2/18 설날 연휴', '3/1 삼일절', '3/2 대체공휴일 (삼일절)',
  '5/1 노동절', '5/5 어린이날', '5/24 부처님오신날', '5/25 대체공휴일 (부처님오신날)', '6/3 제9회 전국동시지방선거', '6/6 현충일',
  '7/17 제헌절', '8/15 광복절', '8/17 대체공휴일 (광복절)', '9/24 추석 연휴', '9/25 추석', '9/26 추석 연휴',
  '10/3 개천절', '10/5 대체공휴일 (개천절)', '10/9 한글날', '12/25 성탄절'
]);

/* 2027년 — 월력요항: 노동절 5/1(토)·제헌절 7/17(토) 대체공휴일, 실질 공휴일 72일 = 일요일 52일 + 20일 */
eq('2027년 대체공휴일', subs(2027), [
  '2/9 대체공휴일 (설날)', '5/3 대체공휴일 (노동절)', '7/19 대체공휴일 (제헌절)', '8/16 대체공휴일 (광복절)',
  '10/4 대체공휴일 (개천절)', '10/11 대체공휴일 (한글날)', '12/27 대체공휴일 (성탄절)'
]);
eq('2027년 일요일 아닌 공휴일 20일', new Set(holidaysOf(2027, H).filter((h) => H.weekday(h.y, h.m, h.d) !== 0).map((h) => `${h.m}/${h.d}`)).size, 20);

/* 일요일에 든 노동절·제헌절은 월요일로 (2033년), 앞선 대체공휴일과 겹치면 하루 더 밀림 (2039년 부처님오신날 4/30 토·노동절 5/1 일) */
eq('2033년 노동절·제헌절 대체', subs(2033).filter((s) => /노동절|제헌절/.test(s)), ['5/2 대체공휴일 (노동절)', '7/18 대체공휴일 (제헌절)']);
eq('2039년 부처님오신날·노동절 연달아 대체', subs(2039).filter((s) => /부처님오신날|노동절/.test(s)), ['5/2 대체공휴일 (부처님오신날)', '5/3 대체공휴일 (노동절)']);

eq('달력 안내문에 노동절·제헌절', ['노동절', '제헌절'].every((n) => SUBST_NOTE.includes(n)), true);

console.log(`${fail ? 'FAIL' : 'PASS'} — ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
