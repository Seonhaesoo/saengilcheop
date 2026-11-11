/* 수능 시행일·성적 통지일 — 교육부 보도자료로 확인한 것만 넣는다(추정 금지).
 * 새 학년도 날짜가 발표되면 한 줄 추가하고 tools/calc.mjs 의 CALC_DATE 를 그날로 바꾼다. */
export const SUNEUNG = [
  { name: '2027학년도', exam: [2026, 11, 19], score: [2026, 12, 11], grade3: 2008,
    src: '교육부 보도자료 「2027학년도 대학수학능력시험은 2026년 11월 19일(목)에 시행됩니다」 (2024. 8. 16.)', href: 'https://eiec.kdi.re.kr/policy/materialView.do?num=255989' },
  { name: '2028학년도', exam: [2027, 11, 18], score: [2027, 12, 10], grade3: 2009,
    src: '교육부 보도자료 「2028학년도 대학수학능력시험은 2027년 11월 18일(목)에 시행됩니다」 (2025. 6. 2.)', href: 'https://eiec.kdi.re.kr/policy/materialView.do?num=267335' }
];
