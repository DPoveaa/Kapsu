export type ProductPdfFieldKey =
  | 'name'
  | 'category'
  | 'sku'
  | 'description'
  | 'price'
  | 'promo_price'
  | 'purchase_price'
  | 'markup'
  | 'compositions'
  | 'benefits'
  | 'indication'
  | 'contraindication'
  | 'intended_form'
  | 'intended_presentation'
  | 'intended_units_per_dose'
  | 'quantity'
  | 'status'
  | 'free_shipping'

export type ProductPdfReportScope = 'active' | 'non_archived' | 'all'

export interface ProductPdfReportOptions {
  fields: ProductPdfFieldKey[]
  scope: ProductPdfReportScope
  productIds?: string[]
}
