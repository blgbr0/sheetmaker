import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = process.cwd();
const TEMPLATE_NAMES = new Set([
  "COC七版空白卡G3.5.11.5 (修订版).xlsx",
  "COC七版空白卡G3.5.11.5.xlsx",
  "COC七版空白卡.xlsx",
]);

const ATTRIBUTE_RULES = [
  { label: "STR", base: "W3", half: "X3", fifth: "X4" },
  { label: "DEX", base: "Z3", half: "AA3", fifth: "AA4" },
  { label: "INT", base: "AC3", half: "AD3", fifth: "AD4" },
  { label: "CON", base: "W5", half: "X5", fifth: "X6" },
  { label: "APP", base: "Z5", half: "AA5", fifth: "AA6" },
  { label: "POW", base: "AC5", half: "AD5", fifth: "AD6" },
  { label: "SIZ", base: "W7", half: "X7", fifth: "X8" },
  { label: "EDU", base: "Z7", half: "AA7", fifth: "AA8" },
  { label: "Luck", base: "V10", half: "", fifth: "" },
];

const FORMULA_CELLS = [
  "AS3", "AT3", "AV3", "AW3", "AY3", "AZ3",
  "AS5", "AT5", "AV5", "AW5", "AY5", "AZ5",
  "AS7", "AT7", "AV7", "AW7", "AY7",
  "M10", "N10", "R10", "S10", "Z10", "AA10",
  "T26", "T29", "AF52", "AF55",
];

function readCell(ws, addr) {
  const cell = ws[addr];
  if (!cell) return "";
  return cell.w ?? cell.v ?? "";
}

function readNumber(ws, addr) {
  const value = readCell(ws, addr);
  if (typeof value === "number") return value;
  const text = String(value || "").replace(/[^\d.-]/g, "");
  if (!text) return NaN;
  const num = Number(text);
  return Number.isFinite(num) ? num : NaN;
}

function openWorkbookSafely(file) {
  try {
    return XLSX.readFile(file, { raw: false, cellText: true, cellFormula: true });
  } catch {
    return null;
  }
}

function isLikelyExportFile(file) {
  const base = path.basename(file);
  return base.includes("CoC7角色卡") || base.includes("角色卡");
}

function resolveInputFile(argPath) {
  if (argPath) {
    const full = path.resolve(ROOT, argPath);
    if (!fs.existsSync(full)) throw new Error(`文件不存在: ${full}`);
    return full;
  }

  const candidates = [];
  [ROOT, path.join(os.homedir(), "Downloads")]
    .filter((dir) => fs.existsSync(dir))
    .forEach((dir) => {
      fs.readdirSync(dir)
        .filter((file) => file.toLowerCase().endsWith(".xlsx"))
        .filter((file) => !TEMPLATE_NAMES.has(file))
        .filter((file) => isLikelyExportFile(file))
        .forEach((file) => {
          const full = path.join(dir, file);
          candidates.push({ full, mtime: fs.statSync(full).mtimeMs });
        });
    });

  if (!candidates.length) throw new Error("没有找到可检查的导出文件，请传入文件路径。");
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].full;
}

function main() {
  let target = resolveInputFile(process.argv[2]);
  let workbook = openWorkbookSafely(target);

  if (!workbook || !workbook.SheetNames.includes("人物卡")) {
    throw new Error("目标文件不包含“人物卡”工作表，请确认路径。");
  }

  const ws = workbook.Sheets["人物卡"];
  console.log(`检查文件: ${target}`);

  const failures = [];

  ATTRIBUTE_RULES.forEach((rule) => {
    const base = readNumber(ws, rule.base);
    const half = rule.half ? readNumber(ws, rule.half) : NaN;
    const fifth = rule.fifth ? readNumber(ws, rule.fifth) : NaN;

    const baseOk = Number.isFinite(base) && base > 0;
    const halfFormula = rule.half ? Boolean(ws[rule.half]?.f) : false;
    const fifthFormula = rule.fifth ? Boolean(ws[rule.fifth]?.f) : false;
    const halfOk = !rule.half || halfFormula || (Number.isFinite(half) && half === Math.floor(base / 2));
    const fifthOk = !rule.fifth || fifthFormula || (Number.isFinite(fifth) && fifth === Math.floor(base / 5));
    const ok = baseOk;
    const warn = baseOk && (!halfOk || !fifthOk);

    console.log(
      `${ok ? (warn ? "WARN" : "OK ") : "ERR"} ${rule.label.padEnd(5)} base(${rule.base})=${JSON.stringify(readCell(ws, rule.base))}` +
      `${rule.half ? ` half(${rule.half})=${JSON.stringify(readCell(ws, rule.half))}` : ""}` +
      `${rule.fifth ? ` fifth(${rule.fifth})=${JSON.stringify(readCell(ws, rule.fifth))}` : ""}`,
    );
    if (!ok) failures.push(rule.label);
  });

  const formulaBroken = [];
  FORMULA_CELLS.forEach((addr) => {
    const cell = ws[addr];
    const ok = Boolean(cell?.f);
    console.log(`${ok ? "OK " : "ERR"} formula ${addr} ${ok ? "保留" : "丢失"}`);
    if (!ok) formulaBroken.push(addr);
  });

  const name = readCell(ws, "L3");
  const occupation = readCell(ws, "L5");
  console.log(`姓名: ${JSON.stringify(name)} 职业: ${JSON.stringify(occupation)}`);

  if (failures.length || formulaBroken.length) {
    if (failures.length) console.error(`属性写入异常: ${failures.join(", ")}`);
    if (formulaBroken.length) console.error(`公式被覆盖: ${formulaBroken.join(", ")}`);
    process.exit(1);
  }

  console.log("\n检查通过：属性输入位和关键公式均正常。");
}

main();
