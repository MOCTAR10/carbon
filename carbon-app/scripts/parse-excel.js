const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const workbook = XLSX.readFile(filePath);

const output = {};

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  // Get all cell data with formulas
  const cells = {};
  for (let R = range.s.r; R <= Math.min(range.e.r, 200); R++) {
    for (let C = range.s.c; C <= Math.min(range.e.c, 30); C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[addr];
      if (cell) {
        cells[addr] = {
          value: cell.v,
          type: cell.t,
          formula: cell.f || null,
        };
      }
    }
  }
  
  // Also get as JSON rows
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  output[sheetName] = {
    cells: cells,
    rows: jsonData.slice(0, 200),
    totalRows: jsonData.length
  };
});

// Write full output
const outPath = path.resolve(__dirname, 'excel-analysis.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log('Sheet names:', workbook.SheetNames);
console.log('Written to', outPath);

// Also write a summary per sheet
workbook.SheetNames.forEach(name => {
  const rows = output[name].rows;
  console.log(`\n=== ${name} === (${output[name].totalRows} rows)`);
  // Print first 5 rows
  rows.slice(0, 8).forEach((row, i) => {
    const vals = row.map(v => String(v).substring(0, 40));
    console.log(`  Row ${i}: ${vals.join(' | ')}`);
  });
});
