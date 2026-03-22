<template>
  <div class="stage-attributes">
    <div class="actions-bar">
      <button class="btn-vintage primary" @click="rollAllAttrs">全部按规则重掷 🎲</button>
      <button class="btn-vintage" @click="quickAssign">快速分配 (80,70,60...)</button>
      <button class="btn-vintage" @click="quickAssignByTotal(450)">快速分配总和 450（不含幸运）</button>
      <button class="btn-vintage" @click="quickAssignByTotal(480)">快速分配总和 480（不含幸运）</button>
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
          <button v-if="attr === 'Luck'" class="btn-roll-single" @click="rerollLuck">🎲</button>
        </div>
        <div class="attr-rates">
          <span>困难 {{ getAttrHalf(attr) }}</span>
          <span>极难 {{ getAttrFifth(attr) }}</span>
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
import { inject } from 'vue';
import { ATTR_ORDER } from '../composables/constants.js';
import { roll } from '../composables/utils.js';

const { state, applyDerived, enforceSkillLimits, rollAllAttrs, getAttrHalf, getAttrFifth } = inject('coc');

function onAttrChange() {
  applyDerived();
  enforceSkillLimits();
}

function quickAssign() {
  const vals = [80, 70, 60, 60, 50, 50, 50, 40].sort(() => Math.random() - 0.5);
  ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].forEach((k, i) => (state.attrs[k] = vals[i]));
  state.attrs.Luck = roll(3, 6).sum * 5;
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
  onAttrChange();
}

function rerollLuck() {
  state.attrs.Luck = roll(3, 6).sum * 5;
  onAttrChange();
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
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.4);
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

.derived-box {
  border-top: 1px dashed var(--border-color);
  padding-top: 16px;
}
.derived-box h4 { margin-top: 0; margin-bottom: 12px; }
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
