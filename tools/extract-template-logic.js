import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = process.cwd();
const OUTPUT_DOC = path.join(ROOT, "docs", "excel-template-logic.md");
const OUTPUT_JSON = path.join(ROOT, "data", "excel-template-logic.json");

function resolveWorkbook() {
  const preferred = path.join(ROOT, "COC七版空白卡G3.5.11.5 (修订版).xlsx");
  if (fs.existsSync(preferred)) return preferred;
  const files = fs.readdirSync(ROOT).filter((file) => file.toLowerCase().endsWith(".xlsx"));
  if (!files.length) throw new Error("项目根目录没有找到 xlsx 模板文件。");
  files.sort((a, b) => fs.statSync(path.join(ROOT, b)).size - fs.statSync(path.join(ROOT, a)).size);
  return path.join(ROOT, files[0]);
}

function cellInfo(ws, addr) {
  const c = ws[addr];
  if (!c) return { addr, value: "", formula: "" };
  return {
    addr,
    value: c.w ?? c.v ?? "",
    formula: c.f || "",
  };
}

function buildData(ws) {
  const attrs = [
    { name: "STR", input: "W3", half: "X3", fifth: "X4", source: "AS3", sourceHalf: "AT3" },
    { name: "DEX", input: "Z3", half: "AA3", fifth: "AA4", source: "AV3", sourceHalf: "AW3" },
    { name: "INT", input: "AC3", half: "AD3", fifth: "AD4", source: "AV7", sourceHalf: "AW7" },
    { name: "CON", input: "W5", half: "X5", fifth: "X6", source: "AS5", sourceHalf: "AT5" },
    { name: "APP", input: "Z5", half: "AA5", fifth: "AA6", source: "AV5", sourceHalf: "AW5" },
    { name: "POW", input: "AC5", half: "AD5", fifth: "AD6", source: "AY3", sourceHalf: "AZ3" },
    { name: "SIZ", input: "W7", half: "X7", fifth: "X8", source: "AS7", sourceHalf: "AT7" },
    { name: "EDU", input: "Z7", half: "AA7", fifth: "AA8", source: "AY5", sourceHalf: "AZ5" },
    { name: "Luck", input: "V10", half: "", fifth: "", source: "", sourceHalf: "" },
  ].map((item) => ({
    ...item,
    inputInfo: cellInfo(ws, item.input),
    halfInfo: item.half ? cellInfo(ws, item.half) : null,
    fifthInfo: item.fifth ? cellInfo(ws, item.fifth) : null,
    sourceInfo: item.source ? cellInfo(ws, item.source) : null,
    sourceHalfInfo: item.sourceHalf ? cellInfo(ws, item.sourceHalf) : null,
  }));

  const derived = [
    "X2", "AC2", "R7", "AC7", "AY7",
    "M10", "N10", "R10", "S10", "V10", "Z10", "AA10",
    "T26", "T29", "AF52", "AF55",
  ].map((addr) => cellInfo(ws, addr));

  const skillRows = [16, 20, 31, 35, 49];
  const skillCols = ["L", "P", "T", "U", "V", "X", "AA", "AE", "AF", "AG"];
  const skills = skillRows.map((row) => ({
    row,
    cells: skillCols.map((col) => cellInfo(ws, `${col}${row}`)),
  }));

  const weaponRows = [53, 54, 55, 56];
  const weaponCols = ["M", "N", "P", "Q", "R", "S", "U", "W", "X", "Z", "AB"];
  const weapons = weaponRows.map((row) => ({
    row,
    cells: weaponCols.map((col) => cellInfo(ws, `${col}${row}`)),
  }));

  return { attrs, derived, skills, weapons };
}

function toMarkdown(data, sourceName) {
  const lines = [];
  lines.push("# CoC7 空白卡函数逻辑（模板解析）");
  lines.push("");
  lines.push(`- 模板文件：\`${sourceName}\``);
  lines.push("- 工作表：`人物卡`（sheet1）");
  lines.push("- 生成方式：`npm run extract:template-logic`");
  lines.push("");
  lines.push("## 1) 属性区输入/计算位");
  lines.push("");
  lines.push("| 属性 | 输入格 | 半数格 | 五分之一格 | 函数源格(右侧) | 右侧半数格 |");
  lines.push("|---|---|---|---|---|---|");
  data.attrs.forEach((item) => {
    lines.push(`| ${item.name} | ${item.input || "-"} | ${item.half || "-"} | ${item.fifth || "-"} | ${item.source || "-"} | ${item.sourceHalf || "-"} |`);
  });
  lines.push("");
  lines.push("说明：属性应优先写入左侧输入格（如 `W3`、`Z3`、`AC3`），右侧 `AS/AV/AY` 链路由模板公式自动取值。");
  lines.push("");
  lines.push("## 2) 关键公式（节选）");
  lines.push("");
  lines.push("| 单元格 | 公式 | 备注 |");
  lines.push("|---|---|---|");
  data.derived.forEach((item) => {
    const formula = item.formula ? `\`${item.formula}\`` : "-";
    lines.push(`| ${item.addr} | ${formula} | ${String(item.value).replace(/\n/g, " / ")} |`);
  });
  lines.push("");
  lines.push("## 3) 技能表公式模式（样例行）");
  lines.push("");
  data.skills.forEach((row) => {
    lines.push(`### 行 ${row.row}`);
    row.cells.forEach((cell) => {
      if (!cell.formula) return;
      lines.push(`- \`${cell.addr}\` = \`${cell.formula}\``);
    });
    lines.push("");
  });
  lines.push("## 4) 武器区公式模式（行 53-56）");
  lines.push("");
  data.weapons.forEach((row) => {
    lines.push(`### 行 ${row.row}`);
    row.cells.forEach((cell) => {
      if (!cell.formula) return;
      lines.push(`- \`${cell.addr}\` = \`${cell.formula}\``);
    });
    lines.push("");
  });
  lines.push("## 5) 导出实现建议（后续开发基线）");
  lines.push("");
  lines.push("- 不覆盖有公式的单元格（例如 `AS3`、`M10`、`T26`、`AF52` 等）。");
  lines.push("- 属性仅写输入位：`W/Z/AC` 列与 `V10` 幸运。");
  lines.push("- 技能仅写分配点（`R/S/AC/AD`）与必要子类输入（如 `N34`、`N38`、`Z31`）。");
  lines.push("- 武器优先写可选输入位（如 `M54:M56`），其余字段由模板公式从武器库表拉取。");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const input = resolveWorkbook();
  const wb = XLSX.readFile(input, { raw: false, cellText: true, cellFormula: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("未找到人物卡工作表。");

  const data = buildData(ws);
  const markdown = toMarkdown(data, path.basename(input));

  fs.mkdirSync(path.dirname(OUTPUT_DOC), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_DOC, `${markdown}\n`, "utf8");
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`模板逻辑文档已生成: ${OUTPUT_DOC}`);
  console.log(`模板逻辑数据已生成: ${OUTPUT_JSON}`);
}

main();
