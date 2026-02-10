import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', '..', 'data');

let classData: any = {};
let itemIds: any = {};
let raidsData: any = {};
let recipesData: any = {};
let referenceData: any = {};

export function loadData(): void {
  classData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'classData.json'), 'utf-8'));
  itemIds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'itemIds.json'), 'utf-8'));
  raidsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'raidsData.json'), 'utf-8'));
  recipesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recipesData.json'), 'utf-8'));
  referenceData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'referenceData.json'), 'utf-8'));
  console.log(`Loaded: ${Object.keys(classData).length} classes, ${Object.keys(itemIds).length} items`);
}

export function getClassData() { return classData; }
export function getItemIds() { return itemIds; }
export function getRaidsData() { return raidsData; }
export function getRecipesData() { return recipesData; }
export function getReferenceData() { return referenceData; }

export function getDataStats() {
  return {
    classes: Object.keys(classData).length,
    items: Object.keys(itemIds).length,
    raids: Object.keys(raidsData).length,
    recipes: Object.keys(recipesData).length
  };
}
