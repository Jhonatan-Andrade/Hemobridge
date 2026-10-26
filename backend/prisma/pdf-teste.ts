import PDFDocument from 'pdfkit';

export function criarPdfTeste(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      compress: false,
      info: {
        Title: 'Documento de teste HemoBridge',
        Author: 'HemoBridge',
        Subject: 'Validacao tecnica sem dados clinicos reais',
        Creator: 'HemoBridge',
        Producer: 'HemoBridge',
        CreationDate: new Date('2026-01-01T00:00:00Z'),
        ModDate: new Date('2026-01-01T00:00:00Z'),
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#15343e')
      .text('HemoBridge');
    doc.moveDown().font('Helvetica').fontSize(12).fillColor('#243b46');
    doc.text('Documento sintetico de teste.');
    doc
      .moveDown()
      .text('Arquivo para validar a abertura de PDF no aplicativo.');
    doc
      .moveDown()
      .text(
        'Sem dados de pacientes, resultados clinicos ou valor assistencial.',
      );
    doc.end();
  });
}
