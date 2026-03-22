import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");
const PUBLIC_DATA_DIR = path.join(PUBLIC_DIR, "data");
const PUBLIC_TEMPLATE_DIR = path.join(PUBLIC_DIR, "templates");

const REQUIRED_DATA_FILES = [
  "occupations.from_excel.json",
  "weapons.from_excel.json",
  "skill-specializations.from_excel.json",
  "experience-packs.from_excel.json",
];

const TEMPLATE_CANDIDATES = [
  "COC七版空白卡G3.5.11.5 (修订版).xlsx",
  "COC七版空白卡G3.5.11.5.xlsx",
  "COC七版空白卡.xlsx",
];

const OUTPUT_TEMPLATE_NAME = "coc7-blank-card.xlsx";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileOrThrow(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`缺少文件: ${source}`);
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function resolveTemplateFile() {
  for (const file of TEMPLATE_CANDIDATES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) return full;
  }
  return "";
}

function main() {
  ensureDir(PUBLIC_DATA_DIR);
  ensureDir(PUBLIC_TEMPLATE_DIR);

  REQUIRED_DATA_FILES.forEach((file) => {
    copyFileOrThrow(path.join(DATA_DIR, file), path.join(PUBLIC_DATA_DIR, file));
  });

  const template = resolveTemplateFile();
  if (!template) {
    throw new Error(
      `未找到空白卡模板（候选: ${TEMPLATE_CANDIDATES.join(" / ")}）。`,
    );
  }
  copyFileOrThrow(template, path.join(PUBLIC_TEMPLATE_DIR, OUTPUT_TEMPLATE_NAME));

  console.log(`已同步数据文件到: ${PUBLIC_DATA_DIR}`);
  console.log(`已同步模板到: ${path.join(PUBLIC_TEMPLATE_DIR, OUTPUT_TEMPLATE_NAME)}`);
}

main();
