/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_PDF_SIZE_MB = 15;
const MAX_IMAGE_SIZE_MB = 10;

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Convierte un File a una string base64 (data URL).
 * Usado en PatientDoctorChat, NewOrderForm, PatientForm.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida que un archivo sea un PDF válido y no supere el tamaño máximo.
 */
export function validatePdfFile(file: File): FileValidationResult {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return { valid: false, error: 'Formato no válido. Solo se admiten archivos en formato PDF (.pdf).' };
  }
  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `El archivo excede el tamaño máximo permitido (${MAX_PDF_SIZE_MB} MB).` };
  }
  return { valid: true };
}

/**
 * Valida que un archivo sea una imagen válida y no supere el tamaño máximo.
 */
export function validateImageFile(file: File): FileValidationResult {
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    return { valid: false, error: 'Solo se admiten archivos de imagen (JPG, PNG, WEBP).' };
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `La imagen no puede superar los ${MAX_IMAGE_SIZE_MB} MB.` };
  }
  return { valid: true };
}

/**
 * Comprime una imagen usando un Canvas y devuelve la cadena base64.
 * Esto es crucial para no exceder los límites de Vercel (4.5MB).
 */
export function compressImageAndGetBase64(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // Si no es imagen (ej. PDF), retornamos el base64 sin comprimir
    if (!file.type.startsWith('image/')) {
      return fileToBase64(file).then(resolve).catch(reject);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string); // fallback
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a JPEG comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
