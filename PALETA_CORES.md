# 🎨 Paleta de Cores - Kapsu

## Nova Paleta de Cores

- **Light (Verde muito claro)**: `#DDF4E7` - `palette-light` ou `primary-50`
- **Medium (Verde médio)**: `#67C090` - `palette-medium` ou `primary-400`
- **Dark (Azul escuro)**: `#26667F` - `palette-dark` ou `primary-600` / `medical-600`
- **Darker (Azul muito escuro)**: `#124170` - `palette-darker` ou `primary-700` / `medical-700`

## Uso no Tailwind

Todas as classes do Tailwind já estão configuradas para usar essas cores:
- `bg-primary-600` = `#26667F` (azul escuro)
- `bg-primary-700` = `#124170` (azul muito escuro)
- `bg-primary-400` = `#67C090` (verde médio)
- `bg-primary-50` = `#DDF4E7` (verde muito claro)
- `text-primary-600` = `#26667F`
- `border-primary-600` = `#26667F`
- E assim por diante...

## Paleta Anterior

## Cores Implementadas

Baseado em pesquisas sobre as melhores práticas para sites de farmácia e medicamentos, implementamos uma paleta profissional que transmite:

### 🟢 Verde Farmacêutico (Primary)
- **Cor Principal**: Verde #28a745 / #228b3a
- **Significado**: Saúde, bem-estar, natureza, crescimento
- **Uso**: Botões principais, links, destaques, elementos de ação
- **Tons**: 50 (muito claro) até 900 (muito escuro)

### 🔵 Azul Confiança (Medical)
- **Cor Secundária**: Azul #2563eb / #3b82f6
- **Significado**: Profissionalismo, confiança, segurança, tecnologia
- **Uso**: Elementos secundários, badges, informações importantes
- **Tons**: 50 (muito claro) até 900 (muito escuro)

### ⚪ Branco
- **Cor Base**: Branco puro #FFFFFF
- **Significado**: Pureza, higiene, limpeza, transparência
- **Uso**: Fundos principais, cards, espaços limpos

### 🟢 Verde Complementar (Accent)
- **Cor de Destaque**: Verde mais suave
- **Uso**: Gradientes, elementos decorativos, backgrounds suaves

## Aplicação no Design

### Elementos Principais
- **Botões Primários**: Verde farmacêutico (primary-600)
- **Botões Secundários**: Branco com borda verde
- **Links e Hovers**: Verde farmacêutico
- **Gradientes**: Verde para Azul (primary-600 → medical-600)
- **Backgrounds**: Branco e tons muito claros de verde (primary-50)

### Psicologia das Cores

1. **Verde**: 
   - Associação imediata com saúde e farmácia
   - Transmite confiança e naturalidade
   - Cores tradicionais do setor farmacêutico

2. **Azul**:
   - Profissionalismo médico
   - Confiança e segurança
   - Tecnologia e inovação

3. **Branco**:
   - Pureza e higiene
   - Clareza e organização
   - Espaço limpo e profissional

## Estrutura de Cores no Tailwind

```javascript
primary: {
  500: '#28a745',  // Verde farmácia
  600: '#228b3a',  // Verde principal (mais usado)
  // ... outros tons
}

medical: {
  500: '#3b82f6',  // Azul confiança
  600: '#2563eb',  // Azul principal
  // ... outros tons
}
```

## Componentes Atualizados

✅ Header - Logo com gradiente verde/azul
✅ Footer - Gradiente verde/azul
✅ Botões - Verde farmacêutico
✅ Links - Verde com hover
✅ Cards - Background branco com sombras
✅ Hero Section - Gradiente suave verde/branco
✅ CTA Section - Gradiente verde/azul
✅ Backgrounds - Branco e tons claros de verde

## Referências

- Cores baseadas em pesquisas sobre design para área da saúde
- Paleta alinhada com identidade visual de farmácias profissionais
- Combinação verde/branco/azul amplamente aceita no setor







