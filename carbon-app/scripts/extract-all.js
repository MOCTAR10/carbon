const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const wb = XLSX.readFile(filePath);

function getRows(name, max) {
  const s = wb.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, defval: '' }).slice(0, max || 500);
}

function getFormulas(name, maxR, maxC) {
  const s = wb.Sheets[name];
  if (!s) return [];
  const out = [];
  for (let R = 0; R <= maxR; R++) {
    const row = {};
    for (let C = 0; C <= maxC; C++) {
      const a = XLSX.utils.encode_cell({r:R,c:C});
      const c = s[a];
      if (c) row[XLSX.utils.encode_col(C)] = { v: c.v, f: c.f };
    }
    out.push(row);
  }
  return out;
}

// ===== 1. ENERGY SHEET - full structure =====
console.log('##### ENERGY SHEET #####');
const eRows = getFormulas('Energy', 90, 18);
eRows.forEach((row, i) => {
  const parts = [];
  Object.entries(row).forEach(([col, c]) => {
    const v = c.f ? `[F=${c.f.substring(0,100)}]` : String(c.v !== undefined ? c.v : '').substring(0,60);
    if (v) parts.push(`${col}:${v}`);
  });
  if (parts.length) console.log(`  ${i}: ${parts.join(' | ')}`);
});

// ===== 2. All other calculator sheets =====
['Non energy', 'Inputs', 'Freight', 'Transportation', 'Direct waste', 'Capital goods'].forEach(name => {
  console.log(`\n\n##### ${name.toUpperCase()} SHEET #####`);
  const rows = getFormulas(name, 90, 18);
  rows.forEach((row, i) => {
    const parts = [];
    Object.entries(row).forEach(([col, c]) => {
      const v = c.f ? `[F=${c.f.substring(0,100)}]` : String(c.v !== undefined ? c.v : '').substring(0,60);
      if (v) parts.push(`${col}:${v}`);
    });
    if (parts.length) console.log(`  ${i}: ${parts.join(' | ')}`);
  });
});

// ===== 3. EF Energy - extract all factors as structured data =====
console.log('\n\n##### EF ENERGY - ALL FACTORS #####');
const efE = getRows('EF Energy', 2000);
// Find header row
let efEHeader = -1;
efE.forEach((r, i) => { if (String(r[8]).includes('name') || String(r[8]).includes('Name') || i === 8) efEHeader = i; });
console.log(`Header search: row 8 = ${efE[8]?.slice(0,15).join(' | ')}`);
console.log(`Header search: row 9 = ${efE[9]?.slice(0,15).join(' | ')}`);
console.log(`Header search: row 10 = ${efE[10]?.slice(0,15).join(' | ')}`);
// Print rows 8-15 fully to understand structure
for (let i = 8; i <= 15; i++) {
  if (efE[i]) console.log(`  R${i}: ${efE[i].slice(0,20).map((v,j) => `[${j}]${String(v).substring(0,40)}`).join(' | ')}`);
}
// Print actual data rows (where col I has a fuel name)
let count = 0;
for (let i = 10; i < efE.length && count < 80; i++) {
  const r = efE[i];
  if (r[8] && String(r[8]).trim()) { // col I = index 8 has content
    console.log(`  R${i}: idx=${r[3]} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | type=${r[13]} | CO2=${r[14]} | total=${r[15]} | CH4=${r[16]} | bio=${r[17]} | N2O=${r[18]} | other=${r[19]}`);
    count++;
  }
}
console.log(`Total EF Energy factors printed: ${count}`);

// ===== 4. EF Non energy =====
console.log('\n\n##### EF NON ENERGY - ALL FACTORS #####');
const efNE = getRows('EF Non energy', 500);
for (let i = 8; i <= 12; i++) {
  if (efNE[i]) console.log(`  R${i}: ${efNE[i].slice(0,20).map((v,j) => `[${j}]${String(v).substring(0,40)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efNE.length && count < 60; i++) {
  const r = efNE[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | type=${r[13]} | CO2=${r[14]} | total=${r[15]}`);
    count++;
  }
}

// ===== 5. EF Inputs =====
console.log('\n\n##### EF INPUTS - ALL FACTORS #####');
const efIn = getRows('EF Inputs', 2100);
for (let i = 8; i <= 12; i++) {
  if (efIn[i]) console.log(`  R${i}: ${efIn[i].slice(0,22).map((v,j) => `[${j}]${String(v).substring(0,35)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efIn.length && count < 80; i++) {
  const r = efIn[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | cat=${String(r[7]).substring(0,20)} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | total=${r[14]}`);
    count++;
  }
}

// ===== 6. EF Freight =====
console.log('\n\n##### EF FREIGHT - ALL FACTORS #####');
const efFr = getRows('EF Freight', 1100);
for (let i = 8; i <= 12; i++) {
  if (efFr[i]) console.log(`  R${i}: ${efFr[i].slice(0,20).map((v,j) => `[${j}]${String(v).substring(0,35)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efFr.length && count < 60; i++) {
  const r = efFr[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | type=${r[13]} | total=${r[14]}`);
    count++;
  }
}

// ===== 7. EF Transportation =====
console.log('\n\n##### EF TRANSPORTATION - ALL FACTORS #####');
const efTr = getRows('EF Transportation', 1100);
for (let i = 8; i <= 12; i++) {
  if (efTr[i]) console.log(`  R${i}: ${efTr[i].slice(0,20).map((v,j) => `[${j}]${String(v).substring(0,35)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efTr.length && count < 60; i++) {
  const r = efTr[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | type=${r[13]} | total=${r[14]}`);
    count++;
  }
}

// ===== 8. EF Wastes =====
console.log('\n\n##### EF WASTES - ALL FACTORS #####');
const efW = getRows('EF Wastes', 1100);
for (let i = 8; i <= 12; i++) {
  if (efW[i]) console.log(`  R${i}: ${efW[i].slice(0,20).map((v,j) => `[${j}]${String(v).substring(0,35)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efW.length && count < 60; i++) {
  const r = efW[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | type=${r[13]} | total=${r[14]}`);
    count++;
  }
}

// ===== 9. EF Capital goods =====
console.log('\n\n##### EF CAPITAL GOODS - ALL FACTORS #####');
const efCG = getRows('EF Capital goods', 1100);
for (let i = 8; i <= 12; i++) {
  if (efCG[i]) console.log(`  R${i}: ${efCG[i].slice(0,22).map((v,j) => `[${j}]${String(v).substring(0,35)}`).join(' | ')}`);
}
count = 0;
for (let i = 10; i < efCG.length && count < 60; i++) {
  const r = efCG[i];
  if (r[8] && String(r[8]).trim()) {
    console.log(`  R${i}: idx=${r[3]} | cat=${String(r[7]).substring(0,20)} | name=${String(r[8]).substring(0,40)} | unit=${r[9]} | src=${r[10]} | region=${r[11]} | unc=${r[12]} | total=${r[14]}`);
    count++;
  }
}

// ===== 10. Summary - export postes structure =====
console.log('\n\n##### EXPORT POSTES (Bilan Carbone items) #####');
const expP = getFormulas('export postes', 100, 8);
expP.forEach((row, i) => {
  const parts = [];
  Object.entries(row).forEach(([col, c]) => {
    const v = c.f ? `[F=${c.f.substring(0,80)}]` : String(c.v !== undefined ? c.v : '').substring(0,60);
    if (v) parts.push(`${col}:${v}`);
  });
  if (parts.length) console.log(`  ${i}: ${parts.join(' | ')}`);
});
