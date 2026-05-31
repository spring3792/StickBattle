/* global window */
// Educational question system. When Education Mode is ON, the loser of each round
// answers a question before the power-up draft. Correct = pick from a rare pool. Wrong = standard.
//
// Three sources:
//  1. Bundled pre-made sets (this file)
//  2. Custom sets created by the user (saved to localStorage)
//  3. AI-generated sets via the user's Anthropic API key (also saved to localStorage)

window.SFQuestions = (function () {
  const LS_CUSTOM = 'sf_custom_sets_v1';
  const LS_AI     = 'sf_ai_sets_v1';

  // Each question: { q: string, choices: [string,string,string,string], answer: 0..3 }
  // Each set: { id, name, description, category, source: 'builtin' | 'custom' | 'ai' | 'local', questions: [...] }

  const BUILTIN = [
    {
      id:'math_easy', name:'Math · Easy', description:'Basic arithmetic for ages 7-10.',
      category:'Math', source:'builtin',
      questions:[
        { q:'7 + 5 = ?',           choices:['10','11','12','13'],            answer:2 },
        { q:'9 × 3 = ?',           choices:['18','24','27','29'],            answer:2 },
        { q:'15 - 8 = ?',          choices:['5','6','7','8'],                answer:2 },
        { q:'½ of 24 = ?',         choices:['8','10','12','14'],             answer:2 },
        { q:'36 ÷ 6 = ?',          choices:['4','5','6','7'],                answer:2 },
        { q:'25 + 25 = ?',         choices:['40','45','50','55'],            answer:2 },
        { q:'8 × 8 = ?',           choices:['56','60','64','72'],            answer:2 },
        { q:'100 - 37 = ?',        choices:['53','63','73','83'],            answer:1 },
        { q:'11 × 4 = ?',          choices:['40','42','44','48'],            answer:2 },
        { q:'81 ÷ 9 = ?',          choices:['6','7','8','9'],                answer:3 },
      ]
    },
    {
      id:'math_hard', name:'Math · Hard', description:'Multi-step algebra, exponents, factorials.',
      category:'Math', source:'builtin',
      questions:[
        { q:'17 × 6 = ?',          choices:['96','102','108','112'],         answer:1 },
        { q:'√144 = ?',            choices:['10','12','14','16'],            answer:1 },
        { q:'3² + 4² = ?',         choices:['5','12','25','49'],             answer:2 },
        { q:'(8+4) × 5 = ?',       choices:['44','52','60','68'],            answer:2 },
        { q:'135 ÷ 5 = ?',         choices:['25','27','29','31'],            answer:1 },
        { q:'2³ × 3 = ?',          choices:['12','18','24','27'],            answer:2 },
        { q:'40% of 60 = ?',       choices:['18','22','24','28'],            answer:2 },
        { q:'7! ÷ 5! = ?',         choices:['28','35','42','45'],            answer:2 },
        { q:'Solve: 3x = 27',      choices:['x=6','x=7','x=8','x=9'],        answer:3 },
        { q:'Sum 1 to 10 = ?',     choices:['45','50','55','60'],            answer:2 },
      ]
    },
    {
      id:'vocab', name:'Vocabulary', description:'Definitions, synonyms, antonyms for SAT-level words.',
      category:'English', source:'builtin',
      questions:[
        { q:'A "benevolent" person is...',   choices:['cruel','kind','silent','clever'],            answer:1 },
        { q:'"Arid" means...',               choices:['frozen','wet','dry','sour'],                 answer:2 },
        { q:'A "synonym" of "fast" is...',   choices:['slow','quick','large','heavy'],              answer:1 },
        { q:'"Verbose" means...',            choices:['quiet','wordy','green','round'],             answer:1 },
        { q:'Antonym of "ascend"?',          choices:['climb','rise','descend','grow'],             answer:2 },
        { q:'"Lucid" means...',              choices:['confused','clear','sleepy','sour'],          answer:1 },
        { q:'"Frugal" means...',             choices:['lavish','thrifty','tasty','wild'],           answer:1 },
        { q:'"Ephemeral" means...',          choices:['eternal','brief','solid','noisy'],           answer:1 },
        { q:'Antonym of "candid"?',          choices:['honest','deceitful','open','direct'],        answer:1 },
        { q:'"Tenacious" means...',          choices:['weak','persistent','wet','sharp'],           answer:1 },
      ]
    },
    {
      id:'science', name:'Science', description:'Physics, chemistry, biology fundamentals.',
      category:'Science', source:'builtin',
      questions:[
        { q:'H₂O is...',                       choices:['salt','sugar','water','oxygen'],            answer:2 },
        { q:'Earth orbits which star?',        choices:['Moon','Sun','Mars','Sirius'],               answer:1 },
        { q:'Speed of light approx?',          choices:['300 m/s','3,000 km/s','300,000 km/s','30 km/s'], answer:2 },
        { q:'DNA is found in the...',          choices:['mitochondria','cytoplasm','nucleus','cell wall'], answer:2 },
        { q:'pH of pure water?',               choices:['1','5','7','14'],                           answer:2 },
        { q:'Hardest natural substance?',      choices:['gold','iron','diamond','quartz'],           answer:2 },
        { q:'Force = mass × ?',                choices:['volume','speed','acceleration','heat'],     answer:2 },
        { q:'Sound travels fastest in...',     choices:['air','water','steel','vacuum'],             answer:2 },
        { q:'Photosynthesis needs...',         choices:['oxygen','nitrogen','sunlight','salt'],      answer:2 },
        { q:'A neutron has what charge?',      choices:['+1','-1','0','+2'],                         answer:2 },
      ]
    },
    {
      id:'history', name:'History', description:'World history milestones and famous figures.',
      category:'History', source:'builtin',
      questions:[
        { q:'WWII ended in...',                choices:['1939','1942','1945','1949'],                answer:2 },
        { q:'First US President?',             choices:['Adams','Jefferson','Washington','Lincoln'], answer:2 },
        { q:'The Great Wall is in...',         choices:['Japan','China','Korea','Mongolia'],         answer:1 },
        { q:'Roman Empire fell ~ year?',       choices:['46 BC','476 AD','1066','1453'],             answer:1 },
        { q:'Magna Carta was signed in...',    choices:['1066','1215','1492','1789'],                answer:1 },
        { q:'Egypt is famous for its...',      choices:['gondolas','pyramids','volcanoes','fjords'], answer:1 },
        { q:'Apollo 11 landed on the Moon in...',choices:['1965','1969','1972','1981'],              answer:1 },
        { q:'French Revolution began in...',   choices:['1689','1776','1789','1815'],                answer:2 },
        { q:'Berlin Wall fell in...',          choices:['1979','1985','1989','1991'],                answer:2 },
        { q:'Inventor of the lightbulb (US)?', choices:['Tesla','Edison','Bell','Ford'],             answer:1 },
      ]
    },
    {
      id:'geography', name:'Geography', description:'Countries, capitals, continents, landmarks.',
      category:'Geography', source:'builtin',
      questions:[
        { q:'Capital of France?',              choices:['Lyon','Paris','Marseille','Nice'],          answer:1 },
        { q:'Longest river?',                  choices:['Amazon','Nile','Yangtze','Mississippi'],    answer:1 },
        { q:'Largest ocean?',                  choices:['Atlantic','Indian','Arctic','Pacific'],     answer:3 },
        { q:'Sahara is in...',                 choices:['Asia','Africa','Australia','S. America'],   answer:1 },
        { q:'Mount Everest is in...',          choices:['Andes','Alps','Himalayas','Rockies'],       answer:2 },
        { q:'Capital of Japan?',               choices:['Osaka','Kyoto','Tokyo','Nagoya'],           answer:2 },
        { q:'Smallest continent?',             choices:['Europe','Australia','Antarctica','S. America'], answer:1 },
        { q:'Currency of UK?',                 choices:['Euro','Pound','Dollar','Krona'],            answer:1 },
        { q:'Country shaped like a boot?',     choices:['Greece','Italy','Spain','Croatia'],         answer:1 },
        { q:'Largest desert (by area)?',       choices:['Sahara','Gobi','Antarctic','Kalahari'],     answer:2 },
      ]
    },
    {
      id:'trivia', name:'General Trivia', description:'A grab bag of culture, sports, and science.',
      category:'Trivia', source:'builtin',
      questions:[
        { q:'How many sides on a hexagon?',    choices:['5','6','7','8'],                            answer:1 },
        { q:'Primary colors?',                 choices:['R,Y,B','R,G,B','C,M,Y','R,O,Y'],            answer:0 },
        { q:'Notes in an octave?',             choices:['5','7','8','12'],                           answer:2 },
        { q:'Year Mona Lisa painted (~)?',     choices:['1303','1503','1703','1903'],                answer:1 },
        { q:'Romeo and Juliet author?',        choices:['Dickens','Twain','Shakespeare','Austen'],   answer:2 },
        { q:'Sport with a "love" score?',      choices:['golf','soccer','tennis','rugby'],           answer:2 },
        { q:'Bones in adult human body?',      choices:['106','186','206','286'],                    answer:2 },
        { q:'Saturn has what feature?',        choices:['rings','one moon','red surface','tail'],    answer:0 },
        { q:'A baby kangaroo is called?',      choices:['cub','joey','calf','pup'],                  answer:1 },
        { q:'Speed of sound ≈ ?',              choices:['343 m/s','1000 m/s','100 m/s','3×10⁸ m/s'], answer:0 },
      ]
    },
    {
      id:'spelling', name:'Spelling', description:'Pick the correctly spelled word.',
      category:'English', source:'builtin',
      questions:[
        { q:'Which is correct?',          choices:['recieve','receive','receeve','receeive'], answer:1 },
        { q:'Which is correct?',          choices:['separate','seperate','seprate','seperete'], answer:0 },
        { q:'Which is correct?',          choices:['definately','definitly','definitely','definatly'], answer:2 },
        { q:'Which is correct?',          choices:['accomodate','accommodate','acommodate','accommadate'], answer:1 },
        { q:'Which is correct?',          choices:['neccessary','necesary','necessary','neccesary'], answer:2 },
        { q:'Which is correct?',          choices:['embarass','embarrass','embaras','embarras'], answer:1 },
        { q:'Which is correct?',          choices:['rythm','rhythm','rythym','rhytm'], answer:1 },
        { q:'Which is correct?',          choices:['concious','consious','conscience','conscious'], answer:3 },
        { q:'Which is correct?',          choices:['mispell','misspell','mispel','missspell'], answer:1 },
        { q:'Which is correct?',          choices:['occured','ocurred','occurred','ocured'], answer:2 },
      ]
    },
  ];

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getCustomSets()    { return loadJSON(LS_CUSTOM, []); }
  function getAISets()        { return loadJSON(LS_AI, []); }
  function saveCustomSet(set) {
    const all = getCustomSets();
    const idx = all.findIndex(s => s.id === set.id);
    if (idx >= 0) all[idx] = set; else all.push(set);
    saveJSON(LS_CUSTOM, all);
  }
  function deleteSet(id) {
    saveJSON(LS_CUSTOM, getCustomSets().filter(s => s.id !== id));
    saveJSON(LS_AI,     getAISets().filter(s => s.id !== id));
  }
  function saveAISet(set) {
    const all = getAISets();
    all.push(set);
    saveJSON(LS_AI, all);
  }

  function allSets() {
    return [...BUILTIN, ...getCustomSets(), ...getAISets()];
  }

  function getSetById(id) {
    return allSets().find(s => s.id === id) || BUILTIN[0];
  }

  // Pick a random question from a set (avoiding repeats within a recent window per-session)
  const recent = new Map(); // setId -> Set of recent qIdx
  function nextQuestion(setId) {
    const set = getSetById(setId);
    if (!set || !set.questions || set.questions.length === 0) return null;
    const seen = recent.get(setId) || new Set();
    let candidates = set.questions.map((_, i) => i).filter(i => !seen.has(i));
    if (candidates.length === 0) { seen.clear(); candidates = set.questions.map((_, i) => i); }
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    seen.add(idx); recent.set(setId, seen);
    return { ...set.questions[idx], setName: set.name, setDescription: set.description };
  }

  // ========== OFFLINE GENERATOR ==========
  // No API key required. Procedural templates per topic.
  // Topics: 'math', 'spelling', 'capitals', 'science', 'opposites', 'animals', 'sports'
  const TOPIC_PRESETS = [
    { id:'math',      name:'Math', description:'Auto-generated arithmetic, algebra and percentages.' },
    { id:'capitals',  name:'World Capitals', description:'Identify capitals of countries around the world.' },
    { id:'opposites', name:'Opposites', description:'Pick the antonym of each word.' },
    { id:'science',   name:'Science Facts', description:'A pull from common-knowledge science.' },
    { id:'animals',   name:'Animals', description:'Classifications, sounds, baby names.' },
    { id:'spelling',  name:'Spelling', description:'Spot the correctly spelled word.' },
    { id:'sports',    name:'Sports Trivia', description:'Famous events, terms, scoring rules.' },
    { id:'mixed',     name:'Mixed Bag', description:'A bit of everything.' },
  ];

  function shuffle(a) { const c = a.slice(); for (let i = c.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [c[i],c[j]] = [c[j],c[i]]; } return c; }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }
  function distractorsNumeric(answer, count = 3) {
    const out = new Set();
    while (out.size < count) {
      const delta = Math.max(1, Math.round(Math.abs(answer) * 0.1)) + Math.floor(Math.random()*Math.max(3, Math.abs(answer)*0.2 + 2));
      const sign = Math.random() < 0.5 ? -1 : 1;
      const d = answer + sign * delta;
      if (d !== answer && d > -1000 && d < 1000000) out.add(d);
    }
    return [...out];
  }
  function mcq(qText, correct, wrong) {
    const choices = shuffle([String(correct), ...wrong.map(String)]);
    return { q: qText, choices, answer: choices.indexOf(String(correct)) };
  }

  // ---- topic banks (used by both numeric and lookup generators) ----
  const CAPITAL_BANK = [
    ['France','Paris'], ['Germany','Berlin'], ['Japan','Tokyo'], ['Italy','Rome'],
    ['Spain','Madrid'], ['Egypt','Cairo'], ['Greece','Athens'], ['Brazil','Brasilia'],
    ['Canada','Ottawa'], ['Australia','Canberra'], ['India','New Delhi'], ['Russia','Moscow'],
    ['Mexico','Mexico City'], ['Thailand','Bangkok'], ['Turkey','Ankara'], ['Sweden','Stockholm'],
    ['Norway','Oslo'], ['Argentina','Buenos Aires'], ['South Korea','Seoul'], ['Poland','Warsaw'],
    ['Portugal','Lisbon'], ['Kenya','Nairobi'], ['Vietnam','Hanoi'], ['Chile','Santiago'],
    ['Finland','Helsinki'], ['Ireland','Dublin'], ['Hungary','Budapest'], ['Peru','Lima'],
    ['Morocco','Rabat'], ['Iceland','Reykjavik'],
  ];
  const OPPOSITE_BANK = [
    ['hot','cold'], ['fast','slow'], ['big','small'], ['happy','sad'], ['day','night'],
    ['rich','poor'], ['empty','full'], ['heavy','light'], ['easy','hard'], ['sharp','dull'],
    ['young','old'], ['strong','weak'], ['rough','smooth'], ['brave','cowardly'], ['loud','quiet'],
    ['wet','dry'], ['rise','fall'], ['expand','shrink'], ['begin','end'], ['accept','refuse'],
    ['ancient','modern'], ['kind','cruel'], ['vague','clear'], ['bitter','sweet'], ['rare','common'],
  ];
  const SCIENCE_BANK = [
    ['What planet is closest to the Sun?', 'Mercury', ['Venus','Earth','Mars']],
    ['What gas do plants absorb?', 'CO₂', ['Oxygen','Nitrogen','Helium']],
    ['How many bones in an adult human?', '206', ['106','306','156']],
    ['What is the chemical symbol for gold?', 'Au', ['Gd','Ag','Go']],
    ['How many continents are there?', '7', ['5','6','8']],
    ['The largest planet?', 'Jupiter', ['Saturn','Neptune','Earth']],
    ['Force = mass × ?', 'acceleration', ['velocity','speed','weight']],
    ['Speed of light is ~?', '300,000 km/s', ['30,000 km/s','3,000 km/s','3,000,000 km/s']],
    ['Element symbol for sodium?', 'Na', ['So','Sd','S']],
    ['What organ pumps blood?', 'Heart', ['Liver','Lungs','Kidney']],
    ['Water freezes at? (°C)', '0', ['10','-10','32']],
    ['Boils at? (°C)', '100', ['90','110','212']],
    ['Largest organ on the body?', 'Skin', ['Liver','Lungs','Heart']],
    ['Atoms are made of? (mainly)', 'Protons, neutrons, electrons', ['Cells','Molecules','Quarks only']],
    ['Earth has how many natural moons?', '1', ['2','0','3']],
  ];
  const ANIMAL_BANK = [
    ['A baby cat is called a?', 'kitten', ['cub','calf','pup']],
    ['A baby dog is called a?', 'puppy', ['kit','joey','foal']],
    ['A baby kangaroo is called a?', 'joey', ['cub','foal','kit']],
    ['Group of crows is called a?', 'murder', ['flock','pack','herd']],
    ['Group of lions is a?', 'pride', ['pack','herd','flock']],
    ['Sound a horse makes?', 'neigh', ['moo','bleat','quack']],
    ['Which is a mammal?', 'whale', ['shark','crocodile','tuna']],
    ['Which lays eggs?', 'platypus', ['cow','dog','bat']],
    ['Fastest land animal?', 'cheetah', ['horse','lion','greyhound']],
    ['Largest mammal?', 'blue whale', ['elephant','giraffe','sperm whale']],
    ['Reptile with a shell?', 'turtle', ['snake','lizard','frog']],
    ['Has 8 legs?', 'spider', ['ant','crab','octopus']],
    ['Cold-blooded?', 'snake', ['dog','sparrow','dolphin']],
    ['Which can fly?', 'bat', ['ostrich','penguin','emu']],
  ];
  const SPELLING_BANK = [
    ['receive', ['recieve','receeve','recive']],
    ['separate', ['seperate','seprate','seperete']],
    ['definitely', ['definately','definitly','definatly']],
    ['accommodate', ['accomodate','acommodate','accommadate']],
    ['necessary', ['neccessary','necesary','neccesary']],
    ['embarrass', ['embarass','embaras','embarras']],
    ['rhythm', ['rythm','rythym','rhytm']],
    ['conscious', ['concious','consious','conscience']],
    ['misspell', ['mispell','mispel','missspell']],
    ['occurred', ['occured','ocurred','ocured']],
    ['privilege', ['priviledge','privlege','privelege']],
    ['committee', ['comitee','committe','comittee']],
    ['weird', ['wierd','wired','weierd']],
    ['license', ['lisence','licence','liscense']],
    ['judgment', ['judgement','jugment','judgmant']],
  ];
  const SPORTS_BANK = [
    ['How many players per side in soccer?', '11', ['10','9','12']],
    ['A perfect bowling game scores?', '300', ['100','200','250']],
    ['"Love" means zero in?', 'tennis', ['golf','rugby','cricket']],
    ['NBA quarters last? (minutes)', '12', ['10','15','20']],
    ['Olympic rings, how many?', '5', ['4','6','7']],
    ['F1 max teams per race?', '10', ['8','12','14']],
    ['Hole-in-one is from?', 'golf', ['darts','bowling','curling']],
    ['Cricket match maximum?', '10 wickets', ['11 wickets','9 wickets','12 wickets']],
    ['Marathon length? (km)', '42.195', ['40','45','26.2']],
    ['How many bases in baseball?', '4', ['3','5','6']],
    ['Boxing rounds in title fight?', '12', ['10','15','8']],
    ['First medal at Olympics is?', 'gold', ['silver','bronze','platinum']],
  ];

  function mathQ() {
    const r = Math.random();
    if (r < 0.4) {
      const a = 2 + Math.floor(Math.random()*20), b = 2 + Math.floor(Math.random()*20);
      const op = Math.random();
      if (op < 0.4) return mcq(`${a} + ${b} = ?`, a+b, distractorsNumeric(a+b));
      if (op < 0.7) return mcq(`${a + b} - ${b} = ?`, a, distractorsNumeric(a));
      return mcq(`${a} × ${b} = ?`, a*b, distractorsNumeric(a*b));
    }
    if (r < 0.7) {
      const b = 2 + Math.floor(Math.random()*11);
      const a = b * (2 + Math.floor(Math.random()*10));
      return mcq(`${a} ÷ ${b} = ?`, a/b, distractorsNumeric(a/b));
    }
    if (r < 0.85) {
      // percentage
      const base = 20 + Math.floor(Math.random()*16)*5;
      const pct = [10,20,25,40,50,75][Math.floor(Math.random()*6)];
      const ans = base * pct / 100;
      return mcq(`${pct}% of ${base} = ?`, ans, distractorsNumeric(ans));
    }
    // algebra
    const ans = 2 + Math.floor(Math.random()*12);
    const m = 2 + Math.floor(Math.random()*8);
    return mcq(`Solve: ${m}x = ${m*ans}`, `x=${ans}`, distractorsNumeric(ans).slice(0,3).map(n => `x=${n}`));
  }

  function pickWrongSimilar(bank, correct, n) {
    const pool = bank.filter(x => x !== correct);
    return shuffle(pool).slice(0, n);
  }

  function generateLocalSet({ topic, count, name, description }) {
    count = Math.max(3, Math.min(30, count|0 || 10));
    const preset = TOPIC_PRESETS.find(p => p.id === topic) || TOPIC_PRESETS[0];
    const questions = [];
    const topicId = preset.id;

    if (topicId === 'mixed') {
      const fns = [mathQ,
        () => {
          const [c, cap] = CAPITAL_BANK[Math.floor(Math.random()*CAPITAL_BANK.length)];
          return mcq(`Capital of ${c}?`, cap, pickWrongSimilar(CAPITAL_BANK.map(x => x[1]), cap, 3));
        },
        () => {
          const [a, b] = OPPOSITE_BANK[Math.floor(Math.random()*OPPOSITE_BANK.length)];
          return mcq(`Opposite of "${a}"?`, b, pickWrongSimilar(OPPOSITE_BANK.map(x => x[1]), b, 3));
        },
        () => {
          const [q, ans, wrong] = SCIENCE_BANK[Math.floor(Math.random()*SCIENCE_BANK.length)];
          return mcq(q, ans, wrong);
        },
      ];
      for (let i = 0; i < count; i++) questions.push(fns[i % fns.length]());
    } else if (topicId === 'math') {
      for (let i = 0; i < count; i++) questions.push(mathQ());
    } else if (topicId === 'capitals') {
      const picks = pickN(CAPITAL_BANK, count);
      for (const [c, cap] of picks) {
        questions.push(mcq(`Capital of ${c}?`, cap, pickWrongSimilar(CAPITAL_BANK.map(x => x[1]), cap, 3)));
      }
    } else if (topicId === 'opposites') {
      const picks = pickN(OPPOSITE_BANK, count);
      for (const [a, b] of picks) {
        questions.push(mcq(`Opposite of "${a}"?`, b, pickWrongSimilar(OPPOSITE_BANK.map(x => x[1]), b, 3)));
      }
    } else if (topicId === 'science') {
      const picks = pickN(SCIENCE_BANK, Math.min(count, SCIENCE_BANK.length));
      for (const [q, ans, wrong] of picks) questions.push(mcq(q, ans, wrong));
    } else if (topicId === 'animals') {
      const picks = pickN(ANIMAL_BANK, Math.min(count, ANIMAL_BANK.length));
      for (const [q, ans, wrong] of picks) questions.push(mcq(q, ans, wrong));
    } else if (topicId === 'spelling') {
      const picks = pickN(SPELLING_BANK, Math.min(count, SPELLING_BANK.length));
      for (const [correct, wrong] of picks) {
        const opts = shuffle([correct, ...wrong]);
        questions.push({ q:'Which is correctly spelled?', choices: opts, answer: opts.indexOf(correct) });
      }
    } else if (topicId === 'sports') {
      const picks = pickN(SPORTS_BANK, Math.min(count, SPORTS_BANK.length));
      for (const [q, ans, wrong] of picks) questions.push(mcq(q, ans, wrong));
    }

    if (questions.length === 0) return { ok:false, error:'No questions generated for that topic.' };
    const set = {
      id: 'local_' + Date.now(),
      name: (name && name.trim()) || `Local · ${preset.name}`,
      description: (description && description.trim()) || preset.description,
      category: 'Local',
      source: 'local',
      questions,
    };
    // store under the AI list bucket so it persists
    saveAISet(set);
    return { ok:true, set };
  }

  return {
    BUILTIN, allSets, getSetById, nextQuestion,
    getCustomSets, saveCustomSet, deleteSet, getAISets,
    TOPIC_PRESETS, generateLocalSet,
  };
})();
