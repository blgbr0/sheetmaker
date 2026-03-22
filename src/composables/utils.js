export function normalizeInt(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function toHalfWidth(str) {
  return String(str || "").replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

export function normalizeText(text) {
  return toHalfWidth(String(text || ""))
    .toLowerCase()
    .replaceAll(/\s+/g, "")
    .replaceAll(/[，,。；;：:、\/\-\+*（）()\[\]【】《》“”"'`]/g, "");
}

export function normalizeFormula(rawFormula) {
  let s = String(rawFormula || "")
    .toUpperCase()
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("，", ",")
    .replaceAll("×", "*")
    .replaceAll("＋", "+")
    .replaceAll(/\s+/g, "");

  const attrMap = [
    ["教育", "EDU"],
    ["力量", "STR"],
    ["敏捷", "DEX"],
    ["外貌", "APP"],
    ["意志", "POW"],
    ["体型", "SIZ"],
    ["体质", "CON"],
    ["智力", "INT"],
    ["灵感", "INT"],
  ];
  attrMap.forEach(([cn, en]) => {
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

  if (!s) return "EDU*4";
  return s;
}

export function chineseToInt(raw) {
  const s = String(raw || "").trim();
  if (/^\d+$/.test(s)) return normalizeInt(s);
  const m = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (s === "十") return 10;
  if (s.length === 2 && s[0] === "十") return 10 + (m[s[1]] || 0);
  if (s.length === 2 && s[1] === "十") return (m[s[0]] || 0) * 10;
  if (s.length === 3 && s[1] === "十") return (m[s[0]] || 0) * 10 + (m[s[2]] || 0);
  return m[s] || 0;
}

export function roll(n, faces) {
  const detail = [];
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const p = Math.floor(Math.random() * faces) + 1;
    detail.push(p);
    sum += p;
  }
  return { detail, sum };
}
