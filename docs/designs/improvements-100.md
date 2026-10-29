# 100 melhorias para o LLM Wiki Brain (0.5.2)

Levantamento feito lendo o código (4.856 linhas em `src/`), as medições de `docs/benchmark.md` e o que já existe. Nada aqui foi implementado.
Tags: **[V]** lacuna confirmada no código; **[I]** ideia. Valor A/M/B (alto, médio, baixo). Esforço P/M/G (pequeno, médio, grande).
Marcadas com ★ as 11 que eu faria primeiro.

## A. Áreas selecionadas e visibilidade (14)

1. ★ **Realce de vizinhança mais forte [V]:** hoje o nó em foco só escurece o resto (`dim` 0,16). Acrescentar halo colorido nos vizinhos diretos e rótulo em todos. A / P
2. **Seleção múltipla [V]:** `selected` é um único id. Shift+clique soma nós; painel mostra o conjunto. A / M
3. ★ **Seleção por área (laço/retângulo) [V]:** não existe. Arrastar com Alt desenha um retângulo; seleciona o que está dentro. A / M
4. **Seleção por região do cérebro [I]:** clicar na nuvem de um lobo seleciona todas as páginas dele e mostra o nome do lobo. A / M
5. **Contorno da área selecionada [I]:** envoltória convexa tracejada em volta do conjunto selecionado. M / M
6. **Contador flutuante da seleção [I]:** "12 páginas, 31 links, 3 órfãs" ao lado da área. M / P
7. ★ **Mostrar quais filtros estão ocultando nós [V]:** nós filtrados somem; um "fantasma" tênue (opção) mostra onde estavam. A / P
8. **Cor por critério [I]:** colorir por pasta, tag, idade ou grau, não só por tipo (legenda automática). A / M
9. **Tamanho por critério [I]:** raio por backlinks, tamanho do arquivo ou recência. M / P
10. **Legenda fixa [V]:** não há legenda de cores/tipos fora dos chips. Mini-legenda recolhível. M / P
11. **Minimapa do cérebro [V]:** mostra posição da câmera e da seleção quando há zoom. M / M
12. **Anéis de recência [I]:** brilho mais forte para o que foi editado hoje. M / P
13. **Destaque de caminho entre dois nós [I]:** selecionar A e B desenha a rota (já existe `findRoute` para o Flow). A / P
14. **Modo foco (isolar seleção) [V]:** existe "só vizinhança"; falta para um conjunto e com profundidade. M / P

## B. Filtros (14)

15. ★ **Estado dos controles não volta ao reabrir [V]:** `setState` restaura `this.filters`, mas só pasta/tag/operação são repostos nos selects; mínimo/máximo de links, dias, criado, profundidade, invertido e órfãs ficam desalinhados do filtro aplicado. A / P
16. **Vizinhança e busca fora do estado salvo [V]:** `neighborhood` e o texto da busca não entram em `getState`. M / P
17. ★ **Chips de filtros ativos com ✕ [I]:** abaixo da busca, um chip por filtro ligado; clicar remove só aquele. A / P
18. **Multi-pasta e multi-tag (E/OU) [V]:** hoje um valor só por seletor. A / M
19. **Excluir pasta/tag [I]:** filtro negativo, como `-tag:` na busca. M / P
20. **Filtro por tipo de link (entrada/saída/mútuo) [V]:** o modelo dirigido já distingue. M / P
21. **Filtro por comunidade [I]:** mostrar só um agrupamento detectado (`communities`). M / M
22. **Filtro por faixa de datas com calendário [I]:** hoje só "últimos N dias". M / M
23. **Filtro por propriedade do frontmatter [I]:** seletor chave/valor (a busca já tem `prop:`). A / M
24. **Filtro por inibição/contradição [I]:** só páginas com `contradicts`. B / P
25. **Contagem ao lado de cada opção [I]:** "concepts (14)". M / P
26. **Pré-visualizar o efeito antes de aplicar [I]:** "este filtro deixa 23 de 214". M / P
27. **Visões salvas com atalho e ordem [I]:** renomear, reordenar, comando por visão. M / M
28. **Filtros por papel do agente/log [V]:** o filtro de operação casa por nome no título; aceitar também data e autor. M / M

## C. Busca (10)

