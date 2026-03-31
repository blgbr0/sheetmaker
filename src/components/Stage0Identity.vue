<template>
  <div class="stage-identity">
    <div class="grid-2">
      <div class="form-group">
        <label>姓名</label>
        <input type="text" class="input-vintage" v-model="state.basic.name" placeholder="例如：伦道夫·卡特" />
      </div>
      <div class="form-group">
        <label>年龄</label>
        <input type="number" class="input-vintage" v-model="state.basic.age" @change="onAgeChange" min="15" max="90" />
      </div>
      <div class="form-group">
        <label>性别</label>
        <input type="text" class="input-vintage" v-model="state.basic.gender" placeholder="男 / 女 / 其他" />
      </div>
      <div class="form-group">
        <label>时代</label>
        <input type="text" class="input-vintage" v-model="state.basic.era" />
      </div>
      <div class="form-group full-width">
        <label>职业</label>
        <div class="occ-selector" @click="showOccSheet = true">
          <span v-if="state.basic.occupation" class="handwriting">{{ state.basic.occupation }}</span>
          <span v-else class="muted-text">点击选择职业...</span>
        </div>
      </div>
    </div>

    <BottomSheet v-model="showOccSheet" title="职业图鉴">
      <div class="occ-sheet-content">
        <input type="text" class="input-vintage mb-4" v-model="search" placeholder="搜索职业..." />
        <div class="occ-grid">
          <div 
            v-for="occ in filteredOccs" 
            :key="occ.name" 
            class="occ-card"
            :class="{ active: state.occupation.selectedName === occ.name }"
            @click="selectOccupation(occ)"
          >
            <h4>{{ occ.name }}</h4>
            <div class="occ-meta">{{ occ.formula }}</div>
            <div class="occ-skills-preview" :title="occ.skillText || ''">
              {{ occ.skillText || "暂无技能描述" }}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup>
import { inject, ref, computed } from 'vue';
import BottomSheet from './common/BottomSheet.vue';
import { normalizeText } from '../composables/utils.js';

const {
  state,
  runtime,
  applyDerived,
  applyOccupationToState,
  clearAgeAdjustment,
} = inject('coc');

const showOccSheet = ref(false);
const search = ref("");

const filteredOccs = computed(() => {
  if (!search.value) return runtime.occupations;
  const q = normalizeText(search.value);
  return runtime.occupations.filter(o => o.searchText.includes(q));
});

function selectOccupation(occ) {
  const hasOccAllocation = state.skills.some((skill) => Number(skill.occ) > 0);
  const isSwitchingOccupation = Boolean(state.occupation.selectedName) && state.occupation.selectedName !== occ.name;
  let clearOccPoints = true;

  if (hasOccAllocation && isSwitchingOccupation) {
    clearOccPoints = confirm(
      '检测到你已分配职业点。\n点击“确定”：切换职业并清空职业点。\n点击“取消”：切换职业并保留当前职业点。',
    );
  }

  applyOccupationToState(occ, clearOccPoints);
  showOccSheet.value = false;
}

function onAgeChange() {
  clearAgeAdjustment();
  applyDerived();
}
</script>

<style scoped>
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-wrap: wrap; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.full-width { grid-column: 1 / -1; }
label { font-size: 0.85rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

.occ-selector {
  border-bottom: 2px solid var(--border-color);
  padding: 4px;
  cursor: pointer;
  min-height: 32px;
  transition: border-bottom-color 0.2s;
}
.occ-selector:hover { border-bottom-color: var(--accent-red); }
.muted-text { color: rgba(43, 40, 33, 0.4); font-family: var(--font-body); }

.mb-4 { margin-bottom: 16px; width: 100%; border-bottom-style: solid; }
.occ-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.occ-card {
  border: 1px solid var(--border-color);
  padding: 12px; border-radius: 2px; cursor: pointer;
  transition: all 0.2s;
  background: rgba(0,0,0,0.02);
  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.occ-card:hover { background: rgba(0,0,0,0.05); transform: translate(-1px, -1px); box-shadow: 3px 3px 0 rgba(0,0,0,0.2); }
.occ-card.active { border-color: var(--accent-red); background: rgba(110, 11, 11, 0.05); color: var(--accent-red); box-shadow: inset 0 0 4px rgba(139,0,0,0.2); }
.occ-card h4 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.occ-meta {
  font-family: var(--font-typewriter);
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.occ-skills-preview {
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--text-muted);
  word-break: break-word;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

@media (max-width: 500px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
