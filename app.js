const STORAGE_KEY = "coc7-sheet-maker-v3";
const TEMPLATE_FILE = "COC七版空白卡G3.5.11.5 (修订版).xlsx";

const STAGES = [
  { label: "序章", title: "角色身份", goal: "先在职业图鉴中选择职业，再填写调查员基础信息。" },
  { label: "第一章", title: "属性骰点", goal: "按 CoC7 规则生成属性并确认衍生值。" },
  { label: "第二章", title: "技能分配", goal: "按职业规则完成职业技能可选项，再手动分配点数。" },
  { label: "第三章", title: "背景装备", goal: "补完背景并拖拽武器到角色卡。" },
  { label: "终章", title: "导出收尾", goal: "导出精简 PDF 与模板兼容 Excel。" },
];

const ATTR_ORDER = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "Luck"];

const SKILL_DEFS = [
  { key: "accounting", name: "会计", base: 5 },
  { key: "anthropology", name: "人类学", base: 1 },
  { key: "appraise", name: "估价", base: 5 },
  { key: "archaeology", name: "考古学", base: 1 },
  { key: "charm", name: "魅惑", base: 15 },
  { key: "climb", name: "攀爬", base: 20 },
  { key: "creditRating", name: "信用评级", base: 0 },
  { key: "cthulhuMythos", name: "克苏鲁神话", base: 0 },
  { key: "disguise", name: "乔装", base: 5 },
  { key: "dodge", name: "闪避", base: 0 },
  { key: "driveAuto", name: "汽车驾驶", base: 20 },
  { key: "elecRepair", name: "电气维修", base: 10 },
  { key: "fastTalk", name: "话术", base: 5 },
  { key: "fightingBrawl", name: "格斗(斗殴)", base: 25 },
  { key: "firearmsHandgun", name: "射击(手枪)", base: 20 },
  { key: "firearmsRifle", name: "射击(步枪/霰弹枪)", base: 25 },
  { key: "firstAid", name: "急救", base: 30 },
  { key: "history", name: "历史", base: 5 },
  { key: "intimidate", name: "恐吓", base: 15 },
  { key: "jump", name: "跳跃", base: 20 },
  { key: "languageOwn", name: "母语", base: 0 },
  { key: "law", name: "法律", base: 5 },
  { key: "libraryUse", name: "图书馆使用", base: 20 },
  { key: "listen", name: "聆听", base: 20 },
  { key: "locksmith", name: "锁匠", base: 1 },
  { key: "medicine", name: "医学", base: 1 },
  { key: "naturalWorld", name: "博物学", base: 10 },
  { key: "occult", name: "神秘学", base: 5 },
  { key: "persuade", name: "说服", base: 10 },
  { key: "psychology", name: "心理学", base: 10 },
  { key: "ride", name: "骑术", base: 5 },
  { key: "science", name: "科学", base: 1 },
  { key: "sleightOfHand", name: "妙手", base: 10 },
  { key: "spotHidden", name: "侦查", base: 25 },
  { key: "stealth", name: "潜行", base: 20 },
  { key: "survival", name: "生存", base: 10 },
  { key: "swim", name: "游泳", base: 20 },
  { key: "throw", name: "投掷", base: 20 },
  { key: "track", name: "追踪", base: 10 },
];

const SKILL_ALIAS = {
  accounting: ["会计"],
  anthropology: ["人类学"],
  appraise: ["估价"],
  archaeology: ["考古学"],
  charm: ["魅惑"],
  climb: ["攀爬"],
  creditRating: ["信用评级", "信用"],
  cthulhuMythos: ["克苏鲁神话", "神话"],
  disguise: ["乔装"],
  dodge: ["闪避"],
  driveAuto: ["汽车驾驶", "驾驶(汽车)", "驾驶汽车"],
  elecRepair: ["电气维修", "电子维修"],
  fastTalk: ["话术"],
  fightingBrawl: ["格斗斗殴", "格斗(斗殴)", "斗殴"],
  firearmsHandgun: ["射击手枪", "射击(手枪)", "手枪"],
  firearmsRifle: ["射击步枪霰弹枪", "射击(步枪/霰弹枪)", "步枪", "霰弹枪"],
  firstAid: ["急救"],
  history: ["历史"],
  intimidate: ["恐吓"],
  jump: ["跳跃"],
  languageOwn: ["母语"],
  law: ["法律"],
  libraryUse: ["图书馆使用", "图书馆"],
  listen: ["聆听"],
  locksmith: ["锁匠", "开锁"],
  medicine: ["医学"],
  naturalWorld: ["博物学"],
  occult: ["神秘学"],
  persuade: ["说服"],
  psychology: ["心理学"],
  ride: ["骑术"],
  science: ["科学"],
  sleightOfHand: ["妙手"],
  spotHidden: ["侦查", "观察"],
  stealth: ["潜行", "隐匿"],
  survival: ["生存"],
  swim: ["游泳"],
  throw: ["投掷"],
  track: ["追踪"],
};

const FALLBACK_OCCUPATIONS_RAW = [
  { name: "私家侦探", formula: "EDU*2+DEX*2", skillText: "法律、图书馆使用、聆听、心理学、侦查、话术、格斗(斗殴)、任意二项" },
  { name: "警探", formula: "EDU*2+DEX*2", skillText: "法律、聆听、心理学、侦查、射击(手枪)、话术、格斗(斗殴)、任意二项" },
  { name: "巡警", formula: "EDU*2+STR*2", skillText: "法律、聆听、心理学、侦查、射击(手枪)、格斗(斗殴)、急救、任意一项" },
  { name: "记者", formula: "EDU*4", skillText: "图书馆使用、历史、话术、心理学、侦查、任意三项" },
  { name: "士兵", formula: "EDU*2+STR*2", skillText: "攀爬、急救、聆听、射击(步枪/霰弹枪)、格斗(斗殴)、任意二项" },
];

const FALLBACK_WEAPONS = [
  { id: "w-pistol", name: "手枪", type: "远程", skill: "射击(手枪)", damage: "1D10", range: "15码" },
  { id: "w-rifle", name: "步枪", type: "远程", skill: "射击(步枪/霰弹枪)", damage: "2D6+4", range: "110码" },
  { id: "w-knife", name: "小刀", type: "近战", skill: "格斗(斗殴)", damage: "1D4+DB", range: "-" },
];

const OCCUPATION_QUERY_EXPANSIONS = {
  警察: ["警探", "巡警", "刑警", "侦探", "执法", "警务", "公安"],
  医生: ["医师", "外科", "内科", "药剂师", "精神病学家"],
  老师: ["教师", "教授", "讲师", "研究员"],
  律师: ["法官", "检察官", "法务"],
  记者: ["媒体", "摄影记者", "新闻"],
};

const OCCUPATION_KEYWORD_GROUPS = [
  { include: ["警探", "巡警", "刑警", "警察", "执法"], keywords: OCCUPATION_QUERY_EXPANSIONS.警察 },
  { include: ["医生", "医师", "药剂师", "精神病学家"], keywords: OCCUPATION_QUERY_EXPANSIONS.医生 },
  { include: ["教师", "老师", "教授", "讲师", "研究员"], keywords: OCCUPATION_QUERY_EXPANSIONS.老师 },
  { include: ["律师", "法官", "检察官"], keywords: OCCUPATION_QUERY_EXPANSIONS.律师 },
  { include: ["记者", "摄影记者", "新闻"], keywords: OCCUPATION_QUERY_EXPANSIONS.记者 },
];

