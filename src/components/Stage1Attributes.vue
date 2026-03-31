<template>
  <div class="stage-attributes">
    <div class="actions-bar">
      <button class="btn-vintage primary" @click="animateRollAll" :disabled="isRolling">全部按规则重掷 🎲</button>
      <button class="btn-vintage" @click="quickAssign" :disabled="isRolling">快速分配（规则书标准 460）</button>
      <button class="btn-vintage" @click="quickAssignByTotal(450)" :disabled="isRolling">快速分配总和 450</button>
      <button class="btn-vintage" @click="quickAssignByTotal(480)" :disabled="isRolling">快速分配总和 480</button>
    </div>

    <div class="attr-grid">
      <div v-for="attr in ATTR_ORDER" :key="attr" class="attr-box">
        <label>{{ attr }}</label>
        <div class="attr-input-group">
          <input 
            type="number" 
            class="input-vintage attr-input" 
            v-model="state.attrs[attr]" 
            @change="onAttrChange" 
            min="1" max="99" 
          />
          <button v-if="attr === 'Luck'" class="btn-roll-single" @click="animateRerollLuck" :disabled="isRolling">🎲</button>
        </div>
        <div class="attr-rates">
          <span>困难 {{ getAttrHalf(attr) }}</span>
          <span>极难 {{ getAttrFifth(attr) }}</span>
        </div>
      </div>
    </div>

    <!-- Age Adjustment Panel (moved from Stage0 per CoC7 official flow) -->
    <div class="age-adjust-box">
      <div class="age-adjust-head">
        <strong>年龄修正</strong>
        <span class="age-pill">{{ ageState.profile.label }} · {{ state.basic.age || '?' }}岁</span>
      </div>
      <p class="age-summary">{{ ageState.profile.summary }}</p>
      <div v-if="ageState.stale" class="age-stale-warning">
        年龄已变更，当前年龄修正仍基于 {{ ageState.appliedAge }} 岁时的快照。建议先撤销再重新套用。
      </div>
      <ul v-if="agePreviewLines.length" class="age-lines">
        <li v-for="(line, idx) in agePreviewLines" :key="idx">{{ line }}</li>
      </ul>
      <div class="age-actions">
        <button class="btn-vintage primary" @click="doApplyAgeAdjustment">套用年龄修正</button>
        <button class="btn-vintage" @click="doClearAgeAdjustment" :disabled="!ageState.applied">撤销修正</button>
        <button
          v-if="ageState.profile.luckRerolls > 0"
          class="btn-vintage"
          @click="doRollYoungLuck"
        >青年幸运重掷 🎲</button>
      </div>

      <div v-if="ageState.applied && ageState.manualPenalty" class="age-manual-box">
        <div class="age-manual-head">
          <strong>手动分配年龄减值</strong>
          <span
            class="age-manual-status"
            :class="{ warning: ageState.manualPenalty.remaining !== 0 }"
          >
            已分配 {{ ageState.manualPenalty.allocated }} / {{ ageState.manualPenalty.total }}
          </span>
        </div>
        <p class="age-manual-hint">
          按规则把减值分配到 {{ ageState.manualPenalty.keys.join(' / ') }}。这里只做软提醒，不强制锁死。
        </p>
        <div class="age-manual-grid">
          <label
            v-for="key in ageState.manualPenalty.keys"
            :key="`age-manual-${key}`"
            class="age-manual-item"
          >
            <span>{{ key }}</span>
            <input
              type="number"
              class="input-vintage age-manual-input"
              :value="ageState.manualPenalty.allocations[key] || 0"
              min="0"
              @change="doSetAgePenalty(key, $event)"
            />
          </label>
        </div>
        <div v-if="ageState.manualPenalty.remaining !== 0" class="age-manual-warning">
          <span v-if="ageState.manualPenalty.remaining > 0">
            还差 {{ ageState.manualPenalty.remaining }} 点未分配。
          </span>
          <span v-else>
            当前多分配了 {{ Math.abs(ageState.manualPenalty.remaining) }} 点。
          </span>
        </div>
      </div>

      <!-- Education Growth Checks (40+ age) -->
      <div v-if="ageState.profile.educationChecks > 0" class="edu-growth-section">
        <div class="edu-growth-head">
          <strong>教育成长检定</strong>
          <span class="edu-growth-tag">可检定 {{ ageState.profile.educationChecks }} 次 · 已完成 {{ eduGrowthLog.length }} 次</span>
        </div>
        <p class="edu-growth-hint">掷 1D100，超过当前 EDU（{{ state.attrs.EDU }}）则 EDU + 1D10</p>
        <button
          class="btn-vintage primary"
          @click="doEducationGrowth"
          :disabled="eduGrowthLog.length >= ageState.profile.educationChecks"
        >执行教育成长检定 🎲</button>
        <div v-if="eduGrowthLog.length" class="edu-growth-log">
          <div v-for="(entry, idx) in eduGrowthLog" :key="idx" class="edu-growth-entry" :class="{ success: entry.success }">
            <span class="edu-roll-num">第{{ idx + 1 }}次</span>
            <span>掷出 {{ entry.roll }}（阈值 {{ entry.threshold }}）</span>
            <span v-if="entry.success" class="edu-growth-result">✅ EDU +{{ entry.growth }} → {{ entry.newEdu }}</span>
            <span v-else class="edu-growth-result">❌ 失败，EDU 不变</span>
          </div>
        </div>
      </div>
    </div>

    <div class="derived-box">
      <h4>衍生属性</h4>
      <div class="derived-grid">
        <div class="derived-item"><strong>HP:</strong> {{ state.attrs.HP }} <span class="muted-text">/ max</span></div>
        <div class="derived-item"><strong>MP:</strong> {{ state.attrs.MP }}</div>
        <div class="derived-item"><strong>SAN:</strong> {{ state.attrs.SAN }}</div>
        <div class="derived-item"><strong>MOV:</strong> {{ state.attrs.MOV }}</div>
        <div class="derived-item"><strong>DB (伤害加值):</strong> {{ state.attrs.DB }}</div>
        <div class="derived-item"><strong>Build (体格):</strong> {{ state.attrs.Build }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, computed } from 'vue';
