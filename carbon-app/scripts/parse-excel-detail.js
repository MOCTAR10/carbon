const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const workbook = XLSX.readFile(filePath);

// Focus on the main calculator sheets
const mainSheets = ['Energy', 'Non energy', 'Inputs', 'Freight', 'Transportation', 'Direct waste', 'Capital goods'];
const efSheets = ['EF Energy', 'EF Non energy', 'EF Inputs', 'EF Wastes', 'EF Freight', 'EF Transportation', 'EF Capital goods'];

function extractSheet(sheetName, maxRows = 150) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return jsonData.slice(0, maxRows);
}

// Extract main calculator sheets
console.log('==========================================');
console.log('MAIN CALCULATOR SHEETS');
console.log('==========================================');

mainSheets.forEach(name => {
  const rows = extractSheet(name, 120);
  if (!rows) { console.log(`\n--- ${name}: NOT FOUND ---`); return; }
  console.log(`\n\n========== ${name} (${rows.length} rows shown) ==========`);
  rows.forEach((row, i) => {
    const vals = row.map(v => {
      if (v === '') return '';
      return String(v).substring(0, 50);
    }).filter((v, idx) => idx < 20);
    const nonEmpty = vals.filter(v => v !== '');
    if (nonEmpty.length > 0) {
      console.log(`R${i}: ${vals.join(' | ')}`);
    }
  });
});

// Extract EF sheets - just first 80 rows to see structure
console.log('\n\n==========================================');
console.log('EMISSION FACTOR SHEETS');
console.log('==========================================');

efSheets.forEach(name => {
  const rows = extractSheet(name, 80);
  if (!rows) { console.log(`\n--- ${name}: NOT FOUND ---`); return; }
  console.log(`\n\n========== ${name} (${rows.length} rows shown) ==========`);
  rows.forEach((row, i) => {
    const vals = row.map(v => {
      if (v === '') return '';
      return String(v).substring(0, 45);
    }).filter((v, idx) => idx < 22);
    const nonEmpty = vals.filter(v => v !== '');
    if (nonEmpty.length > 0) {
      console.log(`R${i}: ${vals.join(' | ')}`);
    }
  });
});

// Also extract formulas from Energy sheet to understand calculations
console.log('\n\n==========================================');
console.log('FORMULAS in Energy sheet');
console.log('==========================================');
const energySheet = workbook.Sheets['Energy'];
if (energySheet) {
  const range = XLSX.utils.decode_range(energySheet['!ref']);
  for (let R = 0; R <= Math.min(range.e.r, 80); R++) {
    for (let C = 0; C <= Math.min(range.e.c, 20); C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = energySheet[addr];
      if (cell && cell.f) {
        console.log(`  ${addr}: =${cell.f.substring(0, 100)}`);
      }
    }
  }
}

// Also check the export sheets for the final summary structure
console.log('\n\n==========================================');
console.log('EXPORT POSTES (summary items)');
console.log('==========================================');
const exportRows = extractSheet('export postes', 80);
if (exportRows) {
  exportRows.forEach((row, i) => {
    const vals = row.map(v => String(v).substring(0, 50)).filter((v, idx) => idx < 8);
    const nonEmpty = vals.filter(v => v !== '');
    if (nonEmpty.length > 0) {
      console.log(`R${i}: ${vals.join(' | ')}`);
    }
  });
}

console.log('\n\n==========================================');
console.log('EXPORT SOUS-POSTES (sub-items)');
console.log('==========================================');
const exportSubRows = extractSheet('export sous-postes', 80);
if (exportSubRows) {
  exportSubRows.forEach((row, i) => {
    const vals = row.map(v => String(v).substring(0, 50)).filter((v, idx) => idx < 10);
    const nonEmpty = vals.filter(v => v !== '');
    if (nonEmpty.length > 0) {
      console.log(`R${i}: ${vals.join(' | ')}`);
    }
  });
}
