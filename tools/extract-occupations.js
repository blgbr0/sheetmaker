import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "data");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "occupations.from_excel.json");
const OUTPUT_REPORT = path.join(OUTPUT_DIR, "occupations.from_excel.report.txt");
const OUTPUT_SPECIALIZATIONS_JSON = path.join(OUTPUT_DIR, "skill-specializations.from_excel.json");

const REQUIRED_SHEETS = ["职业及英雄类型表", "本职技能", "分支技能"];
const GROUP_MARKERS = ["☯", "⊙", "☆", "※"];
const GROUP_COUNT_ROWS = { "☆": 2, "⊙": 3, "☯": 4, "※": 5 };
const SIMPLE_ROW_MAP = {
  会计: { key: "accounting", label: "会计" },
  人类学: { key: "anthropology", label: "人类学" },
  驯兽: { key: "animalHandling", label: "驯兽" },
  估价: { key: "appraise", label: "估价" },
  考古学: { key: "archaeology", label: "考古学" },
  炮术: { key: "artillery", label: "炮术" },
  取悦: { key: "charm", label: "魅惑" },
  攀爬: { key: "climb", label: "攀爬" },
  "计算机使用 Ω": { key: "computerUse", label: "计算机使用" },
  克苏鲁神话: { key: "cthulhuMythos", label: "克苏鲁神话" },
  爆破: { key: "demolitions", label: "爆破" },
  乔装: { key: "disguise", label: "乔装" },
  潜水: { key: "dive", label: "潜水" },
  闪避: { key: "dodge", label: "闪避" },
  汽车驾驶: { key: "driveAuto", label: "汽车驾驶" },
  电气维修: { key: "elecRepair", label: "电气维修" },
  "电子学 Ω": { key: "electronics", label: "电子学" },
  话术: { key: "fastTalk", label: "话术" },
  急救: { key: "firstAid", label: "急救" },
  历史: { key: "history", label: "历史" },
  催眠: { key: "hypnosis", label: "催眠" },
  恐吓: { key: "intimidate", label: "恐吓" },
  跳跃: { key: "jump", label: "跳跃" },
  母语: { key: "languageOwn", label: "母语" },
  法律: { key: "law", label: "法律" },
  图书馆使用: { key: "libraryUse", label: "图书馆使用" },
  读唇: { key: "lipReading", label: "读唇" },
  聆听: { key: "listen", label: "聆听" },
  锁匠: { key: "locksmith", label: "锁匠" },
  机械维修: { key: "mechRepair", label: "机械维修" },
  医学: { key: "medicine", label: "医学" },
  博物学: { key: "naturalWorld", label: "博物学" },
  导航: { key: "navigate", label: "导航" },
  神秘学: { key: "occult", label: "神秘学" },
  操作重型机械: { key: "operateHeavyMachinery", label: "操作重型机械" },
  说服: { key: "persuade", label: "说服" },
  精神分析: { key: "psychoanalysis", label: "精神分析" },
  心理学: { key: "psychology", label: "心理学" },
  骑术: { key: "ride", label: "骑术" },
  妙手: { key: "sleightOfHand", label: "妙手" },
  侦查: { key: "spotHidden", label: "侦查" },
  潜行: { key: "stealth", label: "潜行" },
  游泳: { key: "swim", label: "游泳" },
  投掷: { key: "throw", label: "投掷" },
  追踪: { key: "track", label: "追踪" },
};

function resolveInputWorkbook() {
  const preferred = [
    "COC七版空白卡G3.5.11.5 (修订版).xlsx",
    "沙文.弗朗斯-逃兵-小乔.xlsx",
  ];
  const files = fs.readdirSync(ROOT).filter((file) => file.toLowerCase().endsWith(".xlsx"));
  if (!files.length) throw new Error("项目根目录未找到 .xlsx 文件");
  const ordered = [
    ...preferred.filter((file) => files.includes(file)),
    ...files
      .filter((file) => !preferred.includes(file))
      .sort((a, b) => fs.statSync(path.join(ROOT, b)).size - fs.statSync(path.join(ROOT, a)).size),
  ];

  for (const file of ordered) {
    const full = path.join(ROOT, file);
    try {
      const workbook = XLSX.readFile(full, { bookSheets: true });
      if (REQUIRED_SHEETS.every((sheet) => workbook.SheetNames.includes(sheet))) return full;
    } catch {
      // Try next workbook.
    }
  }

  return path.join(ROOT, ordered[0]);
}