import { ATTR_ORDER } from '../composables/constants.js';
import { roll } from '../composables/utils.js';

const {
  state,
  applyDerived,
  enforceSkillLimits,
  rollAllAttrs,
  getAttrHalf,
  getAttrFifth,
  getAgeAdjustmentPreview,
  getAgeAdjustmentState,
  applyAgeAdjustment,
  clearAgeAdjustment,
  setAgeAdjustmentAllocation,
  rollYoungLuck,
  rollEducationGrowth,
} = inject('coc');

const eduGrowthLog = ref([]);
const isRolling = ref(false);

const agePreviewLines = computed(() => getAgeAdjustmentPreview());
const ageState = computed(() => getAgeAdjustmentState());

function onAttrChange() {
  applyDerived();
  enforceSkillLimits();
}

function animateRollAll() {
  if (isRolling.value) return;
  isRolling.value = true;
  rollAllAttrs();
  const finalAttrs = { ...state.attrs };
  eduGrowthLog.value = [];

  let frame = 0;
  const maxFrames = 15;
  const interval = setInterval(() => {
    frame++;
    if (frame >= maxFrames) {
      clearInterval(interval);
      Object.assign(state.attrs, finalAttrs);
      onAttrChange();
      isRolling.value = false;
      return;
    }
    ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'Luck'].forEach(k => {
      state.attrs[k] = Math.floor(Math.random() * 16 + 3) * 5;
    });
  }, 40);
}

function animateRerollLuck() {
  if (isRolling.value) return;
  isRolling.value = true;
  const finalLuck = roll(3, 6).sum * 5;

  let frame = 0;
  const maxFrames = 15;
  const interval = setInterval(() => {
    frame++;
    if (frame >= maxFrames) {
      clearInterval(interval);
      state.attrs.Luck = finalLuck;
      onAttrChange();
      isRolling.value = false;
      return;
    }
    state.attrs.Luck = Math.floor(Math.random() * 16 + 3) * 5;
  }, 40);
}

function quickAssign() {
  const vals = [80, 70, 60, 60, 50, 50, 50, 40].sort(() => Math.random() - 0.5);
  ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].forEach((k, i) => (state.attrs[k] = vals[i]));
  state.attrs.Luck = roll(3, 6).sum * 5;
  eduGrowthLog.value = [];
  onAttrChange();
}

function quickAssignByTotal(total) {
  const keys = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
  const step = 5;
  const min = 40;
  const max = 80;
  const minSum = min * keys.length;
  const maxSum = max * keys.length;
  if (total < minSum || total > maxSum || total % step !== 0) {
    alert("总和值不在可分配范围内（320-640，且需为5的倍数）");
    return;
  }

  const vals = Array(keys.length).fill(min);
  let remain = total - minSum;
  while (remain > 0) {
    const candidateIndexes = vals
      .map((v, idx) => ({ idx, v }))
      .filter((x) => x.v <= max - step)
      .map((x) => x.idx);
    if (!candidateIndexes.length) break;
    const pick = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
    vals[pick] += step;
    remain -= step;
  }

  vals.sort(() => Math.random() - 0.5);
  keys.forEach((k, i) => {
    state.attrs[k] = vals[i];
  });
  state.attrs.Luck = roll(3, 6).sum * 5;
  eduGrowthLog.value = [];
  onAttrChange();
}

function doApplyAgeAdjustment() {
  eduGrowthLog.value = [];
  const result = applyAgeAdjustment();
  if (result?.message) alert(result.message);
}

function doClearAgeAdjustment() {
  eduGrowthLog.value = [];
  clearAgeAdjustment();
}

function doSetAgePenalty(key, event) {
  setAgeAdjustmentAllocation(key, event?.target?.value);
}

function doRollYoungLuck() {
  const result = rollYoungLuck();
  if (!result) return;
  alert(`Luck 结果：当前 ${result.current}，重掷 ${result.rerolls.join(' / ')}，采用 ${result.best}`);
}

