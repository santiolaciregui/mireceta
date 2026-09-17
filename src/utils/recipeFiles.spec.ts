/**
 * File: recipeFiles.spec.ts
 * Task: US-008 / T-005
 * Date: 2026-09-17
 * Decisions: Cover new arrays, legacy fallback, and electronic prescriptions.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderRecipeFiles } from './recipeFiles';

test('returns all recipe files from a multiple-file order', () => {
  const files = getOrderRecipeFiles({
    recipeFiles: [
      { url: '/recipes/one.pdf', name: 'one.pdf' },
      { url: '/recipes/two.pdf', name: 'two.pdf' },
    ],
    recipePdfUrl: '/recipes/one.pdf',
    recipePdfName: 'one.pdf',
  });

  assert.equal(files.length, 2);
  assert.equal(files[1].name, 'two.pdf');
});

test('builds a recipe file from legacy single-file fields', () => {
  assert.deepEqual(getOrderRecipeFiles({
    recipePdfUrl: '/recipes/legacy.pdf',
    recipePdfName: 'legacy.pdf',
  }), [{ url: '/recipes/legacy.pdf', name: 'legacy.pdf' }]);
});

test('does not expose electronic prescriptions as downloadable files', () => {
  assert.deepEqual(getOrderRecipeFiles({ recipePdfUrl: 'PAMI', recipePdfName: 'electronic' }), []);
});
