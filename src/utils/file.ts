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
