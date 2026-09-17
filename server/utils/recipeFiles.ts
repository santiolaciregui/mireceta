/**
 * File: recipeFiles.ts
 * Task: US-008 / T-001
 * Date: 2026-09-17
 * Decisions: Keep legacy single-file orders readable while validating new writes strictly.
 */

export interface RecipeFileData {
  url: string;
  name: string;
}

const MAX_RECIPE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_RECIPE_TOTAL_SIZE_BYTES = 35 * 1024 * 1024;

function getDataUrlSize(url: string): number {
  if (!url.startsWith('data:')) return 0;
  const base64 = url.slice(url.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function getOrderRecipeFiles(order: {
  recipeFiles?: RecipeFileData[];
  recipePdfUrl?: string | null;
  recipePdfName?: string | null;
}): RecipeFileData[] {
  const files = Array.isArray(order.recipeFiles)
    ? order.recipeFiles.filter((file): file is RecipeFileData => Boolean(file?.url && file?.name))
    : [];

  if (files.length > 0) return files;
  if (!order.recipePdfUrl || order.recipePdfUrl === 'PAMI' || order.recipePdfUrl === 'IOMA') return [];

  return [{ url: order.recipePdfUrl, name: order.recipePdfName || 'receta.pdf' }];
}

export function validateRecipeFiles(value: unknown): RecipeFileData[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Debe adjuntar al menos un archivo de receta.');
  }

  let totalSize = 0;
  return value.map((file, index) => {
    if (!file || typeof file !== 'object') {
      throw new Error(`El archivo de receta ${index + 1} no es válido.`);
    }

    const candidate = file as Record<string, unknown>;
    const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    if (!url || !name) {
      throw new Error(`El archivo de receta ${index + 1} debe incluir URL y nombre.`);
    }

    const fileSize = getDataUrlSize(url);
    if (fileSize > MAX_RECIPE_FILE_SIZE_BYTES) {
      throw new Error(`El archivo de receta ${index + 1} supera el máximo de 15 MB.`);
    }
    totalSize += fileSize;
    if (totalSize > MAX_RECIPE_TOTAL_SIZE_BYTES) {
      throw new Error('Los archivos de receta superan el máximo total de 35 MB.');
    }

    return { url, name };
  });
}
