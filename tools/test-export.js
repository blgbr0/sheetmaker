import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { generateExportZipBlob } from '../src/composables/exportLogic.js';
import { fileURLToPath } from 'node:url';

// Setup DOM globals for node environment
global.DOMParser = DOMParser;
global.XMLSerializer = XMLSerializer;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Mock browser fetch so `loadTemplateZip` can grab files from `public/`
const originalFetch = global.fetch || function() { throw new Error('No global fetch'); };
global.fetch = async (url, options) => {
  let relativePath = url;
  if (url.startsWith('/')) {
    relativePath = url.substring(1);
  } else if (url.startsWith('templates/')) {
    relativePath = url;
  }
  
  const absPath = path.join(ROOT, 'public', decodeURI(relativePath));
  if (fs.existsSync(absPath)) {
    const buffer = fs.readFileSync(absPath);
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array(buffer).buffer
    };
  }
  return originalFetch(url, options);
};

// Mock App State
const mockState = {
  basic: {
    name: '测试员 Node 01',
    era: '1920s',
    occupation: '古董收藏家',
    age: 35,
    gender: '男',
    residence: '阿卡姆',
    birthplace: '波士顿'
  },
  occupation: {
    selectedName: '古董收藏家',
    formula: 'EDU*4',
    creditRatingRange: { min: 30, max: 70 }
  },
  attrs: {
    STR: 50, DEX: 60, INT: 70, CON: 45, APP: 65, POW: 80, SIZ: 60, EDU: 90, Luck: 55
  },
  skills: [
    { key: 'creditRating', name: '信用评级', occ: 50, interest: 0, specialization: '' },
    { key: 'appraise', name: '估价', occ: 60, interest: 0, specialization: '' },
    { key: 'libraryUse', name: '图书馆使用', occ: 40, interest: 20, specialization: '' },
    { key: 'languageOwn', name: '母语', occ: 0, interest: 0, specialization: '英语' }
  ],
  selectedWeapons: [
    { name: '12号口径霰弹枪 (连发)', skill: '火器(霰弹枪)', count: 2, raw_name: '12号口径霰弹枪 (连发)' }
  ],
  background: {
    assets: '$1000',
    cash: '$50',
    desc: '一个带着礼帽的体面人',
    belief: '科学就是一切',
    importantPerson: '大学室友',
    importantPlace: '密斯卡托尼克大学图书馆',
    treasure: '一本祖传旧书',
    traits: '极度偏执',
    items: '手电筒\n放大镜\n日记本',
    keyLinkType: 'treasure',
    experiencePackId: 'exp-ww1-veteran'
  },
  pools: { occupation: 360, occSpent: 150, interest: 140, intSpent: 20 }
};

const mockRuntime = {
  occupations: [
    { name: '古董收藏家', sequence: '12', formula: 'EDU*4', skillText: '鉴定，艺术与手艺（任意），历史，图书馆使用...', creditRatingRange: { min: 30, max: 70 } }
  ],
  weapons: [],
  experiencePacks: [
    { id: 'exp-ww1-veteran', name: '一战老兵', notes: '经历了残酷的一战' }
  ]
};

function getSkillTotal(skill) {
  // simplified for test
  return (skill.occ || 0) + (skill.interest || 0);
}

function getSelectedExperiencePack() {
  return mockRuntime.experiencePacks[0];
}

function getExperiencePackSummary(pack) {
  return [pack.notes];
}

async function runTest() {
  console.log('[Test] 开始 Node 环境下的底层生成导出模拟...');
  const outPath = path.join(ROOT, 'tools', 'test_output_node.xlsx');
  
  try {
    const { blob, skippedFormulaCells } = await generateExportZipBlob({
      state: mockState,
      runtime: mockRuntime,
      getSkillTotal,
      getSelectedExperiencePack,
      getExperiencePackSummary,
      templateFile: "templates/coc7-blank-card.xlsx",
      legacyName: "COC七版空白卡G3.5.11.5 (修订版).xlsx"
    });
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(outPath, buffer);
    console.log(`[Test] 成功生成测试文件产物并写入: ${outPath}`);
    
    if (skippedFormulaCells && skippedFormulaCells.length) {
      console.log(`[Test] 已跳过保留的公式个数: ${skippedFormulaCells.length}`);
    }
    
    // Call the check-export script directly using node runner
    const checkExportPath = path.join(__dirname, 'check-export.js');
    console.log('[Test] 转交 check-export.js 运行自检...');
    const { execSync } = await import('node:child_process');
    execSync(`node "${checkExportPath}" "${outPath}"`, { stdio: 'inherit' });
    
  } catch (err) {
    console.error('[Test] 运行出错:', err);
    process.exit(1);
  }
}

runTest();