function normalizeInt(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toHalfWidth(str) {
  return String(str || "").replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

function normalizeText(text) {
  return toHalfWidth(String(text || ""))
    .toLowerCase()
    .replaceAll(/\s+/g, "")
    .replaceAll(/[，,。；;：:、\/\-\+*（）()\[\]【】《》“”"'`]/g, "");
}

function normalizeFormula(rawFormula) {
  return String(rawFormula || "")
    .toUpperCase()
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("，", ",")
    .replaceAll("×", "*")
    .replaceAll("＋", "+")
    .replaceAll(/\s+/g, "") || "EDU*4";
}

function getExpandedOccupationSearchTerms(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  const terms = new Set([normalized]);
  Object.entries(OCCUPATION_QUERY_EXPANSIONS).forEach(([base, aliases]) => {
    const all = [base, ...aliases].map((x) => normalizeText(x));
    if (all.some((x) => normalized.includes(x))) all.forEach((x) => terms.add(x));
  });
  return Array.from(terms).filter(Boolean);
}

function inferOccupationKeywords(name) {
  const normalizedName = normalizeText(name);
  const keywords = [];
  OCCUPATION_KEYWORD_GROUPS.forEach((group) => {
    const include = group.include.map((x) => normalizeText(x));
    if (include.some((x) => normalizedName.includes(x))) keywords.push(...group.keywords);
  });
  return Array.from(new Set(keywords));
}

function occupationMatchesQuery(occ, terms) {
  if (!terms.length) return true;
  return terms.some((term) => occ.searchText.includes(term));
}

function chineseToInt(raw) {
  const s = String(raw || "").trim();
  if (/^\d+$/.test(s)) return normalizeInt(s);
  const m = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (s === "十") return 10;
  if (s.length === 2 && s[0] === "十") return 10 + (m[s[1]] || 0);
  if (s.length === 2 && s[1] === "十") return (m[s[0]] || 0) * 10;
  if (s.length === 3 && s[1] === "十") return (m[s[0]] || 0) * 10 + (m[s[2]] || 0);
  return m[s] || 0;
}

function makeInitialSkills(saved = []) {
  const by = new Map(saved.map((x) => [x.key, x]));
  return SKILL_DEFS.map((def) => {
    const prev = by.get(def.key) || {};
    return {
      ...def,
      occ: normalizeInt(prev.occ),
      interest: normalizeInt(prev.interest),
    };
  });
}

function extractSkillKeysFromText(text) {
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
  return Array.from(set);
}

function parseOccupationPlan(skillText) {
  const raw = String(skillText || "").trim();
  const mandatoryKeys = [];
  const choiceGroups = [];
  let freePickCount = 0;
  if (!raw) return { mandatoryKeys, choiceGroups, freePickCount };

  const captured = new Set();
  const segments = Array.from(raw.matchAll(/[（(【\[]([^）)】\]]{1,120})[）)】\]]/g)).map((m) => m[1]);
  segments.forEach((segment, i) => {
    const keys = extractSkillKeysFromText(segment);
    if (keys.length < 2) return;
    let choose = 1;
    const pickMatch = segment.match(/([一二三四五六七八九十\d]+)\s*选\s*([一二三四五六七八九十\d]+)/);
    if (pickMatch) choose = chineseToInt(pickMatch[2]);
    else {
      const anyMatch = segment.match(/(?:任意|任选|自选|选择)\s*([一二三四五六七八九十\d]+)\s*项/);
      if (anyMatch) choose = chineseToInt(anyMatch[1]);
    }
    choose = clamp(choose || 1, 1, keys.length);
    choiceGroups.push({
      id: `g-${i}`,
      choose,
      options: keys,
      label: `${keys.length}选${choose}`,
    });
    keys.forEach((k) => captured.add(k));
  });

  extractSkillKeysFromText(raw).forEach((key) => {
    if (!captured.has(key)) mandatoryKeys.push(key);
  });

  const freeMatches = Array.from(raw.matchAll(/(?:任意|任选|自选|选择)\s*([一二三四五六七八九十\d]+)\s*项/g));
  freePickCount = freeMatches.reduce((acc, m) => acc + chineseToInt(m[1]), 0);

  return {
    mandatoryKeys: Array.from(new Set(mandatoryKeys)),
    choiceGroups,
    freePickCount: clamp(freePickCount, 0, 8),
  };
}

function normalizeOccupation(raw) {
  const name = String(raw.name || "").trim();
  const formula = normalizeFormula(raw.formula);
  const skillText = String(raw.skillText || "").trim();
  const aliasKeywords = inferOccupationKeywords(name);
  const plan = parseOccupationPlan(skillText);
  const keySkillCount = new Set([
    ...plan.mandatoryKeys,
    ...plan.choiceGroups.flatMap((g) => g.options),
  ]).size;
  const searchText = normalizeText(`${name} ${formula} ${skillText} ${aliasKeywords.join(" ")}`);
  return { name, formula, skillText, plan, keySkillCount, aliasKeywords, searchText };
}

function createInitialState() {
  return {
    stage: 0,
    basic: {
      name: "",
      age: 28,
      gender: "",
      occupation: "",
      era: "1920年代（经典）",
      birthplace: "",
      residence: "",
      archetype: "",
    },
    occupation: {
      selectedName: "",
      previewName: "",
      formula: "EDU*4",
      skillText: "",
      mandatoryKeys: [],
      choiceGroups: [],
      groupPicks: {},
      freePickCount: 0,
      freePicks: [],
    },
    attrs: {
      STR: 50,
      CON: 50,
      POW: 50,
      DEX: 50,
      APP: 50,
      SIZ: 50,
      INT: 50,
      EDU: 50,
      Luck: 50,
      HP: 10,
      MP: 10,
      SAN: 50,
      MOV: 8,
      DB: "0",
      Build: 0,
    },
    pools: {
      occupation: 0,
      interest: 0,
      occSpent: 0,
      intSpent: 0,
    },
    skills: makeInitialSkills(),
    background: {
      desc: "",
      belief: "",
      importantPerson: "",
      importantPlace: "",
      treasure: "",
      traits: "",
      cash: "",
      assets: "",
      items: "",
    },
    selectedWeapons: [],
    occupationSearch: "",
    weaponSearch: "",
  };
}

function loadState() {
  const base = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return {
      ...base,
      ...saved,
      basic: { ...base.basic, ...(saved.basic || {}) },
      occupation: { ...base.occupation, ...(saved.occupation || {}) },
      attrs: { ...base.attrs, ...(saved.attrs || {}) },
      pools: { ...base.pools, ...(saved.pools || {}) },
      background: { ...base.background, ...(saved.background || {}) },
      selectedWeapons: Array.isArray(saved.selectedWeapons) ? saved.selectedWeapons : [],
      skills: makeInitialSkills(saved.skills || []),
      stage: clamp(normalizeInt(saved.stage), 0, STAGES.length - 1),
    };
  } catch {
    return base;
  }
}

let state = loadState();
let runtime = {
  occupations: FALLBACK_OCCUPATIONS_RAW.map(normalizeOccupation),
  weapons: [...FALLBACK_WEAPONS],
  loadedFromWorkbook: false,
  occupationSource: "内置示例",
};
let cachedWorkbook = null;

const SKILL_ORDER = new Map(SKILL_DEFS.map((s, i) => [s.key, i]));

const dom = {
  stageLabel: document.getElementById("stageLabel"),
  stageTitle: document.getElementById("stageTitle"),
  stageGoal: document.getElementById("stageGoal"),
  progressFill: document.getElementById("progressFill"),
  stepPills: document.getElementById("stepPills"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  diceLog: document.getElementById("diceLog"),
  attrInputs: document.getElementById("attrInputs"),
  derivedStats: document.getElementById("derivedStats"),
  skillRows: document.getElementById("skillRows"),
  occFormula: document.getElementById("occFormula"),
  occPool: document.getElementById("occPool"),
  occSpent: document.getElementById("occSpent"),
  intPool: document.getElementById("intPool"),
  intSpent: document.getElementById("intSpent"),
  sheetPreview: document.getElementById("sheetPreview"),
  occupationCurrent: document.getElementById("occupationCurrent"),
  occupationSearch: document.getElementById("occupationSearch"),
  occupationCount: document.getElementById("occupationCount"),
  occupationGrid: document.getElementById("occupationGrid"),
  occupationDetailTitle: document.getElementById("occupationDetailTitle"),
  occupationDetailFormula: document.getElementById("occupationDetailFormula"),
  occupationDetailText: document.getElementById("occupationDetailText"),
  occupationDetailMandatory: document.getElementById("occupationDetailMandatory"),
  occupationDetailChoices: document.getElementById("occupationDetailChoices"),
  occupationDetailFree: document.getElementById("occupationDetailFree"),
  chooseOccupationBtn: document.getElementById("chooseOccupationBtn"),
  occupationRuleHint: document.getElementById("occupationRuleHint"),
  occupationPinned: document.getElementById("occupationPinned"),
  occupationChoices: document.getElementById("occupationChoices"),
  occupationFreePicks: document.getElementById("occupationFreePicks"),
  skillRuleWarning: document.getElementById("skillRuleWarning"),
  weaponSearch: document.getElementById("weaponSearch"),
  weaponCards: document.getElementById("weaponCards"),
  weaponDropZone: document.getElementById("weaponDropZone"),
  selectedWeapons: document.getElementById("selectedWeapons"),
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDiceLog(lines) {
  dom.diceLog.innerHTML = lines.map((x) => `<div>${escapeHtml(x)}</div>`).join("");
}

function getOccupationByName(name) {
  return runtime.occupations.find((o) => o.name === name) || null;
}

function getSkillBase(skill) {
  if (skill.key === "dodge") return Math.floor(state.attrs.DEX / 2);
  if (skill.key === "languageOwn") return state.attrs.EDU;
  return skill.base;
}

function getSkillTotal(skill) {
  return getSkillBase(skill) + normalizeInt(skill.occ) + normalizeInt(skill.interest);
}

function getSelectedOccupationSkillSet() {
  const set = new Set(state.occupation.mandatoryKeys || []);
  (state.occupation.choiceGroups || []).forEach((g) => (state.occupation.groupPicks[g.id] || []).forEach((k) => set.add(k)));
  (state.occupation.freePicks || []).forEach((k) => set.add(k));
  return set;
}

function evalFormula(formula) {
  const parsed = normalizeFormula(formula)
    .replaceAll("EDU", String(state.attrs.EDU))
    .replaceAll("STR", String(state.attrs.STR))
    .replaceAll("DEX", String(state.attrs.DEX))
    .replaceAll("APP", String(state.attrs.APP))
    .replaceAll("POW", String(state.attrs.POW))
    .replaceAll("MAX", "Math.max")
    .replaceAll("MIN", "Math.min");
  if (!/^[0-9+\-*/().,A-Za-z]+$/.test(parsed)) return 0;
  const words = parsed.match(/[A-Za-z_]+/g) || [];
  if (words.some((w) => !["Math", "max", "min"].includes(w))) return 0;
  try {
    const v = Function(`"use strict";return (${parsed});`)();
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function recalcPools() {
  state.pools.occupation = Math.max(0, Math.floor(evalFormula(state.occupation.formula || "EDU*4")));
  state.pools.interest = state.attrs.INT * 2;
  state.pools.occSpent = state.skills.reduce((acc, s) => acc + normalizeInt(s.occ), 0);
  state.pools.intSpent = state.skills.reduce((acc, s) => acc + normalizeInt(s.interest), 0);
}

function applyDerived() {
  state.attrs.HP = Math.floor((state.attrs.CON + state.attrs.SIZ) / 10);
  state.attrs.MP = Math.floor(state.attrs.POW / 5);
  state.attrs.SAN = state.attrs.POW;
  let mov = 8;
  if (state.attrs.STR < state.attrs.SIZ && state.attrs.DEX < state.attrs.SIZ) mov = 7;
  if (state.attrs.STR > state.attrs.SIZ && state.attrs.DEX > state.attrs.SIZ) mov = 9;
  const age = normalizeInt(state.basic.age);
  if (age >= 40) mov -= 1;
  if (age >= 50) mov -= 1;
  if (age >= 60) mov -= 1;
  if (age >= 70) mov -= 1;
  if (age >= 80) mov -= 1;
  state.attrs.MOV = Math.max(1, mov);
  const t = state.attrs.STR + state.attrs.SIZ;
  if (t <= 64) [state.attrs.DB, state.attrs.Build] = ["-2", -2];
  else if (t <= 84) [state.attrs.DB, state.attrs.Build] = ["-1", -1];
  else if (t <= 124) [state.attrs.DB, state.attrs.Build] = ["0", 0];
  else if (t <= 164) [state.attrs.DB, state.attrs.Build] = ["1D4", 1];
  else if (t <= 204) [state.attrs.DB, state.attrs.Build] = ["1D6", 2];
  else [state.attrs.DB, state.attrs.Build] = ["2D6", 3];
}

function enforceSkillLimits() {
  recalcPools();
  let occUsed = 0;
  let intUsed = 0;
  for (const s of state.skills) {
    const max = Math.max(0, 99 - getSkillBase(s));
    s.occ = clamp(normalizeInt(s.occ), 0, max);
    s.interest = clamp(normalizeInt(s.interest), 0, max - s.occ);
    if (occUsed + s.occ > state.pools.occupation) s.occ = Math.max(0, state.pools.occupation - occUsed);
    if (intUsed + s.interest > state.pools.interest) s.interest = Math.max(0, state.pools.interest - intUsed);
    occUsed += s.occ;
    intUsed += s.interest;
  }
  recalcPools();
}

function roll(n, faces) {
  const detail = [];
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const p = Math.floor(Math.random() * faces) + 1;
    detail.push(p);
    sum += p;
  }
  return { detail, sum };
}

function rollAllAttrs() {
  const logs = [];
  ["STR", "CON", "POW", "DEX", "APP"].forEach((k) => {
    const r = roll(3, 6);
    state.attrs[k] = r.sum * 5;
    logs.push(`${k}: ${r.detail.join("+")} ×5 = ${state.attrs[k]}`);
  });
  ["SIZ", "INT", "EDU"].forEach((k) => {
    const r = roll(2, 6);
    state.attrs[k] = (r.sum + 6) * 5;
    logs.push(`${k}: (${r.detail.join("+")}+6) ×5 = ${state.attrs[k]}`);
  });
  const luck = roll(3, 6);
  state.attrs.Luck = luck.sum * 5;
  logs.push(`Luck: ${luck.detail.join("+")} ×5 = ${state.attrs.Luck}`);
  applyDerived();
  enforceSkillLimits();
  renderAll();
  setDiceLog(logs);
  saveState();
}

function applyOccupationToState(occ, clearOccPoints) {
  state.occupation.selectedName = occ.name;
  state.occupation.previewName = occ.name;
  state.occupation.formula = occ.formula;
  state.occupation.skillText = occ.skillText;
  state.occupation.mandatoryKeys = [...occ.plan.mandatoryKeys];
  state.occupation.choiceGroups = [...occ.plan.choiceGroups];
  state.occupation.groupPicks = {};
  state.occupation.freePickCount = occ.plan.freePickCount;
  state.occupation.freePicks = [];
  state.basic.occupation = occ.name;
  if (clearOccPoints) state.skills.forEach((s) => (s.occ = 0));
}

function chooseOccupation(name) {
  const next = getOccupationByName(name);
  if (!next) return;
  const switching = state.occupation.selectedName && state.occupation.selectedName !== next.name;
  let clearOccPoints = true;
  if (switching && state.pools.occSpent > 0) {
    clearOccPoints = confirm(
      `你当前已有 ${state.pools.occSpent} 点职业点。\n点击“确定”：清空职业点后切换职业。\n点击“取消”：保留当前加点并切换（可能出现规则警告）。`,
    );
  }
  applyOccupationToState(next, clearOccPoints);
  enforceSkillLimits();
  renderAll();
  saveState();
}

function getSkillRuleWarnings() {
  const warnings = [];
  if (!state.occupation.selectedName) warnings.push("尚未选择职业。");
  (state.occupation.choiceGroups || []).forEach((g) => {
    const selected = (state.occupation.groupPicks[g.id] || []).length;
    if (selected < g.choose) warnings.push(`职业可选组“${g.label}”未选满（${selected}/${g.choose}）。`);
  });
  if ((state.occupation.freePickCount || 0) > (state.occupation.freePicks || []).length) {
    warnings.push(
      `职业自选技能未选满（${(state.occupation.freePicks || []).length}/${state.occupation.freePickCount}）。`,
    );
  }
  const occSet = getSelectedOccupationSkillSet();
  const outOfRule = state.skills.filter((s) => s.occ > 0 && !occSet.has(s.key)).length;
  if (outOfRule > 0) warnings.push(`有 ${outOfRule} 项技能使用了职业点但不在当前职业技能中。`);
  if (state.pools.occSpent > state.pools.occupation) warnings.push("职业点超出上限。");
  if (state.pools.intSpent > state.pools.interest) warnings.push("兴趣点超出上限。");
  return warnings;
}

function renderStage() {
  for (let i = 0; i < STAGES.length; i += 1) document.getElementById(`stage${i}`).classList.toggle("active", i === state.stage);
  const current = STAGES[state.stage];
  dom.stageLabel.textContent = current.label;
  dom.stageTitle.textContent = current.title;
  dom.stageGoal.textContent = current.goal;
  dom.progressFill.style.width = `${((state.stage + 1) / STAGES.length) * 100}%`;
  dom.prevBtn.disabled = state.stage === 0;
  dom.nextBtn.textContent = state.stage === STAGES.length - 1 ? "完成" : "下一步";
  dom.stepPills.innerHTML = STAGES.map((s, i) => `<button class="step-pill ${i === state.stage ? "active" : ""}" data-goto="${i}">${s.label} · ${s.title}</button>`).join("");
}

function renderOccupationGrid() {
  const terms = getExpandedOccupationSearchTerms(state.occupationSearch);
  const list = runtime.occupations.filter((o) => occupationMatchesQuery(o, terms));
  if (dom.occupationCount) {
    const source = `职业来源：${runtime.occupationSource || "内置示例"}`;
    dom.occupationCount.textContent = `${source} · 显示 ${list.length} / ${runtime.occupations.length} 个职业`;
  }
  if (!list.length) {
    dom.occupationGrid.innerHTML = `<div class="occupation-empty">没有找到匹配职业。可尝试：警察、医生、记者、律师，或清空搜索查看全部。</div>`;
    return;
  }
  dom.occupationGrid.innerHTML = list
    .map(
      (occ) => `<article class="occupation-card ${state.occupation.previewName === occ.name ? "active" : ""}" data-occ-card="${escapeHtml(occ.name)}">
        <div class="occupation-card-head">
          <h5>${escapeHtml(occ.name)}</h5>
          ${state.occupation.selectedName === occ.name ? '<span class="chip">已选</span>' : ""}
        </div>
        <p>职业点公式：${escapeHtml(occ.formula)}</p>
        <p>关键技能：${occ.keySkillCount}</p>
        <button class="btn occupation-pick-btn" type="button" data-occ-choose="${escapeHtml(occ.name)}">${state.occupation.selectedName === occ.name ? "继续使用该职业" : "选择该职业"}</button>
      </article>`,
    )
    .join("");
}

function renderOccupationDetail() {
  const occ = getOccupationByName(state.occupation.previewName || state.occupation.selectedName);
  if (!occ) {
    dom.occupationDetailTitle.textContent = "未选择职业";
    dom.occupationDetailFormula.textContent = "职业点公式：-";
    dom.occupationDetailText.textContent = "点击左侧职业卡片查看详情。";
    dom.occupationDetailMandatory.innerHTML = "";
    dom.occupationDetailChoices.innerHTML = "";
    dom.occupationDetailFree.innerHTML = "";
    return;
  }
  dom.occupationDetailTitle.textContent = occ.name;
  dom.occupationDetailFormula.textContent = `职业点公式：${occ.formula}`;
  dom.occupationDetailText.textContent = occ.skillText || "无技能文本。";
  dom.occupationDetailMandatory.innerHTML = occ.plan.mandatoryKeys
    .map((key) => {
      const s = SKILL_DEFS.find((x) => x.key === key);
      return s ? `<span class="chip">必选 ${escapeHtml(s.name)}</span>` : "";
    })
    .join("");
  dom.occupationDetailChoices.innerHTML = occ.plan.choiceGroups
    .map((g) => `<div class="choice-card"><div class="choice-title">${g.label}</div><div class="muted">${g.options.map((k) => SKILL_DEFS.find((s) => s.key === k)?.name || k).join(" / ")}</div></div>`)
    .join("");
  dom.occupationDetailFree.innerHTML =
    occ.plan.freePickCount > 0
      ? `<div class="choice-card"><div class="choice-title">自选 ${occ.plan.freePickCount} 项</div></div>`
      : "";
}

function renderOccupationRulesInStage2() {
  if (!state.occupation.selectedName) {
    dom.occupationRuleHint.textContent = "未选择职业。请回到序章职业图鉴选择。";
    dom.occupationPinned.innerHTML = "";
    dom.occupationChoices.innerHTML = "";
    dom.occupationFreePicks.innerHTML = "";
    return;
  }
  dom.occupationRuleHint.textContent = `${state.occupation.selectedName}：${state.occupation.skillText || "已加载职业技能规则"}`;
  dom.occupationPinned.innerHTML = "";
  (state.occupation.mandatoryKeys || []).forEach((key) => {
    const s = SKILL_DEFS.find((x) => x.key === key);
    if (s) dom.occupationPinned.innerHTML += `<span class="chip">本职 ${escapeHtml(s.name)}</span>`;
  });
  (state.occupation.choiceGroups || []).forEach((g) => {
    (state.occupation.groupPicks[g.id] || []).forEach((key) => {
      const s = SKILL_DEFS.find((x) => x.key === key);
      if (s) dom.occupationPinned.innerHTML += `<span class="chip choice">已选 ${escapeHtml(s.name)}</span>`;
    });
  });
  (state.occupation.freePicks || []).forEach((key) => {
    const s = SKILL_DEFS.find((x) => x.key === key);
    if (s) dom.occupationPinned.innerHTML += `<span class="chip choice">自选 ${escapeHtml(s.name)}</span>`;
  });
  if (!dom.occupationPinned.innerHTML) dom.occupationPinned.innerHTML = `<span class="muted">暂无已选职业技能。</span>`;

  dom.occupationChoices.innerHTML = (state.occupation.choiceGroups || [])
    .map((g) => {
      const picks = new Set(state.occupation.groupPicks[g.id] || []);
      return `<div class="choice-card">
        <div class="choice-title">${g.label}（${picks.size}/${g.choose}）</div>
        <div class="choice-options">
          ${g.options
            .map((key) => {
              const s = SKILL_DEFS.find((x) => x.key === key);
              if (!s) return "";
              return `<button class="choice-tag ${picks.has(key) ? "active" : ""}" data-pick-group="${g.id}" data-pick-key="${key}" type="button">${escapeHtml(s.name)}</button>`;
            })
            .join("")}
        </div>
      </div>`;
    })
    .join("");

  const blocked = new Set(state.occupation.mandatoryKeys || []);
  (state.occupation.choiceGroups || []).forEach((g) => g.options.forEach((k) => blocked.add(k)));
  const freeSet = new Set(state.occupation.freePicks || []);
  dom.occupationFreePicks.innerHTML =
    state.occupation.freePickCount > 0
      ? `<div class="choice-card">
          <div class="choice-title">自选技能 ${state.occupation.freePickCount} 项（${freeSet.size}/${state.occupation.freePickCount}）</div>
          <div class="choice-options">
            ${SKILL_DEFS.filter((s) => !blocked.has(s.key))
              .map((s) => `<button class="choice-tag ${freeSet.has(s.key) ? "active" : ""}" data-pick-free="1" data-pick-key="${s.key}" type="button">${escapeHtml(s.name)}</button>`)
              .join("")}
          </div>
        </div>`
      : "";
}

function renderSkillWarnings() {
  const warnings = getSkillRuleWarnings();
  if (warnings.length === 0) {
    dom.skillRuleWarning.classList.add("ok");
    dom.skillRuleWarning.innerHTML = "规则状态正常，可以继续。";
    return;
  }
  dom.skillRuleWarning.classList.remove("ok");
  dom.skillRuleWarning.innerHTML = warnings.map((w) => `• ${escapeHtml(w)}`).join("<br />");
}

function renderAttrInputs() {
  dom.attrInputs.innerHTML = ATTR_ORDER.map((a) => `<div class="attr-card"><div class="attr-name"><span>${a}</span><span>%</span></div><input type="number" min="1" max="99" value="${state.attrs[a]}" data-attr="${a}" /></div>`).join("");
}

function renderDerived() {
  const rows = [
    ["生命值 HP", state.attrs.HP],
    ["魔法值 MP", state.attrs.MP],
    ["理智 SAN", state.attrs.SAN],
    ["移动 MOV", state.attrs.MOV],
    ["伤害加值 DB", state.attrs.DB],
    ["体格 Build", state.attrs.Build],
  ];
  dom.derivedStats.innerHTML = rows.map(([k, v]) => `<div class="derived-pill"><strong>${k}</strong><br />${v}</div>`).join("");
}

function renderPools() {
  dom.occFormula.value = state.occupation.formula || "EDU*4";
  dom.occPool.textContent = String(state.pools.occupation);
  dom.intPool.textContent = String(state.pools.interest);
  dom.occSpent.textContent = `已用 ${state.pools.occSpent}`;
  dom.intSpent.textContent = `已用 ${state.pools.intSpent}`;
  dom.occSpent.style.color = state.pools.occSpent > state.pools.occupation ? "var(--danger)" : "var(--accent-2)";
  dom.intSpent.style.color = state.pools.intSpent > state.pools.interest ? "var(--danger)" : "var(--accent-2)";
}

function renderSkillRows() {
  const occSet = getSelectedOccupationSkillSet();
  const sorted = [...state.skills].sort((a, b) => {
    const pa = occSet.has(a.key) ? 0 : 1;
    const pb = occSet.has(b.key) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (SKILL_ORDER.get(a.key) || 9999) - (SKILL_ORDER.get(b.key) || 9999);
  });
  dom.skillRows.innerHTML = sorted
    .map((s) => {
      const isOcc = occSet.has(s.key);
      const invalidOcc = s.occ > 0 && !isOcc;
      const base = getSkillBase(s);
      const total = getSkillTotal(s);
      const bg = invalidOcc ? "rgba(214,100,100,0.12)" : isOcc ? "rgba(244,201,107,0.08)" : "transparent";
      return `<tr style="background:${bg}">
        <td>${isOcc ? "★ " : ""}${escapeHtml(s.name)}</td>
        <td>${base}</td>
        <td><input type="number" min="0" max="99" value="${s.occ}" data-skill="${s.key}" data-type="occ" /></td>
        <td><input type="number" min="0" max="99" value="${s.interest}" data-skill="${s.key}" data-type="interest" /></td>
        <td style="color:${total > 99 ? "var(--danger)" : "var(--ok)"}">${total}</td>
      </tr>`;
    })
    .join("");
}

function renderWeapons() {
  const q = normalizeText(state.weaponSearch);
  const list = runtime.weapons.filter((w) => !q || normalizeText(`${w.name} ${w.type} ${w.skill}`).includes(q));
  dom.weaponCards.innerHTML = list
    .map(
      (w) => `<article class="weapon-card" draggable="true" data-weapon="${escapeHtml(w.id)}">
        <div class="weapon-name">${escapeHtml(w.name)}</div>
        <div class="weapon-meta">${escapeHtml(w.skill || "-")} | ${escapeHtml(w.damage || "-")}</div>
        <div class="weapon-meta">射程 ${escapeHtml(w.range || "-")} ${w.type ? `| ${escapeHtml(w.type)}` : ""}</div>
      </article>`,
    )
    .join("");
  dom.selectedWeapons.innerHTML = state.selectedWeapons.length
    ? state.selectedWeapons
        .map(
          (w, i) => `<div class="selected-weapon">
          <div class="selected-weapon-info">
            <strong>${escapeHtml(w.name)}</strong> × ${w.count || 1}<br />
            ${escapeHtml(w.skill || "-")} | ${escapeHtml(w.damage || "-")} | 射程: ${escapeHtml(w.range || "-")} ${w.type ? `| ${escapeHtml(w.type)}` : ""}
          </div>
          <button class="btn" data-remove-weapon="${i}">移除</button>
        </div>`,
        )
        .join("")
    : `<div class="muted">当前没有已装备武器。</div>`;
}

function renderPreview() {
  const top = [...state.skills]
    .map((s) => ({ name: s.name, total: getSkillTotal(s) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const weapons = state.selectedWeapons.map((w) => `${w.name}×${w.count || 1}`).join("、") || "-";
  const attrs = ATTR_ORDER.map((a) => `${a}:${state.attrs[a]}`).join(" | ");
  dom.sheetPreview.innerHTML = `
    <h4>调查员总览（精简）</h4>
    <div class="preview-grid">
      <div class="preview-line"><strong>姓名</strong><br />${escapeHtml(state.basic.name || "-")}</div>
      <div class="preview-line"><strong>职业</strong><br />${escapeHtml(state.basic.occupation || "-")}</div>
      <div class="preview-line"><strong>时代</strong><br />${escapeHtml(state.basic.era || "-")}</div>
      <div class="preview-line"><strong>HP / MP / SAN</strong><br />${state.attrs.HP} / ${state.attrs.MP} / ${state.attrs.SAN}</div>
      <div class="preview-line"><strong>MOV / DB / Build</strong><br />${state.attrs.MOV} / ${state.attrs.DB} / ${state.attrs.Build}</div>
      <div class="preview-line"><strong>武器</strong><br />${escapeHtml(weapons)}</div>
    </div>
    <div class="preview-section"><h5>核心属性</h5><div class="preview-line">${attrs}</div></div>
    <div class="preview-section"><h5>技能（Top12）</h5><div class="preview-skills">${top.map((s) => `<div class="preview-skill">${escapeHtml(s.name)}：${s.total}</div>`).join("")}</div></div>
  `;
}

function renderBaseFields() {
  document.getElementById("name").value = state.basic.name;
  document.getElementById("age").value = state.basic.age;
  document.getElementById("gender").value = state.basic.gender;
  document.getElementById("era").value = state.basic.era;
  document.getElementById("birthplace").value = state.basic.birthplace;
  document.getElementById("residence").value = state.basic.residence;
  document.getElementById("archetype").value = state.basic.archetype;
  dom.occupationCurrent.value = state.basic.occupation || "";
  document.getElementById("desc").value = state.background.desc;
  document.getElementById("belief").value = state.background.belief;
  document.getElementById("importantPerson").value = state.background.importantPerson;
  document.getElementById("importantPlace").value = state.background.importantPlace;
  document.getElementById("treasure").value = state.background.treasure;
  document.getElementById("traits").value = state.background.traits;
  document.getElementById("cash").value = state.background.cash;
  document.getElementById("assets").value = state.background.assets;
  document.getElementById("items").value = state.background.items;
  dom.occupationSearch.value = state.occupationSearch || "";
  dom.weaponSearch.value = state.weaponSearch || "";
}

function renderAll() {
  renderStage();
  renderBaseFields();
  renderOccupationGrid();
  renderOccupationDetail();
  renderAttrInputs();
  renderDerived();
  renderOccupationRulesInStage2();
  renderSkillWarnings();
  renderPools();
  renderSkillRows();
  renderWeapons();
  renderPreview();
}

function toggleGroupPick(groupId, key) {
  const group = (state.occupation.choiceGroups || []).find((g) => g.id === groupId);
  if (!group) return;
  const picks = new Set(state.occupation.groupPicks[groupId] || []);
  if (picks.has(key)) picks.delete(key);
  else {
    if (picks.size >= group.choose) return;
    picks.add(key);
  }
  state.occupation.groupPicks[groupId] = Array.from(picks);
  renderAll();
  saveState();
}

function toggleFreePick(key) {
  const picks = new Set(state.occupation.freePicks || []);
  if (picks.has(key)) picks.delete(key);
  else {
    if (picks.size >= (state.occupation.freePickCount || 0)) return;
    picks.add(key);
  }
  state.occupation.freePicks = Array.from(picks);
  renderAll();
  saveState();
}

function bindEvents() {
  dom.stepPills.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const goto = target.dataset.goto;
    if (goto === undefined) return;
    state.stage = clamp(normalizeInt(goto), 0, STAGES.length - 1);
    renderAll();
    saveState();
  });

  dom.prevBtn.addEventListener("click", () => {
    state.stage = clamp(state.stage - 1, 0, STAGES.length - 1);
    renderAll();
    saveState();
  });

  dom.nextBtn.addEventListener("click", () => {
    if (state.stage === 0 && (!state.basic.name.trim() || !state.basic.occupation.trim())) {
      alert("请先填写姓名并选择职业。");
      return;
    }
    if (state.stage === 2) {
      const warnings = getSkillRuleWarnings();
      if (warnings.length) alert(`提醒：\n${warnings.join("\n")}\n\n你仍可继续下一步。`);
    }
    state.stage = clamp(state.stage + 1, 0, STAGES.length - 1);
    renderAll();
    saveState();
  });

  dom.attrInputs.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.dataset.attr) return;
    state.attrs[target.dataset.attr] = clamp(normalizeInt(target.value), 1, 99);
    applyDerived();
    enforceSkillLimits();
    renderAll();
    saveState();
  });

  dom.skillRows.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const key = target.dataset.skill;
    const type = target.dataset.type;
    if (!key || !type) return;
    const skill = state.skills.find((x) => x.key === key);
    if (!skill) return;
    if (type === "occ") skill.occ = clamp(normalizeInt(target.value), 0, 99);
    else skill.interest = clamp(normalizeInt(target.value), 0, 99);
    enforceSkillLimits();
    renderAll();
    saveState();
  });

  dom.occupationSearch.addEventListener("input", () => {
    state.occupationSearch = dom.occupationSearch.value;
    renderOccupationGrid();
    saveState();
  });

  dom.occupationGrid.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const chooseBtn = target.closest("[data-occ-choose]");
    if (chooseBtn instanceof HTMLElement) {
      const name = chooseBtn.dataset.occChoose || "";
      if (name) chooseOccupation(name);
      return;
    }
    const card = target.closest("[data-occ-card]");
    if (!(card instanceof HTMLElement)) return;
    const name = card.dataset.occCard || "";
    state.occupation.previewName = name;
    renderOccupationGrid();
    renderOccupationDetail();
    saveState();
  });

  dom.chooseOccupationBtn.addEventListener("click", () => {
    const name = state.occupation.previewName || state.occupation.selectedName;
    if (!name) {
      alert("请先在左侧职业图鉴中选择一个职业。");
      return;
    }
    chooseOccupation(name);
  });

  dom.occFormula.addEventListener("change", () => {
    state.occupation.formula = normalizeFormula(dom.occFormula.value);
    enforceSkillLimits();
    renderAll();
    saveState();
  });

  dom.occupationChoices.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const groupId = target.dataset.pickGroup;
    const key = target.dataset.pickKey;
    if (!groupId || !key) return;
    toggleGroupPick(groupId, key);
  });

  dom.occupationFreePicks.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.dataset.pickFree) return;
    const key = target.dataset.pickKey;
    if (!key) return;
    toggleFreePick(key);
  });

  [
    ["name", "name"],
    ["age", "age"],
    ["gender", "gender"],
    ["era", "era"],
    ["birthplace", "birthplace"],
    ["residence", "residence"],
    ["archetype", "archetype"],
  ].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      const value = e.target.value;
      state.basic[key] = id === "age" ? clamp(normalizeInt(value), 15, 90) : value;
      applyDerived();
      renderAll();
      saveState();
    });
  });

  [
    ["desc", "desc"],
    ["belief", "belief"],
    ["importantPerson", "importantPerson"],
    ["importantPlace", "importantPlace"],
    ["treasure", "treasure"],
    ["traits", "traits"],
    ["cash", "cash"],
    ["assets", "assets"],
    ["items", "items"],
  ].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      state.background[key] = e.target.value;
      renderPreview();
      saveState();
    });
  });

  dom.weaponSearch.addEventListener("input", () => {
    state.weaponSearch = dom.weaponSearch.value;
    renderWeapons();
    saveState();
  });

  dom.weaponCards.addEventListener("dragstart", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".weapon-card");
    if (!(card instanceof HTMLElement)) return;
    if (!e.dataTransfer) return;
    e.dataTransfer.setData("text/plain", card.dataset.weapon || "");
    e.dataTransfer.effectAllowed = "copy";
    card.classList.add("dragging");
  });

  dom.weaponCards.addEventListener("dragend", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".weapon-card");
    if (card) card.classList.remove("dragging");
  });

  dom.weaponDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dom.weaponDropZone.classList.add("over");
  });

  dom.weaponDropZone.addEventListener("dragleave", () => dom.weaponDropZone.classList.remove("over"));

  dom.weaponDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dom.weaponDropZone.classList.remove("over");
    const id = e.dataTransfer?.getData("text/plain");
    const weapon = runtime.weapons.find((w) => w.id === id);
    if (!weapon) return;
    const existing = state.selectedWeapons.find((w) => w.id === weapon.id);
    if (existing) existing.count = normalizeInt(existing.count || 1) + 1;
    else state.selectedWeapons.push({ ...weapon, count: 1 });
    renderWeapons();
    renderPreview();
    saveState();
  });

  dom.selectedWeapons.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const idxRaw = target.dataset.removeWeapon;
    if (idxRaw === undefined) return;
    const idx = normalizeInt(idxRaw);
    const w = state.selectedWeapons[idx];
    if (!w) return;
    if ((w.count || 1) > 1) w.count -= 1;
    else state.selectedWeapons.splice(idx, 1);
    renderWeapons();
    renderPreview();
    saveState();
  });

  document.getElementById("rollAllBtn").addEventListener("click", rollAllAttrs);

  document.getElementById("quickAssignBtn").addEventListener("click", () => {
    const vals = [80, 70, 60, 60, 50, 50, 50, 40].sort(() => Math.random() - 0.5);
    ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].forEach((k, i) => (state.attrs[k] = vals[i]));
    state.attrs.Luck = roll(3, 6).sum * 5;
    applyDerived();
    enforceSkillLimits();
    setDiceLog([`快速分配：${vals.join(", ")}`, `幸运：${state.attrs.Luck}`]);
    renderAll();
    saveState();
  });

  document.getElementById("rerollLuckBtn").addEventListener("click", () => {
    const r = roll(3, 6);
    state.attrs.Luck = r.sum * 5;
    renderAll();
    setDiceLog([`幸运重掷：${r.detail.join("+")} ×5 = ${state.attrs.Luck}`]);
    saveState();
  });

  document.getElementById("clearAllocBtn").addEventListener("click", () => {
    state.skills.forEach((s) => {
      s.occ = 0;
      s.interest = 0;
    });
    enforceSkillLimits();
    renderAll();
    saveState();
  });

  document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);
  document.getElementById("exportXlsxBtn").addEventListener("click", exportXlsx);

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("确认清空当前角色并重置为默认值吗？")) return;
    state = createInitialState();
    applyDerived();
    enforceSkillLimits();
    renderAll();
    setDiceLog(["已重置角色。"]);
    saveState();
  });
}

