import { reactive } from 'vue';
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
    specialization: "",
    specializationChoice: "",
  }));
}

export function createInitialState() {
  return {
    stage: 0,
    basic: { name: "", age: 28, gender: "", occupation: "", era: "1920年代（经典）", birthplace: "", residence: "", archetype: "" },
    occupation: { selectedName: "", previewName: "", formula: "EDU*4", skillText: "", mandatoryRefs: [], choiceGroups: [], groupPicks: {}, freePickCount: 0, freePicks: [], creditRatingRange: null },
    attrs: { STR: 50, CON: 50, POW: 50, DEX: 50, APP: 50, SIZ: 50, INT: 50, EDU: 50, Luck: 50, HP: 10, MP: 10, SAN: 50, MOV: 8, DB: "0", Build: 0 },
    pools: { occupation: 0, interest: 0, occSpent: 0, intSpent: 0 },
    skills: makeInitialSkills(),
    meta: { ageAdjustmentSnapshot: null, ageAdjustmentAppliedAge: null },
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

export function useCoCLogic() {
  const state = reactive(createInitialState());
  const runtime = reactive({
    occupations: FALLBACK_OCCUPATIONS_RAW.map(normalizeOccupation),
    weapons: [...FALLBACK_WEAPONS],
    specializationOptions: { ...SKILL_SPECIALIZATION_OPTIONS },
    experiencePacks: [...FALLBACK_EXPERIENCE_PACKS],
    loadedFromWorkbook: false,
    occupationSource: "内置示例",
    weaponSource: "内置示例",
    experiencePackSource: "内置示例",
  });

  const methods = bindMethods(state, runtime);

  async function loadJson(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

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
    const merged = { ...SKILL_SPECIALIZATION_OPTIONS };
    Object.entries(rows).forEach(([key, values]) => {
      const options = Array.isArray(values)
        ? values.map((item) => {
          if (typeof item === 'string') return item;
          return String(item?.label || "").trim();
        }).filter(Boolean)
        : [];
      if (!options.length) return;
      merged[key] = Array.from(new Set([...(merged[key] || []), ...options]));
    });
    return merged;
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
    return {
      id: String(row?.id || `pack-${index + 1}`),
      name,
      sanityLoss: String(row?.sanityLoss || row?.sanity_loss || row?.sanity || "").trim(),
      initialAge: String(row?.initialAge || row?.initial_age || row?.age || "").trim(),
      skillGrowth: String(row?.skillGrowth || row?.skill_growth || row?.growth || "").trim(),
      backgroundAdd: String(row?.backgroundAdd || row?.background_add || row?.background || "").trim(),
      skills: String(row?.skills || row?.skillText || row?.skill_text || "").trim(),
      notes: String(row?.notes || row?.remark || row?.note || "").trim(),
    };
  }

  async function initRuntimeData() {
    const [occupationRows, weaponRows, specializationRows, experiencePackRows] = await Promise.all([
      loadJson("/data/occupations.from_excel.json"),
      loadJson("/data/weapons.from_excel.json"),
      loadJson("/data/skill-specializations.from_excel.json"),
      loadJson("/data/experience-packs.from_excel.json"),
    ]);

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

    const specializationOptions = normalizeSpecializationRows(specializationRows);
    if (specializationOptions) {
      runtime.specializationOptions = specializationOptions;
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
      if (occ) methods.applyOccupationToState(occ, false);
    } else if (runtime.occupations.length) {
      state.occupation.previewName = runtime.occupations[0].name;
    }
  }

  return { state, runtime, initRuntimeData, ...methods };
}
