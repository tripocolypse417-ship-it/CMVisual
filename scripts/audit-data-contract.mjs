import fs from 'node:fs';
import path from 'node:path';
import { EVIDENCE_CLASS, SENSOR_FAMILY, DATA_CONTRACT_VERSION, MODALITIES } from '../src/lib/dataContract.js';

const root = process.cwd();
const requiredFiles = [
  'src/lib/dataContract.js',
  'src/lib/sensorNetwork.js',
  'src/lib/phoneVision.js',
  'src/lib/predictionEngine.js',
  'src/hooks/useWorldStateProjection.js',
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing required pipeline file: ${file}`);
}

const contract = fs.readFileSync(path.join(root, 'src/lib/dataContract.js'), 'utf8');
for (const value of Object.values(EVIDENCE_CLASS)) {
  if (!contract.includes(`'${value}'`)) failures.push(`evidence class missing from contract: ${value}`);
}
for (const value of Object.values(SENSOR_FAMILY)) {
  if (!contract.includes(`'${value}'`)) failures.push(`sensor family missing from contract: ${value}`);
}

const mustImportContract = [
  'src/lib/sensorNetwork.js',
  'src/lib/phoneVision.js',
  'src/lib/predictionEngine.js',
  'src/hooks/useWorldStateProjection.js',
];
for (const file of mustImportContract) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('dataContract')) failures.push(`${file} bypasses canonical data contract`);
}

const legacyDefinitions = [
  ['src/lib/sensorNetwork.js', 'export const NETWORK_EVIDENCE = Object.freeze'],
  ['src/lib/predictionEngine.js', 'export const EVIDENCE = Object.freeze'],
];
for (const [file, marker] of legacyDefinitions) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (source.includes(marker)) failures.push(`duplicate evidence taxonomy remains in ${file}`);
}

if (!Object.keys(MODALITIES).length) failures.push('modality registry is empty');

if (failures.length) {
  console.error('WaveRadar data-contract audit FAILED');
  failures.forEach(f => console.error(' - ' + f));
  process.exit(1);
}

console.log(`WaveRadar data-contract audit OK · ${DATA_CONTRACT_VERSION} · ${Object.keys(MODALITIES).length} modalities · ${Object.keys(EVIDENCE_CLASS).length} evidence classes · ${Object.keys(SENSOR_FAMILY).length} sensor families`);
