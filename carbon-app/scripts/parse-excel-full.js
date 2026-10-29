const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const workbook = XLSX.readFile(filePath);

function dumpSheet(sheetName, startRow, endRow, maxCols) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) { console.log(`Sheet "${sheetName}" not found`); return; }
  console.log(`\n\n######### ${sheetName} rows ${startRow}-${endRow} #########`);
  for (let R = startRow; R <= endRow; R++) {
    const vals = [];
    for (let C = 0; C <= maxCols; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[addr];
      if (cell) {
        let v = cell.f ? `[F:${cell.f.substring(0,60)}]` : String(cell.v).substring(0,50);
        vals.push(`${XLSX.utils.encode_col(C)}:${v}`);
      }
    }
    if (vals.length > 0) console.log(`R${R}: ${vals.join(' | ')}`);
  }
}

// Energy sheet - the main calculator for fuels, electricity
dumpSheet('Energy', 0, 100, 20);

// Non energy sheet
dumpSheet('Non energy', 0, 80, 20);

// Inputs sheet 
dumpSheet('Inputs', 0, 100, 20);

// Freight sheet
dumpSheet('Freight', 0, 80, 20);

// Transportation sheet
dumpSheet('Transportation', 0, 80, 20);

// Direct waste sheet
dumpSheet('Direct waste', 0, 80, 20);

// Capital goods sheet
dumpSheet('Capital goods', 0, 80, 20);

// EF Energy - emission factors for energy
dumpSheet('EF Energy', 0, 60, 25);

// EF Non energy
dumpSheet('EF Non energy', 0, 60, 20);

// EF Inputs - first 60 rows
dumpSheet('EF Inputs', 0, 60, 22);

// EF Wastes
dumpSheet('EF Wastes', 0, 60, 20);

// EF Freight
dumpSheet('EF Freight', 0, 60, 20);

// EF Transportation
dumpSheet('EF Transportation', 0, 60, 20);

// EF Capital goods
dumpSheet('EF Capital goods', 0, 60, 22);
