import test from 'node:test';
import assert from 'node:assert/strict';
import { extractImagesFromDataTransfer, readImagesFromClipboard } from './clipboard';

test('extractImagesFromDataTransfer extracts image files when image items are present', () => {
  const imageBlob = new Blob(['dummy image content'], { type: 'image/png' });
  const dummyFile = new File([imageBlob], 'sample.png', { type: 'image/png' });

  const mockDataTransfer = {
    items: [
      {
        kind: 'file',
        type: 'image/png',
        getAsFile: () => dummyFile
      }
    ],
    files: [dummyFile]
  } as unknown as DataTransfer;

  const result = extractImagesFromDataTransfer(mockDataTransfer);
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].type, 'image/png');
  assert.equal(result.files[0].name, 'sample.png');
  assert.equal(result.hasText, false);
});

test('extractImagesFromDataTransfer strictly rejects when only text is present in clipboard', () => {
  const mockDataTransfer = {
    items: [
      {
        kind: 'string',
        type: 'text/plain',
        getAsFile: () => null
      },
      {
        kind: 'string',
        type: 'text/html',
        getAsFile: () => null
      }
    ],
    files: []
  } as unknown as DataTransfer;

  const result = extractImagesFromDataTransfer(mockDataTransfer);
  assert.equal(result.files.length, 0);
  assert.equal(result.hasText, true);
  assert.equal(
    result.error,
    'Solo se permiten formatos de imagen para pegar. No se permite pegar texto.'
  );
});

test('extractImagesFromDataTransfer handles empty or null data transfer', () => {
  const resultNull = extractImagesFromDataTransfer(null);
  assert.equal(resultNull.files.length, 0);
  assert.ok(resultNull.error);

  const resultEmpty = extractImagesFromDataTransfer({ items: [], files: [] } as unknown as DataTransfer);
  assert.equal(resultEmpty.files.length, 0);
  assert.equal(resultEmpty.error, 'El portapapeles no contiene una imagen válida.');
});

test('readImagesFromClipboard extracts image files from navigator.clipboard', async () => {
  const originalNavigator = globalThis.navigator;
  const imageBlob = new Blob(['dummy-data'], { type: 'image/png' });

  // Mock navigator.clipboard
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: {
        read: async () => [
          {
            types: ['image/png'],
            getType: async (_type: string) => imageBlob
          }
        ]
      }
    },
    configurable: true,
    writable: true
  });

  try {
    const res = await readImagesFromClipboard();
    assert.equal(res.success, true);
    assert.equal(res.files.length, 1);
    assert.equal(res.files[0].type, 'image/png');
    assert.ok(res.files[0].name.startsWith('receta_portapapeles_'));
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  }
});

test('readImagesFromClipboard strictly rejects when clipboard only contains text', async () => {
  const originalNavigator = globalThis.navigator;

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: {
        read: async () => [
          {
            types: ['text/plain', 'text/html'],
            getType: async () => new Blob(['Texto copiado'], { type: 'text/plain' })
          }
        ]
      }
    },
    configurable: true,
    writable: true
  });

  try {
    const res = await readImagesFromClipboard();
    assert.equal(res.success, false);
    assert.equal(res.files.length, 0);
    assert.equal(
      res.error,
      'Solo se permiten formatos de imagen para pegar. No se permite pegar texto.'
    );
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  }
});

test('readImagesFromClipboard handles NotAllowedError (permission denied)', async () => {
  const originalNavigator = globalThis.navigator;

  const notAllowedError = new Error('Permission denied');
  notAllowedError.name = 'NotAllowedError';

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: {
        read: async () => {
          throw notAllowedError;
        }
      }
    },
    configurable: true,
    writable: true
  });

  try {
    const res = await readImagesFromClipboard();
    assert.equal(res.success, false);
    assert.equal(res.files.length, 0);
    assert.ok(res.error?.includes('Permiso denegado'));
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  }
});
