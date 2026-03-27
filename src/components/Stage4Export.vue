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
import {
  generateZipBlob,
  loadTemplateZip,
  readXmlFromZip,
  saveExportBlob,
  setWorkbookForceRecalc,
  setWorksheetCell,
  writeXmlToZip
} from '../composables/excelXml.js';

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

const SKILL_EXPORT_ROWS = {
  accounting: { side: 'left', row: 16 },
  anthropology: { side: 'left', row: 17 },
  appraise: { side: 'left', row: 18 },
  archaeology: { side: 'left', row: 19 },
  artCraft: { side: 'left', row: 20, specializationCell: 'N' },
  charm: { side: 'left', row: 23 },
  climb: { side: 'left', row: 24 },
  computerUse: { side: 'left', row: 25 },
  creditRating: { side: 'left', row: 26 },
  cthulhuMythos: { side: 'left', row: 27 },
  disguise: { side: 'left', row: 28 },
  dodge: { side: 'left', row: 29 },
  driveAuto: { side: 'left', row: 30 },
  elecRepair: { side: 'left', row: 31 },
  electronics: { side: 'left', row: 32 },
  fastTalk: { side: 'left', row: 33 },
  fightingBrawl: { side: 'left', row: 34, specializationCell: 'N' },
  firearmsHandgun: { side: 'left', row: 38, specializationCell: 'N' },
  firearmsRifle: { side: 'left', row: 39, specializationCell: 'N' },
  firstAid: { side: 'left', row: 42 },
  history: { side: 'left', row: 43 },
  intimidate: { side: 'left', row: 44 },
  jump: { side: 'left', row: 45 },
  languageOther: { side: 'left', row: 46, specializationCell: 'N' },
  languageOwn: { side: 'left', row: 49, specializationCell: 'N' },
  law: { side: 'right', row: 16 },
  libraryUse: { side: 'right', row: 17 },
  listen: { side: 'right', row: 18 },
  locksmith: { side: 'right', row: 19 },
  mechRepair: { side: 'right', row: 20 },
  medicine: { side: 'right', row: 21 },
  naturalWorld: { side: 'right', row: 22 },
  navigate: { side: 'right', row: 23 },
  occult: { side: 'right', row: 24 },
  operateHeavyMachinery: { side: 'right', row: 25 },
  persuade: { side: 'right', row: 26 },
  pilot: { side: 'right', row: 27 },
  psychoanalysis: { side: 'right', row: 28 },
  psychology: { side: 'right', row: 29 },
  ride: { side: 'right', row: 30 },
  science: { side: 'right', row: 31 },
  sleightOfHand: { side: 'right', row: 34 },
  spotHidden: { side: 'right', row: 35 },
  stealth: { side: 'right', row: 36 },
  survival: { side: 'right', row: 37 },
  swim: { side: 'right', row: 38 },
  throw: { side: 'right', row: 39 },
  track: { side: 'right', row: 40 },
  animalHandling: { side: 'right', row: 41 },
  dive: { side: 'right', row: 42 },
  demolitions: { side: 'right', row: 43 },
  lipReading: { side: 'right', row: 44 },
  hypnosis: { side: 'right', row: 45 },
  artillery: { side: 'right', row: 46 },
  knowledge: { side: 'right', row: 47 },
};

const KEY_LINK_CELL_MAP = {
  信念: 'V64',
  重要之人: 'V66',
  意义之地: 'V68',
  珍视之物: 'V70',
  特质: 'V72',
};

const LEFT_COLUMNS = { occPts: 'R', intPts: 'S' };
const RIGHT_COLUMNS = { occPts: 'AC', intPts: 'AD' };

const ATTRIBUTE_INPUT_CELLS = {
  STR: { base: 'W3' },
  DEX: { base: 'Z3' },
  INT: { base: 'AC3' },
  CON: { base: 'W5' },
  APP: { base: 'Z5' },
  POW: { base: 'AC5' },
  SIZ: { base: 'W7' },
  EDU: { base: 'Z7' },
  Luck: { base: 'V10' },
};

