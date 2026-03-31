import {
  SKILL_EXPORT_ROWS,
  KEY_LINK_CELL_MAP,
  LEFT_COLUMNS,
  RIGHT_COLUMNS,
  ATTRIBUTE_INPUT_CELLS,
  SPECIALIZATION_CELL_MAP
} from './exportConfig.js';
import {
  loadTemplateZip,
  readXmlFromZip,
  setWorkbookForceRecalc,
  setWorksheetCell,
  writeXmlToZip,
  generateZipBlob
} from './excelXml.js';

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

function buildBioText(state, selectedExperiencePack, getExperiencePackSummary) {
  const lines = [];
  if (state.background.desc) lines.push(`形象描述：${state.background.desc}`);
  if (state.background.belief) lines.push(`思想与信念：${state.background.belief}`);
  if (state.background.importantPerson) lines.push(`重要之人：${state.background.importantPerson}`);
  if (state.background.importantPlace) lines.push(`意义非凡之地：${state.background.importantPlace}`);
  if (state.background.treasure) lines.push(`宝贵之物：${state.background.treasure}`);
  if (state.background.traits) lines.push(`特质：${state.background.traits}`);
  if (selectedExperiencePack) {
    lines.push(`经历包：${selectedExperiencePack.name}`);
    getExperiencePackSummary(selectedExperiencePack).forEach((line) => lines.push(line));
  }
  if (state.background.keyLinkType || state.background.keyLinkDetail) {
    lines.push(`关键连接：${state.background.keyLinkType || "未指定"}${state.background.keyLinkDetail ? ` - ${state.background.keyLinkDetail}` : ""}`);
  }
  return lines.join('\n');
}

