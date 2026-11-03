// Copies the PDF reader (worker) file into /public so the browser can load it.
// Run once after installing packages:  node scripts/copy-pdf-worker.mjs
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
const to = "public/pdf.worker.min.mjs";

if (!existsSync(from)) {
  console.error("Could not find pdfjs-dist. Run: npm install pdfjs-dist");
  process.exit(1);
}
mkdirSync("public", { recursive: true });
copyFileSync(from, to);
console.log("Copied the PDF worker to public/pdf.worker.min.mjs");
