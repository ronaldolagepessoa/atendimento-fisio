# Agenda — Redesign Calendário

**Data:** 2026-05-18  
**Status:** Aprovado

## Objetivo

Substituir a grade semanal atual (cards empilhados por dia sem eixo de tempo) por um calendário com eixo Y de horários, estilo Google Calendar.

## Decisões de Design

| Parâmetro | Valor |
|---|---|
| Eixo X | Seg–Sáb (6 colunas) |
| Eixo Y | 07h–18h, slots de 30 min |
| Navegação | Semana anterior / Hoje / Próxima semana |
| Click slot vazio | Abre `AgendamentoModal` pré-preenchido com data+hora |
| Click card existente | Abre `AgendamentoModal` em modo edição (comportamento atual) |

## Layout

```
┌─────────────────────────────────────────────────────┐
│ Agenda   19–24 mai 2025   [← Ant] [Hoje] [Próx →]  │  ← header fixo
│                           [↻ Freq] [+ Agendamento]  │
├──────┬────────┬────────┬────────┬────────┬────────┬──┤
│      │ SEG 19 │ TER 20 │ QUA 21 │ QUI 22 │ SEX 23 │SAB│  ← cabeçalho sticky
├──────┼────────┼────────┼────────┼────────┼────────┼──┤
│ 07h  │        │        │        │ [card] │        │  │
│ ·    │        │        │        │        │        │  │  ← linha tracejada
│ 08h  │ [card] │        │        │        │        │  │
│ ·    │        │ [card] │        │        │        │  │
│ 09h  │        │ [card] │        │        │        │  │
│ ...  │  ...   │  ...   │  ...   │  ...   │  ...   │  │
└──────┴────────┴────────┴────────┴────────┴────────┴──┘
│ Legenda: fisios (cor) + status (badge)               │  ← rodapé fixo
```

## Estrutura do Grid

- CSS Grid: `grid-template-columns: 52px repeat(6, 1fr)`
- 22 linhas por dia (07:00–17:30, meia em meia hora) = 22 pares de células
- Linhas de hora cheia: `border-bottom: 1px solid #e4e4e7`
- Linhas de meia hora: `border-bottom: 1px dashed #f4f4f5`
- Wrapper com `overflow-y: auto` e altura `calc(100vh - header)`
- Cabeçalho de dias e coluna de horas com `position: sticky`

## Cards de Agendamento

Cada card é posicionado **absolutamente** dentro da célula do horário correspondente:

```
dataHora → slot index = (hora - 7) * 2 + (minutos >= 30 ? 1 : 0)
```

- `left: 3px`, `right: 3px`, `top: 3px`, `bottom: 2px`
- `border-left: 3px solid <fisio.cor>`
- Background e badge por status (igual ao atual)
- Múltiplos cards no mesmo slot: dividem a largura da célula horizontalmente
- Hover: `filter: brightness(0.95)` + shadow

### Conteúdo do card
```
[nome do paciente]
[HH:MM] · [procedimento]
[badge status]
```

## Indicador de Hora Atual

- Linha horizontal vermelha (`2px`, `background: #ef4444`) com ponto na esquerda
- Posicionada na coluna do dia atual, calculando offset em pixels dentro do slot
- Só renderiza se a semana atual estiver visível

## Interações

### Click em slot vazio
- Chama `setModal({ open: true, dataHora: ISO string do slot clicado })`
- `AgendamentoModal` recebe `dataHora` como prop adicional e pré-preenche os campos de data e hora

### Click em card
- Igual ao comportamento atual: `setModal({ open: true, agendamento: a })`
- Só ADMIN pode editar (comportamento atual mantido)

## Componentes Afetados

| Arquivo | Mudança |
|---|---|
| `AgendaClient.tsx` | Reescrita completa — novo grid calendário |
| `AgendamentoModal.tsx` | Recebe prop opcional `defaultDataHora?: string` para pré-preencher |
| `lib/agenda.ts` | Adicionar helpers: `slotIndex(dataHora)`, `slotToTime(index)` |

## Componentes Sem Mudança

- `actions.ts` — sem alteração
- `page.tsx` — sem alteração
- `FrequenciaModal.tsx` — sem alteração
- Schema Prisma — sem alteração

## Fora de Escopo

- Drag & drop de cards
- Redimensionar cards para spans multi-slot
- Vista diária ou mensal
- Filtro por fisioterapeuta
