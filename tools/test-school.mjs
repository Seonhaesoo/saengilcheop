/* 생일첩 — 학년·입학 연도·법적 나이 계산 테스트 (node tools/test-school.mjs) */
import { schoolOf, gradeOn, gradeList, legalAges, schoolYearOf, isEarly, EARLY_LAST_YEAR } from '../data/school.mjs';
import { schoolTitle, schoolDesc, SCHOOL_Y0 } from './school.mjs';
import { pensionAge } from '../data/meta.mjs';

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};
const T = { y: 2026, m: 9, d: 8 };   /* 고정 기준일 — 오늘과 무관하게 같은 답이 나와야 한다 */

/* 입학·졸업 연도 */
eq('2015년생 초등 입학', schoolOf(2015).elem, 2022);
eq('2015년생 초등 졸업', schoolOf(2015).elemGrad, 2028);
eq('2015년생 중1', schoolOf(2015).mid, 2028);
eq('2015년생 고1', schoolOf(2015).high, 2031);
eq('2015년생 수능', schoolOf(2015).suneung, 2033);
eq('2015년생 고등 졸업', schoolOf(2015).hsGrad, 2034);
eq('2015년생 대학 입학·학번', [schoolOf(2015).univ, schoolOf(2015).hakbun], [2034, '34']);
eq('2015년생 대학 졸업', schoolOf(2015).univGrad, 2038);
eq('2002년 5월생 입학', schoolOf(2002, 5).elem, 2009);
eq('2002년 5월생 빠른 아님', schoolOf(2002, 5).early, false);
eq('2002년 1월생 빠른 02', [schoolOf(2002, 1).early, schoolOf(2002, 1).elem, schoolOf(2002, 1).hakbun], [true, 2008, '20']);
eq('2002년 2월생 빠른 02', schoolOf(2002, 2).elem, 2008);
eq('2002년 3월생 정상', schoolOf(2002, 3).elem, 2009);
eq('2003년 1월생 — 법 기준 2010년 (조기입학은 페이지에서 따로 설명)', [schoolOf(2003, 1).early, schoolOf(2003, 1).elem], [false, 2010]);
eq('2004년 1월생 2011년', schoolOf(2004, 1).elem, 2011);
eq('1995년 2월생 빠른 95 → 13학번', [schoolOf(1995, 2).elem, schoolOf(1995, 2).hakbun], [2001, '13']);
eq('1995년 5월생 → 14학번', [schoolOf(1995, 5).elem, schoolOf(1995, 5).hakbun], [2002, '14']);
eq('빠른 년생 마지막 연도', EARLY_LAST_YEAR, 2002);
eq('isEarly 경계', [isEarly(2002, 2), isEarly(2002, 3), isEarly(2003, 1), isEarly(1990, 1)], [true, false, false, true]);
eq('학번 두 자리', [schoolOf(1980).hakbun, schoolOf(1981).hakbun, schoolOf(2007).hakbun], ['99', '00', '26']);

/* 학년도·지금 학년 */
eq('학년도 9월', schoolYearOf({ y: 2026, m: 9, d: 8 }), 2026);
eq('학년도 2월', schoolYearOf({ y: 2027, m: 2, d: 1 }), 2026);
eq('학년도 3월 1일', schoolYearOf({ y: 2027, m: 3, d: 1 }), 2027);
eq('2015년생 2026년 9월 → 초5', [gradeOn(2015, T).label, gradeOn(2015, T).short, gradeOn(2015, T).k], ['초등학교 5학년', '초5', 4]);
eq('2015년생 2027년 1월 → 아직 초5', gradeOn(2015, { y: 2027, m: 1, d: 10 }).label, '초등학교 5학년');
eq('2015년생 2027년 3월 → 초6', gradeOn(2015, { y: 2027, m: 3, d: 2 }).label, '초등학교 6학년');
eq('2019년생 2026년 → 초1', gradeOn(2019, T).label, '초등학교 1학년');
eq('2013년생 2026년 → 중1', gradeOn(2013, T).label, '중학교 1학년');
eq('2008년생 2026년 → 고3', [gradeOn(2008, T).label, gradeOn(2008, T).stage], ['고등학교 3학년', 'high']);
eq('2020년생 2026년 → 미취학, 내년 입학', [gradeOn(2020, T).stage, gradeOn(2020, T).detail], ['pre', '내년 3월 초등학교 입학 (예비 초등학생)']);
eq('2020년생 2027년 1월 → 올해 입학', gradeOn(2020, { y: 2027, m: 1, d: 5 }).detail, '올해 3월 초등학교 입학');
eq('2026년생 → 미취학', gradeOn(2026, T).stage, 'pre');
eq('2027년생 → 출생 전', gradeOn(2027, T).stage, 'unborn');
eq('2007년생 2026년 → 대학 1학년', [gradeOn(2007, T).stage, gradeOn(2007, T).label], ['univ', '대학 1학년']);
eq('2000년생 2026년 → 졸업', gradeOn(2000, T).stage, 'done');
eq('빠른 02 (base 2001) 2026년 → 졸업', gradeOn(schoolOf(2002, 1).base, T).stage, 'done');
eq('학년 목록 12개', gradeList(2015).length, 12);
eq('학년 목록 고3 연도', gradeList(2015)[11], { k: 11, year: 2033, school: '고등학교', grade: 3, label: '고등학교 3학년', short: '고3', last: true });

