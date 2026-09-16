/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_PDF_SIZE_MB = 50;
const MAX_IMAGE_SIZE_MB = 15;

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

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

let pdfjsPromise: Promise<any> | null = null;

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '6.3.289'}/build/pdf.worker.min.mjs`;
        }
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/**
 * Comprime un archivo PDF renderizando sus páginas a resolución controlada y reempaquetándolo.
 * Reduce archivos escaneados de 20+ MB a ~800 KB - 1.5 MB para no exceder los límites de Vercel (4.5 MB).
 */
export async function compressPdfAndGetBase64(
  file: File,
  maxDimension = 1400,
  quality = 0.72
): Promise<string> {
  // Si el PDF ya pesa 2.5 MB o menos, no necesita recompresión
  if (file.size <= 2.5 * 1024 * 1024) {
    return fileToBase64(file);
  }

  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    throw new Error(`El archivo PDF supera el tamaño máximo permitido (${MAX_PDF_SIZE_MB} MB).`);
  }

  try {
    const [pdfjs, { PDFDocument }] = await Promise.all([
      getPdfJs(),
      import('pdf-lib'),
    ]);

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;

    const newPdfDoc = await PDFDocument.create();
    const totalPages = Math.min(pdfDoc.numPages, 30);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      const currentMax = Math.max(unscaledViewport.width, unscaledViewport.height);
      const scale = currentMax > maxDimension
        ? maxDimension / currentMax
        : Math.min(1.5, maxDimension / currentMax);

      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el lienzo para compresión');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
      const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);
      const newPage = newPdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    }

    const compressedBytes = await newPdfDoc.save();
    const base64 = uint8ArrayToBase64(compressedBytes);
    return `data:application/pdf;base64,${base64}`;
  } catch (err: any) {
    console.warn('[compressPdfAndGetBase64] Fallback al archivo original:', err);
    // Si el archivo original aún cabe en Vercel (< 4MB), usarlo
    if (file.size < 4 * 1024 * 1024) {
      return fileToBase64(file);
    }
    throw new Error(
      'El archivo PDF supera el tamaño máximo permitido y no pudo comprimirse automáticamente. Puede sacar una foto directa de la receta o comprimir el PDF antes de subirlo.'
    );
  }
}

/**
 * Comprime una imagen o archivo PDF según corresponda y devuelve la cadena base64.
 * Optimiza automáticamente archivos pesados para no exceder los límites de Vercel (4.5MB).
 */
export async function compressImageAndGetBase64(
  file: File,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return compressPdfAndGetBase64(file, 1400, 0.72);
  }

  // Si no es imagen (ni PDF), retornamos el base64 sin comprimir
  if (!file.type.startsWith('image/')) {
    return fileToBase64(file);
  }

  return new Promise((resolve, reject) => {
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

/**
 * Alias explícito para compresión general de archivos (imágenes y PDFs).
 */
export const compressFileAndGetBase64 = compressImageAndGetBase64;

