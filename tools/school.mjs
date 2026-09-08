/* 생일첩 학년 계산 — /school/ (인덱스·라이브 폼), /school/{y}/ 출생연도별 학년·입학·졸업 연도·법적 나이 (1950 ~ 올해)
 * build.mjs 가 헬퍼를 담은 컨텍스트로 buildSchool(c) 를 호출한다. schoolTitle·schoolDesc 는 순수 함수라 test-school.mjs 에서 길이를 검사한다. */
import { schoolOf, gradeOn, gradeList, legalAges, schoolYearOf, EARLY_LAST_YEAR, EARLY_OPTIONAL_YEAR } from '../data/school.mjs';
import { pensionAge } from '../data/meta.mjs';

export const SCHOOL_Y0 = 1950;
export const schoolUrl = (y) => `/school/${y}/`;
const pad2 = (n) => String(n).padStart(2, '0');
const manRange = (y, today) => { const n = today.y - y; return n <= 0 ? '0' : `${n - 1}~${n}`; };

export function schoolTitle(y, today) {
  const s = schoolOf(y), g = gradeOn(s.base, today);
  const man = manRange(y, today);
  if (g.stage === 'pre' || g.stage === 'unborn') return `${y}년생 학년 계산 — ${today.y}년 미취학(만 ${man}세), 초등 입학 ${s.elem}년·고등 졸업 ${s.hsGrad}년 (만 나이·성인 나이)`;
  if (g.k < 12) return `${y}년생 학년 계산 — ${today.m >= 3 ? g.sy + '년' : g.sy + '학년도'} ${g.label}, 입학 ${s.elem}년·고등 졸업 ${s.hsGrad}년 (만 나이·성인 나이)`;
  return `${y}년생 학년·나이 계산 — ${today.y}년 만 ${man}세, 초등 입학 ${s.elem}년·고등 졸업 ${s.hsGrad}년·${s.hakbun}학번`;
}

export function schoolDesc(y, today, ddiWord) {
  const s = schoolOf(y), e = schoolOf(y, 1), g = gradeOn(s.base, today);
  const yeon = today.y - y, man = manRange(y, today);
  if (g.stage === 'pre' || g.stage === 'unborn') return `${y}년생은 ${today.y}년 기준 미취학(만 ${man}세). 초등학교 입학 ${s.elem}년 3월, 중학교 ${s.mid}년, 고등학교 ${s.high}년, 수능 ${s.suneung}년, 대학 ${s.univ}년(${s.hakbun}학번). 학년별 연도표와 주민등록증·투표·성년이 되는 해까지.`;
  if (g.k < 12) return `${y}년생은 ${today.y}년 ${today.m}월 기준 ${g.label}(만 ${man}세, 연나이 ${yeon}세). 초등학교 입학 ${s.elem}년, 중학교 ${s.mid}년, 고등학교 ${s.high}년, 수능 ${s.suneung}년, 대학 ${s.univ}년(${s.hakbun}학번). 주민등록증·투표·운전면허·성년이 되는 해까지.`;
  const early = e.early ? ` 1~2월생은 빠른 ${pad2(y % 100)}에 해당해 ${e.elem}년 입학·${e.hakbun}학번.` : y === EARLY_OPTIONAL_YEAR ? ' 1~2월생이 2009년에 조기입학했다면 2002년생과 같은 학년.' : '';
  return `${y}년생은 ${today.y}년 기준 만 ${man}세(연나이 ${yeon}세, 세는나이 ${yeon + 1}세), ${ddiWord}. 초등학교 입학 ${s.elem}년, 고등학교 졸업 ${s.hsGrad}년, 대학 ${s.univ}년(${s.hakbun}학번).${early} 성년·국민연금·만 65세가 되는 해까지.`;
}

