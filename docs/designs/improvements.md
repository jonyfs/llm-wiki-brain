# LLM Wiki Brain: melhorias propostas (v0.2+)

Gerado em 2026-10-27 a partir da leitura do `graph.js` da demo (624 linhas) e do `src/engine.ts` atual.
Prioridade: **P0** faz o plugin cumprir o que a demo promete; **P1** muda a rotina de uso; **P2** acabamento.
Esforço: S (< 1h), M (1-3h), L (> 3h), medido com CC.

## Causa raiz: por que a informação não "transita"

Evidência (leitura estática, `grep` em `src/engine.ts`): o port deixou de fora quatro peças da demo.

1. Sinais ambientes (`spawnSignal` a cada ~16 quadros): sem eles o cérebro fica parado entre eventos.
2. Chegada do sinal: na demo, ao fim da aresta o nó destino recebe `pulse` e o sinal segue para um vizinho (`gen < 2`, 55%). Aqui o sinal só some em `engine.ts:595`.
3. Ondas BFS do "ask" (`stepWaves`): a demo caminha 2 saltos pelos links com 420 ms por salto. Aqui só acendemos tudo de uma vez.
4. Nenhum uso de `index.md`, de `file.stat.ctime` ou de `wiki/log.md`. Por isso nada "sai do index".

## Animação index → última página (P0)

Modelo: um **pacote** de informação viaja pela rota mais curta do link graph, salto a salto.

- **Origem**: `index.md` (ou `wiki/index.md`); se não existir, o nó de maior grau.
- **Destino**: a página de maior `file.stat.ctime` (última criada); alternativas: maior `mtime` (última editada), o nó selecionado, ou a última entrada de `wiki/log.md`.
- **Rota**: BFS sobre `adj` (já existe), com custo uniforme. Cada salto vira um `sendSignal`; ao chegar (`t >= 1`) o próximo salto parte, o nó recebe `pulse` e `lit` (mesmo mecanismo da demo, com `gen` substituído por uma fila de rota).
- **Sem rota** (página nova ainda órfã, comum no ingest): desenhar um arco tracejado "sináptico" index → destino por um ponto de controle acima da linha reta, animado como um pacote, e depois fade-out. Mostra o fluxo sem inventar um link que não existe.
- **"Dentro da visualização atual"**: restringir a BFS aos tipos visíveis (`hidden[]`) e, opcionalmente, aos nós cuja projeção está dentro do canvas (`px,py` já calculados em `project()`). Se a rota sai da vista, cortar o pacote na borda e acender o destino com uma seta de borda.
- **Rastro**: guardar as últimas ~12 posições do pacote e desenhar uma linha com alpha decrescente (barato em Canvas 2D, sem bibliotecas).
- **Gatilhos**: (a) comando "Play flow: index to latest page"; (b) automático ao criar um arquivo (`vault.on("create")`); (c) botão no cabeçalho da view; (d) replay do `log.md`.
- **Replay temporal**: ordenar páginas por `ctime`; esconder todas e "crescer" o cérebro, com um pacote index → página a cada criação. Cortex Graph (registro de plugins) já oferece time lapse; o diferencial aqui é o fluxo a partir do index.

## Lista de melhorias

### A. Animação e fluxo
1. P0 M: portar `spawnSignal` ambiente com intensidade configurável (off / calmo / vivo).
2. P0 S: pulso ao fim da aresta no nó destino (`pulse = max(pulse, 0.5)`).
3. P0 M: encadeamento de sinais (`gen`), 55% de seguir para outro vizinho.
4. P0 L: pacote index → última página com rota BFS e rastro (seção acima).
5. P0 M: arco tracejado para destino sem link com o index.
6. P0 M: ondas BFS no "Ask": 2 saltos, 420 ms por salto, máx. 14 nós.
7. P1 M: nó "resposta" criado pelo Ask só quando o usuário confirma (salvar nota de síntese).
8. P1 M: replay temporal por `ctime` com controle de velocidade e pausa.
9. P1 M: replay do `wiki/log.md` (cada linha vira um pacote com o tipo da operação).
10. P1 S: cores de pacote por tipo de operação (ingest, query, lint).
11. P1 S: respeitar `prefers-reduced-motion` e a opção do plugin em todos os efeitos novos.
12. P1 S: botão play/pausa da animação ambiente.
13. P2 S: duração e velocidade dos pacotes nas configurações.
14. P2 M: brilho persistente nas páginas editadas hoje (decai ao longo do dia).
15. P2 S: pulso diferente para criar (anel grande) e editar (anel pequeno).

