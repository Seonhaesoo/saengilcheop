/* 생일첩 — 학년·입학·졸업 연도와 법적 기준 나이 (한국 학제: 3월 입학, 2월 졸업)
 *
 * 취학: 초·중등교육법 제13조 — "6세가 된 날이 속하는 해의 다음 해 3월 1일" = 출생연도 + 7년 3월.
 * 빠른 년생: 2007.8.3 개정 전에는 "만 6세가 된 날의 다음 날 이후 첫 학년초(3월 1일)"라 1~2월생이
 *   전년도 출생자와 같은 학년이었다. 개정 규정은 2009학년도 입학생부터 적용되어 2002년 3~12월생이
 *   2009년에, 2003년생은 1~2월생까지 모두 2010년에 입학했다 — 법 기준 마지막 빠른 년생은 2002년 1~2월생.
 *   (2003년 1~2월생은 개정 첫해 만 5세 조기입학 신청으로 2009년에 들어간 경우도 있어 페이지에서 두 경우를 함께 보여 준다.) */
import { pensionAge } from './meta.mjs';

export const EARLY_LAST_YEAR = 2002;      /* 1~2월생이 한 해 먼저 입학한 마지막 출생연도 */
export const EARLY_OPTIONAL_YEAR = 2003;  /* 폐지 첫해 — 1~2월생 조기입학이 잦았던 해 */
export const isEarly = (y, m) => y <= EARLY_LAST_YEAR && m >= 1 && m <= 2;

/* 출생연도(·월) → 입학·졸업 연도. base 는 같은 학년의 3~12월생 출생연도 */
export function schoolOf(y, m = 6) {
  const early = isEarly(y, m);
  const base = early ? y - 1 : y;
  return {
    early, base,
    elem: base + 7, elemGrad: base + 13,            /* 초등학교 입학 3월 · 졸업 2월 */
    mid: base + 13, midGrad: base + 16,             /* 중학교 */
    high: base + 16, suneung: base + 18, hsGrad: base + 19,   /* 고등학교 · 고3 수능 11월 */
    univ: base + 19, univGrad: base + 23, univGradMil: base + 25,   /* 대학 4년제 · 군 복무 시 보통 +2 */
    hakbun: String((base + 19) % 100).padStart(2, '0')
  };
}

export const SCHOOLS = [['초등학교', '초', 6], ['중학교', '중', 3], ['고등학교', '고', 3]];

/* 초1~고3 열두 학년 — k: 0(초1) ~ 11(고3), year: 그 학년의 학년도(3월 시작) */
export function gradeList(base) {
  const out = [];
  let k = 0;
  for (const [school, abbr, n] of SCHOOLS) {
    for (let g = 1; g <= n; g++, k++) out.push({ k, year: base + 7 + k, school, grade: g, label: `${school} ${g}학년`, short: `${abbr}${g}`, last: g === n });
  }
  return out;
}

/* 학년도 — 3월에 바뀐다 (1~2월은 이전 학년도) */
export const schoolYearOf = (today) => (today.m >= 3 ? today.y : today.y - 1);

/* 오늘 기준 학년 */
export function gradeOn(base, today) {
  const sy = schoolYearOf(today);
  const elem = base + 7;
  const k = sy - elem;
  if (base > today.y) return { sy, k, stage: 'unborn', label: '아직 태어나기 전', short: '출생 전' };
  if (k < 0) {
    const detail = elem === today.y ? '올해 3월 초등학교 입학' : elem === today.y + 1 ? '내년 3월 초등학교 입학 (예비 초등학생)' : `${elem}년 3월 초등학교 입학 예정`;
    return { sy, k, stage: 'pre', label: '미취학', short: '미취학', detail };
  }
  if (k < 12) {
    const g = gradeList(base)[k];
    return { sy, k, stage: g.school === '초등학교' ? 'elem' : g.school === '중학교' ? 'mid' : 'high', label: g.label, short: g.short, grade: g };
  }
  if (k < 16) return { sy, k, stage: 'univ', label: `대학 ${k - 11}학년`, short: `대${k - 11}`, detail: '재수·휴학 없이 4년제에 진학했을 때' };
  return { sy, k, stage: 'done', label: '졸업', short: '졸업' };
}

/* 법적 기준 나이 — 현행 법령. basis '만'은 생일부터, '연'은 그 해 1월 1일부터 */
export function legalAges(y) {
  const p = pensionAge(y);
  const rows = [
    { key: 'moped', name: '원동기장치자전거 면허', age: 16, basis: '만', law: '도로교통법', note: '125cc 이하 오토바이·전동킥보드' },
    { key: 'id', name: '주민등록증 발급', age: 17, basis: '만', law: '주민등록법', note: '만 17세가 된 날부터 12개월 안에 신청' },
    { key: 'vote', name: '선거권 (투표)', age: 18, basis: '만', law: '공직선거법', note: '선거일 기준 만 18세 이상' },
    { key: 'drive', name: '운전면허 (1종·2종 보통)', age: 18, basis: '만', law: '도로교통법', note: '' },
    { key: 'marry', name: '혼인', age: 18, basis: '만', law: '민법', note: '만 19세 전에는 부모 동의 필요' },
    { key: 'pension-join', name: '국민연금 가입', age: 18, basis: '만', law: '국민연금법', note: '만 18세 이상 60세 미만' },
    { key: 'youth', name: '술·담배 구매, 청소년 출입 제한 해제', age: 19, basis: '연', law: '청소년보호법', note: '만 19세가 되는 해 1월 1일부터' },
    { key: 'draft', name: '병역판정검사 (남성)', age: 19, basis: '연', law: '병역법', note: '19세가 되는 해에 검사' },
    { key: 'adult', name: '성년 — 부모 동의 없이 계약·혼인, 청소년 관람불가 영화', age: 19, basis: '만', law: '민법 제4조', note: '' },
    { key: 'retire', name: '법정 정년 (하한)', age: 60, basis: '만', law: '고용상 연령차별금지법', note: '정년은 60세 이상으로 정해야 함' },
    { key: 'senior', name: '경로우대·지하철 무임승차·기초연금', age: 65, basis: '만', law: '노인복지법·기초연금법', note: '기초연금은 소득 하위 70%' },
    { key: 'pension', name: '국민연금 노령연금 수급 개시', age: p, basis: '만', law: '국민연금법', note: `${y}년생은 만 ${p}세부터` }
  ];
  return rows.map((r) => ({ ...r, year: y + r.age, from: r.basis === '연' ? `${y + r.age}년 1월 1일부터` : `${y + r.age}년 생일부터` }));
}