function normalizeFormula(raw) {
  let s = String(raw || "")
    .toUpperCase()
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("，", ",")
    .replaceAll("×", "*")
    .replaceAll("＋", "+")
    .replaceAll(/\s+/g, "")
    .trim();

  [
    ["教育", "EDU"],
    ["力量", "STR"],
    ["敏捷", "DEX"],
    ["外貌", "APP"],
    ["意志", "POW"],
    ["体型", "SIZ"],
    ["体质", "CON"],
    ["智力", "INT"],
    ["灵感", "INT"],
  ].forEach(([cn, en]) => {
    s = s.replaceAll(cn, en);
  });

  s = s
    .replaceAll("或者", "或")
    .replaceAll("擇一", "或")
    .replaceAll("择一", "或")
    .replaceAll("其一", "或");

  s = s.replace(
    /(EDU|STR|DEX|APP|POW|SIZ|INT|CON)\s*(?:或|\/)\s*(EDU|STR|DEX|APP|POW|SIZ|INT|CON)/g,
    "MAX($1,$2)",
  );

  return s || "EDU*4";
}

function normalizeInt(raw) {
  const match = String(raw || "").match(/\d+/);
  if (!match) return 0;
  const value = Number.parseInt(match[0], 10);
  return Number.isFinite(value) ? value : 0;
}

