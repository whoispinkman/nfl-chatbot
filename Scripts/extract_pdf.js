// scripts/extract_pdf.js
// Convierte un PDF de data/ a un archivo .txt en data/

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function main() {
  const pdfPath = path.join(__dirname, '..', 'data', 'reglamento_oficial_nfl.pdf');
  const outPath = path.join(__dirname, '..', 'data', 'nfl_reglamento_completo.txt');

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdfParse(dataBuffer);

  // pdfData.text contiene todo el texto del PDF
  fs.writeFileSync(outPath, pdfData.text, 'utf8');
  console.log('Texto del PDF guardado en:', outPath);
}

main().catch((err) => {
  console.error('Error al extraer texto del PDF:', err);
});
