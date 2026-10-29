const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const workbook = XLSX.readFile(filePath);

function getSheetJSON(name, maxR) {
  const s = workbook.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, defval: '' }).slice(0, maxR || 300);
}

function getCellsWithFormulas(name, maxR, maxC) {
  const s = workbook.Sheets[name];
  if (!s) return {};
  const out = {};
  for (let R = 0; R <= (maxR||100); R++) {
    for (let C = 0; C <= (maxC||25); C++) {
      const a = XLSX.utils.encode_cell({r:R,c:C});
      const c = s[a];
      if (c) out[a] = { v: c.v, f: c.f || null, t: c.t };
    }
  }
  return out;
}

// ============ ENERGY SHEET ============
console.log('=== ENERGY SHEET STRUCTURE ===');
const energyCells = getCellsWithFormulas('Energy', 90, 20);
// Print row by row
for (let R = 0; R <= 90; R++) {
  const parts = [];
  for (let C = 0; C <= 20; C++) {
    const a = XLSX.utils.encode_cell({r:R,c:C});
    const c = energyCells[a];
    if (c) {
      const col = XLSX.utils.encode_col(C);
      const val = c.f ? `=F[${c.f.substring(0,80)}]` : (c.v !== undefined ? String(c.v).substring(0,60) : '');
      if (val) parts.push(`${col}="${val}"`);
    }
  }
  if (parts.length > 0) console.log(`R${R}: ${parts.join(' | ')}`);
}

// ============ EF ENERGY - all emission factors ============
console.log('\n\n=== EF ENERGY - EMISSION FACTORS ===');
const efEnergy = getSheetJSON('EF Energy', 200);
efEnergy.forEach((row, i) => {
  // Cols: usually has index, name, unit, source, region, uncertainty, factor values
  const clean = row.map(v => String(v).substring(0, 50));
  const nonEmpty = clean.filter(v => v && v.trim());
  if (nonEmpty.length > 1) console.log(`R${i}: ${clean.slice(0, 20).join(' | ')}`);
});

// ============ NON ENERGY SHEET ============
console.log('\n\n=== NON ENERGY SHEET STRUCTURE ===');
const neCells = getCellsWithFormulas('Non energy', 80, 20);
for (let R = 0; R <= 80; R++) {
  const parts = [];
  for (let C = 0; C <= 20; C++) {
    const a = XLSX.utils.encode_cell({r:R,c:C});
    const c = neCells[a];
    if (c) {
      const col = XLSX.utils.encode_col(C);
      const val = c.f ? `=F[${c.f.substring(0,80)}]` : (c.v !== undefined ? String(c.v).substring(0,60) : '');
      if (val) parts.push(`${col}="${val}"`);
    }
  }
  if (parts.length > 0) console.log(`R${R}: ${parts.join(' | ')}`);
}

// ============ EF NON ENERGY ============
console.log('\n\n=== EF NON ENERGY - EMISSION FACTORS ===');
const efNE = getSheetJSON('EF Non energy', 200);
efNE.forEach((row, i) => {
  const clean = row.map(v => String(v).substring(0, 50));
  const nonEmpty = clean.filter(v => v && v.trim());
  if (nonEmpty.length > 1) console.log(`R${i}: ${clean.slice(0, 20).join(' | ')}`);
});
