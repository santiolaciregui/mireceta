/**
 * Utility to copy text to clipboard reliably across main windows, 
 * popups, iframe portals, and Document Picture-in-Picture windows.
 */
export async function copyToClipboard(
  text: string,
  targetDoc?: Document | null
): Promise<boolean> {
  if (!text) return false;

  const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
  const targetWin = doc?.defaultView || (typeof window !== 'undefined' ? window : null);

  // 1. Try Clipboard API on target window (e.g., PiP window or popup window)
  if (targetWin?.navigator?.clipboard?.writeText) {
    try {
      await targetWin.navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Target window navigator.clipboard failed, trying main window or fallback:', err);
    }
  }

  // 2. Try Clipboard API on main window
  if (typeof window !== 'undefined' && window?.navigator?.clipboard?.writeText && window !== targetWin) {
    try {
      await window.navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Main window navigator.clipboard failed, trying execCommand fallback:', err);
    }
  }

  // 3. Fallback to DOM-based copy using execCommand('copy') in target document
  if (doc && doc.body) {
    try {
      const textarea = doc.createElement('textarea');
      textarea.value = text;
      // Prevent scrolling page to bottom
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';

      doc.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      // Safari iOS range selection compatibility
      const range = doc.createRange();
      range.selectNodeContents(textarea);
      const selection = targetWin?.getSelection ? targetWin.getSelection() : window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = doc.execCommand('copy');
      doc.body.removeChild(textarea);
      if (successful) return true;
    } catch (err) {
      console.error('execCommand copy failed:', err);
    }
  }

  return false;
}

export interface ReadClipboardImagesResult {
  success: boolean;
  files: File[];
  error?: string;
}

/**
 * Extracts image files from a DataTransfer object (e.g. from a paste event).
 * Rejects text-only payloads and non-image files.
 */
export function extractImagesFromDataTransfer(dataTransfer: DataTransfer | null): {
  files: File[];
  hasText: boolean;
  error?: string;
} {
  if (!dataTransfer) {
    return { files: [], hasText: false, error: 'No se encontraron datos en el portapapeles.' };
  }

  const items = Array.from(dataTransfer.items || []);
  const filesList = Array.from(dataTransfer.files || []);
  const imageFiles: File[] = [];
  let hasText = false;

  // Check items from DataTransferItemList
  if (items.length > 0) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const ext = item.type.split('/')[1] || 'png';
          const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const finalName = file.name && file.name !== 'image.png' && !file.name.startsWith('image.')
            ? file.name
            : `receta_portapapeles_${timestamp}_${imageFiles.length + 1}.${normalizedExt}`;
          imageFiles.push(new File([file], finalName, { type: file.type, lastModified: Date.now() }));
        }
      } else if (item.type === 'text/plain' || item.type === 'text/html' || item.kind === 'string') {
        hasText = true;
      }
    }
  } else if (filesList.length > 0) {
    for (const file of filesList) {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }
  }

  if (imageFiles.length === 0) {
    if (hasText) {
      return {
        files: [],
        hasText: true,
        error: 'Solo se permiten formatos de imagen para pegar. No se permite pegar texto.'
      };
    }
    return {
      files: [],
      hasText: false,
      error: 'El portapapeles no contiene una imagen válida.'
    };
  }

  return { files: imageFiles, hasText };
}

/**
 * Reads image files from system clipboard using the asynchronous Clipboard API.
 * Strictly allows only image formats (e.g. PNG, JPG, JPEG, WEBP).
 * Rejects text or any non-image content with an explicit error.
 */
export async function readImagesFromClipboard(): Promise<ReadClipboardImagesResult> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return {
      success: false,
      files: [],
      error: 'El acceso al portapapeles no está disponible en este navegador o entorno.'
    };
  }

  if (!navigator.clipboard.read) {
    return {
      success: false,
      files: [],
      error: 'Su navegador no soporta la lectura directa de imágenes desde el portapapeles. Asegúrese de estar usando HTTPS o utilice el selector de archivos.'
    };
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    if (!clipboardItems || clipboardItems.length === 0) {
      return {
        success: false,
        files: [],
        error: 'El portapapeles está vacío.'
      };
    }

    const imageFiles: File[] = [];
    let containsTextOnly = false;

    for (const item of clipboardItems) {
      // Find image type
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        let ext = 'png';
        if (imageType.includes('jpeg') || imageType.includes('jpg')) ext = 'jpg';
        else if (imageType.includes('webp')) ext = 'webp';
        else if (imageType.includes('png')) ext = 'png';
        else if (imageType.includes('gif')) ext = 'gif';

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `receta_portapapeles_${timestamp}_${imageFiles.length + 1}.${ext}`;
        const file = new File([blob], fileName, { type: imageType, lastModified: Date.now() });
        imageFiles.push(file);
      } else {
        if (item.types.some(t => t.includes('text') || t === 'text/plain' || t === 'text/html')) {
          containsTextOnly = true;
        }
      }
    }

    if (imageFiles.length === 0) {
      if (containsTextOnly) {
        return {
          success: false,
          files: [],
          error: 'Solo se permiten formatos de imagen para pegar. No se permite pegar texto.'
        };
      }
      return {
        success: false,
        files: [],
        error: 'El portapapeles no contiene una imagen válida.'
      };
    }

    return {
      success: true,
      files: imageFiles
    };
  } catch (err: unknown) {
    const domError = err as { name?: string; message?: string } | undefined;
    if (domError?.name === 'NotAllowedError') {
      return {
        success: false,
        files: [],
        error: 'Permiso denegado para acceder al portapapeles. Habilite el permiso de portapapeles en su navegador.'
      };
    }
    return {
      success: false,
      files: [],
      error: domError?.message || 'Error al intentar acceder al portapapeles.'
    };
  }
}
