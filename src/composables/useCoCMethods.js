import { normalizeInt, normalizeFormula, roll } from './utils.js';
import { getAgeProfile } from './coc7Rules.js';

function clampPenalty(value, max) {
  const n = Math.max(0, normalizeInt(value));
  return Math.min(n, max);
}

export function bindMethods(state, runtime) {
  function getOccupationRefKeys(ref) {
    if (!ref) return [];
    const keys = [
      ...(Array.isArray(ref.keys) ? ref.keys : []),
      ref.key,
    ].filter(Boolean);
    return Array.from(new Set(keys));
  }

  function getSkillBase(skill) {
    if (skill.key === 'dodge') return Math.floor(normalizeInt(state.attrs.DEX) / 2);
    if (skill.key === 'languageOwn') return normalizeInt(state.attrs.EDU);
    return normalizeInt(skill.base);
  }

  function getSkillTotal(skill) {
    return getSkillBase(skill) + Math.max(0, normalizeInt(skill.occ)) + Math.max(0, normalizeInt(skill.interest));
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
    const age = normalizeInt(state.basic.age);
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
    if (profile.physicalPenalty > 0) {
      lines.push(`STR/CON/DEX 合计 -${profile.physicalPenalty}`);
    }

    if (age >= 15 && age <= 19) {
      lines.push('这个年龄段需要你手动分配 STR/SIZ 的 5 点减值。');
      lines.push('Luck 建议重掷两次取更高值。');
    }

    if (profile.manualNotes?.length) {
      lines.push(...profile.manualNotes);
    }

    return lines;
  }

  function getSelectedOccupationSkillSet() {
    const set = new Set();
    (state.occupation.mandatoryRefs || []).forEach((ref) => getOccupationRefKeys(ref).forEach((key) => set.add(key)));
    (state.occupation.choiceGroups || []).forEach((group) => {
      const pickedIds = new Set(state.occupation.groupPicks[group.id] || []);
      (group.options || []).forEach((option) => {
        if (!pickedIds.has(option.id)) return;
        getOccupationRefKeys(option).forEach((key) => set.add(key));
      });
    });
    (state.occupation.freePicks || []).forEach((key) => set.add(key));
    set.add('creditRating');
    return set;
  }

  function toggleGroupPick(groupId, optionId) {
    const picks = new Set(state.occupation.groupPicks[groupId] || []);
    if (picks.has(optionId)) picks.delete(optionId);
    else picks.add(optionId);
    state.occupation.groupPicks[groupId] = Array.from(picks);
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

  function getPoolSnapshot() {
    return {
      occupation: Math.max(0, Math.floor(evalFormula(state.occupation.formula || 'EDU*4'))),
      interest: Math.max(0, normalizeInt(state.attrs.INT) * 2),
      occSpent: state.skills.reduce((acc, skill) => acc + Math.max(0, normalizeInt(skill.occ)), 0),
      intSpent: state.skills.reduce((acc, skill) => acc + Math.max(0, normalizeInt(skill.interest)), 0),
    };
  }

  function recalcPools() {
    const snapshot = getPoolSnapshot();
    state.pools.occupation = snapshot.occupation;
    state.pools.interest = snapshot.interest;
    state.pools.occSpent = snapshot.occSpent;
    state.pools.intSpent = snapshot.intSpent;
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
    }
    recalcPools();
  }

  function getSkillRuleWarnings() {
    const snapshot = getPoolSnapshot();
    const occSkillSet = getSelectedOccupationSkillSet();
    const bySkill = {};
    const summary = [];

    for (const skill of state.skills) {
      const issues = [];
      const occ = Math.max(0, normalizeInt(skill.occ));
      const interest = Math.max(0, normalizeInt(skill.interest));
      const total = getSkillBase(skill) + occ + interest;

      if (occ > 0 && occSkillSet.size > 0 && !occSkillSet.has(skill.key)) {
        issues.push('职业点分配到了非职业技能');
      }
      if (skill.key === 'creditRating' && interest > 0) {
        issues.push('兴趣点不应加在信用评级上');
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

    if (snapshot.occSpent > snapshot.occupation) {
      summary.push(`职业技能点超出 ${snapshot.occSpent - snapshot.occupation} 点`);
    }
    if (snapshot.intSpent > snapshot.interest) {
      summary.push(`兴趣技能点超出 ${snapshot.intSpent - snapshot.interest} 点`);
    }

    const creditSkill = state.skills.find((skill) => skill.key === 'creditRating');
    const creditTotal = creditSkill ? getSkillBase(creditSkill) + Math.max(0, normalizeInt(creditSkill.occ)) + Math.max(0, normalizeInt(creditSkill.interest)) : 0;
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

  function applyOccupationToState(occ, clearOccPoints) {
    state.occupation.selectedName = occ.name;
    state.occupation.previewName = occ.name;
    state.occupation.formula = occ.formula;
    state.occupation.skillText = occ.skillText;
    state.occupation.mandatoryRefs = [...(occ.plan?.mandatoryRefs || [])];
    state.occupation.choiceGroups = [...(occ.plan?.choiceGroups || [])];
    state.occupation.groupPicks = {};
    state.occupation.freePickCount = occ.plan?.freePickCount || 0;
    state.occupation.freePicks = [];
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
    return getExperiencePackById(state.background.experiencePackId) || null;
  }

  function selectExperiencePack(packId) {
    state.background.experiencePackId = packId || '';
  }

  function snapshotAgeAdjustment() {
    if (!state.meta) state.meta = {};
    if (!state.meta.ageAdjustmentSnapshot) {
      state.meta.ageAdjustmentSnapshot = {
        STR: state.attrs.STR,
        CON: state.attrs.CON,
        DEX: state.attrs.DEX,
        APP: state.attrs.APP,
        EDU: state.attrs.EDU,
        Luck: state.attrs.Luck,
      };
    }
  }

  function clearAgeAdjustment() {
    if (!state.meta?.ageAdjustmentSnapshot) return;
    const snapshot = state.meta.ageAdjustmentSnapshot;
    state.attrs.STR = snapshot.STR;
    state.attrs.CON = snapshot.CON;
    state.attrs.DEX = snapshot.DEX;
    state.attrs.APP = snapshot.APP;
    state.attrs.EDU = snapshot.EDU;
    state.attrs.Luck = snapshot.Luck;
    state.meta.ageAdjustmentSnapshot = null;
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

    if (normalizeInt(state.basic.age) >= 15 && normalizeInt(state.basic.age) <= 19) {
      return {
        applied: false,
        message: '15-19 岁的 STR/SIZ 减值需要玩家手动分配，建议先用预览确认。',
        profile,
      };
    }

    if (!profile.attrDeltas) {
      return {
        applied: false,
        message: '该年龄段没有可自动应用的属性修正。',
        profile,
      };
    }

    snapshotAgeAdjustment();
    const snapshot = state.meta.ageAdjustmentSnapshot;
    state.attrs.STR = snapshot.STR - clampPenalty(profile.attrDeltas.STR, snapshot.STR);
    state.attrs.CON = snapshot.CON - clampPenalty(profile.attrDeltas.CON, snapshot.CON);
    state.attrs.DEX = snapshot.DEX - clampPenalty(profile.attrDeltas.DEX, snapshot.DEX);
    state.attrs.APP = snapshot.APP - clampPenalty(profile.attrDeltas.APP, snapshot.APP);
    state.attrs.EDU = snapshot.EDU - clampPenalty(profile.attrDeltas.EDU, snapshot.EDU);
    state.meta.ageAdjustmentAppliedAge = normalizeInt(state.basic.age);
    applyDerived();
    enforceSkillLimits();

    return {
      applied: true,
      message: `已按 ${profile.label} 建议应用年龄减值（教育成长检定需手动处理）。`,
      profile,
    };
  }

  function getAgeAdjustmentState() {
    return {
      applied: Boolean(state.meta?.ageAdjustmentSnapshot),
      appliedAge: state.meta?.ageAdjustmentAppliedAge || null,
      profile: getAgeProfile(state.basic.age),
    };
  }

  function getExperiencePackSummary(pack) {
    if (!pack) return [];
    const lines = [];
    if (pack.sanityLoss) lines.push(`理智减少：${pack.sanityLoss}`);
    if (pack.initialAge) lines.push(`初始年龄：${pack.initialAge}`);
    if (pack.skillGrowth) lines.push(`技能增长：${pack.skillGrowth}`);
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
    getSelectedOccupationSkillSet,
    toggleGroupPick,
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
    selectExperiencePack,
    getExperiencePackSummary,
    getExperiencePackSelection,
  };
}