function buildPdfSummaryElement() {
  const top = [...state.skills]
    .map((s) => ({ name: s.name, total: getSkillTotal(s) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const wrapper = document.createElement("div");
  wrapper.style.width = "760px";
  wrapper.style.padding = "20px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#1b2329";
  wrapper.style.fontFamily = "Segoe UI, Microsoft YaHei, sans-serif";
  wrapper.innerHTML = `
    <h2 style="margin:0 0 8px">CoC7 调查员简表</h2>
    <p style="margin:0 0 10px">姓名：${escapeHtml(state.basic.name || "-")} ｜ 职业：${escapeHtml(state.basic.occupation || "-")} ｜ 时代：${escapeHtml(state.basic.era || "-")}</p>
    <p style="margin:0 0 10px">属性：${ATTR_ORDER.map((a) => `${a} ${state.attrs[a]}`).join(" / ")}</p>
    <p style="margin:0 0 10px">HP ${state.attrs.HP} ｜ MP ${state.attrs.MP} ｜ SAN ${state.attrs.SAN} ｜ MOV ${state.attrs.MOV} ｜ DB ${state.attrs.DB}</p>
    <p style="margin:0 0 10px">武器：${escapeHtml(state.selectedWeapons.map((w) => `${w.name}×${w.count || 1}`).join("、") || "-")}</p>
    <p style="margin:0 0 6px"><strong>技能 Top8</strong></p>
    <ul style="margin:0;padding-left:18px">
      ${top.map((s) => `<li>${escapeHtml(s.name)}：${s.total}</li>`).join("")}
    </ul>
  `;
  return wrapper;
}

async function exportPdf() {
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF 依赖未加载，请检查网络后重试。");
    return;
  }
  const summary = buildPdfSummaryElement();
  document.body.appendChild(summary);
  const canvas = await window.html2canvas(summary, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  summary.remove();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth() - 16;
  const h = (canvas.height * pageW) / canvas.width;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 8, 8, pageW, Math.min(h, pdf.internal.pageSize.getHeight() - 16), undefined, "FAST");
  pdf.save(`${(state.basic.name || "调查员").trim()}-CoC7简表.pdf`);
}

async function loadTemplateWorkbook() {
  if (cachedWorkbook) return cachedWorkbook;
  for (const url of [TEMPLATE_FILE, encodeURI(TEMPLATE_FILE)]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      cachedWorkbook = XLSX.read(await res.arrayBuffer(), { type: "array" });
      return cachedWorkbook;
    } catch {
      continue;
    }
  }
  return null;
}

function getSheetCellText(sheet, colIndex, rowIndex) {
  if (!sheet) return "";
  const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
  const cell = sheet[addr];
  if (!cell) return "";
  if (cell.w !== undefined && cell.w !== null && String(cell.w).trim()) return String(cell.w).trim();
  if (cell.v !== undefined && cell.v !== null && String(cell.v).trim()) return String(cell.v).trim();
  return "";
}

function getSheetFormulaOrText(sheet, colIndex, rowIndex) {
  if (!sheet) return "";
  const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
  const cell = sheet[addr];
  if (!cell) return "";
  if (cell.f !== undefined && cell.f !== null && String(cell.f).trim()) return String(cell.f).trim();
  if (cell.w !== undefined && cell.w !== null && String(cell.w).trim()) return String(cell.w).trim();
  if (cell.v !== undefined && cell.v !== null && String(cell.v).trim()) return String(cell.v).trim();
  return "";
}

function looksLikeOccupationHeader(name) {
  return /职业|列表|说明|标题|示例|模板|职业名称|自定义输入/i.test(String(name || ""));
}

function parseWorkbookOccupations(workbook) {
  const names = workbook.SheetNames || [];
  const occSheetName = names.find((n) => /职业|鑱屿笟/i.test(n)) || names[2];
  const sheet = workbook.Sheets[occSheetName];
  if (!sheet) return [];
  const ref = sheet["!ref"] || "A1:A1";
  const range = XLSX.utils.decode_range(ref);
  const result = [];
  const seen = new Set();
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const name = String(getSheetCellText(sheet, 1, r) || "").trim();
    if (!name || seen.has(name)) continue;
    if (name.length > 40) continue;
    if (looksLikeOccupationHeader(name)) continue;
    const formulaRaw = getSheetFormulaOrText(sheet, 5, r) || getSheetFormulaOrText(sheet, 4, r);
    const skillText = String(getSheetCellText(sheet, 6, r) || "").trim();
    let formula = normalizeFormula(formulaRaw);
    if (!/(EDU|STR|DEX|APP|POW|SIZ|INT|CON|MAX|MIN)/.test(formula)) formula = "EDU*4";
    result.push(normalizeOccupation({ name, formula, skillText }));
    seen.add(name);
  }
  return result;
}

