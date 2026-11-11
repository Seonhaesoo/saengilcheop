/* 생일첩 날짜 계산기 — 전역일(/army/), 연애 기념일(/couple/), 결혼기념일(/wedding/), 수능 D-day(/suneung/)
 * 계산은 src/js/calc.js 의 K 를 그대로 불러 쓴다(브라우저와 같은 코드). 여기서는 설명 글과 빌드 시점 예시 표를 만든다.
 * build.mjs 가 헬퍼를 담은 컨텍스트로 buildCalc(c) 를 호출한다. */
import { createRequire } from 'node:module';
import { SUNEUNG } from '../data/suneung.mjs';

const require = createRequire(import.meta.url);
export const K = require('../src/js/calc.js');

/* 이 네 페이지의 글을 마지막으로 고친 날 — 사이트맵 lastmod. 글·기준을 고칠 때만 바꾼다 */
export const CALC_DATE = '2026-11-11';
export const CALC_URLS = ['/army/', '/couple/', '/wedding/', '/suneung/'];
const MMA_URL = 'https://www.mma.go.kr/contents.do?mc=usr0000041';
const STDICT_URL = 'https://stdict.korean.go.kr/';

export function buildCalc(c) {
  const { shell, write, crumbs, faqLd, today, lastmod, SITE } = c;
  const T = K.date(today.y, today.m, today.d);
  const W = (o) => K.WD[o.w];
  const wdCls = (w) => (w === 0 ? 'sun' : w === 6 ? 'sat' : '');
  const dW = (o) => `${K.fmt(o)} (${W(o)})`;
  const tdW = (o) => `<td>${K.fmt(o)}</td><td class="${wdCls(o.w)}">${W(o)}</td>`;
  const faqHtml = (faq) => `<section>\n<h2>자주 묻는 질문</h2>\n${faq.map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`).join('\n')}\n</section>`;
  const app = (name, url) => ({ '@context': 'https://schema.org', '@type': 'WebApplication', name, url: SITE + url, applicationCategory: 'UtilityApplication', operatingSystem: 'Web', inLanguage: 'ko', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } });
  const page = ({ url, name, title, desc, body, faq, extraBody }) => {
    lastmod[url] = CALC_DATE;
    write(url, shell({ url, title, desc, body, extraBody: (extraBody || '') + '<script src="/js/calc.js" defer></script>', jsonld: [crumbs([{ name: '생일첩', url: '/' }, { name, url }]), app(name, url), faqLd(faq)] }));
  };
  const others = (cur) => `<p class="note">${[['/army/', '전역일 계산기'], ['/couple/', '연애 기념일 계산기'], ['/wedding/', '결혼기념일 계산기'], ['/suneung/', '수능 D-day'], ['/age/', '만 나이 계산기'], ['/dday/', '디데이·100일 계산기']].filter(([u]) => u !== cur).map(([u, n]) => `<a href="${u}">${n}</a>`).join(' · ')}</p>`;

  /* ---------- 전역일 계산기 ---------- */
  function armyPage() {
    const url = '/army/';
    const S = K.SERVICES;
    const ex = [
      ['보통', K.date(2025, 5, 12), 18, '18개월 뒤 같은 날(2026년 11월 12일)의 하루 전'],
      ['월말 입대', K.date(2025, 8, 31), 18, '18개월 뒤인 2027년 2월에는 31일이 없어 그 달 말일'],
      ['윤년', K.date(2026, 8, 30), 18, '18개월 뒤인 2028년 2월에는 30일이 없어 말일인 2월 29일(윤년)'],
      ['1일 입대', K.date(2026, 3, 1), 21, '공군 21개월. 2027년 12월 1일의 하루 전']
    ];
    /* 오늘 전역하는 사람의 입대일 (없거나 여럿일 수 있다) */
    const starts = (months) => { const out = []; for (let i = -4; i <= 4; i++) { const idx = T.y * 12 + (T.m - 1) - months; const y = Math.floor(idx / 12), m = idx % 12 + 1; const s = K.addDays(K.date(y, m, Math.min(T.d, K.dim(y, m))), i); if (K.diff(K.termEnd(s, months), T) === 0) out.push(s); } return out; };
    const title = '전역일 계산기 — 입대일로 전역일·남은 날·복무율 (육군·해군·공군·해병대·사회복무요원)';
    const desc = '입대일과 군별을 고르면 전역일과 요일, 남은 날(D-day), 복무율을 계산합니다. 육군·해병대 18개월, 해군 20개월, 공군·사회복무요원 21개월. 병무청 복무기간 기준, 월말 입대와 윤년도 반영.';
    const faq = [
      ['전역일은 어떻게 계산하나요?', '입대일에 복무기간(개월)을 더한 날의 하루 전입니다. 육군으로 2025년 5월 12일에 입대했다면 18개월 뒤인 2026년 11월 12일의 하루 전, 2026년 11월 11일이 전역일입니다.'],
      ['31일에 입대하면 전역일은 언제인가요?', '복무기간을 더한 달에 31일이 없으면 그 달 말일이 전역일입니다. 2025년 8월 31일 육군 입대라면 2027년 2월 28일입니다. 30일·29일 입대도 2월에 걸리면 같은 식으로 말일이 됩니다.'],
      ['복무율은 어떻게 계산하나요?', '입대일부터 오늘까지의 날수를 입대일부터 전역일까지의 전체 날수로 나눕니다. 입대일과 오늘을 모두 하루로 세고, 전역일에 100%가 됩니다.'],
      ['사회복무요원 소집해제일도 계산되나요?', '됩니다. 군별에서 사회복무요원(21개월)을 고르고 소집일을 넣으세요. 다만 복무 이탈 등으로 늘어난 기간은 반영하지 않습니다.'],
      ['진급일은 왜 안 나오나요?', '지금 적용되는 병사 진급 기준을 공식 자료로 확인하지 못해 넣지 않았습니다. 조기 전역이나 복무기간 조정도 같은 이유로 뺐습니다.']
    ];
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>전역일 계산기</h1>
<p class="lead">입대일과 군별을 고르면 <strong>전역일</strong>과 요일, <strong>남은 날</strong>, <strong>복무율</strong>을 알려 드립니다. 계산은 브라우저 안에서만 이뤄지고 아무것도 저장되지 않습니다.</p>
<form class="form" id="army-form">
  <label class="frow-label">입대일 <input type="date" name="start" min="1990-01-01" max="2100-12-31" aria-label="입대일"></label>
  <label class="frow-label">군별 <select name="type" aria-label="군별">${S.map((s) => `<option value="${s.id}">${s.name} (${s.months}개월)</option>`).join('')}</select></label>
  <button type="submit">전역일 계산하기</button>
</form>
<div id="army-out" class="out" hidden></div>
<section>
<h2>군별 복무기간</h2>
<div class="tw"><table><thead><tr><th>구분</th><th>복무기간</th><th>${K.fmt(T)} 입대라면</th><th>요일</th></tr></thead><tbody>
${S.map((s) => { const e = K.termEnd(T, s.months); return `<tr><td><b>${s.name}</b></td><td>${s.months}개월</td>${tdW(e)}</tr>`; }).join('\n')}
</tbody></table></div>
<p class="note">복무기간은 <a href="${MMA_URL}" rel="noopener">병무청 병역이행안내 '복무기간' 표</a>를 따랐습니다(2026년 11월 확인). 같은 표에서 산업기능요원은 현역 대상 34개월·보충역 대상 23개월, 전문연구요원은 36개월입니다.</p>
</section>
<section>
<h2>오늘 전역하는 사람은 언제 입대했을까</h2>
<div class="tw"><table><thead><tr><th>구분</th><th>입대일</th></tr></thead><tbody>
${S.map((s) => `<tr><td><b>${s.name}</b></td><td>${starts(s.months).map(dW).join(', ') || '해당하는 날 없음'}</td></tr>`).join('\n')}
</tbody></table></div>
<p class="note">${K.fmt(T)} 기준. 말일에 전역하는 달은 입대일이 여러 날일 수 있습니다.</p>
</section>
<section>
<h2>계산 방법</h2>
<p>전역일은 <strong>입대일 + 복무기간(개월)의 하루 전</strong>입니다. 더한 달에 같은 날짜가 없으면(예: 2월 30일) 그 달 <strong>말일</strong>로 봅니다. 기간을 월로 정했을 때의 일반적인 계산법(민법 제160조)과 같습니다.</p>
<div class="tw"><table><thead><tr><th>경우</th><th>입대일</th><th>전역일</th><th>설명</th></tr></thead><tbody>
${ex.map(([k, s, mo, why]) => `<tr><td><b>${k}</b></td><td>${dW(s)}</td><td>${dW(K.termEnd(s, mo))}</td><td class="note">${why}</td></tr>`).join('\n')}
</tbody></table></div>
<p><strong>복무율</strong>은 (입대일부터 오늘까지 날수) ÷ (입대일부터 전역일까지 날수)입니다. <strong>남은 날</strong>은 오늘을 빼고 전역일까지 센 날수라, 전역일 당일이 D-day입니다.</p>
<p class="callout">넣지 않은 것: 진급 예정일, 조기 전역, 징계·복무 이탈 등으로 달라지는 기간, 전역 전 휴가. 공식 자료로 기준을 확인하지 못했거나 사람마다 달라서 뺐습니다. 실제 전역일은 소속 부대나 병무청에서 확인하세요.</p>
</section>
${faqHtml(faq)}
${others(url)}
`;
    page({ url, name: '전역일 계산기', title, desc, body, faq });
  }

  /* ---------- 연애 기념일 계산기 ---------- */
  function couplePage() {
    const url = '/couple/';
    const picks = [['100일', 'day', 100], ['200일', 'day', 200], ['300일', 'day', 300], ['1주년', 'year', 1], ['500일', 'day', 500], ['2주년', 'year', 2], ['1,000일', 'day', 1000]];
    const at = (start, kind, n, inc) => (kind === 'year' ? K.addYears(start, n) : K.addDays(start, n - (inc ? 1 : 0)));
    const leap = K.date(2024, 2, 29);
    const title = '연애 기념일 계산기 — 사귄 날로 100일·200일·1주년·1000일 날짜와 요일';
    const desc = '사귄 날을 넣으면 100일·200일·300일·1주년·500일·1000일이 며칠 무슨 요일인지, 오늘이 며칠째인지 계산합니다. 사귄 날을 1일로 세는 방식이 기본이고, 다음 날부터 세는 방식으로 바꿀 수 있습니다.';
    const faq = [
      ['100일은 사귄 날부터 어떻게 세나요?', '보통 사귄 날을 1일로 셉니다. 그러면 100일은 사귄 날에서 99일 뒤입니다. 사귄 다음 날을 1일로 세면 하루 늦어져 100일 뒤가 됩니다. 계산기의 체크박스로 바꿀 수 있습니다.'],
      ['1주년과 365일은 같은 날인가요?', '다릅니다. 1주년은 다음 해 같은 날짜이고, 사귄 날을 1일로 세면 365일째는 그 하루 전입니다. 사이에 2월 29일이 끼면 이틀 차이가 납니다.'],
      ['1000일은 몇 년쯤인가요?', '2년 9개월 정도입니다. 2주년이 지나고 약 270일 뒤에 1000일이 옵니다.'],
      ['2월 29일에 사귀기 시작했으면 주년은 언제인가요?', '윤년이 아닌 해에는 2월 28일로 계산합니다. 3월 1일에 챙기는 커플도 있으니 둘이 정하면 됩니다.']
    ];
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>연애 기념일 계산기</h1>
<p class="lead">사귄 날을 넣으면 <strong>100일·200일·300일·1주년·500일·1000일</strong>이 며칠, 무슨 요일인지와 <strong>오늘이 며칠째</strong>인지 알려 드립니다. 날짜는 브라우저 안에서만 계산하고 저장하지 않습니다.</p>
<form class="form" id="couple-form">
  <label class="frow-label">사귄 날 <input type="date" name="start" min="1950-01-01" max="2100-12-31" aria-label="사귄 날"></label>
  <label class="frow-label chk"><input type="checkbox" name="inclusive" checked> 사귄 날을 1일로 셉니다 (끄면 다음 날부터 1일)</label>
  <button type="submit">기념일 계산하기</button>
</form>
<div id="couple-out" class="out" hidden></div>
<section>
<h2>세는 방법</h2>
<p>이 계산기는 <strong>사귄 날을 1일</strong>로 셉니다. 커플 기념일에 가장 널리 쓰는 방식이고, 100일은 사귄 날에서 99일 뒤가 됩니다. 체크를 끄면 <strong>사귄 다음 날을 1일</strong>로 세어 모든 '○○일' 기념일이 하루씩 늦어집니다. 1주년·2주년 같은 주년은 어느 쪽이든 같은 월일입니다.</p>
<h3>오늘 사귀기 시작하면</h3>
<div class="tw"><table><thead><tr><th>기념일</th><th>사귄 날을 1일로</th><th>요일</th><th>다음 날부터 1일</th></tr></thead><tbody>
${picks.map(([label, kind, n]) => { const a = at(T, kind, n, true), b = at(T, kind, n, false); return `<tr><td><b>${label}</b></td>${tdW(a)}<td class="note">${kind === 'year' ? '같음' : dW(b)}</td></tr>`; }).join('\n')}
</tbody></table></div>
<p class="note">${dW(T)}에 사귀기 시작한 경우입니다.</p>
<h3>오늘이 기념일인 커플</h3>
<div class="tw"><table><thead><tr><th>오늘이</th><th>사귄 날 (1일로 셈)</th><th>요일</th></tr></thead><tbody>
${picks.map(([label, kind, n]) => { const s = kind === 'year' ? K.date(T.y - n, T.m, Math.min(T.d, K.dim(T.y - n, T.m))) : K.addDays(T, -(n - 1)); return `<tr><td><b>${label}</b></td>${tdW(s)}</tr>`; }).join('\n')}
</tbody></table></div>
<p class="note">${K.fmt(T)} 기준.</p>
<h3>윤년 2월 29일에 사귀었다면</h3>
<p>${dW(leap)}에 사귀기 시작했다면 100일은 ${dW(at(leap, 'day', 100, true))}, 1주년은 ${dW(K.addYears(leap, 1))}, 4주년은 다시 ${dW(K.addYears(leap, 4))}입니다. 2월 29일이 없는 해의 주년은 2월 28일로 계산합니다.</p>
</section>
${faqHtml(faq)}
${others(url)}
`;
    page({ url, name: '연애 기념일 계산기', title, desc, body, faq });
  }

  /* ---------- 결혼기념일 계산기 ---------- */
  function weddingPage() {
    const url = '/wedding/';
    const names = Object.keys(K.WEDDING_NAMES).map(Number);
    const ex = K.date(2017, 5, 20), exR = K.wedding(ex, T);
    const leap = K.date(2020, 2, 29);
    const title = '결혼기념일 계산기 — 몇 주년인지, 다음 기념일 날짜·요일, 결혼한 지 며칠';
    const desc = '결혼한 날을 넣으면 올해가 결혼 몇 주년인지, 다음 결혼기념일의 날짜와 요일, D-day, 결혼한 지 며칠째인지 계산합니다. 은혼식(25주년)·금혼식(50주년) 같은 기념일 이름과 해당 연도 표 포함.';
    const faq = [
      ['결혼 몇 주년인지는 어떻게 세나요?', '결혼한 날에서 꼭 1년이 지난 날이 1주년입니다. 올해에서 결혼한 해를 뺀 숫자가 올해 맞는 주년이고, 올해 기념일이 아직 안 왔다면 지난 기념일은 그보다 하나 적습니다.'],
      ['은혼식과 금혼식은 몇 주년인가요?', '표준국어대사전 기준으로 은혼식은 결혼 25주년, 금혼식은 50주년입니다. 60주년은 금강혼식이라 하고, 우리 전통으로는 회혼(回婚)이라 부릅니다.'],
      ['지혼식·면혼식 같은 이름은 왜 자료마다 다른가요?', '서양 풍속에서 들어온 이름이라 나라와 자료에 따라 주년과 이름이 조금씩 다릅니다. 이 페이지는 표준국어대사전에 실린 이름과 주년만 적었습니다.'],
      ['2월 29일에 결혼했으면 기념일은 언제인가요?', '윤년이 아닌 해에는 2월 28일로 계산합니다. 3월 1일에 기념하는 부부도 있습니다.'],
      ['결혼기념일은 혼인신고일과 결혼식 날 중 무엇으로 하나요?', '정해진 규칙은 없고, 대부분 결혼식을 올린 날로 합니다. 이 계산기에는 기념하려는 날짜를 넣으면 됩니다.']
    ];
    const body = `
<div class="overline">생일첩 · 계산기</div>
<h1>결혼기념일 계산기</h1>
<p class="lead">결혼한 날을 넣으면 <strong>몇 주년</strong>인지, <strong>다음 결혼기념일</strong>의 날짜·요일과 D-day, <strong>결혼한 지 며칠</strong>인지 알려 드립니다. 날짜는 브라우저 안에서만 계산하고 저장하지 않습니다.</p>
<form class="form" id="wedding-form">
  <label class="frow-label">결혼한 날 <input type="date" name="start" min="1900-01-01" max="2100-12-31" aria-label="결혼한 날"></label>
  <button type="submit">결혼기념일 계산하기</button>
</form>
<div id="wedding-out" class="out" hidden></div>
<section>
<h2>${T.y}년에 맞는 결혼기념일</h2>
<div class="tw"><table><thead><tr><th>결혼한 해</th><th>${T.y}년에</th><th>이름</th></tr></thead><tbody>
${names.map((n) => `<tr><td><b>${T.y - n}년</b></td><td>${n}주년</td><td>${K.WEDDING_NAMES[n]}</td></tr>`).join('\n')}
</tbody></table></div>
<p class="note">이름과 주년은 <a href="${STDICT_URL}" rel="noopener">표준국어대사전</a>(국립국어원) 뜻풀이를 따랐습니다. 사전은 '○혼식'을 서양 풍속으로 풀이하고, 금강혼식은 60주년 또는 75주년으로 적습니다. 회혼은 혼인한 지 예순 돌을 이르는 우리말입니다. <strong>이름과 주년은 자료마다 다릅니다.</strong></p>
</section>
<section>
<h2>계산 예시</h2>
<p><strong>${dW(ex)}</strong>에 결혼했다면 ${K.fmt(T)} 기준으로 결혼한 지 <strong>${exR.passed.toLocaleString('ko-KR')}일</strong>, 지난 기념일은 ${exR.years}번입니다. 다음은 <strong>${exR.next.n}주년</strong>으로 ${dW(exR.next.date)}입니다.</p>
<div class="tw"><table><thead><tr><th>기념일</th><th>날짜</th><th>요일</th><th>이름</th></tr></thead><tbody>
${[1, 5, 10, 15, 20, 25, 50].map((n) => `<tr><td><b>${n}주년</b></td>${tdW(K.addYears(ex, n))}<td>${K.WEDDING_NAMES[n] || ''}</td></tr>`).join('\n')}
</tbody></table></div>
<h3>윤년 2월 29일에 결혼했다면</h3>
<p>${dW(leap)}에 결혼했다면 1주년은 ${dW(K.addYears(leap, 1))}, 4주년은 ${dW(K.addYears(leap, 4))}입니다. 2월 29일이 없는 해에는 2월 28일로 계산합니다.</p>
<h3>세는 방법</h3>
<p>N주년은 결혼한 날과 <strong>같은 월일의 N년 뒤</strong>입니다. '결혼한 지 며칠'은 결혼한 날에서 지난 날수이고, 결혼한 날을 1일로 세면 하루가 더해집니다.</p>
</section>
${faqHtml(faq)}
${others(url)}
`;
    page({ url, name: '결혼기념일 계산기', title, desc, body, faq });
  }

  /* ---------- 수능 D-day ---------- */
  function suneungPage() {
    const url = '/suneung/';
    const list = SUNEUNG.map((s) => ({ ...s, e: K.date(...s.exam), sc: K.date(...s.score) })).map((s) => ({ ...s, left: K.diff(T, s.e), iso: s.exam.map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-') }));
    const coming = list.filter((s) => s.left >= 0);
    const main = coming[0] || list[list.length - 1];
    const dd = (s) => (s.left < 0 ? '끝남' : K.dday(s.left));
    const nth = (o) => `${o.m}월 ${['첫째', '둘째', '셋째', '넷째', '다섯째'][Math.floor((o.d - 1) / 7)]} ${W(o)}요일`;
    const marks = [300, 200, 100, 50, 30, 10, 1];
    const title = `수능 D-day — ${list.map((s) => s.name).join('·')} 수능 날짜와 남은 날`;
    const desc = `${list.map((s) => `${s.name} 수능은 ${dW(s.e)}`).join(', ')}입니다. 오늘 기준 D-day와 남은 시간, 성적 통지일, 수능 100일 전 날짜를 한눈에. 교육부 발표 기준.`;
    const faq = [
      ...list.map((s) => [`${s.name} 수능은 언제인가요?`, `${dW(s.e)}입니다. 성적은 ${dW(s.sc)}에 통지됩니다. ${s.grade3}년생이 고3으로 치르는 시험입니다.`]),
      [`${main.name} 수능 100일 전은 언제인가요?`, `${dW(K.addDays(main.e, -100))}입니다. 시험일에서 100일을 거꾸로 센 날짜입니다.`],
      [`왜 ${main.name} 수능을 ${main.e.y}년에 보나요?`, `학년도는 대학에 입학하는 해를 가리킵니다. ${main.e.y + 1}년 3월에 입학할 사람이 ${main.e.y}년 ${main.e.m}월에 치르는 시험이라 ${main.name} 수능이라고 부릅니다.`],
      ['그다음 해 수능 날짜는 왜 없나요?', '교육부가 날짜를 발표한 학년도만 실었습니다. 새 날짜가 발표되면 추가합니다.']
    ];
    const body = `
<div class="overline">생일첩 · 디데이</div>
<h1>수능 D-day</h1>
<p class="lead"><strong>${main.name} 대학수학능력시험</strong>은 <strong>${dW(main.e)}</strong>에 치릅니다.${main.left >= 0 ? ` ${K.fmt(T)} 기준 <strong>${dd(main)}</strong>입니다.` : ''} 아래 숫자는 오늘 날짜에 맞춰 자동으로 바뀝니다.</p>
${list.map((s) => `<div class="facts" data-suneung="${s.iso}">
  <div class="fact hi"><small>${s.name} 수능</small><b data-k="dday">${dd(s)}</b><i>${dW(s.e)}</i></div>
  <div class="fact"><small>남은 시간</small><b class="cd" data-k="count">${s.left > 0 ? s.left + '일' : s.left === 0 ? '오늘이 시험일입니다' : '시험이 끝났습니다'}</b><i>시험일 0시까지 · 한국 시각</i></div>
  <div class="fact"><small>성적 통지</small><b>${s.sc.m}월 ${s.sc.d}일</b><i>${s.sc.y}년 · ${W(s.sc)}요일</i></div>
</div>`).join('\n')}
<section>
<h2>수능 날짜</h2>
<div class="tw"><table><thead><tr><th>학년도</th><th>시험일</th><th>요일</th><th>성적 통지</th><th>고3</th></tr></thead><tbody>
${list.map((s) => `<tr><td><b>${s.name}</b></td>${tdW(s.e)}<td>${s.sc.m}월 ${s.sc.d}일 (${W(s.sc)})</td><td><a href="/school/${s.grade3}/">${s.grade3}년생</a></td></tr>`).join('\n')}
</tbody></table></div>
<p class="note">${new Set(list.map((s) => nth(s.e))).size === 1 ? `${list.length > 1 ? '모두 ' : ''}${nth(list[0].e)}` : list.map((s) => `${s.name} 수능은 ${nth(s.e)}`).join(', ')}입니다. 고3 출생연도는 재수·조기입학 없이 다닌 경우입니다.</p>
<p class="note">출처: ${list.map((s) => `<a href="${s.href}" rel="noopener">${s.src}</a>`).join(' · ')}. 원서 접수 기간과 시간표 같은 세부 일정은 <a href="https://www.suneung.re.kr/" rel="noopener">한국교육과정평가원 수능 누리집</a>의 시행기본계획·세부계획에서 확인하세요.</p>
</section>
<section>
<h2>D-100, D-30은 언제</h2>
<div class="tw"><table><thead><tr><th>남은 날</th>${list.map((s) => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>
${marks.map((n) => `<tr><td><b>D-${n}</b></td>${list.map((s) => `<td>${dW(K.addDays(s.e, -n))}</td>`).join('')}</tr>`).join('\n')}
<tr class="sub"><td><b>D-day</b></td>${list.map((s) => `<td>${dW(s.e)}</td>`).join('')}</tr>
</tbody></table></div>
<p class="note">D-day는 시험 당일, D-1은 시험 전날입니다. 오늘은 빼고 시험일까지 남은 날을 셉니다.</p>
</section>
${faqHtml(faq)}
<p class="note"><a href="/school/">학년 계산기 — 출생연도별 수능 연도·학번</a> · <a href="/dday/">디데이·100일 계산기</a> · <a href="/age/">만 나이 계산기</a></p>
`;
    page({ url, name: '수능 D-day', title, desc, body, faq });
  }

  armyPage();
  couplePage();
  weddingPage();
  suneungPage();
}
