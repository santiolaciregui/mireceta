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
