<template>
  <div class="vintage-paper">
    <div class="paper-texture"></div>
    <div class="paper-stains"></div>
    <div class="paper-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.vintage-paper {
  background-color: var(--bg-color);
  border: 1px solid #948770;
  /* Deep shadows to make it look like a thick dossier on a desk */
  box-shadow: 
    5px 10px 25px rgba(0, 0, 0, 0.4), 
    inset 0 0 60px rgba(92, 70, 48, 0.2),
    inset 0 0 20px rgba(0,0,0,0.1);
  padding: 24px;
  border-radius: 2px 6px 4px 3px; /* Slightly uneven corners */
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.paper-texture {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.03) 28px);
  z-index: 1;
}

.paper-stains {
  position: absolute;
  top: -50px; left: -50px; right: -50px; bottom: -50px;
  pointer-events: none;
  background: 
    radial-gradient(circle at 10% 20%, rgba(139, 69, 19, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(0, 0, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 90% 10%, rgba(110, 11, 11, 0.05) 0%, transparent 30%); /* Subtle blood stain */
  z-index: 2;
  mix-blend-mode: multiply;
}

.paper-content {
  position: relative;
  z-index: 10;
}
</style>