function buildEquipmentLines(state) {
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

function fillBasicInfo(write, state, runtime) {
  const occ = runtime.occupations.find((item) => item.name === state.basic.occupation || item.name === state.occupation.selectedName);
  const sequence = occ?.sequence || "";

  write('L3', state.basic.name || "", null, '姓名');
  write('L4', "", null, '占位字段');
  write('P4', state.basic.era || "", null, '时代');
  write('L5', state.basic.occupation || "", null, '职业名称');
  write('P5', sequence, null, '职业序号');
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

function fillSkillTable(write, state, runtime, getSkillTotal) {
  const skillByKey = new Map(state.skills.map((skill) => [skill.key, skill]));

  Object.entries(SKILL_EXPORT_ROWS).forEach(([key, config]) => {
    const skill = skillByKey.get(key);
    if (!skill) return;
    const cols = config.side === 'left' ? LEFT_COLUMNS : RIGHT_COLUMNS;
    const row = config.row;
    write(`${cols.occPts}${row}`, Number(skill.occ) || 0, 'n', `${key} 职业点`);
    write(`${cols.intPts}${row}`, (Number(skill.interest) || 0) + (Number(skill.exp) || 0), 'n', `${key} 兴趣点+经历点`);

    const specCell = SPECIALIZATION_CELL_MAP[key] || (config.specializationCell ? `${config.specializationCell}${row}` : "");
    if (specCell) write(specCell, skill.specialization || "", null, `${key} 子类`);
  });

  const occInfo = runtime.occupations.find((item) => item.name === state.basic.occupation || item.name === state.occupation.selectedName) || null;
  write('B57', state.occupation.creditRatingRange ? `${state.occupation.creditRatingRange.min}-${state.occupation.creditRatingRange.max}` : (occInfo?.creditRatingRange ? `${occInfo.creditRatingRange.min}-${occInfo.creditRatingRange.max}` : ""), null, '信用评级范围');
  write('E57', Math.max(0, (state.pools.occupation || 0) - (state.pools.occSpent || 0)), 'n', '职业点剩余');
  write('G57', Math.max(0, ((state.pools.interest || 0) + (state.pools.experience || 0)) - ((state.pools.intSpent || 0) + (state.pools.expSpent || 0))), 'n', '兴趣点与经历点剩余');

  const creditTotal = skillByKey.get('creditRating') ? getSkillTotal(skillByKey.get('creditRating')) : 0;
  write('B60', `信用评级：${formatRateTriplet(creditTotal)}`, null, '信用评级摘要');
}

function fillWeaponTable(write, state) {
  const rows = [54, 55, 56];
  rows.forEach((row, index) => {
    const weapon = state.selectedWeapons[index];
    if (!weapon) {
      write(`K${row}`, "", null, `武器${index + 1}技能`);
      write(`M${row}`, 0, 'n', `武器${index + 1}名称`);
      return;
    }
    write(`K${row}`, weapon.skill || "", null, `武器${index + 1}技能`);

    const weaponId = weapon.name || "";
    write(`M${row}`, weaponId, null, `武器${index + 1}名称`);

    if (weaponId && /^[*\-]/.test(weapon.raw_name || "")) {
      console.warn(`[Export] 武器 "${weaponId}" 原始名含前缀标记（${weapon.raw_name}），VLOOKUP 可能不匹配模板武器列表。`);
    }
  });
}

function fillBackground(write, state, getSkillTotal, selectedExperiencePack, getExperiencePackSummary) {
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

  write('B68', buildBioText(state, selectedExperiencePack, getExperiencePackSummary), null, '背景整合描述');
  const items = buildEquipmentLines(state);
  for (let row = 63; row <= 77; row += 1) {
    write(`X${row}`, items[row - 63] || "", null, '装备清单');
  }

  write('B63', state.background.assets || "", null, '资产摘要');
  write('B60', `信用评级：${formatRateTriplet(creditTotal)}`, null, '信用评级摘要');
}

function fillOccupationNotes(write, state, runtime) {
  const occ = runtime.occupations.find((item) => item.name === state.basic.occupation || item.name === state.occupation.selectedName) || null;
  if (!occ) return;
  const lines = [];
  lines.push(`职业：${occ.name}`);
  lines.push(`职业技能点：${occ.formula}`);
  if (occ.skillText) lines.push(`本职技能：${occ.skillText}`);
  if (occ.recommended_contact || occ.recommendedContact) lines.push(`推荐关系人：${occ.recommended_contact || occ.recommendedContact}`);
  if (occ.intro) lines.push(`职业介绍：${occ.intro}`);
  write('B8', lines.join('\n'), null, '职业说明文本');
}

/**
 * 产生导出 Zip Blob 的纯净逻辑。不涉及文件下载。
 */
export async function generateExportZipBlob(context) {
  const {
    state,
    runtime,
    getSkillTotal,
    getSelectedExperiencePack,
    getExperiencePackSummary,
    templateFile,
    legacyName = "COC七版空白卡G3.5.11.5 (修订版).xlsx"
  } = context;

  const zip = await loadTemplateZip([
    `/${templateFile}`,
    templateFile,
    encodeURI(`/${templateFile}`),
    `/${legacyName}`,
    legacyName,
    encodeURI(`/${legacyName}`),
  ]);
  if (!zip) throw new Error('未找到空白卡模板');

  const workbookDoc = await readXmlFromZip(zip, 'xl/workbook.xml');
  const sheetDoc = await readXmlFromZip(zip, 'xl/worksheets/sheet1.xml');
  const writer = createCellWriter(sheetDoc);

  setWorkbookForceRecalc(workbookDoc);
  
  const selectedExperiencePack = getSelectedExperiencePack();
  fillBasicInfo(writer.write, state, runtime);
  fillSkillTable(writer.write, state, runtime, getSkillTotal);
  fillWeaponTable(writer.write, state);
  fillBackground(writer.write, state, getSkillTotal, selectedExperiencePack, getExperiencePackSummary);
  fillOccupationNotes(writer.write, state, runtime);

  writeXmlToZip(zip, 'xl/workbook.xml', workbookDoc);
  writeXmlToZip(zip, 'xl/worksheets/sheet1.xml', sheetDoc);

  const blob = await generateZipBlob(zip);
  return {
    blob,
    skippedFormulaCells: writer.skippedFormulaCells
  };
}
