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
  border: 2px solid var(--text-color); border-radius: 8px;
  padding: 8px 12px; background: rgba(255,255,255,0.4);
  min-width: 60px; margin: 4px;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  transition: transform 0.1s;
}
.dice-wrapper.rolling {
  transform: translateY(-2px) scale(1.05);
  border-color: var(--accent-red);
  color: var(--accent-red);
  box-shadow: 4px 4px 8px rgba(139,0,0,0.2);
}
.dice-value { font-family: var(--font-typewriter); font-size: 1.5rem; font-weight: bold; }
.dice-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; color: var(--text-muted); }
</style>
