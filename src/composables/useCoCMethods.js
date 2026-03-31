import { normalizeInt, normalizeFormula, roll } from './utils.js';
import { getAgeProfile, SPENDING_LEVEL_TABLE } from './coc7Rules.js';

function clampPenalty(value, max) {
  const n = Math.max(0, normalizeInt(value));
  return Math.min(n, max);
}

export function bindMethods(state, runtime) {
  const AGE_TRACKED_ATTR_KEYS = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'Luck'];

  function getOccupationRefKeys(ref) {
    if (!ref) return [];
    const keys = [
      ...(Array.isArray(ref.keys) ? ref.keys : []),
      ref.key,
    ].filter(Boolean);
    return Array.from(new Set(keys));
  }

  function collectSelectedRefs(mandatoryRefs = [], choiceGroups = [], groupPicks = {}) {
    const refs = [...mandatoryRefs];
    (choiceGroups || []).forEach((group) => {
      const pickedIds = new Set(groupPicks?.[group.id] || []);
      (group.options || []).forEach((option) => {
        if (pickedIds.has(option.id)) refs.push(option);
      });
    });
    return refs;
  }

  function collectSkillSetFromRefs(refs = []) {
    const set = new Set();
    refs.forEach((ref) => getOccupationRefKeys(ref).forEach((key) => set.add(key)));
    return set;
  }

  function getSkillSpecializationLabel(skill) {
    const selected = String(skill.specialization || '').trim();
    if (selected) return selected;
    const choice = String(skill.specializationChoice || '').trim();
    if (choice && choice !== '__custom__') return choice;
    return '';
  }

  function getSkillSpecializationBase(skill) {
    const label = getSkillSpecializationLabel(skill);
    if (!label) return null;
    const base = runtime.specializationDetails?.[skill.key]?.[label];
    return Number.isFinite(base) ? normalizeInt(base) : null;
  }

  function getSkillBase(skill) {
    if (skill.key === 'dodge') return Math.floor(normalizeInt(state.attrs.DEX) / 2);
    if (skill.key === 'languageOwn') return normalizeInt(state.attrs.EDU);
    const specializationBase = getSkillSpecializationBase(skill);
    if (specializationBase !== null) return specializationBase;
    return normalizeInt(skill.base);
  }

  function getSkillTotal(skill) {
    return (
      getSkillBase(skill) +
      Math.max(0, normalizeInt(skill.occ)) +
      Math.max(0, normalizeInt(skill.interest)) +
      Math.max(0, normalizeInt(skill.exp))
    );
  }

  function getSkillDisplayName(skill) {
    const spec = String(skill.specialization || '').trim();
    if (!spec) return skill.name;
    return `${skill.name}（${spec}）`;
  }

  function getAttrHalf(key) {
    return Math.floor(Math.max(0, normalizeInt(state.attrs[key])) / 2);
  }

  function getAttrFifth(key) {
    return Math.floor(Math.max(0, normalizeInt(state.attrs[key])) / 5);
  }

  function getAgeAdjustmentPreview() {
    const profile = getAgeProfile(state.basic.age);
    const lines = [];

    lines.push(`${profile.label}：${profile.title}`);
    lines.push(profile.summary);

    if (profile.educationChecks > 0) {
      lines.push(`教育成长检定：${profile.educationChecks} 次`);
      lines.push('教育成长检定结果需手动调整 EDU（当前不会自动执行成长检定）。');
    }
    if (profile.movPenalty > 0) {
      lines.push(`MOV -${profile.movPenalty}`);
    }
    if (profile.appPenalty > 0) {
      lines.push(`APP -${profile.appPenalty}`);
    }
    if (profile.manualPenalty?.total > 0) {
      lines.push(`${profile.manualPenalty.keys.join('/')} 合计 -${profile.manualPenalty.total}（由玩家手动分配）`);
    }
    if (profile.autoPenalty?.EDU > 0) {
      lines.push(`EDU -${profile.autoPenalty.EDU}`);
    }
    if (profile.luckRerolls > 0) {
      lines.push(`Luck 可额外重掷 ${profile.luckRerolls} 次并取最高。`);
    }

    if (profile.manualNotes?.length) {
      lines.push(...profile.manualNotes);
    }

    return lines;
  }

  function getSelectedOccupationRefs() {
    const refs = collectSelectedRefs(
      state.occupation.mandatoryRefs,
      state.occupation.choiceGroups,
      state.occupation.groupPicks,
    );
    (state.occupation.freePicks || []).forEach((key) => {
      refs.push({ key, keys: [key] });
    });
    refs.push({ key: 'creditRating', keys: ['creditRating'] });
    return refs;
  }

  function getSelectedExperienceRefs() {
    return collectSelectedRefs(
      state.experience.mandatoryRefs,
      state.experience.choiceGroups,
      state.experience.groupPicks,
    );
  }

  function getSelectedOccupationSkillSet() {
    return collectSkillSetFromRefs(getSelectedOccupationRefs());
  }

  function getSelectedExperienceSkillSet() {
    return collectSkillSetFromRefs(getSelectedExperienceRefs());
  }

  function getSkillRecommendedSpecializations(skillKey) {
    const labels = new Set();
    [...getSelectedOccupationRefs(), ...getSelectedExperienceRefs()].forEach((ref) => {
      if (!getOccupationRefKeys(ref).includes(skillKey)) return;
      const specialization = String(ref.specialization || '').trim();
      if (specialization) labels.add(specialization);
    });
    return Array.from(labels);
  }

  function toggleOccupationGroupPick(groupId, optionId) {
    const picks = new Set(state.occupation.groupPicks[groupId] || []);
    if (picks.has(optionId)) picks.delete(optionId);
    else picks.add(optionId);
    state.occupation.groupPicks[groupId] = Array.from(picks);
  }

  function toggleExperienceGroupPick(groupId, optionId) {
    const picks = new Set(state.experience.groupPicks[groupId] || []);
    if (picks.has(optionId)) picks.delete(optionId);
    else picks.add(optionId);
    state.experience.groupPicks[groupId] = Array.from(picks);
  }

  function toggleFreePick(key) {
    const picks = new Set(state.occupation.freePicks || []);
    if (picks.has(key)) picks.delete(key);
    else picks.add(key);
    state.occupation.freePicks = Array.from(picks);
  }

  function evalFormula(formula) {
    const parsed = normalizeFormula(formula)
      .replaceAll('EDU', String(normalizeInt(state.attrs.EDU)))
      .replaceAll('STR', String(normalizeInt(state.attrs.STR)))
      .replaceAll('CON', String(normalizeInt(state.attrs.CON)))
      .replaceAll('DEX', String(normalizeInt(state.attrs.DEX)))
      .replaceAll('APP', String(normalizeInt(state.attrs.APP)))
      .replaceAll('POW', String(normalizeInt(state.attrs.POW)))
      .replaceAll('SIZ', String(normalizeInt(state.attrs.SIZ)))
      .replaceAll('INT', String(normalizeInt(state.attrs.INT)))
      .replaceAll('MAX', 'Math.max')
      .replaceAll('MIN', 'Math.min');
    if (!/^[0-9+\-*/().,A-Za-z]+$/.test(parsed)) return 0;
    const words = parsed.match(/[A-Za-z_]+/g) || [];
    if (words.some((w) => !['Math', 'max', 'min'].includes(w))) return 0;
    try {
      const value = Function(`"use strict";return (${parsed});`)();
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  function getExperiencePoolTotal() {
    if (state.experience.pointMode === 'fixed') return Math.max(0, normalizeInt(state.experience.points));
    if (state.experience.pointMode === 'manual') return Math.max(0, normalizeInt(state.experience.manualPoints));
    return 0;
  }

  function getPoolSnapshot() {
    return {
      occupation: Math.max(0, Math.floor(evalFormula(state.occupation.formula || 'EDU*4'))),
      interest: Math.max(0, normalizeInt(state.attrs.INT) * 2),
      experience: getExperiencePoolTotal(),
      occSpent: state.skills.reduce((acc, skill) => acc + Math.max(0, normalizeInt(skill.occ)), 0),
      intSpent: state.skills.reduce((acc, skill) => acc + Math.max(0, normalizeInt(skill.interest)), 0),
      expSpent: state.skills.reduce((acc, skill) => acc + Math.max(0, normalizeInt(skill.exp)), 0),
    };
  }

  function recalcPools() {
    const snapshot = getPoolSnapshot();
    state.pools.occupation = snapshot.occupation;
    state.pools.interest = snapshot.interest;
    state.pools.experience = snapshot.experience;
    state.pools.occSpent = snapshot.occSpent;
    state.pools.intSpent = snapshot.intSpent;
    state.pools.expSpent = snapshot.expSpent;
  }

  function applyDerived() {
    const str = normalizeInt(state.attrs.STR);
    const con = normalizeInt(state.attrs.CON);
    const pow = normalizeInt(state.attrs.POW);
    const dex = normalizeInt(state.attrs.DEX);
    const siz = normalizeInt(state.attrs.SIZ);
    const age = normalizeInt(state.basic.age);

    state.attrs.HP = Math.floor((con + siz) / 10);
    state.attrs.MP = Math.floor(pow / 5);
    state.attrs.SAN = pow;

    let mov = 8;
    if (str < siz && dex < siz) mov = 7;
    if (str > siz && dex > siz) mov = 9;

    if (age >= 40) mov -= 1;
    if (age >= 50) mov -= 1;
    if (age >= 60) mov -= 1;
    if (age >= 70) mov -= 1;
    if (age >= 80) mov -= 1;

    state.attrs.MOV = Math.max(1, mov);

    const total = str + siz;
    if (total <= 64) {
      state.attrs.DB = '-2';
      state.attrs.Build = -2;
    } else if (total <= 84) {
      state.attrs.DB = '-1';
      state.attrs.Build = -1;
    } else if (total <= 124) {
      state.attrs.DB = '0';
      state.attrs.Build = 0;
    } else if (total <= 164) {
      state.attrs.DB = '1D4';
      state.attrs.Build = 1;
    } else if (total <= 204) {
      state.attrs.DB = '1D6';
      state.attrs.Build = 2;
    } else {
      state.attrs.DB = '2D6';
      state.attrs.Build = 3;
    }
  }

  function enforceSkillLimits() {
    for (const skill of state.skills) {
      skill.occ = Math.max(0, normalizeInt(skill.occ));
      skill.interest = Math.max(0, normalizeInt(skill.interest));
      skill.exp = Math.max(0, normalizeInt(skill.exp));
    }
    recalcPools();
  }

  function getSkillRuleWarnings() {
    const snapshot = getPoolSnapshot();
    const occSkillSet = getSelectedOccupationSkillSet();
    const expSkillSet = getSelectedExperienceSkillSet();
    const selectedExperiencePack = getSelectedExperiencePack();
    const bySkill = {};
    const summary = [];

    for (const skill of state.skills) {
      const issues = [];
      const occ = Math.max(0, normalizeInt(skill.occ));
      const interest = Math.max(0, normalizeInt(skill.interest));
      const exp = Math.max(0, normalizeInt(skill.exp));
      const total = getSkillBase(skill) + occ + interest + exp;

      if (occ > 0 && occSkillSet.size > 0 && !occSkillSet.has(skill.key)) {
        issues.push('职业点分配到了非职业技能');
      }
      if (skill.key === 'creditRating' && interest > 0) {
        issues.push('兴趣点不应加在信用评级上');
      }
      if (exp > 0 && !selectedExperiencePack) {
        issues.push('未选择经历包，但分配了经历包点');
      } else if (
        exp > 0 &&
        selectedExperiencePack &&
        !state.experience.allowAnySkill &&
        expSkillSet.size > 0 &&
        !expSkillSet.has(skill.key)
      ) {
        issues.push('经历包点分配到了未被经历包允许的技能');
      }
      if (total > 99) {
        issues.push(`总值 ${total} 超过 99`);
      }

      if (issues.length) bySkill[skill.key] = issues;
    }

    (state.occupation.choiceGroups || []).forEach((group) => {
      const selected = (state.occupation.groupPicks[group.id] || []).length;
      if (selected !== group.choose) {
        summary.push(`职业可选组“${group.label}”应选 ${group.choose} 项，当前 ${selected} 项`);
      }
    });

    if ((state.occupation.freePickCount || 0) !== (state.occupation.freePicks || []).length) {
      summary.push(`职业自选技能应选 ${state.occupation.freePickCount || 0} 项，当前 ${(state.occupation.freePicks || []).length} 项`);
    }

    (state.experience.choiceGroups || []).forEach((group) => {
      const selected = (state.experience.groupPicks[group.id] || []).length;
      if (selected !== group.choose) {
        summary.push(`经历包可选组“${group.label}”应选 ${group.choose} 项，当前 ${selected} 项`);
      }
    });

    if (snapshot.occSpent > snapshot.occupation) {
      summary.push(`职业技能点超出 ${snapshot.occSpent - snapshot.occupation} 点`);
    }
    if (snapshot.intSpent > snapshot.interest) {
      summary.push(`兴趣技能点超出 ${snapshot.intSpent - snapshot.interest} 点`);
    }
    if (snapshot.expSpent > snapshot.experience) {
      summary.push(`经历包技能点超出 ${snapshot.expSpent - snapshot.experience} 点`);
    }

    if (selectedExperiencePack && state.experience.ageMin > 0 && normalizeInt(state.basic.age) < state.experience.ageMin) {
      summary.push(`经历包“${selectedExperiencePack.name}”建议年龄至少 ${state.experience.ageMin} 岁，当前 ${normalizeInt(state.basic.age)} 岁`);
    }

    if (!selectedExperiencePack && snapshot.expSpent > 0) {
      summary.push('未选择经历包，但已有经历包点分配');
    }

    if (
      selectedExperiencePack &&
      !state.experience.allowAnySkill &&
      expSkillSet.size === 0 &&
      snapshot.expSpent > 0
    ) {
      summary.push('当前经历包未解析出可分配技能，请检查经历包数据');
    }

    const creditSkill = state.skills.find((skill) => skill.key === 'creditRating');
    const creditTotal = creditSkill ? getSkillTotal(creditSkill) : 0;
    const creditRange = state.occupation.creditRatingRange;
    if (creditRange && (creditTotal < creditRange.min || creditTotal > creditRange.max)) {
      summary.push(`信用评级应在 ${creditRange.min}-${creditRange.max}，当前 ${creditTotal}`);
    }

    return {
      hasWarnings: summary.length > 0 || Object.keys(bySkill).length > 0,
      summary,
      bySkill,
    };
  }

  function rollAllAttrs() {
    ['STR', 'CON', 'POW', 'DEX', 'APP'].forEach((key) => {
      state.attrs[key] = roll(3, 6).sum * 5;
    });
    ['SIZ', 'INT', 'EDU'].forEach((key) => {
      state.attrs[key] = (roll(2, 6).sum + 6) * 5;
    });
    state.attrs.Luck = roll(3, 6).sum * 5;
    clearAgeAdjustment();
    applyDerived();
    enforceSkillLimits();
  }

  function getOccupationByName(name) {
    return runtime.occupations.find((occupation) => occupation.name === name) || null;
  }

  function buildPreservedGroupPicks(choiceGroups, previousPicks) {
    const nextPicks = {};
    (choiceGroups || []).forEach((group) => {
      const validIds = new Set((group.options || []).map((option) => option.id));
      const kept = (previousPicks?.[group.id] || []).filter((id) => validIds.has(id));
      if (kept.length) nextPicks[group.id] = kept;
    });
    return nextPicks;
  }

  function buildPreservedFreePicks(mandatoryRefs, choiceGroups, previousFreePicks) {
    const blocked = new Set();
    (mandatoryRefs || []).forEach((ref) => getOccupationRefKeys(ref).forEach((key) => blocked.add(key)));
    (choiceGroups || []).forEach((group) => {
      (group.options || []).forEach((ref) => getOccupationRefKeys(ref).forEach((key) => blocked.add(key)));
    });
    return Array.from(
      new Set((previousFreePicks || []).filter((key) => key && !blocked.has(key))),
    );
  }

  function applyOccupationToState(occ, clearOccPoints, options = {}) {
    const preserveSelections = Boolean(options.preserveSelections);
    const mandatoryRefs = [...(occ.plan?.mandatoryRefs || [])];
    const choiceGroups = [...(occ.plan?.choiceGroups || [])];
    state.occupation.selectedName = occ.name;
    state.occupation.previewName = occ.name;
    state.occupation.formula = occ.formula;
    state.occupation.skillText = occ.skillText;
    state.occupation.mandatoryRefs = mandatoryRefs;
    state.occupation.choiceGroups = choiceGroups;
    state.occupation.groupPicks = preserveSelections
      ? buildPreservedGroupPicks(choiceGroups, state.occupation.groupPicks)
      : {};
    state.occupation.freePickCount = occ.plan?.freePickCount || 0;
    state.occupation.freePicks = preserveSelections
      ? buildPreservedFreePicks(mandatoryRefs, choiceGroups, state.occupation.freePicks)
      : [];
    state.occupation.creditRatingRange = occ.creditRatingRange || null;
    state.basic.occupation = occ.name;
    if (clearOccPoints) {
      state.skills.forEach((skill) => {
        skill.occ = 0;
      });
    }
    enforceSkillLimits();
  }

  function getExperiencePackById(packId) {
    const packs = Array.isArray(runtime.experiencePacks) ? runtime.experiencePacks : [];
    return packs.find((pack) => pack.id === packId) || null;
  }

  function getSelectedExperiencePack() {
    return getExperiencePackById(state.experience.selectedId || state.background.experiencePackId) || null;
  }

  function createEmptyExperienceState() {
    return {
      selectedId: '',
      selectedName: '',
      skillText: '',
      mandatoryRefs: [],
      choiceGroups: [],
      groupPicks: {},
      allowAnySkill: false,
      pointMode: 'none',
      points: 0,
      manualPoints: 0,
      ageMin: 0,
      sanityLoss: '',
      notes: '',
    };
  }

  function applyExperiencePackToState(pack, options = {}) {
    const preserveSelections = Boolean(options.preserveSelections);
    const keepingSamePack = preserveSelections && Boolean(pack) && state.background.experiencePackId === pack.id;

    if (!pack) {
      state.experience = createEmptyExperienceState();
      state.background.experiencePackId = '';
      state.skills.forEach((skill) => {
        skill.exp = 0;
      });
      enforceSkillLimits();
      return;
    }

    const mandatoryRefs = [...(pack.plan?.mandatoryRefs || [])];
    const choiceGroups = [...(pack.plan?.choiceGroups || [])];
    const manualPoints =
      pack.pointMode === 'manual' && keepingSamePack
        ? Math.max(0, normalizeInt(state.experience.manualPoints))
        : 0;

    state.experience = {
      ...createEmptyExperienceState(),
      selectedId: pack.id,
      selectedName: pack.name,
      skillText: pack.skills || pack.skillText || '',
      mandatoryRefs,
      choiceGroups,
      groupPicks: keepingSamePack
        ? buildPreservedGroupPicks(choiceGroups, state.experience.groupPicks)
        : {},
      allowAnySkill: Boolean(pack.allowAnySkill || pack.plan?.allowAnySkill),
      pointMode: pack.pointMode || 'none',
      points: Math.max(0, normalizeInt(pack.skillGrowthPoints || pack.points)),
      manualPoints,
      ageMin: Math.max(0, normalizeInt(pack.ageMin)),
      sanityLoss: String(pack.sanityLoss || ''),
      notes: String(pack.notes || ''),
    };
    state.background.experiencePackId = pack.id;

    if (!keepingSamePack) {
      state.skills.forEach((skill) => {
        skill.exp = 0;
      });
    }
    enforceSkillLimits();
  }

  function selectExperiencePack(packId) {
    if (!packId) {
      applyExperiencePackToState(null);
      return;
    }
    const pack = getExperiencePackById(packId);
    applyExperiencePackToState(pack);
  }

  function setExperienceManualPoints(value) {
    state.experience.manualPoints = Math.max(0, normalizeInt(value));
    recalcPools();
  }

  function buildAgeAdjustmentConfig(profile) {
    const manualKeys = Array.isArray(profile.manualPenalty?.keys) ? profile.manualPenalty.keys : [];
    return {
      autoPenalty: { ...(profile.autoPenalty || {}) },
      manualPenalty: profile.manualPenalty
        ? {
            total: Math.max(0, normalizeInt(profile.manualPenalty.total)),
            keys: manualKeys,
            allocations: Object.fromEntries(manualKeys.map((key) => [key, 0])),
          }
        : null,
      luckRerolls: Math.max(0, normalizeInt(profile.luckRerolls)),
      selectedLuck: null,
      eduGrowthBonus: 0,
    };
  }

  function syncAgeAdjustedAttrs() {
    const snapshot = state.meta?.ageAdjustmentSnapshot;
    const config = state.meta?.ageAdjustmentConfig;
    if (!snapshot || !config) return;

    const nextAttrs = { ...snapshot };

    Object.entries(config.autoPenalty || {}).forEach(([key, value]) => {
      nextAttrs[key] = Math.max(0, nextAttrs[key] - clampPenalty(value, nextAttrs[key]));
    });

    if (config.manualPenalty) {
      config.manualPenalty.keys.forEach((key) => {
        const value = config.manualPenalty.allocations?.[key];
        nextAttrs[key] = Math.max(0, nextAttrs[key] - clampPenalty(value, nextAttrs[key]));
      });
    }

    if (config.eduGrowthBonus > 0) {
      nextAttrs.EDU = Math.min(99, nextAttrs.EDU + normalizeInt(config.eduGrowthBonus));
    }

    if (normalizeInt(config.selectedLuck) > 0) {
      nextAttrs.Luck = normalizeInt(config.selectedLuck);
    }

    AGE_TRACKED_ATTR_KEYS.forEach((key) => {
      state.attrs[key] = nextAttrs[key];
    });
    applyDerived();
    enforceSkillLimits();
  }

  function snapshotAgeAdjustment() {
    if (!state.meta) state.meta = {};
    if (!state.meta.ageAdjustmentSnapshot) {
      state.meta.ageAdjustmentSnapshot = Object.fromEntries(
        AGE_TRACKED_ATTR_KEYS.map((key) => [key, normalizeInt(state.attrs[key])]),
      );
    }
  }

  function clearAgeAdjustment() {
    if (!state.meta?.ageAdjustmentSnapshot) return;
    const snapshot = state.meta.ageAdjustmentSnapshot;
    AGE_TRACKED_ATTR_KEYS.forEach((key) => {
      state.attrs[key] = snapshot[key];
    });
    state.meta.ageAdjustmentSnapshot = null;
    state.meta.ageAdjustmentConfig = null;
    state.meta.ageAdjustmentAppliedAge = null;
    applyDerived();
    enforceSkillLimits();
  }

  function applyAgeAdjustment() {
    const profile = getAgeProfile(state.basic.age);
    if (!state.basic.age) {
      return {
        applied: false,
        message: '该年龄段没有可自动应用的属性修正。',
        profile,
      };
    }

    if (normalizeInt(state.basic.age) >= 20 && normalizeInt(state.basic.age) < 40) {
      return {
        applied: false,
        message: '20-39 岁不需要额外年龄属性修正。',
        profile,
      };
    }

    if (!profile.autoPenalty && !profile.manualPenalty && !profile.luckRerolls) {
      return {
        applied: false,
        message: '该年龄段没有可自动应用的属性修正。',
        profile,
      };
    }

    snapshotAgeAdjustment();
    state.meta.ageAdjustmentConfig = buildAgeAdjustmentConfig(profile);
    state.meta.ageAdjustmentAppliedAge = normalizeInt(state.basic.age);
    syncAgeAdjustedAttrs();

    const messages = [`已套用 ${profile.label} 的固定年龄修正。`];
    if (profile.manualPenalty?.total > 0) {
      messages.push(`${profile.manualPenalty.keys.join('/')} 还需手动分配合计 ${profile.manualPenalty.total} 点减值。`);
    }
    if (profile.educationChecks > 0) {
      messages.push(`教育成长检定仍需手动进行 ${profile.educationChecks} 次。`);
    }
    if (profile.luckRerolls > 0) {
      messages.push(`Luck 可额外重掷 ${profile.luckRerolls} 次并取最高。`);
    }

    return {
      applied: true,
      message: messages.join(' '),
      profile,
    };
  }

  function setAgeAdjustmentAllocation(key, value) {
    const config = state.meta?.ageAdjustmentConfig;
    if (!config?.manualPenalty?.keys?.includes(key)) return;
    config.manualPenalty.allocations[key] = Math.max(0, normalizeInt(value));
    syncAgeAdjustedAttrs();
  }

  function getAgeAdjustmentState() {
    const appliedAge = state.meta?.ageAdjustmentAppliedAge || null;
    const config = state.meta?.ageAdjustmentConfig || null;
    const manualPenalty = config?.manualPenalty
      ? {
          ...config.manualPenalty,
          allocated: config.manualPenalty.keys.reduce(
            (sum, key) => sum + Math.max(0, normalizeInt(config.manualPenalty.allocations?.[key])),
            0,
          ),
        }
      : null;
    return {
      applied: Boolean(state.meta?.ageAdjustmentSnapshot),
      appliedAge,
      profile: getAgeProfile(state.basic.age),
      stale: Boolean(appliedAge) && appliedAge !== normalizeInt(state.basic.age),
      manualPenalty: manualPenalty
        ? {
            ...manualPenalty,
            remaining: manualPenalty.total - manualPenalty.allocated,
          }
        : null,
      autoPenalty: config?.autoPenalty || {},
      eduGrowthBonus: normalizeInt(config?.eduGrowthBonus),
      selectedLuck: normalizeInt(config?.selectedLuck),
    };
  }

  function rollEducationGrowth() {
    const edu = normalizeInt(state.attrs.EDU);
    const roll100 = roll(1, 100).sum;
    if (roll100 > edu) {
      const growth = roll(1, 10).sum;
      if (state.meta?.ageAdjustmentConfig) {
        state.meta.ageAdjustmentConfig.eduGrowthBonus = normalizeInt(state.meta.ageAdjustmentConfig.eduGrowthBonus) + growth;
        syncAgeAdjustedAttrs();
      } else {
        state.attrs.EDU = Math.min(99, edu + growth);
        applyDerived();
        enforceSkillLimits();
      }
      return { success: true, roll: roll100, threshold: edu, growth, newEdu: state.attrs.EDU };
    }
    return { success: false, roll: roll100, threshold: edu, growth: 0, newEdu: edu };
  }

  function rollYoungLuck() {
    const profile = getAgeProfile(state.basic.age);
    if (profile.luckRerolls <= 0) return null;
    const currentLuck = state.meta?.ageAdjustmentSnapshot
      ? normalizeInt(state.meta.ageAdjustmentSnapshot.Luck)
      : normalizeInt(state.attrs.Luck);
    const rerolls = Array.from({ length: profile.luckRerolls }, () => roll(3, 6).sum * 5);
    const best = Math.max(currentLuck, ...rerolls);

    if (state.meta?.ageAdjustmentConfig) {
      state.meta.ageAdjustmentConfig.selectedLuck = best;
      syncAgeAdjustedAttrs();
    } else {
      state.attrs.Luck = best;
      applyDerived();
      enforceSkillLimits();
    }

    return {
      current: currentLuck,
      rerolls,
      best,
    };
  }

  function getCreditRatingFinancials() {
    const creditSkill = state.skills.find((s) => s.key === 'creditRating');
    const creditTotal = creditSkill ? getSkillTotal(creditSkill) : 0;
    const tier = SPENDING_LEVEL_TABLE.find((t) => creditTotal >= t.min && creditTotal <= t.max);
    if (!tier) return { creditTotal, level: '未知', cash: '—', assets: '—', spendingLevel: '—' };
    return {
      creditTotal,
      level: tier.level,
      cash: typeof tier.cash === 'function' ? tier.cash(creditTotal) : tier.cash,
      assets: typeof tier.assets === 'function' ? tier.assets(creditTotal) : tier.assets,
      spendingLevel: tier.spending,
    };
  }

  function getExperiencePackSummary(pack) {
    if (!pack) return [];
    const lines = [];
    if (pack.sanityLoss) lines.push(`理智减少：${pack.sanityLoss}`);
    if (pack.initialAge) lines.push(`初始年龄：${pack.initialAge}`);
    if (pack.pointMode === 'fixed' && normalizeInt(pack.skillGrowthPoints) > 0) {
      lines.push(`经历包技能点：${normalizeInt(pack.skillGrowthPoints)}`);
    } else if (pack.pointMode === 'manual') {
      lines.push('经历包技能点：手动填写');
    } else if (pack.skillGrowth) {
      lines.push(`技能增长：${pack.skillGrowth}`);
    }
    if (pack.backgroundAdd) lines.push(`背景增加：${pack.backgroundAdd}`);
    if (pack.skills) lines.push(`可分配技能：${pack.skills}`);
    if (pack.notes) lines.push(`备注：${pack.notes}`);
    return lines;
  }

  function getExperiencePackSelection() {
    const pack = getSelectedExperiencePack();
    return {
      pack,
      summary: getExperiencePackSummary(pack),
    };
  }

  return {
    getSkillBase,
    getSkillTotal,
    getSkillDisplayName,
    getAttrHalf,
    getAttrFifth,
    getAgeAdjustmentPreview,
    getAgeAdjustmentState,
    applyAgeAdjustment,
    clearAgeAdjustment,
    setAgeAdjustmentAllocation,
    rollYoungLuck,
    getSelectedOccupationSkillSet,
    getSelectedExperienceSkillSet,
    getSkillRecommendedSpecializations,
    toggleOccupationGroupPick,
    toggleExperienceGroupPick,
    toggleGroupPick: toggleOccupationGroupPick,
    toggleFreePick,
    evalFormula,
    recalcPools,
    applyDerived,
    enforceSkillLimits,
    getSkillRuleWarnings,
    rollAllAttrs,
    getOccupationByName,
    applyOccupationToState,
    getExperiencePackById,
    getSelectedExperiencePack,
    applyExperiencePackToState,
    selectExperiencePack,
    setExperienceManualPoints,
    getExperiencePackSummary,
    getExperiencePackSelection,
    rollEducationGrowth,
    getCreditRatingFinancials,
  };
}
