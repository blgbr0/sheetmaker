<template>
  <div class="app-container">
    <div class="creepy-vignette"></div>
    
    <header class="app-header">
      <h1 class="stamp glitch-hover">绝密档案 / CLASSIFIED</h1>
      <p class="typewriter top-secret">Miskatonic University Dept. of Anomalous Affairs</p>
      
      <div class="stage-pills mt-4">
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
        <div class="paper-clip"></div>
        <h2 class="section-title typewriter glitch-hover">{{ STAGES[state.stage].title }}</h2>
        <p class="muted instruction-text">{{ STAGES[state.stage].goal }}</p>

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
      <button class="btn-vintage" @click="prevStage" :disabled="state.stage === 0">◀ 返回上一卷</button>
      <button class="btn-vintage primary" @click="nextStage" :disabled="state.stage === STAGES.length - 1">继续阅览 ▶</button>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, provide } from 'vue';
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
  if (state.stage < STAGES.length - 1) state.stage++;
}
</script>

<style scoped>
.app-container {
  max-width: 850px;
  margin: 0 auto;
  padding: 24px 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
}
.creepy-vignette {
  position: fixed; inset: 0; pointer-events: none; z-index: 1000;
  box-shadow: inset 0 0 150px rgba(0,0,0,0.9);
}

.app-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
}
.app-header h1 {
  font-size: 2.8rem;
  margin-bottom: 8px;
  transform: rotate(-2deg);
}
.top-secret {
  color: var(--accent-red);
  font-weight: bold;
  letter-spacing: 2px;
  border-bottom: 1px solid var(--accent-red);
  display: inline-block;
  padding-bottom: 4px;
  opacity: 0.8;
}

.stage-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}
.pill {
  background: rgba(26, 22, 20, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 6px 16px;
  border-radius: 4px;
  font-family: var(--font-typewriter);
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 2px 2px 0 var(--border-color);
}
.pill:hover {
  background: rgba(26, 22, 20, 0.1);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--text-muted);
}
.pill.active {
  background: var(--text-color);
  color: var(--bg-color);
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.5);
  border-color: var(--text-color);
  transform: translate(1px, 1px);
}

.app-main { flex: 1; position: relative; }

.paper-clip {
  position: absolute; top: -15px; left: 40px;
  width: 14px; height: 50px;
  border: 3px solid #7c858e; border-radius: 10px;
  background: transparent;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  z-index: 20; transform: rotate(8deg);
}
.paper-clip::after {
  content: ''; position: absolute;
  top: 5px; left: 2px; width: 4px; height: 35px;
  border: 3px solid #7c858e; border-radius: 10px; border-top: none;
}

.section-title {
  font-size: 2rem; border-bottom: 2px solid var(--text-color);
  padding-bottom: 8px; margin-bottom: 8px; display: inline-block;
}
.instruction-text {
  font-family: var(--font-handwriting); font-size: 1.3rem; color: var(--accent-blue);
  opacity: 0.8; margin-bottom: 24px; max-width: 80%;
}

.app-footer {
  display: flex; justify-content: space-between; margin-top: 24px; padding-bottom: 40px;
}

.mt-4 { margin-top: 24px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease, filter 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; filter: blur(4px); }
</style>
