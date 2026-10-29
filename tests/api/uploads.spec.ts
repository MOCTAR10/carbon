import { test, expect, bilanWithData, YEAR } from '../support/fixtures'
import { FILES } from '../support/data'

const evidence = (assessmentId: number, name: string, mimeType: string, buffer: Buffer) => ({
  multipart: { file: { name, mimeType, buffer }, assessmentId: String(assessmentId), factorId: 'butane_fr', year: String(YEAR), month: '1' },
})

test.describe('Justificatifs', () => {
  test('PDF accepté, téléchargé avec un type imposé par le serveur et nosniff', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    // Client lies about the type: the server must decide from the bytes/extension
    const up = await company.api.post('/api/documents', evidence(asmt.id, 'facture.pdf', 'text/html', FILES.pdf))
    expect(up.status(), await up.text()).toBe(201)
    const doc = await up.json()

    const list = await (await company.api.get(`/api/documents?assessmentId=${asmt.id}`)).json()
    expect(JSON.stringify(list)).toContain('facture.pdf')

    const dl = await company.api.get(`/api/documents/${doc.id}`)
    expect(dl.status()).toBe(200)
    expect(dl.headers()['content-type']).toBe('application/pdf')
    expect(dl.headers()['x-content-type-options']).toBe('nosniff')
    expect((await dl.body()).subarray(0, 5).toString()).toBe('%PDF-')
  })

  for (const [label, name, type, buf] of [
    ['fichier HTML', 'page.html', 'text/html', FILES.html],
    ['faux PDF (contenu HTML)', 'facture.pdf', 'application/pdf', FILES.html],
    ['SVG avec script', 'image.svg', 'image/svg+xml', FILES.svg],
    ['exécutable renommé', 'outil.exe', 'application/octet-stream', Buffer.from('MZ\x90\x00')],
  ] as const) {
    test(`refuse : ${label}`, async ({ company }) => {
      const { asmt } = await bilanWithData(company.api)
      const res = await company.api.post('/api/documents', evidence(asmt.id, name, type, buf))
      expect(res.status()).toBe(400)
    })
  }

  test('refuse un fichier de plus de 10 Mo', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    const big = Buffer.concat([FILES.pdf, Buffer.alloc(10 * 1024 * 1024 + 10)])
    const res = await company.api.post('/api/documents', evidence(asmt.id, 'gros.pdf', 'application/pdf', big))
    expect([400, 413]).toContain(res.status())
  })

  test('suppression d’un justificatif', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    const doc = await (await company.api.post('/api/documents', evidence(asmt.id, 'f.pdf', 'application/pdf', FILES.pdf))).json()
    const del = await company.api.delete('/api/documents', { data: { id: doc.id, assessmentId: asmt.id } })
    expect(del.status()).toBe(200)
    expect([404, 410]).toContain((await company.api.get(`/api/documents/${doc.id}`)).status())
  })
})

test.describe('Logo entreprise', () => {
  test('PNG accepté avec nom versionné ; SVG refusé', async ({ company }) => {
    const svg = await company.api.post('/api/company/logo', { multipart: { logo: { name: 'l.svg', mimeType: 'image/svg+xml', buffer: FILES.svg } } })
    expect(svg.status()).toBe(400)
    const png = await company.api.post('/api/company/logo', { multipart: { logo: { name: 'l.png', mimeType: 'image/png', buffer: FILES.png } } })
    expect(png.status()).toBe(200)
    expect((await png.json()).logoUrl).toMatch(/company-\d+-\d+\.png$/)
  })

  test('refuse une image déguisée (extension PNG, contenu HTML)', async ({ company }) => {
    const res = await company.api.post('/api/company/logo', { multipart: { logo: { name: 'l.png', mimeType: 'image/png', buffer: FILES.html } } })
    expect(res.status()).toBe(400)
  })
})