### B. Seleção e foco
16. P0 M: clique seleciona e **mantém** a seleção; clique no vazio ou `Esc` limpa (hoje o clique só abre a nota).
17. P0 S: clique simples seleciona, clique duplo ou `Enter` abre a nota.
18. P0 M: painel de informação do nó selecionado (tipo, links, vizinhos, caminho, datas).
19. P1 M: seleção múltipla com `Shift`+clique; pacote entre dois nós escolhidos.
20. P1 S: destacar vizinhos de 1 e 2 saltos do nó selecionado, esmaecer o resto.
21. P1 M: "fly to": centralizar e dar zoom no nó selecionado (`flyTo` da demo).
22. P1 S: duplo clique no vazio reseta a câmera.
23. P1 M: fixar um nó (pin) para ele não se mover na física.
24. P2 S: setas de teclado navegam entre vizinhos do nó selecionado.
25. P2 S: `n`/`p` percorrem os hubs por grau, como na demo.

### C. Filtros e busca
26. P0 S: filtros por tipo (já existem) com contagem e atalho `1`-`4`.
27. P0 M: busca ao vivo na barra superior (nome, caminho, tags, headings) que acende e seleciona.
28. P1 M: filtro por pasta com árvore e caixas de seleção.
29. P1 M: filtro por tag e por propriedade de frontmatter (`status`, `type`, `tags`).
30. P1 M: filtro por data (criadas/editadas nos últimos N dias).
31. P1 S: filtro "só órfãos" e "só com links quebrados".
32. P1 S: filtro por grau mínimo (slider) para limpar o ruído.
33. P1 M: modo "só vizinhança" do nó selecionado (profundidade 1, 2, 3).
34. P1 S: salvar e restaurar presets de filtro nas configurações.
35. P2 M: busca por conteúdo completo (lenta; atrás de um botão e com cache).
36. P2 S: limpar todos os filtros em um clique.

### D. Desempenho
37. P0 M: simulação em passos fixos com orçamento por quadro (hoje o custo é O(n²) até `alpha < 0.004`).
38. P0 M: grade espacial (hash 3D) no cálculo de repulsão; corte de 150 já existe, mas o laço ainda é O(n²).
39. P0 S: pausar o `requestAnimationFrame` quando a aba não está visível (`IntersectionObserver` + `document.hidden`, como na demo).
40. P0 S: `tune()` de qualidade adaptativa da demo (reduz dendritos e sinais quando o quadro passa de 13 ms).
41. P1 M: cache de sprites por tipo e tema (já temos; falta invalidar só no `css-change`).
42. P1 S: limite de DPR (≤ 2) e de pixels totais (2,6 M) como na demo.
43. P1 M: reaproveitar `Uint8Array`, arrays de buckets e `tips` entre quadros (menos GC).
44. P1 M: Web Worker para a física em vaults > 1500 notas.
45. P1 S: render sob demanda: sem animação ativa, desenhar só quando algo muda (já parcialmente).
46. P1 M: nível de detalhe: sem dendritos e sem rótulos além de N nós ou zoom < 0.7.
47. P2 M: edge bundling simples: desenhar arestas pouco relevantes em um único `path`.
48. P2 S: medir e expor `frameMs` e `nodes` num comando de diagnóstico.
49. P2 M: teste de carga automatizado com 500, 1000, 2000 nós gerados.

