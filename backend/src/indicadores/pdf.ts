import PDFDocument from 'pdfkit';

export interface Coluna {
  titulo: string;
  largura: number; // proporção relativa
  alinhar?: 'left' | 'right' | 'center';
}

export interface ConteudoRelatorio {
  titulo: string;
  escopo: string;
  periodo: string;
  emitidoEm: string;
  responsavel: string;
  secoes: { titulo?: string; colunas: Coluna[]; linhas: string[][]; rodape?: string }[];
}

const MARGEM = 50;
const VERMELHO = '#b3122e';
const CINZA = '#61616e';

/** UC24 passo 6: PDF com título, período, data de emissão e responsável. */
export function gerarPdf(conteudo: ConteudoRelatorio): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGEM, bufferPages: true, info: { Title: conteudo.titulo, Author: 'Hemobridge' } });
  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const pronto = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });

  const largura = doc.page.width - 2 * MARGEM;

  doc.fillColor(VERMELHO).font('Helvetica-Bold').fontSize(11).text('HEMOBRIDGE');
  doc.moveDown(0.3).fillColor('black').fontSize(18).text(conteudo.titulo);
  doc.moveDown(0.5).font('Helvetica').fontSize(10).fillColor(CINZA);
  doc.text(`Abrangência: ${conteudo.escopo}`);
  doc.text(`Período: ${conteudo.periodo}`);
  doc.text(`Emitido em: ${conteudo.emitidoEm}`);
  doc.text(`Responsável: ${conteudo.responsavel}`);
  doc.moveDown();

  for (const secao of conteudo.secoes) {
    if (secao.titulo) {
      doc.moveDown(0.5).fillColor('black').font('Helvetica-Bold').fontSize(12).text(secao.titulo, MARGEM);
      doc.moveDown(0.3);
    }
    tabela(doc, secao.colunas, secao.linhas, largura);
    if (secao.rodape) doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor(CINZA).text(secao.rodape, MARGEM);
  }

  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(CINZA)
      .text(
        `Hemobridge — ${conteudo.titulo} — página ${i + 1} de ${paginas.count}`,
        MARGEM,
        doc.page.height - MARGEM + 15,
        { width: largura, align: 'center', lineBreak: false },
      );
  }
  doc.end();
  return pronto;
}

function tabela(doc: PDFKit.PDFDocument, colunas: Coluna[], linhas: string[][], largura: number) {
  const soma = colunas.reduce((s, c) => s + c.largura, 0);
  const larguras = colunas.map((c) => (c.largura / soma) * largura);
  const altura = 18;
  const limite = doc.page.height - MARGEM - altura;

  const linha = (valores: string[], negrito: boolean, fundo?: string) => {
    if (doc.y > limite) doc.addPage();
    const y = doc.y;
    if (fundo) doc.rect(MARGEM, y - 3, largura, altura).fill(fundo);
    doc.fillColor('black').font(negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    let x = MARGEM;
    valores.forEach((v, i) => {
      doc.text(v, x + 4, y, { width: larguras[i] - 8, align: colunas[i].alinhar ?? 'left', lineBreak: false, ellipsis: true });
      x += larguras[i];
    });
    doc.x = MARGEM;
    doc.y = y + altura;
  };

  linha(
    colunas.map((c) => c.titulo),
    true,
    '#f1f1f4',
  );
  linhas.forEach((l, i) => linha(l, false, i % 2 ? '#fafafa' : undefined));
}
