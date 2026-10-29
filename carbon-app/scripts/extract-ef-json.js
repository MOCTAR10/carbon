const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../Carbon-Footprint_Template.xlsx');
const wb = XLSX.readFile(filePath);

function getRows(name) {
  const s = wb.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, defval: '' });
}

// Extract EF Energy - structured
const efEnergy = getRows('EF Energy');
const energyFactors = [];
for (let i = 12; i < efEnergy.length; i++) {
  const r = efEnergy[i];
  const name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], type = r[13], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    energyFactors.push({ name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, type: String(type), totalCO2eq: Number(total) || 0, CO2: Number(r[15]) || 0, CH4f: Number(r[16]) || 0, CH4b: Number(r[17]) || 0, N2O: Number(r[18]) || 0, otherGHG: Number(r[19]) || 0 });
  }
}

// Extract EF Non energy
const efNE = getRows('EF Non energy');
const nonEnergyFactors = [];
for (let i = 12; i < efNE.length; i++) {
  const r = efNE[i];
  const name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], type = r[13], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    nonEnergyFactors.push({ name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, type: String(type), totalCO2eq: Number(total) || 0, CO2: Number(r[15]) || 0 });
  }
}

// Extract EF Inputs
const efIn = getRows('EF Inputs');
const inputsFactors = [];
for (let i = 12; i < efIn.length; i++) {
  const r = efIn[i];
  const cat = r[7], name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    inputsFactors.push({ category: String(cat).trim(), name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, totalCO2eq: Number(total) || 0 });
  }
}

// Extract EF Freight
const efFr = getRows('EF Freight');
const freightFactors = [];
for (let i = 12; i < efFr.length; i++) {
  const r = efFr[i];
  const name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], type = r[13], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    freightFactors.push({ name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, type: String(type), totalCO2eq: Number(total) || 0 });
  }
}

// Extract EF Transportation
const efTr = getRows('EF Transportation');
const transportFactors = [];
for (let i = 12; i < efTr.length; i++) {
  const r = efTr[i];
  const name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], type = r[13], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    transportFactors.push({ name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, type: String(type), totalCO2eq: Number(total) || 0 });
  }
}

// Extract EF Wastes
const efW = getRows('EF Wastes');
const wasteFactors = [];
for (let i = 12; i < efW.length; i++) {
  const r = efW[i];
  const name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], type = r[13], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    wasteFactors.push({ name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, type: String(type), totalCO2eq: Number(total) || 0 });
  }
}

// Extract EF Capital goods
const efCG = getRows('EF Capital goods');
const capitalFactors = [];
for (let i = 12; i < efCG.length; i++) {
  const r = efCG[i];
  const cat = r[7], name = r[8], unit = r[9], src = r[10], region = r[11], unc = r[12], total = r[14];
  if (name && String(name).trim() && total !== '' && total !== undefined) {
    capitalFactors.push({ category: String(cat).trim(), name: String(name).trim(), unit: String(unit), source: String(src), region: String(region), uncertainty: Number(unc) || 0, totalCO2eq: Number(total) || 0 });
  }
}

// Now extract the calculator structure (what rows exist in each calculator sheet)
function extractCalcRows(sheetName) {
  const rows = getRows(sheetName);
  const structure = [];
  for (let i = 0; i < Math.min(rows.length, 120); i++) {
    const r = rows[i];
    const b = String(r[1] || '').trim(); // Column B usually has the name
    if (b) structure.push({ row: i, name: b, colA: String(r[0] || '').trim() });
  }
  return structure;
}

const result = {
  energyFactors: energyFactors.length,
  nonEnergyFactors: nonEnergyFactors.length,
  inputsFactors: inputsFactors.length,
  freightFactors: freightFactors.length,
  transportFactors: transportFactors.length,
  wasteFactors: wasteFactors.length,
  capitalFactors: capitalFactors.length,
  // Get unique fuel names per unit for Energy (Mainland France only for simplicity)
  energyMainlandFuels: [...new Set(energyFactors.filter(f => f.region === 'Mainland France').map(f => `${f.name}|${f.unit}|${f.type}`))],
  // Get unique inputs categories
  inputsCategories: [...new Set(inputsFactors.map(f => f.category))].filter(c => c),
  // Get unique freight types
  freightTypes: [...new Set(freightFactors.map(f => `${f.name}|${f.unit}|${f.type}`))].slice(0, 100),
  // Get unique transport types  
  transportTypes: [...new Set(transportFactors.map(f => `${f.name}|${f.unit}|${f.type}`))].slice(0, 100),
  // Calc structures
  energyStructure: extractCalcRows('Energy'),
  directWasteStructure: extractCalcRows('Direct waste'),
  capitalStructure: extractCalcRows('Capital goods'),
};

fs.writeFileSync(path.resolve(__dirname, 'ef-summary.json'), JSON.stringify(result, null, 2));

// Print summary stats
console.log('EF Energy factors:', energyFactors.length);
console.log('EF Non energy factors:', nonEnergyFactors.length);
console.log('EF Inputs factors:', inputsFactors.length);
console.log('EF Freight factors:', freightFactors.length);
console.log('EF Transportation factors:', transportFactors.length);
console.log('EF Wastes factors:', wasteFactors.length);
console.log('EF Capital goods factors:', capitalFactors.length);

// Print unique Energy fuels for Mainland France with kgCO2eq/liter or kgCO2eq/kWh LHV
console.log('\n--- Mainland France Energy fuels (kgCO2eq/kWh LHV) ---');
const mfFuels = energyFactors.filter(f => f.region === 'Mainland France' && f.unit === 'kgCO2eq/kWh LHV');
const uniqueFuels = {};
mfFuels.forEach(f => { 
  if (!uniqueFuels[f.name]) uniqueFuels[f.name] = {};
  uniqueFuels[f.name][f.type] = f.totalCO2eq;
});
Object.entries(uniqueFuels).forEach(([name, types]) => {
  console.log(`  ${name}: Upstream=${types.Upstream || 0}, Combustion=${types.Combustion || 0}`);
});

// Print Mainland France electricity
console.log('\n--- Mainland France Electricity ---');
const elec = energyFactors.filter(f => f.region === 'Mainland France' && f.name.includes('use'));
elec.forEach(f => console.log(`  ${f.name} | ${f.unit} | ${f.type} | total=${f.totalCO2eq}`));

// Print unique non-energy types
console.log('\n--- Non energy factor names ---');
const neNames = [...new Set(nonEnergyFactors.map(f => f.name))];
neNames.forEach(n => console.log(`  ${n}`));

// Print waste factor names
console.log('\n--- Waste factor names (unique) ---');
const wNames = [...new Set(wasteFactors.map(f => `${f.name} | ${f.unit} | ${f.type}`))];
wNames.slice(0, 50).forEach(n => console.log(`  ${n}`));

// Print transport names
console.log('\n--- Transport factor names (unique, first 30) ---');
const tNames = [...new Set(transportFactors.map(f => f.name))];
tNames.slice(0, 30).forEach(n => console.log(`  ${n}`));

// Print capital goods categories
console.log('\n--- Capital goods categories ---');
const cgCats = [...new Set(capitalFactors.map(f => f.category))];
cgCats.forEach(c => console.log(`  ${c}`));

// Write full data for code generation
const fullData = { energyFactors, nonEnergyFactors, inputsFactors, freightFactors, transportFactors, wasteFactors, capitalFactors };
fs.writeFileSync(path.resolve(__dirname, 'ef-full.json'), JSON.stringify(fullData, null, 2));
console.log('\nFull data written to ef-full.json');
