<template>
  <div class="stage-skills">
    <div class="pools-header">
      <div class="pool-item">
        <div class="pool-title">职业技能点</div>
        <div class="pool-value" :class="{ empty: state.pools.occupation - state.pools.occSpent === 0, overflow: state.pools.occSpent > state.pools.occupation }">
          {{ state.pools.occSpent }} / {{ state.pools.occupation }}
        </div>
      </div>
      <div class="pool-item">
        <div class="pool-title">个人兴趣点</div>
        <div class="pool-value" :class="{ empty: state.pools.interest - state.pools.intSpent === 0, overflow: state.pools.intSpent > state.pools.interest }">
          {{ state.pools.intSpent }} / {{ state.pools.interest }}
        </div>
      </div>
      <div class="pool-item" style="flex: 1; text-align: right;">
        <button class="btn-vintage" @click="clearAllocBtn">清空分配</button>
      </div>
    </div>

    <div v-if="summaryWarnings.length" class="rule-warning-box">
      <div class="rule-warning-title">规则提醒（不阻止操作）</div>
      <ul class="rule-warning-list">
        <li v-for="(w, idx) in summaryWarnings" :key="idx">{{ w }}</li>
      </ul>
    </div>

    <div class="occupation-rule-box">
      <div class="rule-head">
        <strong>职业技能选择</strong>
        <span class="muted">{{ state.occupation.selectedName || "未选择职业" }}</span>
      </div>
      <div class="rule-desc">{{ state.occupation.skillText || "请先在序章选择职业。信用评级默认视为职业技能。" }}</div>
      <div class="chips-row">
        <span v-for="ref in state.occupation.mandatoryRefs" :key="`m-${ref.id}`" class="skill-chip">本职 {{ occupationRefLabel(ref) }}</span>
      </div>

      <div v-if="state.occupation.choiceGroups.length" class="choice-block">
        <div v-for="g in state.occupation.choiceGroups" :key="g.id" class="choice-card">
          <div class="choice-title">{{ g.label }}（已选 {{ (state.occupation.groupPicks[g.id] || []).length }}）</div>
          <div class="choice-options">
            <label v-for="option in g.options" :key="`${g.id}-${option.id}`" class="choice-option">
              <input type="checkbox" :checked="(state.occupation.groupPicks[g.id] || []).includes(option.id)" @change="toggleGroupPick(g.id, option.id)" />
              <span>{{ occupationRefLabel(option) }}</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="state.occupation.freePickCount > 0" class="choice-card">
        <div class="choice-title">自选技能（应选 {{ state.occupation.freePickCount }}，已选 {{ state.occupation.freePicks.length }}）</div>
        <div class="choice-options">
          <label v-for="s in freePickCandidates" :key="`f-${s.key}`" class="choice-option">
            <input type="checkbox" :checked="state.occupation.freePicks.includes(s.key)" @change="toggleFreePick(s.key)" />
            <span>{{ s.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table class="skills-table">
        <thead>
          <tr>
            <th>技能名</th>
            <th>基础</th>
            <th title="职业属性点">职业</th>
            <th title="个人兴趣点">兴趣</th>
            <th>总值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="skill in sortedSkills" :key="skill.key" :class="{ 'occ-skill': occSkillSet.has(skill.key), 'rule-warning-row': hasSkillWarning(skill) }">
            <td class="skill-name">
              <span>{{ getSkillDisplayName(skill) }}</span>
              <span v-if="occSkillSet.has(skill.key)" class="occ-badge" title="本职业本职技能">★</span>
              <span v-if="hasSkillWarning(skill)" class="warn-badge" :title="getSkillWarningText(skill)">⚠</span>
              <div v-if="hasSpecialization(skill)" class="spec-control">
                <select class="spec-select" :value="skill.specializationChoice || ''" @change="onSpecializationChoice(skill, $event)">
                  <option value="">子类</option>
                  <option v-for="op in getSpecializationOptions(skill)" :key="`${skill.key}-${op}`" :value="op">{{ op }}</option>
                  <option value="__custom__">自定义</option>
                </select>
                <input
                  v-if="skill.specializationChoice === '__custom__'"
                  type="text"
                  class="spec-input"
                  v-model="skill.specialization"
                  placeholder="输入子类"
                />
              </div>
            </td>
            <td class="text-center">{{ getSkillBase(skill) }}</td>
            <td>
              <input type="number" :class="['skill-input', 'occ-input', { 'input-warning': hasSkillWarning(skill) }]" v-model="skill.occ" @change="enforceSkillLimits" min="0" />
            </td>
            <td>
              <input type="number" :class="['skill-input', 'int-input', { 'input-warning': hasSkillWarning(skill) }]" v-model="skill.interest" @change="enforceSkillLimits" min="0" />
            </td>
            <td class="text-center fw-bold">{{ getSkillTotal(skill) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { inject, computed, watch } from 'vue';
import { SKILL_SPECIALIZATION_OPTIONS } from '../composables/constants.js';

const {
  state,
  runtime,
  getSkillBase,
  getSkillTotal,
  getSkillDisplayName,
  getSelectedOccupationSkillSet,
  getSkillRuleWarnings,
  toggleGroupPick,
  toggleFreePick,
  enforceSkillLimits
} = inject('coc');

const occSkillSet = computed(() => getSelectedOccupationSkillSet());
const skillWarnings = computed(() => getSkillRuleWarnings());
const summaryWarnings = computed(() => skillWarnings.value.summary);
const sortedSkills = computed(() =>
  [...state.skills].sort((a, b) => {
    const pa = occSkillSet.value.has(a.key) ? 0 : 1;
    const pb = occSkillSet.value.has(b.key) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'zh-CN');
  }),
);

const freePickCandidates = computed(() => {
  const blocked = new Set();
  (state.occupation.mandatoryRefs || []).forEach((ref) => occupationRefKeys(ref).forEach((key) => blocked.add(key)));
  (state.occupation.choiceGroups || []).forEach((g) => (g.options || []).forEach((ref) => occupationRefKeys(ref).forEach((key) => blocked.add(key))));
  return state.skills.filter((s) => !blocked.has(s.key));
});

function hasSkillWarning(skill) {
  return Boolean(skillWarnings.value.bySkill[skill.key]?.length);
}

function getSkillWarningText(skill) {
  return (skillWarnings.value.bySkill[skill.key] || []).join("；");
}

function skillNameByKey(key) {
  return state.skills.find((s) => s.key === key)?.name || key;
}

function occupationRefKeys(ref) {
  return Array.from(
    new Set([
      ...(Array.isArray(ref?.keys) ? ref.keys : []),
      ref?.key,
    ].filter(Boolean)),
  );
}

function occupationRefLabel(ref) {
  return ref?.label || skillNameByKey(occupationRefKeys(ref)[0] || "");
}

function hasSpecialization(skill) {
  return Boolean((runtime.specializationOptions || {})[skill.key] || SKILL_SPECIALIZATION_OPTIONS[skill.key]);
}

function getSpecializationOptions(skill) {
  return (runtime.specializationOptions || {})[skill.key] || SKILL_SPECIALIZATION_OPTIONS[skill.key] || [];
}

function onSpecializationChoice(skill, event) {
  const value = String(event?.target?.value || "");
  skill.specializationChoice = value;
  if (!value) skill.specialization = "";
  if (value && value !== "__custom__") skill.specialization = value;
}

watch(
  () => state.occupation.formula,
  () => {
    enforceSkillLimits();
  }
);

function clearAllocBtn() {
  state.skills.forEach(s => {
    s.occ = 0; s.interest = 0;
  });
  enforceSkillLimits();
}
</script>

<style scoped>
.pools-header {
  display: flex; gap: 24px; align-items: center;
  background: var(--bg-darker);
  padding: 16px; border-radius: 4px; margin-bottom: 24px;
  border-left: 4px solid var(--accent-red);
  flex-wrap: wrap;
}
.pool-title { font-size: 0.85rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase; }
.pool-value { font-family: var(--font-typewriter); font-size: 1.5rem; font-weight: bold; }
.pool-value.empty { color: var(--accent-red); }
.pool-value.overflow { color: #c1121f; text-decoration: underline; }

.rule-warning-box {
  margin-bottom: 16px;
  background: rgba(193, 18, 31, 0.08);
  border: 1px solid rgba(193, 18, 31, 0.35);
  border-radius: 6px;
  padding: 10px 12px;
}
.rule-warning-title {
  font-weight: bold;
  color: #8b0000;
  margin-bottom: 4px;
}
.rule-warning-list {
  margin: 0;
  padding-left: 18px;
  color: #7a1f1f;
}

.occupation-rule-box {
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  padding: 10px 12px;
}
.rule-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.rule-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 8px;
}
.muted { color: var(--text-muted); }
.chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.skill-chip {
  display: inline-block;
  font-size: 0.78rem;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.2);
  background: rgba(212, 175, 55, 0.12);
}
.choice-block { display: grid; gap: 8px; }
.choice-card {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: rgba(255,255,255,0.35);
}
.choice-title { font-weight: bold; margin-bottom: 6px; }
.choice-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.choice-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
}

.table-container { overflow-x: auto; }
.skills-table {
  width: 100%; border-collapse: collapse; text-align: left;
}
.skills-table th {
  border-bottom: 2px solid var(--border-color);
  padding: 8px 4px;
  font-family: var(--font-body); color: var(--text-muted); white-space: nowrap;
}
.skills-table td {
  padding: 8px 4px;
  border-bottom: 1px dashed var(--border-color);
}
tr:hover td { background: rgba(0,0,0,0.02); }
.rule-warning-row td { background: rgba(193, 18, 31, 0.06); }

.skill-name {
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  white-space: normal;
  gap: 4px;
}
.occ-badge { color: #d4af37; font-size: 1.2rem; line-height: 1; }
.warn-badge { color: #b00020; font-size: 1rem; line-height: 1; }
.text-center { text-align: center; }
.fw-bold { font-weight: bold; font-family: var(--font-typewriter); }

.spec-control {
  display: inline-flex;
  gap: 4px;
}
.spec-select,
.spec-input {
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 0.78rem;
  background: #fff;
}
.spec-input {
  width: 90px;
}

.skill-input {
  width: 60px;
  background: transparent;
  border: 1px solid var(--border-color);
  font-family: var(--font-handwriting);
  font-size: 1.1rem;
  padding: 2px 4px;
  text-align: center;
  color: var(--accent-blue);
  border-radius: 2px;
}
.skill-input.occ-input { background: rgba(212, 175, 55, 0.05); }
.skill-input.int-input { background: rgba(28, 61, 90, 0.05); }
.skill-input.input-warning {
  border-color: #c1121f;
  box-shadow: inset 0 0 0 1px rgba(193, 18, 31, 0.2);
}
.skill-input:focus { outline: 1px solid var(--text-color); }
</style>
