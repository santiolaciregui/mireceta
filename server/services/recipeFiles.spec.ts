/**
 * File: recipeFiles.spec.ts
 * Task: US-008 / T-005
 * Date: 2026-09-17
 * Decisions: Exercise backend validation through the existing service test runner.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderRecipeFiles, validateRecipeFiles } from '../utils/recipeFiles.js';

test('normalizes legacy recipe fields on the backend', () => {
  assert.deepEqual(getOrderRecipeFiles({
    recipePdfUrl: '/uploads/recipes/legacy.pdf',
    recipePdfName: 'legacy.pdf',
  }), [{ url: '/uploads/recipes/legacy.pdf', name: 'legacy.pdf' }]);
});

test('validates a multiple recipe payload', () => {
  const files = validateRecipeFiles([
    { url: 'https://example.test/one.pdf', name: ' one.pdf ' },
    { url: 'https://example.test/two.pdf', name: 'two.pdf' },
  ]);

  assert.equal(files.length, 2);
  assert.equal(files[0].name, 'one.pdf');
});

test('rejects empty or incomplete multiple recipe payloads', () => {
  assert.throws(() => validateRecipeFiles([]), /al menos un archivo/);
  assert.throws(() => validateRecipeFiles([{ url: '', name: 'missing.pdf' }]), /URL y nombre/);
});

test('validates and preserves a link without treating it as a file', () => {
  const link = { url: 'https://example.test/recipe?id=123', name: 'Enlace a receta', kind: 'link' };
  assert.deepEqual(validateRecipeFiles([link]), [link]);
  assert.deepEqual(getOrderRecipeFiles({ recipeFiles: [link as any] }), [link]);
});

test('rejects unsafe links, unknown kinds and mixed link/file payloads', () => {
  assert.throws(() => validateRecipeFiles([{ url: 'javascript:alert(1)', name: 'Rx', kind: 'link' }]), /enlace válido/);
  assert.throws(() => validateRecipeFiles([{ url: 'https://example.test', name: 'Rx', kind: 'other' }]), /Tipo de receta/);
  assert.throws(() => validateRecipeFiles([
    { url: 'https://example.test', name: 'Rx', kind: 'link' },
    { url: 'data:application/pdf;base64,AAAA', name: 'rx.pdf' },
  ]), /único enlace/);
});
