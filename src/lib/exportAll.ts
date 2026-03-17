import JSZip from 'jszip';
import type { Note, Folder } from '@/types/notes';

function htmlToPdfHtml(note: Note): string {
  const title = note.title || 'Untitled';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.6; }
h1 { font-size: 2em; margin-bottom: 0.5em; }
h2 { font-size: 1.5em; }
blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #666; }
code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
img { max-width: 100%; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #ddd; padding: 8px; }
</style>
</head>
<body>
<h1>${title}</h1>
${note.content || ''}
</body>
</html>`;
}

function sanitizeFilename(name: string): string {
  return (name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_').trim() || 'Untitled';
}

function buildFolderPath(folderId: string | null, folders: Folder[]): string {
  if (!folderId) return '';
  const parts: string[] = [];
  let current = folderId;
  const folderMap = new Map(folders.map(f => [f.id, f]));
  while (current) {
    const folder = folderMap.get(current);
    if (!folder) break;
    parts.unshift(sanitizeFilename(folder.name));
    current = folder.parentId ?? '';
  }
  return parts.join('/');
}

export async function exportAllAsZip(notes: Note[], folders: Folder[]) {
  const zip = new JSZip();
  const nameCount = new Map<string, number>();

  for (const note of notes) {
    const folderPath = buildFolderPath(note.folderId, folders);
    const baseName = sanitizeFilename(note.title);
    const dir = folderPath ? folderPath + '/' : '';
    const key = dir + baseName;
    const count = nameCount.get(key) || 0;
    nameCount.set(key, count + 1);
    const fileName = count > 0 ? `${baseName} (${count}).html` : `${baseName}.html`;
    const fullPath = dir + fileName;
    zip.file(fullPath, htmlToPdfHtml(note));
  }

  // Add empty folders
  for (const folder of folders) {
    const path = buildFolderPath(folder.id, folders) + '/';
    if (!zip.folder(path)) {
      zip.folder(path);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notes-export.zip';
  a.click();
  URL.revokeObjectURL(url);
}