29. ★ **Ajuda da sintaxe na própria caixa [V]:** o placeholder já não cabe; um "?" abre cartão com exemplos clicáveis. A / P
30. **Autocompletar `tag:`, `path:`, `type:`, `prop:` [I]:** sugestões enquanto digita. A / M
31. **Busca no corpo da nota [V]:** hoje só nome, caminho, títulos e tags. M / G
32. **Destacar o trecho que casou [I]:** no painel do nó. M / M
33. **Lista de resultados clicável [V]:** só contador e setas; falta lista rolável. A / M
34. **Histórico persistente [V]:** as 12 buscas somem ao fechar. B / P
35. **Modo "filtrar" vs "destacar" [I]:** hoje destaca e escurece; opção de esconder o resto. M / P
36. **Regex e frase exata [I]:** `/padrão/`. B / P
37. **Operadores de data legíveis [I]:** `hoje`, `semana`, `mês`. B / P
38. **Busca por ligação ("linka para X") [I]:** `links-to:` e `linked-from:`. M / P

## D. UX e controles (14)

39. ★ **Botão de tela cheia/atalhos descobríveis [V]:** teclas existem (setas, +, -, 0, f, n/p, Enter) e ninguém as vê. Folha de atalhos com "?". A / P
40. **Menu de contexto no nó [V]:** `contextmenu` é só bloqueado. Abrir, abrir ao lado, fixar, copiar link, isolar. A / M
41. **Arrastar um nó para movê-lo e fixar [V]:** hoje fixar é por botão. M / M
42. **Duplo clique no fundo = reset de câmera [I].** B / P
43. **Barra de ferramentas recolhível [I]:** a faixa de controles já ocupa 3 linhas em painéis estreitos. A / M
44. **Layout responsivo por largura do painel [V]:** sem ajuste para painel lateral estreito. A / M
45. **Desfazer/refazer de filtros e seleção [I]:** histórico navegável. M / M
46. **Botão ✕ de limpar também limpa seleção e câmera? [I]:** decidir escopo; hoje só filtros e busca. B / P
47. **Atalho global para abrir a visão e focar a busca [I].** M / P
48. **Abrir nota em painel dividido/aba nova/modificador [V]:** abre sempre numa aba. M / P
49. **Seguir nota ativa com transição suave [V]:** salta; animar. B / P
50. **Barra de status mais informativa [V]:** adicionar FPS, qualidade e nós visíveis (já há `stats()`). B / P
51. **Rotação automática pausa ao interagir e volta depois [I].** B / P
52. **Presets de câmera (frente, topo, lado) [I].** M / P

## E. Tooltip, hover e painel de informação (12)

53. ★ **Tooltip no canvas [V]:** o nome do caminho aparece só no rodapé. Tooltip junto ao cursor com título, tipo, links e editado em. A / M
54. **Pré-visualização do conteúdo no hover [V]:** usa Page Preview do Obsidian; oferecer primeiras linhas quando o plugin está desligado. M / M
55. **Tooltip nos controles [V]:** só 8 `title:` em `view.ts`; os selects e o slider não explicam. M / P
56. **Explicar o anel de carga e a cor vermelha [I]:** legenda e tooltip de "inibe". M / P
57. **Painel de info com seções recolhíveis [I]:** entradas, saídas, vizinhos, propriedades. M / P
58. **Mostrar propriedades do frontmatter no painel [I].** M / P
59. **Mostrar backlinks não resolvidos/quebrados da página [V]:** o lint sabe, o painel não. M / P
60. **Tooltip de aresta [I]:** passar sobre um link mostra "A → B, 3 menções". M / M
61. **Rótulos adaptativos [V]:** limite fixo de 40 rótulos; por densidade e zoom. M / P
62. **Rótulo sempre legível (contorno, contraste no tema claro) [I].** M / P
63. **Ocultar rótulos longos com reticências e expandir no hover [I].** B / P
64. **Mostrar a data relativa ("há 3 dias") [I].** B / P

## F. Acessibilidade (8)