function parseWorkbookWeapons(workbook) {
  const names = workbook.SheetNames || [];
  const weaponSheetName = names.find((n) => /武器|姝﹀櫒/i.test(n)) || names[9];
  const sheet = workbook.Sheets[weaponSheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const result = [];
  const seen = new Set();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const name = String(row[1] || "").trim();
    if (!name || seen.has(name) || /名称|武器/.test(name) || name.length > 64) continue;
    result.push({
      id: `w-${i}`,
      name,
      type: String(row[2] || "").trim(),
      skill: String(row[3] || row[2] || "").trim(),
      damage: String(row[4] || "").trim(),
      range: String(row[6] || row[7] || "").trim(),
    });
    seen.add(name);
  }
  return result;
}

async function loadLocalOccupationExtract() {
  try {
    const res = await fetch("./data/occupations.from_excel.json", { cache: "no-store" });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    const list = rows
      .map((row) =>
        normalizeOccupation({
          name: String(row.name || "").trim(),
          formula: String(row.formula_raw || row.formula_normalized || "EDU*4").trim(),
          skillText: String(row.skill_text || "").trim(),
        }),
      )
      .filter((x) => x.name && x.skillText);
    return list;
  } catch {
    return [];
  }
}

function setNamedCell(workbook, name, value) {
  const names = workbook.Workbook?.Names || [];
  const item = names.find((x) => x.Name === name);
  if (!item?.Ref) return;
  const m = String(item.Ref).match(/^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)/);
  if (!m) return;
  const ws = workbook.Sheets[(m[1] || m[2]).trim()];
  if (!ws) return;
  XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: `${m[3]}${m[4]}` });
}

