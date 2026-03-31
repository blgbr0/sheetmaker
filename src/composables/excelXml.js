const XML_NS = "http://www.w3.org/XML/1998/namespace";

let jszipPromise = null;

function parseCellRef(ref) {
  const match = String(ref || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`无效单元格地址: ${ref}`);
  return { col: lettersToIndex(match[1]), row: Number.parseInt(match[2], 10) };
}

function lettersToIndex(letters) {
  let value = 0;
  for (const ch of letters) value = (value * 26) + (ch.charCodeAt(0) - 64);
  return value;
}

function compareCellRefs(a, b) {
  const pa = parseCellRef(a);
  const pb = parseCellRef(b);
  if (pa.row !== pb.row) return pa.row - pb.row;
  return pa.col - pb.col;
}

function clearNodeChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function clearCellValue(cell) {
  Array.from(cell.childNodes).forEach((child) => {
    if (["f", "v", "is"].includes(child.localName)) cell.removeChild(child);
  });
}

function getSheetData(doc) {
  return doc.getElementsByTagNameNS("*", "sheetData")[0];
}

function ensureRow(doc, sheetData, rowNumber) {
  const rows = Array.from(sheetData.getElementsByTagNameNS("*", "row"));
  const existing = rows.find((row) => Number.parseInt(row.getAttribute("r") || "0", 10) === rowNumber);
  if (existing) return existing;

  const row = doc.createElementNS(doc.documentElement.namespaceURI, "row");
  row.setAttribute("r", String(rowNumber));
  const next = rows.find((item) => Number.parseInt(item.getAttribute("r") || "0", 10) > rowNumber);
  if (next) sheetData.insertBefore(row, next);
  else sheetData.appendChild(row);
  return row;
}

function findNearbyStyle(rowNode, ref) {
  const cells = Array.from(rowNode.getElementsByTagNameNS("*", "c"));
  const target = parseCellRef(ref);
  let closest = null;
  let distance = Number.POSITIVE_INFINITY;
  cells.forEach((cell) => {
    const cellRef = cell.getAttribute("r");
    if (!cellRef) return;
    const parsed = parseCellRef(cellRef);
    const currentDistance = Math.abs(parsed.col - target.col);
    if (currentDistance < distance && cell.hasAttribute("s")) {
      closest = cell.getAttribute("s");
      distance = currentDistance;
    }
  });
  return closest;
}

function ensureCell(doc, rowNode, ref) {
  const cells = Array.from(rowNode.getElementsByTagNameNS("*", "c"));
  const existing = cells.find((cell) => cell.getAttribute("r") === ref);
  if (existing) return existing;

  const cell = doc.createElementNS(doc.documentElement.namespaceURI, "c");
  cell.setAttribute("r", ref);
  const style = findNearbyStyle(rowNode, ref);
  if (style) cell.setAttribute("s", style);

  const next = cells.find((item) => compareCellRefs(item.getAttribute("r") || "", ref) > 0);
  if (next) rowNode.insertBefore(cell, next);
  else rowNode.appendChild(cell);
  return cell;
}

function createValueNode(doc, value) {
  const node = doc.createElementNS(doc.documentElement.namespaceURI, "v");
  node.textContent = String(value);
  return node;
}

function createInlineStringNode(doc, value) {
  const isNode = doc.createElementNS(doc.documentElement.namespaceURI, "is");
  const tNode = doc.createElementNS(doc.documentElement.namespaceURI, "t");
  const text = String(value);
  if (/^\s|\s$|\n| {2,}/.test(text)) {
    tNode.setAttributeNS(XML_NS, "xml:space", "preserve");
  }
  tNode.textContent = text;
  isNode.appendChild(tNode);
  return isNode;
}

function serializeXml(doc) {
  let serialized = new XMLSerializer().serializeToString(doc);
  // Fix for @xmldom/xmldom redundant namespace injection
  // It often adds xmlns="uri" to every child node if createElementNS is used in certain ways.
  const nameSpace = doc.documentElement?.namespaceURI;
  if (nameSpace) {
    // Remove all xmlns declarations that are identical to the root namespace, 
    // EXCEPT for the very first one on the root element.
    const pattern = new RegExp(` xmlns="${nameSpace}"`, 'g');
    let first = true;
    serialized = serialized.replace(pattern, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return "";
    });
  }
  if (serialized.startsWith("<?xml")) return serialized;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${serialized}`;
}

export async function getJsZip() {
  if (!jszipPromise) jszipPromise = import("jszip");
  const mod = await jszipPromise;
  return mod.default || mod;
}

export async function loadTemplateZip(urlCandidates) {
  const JSZip = await getJsZip();
  for (const url of urlCandidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      return JSZip.loadAsync(buffer);
    } catch {
      continue;
    }
  }
  return null;
}

export async function readXmlFromZip(zip, path) {
  const file = zip.file(path);
  if (!file) throw new Error(`模板缺少 ${path}`);
  const text = await file.async("string");
  return new DOMParser().parseFromString(text, "application/xml");
}

export function writeXmlToZip(zip, path, doc) {
  zip.file(path, serializeXml(doc));
}

export function setWorkbookForceRecalc(doc) {
  const ns = doc.documentElement.namespaceURI;
  let calcPr = doc.getElementsByTagNameNS("*", "calcPr")[0];
  if (!calcPr) {
    calcPr = doc.createElementNS(ns, "calcPr");
    doc.documentElement.appendChild(calcPr);
  }
  calcPr.setAttribute("calcMode", "auto");
  calcPr.setAttribute("fullCalcOnLoad", "1");
  calcPr.setAttribute("forceFullCalc", "1");
}

export function setWorksheetCell(doc, ref, value, type = null) {
  const sheetData = getSheetData(doc);
  if (!sheetData) throw new Error("工作表 XML 缺少 sheetData");
  const rowInfo = parseCellRef(ref);
  const rowNode = ensureRow(doc, sheetData, rowInfo.row);
  const cell = ensureCell(doc, rowNode, ref.toUpperCase());
  clearCellValue(cell);

  if (value === null || value === undefined || value === "") {
    cell.removeAttribute("t");
    return cell;
  }

  const isNumber = type === "n" || (type !== "s" && typeof value === "number" && Number.isFinite(value));
  if (isNumber) {
    cell.removeAttribute("t");
    cell.appendChild(createValueNode(doc, value));
    return cell;
  }

  cell.setAttribute("t", "inlineStr");
  cell.appendChild(createInlineStringNode(doc, value));
  return cell;
}

export async function generateZipBlob(zip) {
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function sanitizeFilename(name) {
  const raw = String(name || "export.xlsx").trim() || "export.xlsx";
  return raw.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function trySaveBlobByCapacitor(blob, filename) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor?.isNativePlatform?.()) return null;

    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    const safeName = sanitizeFilename(filename);
    const data = arrayBufferToBase64(await blob.arrayBuffer());
    const path = `exports/${Date.now()}-${safeName}`;
    const writeResult = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Documents,
      recursive: true,
    });

    let shared = false;
    const canShare = await Share.canShare();
    if (canShare?.value && writeResult?.uri) {
      await Share.share({
        title: "导出角色卡",
        text: safeName,
        url: writeResult.uri,
        dialogTitle: "分享角色卡",
      });
      shared = true;
    }

    return { saved: true, shared, uri: writeResult?.uri || "" };
  } catch {
    return null;
  }
}

export async function saveExportBlob(blob, filename) {
  const nativeResult = await trySaveBlobByCapacitor(blob, filename);
  if (nativeResult?.saved) return nativeResult;
  downloadBlob(blob, filename);
  return { saved: true, shared: false, uri: "" };
}
