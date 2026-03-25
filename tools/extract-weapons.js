import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "data");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "weapons.from_excel.json");
const OUTPUT_REPORT = path.join(OUTPUT_DIR, "weapons.from_excel.report.txt");

function resolveInputWorkbook() {
  const preferred = [
    "COC七版空白卡G3.5.11.5 (修订版).xlsx",
    "COC七版空白卡G3.5.11.5.xlsx",
    "COC七版空白卡.xlsx",
  ];
  for (const file of preferred) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) return full;
  }
  const firstXlsx = fs.readdirSync(ROOT).find((f) => f.toLowerCase().endsWith(".xlsx"));
  if (!firstXlsx) throw new Error("项目根目录未找到 .xlsx 文件");
  return path.join(ROOT, firstXlsx);
}

function cleanWeaponName(nameRaw) {
  const raw = String(nameRaw || "").trim();
  const isRare = raw.startsWith("*");
  const isOutOfEra = raw.startsWith("-");
  const name = raw.replace(/^[*-]+/, "").trim();
  return { raw, name, isRare, isOutOfEra };
}

function isInvalidWeaponRow(name, skill, damage) {
  if (!name) return true;
  if (/武器类型|武器名称|名称前面的|如有任何冲突/.test(name)) return true;
  if (name.length > 100) return true;
  if (!skill && !damage) return true;
  return false;
}

function main() {
  const input = resolveInputWorkbook();
  const workbook = XLSX.readFile(input, { raw: false, cellText: true, cellFormula: true });
  const sheetName = workbook.SheetNames.find((n) => /武器/.test(n));
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) throw new Error("未找到武器列表工作表");

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const weapons = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const parsedName = cleanWeaponName(row[1]);
    const skill = String(row[2] || "").trim();
    const damage = String(row[3] || "").trim();
    const range = String(row[4] || "").trim();
    const penetrate = String(row[5] || "").trim();
    const attacksPerRound = String(row[6] || "").trim();
    const ammo = String(row[7] || "").trim();
    const malfunction = String(row[8] || "").trim();
    const era = String(row[9] || "").trim();
    const price = String(row[10] || "").trim();
    const invented = String(row[11] || "").trim();
    const type = String(row[12] || "").trim();
    const notes = String(row[13] || "").trim();

    if (isInvalidWeaponRow(parsedName.name, skill, damage)) continue;

    weapons.push({
      row_index: i + 1,
      sequence: weapons.length + 1,
      id: `w-${weapons.length + 1}`,
      name: parsedName.name,
      raw_name: parsedName.raw,
      is_rare: parsedName.isRare,
      is_out_of_era: parsedName.isOutOfEra,
      skill,
      damage,
      range,
      penetrate,
      attacks_per_round: attacksPerRound,
      ammo,
      malfunction,
      era,
      price,
      invented,
      type,
      notes,
    });
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(weapons, null, 2)}\n`, "utf8");

  const preview = weapons
    .slice(0, 15)
    .map((x) => `${x.id} ${x.name} | ${x.skill} | ${x.damage} | ${x.range}`)
    .join("\n");
  const report = [
    `source: ${path.basename(input)}`,
    `sheet: ${sheetName || "unknown"}`,
    `rows_total: ${rows.length}`,
    `weapons_extracted: ${weapons.length}`,
    "",
    "preview:",
    preview,
    "",
  ].join("\n");
  fs.writeFileSync(OUTPUT_REPORT, report, "utf8");

  console.log(`Extracted ${weapons.length} weapon rows.`);
  console.log(`JSON: ${OUTPUT_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
}

main();
