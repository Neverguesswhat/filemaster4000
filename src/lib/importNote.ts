import { marked } from 'marked';

export interface ImportedNote {
  title: string;
  content: string;
}

function filenameToTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
}

function csvToHtml(csv: string): string {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return '<p></p>';

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  let html = '<table><tr>';
  headers.forEach(h => { html += `<th>${h}</th>`; });
  html += '</tr>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => { html += `<td>${cell}</td>`; });
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    if (text.trim()) pages.push(`<p>${text}</p>`);
  }

  return pages.join('') || '<p></p>';
}

export async function importFile(file: File): Promise<ImportedNote> {
  const title = filenameToTitle(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'md':
    case 'markdown': {
      const text = await file.text();
      const html = await marked.parse(text);
      return { title, content: html };
    }
    case 'csv': {
      const text = await file.text();
      return { title, content: csvToHtml(text) };
    }
    case 'html':
    case 'htm': {
      const text = await file.text();
      // Extract body content if full HTML document
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      return { title, content: bodyMatch ? bodyMatch[1] : text };
    }
    case 'pdf': {
      const content = await parsePdf(file);
      return { title, content };
    }
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