export function buildSchool(c) {
  const { shell, write, pad, today, Y0, Y1, SAJU, yearUrl, ddiOfYear, colorDdi, crumbs } = c;
  const MOMJA = 'https://momja.com';
  const Y1s = today.y;
  const sy = schoolYearOf(today);
  const past = (yr, mo) => today.y > yr || (today.y === yr && today.m >= mo);
  const status = (yr, mo) => (past(yr, mo) ? '지남' : yr === today.y ? '올해' : `${yr - today.y}년 뒤`);
  const shortOf = (y) => { const g = gradeOn(schoolOf(y).base, today); return g.k < 12 ? g.short : `만 ${manRange(y, today)}세`; };
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
    const syTxt = today.m >= 3 ? `${g.sy}년` : `${g.sy}학년도`;
    const headline = g.stage === 'pre' ? `${today.y}년 미취학, 만 ${man}세` : inSchool ? `${syTxt} ${g.label}, 만 ${man}세` : `만 ${man}세, ${s.hakbun}학번`;
    const nextLabel = inSchool && g.k < 11 ? grades[g.k + 1].label + (grades[g.k].last ? '으로 진학합니다' : '이 됩니다') : '';

    const lead = g.stage === 'pre'
      ? `${y}년에 태어난 아이는 <strong>${today.y}년 ${today.m}월</strong> 기준 <strong>미취학</strong>(만 ${man}세, 연나이 ${yeon}세)입니다. <strong>${s.elem}년 3월</strong>에 초등학교에 입학해 ${s.elemGrad}년 2월 졸업, ${s.mid}년 중학교, ${s.high}년 고등학교 입학, ${s.suneung}년 11월 수능, ${s.hsGrad}년 2월 고등학교 졸업 순서로 이어집니다. 재수 없이 대학에 가면 <strong>${s.univ}년 ${s.hakbun}학번</strong>이에요.`
      : inSchool
        ? `${y}년에 태어난 사람은 <strong>${today.y}년 ${today.m}월</strong> 기준 <strong>${g.label}</strong>입니다. ${s.elem}년 3월에 초등학교에 입학했고, ${past(s.suneung, 11) ? `${s.suneung}년 11월 수능을 거쳐 ` : `${s.suneung}년 11월 수능을 보고 `}${s.hsGrad}년 2월에 고등학교를 ${past(s.hsGrad, 2) ? '졸업했습니다' : '졸업합니다'}. 만 나이는 생일 전 ${yeon - 1}세·생일 후 ${yeon}세, 연나이 ${yeon}세, 세는나이 ${yeon + 1}세이고 ${color}입니다.`
        : `${y}년에 태어난 사람은 <strong>${today.y}년</strong> 기준 <strong>만 ${man}세</strong>(연나이 ${yeon}세, 세는나이 ${yeon + 1}세)이고 ${color}입니다. 초등학교는 ${s.elem}년 3월 입학, 고등학교는 ${s.hsGrad}년 2월 졸업, 재수 없이 대학에 갔다면 <strong>${s.univ}년 ${s.hakbun}학번</strong>입니다.${twoCol ? ` 1~2월생은 이른바 '빠른 ${yy}'에 해당해 한 해 먼저 ${e.elem}년에 입학했고 ${e.hakbun}학번이에요.` : ''}`;

    const factNow = g.stage === 'pre'
      ? `<div class="fact hi"><small>${today.y}년 지금</small><b>미취학</b><i>${s.elem}년 3월 초등학교 입학</i></div>`
      : inSchool
        ? `<div class="fact hi"><small>${syTxt} 지금 학년</small><b>${g.label}</b><i>${g.sy}년 3월 ~ ${g.sy + 1}년 2월</i></div>`
        : `<div class="fact hi"><small>${today.y}년 지금</small><b>${g.stage === 'univ' ? g.label : '졸업'}</b><i>${g.stage === 'univ' ? '재수 없이 진학 시' : '고등 졸업 ' + s.hsGrad + '년 2월'}</i></div>`;

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
    const gRows = grades.map((x) => { const cur = inSchool && x.k === g.k; return `<tr${cur ? ' class="sub"' : ''}><td>${x.year}년 3월 ~ ${x.year + 1}년 2월</td><td>${cur ? `<b>${x.label}</b> <span class="note">← 지금</span>` : x.label}</td><td>${x.year - y}세</td>${twoCol ? `<td>${x.year - 1}년 3월 ~ ${x.year}년 2월</td>` : ''}</tr>`; }).join('\n');
    const legalRows = legal.map((r) => `<tr><td>${r.name}${r.note ? `<br><span class="note">${r.note}</span>` : ''}</td><td>${r.basis === '연' ? '연나이' : '만'} ${r.age}세</td><td><b>${r.year}년</b> <span class="note">${r.basis === '연' ? '1월 1일부터' : '생일부터'}</span></td><td class="note">${r.year < today.y ? '지남' : r.year === today.y ? '올해' : `${r.year - today.y}년 뒤`}</td></tr>`).join('\n');

    const now = g.stage === 'pre'
      ? `<strong>${today.y}년 ${today.m}월</strong> 기준 아직 초등학교에 들어가기 전(만 ${man}세)입니다. <strong>${g.detail}</strong>이며, 입학하는 해 3월에 연나이 7세가 됩니다.`
      : inSchool
        ? `${today.y}년 ${today.m}월 기준 <strong>${g.label}</strong>입니다. ${g.sy}학년도(${g.sy}년 3월 ~ ${g.sy + 1}년 2월)이고, ${g.k === 11 ? `${s.hsGrad}년 2월에 고등학교를 졸업합니다` : `${g.sy + 1}년 3월부터 ${nextLabel}`}.`
        : g.stage === 'univ'
          ? `고등학교를 ${s.hsGrad}년 2월에 졸업했습니다. 재수·휴학 없이 4년제 대학에 갔다면 ${today.y}년 ${today.m}월 기준 <strong>대학 ${g.k - 11}학년</strong>(${s.hakbun}학번)이고, ${s.univGrad}년 2월에 졸업합니다.`
          : `고등학교는 ${s.hsGrad}년 2월에 졸업했고, 재수 없이 대학에 갔다면 ${s.univ}년 입학 ${s.hakbun}학번, ${s.univGrad}년 2월 졸업입니다. ${today.y}년 기준 만 ${man}세예요.`;
    const classmates = y < EARLY_LAST_YEAR ? `같은 학년은 ${y}년 3월생부터 ${y + 1}년 2월생까지입니다.` : y === EARLY_LAST_YEAR ? `같은 학년은 ${y}년 3~12월생입니다(2003년 1~2월생부터는 다음 학년).` : `같은 학년은 ${y}년 1월생부터 12월생까지입니다.`;

    const earlySection = twoCol ? `
<section>
<h2>${y}년 1~2월생 — '빠른 ${yy}'</h2>
<p>${y}년 1~2월생은 옛 초·중등교육법의 "만 6세가 된 날의 다음 날 이후 첫 학년초(3월 1일)" 규정에 따라 <strong>${y - 1}년생과 같은 학년</strong>으로 ${e.elem}년 3월에 입학했습니다. 이른바 '빠른 ${yy}'에 해당하며, 고등학교 졸업은 ${e.hsGrad}년 2월, 재수 없이 대학에 갔다면 <strong>${e.hakbun}학번</strong>입니다. 위 표의 '1~2월생' 열이 이 경우예요.</p>
<p class="note">빠른 년생은 2007년 법 개정으로 2009학년도 입학생부터 없어졌고, ${EARLY_LAST_YEAR}년 1~2월생이 마지막입니다. 취학 유예나 조기 입학을 했다면 실제 학년은 다를 수 있습니다.</p>
</section>` : optional ? `
<section>
<h2>2003년 1~2월생 — 빠른 년생이 없어진 첫해</h2>
<p>2003년생부터는 1~2월생도 같은 해 3~12월생과 함께 <strong>${s.elem}년 3월</strong>에 입학하는 것이 법 기준입니다. 2007년에 개정된 초·중등교육법이 "만 6세가 되는 해의 다음 해 3월 1일"을 취학일로 정했고, 2009학년도 입학생부터 적용됐기 때문이에요. 다만 개정 첫해에는 만 5세 조기입학을 신청만으로 할 수 있어서, 2003년 1~2월생 가운데 <strong>2009년에 입학해 2002년생과 같은 학년</strong>이 된 경우('빠른 03')도 있습니다. 그렇다면 초등학교 입학 2009년, 고등학교 졸업 2021년 2월, 21학번으로 위 표보다 한 해씩 앞당겨 보면 됩니다.</p>
</section>` : '';

    const faq3 = y + 19 <= today.y
      ? `<h3>${y}년생 국민연금은 언제부터 받나요?</h3><p>${y}년생의 국민연금 노령연금 수급 개시 연령은 만 ${pensionAge(y)}세로, ${y + pensionAge(y)}년 생일부터입니다. 기초연금과 지하철 무임승차 같은 노인 복지 기준은 만 65세(${y + 65}년)예요.</p>`
      : `<h3>${y}년생은 언제 성인이 되나요?</h3><p>민법상 성년은 만 19세로 ${y + 19}년 생일부터입니다. 술·담배는 청소년보호법이 연나이를 쓰기 때문에 ${y + 19}년 1월 1일부터 살 수 있고, 투표와 운전면허(1종·2종 보통)는 만 18세인 ${y + 18}년 생일부터, 주민등록증은 만 17세인 ${y + 17}년부터 발급받습니다.</p>`;
    const faq1 = g.stage === 'pre' ? `아직 미취학입니다. ${s.elem}년 3월에 초등학교 1학년이 됩니다.`
      : inSchool ? `${g.sy}학년도 기준 ${g.label}입니다. 학년은 매년 3월에 바뀌므로 ${g.k === 11 ? `${s.hsGrad}년 2월에 졸업합니다` : `${g.sy + 1}년 3월부터 ${nextLabel}`}.`
        : `이미 고등학교를 졸업한 나이입니다(${s.hsGrad}년 2월 졸업). ${today.y}년 기준 만 ${man}세예요.`;

    const near = [];
    for (let z = y - 6; z <= y + 6; z++) if (z >= SCHOOL_Y0 && z <= Y1s) near.push(`<a href="${schoolUrl(z)}"${z === y ? ' class="cur"' : ''}><b>${z}년생</b><small>${shortOf(z)}</small></a>`);

    const body = `
<div class="overline"><a href="/school/">생일첩 · 학년 계산</a> · ${yLink(y)}</div>
<h1>${y}년생 — ${headline}</h1>
<p class="lead">${lead}</p>
<div class="facts">
  ${factNow}
  <div class="fact"><small>만 나이 (${today.y}년)</small><b>${man}세</b><i>${yeon <= 0 ? '올해 태어남' : `생일 전 ${yeon - 1} · 생일 후 ${yeon}`}</i></div>
  <div class="fact"><small>연나이 / 세는나이</small><b>${yeon} / ${yeon + 1}세</b><i>${today.y} − ${y}</i></div>
  <div class="fact"><small>초등학교 입학</small><b>${s.elem}년 3월</b><i>${twoCol ? `1~2월생 ${e.elem}년 (빠른 ${yy})` : '1~2월생 동일'}</i></div>
  <div class="fact"><small>고등학교 졸업</small><b>${s.hsGrad}년 2월</b><i>수능 ${s.suneung}년 11월</i></div>
  <div class="fact"><small>학번 · 띠</small><b>${s.hakbun}학번</b><i>${color}</i></div>
</div>

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
<p class="note">학년도는 3월 1일에 시작해 다음 해 2월 말에 끝납니다. 1~2월은 아직 이전 학년도예요. 연나이는 그 학년도가 시작하는 해 기준입니다.</p>
</section>

<section>
<h2>${y}년생이 어른이 되는 해 — 법적 기준 나이</h2>
<div class="tw"><table><thead><tr><th>기준</th><th>나이</th><th>연도</th><th></th></tr></thead><tbody>
${legalRows}
</tbody></table></div>
<p class="note">현행 법령 기준입니다. 만 나이는 생일이 지나야 하고, 연나이는 그 해 1월 1일부터 적용됩니다. 과거에는 성년이 만 20세(2013년 6월까지), 선거권이 만 20세(2005년까지)·만 19세(2019년까지)였으므로 이미 지난 연도는 당시 기준과 다를 수 있어요. 청소년 관람불가 영화는 만 18세 이상이라도 고등학교 재학생은 볼 수 없습니다. 실제 적용은 해당 기관의 안내를 확인하세요.</p>
</section>
${earlySection}
<section>
<h2>다른 출생연도</h2>
<div class="grid">${near.join('')}</div>
<p class="note"><a href="/school/">${SCHOOL_Y0}~${Y1s}년생 전체 · 학년 계산기</a></p>
</section>

<section>
<h2>자주 묻는 질문</h2>
<h3>${y}년생은 ${today.y}년에 몇 학년인가요?</h3>
<p>${faq1}</p>
<h3>${y}년생 초등학교 입학 연도와 학번은?</h3>
<p>${s.elem}년 3월 초등학교 입학, ${s.hsGrad}년 2월 고등학교 졸업, 재수 없이 대학에 갔다면 ${s.univ}년 입학 ${s.hakbun}학번입니다.${twoCol ? ` 1~2월생(빠른 ${yy})은 ${e.elem}년 입학, ${e.hakbun}학번입니다.` : ''}</p>
${faq3}
</section>

<p class="callout">${child ? `자라는 아이의 예상 키는 부모 키로 계산하는 <a href="${MOMJA}/child-height/"><b>몸자 아이 키 예측</b></a>에서, ${ddi.animal} 아이의 2027년 흐름은 ${sajuDdi(y)}에서 이어집니다.` : `${y}년생 ${ddi.animal}의 2027년 흐름은 ${sajuDdi(y)}에서, 태어난 날까지 넣은 사주는 <a href="${SAJU}/">사주첩</a>에서 볼 수 있습니다.`}</p>
<p class="pn">${y - 1 >= SCHOOL_Y0 ? `<a href="${schoolUrl(y - 1)}">← ${y - 1}년생</a>` : '<span></span>'}${y + 1 <= Y1s ? `<a href="${schoolUrl(y + 1)}">${y + 1}년생 →</a>` : '<span></span>'}</p>
<p class="note">${yLink(y, `${y}년생 나이·띠·기념일`)} · <a href="/ddi/${ddi.slug}/">${ddi.animal} 해와 나이</a> · <a href="/age/">만 나이 계산기</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
`;
    write(url, shell({
      url, title, desc, body,
      jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '학년 계산', url: '/school/' }, { name: `${y}년생`, url }]),
        { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, datePublished: c.BUILD_ISO, dateModified: c.BUILD_ISO, inLanguage: 'ko', author: { '@type': 'Organization', name: '생일첩' }, publisher: { '@type': 'Organization', name: '생일첩' }, mainEntityOfPage: c.SITE + url }]
    }));
  }

  /* ---------- 인덱스 · 학년 계산기 ---------- */
  function indexPage() {
    const url = '/school/';
    const gradeRows = gradeList(sy - 7).map((x) => { const by = sy - 7 - x.k; return `<tr><td><b>${x.label}</b></td><td><a href="${schoolUrl(by)}">${by}년생</a>${by <= EARLY_LAST_YEAR ? ` <span class="note">+ ${by + 1}년 1~2월생</span>` : ''}</td><td>${manRange(by, today)}세</td><td>${by + 7}년</td><td>${by + 19}년 · ${pad2((by + 19) % 100)}학번</td></tr>`; }).join('\n');
    const decades = [];
    for (let d0 = SCHOOL_Y0; d0 <= Y1s; d0 += 10) {
      const ys = [];
      for (let y = d0; y < d0 + 10; y++) if (y >= SCHOOL_Y0 && y <= Y1s) ys.push(`<a href="${schoolUrl(y)}"><b>${y}</b><small>${shortOf(y)}</small></a>`);
      decades.push(`<h3>${d0}년대생</h3><div class="grid g6">${ys.join('')}</div>`);
    }
    const title = `학년 계산기 — 출생연도별 ${sy}년 몇 학년, 초·중·고 입학·졸업 연도, 학번, 성인 나이`;
    const desc = `출생연도를 넣으면 ${today.y}년 지금 몇 학년인지, 초등학교·중학교·고등학교 입학과 졸업 연도, 수능 연도, 학번, 주민등록증·투표·운전면허·성년이 되는 해를 계산합니다. 빠른 년생(2002년생까지 1~2월생) 반영, ${SCHOOL_Y0}~${Y1s}년생.`;
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>학년 계산기</h1>
<p class="lead">출생연도를 고르면 <strong>${today.y}년 지금 몇 학년인지</strong>, 초등학교·중학교·고등학교 입학과 졸업 연도, 수능 연도, 학번, 그리고 주민등록증·투표·운전면허·성년처럼 <strong>법적으로 어른이 되는 해</strong>를 계산합니다. 2002년생까지의 1~2월생(빠른 년생)도 반영해요. 계산은 브라우저 안에서만 이뤄지고 아무것도 저장되지 않습니다.</p>
<form class="form" id="school-form">
  <div class="row"><select name="y" data-min="${SCHOOL_Y0}" data-max="${Y1s}" aria-label="출생연도"></select><select name="m" aria-label="출생 월"></select></div>
  <button type="submit">학년·입학 연도 계산하기</button>
</form>
<div id="school-out" class="out" hidden></div>
<section>
<h2>${sy}학년도 학년별 출생연도</h2>
<div class="tw"><table><thead><tr><th>학년</th><th>출생연도</th><th>만 나이</th><th>초등 입학</th><th>대학 입학</th></tr></thead><tbody>
${gradeRows}
</tbody></table></div>
<p class="note">${sy}년 3월 ~ ${sy + 1}년 2월 학년도 기준. 만 나이는 생일 전이면 앞의 숫자, 생일이 지났으면 뒤의 숫자입니다. 출생연도를 누르면 그 해 태어난 사람의 입학·졸업 연도표와 법적 나이가 나옵니다.</p>
</section>
<section>
<h2>학년 계산 기준</h2>
<p><strong>초등학교 입학</strong>은 초·중등교육법에 따라 만 6세가 되는 해의 다음 해 3월 1일, 즉 <strong>출생연도 + 7년 3월</strong>입니다. 초등학교 6년, 중학교 3년, 고등학교 3년이 이어지고 모두 3월에 입학해 2월에 졸업합니다. 수능은 고3 11월, 학번은 대학 입학 연도의 뒤 두 자리예요. 4년제 대학은 입학 4년 뒤 2월에 졸업하고, 남성은 군 복무 기간만큼 늦어집니다.</p>
<h3>빠른 년생 (1~2월생)</h3>
<p>2007년 법 개정 전에는 "만 6세가 된 날의 다음 날 이후 첫 학년초"에 입학했기 때문에 1~2월생이 전년도 출생자와 같은 학년이 됐습니다. 이것이 '빠른 95', '빠른 02' 같은 <strong>빠른 년생</strong>이에요. 개정 규정은 2009학년도 입학생부터 적용되어 <strong>${EARLY_LAST_YEAR}년 1~2월생이 마지막 빠른 년생</strong>이고, 2003년생부터는 1~2월생도 같은 해 출생자와 함께 입학합니다. 2003년 1~2월생은 폐지 첫해 조기입학으로 2002년생과 같은 학년이 된 경우도 있어 <a href="${schoolUrl(2003)}">2003년생 페이지</a>에서 두 경우를 함께 보여 줍니다.</p>
<h3>만 나이 통일 (2023년 6월 28일)</h3>
<p>행정기본법·민법 개정으로 별도 규정이 없으면 나이는 만 나이입니다. 다만 취학 연령(초·중등교육법), 술·담배 구매(청소년보호법), 병역판정검사(병역법)는 여전히 "그 해에 몇 살이 되는가"라는 연나이 방식이라 학년 계산에는 달라진 것이 없어요. 성년·투표·운전면허·주민등록증은 생일이 지나야 하는 만 나이 기준입니다.</p>
</section>
<section id="years">
<h2>출생연도로 찾기</h2>
${decades.join('')}
</section>
<section>
<h2>자주 묻는 질문</h2>
<h3>${sy}년 초등학교 1학년은 몇 년생인가요?</h3>
<p>${sy - 7}년생입니다. ${sy - 7}년 1월부터 12월까지 태어난 아이가 ${sy}년 3월에 함께 입학했습니다. 중학교 1학년은 ${sy - 13}년생, 고등학교 1학년은 ${sy - 16}년생, 고3(${sy}년 수능)은 ${sy - 18}년생이에요.</p>
<h3>1~2월생은 몇 학년인가요?</h3>
<p>2003년생부터는 3~12월생과 같은 학년입니다. 2002년생까지는 1~2월생이 한 해 위 학년(빠른 년생)이었어요. 예를 들어 1995년 2월생은 1994년생과 같이 2001년에 입학해 13학번, 1995년 5월생은 2002년에 입학해 14학번입니다.</p>
<h3>학년은 언제 바뀌나요?</h3>
<p>매년 3월 1일에 새 학년도가 시작됩니다. 1~2월은 아직 이전 학년이라, 1월에 "몇 학년"을 물으면 지난해 3월에 올라간 학년으로 답하면 됩니다.</p>
</section>
<p class="note"><a href="/age/">만 나이 계산기</a> · <a href="/dday/">디데이·100일 계산기</a> · <a href="/cal/${today.y}/">${today.y}년 달력·공휴일</a> · <a href="/">생년월일로 내 페이지 열기</a></p>
`;
    write(url, shell({ url, title, desc, body, extraBody: '<script src="/js/tools.js" defer></script>', jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name: '학년 계산기', url }]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: '학년 계산기', url: c.SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0' } }] }));
  }

  /* ---------- 실행 ---------- */
  for (let y = SCHOOL_Y0; y <= Y1s; y++) yearSchoolPage(y);
  indexPage();
  return { SCHOOL_Y0, SCHOOL_Y1: Y1s, sy };
}