65. **Navegação por teclado entre vizinhos [V]:** `n/p` anda só pelos hubs; setas movem a câmera. Alt+setas para vizinhos. A / M
66. **Foco visível nos botões do canvas e anel de foco [I].** M / P
67. **Descrição textual da seleção em `aria-live` [V]:** existe no painel; ampliar para filtros ("23 de 214 visíveis"). M / P
68. **Contraste das cores dos tipos no tema claro [I]:** conferir 4,5:1. M / P
69. **Modo daltônico (formas além de cores) [I].** M / M
70. **Respeitar `prefers-reduced-motion` em todos os efeitos [V]:** a configuração existe; auditar ambiente, ondas e replay. M / P
71. **Alvos de toque maiores nos botões [I].** M / P
72. **Tamanho de fonte dos rótulos nas configurações [I].** B / P

## G. Desempenho (12)

73. ★ **Hit-test com grade espacial [V]:** `pick` percorre todos os nós a cada movimento do mouse (O(n)). Com 10.000 isso pesa. A / M
74. ★ **Desenho em lote por tipo e alfa [V]:** a 10.000 nós o desenho leva 25–33 ms; agrupar sprites por tipo e faixa de alfa. A / M
75. **Cache de arestas fora da tela [I]:** já cortamos links retos; cortar também por viewport antes de projetar. M / P
76. **Reduzir alocações por quadro [V]:** `drawSoma` aloca arrays; reutilizar buffers. M / P
77. **Física em Web Worker [V]:** a 10.000 nós o passo ainda custa 55–70 ms. A / G
78. **Física incremental ao adicionar poucas páginas [I]:** não rodar passos para tudo. M / M
79. **Parar o laço quando oculto [I]:** aba em segundo plano e painel fechado. M / P
80. **Reconstrução parcial do grafo em eventos de vault [V]:** `refresh` refaz tudo (180 ms a 10.000). M / M
81. **`assignPorts` incremental [V]:** 109 ms a 10.000 a cada mudança de layout. M / M
82. **Busca com índice pré-calculado [I]:** 13 ms por tecla a 10.000 já serve; índice invertido se passar de 50.000 notas. B / M
83. **Medidor de desempenho na tela (opção) [I]:** FPS e ms do quadro para diagnóstico. B / P
84. **Orçamento de qualidade por tela HiDPI [I]:** limitar `dpr` em telas 4K. M / P

## H. Persistência, estado e correção (8)

85. ★ **Câmera e seleção por sessão [V]:** não persistem; reabrir volta ao início. M / P
86. **Layout salvo com versão [V]:** layout salvo cresce; podar por data e versão do algoritmo (a física mudou). M / P
87. **Salvar fixados junto do layout [V]:** estão em `pinned`; unificar. B / P
88. **Aviso quando `wikiRoot` não existe [V]:** hoje só dica "nenhuma página". M / P
89. **Teto de nós sem corte silencioso [V]:** passando de `maxNodes`, páginas somem; mostrar aviso e como aumentar. A / P
90. **Migração de configurações com `schemaVersion` [I].** B / P
91. **Teste de interface no Obsidian real automatizado [V]:** só há harness com dados sintéticos e checklist manual. A / G
92. **Cobertura de teste para `view.ts` e `engine.ts` [V]:** os dois ficam fora do `build-tests` (precisam de DOM). A / G

## I. Replay, Flow e animação (6)

93. **Linha do tempo arrastável do replay [I]:** hoje data inicial e pausa; falta scrub. A / M
94. **Exportar replay como GIF/PNG sequence [I]:** (já listado no TODOS). M / G
95. **Flow para qualquer par selecionado [V]:** modo "selecionado" existe só para o alvo. M / P
96. **Cores por operação do log no replay [I]:** ingest/query/lint. M / P
97. **Rastro persistente das últimas consultas [I].** B / M
98. **Som opcional nos disparos [I].** B / M

## J. Exportação e integração (6)

99. **Exportar imagem PNG/SVG da vista [V]:** não existe. A / M
100. **Copiar seleção como lista de links e como canvas do Obsidian [V]:** só `Copiar` de resultados de busca. M / M

## Ordem sugerida das ★

1. #15 estado dos controles (correção, 1 hora)
2. #17 chips de filtros ativos, #29 ajuda da busca, #39 atalhos, #53 tooltip no canvas (UX imediata)
3. #1 realce de vizinhança, #7 fantasmas dos filtrados, #3 seleção por área (visibilidade de áreas)
4. #85 câmera/seleção por sessão
5. #73 hit-test em grade, #74 desenho em lote (desempenho)
