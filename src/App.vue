<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="stamp">调查员档案</h1>
      <p class="app-subtitle">CoC7 车卡器 · 面向手机的顺滑流程</p>
      <div class="stage-pills">
        <button 
          v-for="(s, i) in STAGES" 
          :key="i"
          class="pill" 
          :class="{ active: state.stage === i }"
          @click="gotoStage(i)"
        >{{ s.label }}</button>
      </div>
    </header>
    
    <main class="app-main">
      <VintagePaper>
        <div class="paper-head">
          <div>
            <h2>{{ STAGES[state.stage].title }}</h2>
            <p class="muted">{{ STAGES[state.stage].goal }}</p>
          </div>
          <div class="stage-mark">{{ STAGES[state.stage].label }}</div>
        </div>

        <Transition name="fade" mode="out-in">
          <Stage0Identity v-if="state.stage === 0" />
          <Stage1Attributes v-else-if="state.stage === 1" />
          <Stage2Skills v-else-if="state.stage === 2" />
          <Stage3Background v-else-if="state.stage === 3" />
          <Stage4Export v-else-if="state.stage === 4" />
        </Transition>
      </VintagePaper>
    </main>

    <footer class="app-footer">
      <button class="btn-vintage" @click="prevStage" :disabled="state.stage === 0">◀ 上一步</button>
      <button class="btn-vintage primary" @click="nextStage" :disabled="state.stage === STAGES.length - 1">下一步 ▶</button>
    </footer>
  </div>
</template>

<script setup>
import { provide, onMounted } from 'vue';
import { useCoCLogic } from './composables/useCoCLogic.js';
import { STAGES } from './composables/constants.js';
import VintagePaper from './components/common/VintagePaper.vue';
import Stage0Identity from './components/Stage0Identity.vue';
import Stage1Attributes from './components/Stage1Attributes.vue';
import Stage2Skills from './components/Stage2Skills.vue';
import Stage3Background from './components/Stage3Background.vue';
import Stage4Export from './components/Stage4Export.vue';

const coc = useCoCLogic();
const { state } = coc;

provide('coc', coc);

onMounted(() => {
  coc.initRuntimeData();
});

function gotoStage(i) {
  state.stage = i;
}

function prevStage() {
  if (state.stage > 0) state.stage--;
}

function nextStage() {
  if (state.stage === 2) {
    const warnings = coc.getSkillRuleWarnings();
    if (warnings.hasWarnings) {
      const lines = [...warnings.summary];
      Object.entries(warnings.bySkill)
        .slice(0, 6)
        .forEach(([skillKey, issues]) => {
          const skillName = state.skills.find((s) => s.key === skillKey)?.name || skillKey;
          lines.push(`${skillName}: ${issues.join("；")}`);
        });
      const detailText = lines.length ? `\n- ${lines.join("\n- ")}` : "";
      alert(`检测到规则提醒（不会阻止你继续）：${detailText}`);
    }
  }
  if (state.stage === 3 && !state.background.keyLinkType) {
    alert("提醒：你还没有选择“关键链接”，建议补充后再导出（不会阻止继续）。");
  }
  if (state.stage < STAGES.length - 1) state.stage++;
}
</script>

<style scoped>
.app-container {
  max-width: 980px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  text-align: center;
  margin-bottom: 18px;
}
.app-header h1 {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  margin-bottom: 8px;
}
.app-subtitle {
  color: var(--text-muted);
  margin-bottom: 16px;
  letter-spacing: 0.08em;
}
.stage-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.pill {
  background: rgba(255,255,255,0.45);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 14px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}
.pill.active {
  background: linear-gradient(180deg, var(--accent-red), #6f0000);
  color: #fff8ee;
  border-color: rgba(111, 0, 0, 0.8);
  box-shadow: 0 8px 20px rgba(139, 0, 0, 0.18);
}
.app-main {
  flex: 1;
}
.app-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-bottom: 24px;
  gap: 12px;
}
.muted {
  color: var(--text-muted);
  font-style: italic;
  margin-bottom: 16px;
}
.paper-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.paper-head h2 {
  margin-bottom: 4px;
}
.stage-mark {
  white-space: nowrap;
  font-size: 0.78rem;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(139, 0, 0, 0.18);
  color: var(--accent-red);
  background: rgba(139, 0, 0, 0.05);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 680px) {
  .app-container {
    padding: 12px;
  }
  .paper-head {
    flex-direction: column;
  }
  .app-footer {
    flex-direction: column;
  }
}
</style>
