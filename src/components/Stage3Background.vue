<template>
  <div class="stage-bg">
    <div class="form-group mb-3">
      <label>个人描述 (形象等)</label>
      <textarea class="textarea-vintage" v-model="state.background.desc" rows="2"></textarea>
    </div>
    <div class="form-group mb-3">
      <label>思想与信念</label>
      <textarea class="textarea-vintage" v-model="state.background.belief" rows="2"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group mb-3">
        <label>重要之人</label>
        <input class="input-vintage" v-model="state.background.importantPerson" />
      </div>
      <div class="form-group mb-3">
        <label>意义之地</label>
        <input class="input-vintage" v-model="state.background.importantPlace" />
      </div>
      <div class="form-group mb-3">
        <label>珍视之物</label>
        <input class="input-vintage" v-model="state.background.treasure" />
      </div>
      <div class="form-group mb-3">
        <label>性格特质</label>
        <input class="input-vintage" v-model="state.background.traits" />
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group mb-3">
        <label>现金</label>
        <input class="input-vintage" v-model="state.background.cash" />
      </div>
      <div class="form-group mb-3">
        <label>资产</label>
        <input class="input-vintage" v-model="state.background.assets" />
      </div>
    </div>
    <div class="form-group mb-3">
      <label>随身物品与装备</label>
      <textarea class="textarea-vintage" v-model="state.background.items" rows="3"></textarea>
    </div>
    <div class="experience-pack-box">
      <div class="pack-head">
        <strong>经历包</strong>
        <span class="muted-text">来自 Excel 的可选规则</span>
      </div>
      <div class="pack-grid">
        <button
          v-for="pack in runtime.experiencePacks"
          :key="pack.id"
          class="pack-card"
          :class="{ active: state.background.experiencePackId === pack.id }"
          @click="selectExperiencePack(pack.id)"
        >
          <div class="pack-title">{{ pack.name }}</div>
          <div class="pack-meta" v-if="pack.initialAge">年龄：{{ pack.initialAge }}</div>
          <div class="pack-meta" v-if="pack.sanityLoss">理智：{{ pack.sanityLoss }}</div>
          <div class="pack-meta" v-if="pack.skillGrowth">成长：{{ pack.skillGrowth }}</div>
        </button>
      </div>
      <div v-if="selectedExperiencePack" class="pack-detail">
        <div class="pack-detail-title">{{ selectedExperiencePack.name }}</div>
        <div v-for="(line, idx) in selectedPackLines" :key="idx" class="pack-detail-line">{{ line }}</div>
      </div>
    </div>
    <div class="key-link-box" :class="{ warning: !state.background.keyLinkType }">
      <div class="form-group mb-3">
        <label>关键链接</label>
        <select class="input-vintage" v-model="state.background.keyLinkType">
          <option value="">请选择关键链接</option>
          <option value="信念">信念</option>
          <option value="重要之人">重要之人</option>
          <option value="意义之地">意义之地</option>
          <option value="珍视之物">珍视之物</option>
          <option value="特质">特质</option>
        </select>
      </div>
      <div class="form-group">
        <label>关键链接说明</label>
        <input class="input-vintage" v-model="state.background.keyLinkDetail" placeholder="写一句关键链接说明" />
      </div>
      <div v-if="!state.background.keyLinkType" class="warning-text">背景已填写时，建议至少选择一个关键链接。</div>
    </div>

    <h4 class="mt-4">武器选择</h4>
    <button class="btn-vintage" @click="pickerOpen = !pickerOpen">{{ pickerOpen ? "收起武器选择器" : "添加武器" }}</button>
    <div v-if="pickerOpen" class="picker-box mt-3">
      <div class="grid-3">
        <div class="form-group">
          <label>时代</label>
          <select class="input-vintage" v-model="eraFilter">
            <option value="">全部时代</option>
            <option v-for="x in eraOptions" :key="`era-${x}`" :value="x">{{ x }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>种类</label>
          <select class="input-vintage" v-model="typeFilter">
            <option value="">全部种类</option>
            <option v-for="x in typeOptions" :key="`type-${x}`" :value="x">{{ x }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>技能</label>
          <select class="input-vintage" v-model="skillFilter">
            <option value="">全部技能</option>
            <option v-for="x in skillOptions" :key="`skill-${x}`" :value="x">{{ x }}</option>
          </select>
        </div>
      </div>
      <div class="form-group mt-3">
        <label>搜索</label>
        <input class="input-vintage" v-model="weaponSearch" placeholder="武器名/伤害/射程..." />
      </div>
      <div class="weapon-grid mt-3">
        <div
          v-for="w in filteredWeapons"
          :key="w.id"
          class="weapon-card"
          @click="addWeapon(w)"
        >
          <div class="weapon-name">{{ w.name }}</div>
          <div class="weapon-meta">{{ w.skill }} | {{ w.damage }} | {{ w.range }}</div>
          <div class="weapon-meta">{{ w.type || "常规" }} <span v-if="w.era">| {{ w.era }}</span></div>
        </div>
      </div>
      <div v-if="filteredWeapons.length === 0" class="muted-text mt-3">没有符合筛选条件的武器。</div>
    </div>
    
    <div class="equipped-box mt-4">
      <h4>已装备</h4>
      <div v-if="state.selectedWeapons.length === 0" class="muted-text">暂无武器</div>
      <div v-for="(w, idx) in state.selectedWeapons" :key="idx" class="equipped-weapon">
        <span><strong>{{ w.name }}</strong> ×{{ w.count || 1 }}</span>
        <button class="btn-vintage btn-sm" @click="removeWeapon(idx)">移除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, computed } from 'vue';
import { normalizeText } from '../composables/utils.js';
const { state, runtime, selectExperiencePack, getSelectedExperiencePack, getExperiencePackSummary } = inject('coc');
const pickerOpen = ref(false);
const eraFilter = ref("");
const typeFilter = ref("");
const skillFilter = ref("");
const weaponSearch = ref("");

const eraOptions = computed(() =>
  Array.from(new Set(runtime.weapons.map((w) => String(w.era || "").trim()).filter(Boolean))).sort(),
);
const typeOptions = computed(() =>
  Array.from(new Set(runtime.weapons.map((w) => String(w.type || "").trim()).filter(Boolean))).sort(),
);
const skillOptions = computed(() =>
  Array.from(new Set(runtime.weapons.map((w) => String(w.skill || "").trim()).filter(Boolean))).sort(),
);

const filteredWeapons = computed(() => {
  const q = normalizeText(weaponSearch.value);
  return runtime.weapons.filter((w) => {
    if (eraFilter.value && !String(w.era || "").includes(eraFilter.value)) return false;
    if (typeFilter.value && String(w.type || "") !== typeFilter.value) return false;
    if (skillFilter.value && String(w.skill || "") !== skillFilter.value) return false;
    if (!q) return true;
    return normalizeText(`${w.name} ${w.skill} ${w.damage} ${w.range} ${w.type} ${w.era}`).includes(q);
  });
});

const selectedExperiencePack = computed(() => getSelectedExperiencePack());
const selectedPackLines = computed(() => getExperiencePackSummary(selectedExperiencePack.value));

function addWeapon(w) {
  const existing = state.selectedWeapons.find(x => x.id === w.id);
  if (existing) existing.count = (existing.count || 1) + 1;
  else state.selectedWeapons.push({ ...w, count: 1 });
}

function removeWeapon(idx) {
  const w = state.selectedWeapons[idx];
  if ((w.count || 1) > 1) w.count--;
  else state.selectedWeapons.splice(idx, 1);
}
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: 4px; }
label { font-size: 0.85rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
.textarea-vintage {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: var(--font-handwriting);
  font-size: 1.1rem;
  color: var(--accent-blue);
  padding: 8px;
  resize: vertical;
}
.textarea-vintage:focus { outline: 1px dashed var(--text-color); }
.mb-3 { margin-bottom: 12px; }
.mt-4 { margin-top: 24px; margin-bottom: 12px; }
.mt-3 { margin-top: 12px; }

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.input-vintage {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  color: var(--accent-blue);
  font-family: var(--font-handwriting);
  font-size: 1.1rem;
  padding: 4px;
}
.input-vintage:focus { outline: 1px dashed var(--text-color); }

.key-link-box {
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 12px;
}
.key-link-box.warning {
  border-color: #b00020;
  background: rgba(176, 0, 32, 0.06);
}
.warning-text { color: #8b0000; font-size: 0.85rem; margin-top: 4px; }

.experience-pack-box {
  margin: 10px 0 14px;
  padding: 12px;
  border: 1px solid rgba(28, 61, 90, 0.16);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.45), rgba(228,216,188,0.5));
}
.pack-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}
.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.pack-card {
  text-align: left;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.55);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.pack-card:hover {
  transform: translateY(-1px);
  border-color: rgba(139, 0, 0, 0.35);
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
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
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,0.6);
  border: 1px dashed rgba(0,0,0,0.15);
}
.pack-detail-title {
  font-weight: 700;
  margin-bottom: 6px;
}
.pack-detail-line {
  font-size: 0.86rem;
  color: var(--text-color);
  margin-bottom: 4px;
  line-height: 1.45;
}

.picker-box {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  background: rgba(255,255,255,0.3);
}

.weapon-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;
  max-height: 200px; overflow-y: auto; padding: 4px;
  border: 1px solid var(--border-color); border-radius: 4px; background: rgba(0,0,0,0.03);
}
.weapon-card {
  padding: 8px; background: var(--bg-color); border: 1px solid var(--border-color);
  border-radius: 2px; cursor: pointer; transition: all 0.2s;
}
.weapon-card:hover { border-color: var(--accent-red); box-shadow: 2px 2px 0 rgba(139,0,0,0.1); }
.weapon-name { font-weight: bold; font-family: var(--font-body); }
.weapon-meta { font-family: var(--font-typewriter); font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

.equipped-box { background: rgba(139, 0, 0, 0.05); padding: 16px; border-radius: 4px; border-left: 4px solid var(--accent-red); }
.equipped-box h4 { margin-top: 0; margin-bottom: 12px; }
.equipped-weapon {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px; border-bottom: 1px dashed var(--border-color);
}
.btn-sm { padding: 2px 8px; font-size: 0.8rem; }
.muted-text { color: var(--text-muted); font-size: 0.9rem; }

@media (max-width: 680px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
}
</style>
