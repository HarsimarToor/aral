// Reads the text out of a PDF in the browser with pdfjs-dist.
//
// One-time setup: the PDF worker file must be copied into /public so the browser can load it:
//   Copy-Item node_modules\pdfjs-dist\build\pdf.worker.min.mjs public\pdf.worker.min.mjs

export interface PdfText {
  text: string;
  pages: number;
}

export async function extractPdfText(file: File, onPage?: (page: number, total: number) => void): Promise<PdfText> {
  // Imported on demand: pdfjs only works in the browser, never during server rendering.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  const parts: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if ("str" in item) {
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
    }
    parts.push(pageText);
    onPage?.(n, pdf.numPages);
  }

  return { text: parts.join("\n"), pages: pdf.numPages };
}