const SPECIALIZATION_CELL_MAP = {
  artCraft: 'N20',
  fightingBrawl: 'N34',
  firearmsHandgun: 'N38',
  firearmsRifle: 'N39',
  languageOther: 'N46',
  languageOwn: 'N49',
  pilot: 'Z27',
  science: 'Z31',
  survival: 'Z37',
};

function normalizeCellRef(addr) {
  return String(addr || '').trim().toUpperCase();
}

function createCellWriter(sheetDoc) {
  const formulaMap = new Map();
  const cells = Array.from(sheetDoc.getElementsByTagNameNS('*', 'c'));
  cells.forEach((cell) => {
    const ref = normalizeCellRef(cell.getAttribute('r'));
    if (!ref) return;
    const formulaNode = cell.getElementsByTagNameNS('*', 'f')[0];
    if (!formulaNode) return;
    formulaMap.set(ref, formulaNode.textContent || '');
  });

  const skippedFormulaCells = [];

  function write(addr, value, type = null, reason = '') {
    const ref = normalizeCellRef(addr);
    if (formulaMap.has(ref)) {
      skippedFormulaCells.push({ ref, reason, formula: formulaMap.get(ref) });
      return false;
    }
    setWorksheetCell(sheetDoc, ref, value, type);
    return true;
  }

  return { write, skippedFormulaCells };
}

function getOccupationSequence() {
  const occ = runtime.occupations.find((item) => item.name === state.basic.occupation || item.name === state.occupation.selectedName);
  return occ?.sequence || "";
}

function getOccupationInfo() {
  return runtime.occupations.find((item) => item.name === state.basic.occupation || item.name === state.occupation.selectedName) || null;
}

function getRateTriplet(total) {
  const safe = Math.max(0, Math.min(999, Number(total) || 0));
  return {
    total: safe,
    half: Math.floor(safe / 2),
    fifth: Math.floor(safe / 5),
  };
}

function formatRateTriplet(total) {
  const triplet = getRateTriplet(total);
  return `${triplet.total}%/${triplet.half}%/${triplet.fifth}%`;
}

function buildBioText() {
  const lines = [];
  if (state.background.desc) lines.push(`形象描述：${state.background.desc}`);
  if (state.background.belief) lines.push(`思想与信念：${state.background.belief}`);
  if (state.background.importantPerson) lines.push(`重要之人：${state.background.importantPerson}`);
  if (state.background.importantPlace) lines.push(`意义非凡之地：${state.background.importantPlace}`);
  if (state.background.treasure) lines.push(`宝贵之物：${state.background.treasure}`);
  if (state.background.traits) lines.push(`特质：${state.background.traits}`);
  if (selectedExperiencePack.value) {
    lines.push(`经历包：${selectedExperiencePack.value.name}`);
    getExperiencePackSummary(selectedExperiencePack.value).forEach((line) => lines.push(line));
  }
  if (state.background.keyLinkType || state.background.keyLinkDetail) {
    lines.push(`关键连接：${state.background.keyLinkType || "未指定"}${state.background.keyLinkDetail ? ` - ${state.background.keyLinkDetail}` : ""}`);
  }
  return lines.join('\n');
}

function buildEquipmentLines() {
  const lines = [];
  String(state.background.items || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => lines.push(line));

  state.selectedWeapons.forEach((weapon) => {
    const count = weapon.count || 1;
    const suffix = count > 1 ? ` x${count}` : "";
    lines.push(`${weapon.name || '武器'}${suffix}`);
  });

  return lines.slice(0, 15);
}

