import type { Config } from 'tailwindcss'

// Tokens extraídos do Figma (HemoBridge / Interfaces oficiais → Biblioteca · componentes e identidade).
// Os nomes seguem as variáveis do arquivo (--brand, --ink, --muted…) para facilitar a conferência.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#b30d39', hover: '#850d31', soft: '#de7594' },
        ink: '#14313f',
        muted: '#51616a',
        surface: '#ffffff',
        line: '#d9d5cf',
        background: '#f5f5f2',
        input: '#687a80',
        disabled: '#e1dfdc',
        error: { DEFAULT: '#a20c25', bg: '#fcecef' },
        warning: { DEFAULT: '#765016', bg: '#fff3db' },
        info: { DEFAULT: '#116475', bg: '#e5f3f3' },
        success: { DEFAULT: '#166341', bg: '#eaf5ef' },
        wine: '#651c3a',
        coral: '#bd1745',
        cream: '#f8f7f3',
        // Gradiente do Card "Situation" (#18313B → #294955).
        petrol: { 900: '#18313b', 700: '#294955' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Estilos de texto do Figma: Caption, Label, Body, Section, Heading.
        caption: ['11px', '18px'],
        small: ['12px', 'normal'],
        label: ['13px', '20px'],
        body: ['14px', '22px'],
        lead: ['15px', 'normal'],
        section: ['20px', '28px'],
        heading: ['26px', '34px'],
        title: ['32px', '46px'],
        display: ['38px', 'normal'],
      },
      borderRadius: {
        control: '14px',
        panel: '16px',
        card: '22px',
        pill: '999px',
      },
      boxShadow: {
        // Elevation / Surface: #18313B1A, y 12, blur 32.
        surface: '0 12px 32px rgba(24, 49, 59, 0.1)',
      },
      maxWidth: {
        form: '720px',
        wide: '1040px',
        page: '1300px',
      },
      width: {
        rail: '76px',
        'rail-open': '238px',
      },
      spacing: {
        rail: '76px',
      },
      transitionTimingFunction: {
        rail: 'cubic-bezier(.2,.8,.2,1)',
      },
      transitionDuration: {
        rail: '260ms',
      },
    },
  },
} satisfies Config