function removeSheet(workbook, name) {
  if (!workbook.Sheets[name]) return;
  delete workbook.Sheets[name];
  workbook.SheetNames = workbook.SheetNames.filter((n) => n !== name);
}

async function exportXlsx() {
  if (!window.XLSX) {
    alert("Excel 依赖未加载，请检查网络后重试。");
    return;
  }
  let workbook = await loadTemplateWorkbook();
  if (!workbook) workbook = XLSX.utils.book_new();
  else {
    ["STR", "CON", "DEX", "APP", "POW", "SIZ", "INT", "EDU", "Luck", "MP"].forEach((k) =>
      setNamedCell(workbook, k, state.attrs[k]),
    );
  }
  ["导出数据", "技能数据", "武器数据"].forEach((n) => removeSheet(workbook, n));
  const dataRows = [
    ["字段", "值"],
    ["姓名", state.basic.name],
    ["职业", state.basic.occupation],
    ["职业公式", state.occupation.formula],
    ["时代", state.basic.era],
    ["HP", state.attrs.HP],
    ["MP", state.attrs.MP],
    ["SAN", state.attrs.SAN],
    ["MOV", state.attrs.MOV],
    ["DB", state.attrs.DB],
    ["Build", state.attrs.Build],
    ["背景", state.background.desc],
    ["装备清单", state.background.items],
  ];
  const occSet = getSelectedOccupationSkillSet();
  const skillRows = [["技能", "职业技能", "基础", "职业点", "兴趣点", "总值"]];
  state.skills.forEach((s) => skillRows.push([s.name, occSet.has(s.key) ? "是" : "", getSkillBase(s), s.occ, s.interest, getSkillTotal(s)]));
  const weaponRows = [["武器", "数量", "技能", "伤害", "射程", "类型"]];
  state.selectedWeapons.forEach((w) => weaponRows.push([w.name, w.count || 1, w.skill || "", w.damage || "", w.range || "", w.type || ""]));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataRows), "导出数据");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(skillRows), "技能数据");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(weaponRows), "武器数据");
  XLSX.writeFile(workbook, `${(state.basic.name || "调查员").trim()}-CoC7角色卡.xlsx`);
}

