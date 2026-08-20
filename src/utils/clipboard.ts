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
