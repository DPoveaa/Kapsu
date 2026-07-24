import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const modal = read('src/components/ProductPdfExportModal.tsx')
const productsPage = read('src/pages/ManageProducts.tsx')
const productsService = read('src/services/products.service.ts')

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exitCode = 1
    return
  }
  console.log(`PASS: ${message}`)
}

assert(
  modal.includes("const RECOMMENDED_FIELDS: ProductPdfFieldKey[] = ['name', 'price', 'compositions']"),
  'recommended PDF includes sale price and omits indication and dosage fields',
)
assert(
  modal.includes("{ key: 'price', label: 'Preço de venda' }")
    && modal.includes("{ key: 'indication', label: 'Indicação de uso' }")
    && modal.includes("{ key: 'intended_units_per_dose', label: 'Unidades por dose' }"),
  'PDF modal exposes sale price and optional clinical/presentation fields',
)
assert(
  modal.includes('MAX_FIELDS = 8')
    && modal.includes("field === 'name'")
    && modal.includes('Limpar opcionais'),
  'PDF modal enforces a readable field limit and keeps product name required',
)
assert(
  productsPage.includes('setIsPdfExportModalOpen(true)')
    && productsPage.includes('onExport={handleDownloadPDF}')
    && productsPage.includes('getPdfReportBlob(options)'),
  'PDF export opens the configuration modal and submits its options',
)
assert(
  productsService.includes("searchParams.set('fields', options.fields.join(','))")
    && productsService.includes("searchParams.set('scope', options.scope)"),
  'PDF request sends selected fields and product scope',
)

if (!process.exitCode) console.log('Product PDF export frontend checks passed.')