async function initRuntimeData() {
  try {
    const localOccs = await loadLocalOccupationExtract();
    if (localOccs.length) {
      runtime.occupations = localOccs;
      runtime.loadedFromWorkbook = true;
      runtime.occupationSource = "Excel 提取数据";
    }

    const workbook = await loadTemplateWorkbook();
    if (workbook) {
      if (!localOccs.length) {
        const occs = parseWorkbookOccupations(workbook);
        if (occs.length) {
          runtime.occupations = occs;
          runtime.loadedFromWorkbook = true;
          runtime.occupationSource = "Excel 职业表";
        }
      }
      const weapons = parseWorkbookWeapons(workbook);
      if (weapons.length) runtime.weapons = weapons;
      if (weapons.length && !runtime.loadedFromWorkbook) {
        runtime.loadedFromWorkbook = true;
        runtime.occupationSource = "Excel 职业表";
      }
    }

    if (state.occupation.selectedName) {
      const selected = getOccupationByName(state.occupation.selectedName);
      if (selected) applyOccupationToState(selected, false);
      else state.occupation.selectedName = "";
    }
    if (!state.occupation.previewName) state.occupation.previewName = state.occupation.selectedName || runtime.occupations[0]?.name || "";
    enforceSkillLimits();
    renderAll();
    saveState();
  } catch {
    // keep fallback data
  }
}

function init() {
  applyDerived();
  enforceSkillLimits();
  if (!state.occupation.previewName) state.occupation.previewName = state.occupation.selectedName || runtime.occupations[0]?.name || "";
  renderAll();
  bindEvents();
  setDiceLog(["欢迎来到建卡工坊。先在职业图鉴中浏览职业，再点击“选择该职业”。"]);
  initRuntimeData();
}

init();
