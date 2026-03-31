import { reactive, watch } from 'vue';
import {
  SKILL_DEFS,
  SKILL_ALIAS,
  SKILL_SPECIALIZATION_OPTIONS,
  FALLBACK_OCCUPATIONS_RAW,
  FALLBACK_WEAPONS,
  OCCUPATION_QUERY_EXPANSIONS,
  OCCUPATION_KEYWORD_GROUPS
} from './constants.js';
import { FALLBACK_EXPERIENCE_PACKS } from './coc7Rules.js';
import { normalizeInt, clamp, normalizeText, normalizeFormula, chineseToInt } from './utils.js';
import { bindMethods } from './useCoCMethods.js';

const DRAFT_STORAGE_KEY = 'coc7-sheet-maker-v1-draft';
const DRAFT_SAVE_DELAY = 240;
const DEFAULT_SPECIALIZATION_BASE_OVERRIDES = {
  artCraft: {
    表演: 5,
    绘画: 5,
    雕刻: 5,
    摄影: 5,
    写作: 5,
    舞蹈: 5,
    乐器: 5,
    理发: 5,
    厨艺: 5,
    伪造: 5,
  },
  languageOther: {
    英语: 1,
    法语: 1,
    德语: 1,
    拉丁语: 1,
    汉语: 1,
    日语: 1,
    阿拉伯语: 1,
    俄语: 1,
    西班牙语: 1,
    意大利语: 1,
  },
  languageOwn: {
    英语: 0,
    汉语: 0,
    法语: 0,
    德语: 0,
    日语: 0,
    俄语: 0,
    西班牙语: 0,
  },
  pilot: {
    飞行器: 1,
    船: 1,
    飞艇: 1,
    热气球: 1,
  },
  science: {
    化学: 1,
    物理: 1,
    生物学: 1,
    药学: 1,
    数学: 1,
    地质学: 1,
    天文学: 1,
    植物学: 1,
    动物学: 1,
    密码学: 1,
    气象学: 1,
    工程学: 1,
    司法科学: 1,
  },
  firearmsHandgun: {
    左轮手枪: 20,
    半自动手枪: 20,
    手枪: 20,
    冲锋枪: 15,
    信号枪: 20,
    机枪: 10,
    重武器: 10,
    '步枪/霰弹枪': 25,
  },
  firearmsRifle: {
    步枪: 25,
    霰弹枪: 25,
    弓: 15,
    弩: 15,
    喷射器: 10,
  },
  fightingBrawl: {
    斗殴: 25,
    剑: 20,
    斧: 15,
    矛: 20,
    鞭: 5,
    连枷: 10,
    绞索: 15,
    链锯: 10,
  },
  survival: {
    沙漠: 10,
    极地: 10,
    海上: 10,
    森林: 10,
    高山: 10,
    丛林: 10,
    地底: 10,
  },
};

export function getExpandedOccupationSearchTerms(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  const terms = new Set([normalized]);
  Object.entries(OCCUPATION_QUERY_EXPANSIONS).forEach(([base, aliases]) => {
    const all = [base, ...aliases].map((x) => normalizeText(x));
    if (all.some((x) => normalized.includes(x))) all.forEach((x) => terms.add(x));
  });
  return Array.from(terms).filter(Boolean);
}

export function inferOccupationKeywords(name) {
  const normalizedName = normalizeText(name);
  const keywords = [];
  OCCUPATION_KEYWORD_GROUPS.forEach((group) => {
    const include = group.include.map((x) => normalizeText(x));
    if (include.some((x) => normalizedName.includes(x))) keywords.push(...group.keywords);
  });
  return Array.from(new Set(keywords));
}

export function extractSkillKeysFromText(text) {
  const normalized = normalizeText(text);
  const set = new Set();
  Object.entries(SKILL_ALIAS).forEach(([key, aliases]) => {
    for (const alias of aliases) {
      if (normalized.includes(normalizeText(alias))) {
        set.add(key);
        break;
      }
    }
  });

  if (set.has('firearmsHandgun') && set.has('firearmsRifle')) {
    const hasHandgunHint = /手枪|手槍/i.test(String(text || ''));
    const hasRifleHint = /步枪|步槍|霰弹枪|霰彈槍|shotgun|rifle/i.test(String(text || ''));
    if (hasHandgunHint && !hasRifleHint) set.delete('firearmsRifle');
    if (hasRifleHint && !hasHandgunHint) set.delete('firearmsHandgun');
  }

  if (set.has('driveAuto') && set.has('pilot')) {
    const raw = String(text || '');
    const hasAutoHint = /汽车|汽車|车辆|車輛|car|auto/i.test(raw);
    const hasPilotHint = /飞行器|飛行器|船|舰|艦|aircraft|boat|ship|pilot|飞行|飛行/i.test(raw);
    if (hasAutoHint && !hasPilotHint) set.delete('pilot');
    if (hasPilotHint && !hasAutoHint) set.delete('driveAuto');
  }

  return Array.from(set);
}

