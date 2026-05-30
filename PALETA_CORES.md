# 🎨 Kapsu Design System 2026

## Filosofia da Marca

**Verde = Saúde e Bem-estar**  
**Preto = Força e Performance**  
**Branco = Pureza e Confiança**  
**Azul = Tecnologia e Credibilidade**

A identidade principal deve girar em torno do verde da cápsula. O azul passa a ser apenas uma cor de apoio.

---

# 🟢 Cores Principais

## Kapsu Green (Principal)
`#00A86B`

## Kapsu Green Dark
`#007A4E`

## Kapsu Green Light
`#E8FFF4`

---

# 🔵 Cores Secundárias

## Kapsu Blue
`#2563EB`

## Kapsu Blue Dark
`#1E3A8A`

---

# ⚫ Neutros

## Black
`#111111`

## Dark Gray
`#374151`

## Light Gray
`#F3F4F6`

## White
`#FFFFFF`

---

# 🌞 Light Mode

Background: `#FFFFFF`
Surface: `#F8FAFC`
Primary: `#00A86B`
Primary Hover: `#007A4E`
Secondary: `#2563EB`
Title: `#111111`
Text: `#374151`
Border: `#E5E7EB`

---

# 🌙 Dark Mode

Background: `#0A0F0D`
Surface: `#111827`
Card: `#151A1F`
Primary: `#00C878`
Primary Hover: `#00A86B`
Secondary: `#3B82F6`
Title: `#FFFFFF`
Text: `#D1D5DB`
Text Secondary: `#9CA3AF`
Border: `#1F2937`

---

# 🌈 Gradientes Oficiais

## Gradiente Principal
`linear-gradient(135deg, #00A86B, #007A4E)`

## Gradiente Performance
`linear-gradient(135deg, #00A86B, #2563EB)`

## Gradiente Dark Hero
`linear-gradient(135deg, #0A0F0D, #111827)`

---

# Configuração Tailwind

```javascript
colors: {
  primary: {
    50: '#E8FFF4',
    100: '#CFFFE7',
    200: '#A3F7CE',
    300: '#6BE7A8',
    400: '#33D782',
    500: '#00A86B',
    600: '#008A57',
    700: '#007A4E',
    800: '#005E3B',
    900: '#003D27',
  },

  medical: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E3A8A',
    900: '#172554',
  },

  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111111',
  }
}
```

## Regra de Ouro

- 70% Branco
- 20% Preto/Cinza
- 8% Verde
- 2% Azul
