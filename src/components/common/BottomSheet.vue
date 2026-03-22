<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="sheet-overlay" @click="close"></div>
    </Transition>
    <Transition name="slide-up">
      <div v-if="modelValue" class="sheet-container">
        <div class="sheet-header">
          <div class="sheet-drag-handle"></div>
          <h3 v-if="title">{{ title }}</h3>
          <button class="sheet-close" @click="close">×</button>
        </div>
        <div class="sheet-body">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: String
});
const emit = defineEmits(['update:modelValue']);
function close() { emit('update:modelValue', false); }
</script>

<style scoped>
.sheet-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 100;
  backdrop-filter: blur(2px);
}
.sheet-container {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--bg-darker);
  border-top-left-radius: 16px; border-top-right-radius: 16px;
  padding: 16px; z-index: 101;
  max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  border-top: 1px solid var(--border-color);
}
.sheet-header {
  display: flex; flex-direction: column; align-items: center; position: relative;
  margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-color);
}
.sheet-drag-handle { width: 40px; height: 4px; background: rgba(0,0,0,0.2); border-radius: 2px; margin-bottom: 12px; }
.sheet-header h3 { margin: 0; font-size: 1.1rem; }
.sheet-close {
  position: absolute; right: 0; top: 0;
  background: none; border: none; font-size: 1.5rem; color: var(--text-color);
  cursor: pointer; padding: 4px; line-height: 1;
}
.sheet-body { overflow-y: auto; flex: 1; margin: 0 -8px; padding: 0 8px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
