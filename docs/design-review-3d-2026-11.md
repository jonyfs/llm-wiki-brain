---
Summary: Revisão de design do motor visual (neurônios, ligações, 3D, simulação) com 8 decisões aprovadas, tarefas E1-E10 e a escolha de dendritos J2.
Tags: [#design #3d #neurons #simulation #plan]
---

# Revisão do motor visual — LLM Wiki Brain

Alvo: o plugin inteiro, com foco em neurônios, simulação e estrutura 3D (`src/engine.ts`, `src/ports.ts`, `src/neuron.ts`, `src/physics.ts`, `src/synapse.ts`). A interface (rail, filtros, menus) foi revisada antes em `docs/ux-review-2026-11.md`; as tarefas T3 a T15 de lá continuam abertas.

Modo: OPERATE (app UI). Sem `DESIGN.md`. Mockups em imagem indisponíveis (falta `OPENAI_API_KEY`); os exemplos visuais foram para o canvas de Design (quadros J1, J2, J3). Voz externa: Codex indisponível (modelo recusado pela conta), subagente do Claude concluído `[single-model]`.

Achado retirado: a luz fixa do soma é coerente com uma luz fixa no mundo, então não é defeito. O problema 3D está na forma, não na luz.

## Decisões aprovadas (8)

| # | Ponto | Decisão |
|---|---|---|
| 1A | Hierarquia | Espessura e opacidade da ligação pelo peso hebbiano `w`; contas de mielina (traço com bainhas e nós de Ranvier) nas rotas entre hubs; ligações fracas mais discretas. |
| 2A | Estados | Após disparar, o soma escurece e dessatura por cerca de 600 ms; o neurônio inibido ganha um anel tracejado frio. |
| 3A | Jornada, 3D | Axônio e ligações com pontos de controle 3D guardados na célula e projetados a cada quadro; cada terminal do axônio liga ao seu alvo. |
| 3B | Jornada, detalhe | Neurônio completo decidido por raio na tela, não por `nodes.length > 600`; zoom devolve os detalhes. |
| 4A | Forma | Dendritos da variante **J2**: até 3 níveis de ramificação, filhos com 63% da espessura do pai, sem espinhos; núcleo removido. |
| 4B | Profundidade | Névoa de cor para o fundo do tema, ligações mais finas e dendritos mais curtos ao longe. |
| 5A | Sistema de design | Já aprovado em `ux-review`: `DESIGN.md` curto; agora também com os tokens do motor. |
| 6A | Acessibilidade | Marca de forma por tipo no miolo do nó e do sprite (círculo, quadrado arredondado, losango, triângulo). |
| 7A | Simulação | Deriva 3D no mundo, por célula, 1,5 a 3 unidades, frequência e fase pelo caminho da nota; física e layout salvo intactos. |

## Tabela de estados do neurônio (alvo)

| Estado | Como aparece |
|---|---|
| Em repouso | soma com marca de tipo, dendritos J2, névoa de profundidade |
| Carregando | arco de carga |
| Disparou | anel que expande, soma que incha e cai em curva exponencial |
| Refratário | soma escurecido e dessaturado por ~600 ms |
| Inibido | anel tracejado frio |
| Reforçado (hebb) | ligação mais grossa e opaca; rota principal com bainhas de mielina |
| Filtrado, selecionado, fixado | como hoje |

## Jornada (storyboard)

| Passo | Usuário faz | Sente | Plano especifica |
|---|---|---|---|
| 1 | Abre e vê a nuvem | "que bonito" | névoa de cor (4B) |
| 2 | Gira | sente um objeto sólido | ligações e axônios 3D (3A), deriva com paralaxe (7A) |
| 3 | Dá zoom num neurônio | vê a célula | LOD por raio (3B), dendritos J2 (4A) |
| 4 | Seleciona e segue conexões | clareza de rota | peso e mielina (1A) |
| 5 | Assiste a um Flow | causa e efeito | refratário e inibição (2A) |

## NOT in scope

- WebGL ou three.js: reescrita, e o plugin precisa rodar no Obsidian móvel.
- Mais espinhos ou mais brilho: é o ruído que se pediu para tirar.
- Iluminação por pixel no soma: o sprite resolve e custa menos.
- Orçamento maior que 350 neurônios completos: antes, corrigir as alocações por quadro.
- Empacotamento realista de dendritos ou colisão entre eles.

## What already exists

Perspectiva real (`DIST = 820`), ordenação por profundidade, orçamento de neurônios completos, qualidade adaptativa, lobos com dobras, física que assenta, cascata com limiar e Hebb, morfologia por tipo, ramos de frente por cima do soma, axônio apontando para os alvos (0.10.0), pulsos com cauda, tema claro e escuro, movimento reduzido.

## Decisões pendentes (não perguntadas)

1. Mostrar o peso e a mielina como número no tooltip e no painel de informações.
2. Reaquecer a física ao filtrar ou ao adicionar notas, para o layout se reacomodar de forma visível.
3. Paleta opcional para daltonismo, além da marca de forma (6A).

## Tarefas de implementação

- [ ] **E1 (P1, human: ~3 days / CC: ~1.5 hours)** — 3D — Axônio e ligações com pontos de controle 3D; terminais por alvo (3A)
  - Surfaced by: Ponto 3 — `edgeCurve` curva no plano da tela; `axonGeom` é 2D
  - Files: `src/ports.ts:103-110`, `src/engine.ts:1125-1148, 2238-2251`
  - Verify: teste de invariância por rotação (a forma 3D não troca de lado); harness girando 360 graus.
- [ ] **E2 (P1, human: ~1 day / CC: ~40 min)** — desempenho — Cache do `axonGeom` por quadro; tirar `new Uint8Array` e `nodes.some` do `draw()`; pré-renderizar o gradiente do soma
  - Surfaced by: Ponto 6 — alocações por quadro (`engine.ts:1899, 1959, 1127`)
  - Files: `src/engine.ts`
  - Verify: tempo de quadro em 350 neurônios no harness (docs/benchmark.md).
- [ ] **E3 (P2, human: ~1 day / CC: ~40 min)** — ligações — Peso `w` na espessura e opacidade; bainhas de mielina (1A)
  - Files: `src/engine.ts:1909-1935`, `src/synapse.ts:181`
  - Verify: ligação reforçada pelo `hebb` fica mais grossa; hub a hub mostra bainhas.
- [ ] **E4 (P2, human: ~4h / CC: ~20 min)** — estados — Refratário e inibição visíveis (2A)
  - Files: `src/engine.ts` (`drawSoma`), `src/synapse.ts` (`rest`)
  - Verify: célula recém-disparada dessatura e volta; alvo inibido mostra o anel.
- [ ] **E5 (P2, human: ~1 day / CC: ~45 min)** — LOD — Detalhe por raio na tela (3B)
  - Files: `src/engine.ts:1951-1961, 1881`
  - Verify: cofre de 2.000 notas mostra neurônios completos nos grandes na tela.
- [ ] **E6 (P2, human: ~1 day / CC: ~1 hour)** — forma — Dendritos J2 com ramificação recursiva; sem núcleo (4A)
  - Files: `src/engine.ts` (`makeDendrites`, `drawDendrites`, `drawSoma`), `src/ports.ts`
  - Verify: comparação com o quadro J2 do canvas; tempo de quadro em qualidade alta.
- [ ] **E7 (P2, human: ~1 day / CC: ~40 min)** — profundidade — Névoa de cor e afinamento (4B)
  - Files: `src/engine.ts:1909, 1974, 2303`
  - Verify: nos temas claro e escuro, o fundo do cérebro se mistura sem aumentar brilho.
- [ ] **E8 (P2, human: ~4h / CC: ~25 min)** — tipos — Marca de forma por tipo (6A)
  - Files: `src/engine.ts` (`makeSprite`, `drawSoma`)
  - Verify: 4 tipos distinguíveis em escala de cinza a 10 px.
- [ ] **E9 (P2, human: ~1 day / CC: ~35 min)** — simulação — Deriva 3D no mundo (7A)
  - Files: `src/engine.ts:1717-1721`
  - Verify: ao girar, os próximos se movem mais que os distantes; cliques acertam o nó.
- [ ] **E10 (P3, human: ~3h / CC: ~15 min)** — docs — `DESIGN.md` com tokens do motor (5A)
  - Files: `DESIGN.md`
  - Verify: paleta, tom das ligações, brilho, névoa e tempos citados.

Sequência sugerida: E2 antes de E1 (limpa as alocações), depois E1; E3, E4 e E7 são independentes; E6 e E8 mexem no mesmo desenho do soma, então juntos.

## Design Review Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | sem DESIGN.md; UI scope: motor visual 3D     |
  | Step 0               | 6/10; foco: os 7 pontos                      |
  | Pass 1  (Info Arch)  | 5/10 → 8/10 after fixes                      |
  | Pass 2  (States)     | 5/10 → 8/10 after fixes                      |
  | Pass 3  (Journey)    | 4/10 → 8/10 after fixes                      |
  | Pass 4  (AI Slop)    | 6/10 → 9/10 after fixes                      |
  | Pass 5  (Design Sys) | 5/10 → 9/10 after fixes                      |
  | Pass 6  (Responsive) | 5/10 → 9/10 after fixes                      |
  | Pass 7  (Decisions)  | 1 resolved, 3 deferred                       |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (5 items)                            |
  | What already exists  | written                                      |
  | TODOS.md updates     | 0 items proposed                             |
  | Approved Mockups     | 3 variantes no canvas, J2 aprovada           |
  | Decisions made       | 8 added to plan                              |
  | Decisions deferred   | 3 (listed above)                             |
  | Overall design score | 4/10 → 8/10                                  |
  +====================================================================+
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Review | native subagent; Codex unavailable | Independent 2nd opinion | 2 | unavailable (Codex model refused), native completed | 2 critical (axon and link curves in screen space), 3 high |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 2 | issues_open | score: 4/10 → 8/10, 8 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | n/a, no developer-facing surface |

**OUTSIDE COVERAGE:** Codex design voice unavailable (`gpt-6-astra` refused for the ChatGPT account, `model_not_found`); the Claude subagent completed `[single-model]`. No cross-model overlap analysis possible.
**VERDICT:** Design review run, 3 decisions open; eng review required before shipping.

**UNRESOLVED DECISIONS:**
- Mostrar o peso e a mielina como número no tooltip e no painel de informações.
- Reaquecer a física ao filtrar ou ao adicionar notas.
- Paleta opcional para daltonismo, além da marca de forma.
