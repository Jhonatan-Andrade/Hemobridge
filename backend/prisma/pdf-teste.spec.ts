import { createHash } from 'node:crypto';
import { criarPdfTeste } from './pdf-teste.js';

describe('PDF sintético da carga de testes', () => {
  it('possui xref válido, catálogo e uma página com conteúdo', async () => {
    const bytes = await criarPdfTeste();
    const source = bytes.toString('latin1');
    expect(source).toMatch(/^%PDF-1\.[347]/);
    expect(bytes.length).toBeLessThan(5 * 1024 * 1024);

    const start = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(source);
    expect(start).not.toBeNull();
    const xref = source.slice(Number(start![1]));
    const header = /^xref\s+0 (\d+)\r?\n/.exec(xref);
    expect(header).not.toBeNull();
    const count = Number(header![1]);
    const rows = xref.slice(header![0].length).split(/\r?\n/).slice(0, count);
    expect(rows[0]).toMatch(/^0000000000 65535 f\s*$/);
    expect(count).toBeGreaterThan(5);

    const objects = new Map<number, string>();
    for (let id = 1; id < count; id++) {
      const row = /^(\d{10}) 00000 n\s*$/.exec(rows[id]!);
      expect(row).not.toBeNull();
      const offset = Number(row![1]);
      const object = bytes.subarray(offset).toString('latin1');
      expect(object.startsWith(`${id} 0 obj\n`)).toBe(true);
      objects.set(id, object.slice(0, object.indexOf('endobj')));
    }

    const root = /\/Root (\d+) 0 R/.exec(xref);
    expect(root).not.toBeNull();
    const catalog = objects.get(Number(root![1]))!;
    expect(catalog).toContain('/Type /Catalog');
    const pages = objects.get(Number(/\/Pages (\d+) 0 R/.exec(catalog)![1]))!;
    expect(pages).toContain('/Type /Pages');
    expect(pages).toMatch(/\/Count 1\b/);
    const pageId = Number(/\/Kids\s*\[(\d+) 0 R\]/.exec(pages)![1]);
    const page = objects.get(pageId)!;
    expect(page).toContain('/Type /Page');
    expect(page).toContain('/MediaBox [0 0 595.28 841.89]');
    const content = objects.get(Number(/\/Contents (\d+) 0 R/.exec(page)![1]))!;
    expect(content).toContain('stream\n');
    expect(content).toContain('endstream');
    expect(content).toContain('BT');
    expect(content).toContain('ET');
  });

  it('produz bytes reproduzíveis sem dados pessoais nem conexão externa', async () => {
    const first = await criarPdfTeste();
    const second = await criarPdfTeste();
    expect(second.equals(first)).toBe(true);
    expect(createHash('sha256').update(second).digest('hex')).toBe(
      createHash('sha256').update(first).digest('hex'),
    );
  });
});
