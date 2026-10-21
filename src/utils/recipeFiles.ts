/**
 * File: recipeFiles.ts
 * Task: US-008 / T-001
 * Date: 2026-09-17
 * Decisions: Normalize the new array and legacy single-file fields in one place.
 */

import { MedicalOrder, RecipeFile } from '../types';

export function getOrderRecipeFiles(
  order: Pick<MedicalOrder, 'recipeFiles' | 'recipePdfUrl' | 'recipePdfName'>
): RecipeFile[] {
  const recipeFiles = Array.isArray(order.recipeFiles)
    ? order.recipeFiles.filter((file): file is RecipeFile => Boolean(file?.url && file?.name))
    : [];

  if (recipeFiles.length > 0) return recipeFiles;
  if (!order.recipePdfUrl || order.recipePdfUrl === 'PAMI' || order.recipePdfUrl === 'IOMA') return [];

  return [{
    url: order.recipePdfUrl,
    name: order.recipePdfName || 'receta.pdf',
  }];
}

export function normalizeRecipeLink(value: string): string {
  const url = value.trim();
  if (!url || url.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(url) || !/^https?:\/\//i.test(url)) {
    throw new Error('Ingresá un enlace válido que comience con https:// o http://.');
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error('Invalid URL');
  } catch {
    throw new Error('Ingresá un enlace válido, sin usuario ni contraseña.');
  }
  return url;
}

export function buildRecipeLink(value: string): RecipeFile {
  return { url: normalizeRecipeLink(value), name: 'Enlace a receta', kind: 'link' };
}