function fillBasicInfo(write) {
  write('L3', state.basic.name || "", null, '姓名');
  write('L4', "", null, '占位字段');
  write('P4', state.basic.era || "", null, '时代');
  write('L5', state.basic.occupation || "", null, '职业名称');
  write('P5', getOccupationSequence(), null, '职业序号');
  write('L6', Number(state.basic.age) || "", Number.isFinite(Number(state.basic.age)) ? 'n' : 's', '年龄');
  write('P6', state.basic.gender || "", null, '性别');
  write('L7', state.basic.residence || "", null, '居住地');
  write('P7', state.basic.birthplace || "", null, '出生地');
  write('L8', "", null, '预留字段');
  write('P8', state.skills.find((skill) => skill.key === 'languageOwn')?.specialization || "", null, '母语子类');

  const rawValues = {
    STR: state.attrs.STR,
    DEX: state.attrs.DEX,
    INT: state.attrs.INT,
    CON: state.attrs.CON,
    APP: state.attrs.APP,
    POW: state.attrs.POW,
    SIZ: state.attrs.SIZ,
    EDU: state.attrs.EDU,
  };
  Object.entries(rawValues).forEach(([key, value]) => {
    const mapping = ATTRIBUTE_INPUT_CELLS[key];
    if (!mapping?.base) return;
    const base = Math.max(0, Number(value) || 0);
    write(mapping.base, base, 'n', `${key} 基础值`);
  });

  const luckValue = Math.max(0, Number(state.attrs.Luck) || 0);
  const wroteLuck = write(ATTRIBUTE_INPUT_CELLS.Luck.base, luckValue, 'n', 'Luck 当前值');
  if (!wroteLuck) {
    write('T7', luckValue, 'n', 'Luck 回填输入位');
  }
}

function fillSkillTable(write) {
  const skillByKey = new Map(state.skills.map((skill) => [skill.key, skill]));

  Object.entries(SKILL_EXPORT_ROWS).forEach(([key, config]) => {
    const skill = skillByKey.get(key);
    if (!skill) return;
    const cols = config.side === 'left' ? LEFT_COLUMNS : RIGHT_COLUMNS;
    const row = config.row;
    write(`${cols.occPts}${row}`, Number(skill.occ) || 0, 'n', `${key} 职业点`);
    write(`${cols.intPts}${row}`, Number(skill.interest) || 0, 'n', `${key} 兴趣点`);

    const specCell = SPECIALIZATION_CELL_MAP[key] || (config.specializationCell ? `${config.specializationCell}${row}` : "");
    if (specCell) write(specCell, skill.specialization || "", null, `${key} 子类`);
  });

  const occInfo = getOccupationInfo();
  write('B57', state.occupation.creditRatingRange ? `${state.occupation.creditRatingRange.min}-${state.occupation.creditRatingRange.max}` : (occInfo?.creditRatingRange ? `${occInfo.creditRatingRange.min}-${occInfo.creditRatingRange.max}` : ""), null, '信用评级范围');
  write('E57', Math.max(0, (state.pools.occupation || 0) - (state.pools.occSpent || 0)), 'n', '职业点剩余');
  write('G57', Math.max(0, (state.pools.interest || 0) - (state.pools.intSpent || 0)), 'n', '兴趣点剩余');

  const creditTotal = skillByKey.get('creditRating') ? getSkillTotal(skillByKey.get('creditRating')) : 0;
  write('B60', `信用评级：${formatRateTriplet(creditTotal)}`, null, '信用评级摘要');
}

function fillWeaponTable(write) {
  const rows = [54, 55, 56];
  rows.forEach((row, index) => {
    const weapon = state.selectedWeapons[index];
    if (!weapon) {
      write(`K${row}`, "", null, `武器${index + 1}技能`);
      write(`M${row}`, 0, 'n', `武器${index + 1}名称`);
      return;
    }
    write(`K${row}`, weapon.skill || "", null, `武器${index + 1}技能`);
    write(`M${row}`, weapon.name || "", null, `武器${index + 1}名称`);
  });
}

