<template>
  <div class="stage-skills">
    <div class="pools-header">
      <div class="pool-item">
        <div class="pool-title">职业技能点</div>
        <div
          class="pool-value"
          :class="{
            empty: state.pools.occupation > 0 && state.pools.occupation - state.pools.occSpent === 0,
            overflow: state.pools.occSpent > state.pools.occupation,
          }"
        >
          {{ state.pools.occSpent }} / {{ state.pools.occupation }}
        </div>
      </div>
      <div class="pool-item">
        <div class="pool-title">个人兴趣点</div>
        <div
          class="pool-value"
          :class="{
            empty: state.pools.interest > 0 && state.pools.interest - state.pools.intSpent === 0,
            overflow: state.pools.intSpent > state.pools.interest,
          }"
        >
          {{ state.pools.intSpent }} / {{ state.pools.interest }}
        </div>
      </div>
      <div class="pool-item">
        <div class="pool-title">经历包技能点</div>
        <div
          class="pool-value"
          :class="{
            empty: state.pools.experience > 0 && state.pools.experience - state.pools.expSpent === 0,
            overflow: state.pools.expSpent > state.pools.experience,
          }"
        >
          {{ state.pools.expSpent }} / {{ state.pools.experience }}
        </div>
      </div>
      <div class="pool-item pools-action">
        <button class="btn-vintage" @click="clearAllocBtn">清空分配</button>
      </div>
    </div>

    <div v-if="summaryWarnings.length" class="rule-warning-box">
      <div class="rule-warning-title">规则提醒（不阻止操作）</div>
      <ul class="rule-warning-list">
        <li v-for="(w, idx) in summaryWarnings" :key="idx">{{ w }}</li>
      </ul>
    </div>

    <div class="rule-grid">
      <section class="rule-panel">
        <div class="rule-head">
          <strong>职业技能选择</strong>
          <span class="muted">{{ state.occupation.selectedName || "未选择职业" }}</span>
        </div>
        <div class="rule-desc">{{ state.occupation.skillText || "请先在第一章选择职业。信用评级默认视为职业技能。" }}</div>
        <div class="chips-row">
          <span v-for="ref in state.occupation.mandatoryRefs" :key="`occ-m-${ref.id}`" class="skill-chip chip-occ">
            本职 {{ planRefLabel(ref) }}
          </span>
        </div>

        <div v-if="state.occupation.choiceGroups.length" class="choice-block">
          <div v-for="group in state.occupation.choiceGroups" :key="group.id" class="choice-card">
            <div class="choice-title">{{ group.label }}（已选 {{ (state.occupation.groupPicks[group.id] || []).length }} / {{ group.choose }}）</div>
            <div class="choice-options">
              <label v-for="option in group.options" :key="`${group.id}-${option.id}`" class="choice-option">
                <input
                  type="checkbox"
                  :checked="(state.occupation.groupPicks[group.id] || []).includes(option.id)"
                  @change="toggleOccupationGroupPick(group.id, option.id)"
                />
                <span>{{ planRefLabel(option) }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="state.occupation.freePickCount > 0" class="choice-card">
          <div class="choice-title">自选技能（应选 {{ state.occupation.freePickCount }}，已选 {{ state.occupation.freePicks.length }}）</div>
          <div class="choice-options">
            <label v-for="skill in freePickCandidates" :key="`free-${skill.key}`" class="choice-option">
              <input
                type="checkbox"
                :checked="state.occupation.freePicks.includes(skill.key)"
                @change="toggleFreePick(skill.key)"
              />
              <span>{{ skill.name }}</span>
            </label>
          </div>
        </div>
      </section>

      <section class="rule-panel">
        <div class="rule-head">
          <strong>经历包选择</strong>
          <div class="rule-head-actions">
            <span class="muted">{{ state.experience.selectedName || "未选择经历包" }}</span>
            <button v-if="state.experience.selectedId" class="btn-link" type="button" @click="selectExperiencePack('')">清空</button>
          </div>
        </div>
        <div class="rule-desc">经历包放在第二章完成，避免第三章背景附加后才发现技能点超限。</div>

        <div class="pack-grid">
          <button
            v-for="pack in runtime.experiencePacks"
            :key="pack.id"
            type="button"
            class="pack-card"
            :class="{ active: state.experience.selectedId === pack.id }"
            @click="selectExperiencePack(pack.id)"
          >
            <div class="pack-title">{{ pack.name }}</div>
            <div v-if="pack.skillGrowthPoints" class="pack-meta">技能点：{{ pack.skillGrowthPoints }}</div>
            <div v-else-if="pack.pointMode === 'manual'" class="pack-meta">技能点：手动填写</div>
            <div v-if="pack.ageMin" class="pack-meta">建议年龄：{{ pack.ageMin }}+</div>
            <div v-if="pack.sanityLoss" class="pack-meta">理智：{{ pack.sanityLoss }}</div>
          </button>
        </div>

        <div v-if="selectedExperiencePack" class="pack-detail">
          <div class="pack-detail-head">
            <div class="pack-detail-title">{{ selectedExperiencePack.name }}</div>
            <div class="pack-inline-meta">
              <span v-if="state.experience.pointMode === 'fixed'">技能点 {{ state.experience.points }}</span>
              <span v-else-if="state.experience.pointMode === 'manual'">技能点手动录入</span>
              <span v-if="state.experience.ageMin">建议年龄 {{ state.experience.ageMin }}+</span>
            </div>
          </div>

          <div v-if="experienceAgeWarning" class="inline-warning">
            当前年龄 {{ state.basic.age }} 低于该经历包建议年龄 {{ state.experience.ageMin }}。
          </div>

          <div v-if="state.experience.pointMode === 'manual'" class="manual-points-box">
            <label class="manual-points-label">经历包技能点</label>
            <input
              class="skill-input exp-input"
              type="number"
              min="0"
              :value="state.experience.manualPoints"
              @input="setExperienceManualPoints($event.target.value)"
            />
          </div>

          <div class="chips-row">
            <span v-for="ref in state.experience.mandatoryRefs" :key="`exp-m-${ref.id}`" class="skill-chip chip-exp">
              经历 {{ planRefLabel(ref) }}
            </span>
          </div>

          <div v-if="state.experience.choiceGroups.length" class="choice-block">
            <div v-for="group in state.experience.choiceGroups" :key="group.id" class="choice-card">
              <div class="choice-title">{{ group.label }}（已选 {{ (state.experience.groupPicks[group.id] || []).length }} / {{ group.choose }}）</div>
              <div class="choice-options">
                <label v-for="option in group.options" :key="`${group.id}-${option.id}`" class="choice-option">
                  <input
                    type="checkbox"
                    :checked="(state.experience.groupPicks[group.id] || []).includes(option.id)"
                    @change="toggleExperienceGroupPick(group.id, option.id)"
                  />
                  <span>{{ planRefLabel(option) }}</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="state.experience.allowAnySkill" class="soft-note">
            该经历包允许把经历包技能点分配到任意技能。
          </div>

          <div v-for="(line, idx) in selectedExperiencePackLines" :key="idx" class="pack-detail-line">{{ line }}</div>
        </div>
      </section>
    </div>

    <div class="table-container">
      <table class="skills-table">
        <thead>
          <tr>
            <th>技能名</th>
            <th>基础</th>
            <th title="职业属性点">职业</th>
            <th title="个人兴趣点">兴趣</th>
            <th title="经历包技能点">经历</th>
            <th>总值</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="skill in sortedSkills"
            :key="skill.key"
            :class="{
              'occ-skill': occSkillSet.has(skill.key),
              'exp-skill': expSkillSet.has(skill.key),
              'rule-warning-row': hasSkillWarning(skill),
            }"
          >
            <td class="skill-name">
              <div class="skill-name-row">
                <span>{{ getSkillDisplayName(skill) }}</span>
                <span v-if="skill.key === 'creditRating'" class="tag-badge tag-credit" title="信用评级">信用</span>
                <span v-if="occSkillSet.has(skill.key)" class="tag-badge tag-occ" title="职业技能">职业</span>
                <span v-if="expSkillSet.has(skill.key)" class="tag-badge tag-exp" title="经历包技能">经历</span>
                <span v-if="hasSkillWarning(skill)" class="warn-badge" :title="getSkillWarningText(skill)">⚠</span>
              </div>

              <div v-if="hasSpecialization(skill)" class="spec-control">
                <select
                  class="spec-select"
                  :value="skill.specializationChoice || skill.specialization || ''"
                  @change="onSpecializationChoice(skill, $event)"
                >
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

              <div v-if="getRecommendedSpecializations(skill).length" class="spec-recommend-row">
                <span class="spec-recommend-label">推荐：</span>
                <button
                  v-for="label in getRecommendedSpecializations(skill)"
                  :key="`${skill.key}-${label}`"
                  type="button"
                  class="spec-quick-btn"
                  :class="{ active: currentSpecializationLabel(skill) === label }"
                  @click="applyRecommendedSpecialization(skill, label)"
                >
                  {{ label }}
                </button>
              </div>
            </td>
            <td class="text-center">{{ getSkillBase(skill) }}</td>
            <td>
              <input
                v-model="skill.occ"
                type="number"
                min="0"
                :class="['skill-input', 'occ-input', { 'input-warning': hasSkillWarning(skill) }]"
                @change="enforceSkillLimits"
              />
            </td>
            <td>
              <input
                v-model="skill.interest"
                type="number"
                min="0"
                :class="['skill-input', 'int-input', { 'input-warning': hasSkillWarning(skill) }]"
                @change="enforceSkillLimits"
              />
            </td>
            <td>
              <input
                v-model="skill.exp"
                type="number"
                min="0"
                :class="['skill-input', 'exp-input', { 'input-warning': hasSkillWarning(skill) }]"
                @change="enforceSkillLimits"
              />
            </td>
            <td class="text-center fw-bold">{{ getSkillTotal(skill) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, watch } from 'vue';
import { SKILL_SPECIALIZATION_OPTIONS } from '../composables/constants.js';

const {
  state,
  runtime,
  getSkillBase,
  getSkillTotal,
  getSkillDisplayName,
  getSelectedOccupationSkillSet,
  getSelectedExperienceSkillSet,
  getSkillRecommendedSpecializations,
  getSkillRuleWarnings,
  getSelectedExperiencePack,
  getExperiencePackSummary,
  toggleOccupationGroupPick,
  toggleExperienceGroupPick,
  toggleFreePick,
  selectExperiencePack,
  setExperienceManualPoints,
  enforceSkillLimits
} = inject('coc');

const occSkillSet = computed(() => getSelectedOccupationSkillSet());
const expSkillSet = computed(() => getSelectedExperienceSkillSet());
const selectedExperiencePack = computed(() => getSelectedExperiencePack());
const selectedExperiencePackLines = computed(() => getExperiencePackSummary(selectedExperiencePack.value));
const skillWarnings = computed(() => getSkillRuleWarnings());
const summaryWarnings = computed(() => skillWarnings.value.summary);
const experienceAgeWarning = computed(() => (
  Boolean(state.experience.ageMin) && Number(state.basic.age) < Number(state.experience.ageMin)
));

const sortedSkills = computed(() =>
  [...state.skills].sort((a, b) => {
    const scoreA = sortScore(a);
    const scoreB = sortScore(b);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.name.localeCompare(b.name, 'zh-CN');
  }),
);

const freePickCandidates = computed(() => {
  const blocked = new Set();
  (state.occupation.mandatoryRefs || []).forEach((ref) => planRefKeys(ref).forEach((key) => blocked.add(key)));
  (state.occupation.choiceGroups || []).forEach((group) => {
    (group.options || []).forEach((ref) => planRefKeys(ref).forEach((key) => blocked.add(key)));
  });
  return state.skills.filter((skill) => !blocked.has(skill.key));
});

function sortScore(skill) {
  if (skill.key === 'creditRating') return -1;
  const occ = occSkillSet.value.has(skill.key) ? 0 : 1;
  const exp = expSkillSet.value.has(skill.key) ? 0 : 1;
  return occ + exp;
}

function hasSkillWarning(skill) {
  return Boolean(skillWarnings.value.bySkill[skill.key]?.length);
}

function getSkillWarningText(skill) {
  return (skillWarnings.value.bySkill[skill.key] || []).join('；');
}

function skillNameByKey(key) {
  return state.skills.find((skill) => skill.key === key)?.name || key;
}

function planRefKeys(ref) {
  return Array.from(
    new Set([
      ...(Array.isArray(ref?.keys) ? ref.keys : []),
      ref?.key,
    ].filter(Boolean)),
  );
}

function planRefLabel(ref) {
  return ref?.label || skillNameByKey(planRefKeys(ref)[0] || '');
}

function hasSpecialization(skill) {
  return Boolean((runtime.specializationOptions || {})[skill.key] || SKILL_SPECIALIZATION_OPTIONS[skill.key]);
}

function getSpecializationOptions(skill) {
  return (runtime.specializationOptions || {})[skill.key] || SKILL_SPECIALIZATION_OPTIONS[skill.key] || [];
}

function currentSpecializationLabel(skill) {
  if (skill.specialization) return skill.specialization;
  if (skill.specializationChoice && skill.specializationChoice !== '__custom__') return skill.specializationChoice;
  return '';
}

function onSpecializationChoice(skill, event) {
  const value = String(event?.target?.value || '');
  skill.specializationChoice = value;
  if (!value) skill.specialization = '';
  if (value && value !== '__custom__') skill.specialization = value;
}

function getRecommendedSpecializations(skill) {
  return getSkillRecommendedSpecializations(skill.key);
}

function applyRecommendedSpecialization(skill, label) {
  const options = new Set(getSpecializationOptions(skill));
  skill.specializationChoice = options.has(label) ? label : '__custom__';
  skill.specialization = label;
}

watch(
  () => state.occupation.formula,
  () => {
    enforceSkillLimits();
  }
);

function clearAllocBtn() {
  state.skills.forEach((skill) => {
    skill.occ = 0;
    skill.interest = 0;
    skill.exp = 0;
  });
  enforceSkillLimits();
}
</script>

<style scoped>
.stage-skills {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.pools-header {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 16px;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.05);
  padding: 16px;
  border-radius: 2px;
  border: 1px solid var(--border-color);
  border-left: 6px solid var(--accent-red);
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.1);
}