function parseCreditRatingRange(raw) {
  const range = String(raw || "").trim();
  const match = range.match(/(\d{1,3})\s*[-~～至到]\s*(\d{1,3})/);
  if (!match) return null;
  const min = normalizeInt(match[1]);
  const max = normalizeInt(match[2]);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function uniqBy(list, getKey) {
  const seen = new Set();
  return list.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanSpecializationText(raw) {
  const compact = String(raw || "")
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("\\", "/")
    .replaceAll("☆", "")
    .replaceAll("★", "")
    .replaceAll("☯", "")
    .replaceAll("⊙", "")
    .replaceAll("※", "")
    .trim();
  const aliases = {
    表: "表演",
    演: "表演",
    摄: "摄影",
    "步/霰": "步枪/霰弹枪",
    来复: "步枪",
    霰弹: "霰弹枪",
    拉丁: "拉丁语",
    希伯来: "希伯来语",
    汉语: "汉语",
    欧洲: "欧洲语言",
  };
  return aliases[compact] || compact;
}

function formatSpecializedLabel(base, specialization) {
  return specialization ? `${base}（${specialization}）` : base;
}

function splitMarker(cellRaw) {
  const raw = String(cellRaw || "").trim();
  if (!raw) return { marker: "", text: "" };

  const leading = raw.match(/^([★☯⊙☆※])(.+)$/);
  if (leading) return { marker: leading[1], text: cleanSpecializationText(leading[2]) };

  const trailing = raw.match(/^(.+?)([★☯⊙☆※])$/);
  if (trailing) return { marker: trailing[2], text: cleanSpecializationText(trailing[1]) };

  if (GROUP_MARKERS.includes(raw) || raw === "★") return { marker: raw, text: "" };
  return { marker: "", text: cleanSpecializationText(raw) };
}

function buildSkillRef(rowLabelRaw, cellRaw) {
  const rowLabel = String(rowLabelRaw || "").trim();
  const normalizedRow = rowLabel.replace(/\s*Ω$/, "").trim();
  const { marker, text } = splitMarker(cellRaw);
  const specialization = text || "";
  const simple = SIMPLE_ROW_MAP[rowLabel] || SIMPLE_ROW_MAP[normalizedRow];

  if (simple) {
    return {
      marker,
      ref: {
        key: simple.key,
        keys: [simple.key],
        label: simple.label,
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^技艺[①②③]$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "artCraft",
        keys: ["artCraft"],
        label: formatSpecializedLabel("艺术/工艺", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^语言[①②③]$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "languageOther",
        keys: ["languageOther"],
        label: formatSpecializedLabel("其他语言", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^科学[①②③]$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "science",
        keys: ["science"],
        label: formatSpecializedLabel("科学", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^生存：$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "survival",
        keys: ["survival"],
        label: formatSpecializedLabel("生存", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^格斗(?:：|[①②③])$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "fightingBrawl",
        keys: ["fightingBrawl"],
        label: formatSpecializedLabel("格斗", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^射击(?:：|[①②③])$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "firearmsHandgun",
        keys: ["firearmsHandgun", "firearmsRifle"],
        label: formatSpecializedLabel("射击", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^操作：$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "pilot",
        keys: ["pilot"],
        label: formatSpecializedLabel("操作/驾驶", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  if (/^学识：$/.test(normalizedRow)) {
    return {
      marker,
      ref: {
        key: "knowledge",
        keys: ["knowledge"],
        label: formatSpecializedLabel("学识", specialization),
        specialization,
        sourceRow: normalizedRow,
        raw: String(cellRaw || "").trim(),
      },
    };
  }

  return null;
}

function buildGroupLabel(marker, choose, options) {
  const prefix = {
    "☯": "社交技能",
    "⊙": "职业可选技能",
    "☆": "分支可选技能",
    "※": "补充可选技能",
  }[marker] || "职业可选技能";
  return `${prefix} ${options.length}选${choose}`;
}

function buildSkillColumnLookup(skillRows) {
  const seqRow = skillRows[0] || [];
  const nameRow = skillRows[1] || [];
  const bySequence = new Map();
  const byName = new Map();

  for (let col = 1; col < nameRow.length; col += 1) {
    const name = String(nameRow[col] || "").trim();
    const sequence = normalizeInt(seqRow[col]);
    if (name) byName.set(name, col);
    if (sequence > 0) bySequence.set(sequence, col);
  }

  return { bySequence, byName };
}

function extractOccupationPlan(skillRows, colIndex, occupationId) {
  const grouped = new Map(GROUP_MARKERS.map((marker) => [marker, []]));
  const mandatoryRefs = [];

  for (let rowIndex = 7; rowIndex < skillRows.length; rowIndex += 1) {
    const row = skillRows[rowIndex] || [];
    const rowLabel = String(row[0] || "").trim();
    const cell = String(row[colIndex] || "").trim();
    if (!rowLabel || !cell) continue;

    const parsed = buildSkillRef(rowLabel, cell);
    if (!parsed) continue;
    const ref = {
      ...parsed.ref,
      id: `${occupationId}-${rowIndex}`,
    };

    if (parsed.marker === "★") {
      mandatoryRefs.push(ref);
      continue;
    }

    if (GROUP_MARKERS.includes(parsed.marker)) {
      grouped.get(parsed.marker).push(ref);
      continue;
    }

    mandatoryRefs.push(ref);
  }

  const choiceGroups = GROUP_MARKERS.flatMap((marker, markerIndex) => {
    const options = uniqBy(grouped.get(marker) || [], (ref) => `${ref.label}|${ref.keys.join("/")}`);
    if (!options.length) return [];
    const requested = normalizeInt((skillRows[GROUP_COUNT_ROWS[marker]] || [])[colIndex]);
    const choose = Math.max(1, Math.min(requested || 1, options.length));
    return [
      {
        id: `${occupationId}-${marker}-${markerIndex + 1}`,
        marker,
        choose,
        label: buildGroupLabel(marker, choose, options),
        options,
      },
    ];
  });

  return {
    mandatoryRefs: uniqBy(mandatoryRefs, (ref) => `${ref.label}|${ref.keys.join("/")}`),
    choiceGroups,
    freePickCount: normalizeInt((skillRows[6] || [])[colIndex]),
  };
}

function extractSpecializations(rows) {
  const blocks = [
    { key: "artCraft", skillCol: 1, baseCol: 2, rows: [3, 19] },
    { key: "science", skillCol: 4, baseCol: 5, rows: [3, 15] },
    { key: "fightingBrawl", skillCol: 7, baseCol: 8, rows: [3, 11] },
    { key: "firearmsHandgun", skillCol: 10, baseCol: 11, rows: [3, 9] },
    { key: "pilot", skillCol: 7, baseCol: 8, rows: [14, 15] },
  ];

  const result = {};
  blocks.forEach((block) => {
    const options = [];
    for (let rowIndex = block.rows[0]; rowIndex <= block.rows[1]; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const label = cleanSpecializationText(row[block.skillCol]);
      const base = normalizeInt(row[block.baseCol]);
      if (!label) continue;
      options.push({ label, base });
    }
    if (options.length) result[block.key] = uniqBy(options, (item) => item.label);
  });
  return result;
}

function main() {
  const input = resolveInputWorkbook();
  const workbook = XLSX.readFile(input, { raw: false, cellText: true, cellFormula: true });
  const occupationRows = XLSX.utils.sheet_to_json(workbook.Sheets["职业及英雄类型表"], {
    header: 1,
    raw: false,
    defval: "",
  });
  const skillRows = XLSX.utils.sheet_to_json(workbook.Sheets["本职技能"], {
    header: 1,
    raw: false,
    defval: "",
  });
  const specializationRows = XLSX.utils.sheet_to_json(workbook.Sheets["分支技能"], {
    header: 1,
    raw: false,
    defval: "",
  });

  const lookup = buildSkillColumnLookup(skillRows);
  const occupations = [];
  let matrixMatched = 0;

  for (let rowIndex = 0; rowIndex < occupationRows.length; rowIndex += 1) {
    const row = occupationRows[rowIndex] || [];
    const sequence = normalizeInt(row[0]);
    const name = String(row[1] || "").trim();
    const creditRatingRaw = String(row[3] || "").trim();
    const formulaRaw = String(row[4] || "").trim();
    const skillText = String(row[6] || "").trim();

    if (sequence < 2 || !name || !formulaRaw || !skillText) continue;

    const colIndex = lookup.bySequence.get(sequence) ?? lookup.byName.get(name) ?? null;
    const plan = colIndex ? extractOccupationPlan(skillRows, colIndex, `occ-${sequence}`) : null;
    if (plan) matrixMatched += 1;

    occupations.push({
      row_index: rowIndex + 1,
      sequence,
      name,
      credit_rating_raw: creditRatingRaw,
      credit_rating_range: parseCreditRatingRange(creditRatingRaw),
      formula_raw: formulaRaw,
      formula_eval: normalizeFormula(formulaRaw),
      skill_text: skillText,
      free_pick_hint: normalizeInt(row[7]),
      recommended_contact: String(row[11] || "").trim(),
      intro: String(row[13] || "").trim(),
      skill_column_index: colIndex,
      plan,
    });
  }

  const specializations = extractSpecializations(specializationRows);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(occupations, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_SPECIALIZATIONS_JSON, `${JSON.stringify(specializations, null, 2)}\n`, "utf8");

  const preview = occupations
    .slice(0, 12)
    .map((item) => {
      const groups = item.plan?.choiceGroups?.map((group) => `${group.label}`).join(" / ") || "无";
      return `#${item.sequence} ${item.name} | ${item.formula_eval} | mandatory=${item.plan?.mandatoryRefs?.length || 0} | groups=${groups}`;
    })
    .join("\n");
  const report = [
    `source: ${path.basename(input)}`,
    `occupations_extracted: ${occupations.length}`,
    `matrix_matched: ${matrixMatched}`,
    `specialization_categories: ${Object.keys(specializations).length}`,
    "",
    "preview:",
    preview,
    "",
  ].join("\n");
  fs.writeFileSync(OUTPUT_REPORT, report, "utf8");

  console.log(`Extracted ${occupations.length} occupations.`);
  console.log(`Matched ${matrixMatched} occupations to Excel skill columns.`);
  console.log(`Occupation JSON: ${OUTPUT_JSON}`);
  console.log(`Specialization JSON: ${OUTPUT_SPECIALIZATIONS_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
}

main();