function fillBackground(write) {
  const creditSkill = state.skills.find((skill) => skill.key === 'creditRating');
  const creditTotal = creditSkill ? getSkillTotal(creditSkill) : 0;

  write('F60', `生活水平：${state.background.assets || '未填写'}`, null, '生活水平');
  write('C61', state.background.cash || "", null, '现金');
  write('E61', "", null, '留空字段');
  write('G61', state.background.assets || "", null, '资产');
  write('I61', '美元', null, '货币单位');

  write('M62', state.background.desc || "", null, '形象描述');
  write('M64', state.background.belief || "", null, '思想与信念');
  write('M66', state.background.importantPerson || "", null, '重要之人');
  write('M68', state.background.importantPlace || "", null, '意义之地');
  write('M70', state.background.treasure || "", null, '珍视之物');
  write('M72', state.background.traits || "", null, '特质');
  write('M74', "", null, '额外背景');

  Object.values(KEY_LINK_CELL_MAP).forEach((addr) => write(addr, '☐', null, '关键链接勾选'));
  if (state.background.keyLinkType && KEY_LINK_CELL_MAP[state.background.keyLinkType]) {
    write(KEY_LINK_CELL_MAP[state.background.keyLinkType], '☑', null, '关键链接勾选');
  }

  write('B68', buildBioText(), null, '背景整合描述');
  const items = buildEquipmentLines();
  for (let row = 63; row <= 77; row += 1) {
    write(`X${row}`, items[row - 63] || "", null, '装备清单');
  }

  write('B63', state.background.assets || "", null, '资产摘要');
  write('B60', `信用评级：${formatRateTriplet(creditTotal)}`, null, '信用评级摘要');
}

function fillOccupationNotes(write) {
  const occ = getOccupationInfo();
  if (!occ) return;
  const lines = [];
  lines.push(`职业：${occ.name}`);
  lines.push(`职业技能点：${occ.formula}`);
  if (occ.skillText) lines.push(`本职技能：${occ.skillText}`);
  if (occ.recommended_contact || occ.recommendedContact) lines.push(`推荐关系人：${occ.recommended_contact || occ.recommendedContact}`);
  if (occ.intro) lines.push(`职业介绍：${occ.intro}`);
  write('B8', lines.join('\n'), null, '职业说明文本');
}

function summarizeSkippedFormulaCells(skippedFormulaCells) {
  if (!skippedFormulaCells.length) return null;
  const sample = skippedFormulaCells
    .slice(0, 8)
    .map((item) => `${item.ref}(${item.reason || '未命名字段'})`)
    .join(' | ');
  console.info(`[Export] 跳过公式单元格 ${skippedFormulaCells.length} 个。示例：${sample}`);
  return { total: skippedFormulaCells.length };
}

async function doExport() {
  try {
    const legacyName = "COC七版空白卡G3.5.11.5 (修订版).xlsx";
    const zip = await loadTemplateZip([
      `/${TEMPLATE_FILE}`,
      TEMPLATE_FILE,
      encodeURI(`/${TEMPLATE_FILE}`),
      `/${legacyName}`,
      legacyName,
      encodeURI(`/${legacyName}`),
    ]);
    if (!zip) throw new Error('未找到空白卡模板');

    const workbookDoc = await readXmlFromZip(zip, 'xl/workbook.xml');
    const sheetDoc = await readXmlFromZip(zip, 'xl/worksheets/sheet1.xml');
    const writer = createCellWriter(sheetDoc);

    setWorkbookForceRecalc(workbookDoc);
    fillBasicInfo(writer.write);
    fillSkillTable(writer.write);
    fillWeaponTable(writer.write);
    fillBackground(writer.write);
    fillOccupationNotes(writer.write);

    writeXmlToZip(zip, 'xl/workbook.xml', workbookDoc);
    writeXmlToZip(zip, 'xl/worksheets/sheet1.xml', sheetDoc);

    const blob = await generateZipBlob(zip);
    const name = (state.basic.name || "调查员").trim();
    const result = await saveExportBlob(blob, `${name}-CoC7角色卡.xlsx`);
    summarizeSkippedFormulaCells(writer.skippedFormulaCells);
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
