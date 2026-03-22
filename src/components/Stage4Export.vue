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

function setCell(doc, addr, value, type = null) {
  setWorksheetCell(doc, addr, value, type);
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

function fillBasicInfo(sheetDoc) {
  setCell(sheetDoc, 'L3', state.basic.name || "");
  setCell(sheetDoc, 'L4', "");
  setCell(sheetDoc, 'P4', state.basic.era || "");
  setCell(sheetDoc, 'L5', state.basic.occupation || "");
  setCell(sheetDoc, 'P5', getOccupationSequence());
  setCell(sheetDoc, 'L6', Number(state.basic.age) || "", Number.isFinite(Number(state.basic.age)) ? 'n' : 's');
  setCell(sheetDoc, 'P6', state.basic.gender || "");
  setCell(sheetDoc, 'L7', state.basic.residence || "");
  setCell(sheetDoc, 'P7', state.basic.birthplace || "");
  setCell(sheetDoc, 'L8', "");
  setCell(sheetDoc, 'P8', state.skills.find((skill) => skill.key === 'languageOwn')?.specialization || "");

  const rawValues = {
    STR: state.attrs.STR,
    DEX: state.attrs.DEX,
    INT: state.attrs.INT,
    CON: state.attrs.CON,
    APP: state.attrs.APP,
    POW: state.attrs.POW,
    SIZ: state.attrs.SIZ,
    EDU: state.attrs.EDU,
    Luck: state.attrs.Luck,
  };
  Object.entries(rawValues).forEach(([key, value]) => {
    const mapping = ATTRIBUTE_INPUT_CELLS[key];
    if (!mapping?.base) return;
    const base = Math.max(0, Number(value) || 0);
    setCell(sheetDoc, mapping.base, base, 'n');
  });
}

function fillSkillTable(ws) {
  const skillByKey = new Map(state.skills.map((skill) => [skill.key, skill]));

  Object.entries(SKILL_EXPORT_ROWS).forEach(([key, config]) => {
    const skill = skillByKey.get(key);
    if (!skill) return;
    const cols = config.side === 'left' ? LEFT_COLUMNS : RIGHT_COLUMNS;
    const row = config.row;
    setCell(ws, `${cols.occPts}${row}`, Number(skill.occ) || 0, 'n');
    setCell(ws, `${cols.intPts}${row}`, Number(skill.interest) || 0, 'n');

    const specCell = SPECIALIZATION_CELL_MAP[key] || (config.specializationCell ? `${config.specializationCell}${row}` : "");
    if (specCell) setCell(ws, specCell, skill.specialization || "");
  });

  const occInfo = getOccupationInfo();
  setCell(ws, 'B57', state.occupation.creditRatingRange ? `${state.occupation.creditRatingRange.min}-${state.occupation.creditRatingRange.max}` : (occInfo?.creditRatingRange ? `${occInfo.creditRatingRange.min}-${occInfo.creditRatingRange.max}` : ""));
  setCell(ws, 'E57', Math.max(0, (state.pools.occupation || 0) - (state.pools.occSpent || 0)), 'n');
  setCell(ws, 'G57', Math.max(0, (state.pools.interest || 0) - (state.pools.intSpent || 0)), 'n');

  const creditTotal = skillByKey.get('creditRating') ? getSkillTotal(skillByKey.get('creditRating')) : 0;
  setCell(ws, 'B60', `信用评级：${formatRateTriplet(creditTotal)}`);
}

function fillWeaponTable(ws) {
  const rows = [54, 55, 56];
  rows.forEach((row, index) => {
    const weapon = state.selectedWeapons[index];
    if (!weapon) {
      setCell(ws, `K${row}`, "");
      setCell(ws, `M${row}`, 0, 'n');
      return;
    }
    setCell(ws, `K${row}`, weapon.skill || "");
    setCell(ws, `M${row}`, weapon.name || "");
  });
}

function fillBackground(ws) {
  const creditSkill = state.skills.find((skill) => skill.key === 'creditRating');
  const creditTotal = creditSkill ? getSkillTotal(creditSkill) : 0;

  setCell(ws, 'F60', `生活水平：${state.background.assets || '未填写'}`);
  setCell(ws, 'C61', state.background.cash || "");
  setCell(ws, 'E61', "");
  setCell(ws, 'G61', state.background.assets || "");
  setCell(ws, 'I61', '美元');

  setCell(ws, 'M62', state.background.desc || "");
  setCell(ws, 'M64', state.background.belief || "");
  setCell(ws, 'M66', state.background.importantPerson || "");
  setCell(ws, 'M68', state.background.importantPlace || "");
  setCell(ws, 'M70', state.background.treasure || "");
  setCell(ws, 'M72', state.background.traits || "");
  setCell(ws, 'M74', "");

  Object.values(KEY_LINK_CELL_MAP).forEach((addr) => setCell(ws, addr, '☐'));
  if (state.background.keyLinkType && KEY_LINK_CELL_MAP[state.background.keyLinkType]) {
    setCell(ws, KEY_LINK_CELL_MAP[state.background.keyLinkType], '☑');
  }

  setCell(ws, 'B68', buildBioText());
  const items = buildEquipmentLines();
  for (let row = 63; row <= 77; row += 1) {
    setCell(ws, `X${row}`, items[row - 63] || "");
  }

  setCell(ws, 'B63', state.background.assets || "");
  setCell(ws, 'B60', `信用评级：${formatRateTriplet(creditTotal)}`);
}

function fillOccupationNotes(ws) {
  const occ = getOccupationInfo();
  if (!occ) return;
  const lines = [];
  lines.push(`职业：${occ.name}`);
  lines.push(`职业技能点：${occ.formula}`);
  if (occ.skillText) lines.push(`本职技能：${occ.skillText}`);
  if (occ.recommended_contact || occ.recommendedContact) lines.push(`推荐关系人：${occ.recommended_contact || occ.recommendedContact}`);
  if (occ.intro) lines.push(`职业介绍：${occ.intro}`);
  setCell(ws, 'B8', lines.join('\n'));
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

    setWorkbookForceRecalc(workbookDoc);
    fillBasicInfo(sheetDoc);
    fillSkillTable(sheetDoc);
    fillWeaponTable(sheetDoc);
    fillBackground(sheetDoc);
    fillOccupationNotes(sheetDoc);

    writeXmlToZip(zip, 'xl/workbook.xml', workbookDoc);
    writeXmlToZip(zip, 'xl/worksheets/sheet1.xml', sheetDoc);

    const blob = await generateZipBlob(zip);
    const name = (state.basic.name || "调查员").trim();
    const result = await saveExportBlob(blob, `${name}-CoC7角色卡.xlsx`);
    if (result.uri && !result.shared) {
      alert(`已导出到：${result.uri}`);
    }
  } catch (e) {
    alert(`导出失败：${e?.message || "未知错误"}`);
  }
}

function resetAll() {
  if (confirm("确认清空所有内容重新开始吗？")) {
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
