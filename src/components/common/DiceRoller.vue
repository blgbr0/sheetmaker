<template>
  <div class="dice-wrapper" :class="{ rolling: isRolling }">
    <div class="dice-value">{{ displayValue }}</div>
    <div v-if="label" class="dice-label">{{ label }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  value: Number,
  label: String,
  faces: { type: Number, default: 100 }
});

const displayValue = ref(props.value || 0);
const isRolling = ref(false);

watch(() => props.value, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  isRolling.value = true;
  let ticks = 0;
  const maxTicks = 15;
  const interval = setInterval(() => {
    displayValue.value = Math.floor(Math.random() * props.faces) + 1;
    ticks++;
    if (ticks > maxTicks) {
      clearInterval(interval);
      displayValue.value = newVal;
      isRolling.value = false;
    }
  }, 40);
});
</script>

<style scoped>
.dice-wrapper {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  border: 2px solid #5a5142; border-radius: 4px; /* Sharper edges */
  padding: 8px 12px; background: rgba(30, 26, 24, 0.85); color: #e6e0d3;
  min-width: 60px; margin: 4px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.6);
  transition: transform 0.1s;
  position: relative;
  overflow: hidden;
}
.dice-wrapper::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at 10% 10%, rgba(139,0,0,0.25), transparent 60%);
}
.dice-wrapper.rolling {
  transform: translateY(-2px) scale(1.05);
  border-color: var(--stamp-red);
  color: #ffcccc;
  text-shadow: 0 0 5px var(--accent-red);
  box-shadow: inset 0 0 15px rgba(139,0,0,0.6), 4px 4px 8px rgba(0,0,0,0.8);
  animation: diceShake 0.1s infinite;
}
@keyframes diceShake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  25% { transform: translate(-1px, -1px) rotate(-3deg); }
  50% { transform: translate(-1px, 1px) rotate(3deg); }
  75% { transform: translate(1px, -1px) rotate(-1deg); }
  100% { transform: translate(1px, 1px) rotate(0deg); }
}
.dice-value { font-family: var(--font-typewriter); font-size: 1.6rem; font-weight: bold; }
.dice-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; color: #9c917c; }
</style>