function doEducationGrowth() {
  if (isRolling.value) return;
  const maxChecks = ageState.value.profile.educationChecks || 0;
  if (eduGrowthLog.value.length >= maxChecks) return;

  isRolling.value = true;
  const result = rollEducationGrowth();
  if (!result) {
    isRolling.value = false;
    return;
  }
  
  const finalEdu = state.attrs.EDU;
  const originalEdu = finalEdu - (result.success ? result.growth : 0);
  
  let frame = 0;
  const maxFrames = 15;
  const interval = setInterval(() => {
    frame++;
    if (frame >= maxFrames) {
      clearInterval(interval);
      state.attrs.EDU = finalEdu;
      eduGrowthLog.value.push(result);
      onAttrChange();
      isRolling.value = false;
      return;
    }
    state.attrs.EDU = Math.floor(Math.random() * 16 + 3) * 5;
  }, 40);
}
</script>

<style scoped>
.actions-bar {
  display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.attr-box {
  display: flex; flex-direction: column; align-items: center;
  border: 2px solid var(--border-color);
  padding: 12px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.03);
  box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
}
.attr-box label {
  font-family: var(--font-typewriter); font-weight: bold; margin-bottom: 8px;
}
.attr-input-group {
  display: flex; align-items: center; position: relative;
}
.attr-input {
  text-align: center;
  font-size: 1.5rem;
  width: 60px;
  font-family: var(--font-handwriting);
}
.btn-roll-single {
  background: none; border: none; cursor: pointer; font-size: 1.2rem;
  position: absolute; right: -30px; opacity: 0.6; transition: opacity 0.2s;
}
.btn-roll-single:hover { opacity: 1; }

.attr-rates {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-family: var(--font-typewriter);
  flex-wrap: wrap;
  justify-content: center;
}
.attr-rates span {
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Age Adjustment Box */
.age-adjust-box {
  margin-bottom: 24px;
  padding: 14px;
  border: 1px solid rgba(139, 0, 0, 0.18);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.45), rgba(241, 235, 217, 0.75));
}
.age-adjust-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.age-pill {
  font-size: 0.78rem;
  color: var(--accent-red);
  border: 1px solid rgba(139, 0, 0, 0.25);
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(139, 0, 0, 0.05);
  white-space: nowrap;
}
.age-summary {
  color: var(--text-muted);
  margin-bottom: 8px;
}
.age-stale-warning {
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(193, 18, 31, 0.08);
  border: 1px solid rgba(193, 18, 31, 0.2);
  color: #7a1f1f;
  font-size: 0.86rem;
}
.age-lines {
  margin: 0;
  padding-left: 18px;
  color: var(--text-color);
}
.age-lines li {
  margin-bottom: 4px;
}
.age-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
.age-manual-box {
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px dashed rgba(0, 0, 0, 0.15);
}
.age-manual-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 6px;
}
.age-manual-status {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(28, 61, 90, 0.06);
  border: 1px solid rgba(28, 61, 90, 0.16);
  color: var(--accent-blue);
}
.age-manual-status.warning {
  background: rgba(193, 18, 31, 0.08);
  border-color: rgba(193, 18, 31, 0.22);
  color: #8b0000;
}
.age-manual-hint {
  margin-bottom: 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.age-manual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}
.age-manual-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.age-manual-input {
  text-align: center;
}
.age-manual-warning {
  margin-top: 10px;
  color: #8b0000;
  font-size: 0.85rem;
}

/* Education Growth Checks */
.edu-growth-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed rgba(139, 0, 0, 0.2);
}
.edu-growth-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.edu-growth-tag {
  font-size: 0.78rem;
  color: var(--accent-blue);
  border: 1px solid rgba(28, 61, 90, 0.25);
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(28, 61, 90, 0.05);
  white-space: nowrap;
}
.edu-growth-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.edu-growth-log {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.edu-growth-entry {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 0.88rem;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-color);
  font-family: var(--font-typewriter);
}
.edu-growth-entry.success {
  background: rgba(34, 139, 34, 0.06);
  border-color: rgba(34, 139, 34, 0.25);
}
.edu-roll-num {
  font-weight: bold;
  color: var(--text-muted);
}
.edu-growth-result {
  font-weight: bold;
}

/* Derived Box */
.derived-box {
  border-top: 2px solid var(--text-color);
  border-bottom: 2px solid var(--text-color);
  padding: 16px 0;
  margin-top: 16px;
  background: repeating-linear-gradient(45deg, rgba(0,0,0,0.02), rgba(0,0,0,0.02) 10px, transparent 10px, transparent 20px);
}
.derived-box h4 { margin-top: 0; margin-bottom: 12px; font-family: var(--font-typewriter); letter-spacing: 2px; color: var(--accent-red); }
.derived-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.derived-item { font-family: var(--font-typewriter); }
.muted-text { color: var(--text-muted); font-size: 0.8rem; }

@media (max-width: 500px) {
  .derived-grid { grid-template-columns: 1fr 1fr; }
}
</style>
