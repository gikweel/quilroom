/**
 * Device file access helpers.
 * Uses the File System Access API when available (Chrome/Edge),
 * otherwise falls back to <input type="file"> / download.
 */

export type PickedFile = {
  name: string;
  text: string;
  /** Original handle if we can write back later (optional) */
  handle?: FileSystemFileHandle;
};

const TEXT_EXT = /\.(txt|md|markdown|html|htm|json|csv|log|rtf)$/i;

function basename(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

export function titleFromFilename(name: string): string {
  return basename(name).trim() || 'Imported';
}

/** True when showOpenFilePicker / showSaveFilePicker exist */
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Open one or more text files from the device file explorer.
 * Requests user permission via the system picker.
 */
export async function pickTextFiles(multiple = true): Promise<PickedFile[]> {
  if (supportsFileSystemAccess()) {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple,
        types: [
          {
            description: 'Text documents',
            accept: {
              'text/*': ['.txt', '.md', '.markdown', '.html', '.htm', '.csv', '.log'],
              'application/json': ['.json'],
            },
          },
        ],
        excludeAcceptAllOption: false,
      });
      const out: PickedFile[] = [];
      for (const handle of handles as FileSystemFileHandle[]) {
        const file = await handle.getFile();
        const text = await file.text();
        out.push({ name: file.name, text, handle });
      }
      return out;
    } catch (err: any) {
      if (err?.name === 'AbortError') return [];
      throw err;
    }
  }

  // Fallback: hidden file input
  return pickViaInput(multiple);
}

function pickViaInput(multiple: boolean): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = '.txt,.md,.markdown,.html,.htm,.json,.csv,.log,text/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      document.body.removeChild(input);
      const out: PickedFile[] = [];
      for (const file of files) {
        const text = await file.text();
        out.push({ name: file.name, text });
      }
      resolve(out);
    });
    input.addEventListener('cancel', () => {
      document.body.removeChild(input);
      resolve([]);
    });
    input.click();
  });
}

/**
 * Ask for access to a folder, then list text-like files inside (non-recursive for v1).
 * User can then choose which files to import.
 */
export async function pickFolderTextFiles(): Promise<PickedFile[]> {
  if (!supportsDirectoryPicker()) {
    // No folder API — fall back to multi-file picker
    return pickTextFiles(true);
  }
  try {
    const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
      mode: 'read',
    });
    const out: PickedFile[] = [];
    for await (const [name, handle] of (dir as any).entries()) {
      if (handle.kind !== 'file') continue;
      if (!TEXT_EXT.test(name)) continue;
      const file = await handle.getFile();
      // Skip very large files (> 2MB)
      if (file.size > 2 * 1024 * 1024) continue;
      const text = await file.text();
      out.push({ name: file.name, text, handle });
    }
    return out;
  } catch (err: any) {
    if (err?.name === 'AbortError') return [];
    throw err;
  }
}

/** Download / save plain text to the device */
export async function saveTextToDevice(
  filename: string,
  content: string,
  mime = 'text/plain'
): Promise<void> {
  if (supportsFileSystemAccess() && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Text',
            accept: { [mime]: ['.' + (filename.split('.').pop() || 'txt')] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // fall through to download
    }
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Key for passing imported body into the editor */
export const IMPORT_PREFIX = 'quilroom_import_';

export function stashImport(docId: string, text: string) {
  sessionStorage.setItem(IMPORT_PREFIX + docId, text);
}

export function takeImport(docId: string): string | null {
  const key = IMPORT_PREFIX + docId;
  const text = sessionStorage.getItem(key);
  if (text != null) sessionStorage.removeItem(key);
  return text;
}

/** Convert plain text / markdown-ish / html into something Quill can use */
export function textToQuillHtml(raw: string, filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return raw;
  }
  // Escape and preserve line breaks for plain text / md
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n\n+/).map((block) => {
    const lines = block.split('\n').join('<br>');
    return `<p>${lines || '<br>'}</p>`;
  });
  return paragraphs.join('') || '<p><br></p>';
}