### E. Usabilidade
50. P0 S: estado vazio útil quando a pasta `wiki` não existe (botão "usar o vault inteiro").
51. P0 S: resumo no rodapé: nós, links, órfãos, quebrados.
52. P0 M: barra de ferramentas visível: Add flow, Ask, Lint, Replay, Reset, Tela cheia.
53. P1 S: zoom com `Ctrl/Cmd`+roda; roda simples não deve capturar a rolagem (a demo faz isso).
54. P1 M: arrastar com `Shift` ou botão do meio para pan; pinça no toque.
55. P1 S: inércia ao soltar a rotação (já na demo).
56. P1 S: tela cheia (Fullscreen API) com fallback.
57. P1 M: comando "abrir nota no painel lateral" no clique com `Cmd/Ctrl`.
58. P1 S: tooltip com nome, tipo e grau ao passar o mouse (hoje só mostramos o caminho).
59. P1 M: persistir câmera, filtros e seleção no `workspace` (`getState`/`setState` da view).
60. P2 S: tema: seguir `--interactive-accent` para a cor da seleção.
61. P2 S: legenda dos tipos com formato do neurônio.
62. P2 M: exportar PNG do cérebro atual.
63. P2 L: exportar vídeo/GIF do replay (MediaRecorder sobre `canvas.captureStream`).

### F. Dados do wiki LLM
64. P0 S: tipo pelo frontmatter `type` (já), com fallback por pasta (já) e por tag `#source` etc.
65. P0 M: tratar `index.md` e `log.md` como nós especiais (forma e posição fixas, sem contar no grau).
66. P1 M: ler `wiki/log.md` e extrair operações (ingest, query, lint) com data.
67. P1 M: ligar `raw/` → `wiki/sources` pelo campo `source` do frontmatter (se existir).
68. P1 M: aresta com direção e rótulo (`[[a]]` em `b` ≠ `[[b]]` em `a`), seta no hover.
69. P1 S: cor de aresta por tipo de ligação (source → concept etc.).
70. P1 M: lint real: órfãos, links quebrados, notas sem frontmatter `type`, duplicatas de título.
71. P1 M: relatório do lint em lista clicável, não só em `Notice`.
72. P2 M: contradições: marcar páginas com `contradicts:` no frontmatter.
73. P2 M: página de resposta do Ask salva em `wiki/syntheses/` mediante confirmação.

### G. Acessibilidade e mobile
74. P1 S: `aria-live` com o resumo do nó selecionado e do resultado do Ask/Lint.
75. P1 S: alvo de toque ≥ 22 px (a demo usa 22 no toque, 12 no mouse).
76. P1 M: gesto de dois dedos: pan; um dedo: rotação; toque longo: selecionar.
77. P2 S: contraste dos rótulos nos dois temas (verificar com tema claro).
78. P2 S: modo "lista de hubs" alternativo ao canvas para leitor de tela.

### H. Qualidade, release e marketplace
79. P0 S: screenshot e GIF no README (a listagem usa o trecho do README).
80. P0 S: testes de unidade da construção do grafo (`vaultGraph.ts`) com um `App` simulado.
81. P1 S: teste do motor (BFS da rota, arestas duplicadas, remoção de nós) em Node.
82. P1 S: CI de PR: `npm run build` + `tsc` + lint (eslint-plugin-obsidianmd, que o diretório usa).
83. P1 S: `CHANGELOG.md` e notas de release automáticas (já usamos `--generate-notes`).
84. P1 S: tratar `metadataCache.on("resolved")` com `debounce` e cancelar ao fechar a view (feito: `debounce`; falta teste).
85. P2 S: i18n (pt-BR e en) das cadeias de texto da UI.
86. P2 S: telemetria zero documentada no README (política do diretório).

## Ordem sugerida

1. **v0.2 (animação)**: itens 1 a 6, 16 a 18, 39, 40, 52.
2. **v0.3 (uso diário)**: 26 a 34, 50, 51, 53 a 59, 66, 70, 71, 79.
3. **v0.4 (escala e replay)**: 8, 9, 37, 38, 44, 62, 63, 80 a 82.

## Riscos

- Física O(n²): 800 nós já pesa em laptops fracos; itens 37 e 38 precisam vir antes de subir o limite de nós.
- Rota BFS pode atravessar hubs e produzir caminhos "óbvios"; limitar saltos a 6 e preferir arestas de menor grau.
- Replay por `ctime` depende do sistema de arquivos: vaults sincronizados (Git, iCloud) podem ter `ctime` igual para tudo. Nesse caso cair para o `log.md`.
