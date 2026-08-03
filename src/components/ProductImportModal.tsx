import React, { useState } from 'react'
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import * as XLSX from 'xlsx'
import AdminModal from './AdminModal'
import { productsService } from '../services/products.service'
import { toast } from '../utils/toast'

export interface ProductImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ValidationErrorItem {
  rowNumber: number
  productCode: string
  field: string
  invalidValue: any
  reason: string
}

interface ValidationReport {
  totalRows: number
  validCount: number
  invalidCount: number
  errors: ValidationErrorItem[]
  duplicateCodes: string[]
}

export default function ProductImportModal({ isOpen, onClose, onSuccess }: ProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [allowClearEmpty, setAllowClearEmpty] = useState(false)
  const [partialImport, setPartialImport] = useState(false)

  const [isValidating, setIsValidating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const [report, setReport] = useState<ValidationReport | null>(null)

  const resetState = () => {
    setFile(null)
    setRows([])
    setReport(null)
    setAllowClearEmpty(false)
    setPartialImport(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setReport(null)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const parsedRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

      if (!parsedRows || parsedRows.length === 0) {
        toast.error('O arquivo selecionado está vazio ou sem linhas válidas.')
        setRows([])
        return
      }

      setRows(parsedRows)
      toast.success(`${parsedRows.length} linha(s) carregada(s) do arquivo.`)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao ler arquivo CSV/XLSX. Verifique se o formato é válido.')
      setFile(null)
      setRows([])
    }
  }

  const handleValidate = async () => {
    if (rows.length === 0) {
      toast.error('Selecione um arquivo CSV/XLSX para importar.')
      return
    }

    try {
      setIsValidating(true)
      const resReport = await productsService.validateImport(rows)
      setReport(resReport)

      if (resReport.errors.length === 0) {
        toast.success(`Validação concluída com sucesso! Todas as ${resReport.totalRows} linhas são válidas.`)
      } else {
        toast.warning(`Atenção: ${resReport.errors.length} erro(s) encontrado(s) na validação pre-importação.`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao validar planilha de produtos.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleApplyImport = async () => {
    if (rows.length === 0) {
      toast.error('Selecione um arquivo CSV/XLSX para importar.')
      return
    }

    if (!report) {
      toast.error('Gere o relatório de validação antes de aplicar a importação.')
      return
    }

    if (report.errors.length > 0 && !partialImport) {
      toast.error('O arquivo possui erros. Para prosseguir com as linhas válidas, ative a opção Importação Parcial.')
      return
    }

    try {
      setIsApplying(true)
      const result = await productsService.applyImport(rows, {
        allowClearEmpty,
        partialImport,
        fileName: file?.name || 'import.xlsx',
      })

      toast.success(`Importação realizada com sucesso! ${result.updatedCount} produto(s) atualizados.`)
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao aplicar importação.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsService.downloadImportTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'modelo-importacao-fiscal-kapsu.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Modelo de planilha XLSX baixado com sucesso.')
    } catch (err: any) {
      toast.error('Erro ao baixar modelo de planilha.')
    }
  }

  return (
    <AdminModal isOpen={isOpen} onClose={handleClose} title="Importar Planilha de Produtos (Fiscal NF-e 55 & Marketplaces)">
      <div className="space-y-6 text-sm text-gray-700 dark:text-gray-200">
        
        {/* Header / Template Download Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Modelo de Planilha Padrão</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Baixe a planilha XLSX contendo os cabeçalhos oficiais e guia explicativo dos campos fiscais Notaas NF-e 55.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors shrink-0 shadow-xs"
          >
            <Download size={14} />
            Baixar Modelo XLSX
          </button>
        </div>

        {/* File Upload Box */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            id="product-import-file-input"
            className="hidden"
          />
          <label htmlFor="product-import-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
            <FileSpreadsheet size={36} className="text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {file ? file.name : 'Clique para selecionar a planilha CSV ou XLSX'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {file ? `${rows.length} linha(s) detectadas` : 'Suporta arquivos .xlsx, .xls ou .csv'}
            </span>
          </label>
        </div>

        {/* Options Checkboxes */}
        <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Opções de Importação
          </label>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={allowClearEmpty}
                onChange={(e) => setAllowClearEmpty(e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Permitir limpar campos opcionais caso a célula esteja explicitamente em branco
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={partialImport}
                onChange={(e) => setPartialImport(e.target.checked)}
                className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <span className="font-medium text-gray-800 dark:text-gray-200">
                Importação Parcial: ignorar e pular produtos com erros de validação (importar apenas as linhas válidas)
              </span>
            </label>
          </div>
        </div>

        {/* Validation Report Area */}
        {report && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Relatório de Validação Pré-Importação
                {report.errors.length === 0 ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
                    <CheckCircle size={14} /> Arquivo 100% Válido
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    <AlertTriangle size={14} /> {report.errors.length} Erro(s)
                  </span>
                )}
              </h4>
              <div className="text-xs text-gray-500">
                Total: <b>{report.totalRows}</b> | Válidos: <b>{report.validCount}</b> | Inválidos: <b>{report.invalidCount}</b>
              </div>
            </div>

            {report.duplicateCodes.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200">
                <b>Atenção:</b> Códigos de produto duplicados detectados no mesmo arquivo: {report.duplicateCodes.join(', ')}
              </div>
            )}

            {report.errors.length > 0 && (
              <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Linha</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Código Produto</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Campo</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Valor Invalido</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Motivo do Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {report.errors.map((errItem, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{errItem.rowNumber}</td>
                        <td className="px-3 py-2 font-mono text-primary-600 dark:text-primary-400">{errItem.productCode}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{errItem.field}</td>
                        <td className="px-3 py-2 font-mono text-red-600 dark:text-red-400">{String(errItem.invalidValue ?? '')}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{errItem.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isValidating || isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleValidate}
            disabled={rows.length === 0 || isValidating || isApplying}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw size={15} className={isValidating ? 'animate-spin' : ''} />
            {isValidating ? 'Validando Planilha...' : '1. Gerar Relatório de Validação'}
          </button>

          <button
            type="button"
            onClick={handleApplyImport}
            disabled={!report || isApplying || isValidating || (report.errors.length > 0 && !partialImport)}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <Upload size={16} />
            {isApplying ? 'Importando Produtos...' : '2. Aplicar Importação'}
          </button>
        </div>
      </div>
    </AdminModal>
  )
}
