import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePdfFile, validateImageFile } from './file.js';

test('validatePdfFile accepts a valid PDF under 50 MB', () => {
  const file = {
    name: 'receta_escaneada.pdf',
    type: 'application/pdf',
    size: 21 * 1024 * 1024, // 21 MB
  } as any;

  const result = validatePdfFile(file);
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validatePdfFile rejects non-PDF files', () => {
  const file = {
    name: 'documento.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 1024,
  } as any;

  const result = validatePdfFile(file);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Solo se admiten archivos en formato PDF/);
});

test('validatePdfFile rejects files over 50 MB limit', () => {
  const file = {
    name: 'archivo_gigante.pdf',
    type: 'application/pdf',
    size: 55 * 1024 * 1024,
  } as any;

  const result = validatePdfFile(file);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /excede el tamaño máximo permitido/);
});

test('validateImageFile validates image formats and size', () => {
  const validImg = {
    name: 'foto.jpg',
    type: 'image/jpeg',
    size: 8 * 1024 * 1024,
  } as any;
  assert.equal(validateImageFile(validImg).valid, true);

  const nonImg = {
    name: 'receta.pdf',
    type: 'application/pdf',
    size: 1024,
  } as any;
  assert.equal(validateImageFile(nonImg).valid, false);
});
