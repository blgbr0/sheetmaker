<template>
  <div class="stage-export text-center">
    <div class="preview-box">
      <h3 class="typewriter">{{ state.basic.name || '无名氏' }}</h3>
      <p><strong>职业:</strong> {{ state.basic.occupation || '无' }}</p>
      <p><strong>时代:</strong> {{ state.basic.era }}</p>
      <p v-if="selectedExperiencePack" class="muted-text"><strong>经历包:</strong> {{ selectedExperiencePack.name }}</p>
      <p class="muted-text"><strong>职业源:</strong> {{ runtime.occupationSource }}</p>
      <p class="muted-text"><strong>武器源:</strong> {{ runtime.weaponSource }}</p>
      <hr />
      <div class="stats-row">
        <span>HP {{ state.attrs.HP }}</span>
        <span>MP {{ state.attrs.MP }}</span>
        <span>SAN {{ state.attrs.SAN }}</span>
      </div>
      <p class="muted-text mt-3">点击下方按钮，会直接把当前数据写入空白卡模板</p>
    </div>

    <div class="export-actions">
      <button class="btn-vintage primary export-btn" @click="doExport">导出 Excel 角色卡 (.xlsx)</button>
      <div class="mt-3">
        <button class="btn-vintage btn-danger" @click="resetAll">重新捏人与清空</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { saveExportBlob } from '../composables/excelXml.js';
import { generateExportZipBlob } from '../composables/exportLogic.js';

const TEMPLATE_FILE = "templates/coc7-blank-card.xlsx";
const {
  state,
  runtime,
  getSkillTotal,
  getSelectedExperiencePack,
  getExperiencePackSummary,
  clearDraft,
} = inject('coc');

const selectedExperiencePack = computed(() => getSelectedExperiencePack());

function summarizeSkippedFormulaCells(skippedFormulaCells) {
  if (!skippedFormulaCells || !skippedFormulaCells.length) return null;
  const sample = skippedFormulaCells
    .slice(0, 8)
    .map((item) => `${item.ref}(${item.reason || '未命名字段'})`)
    .join(' | ');
  console.info(`[Export] 跳过公式单元格 ${skippedFormulaCells.length} 个。示例：${sample}`);
  return { total: skippedFormulaCells.length };
}

async function doExport() {
  try {
    const { blob, skippedFormulaCells } = await generateExportZipBlob({
      state,
      runtime,
      getSkillTotal,
      getSelectedExperiencePack,
      getExperiencePackSummary,
      templateFile: TEMPLATE_FILE,
      legacyName: "COC七版空白卡G3.5.11.5 (修订版).xlsx"
    });

    const name = (state.basic.name || "调查员").trim();
    const result = await saveExportBlob(blob, `${name}-CoC7角色卡.xlsx`);
    summarizeSkippedFormulaCells(skippedFormulaCells);
    if (result.uri && !result.shared) {
      alert(`已导出到：${result.uri}`);
    }
  } catch (e) {
    alert(`导出失败：${e?.message || "未知错误"}`);
  }
}

function resetAll() {
  if (confirm("确认清空所有内容重新开始吗？")) {
    clearDraft();
    window.location.reload();
  }
}
</script>

<style scoped>
.text-center { text-align: center; }
.preview-box {
  background: var(--bg-darker);
  border: 1px dashed var(--border-color);
  padding: 24px; border-radius: 8px;
  max-width: 400px; margin: 0 auto 32px auto;
}
.preview-box h3 { font-size: 1.8rem; margin-bottom: 8px; color: var(--accent-red); margin-top: 0; }
.preview-box hr { border: 0; border-top: 1px solid var(--border-color); margin: 16px 0; }
.stats-row { display: flex; justify-content: space-around; font-family: var(--font-typewriter); font-weight: bold; }
.muted-text { color: var(--text-muted); font-size: 0.85rem; }
.mt-3 { margin-top: 16px; }

.export-actions { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.export-btn { font-size: 1.2rem; padding: 12px 32px; border-width: 2px; }
.btn-danger { color: #888; border-color: #aaa; }
.btn-danger:hover { color: var(--accent-red); border-color: var(--accent-red); background: rgba(139,0,0,0.1); }
</style>