.pool-item {
  min-width: 0;
}

.pool-title {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--text-muted);
  text-transform: uppercase;
}

.pool-value {
  font-family: var(--font-typewriter);
  font-size: 1.5rem;
  font-weight: bold;
}

.pool-value.empty {
  color: var(--accent-red);
}

.pool-value.overflow {
  color: #c1121f;
  text-decoration: underline;
}

.pools-action {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.rule-warning-box {
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

.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.rule-panel {
  background: rgba(0, 0, 0, 0.03);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.rule-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 6px;
}

.rule-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.rule-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.muted {
  color: var(--text-muted);
}

.btn-link {
  border: none;
  background: transparent;
  color: var(--accent-red);
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.chip-occ {
  background: rgba(212, 175, 55, 0.12);
}

.chip-exp {
  background: rgba(28, 61, 90, 0.1);
}

.choice-block {
  display: grid;
  gap: 8px;
}

.choice-card {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.35);
}

.choice-title {
  font-weight: bold;
  margin-bottom: 6px;
}

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

.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.pack-card {
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.pack-card:hover {
  transform: translateY(-1px);
  border-color: rgba(139, 0, 0, 0.35);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.pack-card.active {
  border-color: var(--accent-red);
  background: rgba(139, 0, 0, 0.06);
}

.pack-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.pack-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.pack-detail {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(0, 0, 0, 0.15);
}

.pack-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.pack-detail-title {
  font-weight: 700;
}

.pack-inline-meta {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.pack-detail-line {
  font-size: 0.86rem;
  color: var(--text-color);
  margin-top: 4px;
  line-height: 1.45;
}

.manual-points-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.manual-points-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.inline-warning {
  color: #8b0000;
  background: rgba(176, 0, 32, 0.06);
  border: 1px solid rgba(176, 0, 32, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
}

.soft-note {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.table-container {
  overflow-x: auto;
}

.skills-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.skills-table th {
  border-bottom: 2px solid var(--text-color);
  border-top: 2px solid var(--text-color);
  padding: 8px 4px;
  font-family: var(--font-typewriter);
  color: var(--text-color);
  white-space: nowrap;
  font-weight: bold;
}

.skills-table td {
  padding: 8px 4px;
  border-bottom: 1px dashed var(--border-color);
}

tr:hover td {
  background: rgba(0, 0, 0, 0.02);
}

.rule-warning-row td {
  background: rgba(193, 18, 31, 0.06);
}

.skill-name {
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  white-space: normal;
  gap: 4px;
}

.skill-name-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 0.72rem;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.tag-credit {
  background: rgba(139, 0, 0, 0.08);
  color: var(--accent-red);
}

.tag-occ {
  background: rgba(212, 175, 55, 0.14);
}

.tag-exp {
  background: rgba(28, 61, 90, 0.12);
}

.warn-badge {
  color: #b00020;
  font-size: 1rem;
  line-height: 1;
  margin-left: auto;
}

.text-center {
  text-align: center;
}

.fw-bold {
  font-weight: bold;
  font-family: var(--font-typewriter);
}

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
  width: 96px;
}

.spec-recommend-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.spec-recommend-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.spec-quick-btn {
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.76rem;
  cursor: pointer;
}

.spec-quick-btn.active {
  border-color: var(--accent-red);
  color: var(--accent-red);
  background: rgba(139, 0, 0, 0.06);
}

.skill-input {
  width: 64px;
  background: transparent;
  border: 1px solid var(--border-color);
  font-family: var(--font-handwriting);
  font-size: 1.1rem;
  padding: 2px 4px;
  text-align: center;
  color: var(--accent-blue);
  border-radius: 2px;
}

.skill-input.occ-input {
  background: rgba(212, 175, 55, 0.05);
}

.skill-input.int-input {
  background: rgba(28, 61, 90, 0.05);
}

.skill-input.exp-input {
  background: rgba(93, 126, 69, 0.08);
}

.skill-input.input-warning {
  border-color: #c1121f;
  box-shadow: inset 0 0 0 1px rgba(193, 18, 31, 0.2);
}

.skill-input:focus {
  outline: 1px solid var(--text-color);
}

@media (max-width: 980px) {
  .rule-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .pools-header {
    grid-template-columns: 1fr;
  }

  .pools-action {
    justify-content: flex-start;
  }

  .pack-detail-head {
    flex-direction: column;
  }

  .pack-inline-meta {
    justify-content: flex-start;
  }
}
</style>
