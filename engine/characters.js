/* ============================================================
 * 사주서재 — 일간 캐릭터 시스템
 * 10개 일간을 MBTI처럼 기억되는 유형으로. 엠블럼(SVG 패스)은
 * 화면(SVG)과 사주 명함(캔버스 Path2D)에서 공용으로 쓴다.
 * window.SajuCharacters 로 노출.
 * ============================================================ */
(function () {
  'use strict';

  /* 엠블럼: 100×100 좌표계. role: main(먹/크림) | accent(인주 빨강) */
  var EMBLEMS = {
    '甲': [
      { d: 'M50 88 L50 30', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 44 L31 26', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 44 L69 26', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 62 L36 48', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 62 L64 48', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M32 88 L68 88', role: 'accent', kind: 'stroke', w: 3.5 }
    ],
    '乙': [
      { d: 'M38 88 C38 62 64 66 61 46 C59 32 46 30 44 40 C43 46 48 49 53 46', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M61 46 C70 42 74 34 72 26 C64 28 58 34 58 42 Z', role: 'accent', kind: 'fill', w: 0 },
      { d: 'M30 88 L58 88', role: 'main', kind: 'stroke', w: 3.5 }
    ],
    '丙': [
      { d: 'M66 42 A16 16 0 1 1 34 42 A16 16 0 1 1 66 42', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 16 L50 6', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M26 42 L16 42', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M74 42 L84 42', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M35 27 L28 20', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M65 27 L72 20', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M35 57 L28 64', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M65 57 L72 64', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M20 82 L80 82', role: 'accent', kind: 'stroke', w: 3.5 }
    ],
    '丁': [
      { d: 'M50 20 C58 29 58 40 50 46 C42 40 42 29 50 20 Z', role: 'accent', kind: 'fill', w: 0 },
      { d: 'M50 46 L50 54', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M40 54 L60 54 L60 84 L40 84 Z', role: 'main', kind: 'stroke', w: 3.5 }
    ],
    '戊': [
      { d: 'M16 82 L44 34 L57 56 L69 40 L84 82 Z', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M86 22 A6 6 0 1 1 74 22 A6 6 0 1 1 86 22', role: 'accent', kind: 'fill', w: 0 }
    ],
    '己': [
      { d: 'M32 62 L68 62', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M27 72 L73 72', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M22 82 L78 82', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 62 L50 44', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 50 C43 49 40 42 41 34', role: 'accent', kind: 'stroke', w: 3.5 },
      { d: 'M50 50 C57 49 60 42 59 34', role: 'accent', kind: 'stroke', w: 3.5 }
    ],
    '庚': [
      { d: 'M42 26 L50 12 L58 26 L58 62 L42 62 Z', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M34 62 L66 62', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 62 L50 80', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M44 84 L56 84', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M50 30 L50 54', role: 'accent', kind: 'stroke', w: 3 }
    ],
    '辛': [
      { d: 'M50 22 L74 44 L50 82 L26 44 Z', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M26 44 L74 44', role: 'main', kind: 'stroke', w: 2.5 },
      { d: 'M50 22 L38 44 L50 82', role: 'main', kind: 'stroke', w: 2.5 },
      { d: 'M50 22 L62 44 L50 82', role: 'main', kind: 'stroke', w: 2.5 },
      { d: 'M82 16 L82 26', role: 'accent', kind: 'stroke', w: 2.5 },
      { d: 'M77 21 L87 21', role: 'accent', kind: 'stroke', w: 2.5 }
    ],
    '壬': [
      { d: 'M20 50 C30 40 42 40 50 50 C58 60 70 60 80 50', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M20 68 C30 58 42 58 50 68 C58 78 70 78 80 68', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M79 26 A7 7 0 1 1 65 26 A7 7 0 1 1 79 26', role: 'accent', kind: 'fill', w: 0 }
    ],
    '癸': [
      { d: 'M30 44 C30 34 42 30 48 36 C52 28 66 30 67 40 C74 42 74 50 66 50 L34 50 C28 50 26 46 30 44 Z', role: 'main', kind: 'stroke', w: 3.5 },
      { d: 'M40 60 L36 70', role: 'accent', kind: 'stroke', w: 3.5 },
      { d: 'M53 60 L49 70', role: 'accent', kind: 'stroke', w: 3.5 },
      { d: 'M66 60 L62 70', role: 'accent', kind: 'stroke', w: 3.5 }
    ]
  };

  var CHARACTERS = {
    '甲': {
      name: '앞장서는 개척자',
      metaphor: '숲을 여는 첫 나무',
      essence: '길이 없으면 길을 내는 사람',
      keywords: ['추진력', '정직', '리더십', '자존심'],
      body: '당신은 무리의 맨 앞에서 걷는 게 자연스러운 사람입니다. 결정이 빠르고, 목표가 생기면 곧장 몸이 움직이죠. 굽히는 걸 어려워해 가끔 손해를 보지만, 그 곧음이 곧 당신의 브랜드입니다.',
      strengths: ['0을 1로 만드는 시작의 힘', '한번 뱉은 말은 지키는 신뢰'],
      cautions: ['방향 전환이 느려요 — 가끔은 우회로가 빠릅니다', '지는 걸 못 참아 무리할 때가 있어요'],
      variant: {
        '신강': '뿌리 깊은 거목 — 밀어붙이는 힘이 남다르니, 브레이크를 잡아줄 사람을 곁에 두세요.',
        '중화': '힘과 유연함이 균형 잡힌 나무 — 어느 숲에서든 제 몫을 해냅니다.',
        '신약': '여린 새순의 나무 — 토양(환경)을 잘 고르면 누구보다 크게 자랍니다.'
      },
      hap: { partner: '己', line: '기토(밭)를 만나면 뿌리내릴 땅을 얻은 나무 — 서로의 부족함을 정확히 채우는 사이입니다.' },
      chung: { partner: '庚', line: '경금(무쇠)과는 도끼와 나무의 관계 — 부딪히면 아프지만, 당신을 재목으로 다듬는 상대이기도 합니다.' }
    },
    '乙': {
      name: '부드러운 전략가',
      metaphor: '바람을 타는 들풀',
      essence: '꺾이지 않고 돌아가는 사람',
      keywords: ['유연함', '눈치', '친화력', '끈기'],
      body: '당신은 정면돌파 대신 스며드는 사람입니다. 상황과 사람을 빠르게 읽고, 부러지는 대신 휘어지며 결국 원하는 곳에 닿죠. 약해 보인다는 말은, 당신을 모르는 사람의 말입니다.',
      strengths: ['어디서든 살아남는 적응력', '사람 마음을 읽는 섬세한 안테나'],
      cautions: ['거절을 어려워해 손해를 안고 가요', '기댈 곳만 찾으면 내 힘이 늦게 자랍니다'],
      variant: {
        '신강': '군락을 이룬 들풀 — 부드러움에 세력이 더해져 판을 조용히 장악합니다.',
        '중화': '바람 따라 눕고 서는 들풀 — 유연함과 심지가 고르게 갖춰졌습니다.',
        '신약': '홀로 자라는 화초 — 좋은 화분(사람·환경)을 만나는 것이 절반입니다.'
      },
      hap: { partner: '庚', line: '경금(무쇠)을 만나면 덩굴이 기둥을 얻은 격 — 든든한 상대를 타고 함께 높이 오릅니다.' },
      chung: { partner: '辛', line: '신금(보석칼)과는 예리함에 베이기 쉬운 사이 — 적당한 거리가 서로의 세련됨을 지켜줍니다.' }
    },
    '丙': {
      name: '무대 위의 태양',
      metaphor: '한낮의 하늘에 뜬 해',
      essence: '숨길 줄 모르는, 모두를 비추는 사람',
      keywords: ['존재감', '열정', '솔직함', '관대함'],
      body: '당신은 등장만으로 공간의 온도를 올리는 사람입니다. 감정도 재능도 숨기질 못해서, 표현하고 비추는 일이 곧 존재 이유죠. 다만 모두를 비추느라 정작 자신이 방전되는 날은 조심하세요.',
      strengths: ['사람을 모으는 밝은 에너지', '뒤끝 없는 화끈한 결단'],
      cautions: ['감정 기복이 날씨처럼 드러나요', '시작은 태양인데 마무리는 노을이 되기 쉬워요'],
      variant: {
        '신강': '한여름의 태양 — 열기가 강한 만큼, 식히고 완급을 조절하는 법이 평생의 기술입니다.',
        '중화': '온화한 봄볕의 태양 — 비추되 태우지 않는 좋은 온도를 가졌습니다.',
        '신약': '구름 사이의 해 — 나를 밝혀줄 무대와 사람을 만나면 단숨에 빛납니다.'
      },
      hap: { partner: '辛', line: '신금(보석)을 만나면 빛이 보석에 부서지는 순간 — 서로를 가장 반짝이게 하는 사이입니다.' },
      chung: { partner: '壬', line: '임수(바다)와는 해와 바다의 팽팽한 대치 — 겨루면 소모전, 존중하면 수평선처럼 웅장한 그림이 됩니다.' }
    },
    '丁': {
      name: '밤을 밝히는 등불',
      metaphor: '어둠 속 한 점의 불꽃',
      essence: '조용히, 그러나 끝까지 타는 사람',
      keywords: ['집중력', '온기', '직관', '헌신'],
      body: '당신은 화려한 대낮보다 깊은 밤에 빛나는 사람입니다. 하나에 꽂히면 오래, 깊게 파고들고, 곁의 사람을 살뜰히 데우죠. 겉은 온화하지만 심지는 누구보다 뜨겁습니다.',
      strengths: ['한 분야를 끝까지 파는 장인 기질', '사람을 살리는 다정한 온도'],
      cautions: ['속은 타는데 겉으론 웃고 있어요', '번아웃이 오기 전까지 티가 안 납니다'],
      variant: {
        '신강': '화롯불처럼 화력이 좋은 등불 — 여럿을 데우고도 남는 온기를 가졌습니다.',
        '중화': '바람에도 꺼지지 않는 등불 — 은은하고 꾸준한 빛이 강점입니다.',
        '신약': '심지가 가는 촛불 — 기름(휴식과 지지)을 아끼지 말고 채워야 오래 탑니다.'
      },
      hap: { partner: '壬', line: '임수(강물)를 만나면 물 위에 뜬 등불 — 낭만과 깊이가 만나 오래 가는 인연입니다.' },
      chung: { partner: '癸', line: '계수(찬비)와는 빗속의 촛불 — 기세가 꺾이기 쉬우니 서로의 온도를 지켜주는 예의가 필요합니다.' }
    },
    '戊': {
      name: '흔들리지 않는 산',
      metaphor: '구름 위로 솟은 큰 산',
      essence: '모두가 기대어 쉬는 사람',
      keywords: ['신뢰', '뚝심', '포용', '과묵'],
      body: '당신은 소란한 세상에서 좀처럼 흔들리지 않는 사람입니다. 말수보다 무게로 신뢰를 얻고, 위기일수록 오히려 침착해지죠. 변화엔 느리지만, 그 자리에 있다는 것만으로 힘이 됩니다.',
      strengths: ['위기에 강한 태산 같은 침착함', '약속을 지키는 묵직한 무게'],
      cautions: ['고집이 산맥급 — 설득에는 시간이 필요해요', '표현이 없어 속을 몰라준다는 말을 들어요'],
      variant: {
        '신강': '높고 단단한 바위산 — 무게감이 큰 만큼, 먼저 움직이는 연습이 날개가 됩니다.',
        '중화': '숲을 품은 산 — 무게와 온기의 균형이 좋아 사람이 모입니다.',
        '신약': '들판의 낮은 언덕 — 꾸준히 쌓아 올리면 어느새 산이 되어 있는 유형입니다.'
      },
      hap: { partner: '癸', line: '계수(봄비)를 만나면 마른 산에 비가 내리는 격 — 무뚝뚝한 일상에 생기를 더해주는 상대입니다.' },
      chung: null,
      noChungLine: '천간의 충(沖)이 없는 유형 — 정면으로 부딪히는 상대가 없는, 타고난 중재자입니다.'
    },
    '己': {
      name: '모두를 기르는 밭',
      metaphor: '곡식을 품은 기름진 땅',
      essence: '곁에 있으면 자라게 되는 사람',
      keywords: ['실속', '배려', '계획', '안정'],
      body: '당신은 드러나지 않게 판을 관리하는 사람입니다. 씨앗을 받아 곡식으로 길러내듯 사람과 일을 차근차근 키워내죠. 겉은 수더분해도 속의 셈은 정교하고, 그 치밀함이 모두를 먹여 살립니다.',
      strengths: ['사람을 키우는 조용한 리더십', '현실적인 계획과 관리 능력'],
      cautions: ['속마음을 끝까지 안 보여줘요', '걱정을 사서 하는 편입니다'],
      variant: {
        '신강': '넓고 기름진 옥토 — 품는 양이 커서, 여럿을 동시에 키워내는 그릇입니다.',
        '중화': '때를 아는 농부의 밭 — 뿌릴 때와 거둘 때를 아는 균형이 강점입니다.',
        '신약': '아직 개간 중인 밭 — 내 땅부터 다지면(자기 돌봄) 수확은 따라옵니다.'
      },
      hap: { partner: '甲', line: '갑목(큰 나무)을 만나면 밭이 아름드리나무를 기르는 격 — 서로의 존재 이유가 되는 사이입니다.' },
      chung: null,
      noChungLine: '천간의 충(沖)이 없는 유형 — 어떤 상대와도 판을 깨지 않는 균형 감각을 타고났습니다.'
    },
    '庚': {
      name: '단칼의 승부사',
      metaphor: '벼려질수록 강해지는 무쇠',
      essence: '미루지 않고 끊어내는 사람',
      keywords: ['결단력', '의리', '원칙', '승부욕'],
      body: '당신은 복잡한 문제를 한칼에 정리하는 사람입니다. 의리와 원칙이 분명하고, 아닌 것엔 아니라고 말하죠. 부딪힘을 두려워하지 않는 대신, 칼을 칼집에 넣어두는 법을 익힐수록 진짜 고수가 됩니다.',
      strengths: ['위기에서 빛나는 돌파력', '내 사람은 끝까지 지키는 의리'],
      cautions: ['말이 칼이 될 때가 있어요', '타협을 패배로 느끼면 스스로 피곤해집니다'],
      variant: {
        '신강': '두들길수록 단단해지는 강철 — 큰일을 맡을수록 오히려 안정되는 유형입니다.',
        '중화': '날이 잘 선 명검 — 강함과 절제가 함께 있어 믿고 맡기게 됩니다.',
        '신약': '담금질 중인 쇠 — 좋은 스승과 시련이 당신을 명검으로 만듭니다.'
      },
      hap: { partner: '乙', line: '을목(덩굴)을 만나면 강함에 부드러움이 감기는 격 — 당신의 날을 순하게 만드는 고마운 상대입니다.' },
      chung: { partner: '甲', line: '갑목(큰 나무)과는 도끼와 거목의 대결 — 서로를 시험하지만, 그 과정에서 둘 다 단단해집니다.' }
    },
    '辛': {
      name: '예리한 완벽주의자',
      metaphor: '세공을 마친 보석',
      essence: '디테일로 승부하는 사람',
      keywords: ['안목', '완성도', '자존심', '세련'],
      body: '당신은 대충을 견디지 못하는 사람입니다. 안목이 예리하고 기준이 높아, 당신 손을 거친 것은 티가 나죠. 상처를 오래 기억하는 자존심이 있지만, 바로 그 자존심이 당신을 명품으로 만듭니다.',
      strengths: ['누구도 못 속이는 예리한 눈', '끝을 반짝이게 만드는 마무리'],
      cautions: ['기준이 높아 스스로가 제일 피곤해요', '서운함을 오래 보관하는 편입니다'],
      variant: {
        '신강': '원석의 힘까지 갖춘 보석 — 안목에 추진력이 더해져 판을 이끕니다.',
        '중화': '알맞게 세공된 보석 — 예리함과 여유가 균형을 이룹니다.',
        '신약': '진열장 속 보석 — 나를 알아봐 주는 무대에 놓일 때 가치가 폭발합니다.'
      },
      hap: { partner: '丙', line: '병화(태양)를 만나면 빛을 받아 반짝이는 보석 — 당신의 가치를 세상에 비춰주는 상대입니다.' },
      chung: { partner: '乙', line: '을목(들풀)과는 결이 달라 서로 답답할 수 있는 사이 — 다름을 인정하면 서로의 빈틈을 채웁니다.' }
    },
    '壬': {
      name: '경계 없는 항해자',
      metaphor: '수평선까지 뻗은 큰 물',
      essence: '더 넓은 곳으로 흐르는 사람',
      keywords: ['스케일', '자유', '지혜', '포용'],
      body: '당신은 한곳에 고이면 시드는 사람입니다. 시야가 넓고 발상이 크며, 처음 보는 세계에 뛰어드는 걸 두려워하지 않죠. 품는 양이 큰 만큼 속을 다 보여주지 않아, 깊이를 아는 데 시간이 걸리는 바다입니다.',
      strengths: ['판을 크게 보는 전략가의 눈', '다양한 사람을 품는 넓이'],
      cautions: ['루틴과 구속을 견디기 힘들어해요', '너무 많이 품다 방향을 잃기도 합니다'],
      variant: {
        '신강': '태평양급의 큰 물 — 흐름을 잡아줄 둑(목표)이 있을 때 위대해집니다.',
        '중화': '항로를 아는 바다 — 자유와 방향감각을 함께 가졌습니다.',
        '신약': '샘에서 시작된 물줄기 — 좋은 물길(멘토·조직)을 만나면 강이 되고 바다가 됩니다.'
      },
      hap: { partner: '丁', line: '정화(등불)를 만나면 밤바다 위의 등대 — 큰 흐름에 방향을 밝혀주는 소중한 상대입니다.' },
      chung: { partner: '丙', line: '병화(태양)와는 해와 바다의 자존심 대결 — 겨루는 대신 나란히 서면 세상에서 가장 큰 풍경이 됩니다.' }
    },
    '癸': {
      name: '조용한 통찰가',
      metaphor: '소리 없이 스미는 봄비',
      essence: '다 보고 있지만, 말하지 않는 사람',
      keywords: ['통찰', '공감', '인내', '순수'],
      body: '당신은 낮은 곳으로 스며들어 결국 모든 것을 적시는 사람입니다. 관찰력과 공감력이 깊어 사람들의 미세한 변화도 놓치지 않죠. 요란하지 않게, 그러나 확실하게 — 바위를 뚫는 건 결국 낙숫물입니다.',
      strengths: ['핵심을 꿰뚫는 조용한 관찰력', '낮은 자세로 얻는 깊은 신뢰'],
      cautions: ['생각이 많아 시작이 늦어져요', '혼자 삭이다 마음이 넘칠 때가 있습니다'],
      variant: {
        '신강': '장마철의 비 — 감성과 통찰의 수량이 풍부해, 꺼내 쓰는 법만 익히면 됩니다.',
        '중화': '때맞춰 내리는 단비 — 필요한 순간에 필요한 만큼 스며듭니다.',
        '신약': '새벽이슬 같은 물 — 마르지 않게 나를 채우는 시간이 꼭 필요합니다.'
      },
      hap: { partner: '戊', line: '무토(큰 산)를 만나면 산이 비를 머금는 격 — 당신의 감성을 든든히 받아주는 상대입니다.' },
      chung: { partner: '丁', line: '정화(등불)와는 비와 불꽃의 어색한 동거 — 서로의 예민함을 존중하는 거리가 필요합니다.' }
    }
  };

  var MODE_COLORS = {
    light: { main: '#211C15', accent: '#B8382D' },
    dark: { main: '#F3EDE0', accent: '#F08265' }
  };

  /* 화면용: 엠블럼 SVG 문자열 */
  function emblemSvg(han, size, mode) {
    var colors = MODE_COLORS[mode] || MODE_COLORS.light;
    var paths = (EMBLEMS[han] || []).map(function (p) {
      var color = colors[p.role];
      if (p.kind === 'fill') {
        return '<path d="' + p.d + '" fill="' + color + '"></path>';
      }
      return '<path d="' + p.d + '" fill="none" stroke="' + color + '" stroke-width="' + p.w +
        '" stroke-linecap="round" stroke-linejoin="round"></path>';
    }).join('');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 100 100" aria-hidden="true">' + paths + '</svg>';
  }

  /* 명함용: 캔버스에 엠블럼 그리기 (cx 중심, top 상단, size 픽셀) */
  function drawEmblem(ctx, han, cx, top, size, mode) {
    var colors = MODE_COLORS[mode] || MODE_COLORS.light;
    var scale = size / 100;
    ctx.save();
    ctx.translate(cx - size / 2, top);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    (EMBLEMS[han] || []).forEach(function (p) {
      var path = new Path2D(p.d);
      if (p.kind === 'fill') {
        ctx.fillStyle = colors[p.role];
        ctx.fill(path);
      } else {
        ctx.strokeStyle = colors[p.role];
        ctx.lineWidth = p.w;
        ctx.stroke(path);
      }
    });
    ctx.restore();
  }

  function of(stemHan) { return CHARACTERS[stemHan] || null; }

  window.SajuCharacters = {
    of: of,
    emblemSvg: emblemSvg,
    drawEmblem: drawEmblem,
    CHARACTERS: CHARACTERS,
    EMBLEMS: EMBLEMS
  };
})();
