<template>
  <div class="vintage-paper">
    <div class="paper-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.vintage-paper {
  background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(243, 234, 216, 0.9));
  border: 1px solid rgba(139, 110, 70, 0.22);
  box-shadow: var(--shadow-strong), inset 0 0 60px rgba(139, 69, 19, 0.04);
  padding: 18px;
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.vintage-paper::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(176, 137, 68, 0.12), transparent 28%),
    radial-gradient(circle at bottom right, rgba(139, 0, 0, 0.06), transparent 34%),
    radial-gradient(circle at center, transparent 40%, rgba(139, 69, 19, 0.04) 100%);
}
</style>