function uniqBy(list, getKey) {
  const seen = new Set();
  return list.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function keyToOccupationRef(key) {
  const skill = SKILL_DEFS.find((item) => item.key === key);
  return {
    id: `skill-${key}`,
    key,
    keys: [key],
    label: skill?.name || key,
  };
}

function normalizeOccupationRef(ref, fallbackId) {
  if (!ref) return null;
  if (typeof ref === 'string') return keyToOccupationRef(ref);

  const rawKeys = [
    ...(Array.isArray(ref.keys) ? ref.keys : []),
    ref.key,
  ].filter(Boolean);
  const keys = Array.from(new Set(rawKeys));
  const label =
    String(ref.label || ref.name || "").trim() ||
    SKILL_DEFS.find((item) => item.key === keys[0])?.name ||
    keys[0] ||
    fallbackId;
  if (!label && keys.length === 0) return null;
  return {
    id: String(ref.id || fallbackId || label),
    key: String(ref.key || keys[0] || ""),
    keys,
    label,
    specialization: String(ref.specialization || "").trim(),
    sourceRow: String(ref.sourceRow || "").trim(),
    raw: String(ref.raw || "").trim(),
  };
}

function getSkillFamilyLabel(key) {
  const familyMap = {
    artCraft: '艺术/工艺',
    fightingBrawl: '格斗',
    firearmsHandgun: '射击',
    firearmsRifle: '射击',
    languageOther: '其他语言',
    languageOwn: '母语',
    pilot: '操作/驾驶',
    science: '科学',
    survival: '生存',
  };
  if (familyMap[key]) return familyMap[key];
  return SKILL_DEFS.find((item) => item.key === key)?.name || key;
}

function makeSkillRef(key, fallbackId, options = {}) {
  const specialization = String(options.specialization || '').trim();
  const label = String(options.label || '').trim() ||
    (specialization ? `${getSkillFamilyLabel(key)}（${specialization}）` : getSkillFamilyLabel(key));
  return normalizeOccupationRef({
    key,
    keys: [key],
    label,
    specialization,
  }, fallbackId);
}

function makeChoiceGroup(id, label, choose, options, marker = '') {
  return {
    id,
    label,
    choose,
    marker,
    options: uniqBy(options.filter(Boolean), (ref) => ref.id),
  };
}

function makeSocialChoiceOptions(prefix) {
  return [
    makeSkillRef('charm', `${prefix}-charm`),
    makeSkillRef('fastTalk', `${prefix}-fastTalk`),
    makeSkillRef('persuade', `${prefix}-persuade`),
    makeSkillRef('intimidate', `${prefix}-intimidate`),
  ];
}

function makeSpecializationChoiceOptions(key, prefix, labels = []) {
  return labels.map((label, index) => makeSkillRef(key, `${prefix}-${index + 1}`, { specialization: label }));
}

function buildExperiencePackPlan(id, skillText) {
  const firearmBasicOptions = [
    makeSkillRef('firearmsHandgun', `${id}-firearm-handgun`, { specialization: '手枪' }),
    makeSkillRef('firearmsRifle', `${id}-firearm-rifle`, { specialization: '步枪/霰弹枪' }),
  ];

  switch (id) {
    case 'battle-soldier':
      return {
        mandatoryRefs: [
          makeSkillRef('climb', `${id}-climb`),
          makeSkillRef('fightingBrawl', `${id}-fight`, { specialization: '斗殴' }),
          makeSkillRef('firearmsRifle', `${id}-rifle`, { specialization: '步枪/霰弹枪' }),
          makeSkillRef('firstAid', `${id}-firstAid`),
          makeSkillRef('intimidate', `${id}-intimidate`),
          makeSkillRef('listen', `${id}-listen`),
          makeSkillRef('stealth', `${id}-stealth`),
          makeSkillRef('throw', `${id}-throw`),
          makeSkillRef('sleightOfHand', `${id}-sleight`),
          makeSkillRef('spotHidden', `${id}-spot`),
          makeSkillRef('survival', `${id}-survival`),
        ],
        choiceGroups: [],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'battle-officer':
      return {
        mandatoryRefs: [
          makeSkillRef('climb', `${id}-climb`),
          makeSkillRef('fightingBrawl', `${id}-fight`, { specialization: '斗殴' }),
          makeSkillRef('firearmsHandgun', `${id}-handgun`, { specialization: '手枪' }),
          makeSkillRef('firstAid', `${id}-firstAid`),
          makeSkillRef('listen', `${id}-listen`),
          makeSkillRef('stealth', `${id}-stealth`),
          makeSkillRef('throw', `${id}-throw`),
          makeSkillRef('spotHidden', `${id}-spot`),
        ],
        choiceGroups: [
          makeChoiceGroup(
            `${id}-social-or-nav`,
            '导航 / 社交技能 4选1',
            1,
            [
              makeSkillRef('navigate', `${id}-navigate`),
              ...makeSocialChoiceOptions(`${id}-social`),
            ],
            '⊙',
          ),
        ],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'police':
      return {
        mandatoryRefs: [
          makeSkillRef('climb', `${id}-climb`),
          makeSkillRef('driveAuto', `${id}-driveAuto`),
          makeSkillRef('fightingBrawl', `${id}-fight`, { specialization: '斗殴' }),
          makeSkillRef('firstAid', `${id}-firstAid`),
          makeSkillRef('law', `${id}-law`),
          makeSkillRef('listen', `${id}-listen`),
          makeSkillRef('languageOther', `${id}-languageOther`),
          makeSkillRef('track', `${id}-track`),
        ],
        choiceGroups: [
          makeChoiceGroup(`${id}-firearm`, '射击 2选1', 1, firearmBasicOptions, '☆'),
          makeChoiceGroup(`${id}-social`, '社交技能 4选2', 2, makeSocialChoiceOptions(`${id}-social`), '☯'),
        ],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'criminal':
      return {
        mandatoryRefs: [
          makeSkillRef('climb', `${id}-climb`),
          makeSkillRef('driveAuto', `${id}-driveAuto`),
          makeSkillRef('law', `${id}-law`),
          makeSkillRef('listen', `${id}-listen`),
          makeSkillRef('locksmith', `${id}-locksmith`),
          makeSkillRef('psychology', `${id}-psychology`),
          makeSkillRef('track', `${id}-track`),
        ],
        choiceGroups: [
          makeChoiceGroup(
            `${id}-fight-any`,
            `格斗子类 ${SKILL_SPECIALIZATION_OPTIONS.fightingBrawl.length}选1`,
            1,
            makeSpecializationChoiceOptions('fightingBrawl', `${id}-fight`, SKILL_SPECIALIZATION_OPTIONS.fightingBrawl),
            '☆',
          ),
          makeChoiceGroup(
            `${id}-firearm-any`,
            `射击子类 ${SKILL_SPECIALIZATION_OPTIONS.firearmsHandgun.length + SKILL_SPECIALIZATION_OPTIONS.firearmsRifle.length}选1`,
            1,
            [
              ...makeSpecializationChoiceOptions('firearmsHandgun', `${id}-handgun`, SKILL_SPECIALIZATION_OPTIONS.firearmsHandgun),
              ...makeSpecializationChoiceOptions('firearmsRifle', `${id}-rifle`, SKILL_SPECIALIZATION_OPTIONS.firearmsRifle),
            ],
            '☆',
          ),
          makeChoiceGroup(`${id}-social`, '社交技能 4选1', 1, makeSocialChoiceOptions(`${id}-social`), '☯'),
        ],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'medical':
      return {
        mandatoryRefs: [
          makeSkillRef('firstAid', `${id}-firstAid`),
          makeSkillRef('law', `${id}-law`),
          makeSkillRef('listen', `${id}-listen`),
          makeSkillRef('medicine', `${id}-medicine`),
          makeSkillRef('psychology', `${id}-psychology`),
          makeSkillRef('spotHidden', `${id}-spotHidden`),
        ],
        choiceGroups: [
          makeChoiceGroup(
            `${id}-science`,
            `科学子类 ${SKILL_SPECIALIZATION_OPTIONS.science.length}选2`,
            2,
            makeSpecializationChoiceOptions('science', `${id}-science`, SKILL_SPECIALIZATION_OPTIONS.science),
            '☆',
          ),
        ],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'mythos':
      return {
        mandatoryRefs: [
          makeSkillRef('cthulhuMythos', `${id}-cthulhuMythos`),
        ],
        choiceGroups: [],
        freePickCount: 0,
        allowAnySkill: false,
      };
    case 'custom':
      return {
        mandatoryRefs: [],
        choiceGroups: [],
        freePickCount: 0,
        allowAnySkill: true,
      };
    default:
      return {
        ...parseOccupationPlan(skillText || ''),
        allowAnySkill: false,
      };
  }
}

function parseExperiencePackPoints(raw, id) {
  const value = String(raw || '').trim();
  const numeric = normalizeInt(value);
  if (numeric > 0) return { pointMode: 'fixed', points: numeric };
  if (id === 'custom' || /自定义|自訂|自行|CM/i.test(value)) return { pointMode: 'manual', points: 0 };
  return { pointMode: 'none', points: 0 };
}

function parseExperiencePackAgeMin(raw) {
  const match = String(raw || '').match(/(?:>=|＞=|至少|不低于)\s*(\d{1,3})/);
  return match ? normalizeInt(match[1]) : 0;
}

function normalizeOccupationPlan(plan) {
  if (!plan) return null;
  const mandatoryRefs = uniqBy(
    (plan.mandatoryRefs || plan.mandatoryKeys || []).map((ref, index) =>
      normalizeOccupationRef(ref, `mandatory-${index + 1}`),
    ).filter(Boolean),
    (ref) => ref.id,
  );

  const choiceGroups = (plan.choiceGroups || []).map((group, groupIndex) => {
    const options = uniqBy(
      (group.options || []).map((ref, optionIndex) =>
        normalizeOccupationRef(ref, `${group.id || `group-${groupIndex + 1}`}-opt-${optionIndex + 1}`),
      ).filter(Boolean),
      (ref) => ref.id,
    );
    if (!options.length) return null;
    const choose = clamp(normalizeInt(group.choose) || 1, 1, options.length);
    return {
      id: String(group.id || `group-${groupIndex + 1}`),
      choose,
      options,
      label: String(group.label || `${options.length}选${choose}`),
      marker: String(group.marker || "").trim(),
    };
  }).filter(Boolean);

  return {
    mandatoryRefs,
    choiceGroups,
    freePickCount: clamp(normalizeInt(plan.freePickCount), 0, 8),
    allowAnySkill: Boolean(plan.allowAnySkill),
  };
}

export function parseOccupationPlan(skillText) {
  const raw = String(skillText || "").trim();
  const mandatoryKeys = [];
  const choiceGroups = [];
  let freePickCount = 0;
  let freePickClaimedByGroups = 0;
  const numPattern = "一二两兩三四五六七八九十\\d";
  if (!raw) return { mandatoryRefs: [], choiceGroups: [], freePickCount };

  const captured = new Set();
  const segmentMatches = Array.from(raw.matchAll(/[（(【\[]([^）)\]]{1,120})[）)\]]/g));
  segmentMatches.forEach((m, i) => {
    const segment = m[1];
    const keys = extractSkillKeysFromText(segment);
    if (keys.length < 2) return;
    const index = m.index || 0;
    const around = raw.slice(Math.max(0, index - 24), Math.min(raw.length, index + m[0].length + 24));
    let choose = 1;
    const pickMatch = around.match(new RegExp(`([${numPattern}]+)\\s*(?:选|擇)\\s*([${numPattern}]+)`));
    if (pickMatch) choose = chineseToInt(pickMatch[2]);
    else {
      const socialMatch = around.match(new RegExp(`([${numPattern}]+)\\s*(?:项|項|种|種)\\s*(?:社交)?技能`));
      if (socialMatch) choose = chineseToInt(socialMatch[1]);
      else {
        const anyMatch = around.match(new RegExp(`(?:任意|任选|自选|选择)\\s*([${numPattern}]+)\\s*(?:项|項|种|種)`));
        if (anyMatch) {
          choose = chineseToInt(anyMatch[1]);
          freePickClaimedByGroups += choose;
        }
      }
    }
    choose = clamp(choose || 1, 1, keys.length);
    choiceGroups.push({
      id: `g-${i}`,
      choose,
      options: keys.map((key) => keyToOccupationRef(key)),
      label: `${keys.length}选${choose}`,
    });
    keys.forEach((k) => captured.add(k));
  });

  extractSkillKeysFromText(raw).forEach((key) => {
    if (!captured.has(key)) mandatoryKeys.push(key);
  });

  const freeMatches = Array.from(raw.matchAll(new RegExp(`(?:任意|任选|自选|选择)\\s*([${numPattern}]+)\\s*(?:项|項|种|種)`, "g")));
  freePickCount = freeMatches.reduce((acc, m) => acc + chineseToInt(m[1]), 0);
  freePickCount = Math.max(0, freePickCount - freePickClaimedByGroups);

  return {
    mandatoryRefs: Array.from(new Set(mandatoryKeys)).map((key) => keyToOccupationRef(key)),
    choiceGroups,
    freePickCount: clamp(freePickCount, 0, 8),
  };
}

export function parseCreditRatingRange(skillText) {
  const raw = String(skillText || "");
  const rangeMatch = raw.match(
    /(?:信用(?:评级|評級|评等)?|credit\s*rating)[^0-9]{0,10}(\d{1,3})\s*(?:-|－|—|~|～|至|到)\s*(\d{1,3})/i,
  );
  if (rangeMatch) {
    const a = clamp(normalizeInt(rangeMatch[1]), 0, 99);
    const b = clamp(normalizeInt(rangeMatch[2]), 0, 99);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const singleMatch = raw.match(/(?:信用(?:评级|評級|评等)?|credit\s*rating)[^0-9]{0,10}(\d{1,3})/i);
  if (singleMatch) {
    const v = clamp(normalizeInt(singleMatch[1]), 0, 99);
    return { min: v, max: v };
  }
  return null;
}

export function normalizeOccupation(raw) {
  const name = String(raw.name || "").trim();
  const formula = normalizeFormula(raw.formula);
  const skillText = String(raw.skillText || "").trim();
  const aliasKeywords = inferOccupationKeywords(name);
  const plan = normalizeOccupationPlan(raw.plan) || parseOccupationPlan(skillText);

  // P0-5.3: Consistency check between pre-parsed plan and skillText re-parse
  if (raw.plan && skillText) {
    const reParsed = parseOccupationPlan(skillText);
    const planKeys = new Set([
      ...plan.mandatoryRefs.flatMap((ref) => ref.keys || []),
      ...plan.choiceGroups.flatMap((g) => g.options.flatMap((ref) => ref.keys || [])),
    ]);
    const reKeys = new Set([
      ...reParsed.mandatoryRefs.flatMap((ref) => ref.keys || []),
      ...reParsed.choiceGroups.flatMap((g) => g.options.flatMap((ref) => ref.keys || [])),
    ]);
    const diff = Math.abs(planKeys.size - reKeys.size);
    if (diff > 2) {
      console.warn(`[OccPlan] "${name}" plan(${planKeys.size}个技能key) vs skillText重解析(${reKeys.size}个) 差异 ${diff}，可能不同步`);
    }
  }

  const keySkillCount = new Set([
    ...plan.mandatoryRefs.flatMap((ref) => ref.keys || []),
    ...plan.choiceGroups.flatMap((g) => g.options.flatMap((ref) => ref.keys || [])),
  ]).size;
  const creditRatingRange = raw.creditRatingRange || parseCreditRatingRange(skillText);
  const searchText = normalizeText(`${name} ${formula} ${skillText} ${aliasKeywords.join(" ")}`);
  return {
    name,
    sequence: normalizeInt(raw.sequence),
    formula,
    skillText,
    plan,
    keySkillCount,
    aliasKeywords,
    searchText,
    creditRatingRange,
    recommendedContact: String(raw.recommendedContact || raw.recommended_contact || "").trim(),
    intro: String(raw.intro || "").trim(),
  };
}

export function makeInitialSkills() {
  return SKILL_DEFS.map((def) => ({
    ...def,
    occ: 0,
    interest: 0,
    exp: 0,
    specialization: "",
    specializationChoice: "",
  }));
}

export function createInitialState() {
  return {
    stage: 0,
    basic: { name: "", age: 28, gender: "", occupation: "", era: "1920年代（经典）", birthplace: "", residence: "", archetype: "" },
    occupation: { selectedName: "", previewName: "", formula: "EDU*4", skillText: "", mandatoryRefs: [], choiceGroups: [], groupPicks: {}, freePickCount: 0, freePicks: [], creditRatingRange: null },
    experience: { selectedId: "", selectedName: "", skillText: "", mandatoryRefs: [], choiceGroups: [], groupPicks: {}, allowAnySkill: false, pointMode: 'none', points: 0, manualPoints: 0, ageMin: 0, sanityLoss: "", notes: "" },
    attrs: { STR: 50, CON: 50, POW: 50, DEX: 50, APP: 50, SIZ: 50, INT: 50, EDU: 50, Luck: 50, HP: 10, MP: 10, SAN: 50, MOV: 8, DB: "0", Build: 0 },
    pools: { occupation: 0, interest: 0, experience: 0, occSpent: 0, intSpent: 0, expSpent: 0 },
    skills: makeInitialSkills(),
    meta: { ageAdjustmentSnapshot: null, ageAdjustmentConfig: null, ageAdjustmentAppliedAge: null },
    background: {
      desc: "",
      belief: "",
      importantPerson: "",
      importantPlace: "",
      treasure: "",
      traits: "",
      keyLinkType: "",
      keyLinkDetail: "",
      cash: "",
      assets: "",
      items: "",
      experiencePackId: "",
    },
    selectedWeapons: [],
    occupationSearch: "",
    weaponSearch: "",
  };
}

function sanitizeSelectedWeapons(rawWeapons) {
  if (!Array.isArray(rawWeapons)) return [];
  return rawWeapons
    .map((weapon, index) => {
      const name = String(weapon?.name || '').trim();
      if (!name) return null;
      return {
        id: String(weapon?.id || `saved-${index + 1}`),
        name,
        type: String(weapon?.type || '').trim(),
        skill: String(weapon?.skill || '').trim(),
        damage: String(weapon?.damage || '').trim(),
        range: String(weapon?.range || '').trim(),
        era: String(weapon?.era || '').trim(),
        penetrate: String(weapon?.penetrate || '').trim(),
        attacks_per_round: String(weapon?.attacks_per_round || '').trim(),
        ammo: String(weapon?.ammo || '').trim(),
        malfunction: String(weapon?.malfunction || '').trim(),
        notes: String(weapon?.notes || '').trim(),
        count: Math.max(1, normalizeInt(weapon?.count) || 1),
      };
    })
    .filter(Boolean);
}

function hydrateSkills(savedSkills) {
  const base = makeInitialSkills();
  const byKey = new Map(
    (Array.isArray(savedSkills) ? savedSkills : [])
      .filter((item) => item && item.key)
      .map((item) => [item.key, item]),
  );

  return base.map((skill) => {
    const saved = byKey.get(skill.key) || {};
    return {
      ...skill,
      occ: Math.max(0, normalizeInt(saved.occ)),
      interest: Math.max(0, normalizeInt(saved.interest)),
      exp: Math.max(0, normalizeInt(saved.exp)),
      specialization: String(saved.specialization || ''),
      specializationChoice: String(saved.specializationChoice || ''),
    };
  });
}

function loadDraftState() {
  const base = createInitialState();
  if (typeof localStorage === 'undefined') return base;

  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);

    return {
      ...base,
      stage: clamp(normalizeInt(saved?.stage), 0, 4),
      basic: { ...base.basic, ...(saved?.basic || {}) },
      occupation: {
        ...base.occupation,
        ...(saved?.occupation || {}),
        mandatoryRefs: Array.isArray(saved?.occupation?.mandatoryRefs) ? saved.occupation.mandatoryRefs : [],
        choiceGroups: Array.isArray(saved?.occupation?.choiceGroups) ? saved.occupation.choiceGroups : [],
        groupPicks: saved?.occupation?.groupPicks && typeof saved.occupation.groupPicks === 'object' ? saved.occupation.groupPicks : {},
        freePicks: Array.isArray(saved?.occupation?.freePicks) ? saved.occupation.freePicks : [],
      },
      experience: {
        ...base.experience,
        ...(saved?.experience || {}),
        mandatoryRefs: Array.isArray(saved?.experience?.mandatoryRefs) ? saved.experience.mandatoryRefs : [],
        choiceGroups: Array.isArray(saved?.experience?.choiceGroups) ? saved.experience.choiceGroups : [],
        groupPicks: saved?.experience?.groupPicks && typeof saved.experience.groupPicks === 'object' ? saved.experience.groupPicks : {},
      },
      attrs: { ...base.attrs, ...(saved?.attrs || {}) },
      pools: { ...base.pools, ...(saved?.pools || {}) },
      meta: { ...base.meta, ...(saved?.meta || {}) },
      background: {
        ...base.background,
        ...(saved?.background || {}),
        experiencePackId: String(saved?.background?.experiencePackId || saved?.experience?.selectedId || ''),
      },
      skills: hydrateSkills(saved?.skills),
      selectedWeapons: sanitizeSelectedWeapons(saved?.selectedWeapons),
      occupationSearch: String(saved?.occupationSearch || ''),
      weaponSearch: String(saved?.weaponSearch || ''),
    };
  } catch {
    return base;
  }
}

function buildDraftSnapshot(state) {
  return {
    stage: normalizeInt(state.stage),
    basic: { ...state.basic },
    occupation: {
      ...state.occupation,
      mandatoryRefs: [...(state.occupation.mandatoryRefs || [])],
      choiceGroups: [...(state.occupation.choiceGroups || [])],
      groupPicks: { ...(state.occupation.groupPicks || {}) },
      freePicks: [...(state.occupation.freePicks || [])],
    },
    experience: {
      ...state.experience,
      mandatoryRefs: [...(state.experience.mandatoryRefs || [])],
      choiceGroups: [...(state.experience.choiceGroups || [])],
      groupPicks: { ...(state.experience.groupPicks || {}) },
    },
    attrs: { ...state.attrs },
    pools: { ...state.pools },
    meta: { ...state.meta },
    background: {
      ...state.background,
      experiencePackId: String(state.background.experiencePackId || state.experience.selectedId || ''),
    },
    skills: state.skills.map((skill) => ({
      key: skill.key,
      occ: normalizeInt(skill.occ),
      interest: normalizeInt(skill.interest),
      exp: normalizeInt(skill.exp),
      specialization: String(skill.specialization || ''),
      specializationChoice: String(skill.specializationChoice || ''),
    })),
    selectedWeapons: state.selectedWeapons.map((weapon) => ({
      id: String(weapon.id || ''),
      name: String(weapon.name || ''),
      type: String(weapon.type || ''),
      skill: String(weapon.skill || ''),
      damage: String(weapon.damage || ''),
      range: String(weapon.range || ''),
      era: String(weapon.era || ''),
      penetrate: String(weapon.penetrate || ''),
      attacks_per_round: String(weapon.attacks_per_round || ''),
      ammo: String(weapon.ammo || ''),
      malfunction: String(weapon.malfunction || ''),
      notes: String(weapon.notes || ''),
      count: Math.max(1, normalizeInt(weapon.count) || 1),
    })),
    occupationSearch: String(state.occupationSearch || ''),
    weaponSearch: String(state.weaponSearch || ''),
  };
}

function buildDefaultSpecializationDetails() {
  const details = {};
  SKILL_DEFS.forEach((skill) => {
    const options = SKILL_SPECIALIZATION_OPTIONS[skill.key];
    if (!Array.isArray(options) || !options.length) return;
    const defaults = Object.fromEntries(
      options.map((label) => [label, normalizeInt(skill.base)]),
    );
    details[skill.key] = {
      ...defaults,
      ...(DEFAULT_SPECIALIZATION_BASE_OVERRIDES[skill.key] || {}),
    };
  });
  return details;
}

export function useCoCLogic() {
  const state = reactive(loadDraftState());
  const runtime = reactive({
    occupations: FALLBACK_OCCUPATIONS_RAW.map(normalizeOccupation),
    weapons: [...FALLBACK_WEAPONS],
    specializationOptions: { ...SKILL_SPECIALIZATION_OPTIONS },
    specializationDetails: buildDefaultSpecializationDetails(),
    experiencePacks: FALLBACK_EXPERIENCE_PACKS.map(normalizeExperiencePackRow).filter(Boolean),
    loadedFromWorkbook: false,
    occupationSource: "内置示例",
    weaponSource: "内置示例",
    experiencePackSource: "内置示例",
  });

  const methods = bindMethods(state, runtime);

  let draftTimer = null;

  function saveDraftNow() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(buildDraftSnapshot(state)));
    } catch {
      // Ignore quota/security errors in private mode.
    }
  }

  function clearDraft() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  watch(
    state,
    () => {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(() => {
        saveDraftNow();
      }, DRAFT_SAVE_DELAY);
    },
    { deep: true },
  );



  function normalizeOccupationRow(row) {
    const name = String(row?.name || "").trim();
    const formula = String(row?.formula_eval || row?.formula_normalized || row?.formula_raw || row?.formula || "").trim();
    const skillText = String(row?.skill_text || row?.skillText || "").trim();
    if (!name || !formula || !skillText) return null;
    return normalizeOccupation({
      name,
      formula,
      skillText,
      plan: row?.plan || null,
      creditRatingRange: row?.credit_rating_range || row?.creditRatingRange || null,
    });
  }

  function normalizeSpecializationRows(rows) {
    if (!rows || typeof rows !== 'object') return null;
    const optionsByKey = { ...SKILL_SPECIALIZATION_OPTIONS };
    const detailsByKey = buildDefaultSpecializationDetails();
    Object.entries(rows).forEach(([key, values]) => {
      const skill = SKILL_DEFS.find((item) => item.key === key);
      const defaultBase = normalizeInt(skill?.base);
      const existingOptions = new Set(optionsByKey[key] || []);
      const existingDetails = { ...(detailsByKey[key] || {}) };
      if (!Array.isArray(values)) return;

      values.forEach((item) => {
        const label = typeof item === 'string' ? String(item).trim() : String(item?.label || "").trim();
        if (!label) return;
        existingOptions.add(label);
        const baseValue =
          typeof item === 'string' || item?.base === undefined || item?.base === null || item?.base === ''
            ? defaultBase
            : normalizeInt(item.base);
        existingDetails[label] = Number.isFinite(baseValue) ? baseValue : defaultBase;
      });

      optionsByKey[key] = Array.from(existingOptions);
      detailsByKey[key] = existingDetails;
    });
    return {
      optionsByKey,
      detailsByKey,
    };
  }

  function normalizeWeaponRow(row, index) {
    const name = String(row?.name || "").trim();
    const skill = String(row?.skill || "").trim();
    const damage = String(row?.damage || "").trim();
    const range = String(row?.range || "").trim();
    if (!name || !skill || !damage) return null;
    return {
      id: String(row?.id || `w-${index + 1}`),
      name,
      type: String(row?.type || "").trim() || "常规",
      skill,
      damage,
      range: range || "接触",
      era: String(row?.era || "").trim(),
      penetrate: String(row?.penetrate || "").trim(),
      attacks_per_round: String(row?.attacks_per_round || row?.attacksPerRound || "").trim(),
      ammo: String(row?.ammo || "").trim(),
      malfunction: String(row?.malfunction || "").trim(),
      notes: String(row?.notes || "").trim(),
    };
  }

  function normalizeExperiencePackRow(row, index) {
    const name = String(row?.name || row?.title || "").trim();
    if (!name) return null;
    const id = String(row?.id || `pack-${index + 1}`);
    const initialAge = String(row?.initialAge || row?.initial_age || row?.age || "").trim();
    const skillGrowth = String(row?.skillGrowth || row?.skill_growth || row?.growth || "").trim();
    const skills = String(row?.skills || row?.skillText || row?.skill_text || "").trim();
    const plan = normalizeOccupationPlan(row?.plan || buildExperiencePackPlan(id, skills)) || {
      mandatoryRefs: [],
      choiceGroups: [],
      freePickCount: 0,
      allowAnySkill: false,
    };
    const pointConfig = parseExperiencePackPoints(skillGrowth, id);
    return {
      id,
      name,
      sanityLoss: String(row?.sanityLoss || row?.sanity_loss || row?.sanity || "").trim(),
      initialAge,
      ageMin: parseExperiencePackAgeMin(initialAge),
      skillGrowth,
      pointMode: pointConfig.pointMode,
      skillGrowthPoints: pointConfig.points,
      backgroundAdd: String(row?.backgroundAdd || row?.background_add || row?.background || "").trim(),
      skills,
      skillText: skills,
      plan,
      allowAnySkill: Boolean(plan.allowAnySkill),
      notes: String(row?.notes || row?.remark || row?.note || "").trim(),
    };
  }

  async function initRuntimeData() {
    let occupationRows, weaponRows, specializationRows, experiencePackRows;
    try {
      const [occMod, weapMod, specMod, expMod] = await Promise.all([
        import('../../data/occupations.from_excel.json'),
        import('../../data/weapons.from_excel.json'),
        import('../../data/skill-specializations.from_excel.json'),
        import('../../data/experience-packs.from_excel.json')
      ]);
      occupationRows = occMod.default || occMod;
      weaponRows = weapMod.default || weapMod;
      specializationRows = specMod.default || specMod;
      experiencePackRows = expMod.default || expMod;
    } catch (err) {
      console.error("动态加载 JSON 数据块失败", err);
    }

    if (Array.isArray(occupationRows) && occupationRows.length) {
      const parsed = occupationRows.map(normalizeOccupationRow).filter(Boolean);
      if (parsed.length) {
        runtime.occupations = parsed;
        runtime.occupationSource = "data/occupations.from_excel.json";
        runtime.loadedFromWorkbook = true;
      }
    }

    if (Array.isArray(weaponRows) && weaponRows.length) {
      const parsed = weaponRows.map(normalizeWeaponRow).filter(Boolean);
      if (parsed.length) {
        runtime.weapons = parsed;
        runtime.weaponSource = "data/weapons.from_excel.json";
        runtime.loadedFromWorkbook = true;
      }
    }

    const specializationCatalog = normalizeSpecializationRows(specializationRows || {});
    if (specializationCatalog) {
      runtime.specializationOptions = specializationCatalog.optionsByKey;
      runtime.specializationDetails = specializationCatalog.detailsByKey;
      runtime.loadedFromWorkbook = true;
    }

    if (Array.isArray(experiencePackRows) && experiencePackRows.length) {
      const parsed = experiencePackRows.map(normalizeExperiencePackRow).filter(Boolean);
      if (parsed.length) {
        runtime.experiencePacks = parsed;
        runtime.experiencePackSource = "data/experience-packs.from_excel.json";
        runtime.loadedFromWorkbook = true;
      }
    }

    if (state.occupation.selectedName) {
      const occ = methods.getOccupationByName(state.occupation.selectedName);
      if (occ) methods.applyOccupationToState(occ, false, { preserveSelections: true });
    } else if (runtime.occupations.length) {
      state.occupation.previewName = runtime.occupations[0].name;
    }

    const selectedExperiencePackId = state.background.experiencePackId || state.experience.selectedId;
    if (selectedExperiencePackId) {
      const pack = methods.getExperiencePackById(selectedExperiencePackId);
      if (pack) methods.applyExperiencePackToState(pack, { preserveSelections: true });
    }
  }

  return { state, runtime, initRuntimeData, saveDraftNow, clearDraft, ...methods };
}