/* 법적 기준 나이 */
const L = Object.fromEntries(legalAges(2008).map((r) => [r.key, r]));
eq('2008년생 주민등록증', [L.id.age, L.id.year], [17, 2025]);
eq('2008년생 투표·운전면허·혼인 만 18', [L.vote.year, L.drive.year, L.marry.year], [2026, 2026, 2026]);
eq('2008년생 원동기 만 16', L.moped.year, 2024);
eq('2008년생 성년 만 19', [L.adult.year, L.adult.from], [2027, '2027년 생일부터']);
eq('2008년생 술·담배 연나이 19 → 1월 1일부터', [L.youth.basis, L.youth.from], ['연', '2027년 1월 1일부터']);
eq('2008년생 병역판정검사 19세 되는 해', L.draft.year, 2027);
eq('2008년생 만 65세', L.senior.year, 2073);
eq('2008년생 국민연금 수급 만 65', [L.pension.age, L.pension.year], [65, 2073]);
eq('연금 수급 연령 구간', [pensionAge(1952), pensionAge(1953), pensionAge(1956), pensionAge(1957), pensionAge(1960), pensionAge(1961), pensionAge(1964), pensionAge(1965), pensionAge(1968), pensionAge(1969)], [60, 61, 61, 62, 62, 63, 63, 64, 64, 65]);
eq('1960년생 연금 수급 2022년', legalAges(1960).find((r) => r.key === 'pension').year, 2022);

/* 제목·설명 — 형식과 길이 */
eq('2015년생 제목', schoolTitle(2015, T), '2015년생 학년 계산 — 2026년 초등학교 5학년, 입학 2022년·고등 졸업 2034년 (만 나이·성인 나이)');
eq('2002년생 제목', schoolTitle(2002, T), '2002년생 학년·나이 계산 — 2026년 만 23~24세, 초등 입학 2009년·고등 졸업 2021년·21학번');
eq('2022년생 제목', schoolTitle(2022, T), '2022년생 학년 계산 — 2026년 미취학(만 3~4세), 초등 입학 2029년·고등 졸업 2041년 (만 나이·성인 나이)');
eq('2015년생 2027년 1월 제목은 학년도 표기', schoolTitle(2015, { y: 2027, m: 1, d: 10 }).startsWith('2015년생 학년 계산 — 2026학년도 초등학교 5학년'), true);
let longTitle = 0, longDesc = 0;
for (let y = SCHOOL_Y0; y <= T.y; y++) {
  for (const t of [T, { y: 2027, m: 1, d: 10 }, { y: 2027, m: 3, d: 1 }]) {
    const title = schoolTitle(y, t), desc = schoolDesc(y, t, '푸른 뱀띠');
    if (title.length > 70) { longTitle++; console.log(`제목 ${title.length}자: ${title}`); }
    if (desc.length > 160) { longDesc++; console.log(`설명 ${desc.length}자: ${desc}`); }
  }
}
eq('제목 70자 이하 (1950~올해 × 기준일 3종)', longTitle, 0);
eq('설명 160자 이하', longDesc, 0);
eq('2002년생 설명에 빠른 02', schoolDesc(2002, T, '검은 말띠').includes('빠른 02에 해당해 2008년 입학·20학번'), true);
eq('2003년생 설명에 조기입학', schoolDesc(2003, T, '푸른 양띠').includes('2009년에 조기입학'), true);

console.log(`${fail ? 'FAIL' : 'PASS'} — ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
