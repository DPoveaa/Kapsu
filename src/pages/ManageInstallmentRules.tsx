import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, CreditCard, DollarSign, ShieldAlert, Sparkles, Settings } from 'lucide-react'
import { installmentRulesService, InstallmentRule } from '../services/installment-rules.service'
import { confirm, toast } from '../utils/toast'
import AdminModal from '../components/AdminModal'

export default function ManageInstallmentRules() {
  const [rules, setRules] = useState<InstallmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editingRule, setEditingRule] = useState<InstallmentRule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    min_cart_value: '',
    max_interest_free_installments: '1',
    is_active: true,
    rule_type: 'standard' as 'standard' | 'every_x_reais',
    every_x_reais: '',
  })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await installmentRulesService.getInstallmentRules()
      setRules(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro ao carregar regras de parcelamento.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRule = async () => {
    try {
      const minVal = Number(formData.min_cart_value)
      const maxInstallments = parseInt(formData.max_interest_free_installments, 10)
      const ruleType = formData.rule_type
      const everyXVal = ruleType === 'every_x_reais' ? Number(formData.every_x_reais) : null

      if (isNaN(minVal) || minVal < 0) {
        toast.error('O valor mínimo do carrinho deve ser um número maior ou igual a zero.')
        return
      }

      if (isNaN(maxInstallments) || maxInstallments < 1 || maxInstallments > 12) {
        toast.error('O número máximo de parcelas deve ser entre 1 e 12.')
        return
      }

      if (ruleType === 'every_x_reais') {
        if (!formData.every_x_reais || isNaN(everyXVal!) || everyXVal! <= 0) {
          toast.error('Informe o valor do intervalo (A cada X reais) válido maior que zero.')
          return
        }
      }

      // Evita duplicidade de faixa (mesmo min_cart_value) apenas para regras fixas
      if (ruleType === 'standard') {
        const isDuplicate = rules.some(
          rule => rule.rule_type === 'standard' && Number(rule.min_cart_value) === minVal && rule.id !== editingRule?.id
        )
        if (isDuplicate) {
          toast.error(`Já existe uma regra padrão cadastrada para o valor mínimo de R$ ${minVal.toFixed(2).replace('.', ',')}`)
          return
        }
      }

      setSaving(true)
      setError(null)

      const ruleData = {
        min_cart_value: minVal,
        max_interest_free_installments: maxInstallments,
        is_active: formData.is_active,
        rule_type: ruleType,
        every_x_reais: everyXVal,
      }

      if (editingRule) {
        await installmentRulesService.updateInstallmentRule(editingRule.id, ruleData)
        setSuccess('Regra atualizada com sucesso!')
      } else {
        await installmentRulesService.createInstallmentRule(ruleData)
        setSuccess('Regra de parcelamento criada com sucesso!')
      }

      toast.success(editingRule ? 'Regra atualizada!' : 'Regra criada!')
      setTimeout(() => setSuccess(null), 3000)
      
      resetForm()
      await loadRules()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro ao salvar regra.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = (id: string) => {
    confirm.show('Tem certeza que deseja remover esta regra de parcelamento?', async () => {
      try {
        setError(null)
        await installmentRulesService.deleteInstallmentRule(id)
        toast.success('Regra removida com sucesso!')
        await loadRules()
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Erro ao remover regra.')
      }
    })
  }

  const handleToggleActive = async (rule: InstallmentRule) => {
    try {
      await installmentRulesService.updateInstallmentRule(rule.id, {
        is_active: !rule.is_active,
      })
      toast.success(rule.is_active ? 'Regra desativada' : 'Regra ativada')
      await loadRules()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao alternar status da regra.')
    }
  }

  const handleEditRule = (rule: InstallmentRule) => {
    setEditingRule(rule)
    setFormData({
      min_cart_value: String(rule.min_cart_value),
      max_interest_free_installments: String(rule.max_interest_free_installments),
      is_active: rule.is_active,
      rule_type: rule.rule_type || 'standard',
      every_x_reais: rule.every_x_reais ? String(rule.every_x_reais) : '',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingRule(null)
    setShowForm(false)
    setFormData({
      min_cart_value: '',
      max_interest_free_installments: '1',
      is_active: true,
      rule_type: 'standard',
      every_x_reais: '',
    })
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Carregando regras de parcelamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              Configuração de Parcelas sem Juros
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Configure faixas de valores do carrinho ou regras dinâmicas de ganho de parcelas por faixa de valor para liberar parcelamentos sem juros aos clientes.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="inline-flex items-center px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Faixa / Regra
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 rounded-xl">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Rules */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Faixas de Parcelamento Cadastradas
              </h2>

              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Nenhuma regra cadastrada. Clique em "Nova Faixa / Regra" para começar.
                    </p>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        rule.is_active
                          ? rule.rule_type === 'every_x_reais'
                            ? 'border-amber-200 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/5'
                            : 'border-green-200 dark:border-green-900/30 bg-green-50/20 dark:bg-green-950/5'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
                      }`}
                    >
                      {rule.rule_type === 'every_x_reais' ? (
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Sparkles className="w-5 h-5" />
                              Regra Dinâmica
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              rule.is_active
                                ? 'bg-amber-100 text-amber-850 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {rule.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed">
                            A cada <strong className="text-primary-600 dark:text-primary-400">R$ {Number(rule.every_x_reais).toFixed(2).replace('.', ',')}</strong> gastos adicionais a partir de <strong className="text-gray-900 dark:text-white">R$ {Number(rule.min_cart_value).toFixed(2).replace('.', ',')}</strong>, ganha <strong className="text-green-600 dark:text-green-400">+1 parcela sem juros</strong>.
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Limite máximo: <strong>{rule.max_interest_free_installments}x sem juros</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                              A partir de R$ {Number(rule.min_cart_value).toFixed(2).replace('.', ',')}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              rule.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {rule.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-gray-650 dark:text-gray-300 text-sm font-semibold flex items-center gap-1.5">
                            Permite até <strong className="text-primary-600 dark:text-primary-400">{rule.max_interest_free_installments}x sem juros</strong> no cartão.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-200 dark:border-gray-800">
                        {/* Switch de Ativação */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ativa</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.is_active}
                            onClick={() => handleToggleActive(rule)}
                            className={`${
                              rule.is_active ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-800'
                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                          >
                            <span
                              className={`${
                                rule.is_active ? 'translate-x-5' : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-800">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Editar faixa"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Excluir faixa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Info Area */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Como as Regras Funcionam</h3>
              
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  Quando o cliente seleciona a opção de pagamento por cartão no checkout, o sistema verifica o total atual do carrinho.
                </p>
                <p>
                  Existem dois tipos de regras configuráveis (que são mutuamente exclusivas ao estarem ativas):
                </p>
                <ul className="list-disc pl-4 space-y-1.5 text-xs">
                  <li><strong>Faixas Fixas:</strong> Libera uma quantidade fixa de parcelas sem juros de acordo com faixas de valores mínimos.</li>
                  <li><strong>Regra Dinâmica (A cada R$ X):</strong> Libera uma parcela a mais a cada intervalo de valor a partir de um valor de entrada (threshold).</li>
                </ul>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" /> Exemplos de Uso:
                  </h4>
                  <div className="text-xs text-gray-700 dark:text-gray-300 space-y-3">
                    <div>
                      <p className="font-bold border-b pb-1 mb-1">Regras Fixas (Padrão)</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>R$ 0,00 → 1x sem juros</li>
                        <li>R$ 200,00 → até 2x sem juros</li>
                        <li>R$ 300,00 → até 3x sem juros</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold border-b pb-1 mb-1">Regra Dinâmica ("A cada R$ 100")</p>
                      <p className="italic text-gray-500">Mínimo de R$ 200,00 + a cada R$ 100,00:</p>
                      <ul className="list-disc pl-4 space-y-0.5 mt-1">
                        <li>R$ 200,00 → 1x sem juros (Base)</li>
                        <li>R$ 300,00 → 2x sem juros (+R$ 100)</li>
                        <li>R$ 400,00 → 3x sem juros (+R$ 200)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Caso nenhuma regra ativa atenda ao total da compra, o checkout aplicará o fallback seguro permitindo apenas parcelamento em 1x à vista sem juros.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <AdminModal
          isOpen={showForm}
          onClose={resetForm}
          title={editingRule ? 'Editar Regra de Parcelamento' : 'Nova Regra de Parcelamento'}
          widthClass="max-w-md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRule}
                disabled={saving}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {saving ? 'Salvando...' : editingRule ? 'Salvar alterações' : 'Adicionar Regra'}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de Regra
              </label>
              <select
                value={formData.rule_type}
                onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as 'standard' | 'every_x_reais' })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
              >
                <option value="standard">Valor Mínimo Fixo (Padrão)</option>
                <option value="every_x_reais">Intervalo Dinâmico (A cada X reais)</option>
              </select>
            </div>

            {formData.rule_type === 'standard' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Valor Mínimo do Carrinho *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-gray-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_cart_value}
                    onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                    placeholder="200,00"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Valor Mínimo de Entrada (Threshold) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_cart_value}
                      onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                      placeholder="200,00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Valor inicial necessário para a regra começar a valer.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    A cada quantos reais gastos adicionais (+1 parcela) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-bold text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.every_x_reais}
                      onChange={(e) => setFormData({ ...formData, every_x_reais: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                      placeholder="100,00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Valor do intervalo que concede parcelas sem juros extras.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Limite Máximo de Parcelas sem Juros *
              </label>
              <select
                value={formData.max_interest_free_installments}
                onChange={(e) => setFormData({ ...formData, max_interest_free_installments: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    Até {num}x sem juros
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="is_active_checkbox" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Esta regra está ativa e deve ser aplicada no checkout.
              </label>
            </div>

            {formData.rule_type === 'every_x_reais' && formData.is_active && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="leading-relaxed">
                  <strong>Atenção:</strong> Ao salvar e ativar esta regra dinâmica, todas as outras faixas fixas serão automaticamente desativadas para evitar conflitos de cálculo no checkout.
                </p>
              </div>
            )}
          </div>
        </AdminModal>
      </div>
    </div>
  )
}
