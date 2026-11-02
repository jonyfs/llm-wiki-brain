---
Summary: Revisão de design e UX da interface do plugin (rail, filtros, ícones, menus), com 15 decisões aprovadas e tarefas de implementação.
Tags: [#design #ux #accessibility #obsidian #plan]
---

# Revisão de UX da interface — LLM Wiki Brain

Alvo: a interface atual do plugin (`src/view.ts`, `styles.css`, `src/i18n.ts`, harness `ui.html`). Modo: OPERATE (app UI). Sem `DESIGN.md` até esta revisão. Mockups: não gerados (o gerador de imagens pede `OPENAI_API_KEY`, ausente). Vozes externas: Codex indisponível (modelo recusado pela conta), subagente do Claude concluído `[single-model]`.

Complementa `docs/design-ux-improvements.md` (auditoria de 100 itens) e `DESIGN_IMPROVEMENTS.md` (fases 1-3, entregues na 0.9.0). Aqui só entram lacunas que ainda existem no código.

## Decisões aprovadas (15)

| # | Ponto | Decisão |
|---|---|---|
| 1A | Rail | Expandida por padrão, em 3 grupos com título (Tipos, Visões rápidas, Ferramentas), estado lembrado; recolhida sozinha abaixo de 640 px. |
| 1B | Filtros | Um lugar por filtro. Rail só com Visões rápidas (presets) e botão Filtros com contador; os toggles (inverter, órfãs, recentes, ocultar, fantasmas) ficam só no painel. |
| 2A | Estado parcial | Contador no botão Filtros, faixa `role="status"` "12 de 214 notas · 3 filtros · Limpar" e estado vazio explicado com botão Limpar. |
| 2B | Erros | Mensagem `role="alert"` na faixa de status, com causa e ação, para exportar PNG, verificar links, montar grafo e visão salva quebrada (abre mesmo assim e lista os filtros ignorados). |
| 3A | Primeiro uso | Tour de 3 passos (busca, Filtros, Flow) destacando os controles reais, com Pular e "Rever dicas" no cartão de atalhos. |
| 3B | Memória | Lembrar tudo entre aberturas, filtros e busca inclusive (escolha do usuário; recomendação era lembrar só a aparência). Mitigação: a faixa de 2A mostra sempre o que está ativo. |
| 4A | Ícones | Trocar os 8 ambíguos (órfãs `unlink`, inverter `arrow-left-right`, girar `rotate-3d`, verificar links `scan-search`, ocultar não combinam `filter-x`, fantasmas `ghost`), checando cada nome no Lucide instalado, com reserva. |
| 4B | Cartões | Gaveta lateral direita com abas (Nota, Lint, Ajuda, Atalhos), uma por vez; folha inferior em painéis estreitos. |
| 5A | Sistema de design | `DESIGN.md` curto com tokens sobre as variáveis do Obsidian. |
| 6A | Atalho F | Manter, mas ignorar quando o foco está em campo de texto ou há Ctrl/Cmd/Alt; listar em `aria-keyshortcuts` e no cartão de atalhos. |
| 6B | Painel | Não modal (região rotulada, `aria-expanded`), foco volta ao botão Filtros, Esc fecha, `filterBtn` atribuído, listener do `document` removido em `onClose`. |
| 6C | Estreito e toque | Alvos 32 px (mouse) e 44 px (toque) sempre; abaixo de 640 px a rail vira barra superior com "Filtros" rotulado e o painel vira folha inferior de meia altura. |
| 6D | Estados a11y | Desligado = ponto vazio + risco no rótulo, ligado = ponto cheio + marca; contraste mínimo 4,5:1; carregando e vazio com `role="status"` e rótulos próprios. |
| 7A | Replay | Modo, velocidade, data e loop vão para a barra de replay; a rail fica só com o botão Replay. A data vira campo visível e rotulado. |
| 7B | Busca | Enter = próximo, Shift+Enter = anterior, Ctrl/Cmd+Enter = perguntar; Esc apaga e, no segundo Esc, devolve o foco ao grafo; copiar e ajuda num menu "mais". |

## Tabela de estados (alvo)

| Recurso | Carregando | Vazio | Erro | Sucesso | Parcial |
|---|---|---|---|---|---|
| Grafo | esqueleto com `role="status"` e rótulo próprio | texto + Limpar (se por filtro) | faixa `role="alert"` com ação | grafo | faixa "12 de 214 · 3 filtros · Limpar" |
| Filtros | n/a | "Nenhuma nota combina com N filtros. Limpar" | n/a | contador no botão | contador + faixa |
| Visão salva | n/a | n/a | abre e avisa quais filtros foram ignorados | Notice "salva" | n/a |
| Exportar / Verificar links | estado no botão | n/a | faixa `role="alert"` com Tentar de novo | Notice | n/a |

## Jornada (storyboard)

| Passo | Usuário faz | Sente | Plano especifica |
|---|---|---|---|
| 1 | Abre a visão pela 1ª vez | curiosidade | rail expandida e rotulada (1A) |
| 2 | Vê o tour | orientação | tour de 3 passos (3A) |
| 3 | Procura um filtro | clareza | um lugar por filtro (1B) |
| 4 | Filtra e fecha o painel | segurança | faixa de estado (2A) |
| 5 | Volta no dia seguinte | continuidade | memória de aparência e filtros (1A, 3B) |
| 6 | Usa dezenas de vezes | eficiência | atalhos corretos (6A, 7B) |

## NOT in scope

- WebGL, física em worker, octree: já no `TODOS.md` (Motor pesado).
- Novos tipos de nó, formas e imagens nos nós: `TODOS.md` (Acabamento).
- Tema próprio além das variáveis do Obsidian.
- Mockups em imagem: faltou `OPENAI_API_KEY`; refazer depois com `$D setup`.

## What already exists

Skiplink, `role="application"` no canvas, `:focus-visible` em chips e ícones de filtro, tooltip customizado em `.ficon`, presets, visões salvas (`src/views.ts`), cartões de ajuda e atalhos, `@container (max-width: 640px)` e `@media (pointer: coarse)`, esqueleto de carregamento, cartão de boas-vindas. Reaproveitar tudo isso; a revisão troca a hierarquia, não reconstrói.

## Decisões pendentes (não perguntadas)

1. Precedência quando "ocultar o que não combina", "inverter" e "só órfãs" estão ligados ao mesmo tempo.
2. Trocar `window.confirm` (apagar visão salva, `view.ts:720`) por confirmação dentro do plugin.
3. Texto do skiplink, hoje reaproveitando `cmd.search` (`view.ts:210`).
4. Painel de filtros: fundir os seletores de idade (7/30/365 dias) com os campos de data, e mover a consulta extra para a busca principal; reduzir presets de 7 para 4.

## Tarefas de implementação

- [ ] **T1 (P1, human: ~1h / CC: ~10 min)** — view.ts — Corrigir o atalho F (6A)
  - Files: `src/view.ts:554-561`, `src/i18n.ts`
  - Verify: digitar "foo" na busca não abre o painel; Cmd+F chega ao Obsidian; teste de unidade da guarda.
- [ ] **T2 (P1, human: ~3h / CC: ~20 min)** — view.ts — Painel não modal, `filterBtn` atribuído, foco de volta, listener limpo em `onClose` (6B)
  - Files: `src/view.ts:117, 302-307, 410-429, 524-526, 727-744`
  - Verify: Esc devolve o foco ao botão; `aria-expanded` muda; sem listener ao fechar a visão.
- [ ] **T3 (P1, human: ~1 day / CC: ~30 min)** — rail — Expandida, 3 grupos, estado lembrado, recolhe abaixo de 640 px (1A)
  - Files: `src/view.ts:229-263`, `styles.css:9-210`, `src/main.ts` (settings)
  - Verify: harness `ui.html` em 1280, 640 e 400 px.
- [ ] **T4 (P1, human: ~1 day / CC: ~40 min)** — filtros — Um lugar por filtro; contador no botão Filtros (1B)
  - Files: `src/view.ts:410-429, 645-676`
  - Verify: ligar um filtro no painel atualiza o contador; nenhum toggle duplicado na rail.
- [ ] **T5 (P1, human: ~4h / CC: ~20 min)** — status — Faixa de estado e estado vazio com Limpar (2A)
  - Files: `src/view.ts:217-225, 1083-1250`, `styles.css`, `src/i18n.ts`
  - Verify: filtro que zera o grafo mostra texto e botão Limpar; leitor de tela anuncia a faixa.
- [ ] **T6 (P2, human: ~1 day / CC: ~30 min)** — erros — Faixa `role="alert"` para exportar, lint, montar grafo e visão salva quebrada (2B)
  - Files: `src/view.ts`, `src/canvasExport.ts`, `src/i18n.ts`
  - Verify: forçar falha de export mostra a causa e Tentar de novo.
- [ ] **T7 (P2, human: ~2 days / CC: ~45 min)** — onboarding — Tour de 3 passos e "Rever dicas" (3A)
  - Files: `src/view.ts:819-833`, `styles.css`, `src/i18n.ts`
  - Verify: tour só na 1ª abertura; Pular persiste; "Rever dicas" reabre.
- [ ] **T8 (P2, human: ~5h / CC: ~25 min)** — memória — Persistir filtros, cor, tamanho e busca entre aberturas (3B)
  - Files: `src/main.ts`, `src/view.ts:844-879`
  - Verify: fechar e reabrir restaura filtros; faixa de 2A mostra o que está ativo.
- [ ] **T9 (P2, human: ~3h / CC: ~15 min)** — ícones — Trocar os 8 ambíguos com checagem no Lucide (4A)
  - Files: `src/view.ts:367-406, 422-428, 536-544`
  - Verify: cada nome resolve em `getIconIds()`; reserva definida.
- [ ] **T10 (P2, human: ~2 days / CC: ~1 hour)** — gaveta — Cartões em uma gaveta direita com abas (4B)
  - Files: `src/view.ts:297-312, 767-818, 1318-1450`, `styles.css`
  - Verify: no máximo um painel à direita; folha inferior em 400 px.
- [ ] **T11 (P2, human: ~3h / CC: ~15 min)** — docs — `DESIGN.md` curto (5A)
  - Files: `DESIGN.md`
  - Verify: componentes novos citam os tokens.
- [ ] **T12 (P2, human: ~2 days / CC: ~50 min)** — responsivo — Alvos 32/44 px, barra superior e folha inferior abaixo de 640 px (6C)
  - Files: `styles.css:819, 1213, 1257, 1281`, `src/view.ts`
  - Verify: harness em 400 px; alvos medidos.
- [ ] **T13 (P2, human: ~4h / CC: ~20 min)** — a11y — Dois sinais por estado, contraste 4,5:1, `role="status"` em carregando e vazio (6D)
  - Files: `styles.css:113`, `src/view.ts:217-225`
  - Verify: verificador de contraste; leitor de tela.
- [ ] **T14 (P2, human: ~4h / CC: ~25 min)** — replay — Controles na barra de replay; data visível (7A)
  - Files: `src/view.ts:357-407, 273-290`, `styles.css:43-44`
  - Verify: modo, velocidade, data e loop alcançáveis por Tab com a rail expandida e recolhida.
- [ ] **T15 (P2, human: ~4h / CC: ~20 min)** — busca — Enter/Esc previsíveis e menu "mais" (7B)
  - Files: `src/view.ts:441-475`, `src/i18n.ts`
  - Verify: Enter avança; Ctrl/Cmd+Enter pergunta; segundo Esc devolve o foco.

Sequência sugerida: T1 e T2 primeiro (bugs), depois T3, T4, T5 (estrutura), depois o resto. Os baselines do `visual-regression.yml` precisam ser regenerados depois de T3, T9, T10, T13.

## Design Review Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | sem DESIGN.md; UI scope: rail, filtros, menus|
  | Step 0               | 6/10; foco: os 7 pontos                      |
  | Pass 1  (Info Arch)  | 4/10 → 8/10 after fixes                      |
  | Pass 2  (States)     | 3/10 → 8/10 after fixes                      |
  | Pass 3  (Journey)    | 4/10 → 8/10 after fixes                      |
  | Pass 4  (AI Slop)    | 7/10 → 9/10 after fixes                      |
  | Pass 5  (Design Sys) | 5/10 → 9/10 after fixes                      |
  | Pass 6  (Responsive) | 4/10 → 9/10 after fixes                      |
  | Pass 7  (Decisions)  | 2 resolved, 4 deferred                       |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (4 items)                            |
  | What already exists  | written                                      |
  | TODOS.md updates     | 0 items proposed                             |
  | Approved Mockups     | 0 generated, 0 approved                      |
  | Decisions made       | 15 added to plan                             |
  | Decisions deferred   | 4 (listed above)                             |
  | Overall design score | 3/10 → 8/10                                  |
  +====================================================================+
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Review | native subagent; Codex unavailable | Independent 2nd opinion | 1 | unavailable (Codex model refused), native completed | 11 findings, 2 critical |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 3/10 → 8/10, 15 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**OUTSIDE COVERAGE:** Codex design voice unavailable (`gpt-6-astra` refused for the ChatGPT account, `model_not_found`); the Claude subagent completed `[single-model]` with 11 findings, 2 critical (F key, panel focus). No cross-model overlap analysis possible.
**VERDICT:** Design review run, 4 decisions open; eng review required before shipping.

**UNRESOLVED DECISIONS:**
- Precedência entre "ocultar o que não combina", "inverter" e "só órfãs" quando ligados juntos.
- Trocar `window.confirm` por confirmação dentro do plugin ao apagar visão salva.
- Texto do skiplink (hoje reaproveita `cmd.search`).
- Painel de filtros: fundir idade e datas, mover a consulta extra para a busca e reduzir presets de 7 para 4.
