# LLM Wiki Brain: plano competitivo contra os 30 maiores concorrentes

Gerado em 2026-10-27. Fontes: `community-plugins.json` e `community-plugin-stats.json` do repositório oficial do Obsidian (downloads), API do GitHub (estrelas, último push, licença) e os READMEs de cada plugin. Evidência: leitura estática dos READMEs, sem rodar os concorrentes.

## 1. Quem são os 30 concorrentes

"Concorrente" aqui é todo plugin que disputa a mesma tarefa do usuário: ver o vault como grafo, achar conexões, medir a saúde dos links ou manter uma wiki com LLM. Plugins de sincronização, tarefas, calendário etc. ficaram de fora mesmo com mais downloads.

| # | Plugin | Downloads | Estrelas | Último push | O que faz melhor |
|---|---|---:|---:|---|---|
| 1 | Copilot | 2.953.670 | 7.896 | 2026-10-26 | agentes, projetos, comandos, modelos próprios |
| 2 | Claudian | 2.538.949 | 15.817 | 2026-10-27 | Claude Code e Codex dentro do vault |
| 3 | Smart Connections | 1.251.418 | 5.522 | 2026-10-10 | conexões por significado (embeddings), aleatório, inline |
| 4 | Mind Map (Markmap) | 901.668 | 1.429 | 2024-02-25 | nota atual como mapa mental |
| 5 | Markmind | 620.382 | 1.071 | 2026-10-05 | mapa mental, apresentação, anotação de PDF |
| 6 | Breadcrumbs | 418.481 | 840 | 2026-10-21 | hierarquia por links tipados, árvore, exportar para Canvas |
| 7 | ExcaliBrain | 356.554 | 1.006 | 2026-10-18 | vizinhança pai/filho/amigo, relações inferidas |
| 8 | Enhancing Mindmap | 241.039 | 713 | 2026-01-08 | edição de mapa mental em Markdown |
| 9 | Find orphaned files and broken links | 232.955 | 375 | 2026-07-28 | órfãos, links quebrados, arquivos vazios, arquivar |
| 10 | Canvas Mindmap | 161.678 | 374 | 2024-09-04 | atalhos de mapa mental no Canvas |
| 11 | Strange New Worlds | 140.028 | 582 | 2026-08-12 | contagem de referências, rede de pensamento |
| 12 | Juggl | 139.602 | 821 | 2025-02-27 | grafo estilizável com CSS, layouts, pin, salvar |
| 13 | Extended Graph | 79.674 | 241 | 2026-02-13 | imagens e formas nos nós, filtros por propriedade, SVG |
| 14 | 3D Graph | 77.144 | 392 | 2023-10-24 | grafo 3D simples |
| 15 | Smart Second Brain | 72.405 | 1.326 | 2026-10-13 | busca por significado, Smart Graph por tópicos, agentes |
| 16 | Khoj | 54.988 | 37.855 | 2026-08-02 | assistente pessoal, busca semântica, agentes |
| 17 | Persistent Graph | 48.317 | 147 | 2026-05-24 | salvar posições e filtros, travar nós |
| 18 | 2Hop Links Plus | 44.760 | 88 | 2024-07-14 | links relacionados a 2 saltos em cartões |
| 19 | Smart Connections Visualizer | 38.922 | 125 | 2026-01-06 | conexões em grafo de forças, preview ao passar |
| 20 | 3D Graph New | 33.613 | 169 | 2023-12-30 | grafo 3D global e local, profundidade, tipo de link |
| 21 | InfraNodus AI Graph View | 32.919 | 175 | 2026-08-04 | tópicos, clusters, lacunas de conhecimento, IA |
| 22 | Folders to Graph | 27.585 | 46 | 2026-06-13 | pastas e títulos como nós, dobrar e desdobrar |
| 23 | New 3D Graph | 26.632 | 84 | 2026-10-20 | física em Rust/WASM em worker, WASD, filtros path:/tag: |
| 24 | Gemini Helper | 24.386 | 118 | 2026-10-26 | chat, RAG, wiki LLM (OKF), histórico de edição |
| 25 | Tags Routes | 19.110 | 102 | 2024-12-06 | grafo 3D de tags, travar cena, navegador na barra lateral |
| 26 | Neural Composer | 16.693 | 178 | 2026-10-13 | Graph RAG local com LightRAG |
| 27 | Brain Atlas | 6.799 | 21 | 2026-10-02 | cérebro 3D, WebGL2, regiões por frontmatter, relatório de classificação |
| 28 | Auto LLM Wiki | 3.902 | 13 | 2026-08-20 | ingest com plano de mudanças, prévia, aplicar atômico |
| 29 | Cortex Graph | 203 | 0 | 2026-10-17 | time lapse, vídeo, vistas salvas, galáxias de pastas, hover no explorador |
| 30 | Hivemynd | 165 | 4 | 2026-10-23 | rastros de agentes, replay, painel de monitor, reivindicação de notas |

Leitura do mercado:
- Os líderes em downloads são chat com IA (Copilot, Claudian) e mapas mentais. Quase todos os grafos de verdade têm menos de 150 mil downloads: o espaço do grafo é fragmentado e **nenhum grafo domina**.
- Os grafos 3D e de cérebro mais novos (Brain Atlas, Cortex Graph, Hivemynd) têm quase nenhum uso, mas são os que mais se parecem com o nosso. A competição direta é fraca em adoção e forte em recursos.
- Vários grafos populares estão parados há anos (Mind Map 2024, 3D Graph 2023, 3D Graph New 2023, Canvas Mindmap 2024, 2Hop 2024, Tags Routes 2024). Há espaço para um grafo mantido.
- Um plugin não vence Copilot ou Claudian em chat. O plano **não** é construir chat; é ser a camada visual e de saúde da wiki que esses agentes mantêm.

## 2. Onde estamos hoje

Já temos (v0.2.0): cérebro 3D em Canvas 2D sem dependências; formato de neurônio por tipo; links que saem de dendritos livres; fluxo index para a última página, com rota ou arco tracejado; replay por criação; sinais ambientes; Ask em ondas; busca ao vivo; filtros (tipo, pasta, tag, links mínimos, período, órfãos, vizinhança); lint com lista; seleção persistente com painel; pausa fora da tela; qualidade adaptativa; testes de rota e de lobos.

Nos faltam, frente aos concorrentes: persistência de posições e vistas salvas, grafo local que segue a nota ativa, preview ao passar, exportação (PNG, SVG, vídeo, Canvas), relações tipadas, conexões por significado, descoberta de lacunas e clusters, modo agente (rastros, log), mapeamento de regiões por frontmatter, WebGL e worker para vaults grandes, estilização, acessibilidade e documentação.

## 3. Critério de "melhor"

Um plugin é melhor se, para a tarefa do usuário, vence em uma destas dimensões sem perder nas outras:
1. **Ver** o vault (clareza, beleza, velocidade).
2. **Entender** o vault (clusters, lacunas, saúde, o que mudou).
3. **Agir** a partir do grafo (abrir, criar, ligar, corrigir, exportar).
4. **Acompanhar a IA** que mantém a wiki (o que leu, escreveu, quando).
5. **Confiar** (privacidade, desempenho, estabilidade, mobile).

Meta de produto: a melhor opção para **quem mantém uma wiki com LLM** (Karpathy, `llm-wiki-template`, Claude Code, Codex). Para esse usuário nenhum dos 30 combina grafo vivo, lint de wiki e rastro de agente.

## 4. Melhorias

Prioridade: **P0** sem isso não vencemos; **P1** diferencial claro; **P2** acabamento ou nicho. Esforço com CC: S (< 1 h), M (1 a 3 h), L (> 3 h). Entre parênteses, o concorrente que prova que o recurso tem demanda.

### A. Núcleo do grafo e desempenho
1. P0 L: renderer WebGL2 com fallback Canvas 2D e opção Auto, como no Brain Atlas (ele mediu 70% menos CPU parado).
2. P0 L: física em Web Worker com buffers transferíveis (New 3D Graph usa Rust/WASM em worker).
3. P0 M: reduzir a física a O(n log n) com octree no lugar da grade fixa (hoje a grade é por célula de 150).
4. P0 M: orçamento de tempo por quadro na simulação; dividir passos longos entre quadros.
5. P0 S: desligar o laço de animação com a janela em segundo plano (`document.hidden`) além do `IntersectionObserver`.
6. P0 M: nível de detalhe por distância e por zoom: sem dendritos, sem rótulos, só pontos acima de N nós.
7. P0 M: teste de carga automatizado com 500, 2.000 e 10.000 nós e limite de CPU em CI.
8. P1 M: modo "Battery saver" e "Balanced" (Brain Atlas): 30 fps ambiente, sem brilho, sem sinais.
9. P1 M: pool de objetos e arrays reaproveitados para zerar alocação por quadro.
10. P1 S: medir e mostrar fps, nós, arestas e `frameMs` num comando de diagnóstico.
11. P1 M: simulação incremental ao adicionar uma nota (só vizinhança), sem reaquecer o grafo todo.
12. P1 M: cache do layout em disco (`data.json` ou arquivo próprio) para abrir sem reassentar.
13. P1 S: `devicePixelRatio` e área máxima de pixels configuráveis.
14. P2 L: instanciar nós com `drawArraysInstanced` quando o renderer for WebGL.
15. P2 M: suporte a OffscreenCanvas onde existir.

### B. Layout e posição (persistência)
16. P0 M: salvar e restaurar posições dos nós (Persistent Graph), automática e periódica.
17. P0 S: travar (pin) nós e travar a cena inteira (Tags Routes, Persistent Graph).
18. P0 M: vistas salvas com nome: câmera, filtros, seleção, período (Cortex Graph).
19. P1 M: layouts alternativos: cérebro, esfera, camadas por tipo, linha do tempo (Juggl tem 4 layouts).
20. P1 M: layout por tópicos ("meaning map") em vez de links (Hivemynd, Smart Second Brain).
21. P1 M: layout por hierarquia de pastas, com "galáxias" por pasta (Folders to Graph, Cortex Graph).
22. P1 M: manter pastas juntas mesmo sem links (Cortex Graph "keep folders together").
23. P1 S: arrastar um nó para reposicionar e fixar ao soltar (New 3D Graph).
24. P1 M: desfazer e refazer movimentos de nós.
25. P2 M: layout estável entre sessões usando semente por vault.
26. P2 S: botão "reassentar" para refazer a física do zero.

### C. Seleção, foco e navegação
27. P0 S: grafo local que segue a nota ativa, profundidade 1 a 3 (Cortex Graph, 3D Graph New).
28. P0 M: modo "foco": só vizinhança do nó selecionado, com profundidade configurável (já temos 2; falta ajuste).
29. P0 S: hover sobre nó mostra preview da nota via Page Preview com Ctrl/Cmd (Cortex Graph, Smart Connections Visualizer).
30. P0 S: hover sobre arquivo no explorador acende o nó e hover sobre pasta acende o conjunto (Cortex Graph).
31. P0 S: o nó da nota aberta fica realçado e a câmera o segue (opção).
32. P1 M: seleção múltipla com Shift e laço; ações em lote.
33. P1 M: caminho entre dois nós escolhidos, com a rota animada (usa `findRoute`).
34. P1 S: "ir para" com `/` e busca difusa; voar até o nó (Hivemynd).
35. P1 S: histórico de navegação do grafo (voltar e avançar).
36. P1 S: menu de contexto normal do arquivo ao clicar com o botão direito (Cortex Graph).
37. P1 M: mini-mapa de orientação com a posição da câmera.
38. P1 M: teclado completo: WASD, Q/E para subir e descer (New 3D Graph), atalhos configuráveis.
39. P2 S: cursor que revela nós ocultos por perto (lupa).
40. P2 M: marcadores de posição da câmera com atalho numérico.

### D. Filtros e consultas
41. P0 M: consulta no estilo do grafo nativo: `path:`, `tag:`, `file:`, `line:`, `property:` (3D Graph New, New 3D Graph).
42. P0 M: filtro por propriedade do frontmatter com operadores (=, contém, existe) (Extended Graph).
43. P0 S: filtro por tipo de link: só entrada, só saída, ambos (3D Graph New).
44. P1 M: combinar filtros com E, OU, NÃO e salvar como predefinição.
45. P1 S: filtro por tamanho do texto, número de links, idade, última edição.
46. P1 M: filtro por "notas que um agente tocou" usando o `log.md`.
47. P1 S: incluir ou excluir pastas por padrão glob (Folders to Graph).
48. P1 S: filtro por anexos (imagens, PDF) como nós opcionais.
49. P2 M: grupos de cor por consulta (como "color groups" do grafo nativo), sincronizados com os do Obsidian (Sync Graph Settings).
50. P2 S: contagem em tempo real do que cada filtro remove.

### E. Aparência e estilo
51. P0 M: temas: escuro, claro, alto contraste, daltônico; seguir o tema do Obsidian.
52. P0 S: respeitar `prefers-reduced-motion` e `prefers-contrast` em todos os efeitos.
53. P1 M: formas de nó e imagens como nós (Extended Graph, Juggl).
54. P1 M: estilo por CSS e por YAML (Juggl) com variáveis expostas.
55. P1 M: formas de cérebro alternativas (Hivemynd tem 11) e escolha do usuário.
56. P1 M: mapeamento por frontmatter e por pasta para regiões do cérebro, com relatório de classificação (Brain Atlas).
57. P1 S: tamanho do nó por métrica à escolha: grau, PageRank, tamanho, idade, backlinks.
58. P1 S: cor por qualquer propriedade ou tag, com legenda.
59. P1 M: rótulos inteligentes: limite automático, prioridade por importância, sem sobreposição.
60. P2 M: profundidade de campo e bloom opcionais (Hivemynd).
61. P2 S: fundo: tema, espaço profundo, transparente.
62. P2 M: pacote de temas importável.

### F. Fluxo de informação e animação (nosso diferencial)
63. P0 S: botão e comando de fluxo, já feito; falta salvar o último alvo por vista.
64. P0 M: rota ponderada: preferir arestas de baixo grau e evitar hubs (hoje é menor caminho uniforme).
65. P0 M: fluxo do index para várias páginas novas em sequência, com fila e velocidade.
66. P0 M: pacote com cor por tipo de operação: ingest, query, lint, edição humana, edição de agente.
67. P0 S: legenda e painel de eventos do fluxo (de onde, para onde, quantos saltos).
68. P1 M: replay do `wiki/log.md`: cada linha vira um pacote com o tipo da operação (itens do `improvements.md` ainda abertos).
69. P1 M: controles do replay: pausa, passo, velocidade, arrastar a linha do tempo (Hivemynd, Cortex Graph).
70. P1 M: exportar o replay como vídeo (MediaRecorder sobre `canvas.captureStream`) com data e nome na legenda (Cortex Graph).
71. P1 M: exportar o replay como GIF ou APNG.
72. P1 S: replay por data de modificação ou por qualquer propriedade de data (Cortex Graph).
73. P1 M: rastro persistente das páginas editadas hoje (brilho decai ao longo do dia).
74. P1 S: pulso diferente para criar, editar, renomear e apagar.
75. P2 M: som opcional e reativo ao fluxo (Hivemynd "music reactivity").
76. P2 S: modo apresentação: câmera percorre a rota enquanto o pacote anda.
77. P2 M: pacote em arcos 3D com altura, para links ausentes ficarem acima da massa.

### G. Relações e tipos de link
78. P0 M: relações tipadas por propriedade do frontmatter e campos Dataview (Breadcrumbs, ExcaliBrain).
79. P0 M: direção das arestas: seta e rótulo ao passar; entrada e saída com cores diferentes.
80. P1 M: relações inferidas pai, filho, amigo e irmão (ExcaliBrain) como camada opcional.
81. P1 M: hierarquia por esquemas de nome (Dendron, Johnny.Decimal) (Breadcrumbs).
82. P1 M: ligações por tag, por pasta e por data como arestas opcionais finas.
83. P1 S: ocultar tipos de relação (Extended Graph "remove links by relationship type").
84. P1 M: arestas de "menção sem link" como pontilhadas, com ação de ligar.
85. P2 M: peso da aresta por número de menções e tamanho de contexto.
86. P2 M: caminhos e ciclos: destacar loops de links e cadeias longas.

### H. Descoberta e inteligência (sem depender de nuvem)
87. P0 M: clusters e comunidades coloridos e rotulados (já usamos comunidade para lobos; falta mostrar).
88. P0 M: métricas de rede por nó: grau, PageRank, betweenness, ponte, ilha (InfraNodus, Graph Analysis).
89. P0 M: lacunas de conhecimento: pares de clusters sem ligações com sugestão de ponte (InfraNodus).
90. P1 L: conexões por significado com embeddings locais (WASM, sem chave) e aresta tracejada "sugerida" (Smart Connections, Smart Second Brain).
91. P1 M: sugerir links: mostrar as 5 notas mais prováveis para ligar a partir da nota ativa.
92. P1 M: tópicos por TF-IDF local para nomear clusters (Smart Second Brain "Smart Graph").
93. P1 M: duplicatas e quase-duplicatas por similaridade de título e de conteúdo.
94. P1 S: "notas esquecidas": alto grau e sem edição há muito tempo.
95. P1 S: "notas em ascensão": muitas edições e novos links na última semana.
96. P2 L: exportar os embeddings para uso por agentes (formato aberto).
97. P2 M: integração opcional com Smart Connections e Copilot lendo o índice deles, sem reindexar.

### I. Saúde da wiki (lint)
98. P0 M: lint estendido: órfãos, links quebrados, sem tipo, vazios, pastas vazias, títulos duplicados (Find orphaned files).
99. P0 M: lint de wiki LLM: página sem fonte, página sem backlink do index, afirmação sem citação, data velha.
100. P0 M: contradições: páginas com `contradicts:` ou com resumos conflitantes marcadas.
101. P0 S: lista de problemas clicável, agrupada, com contagem e botão "corrigir" quando seguro.
102. P1 M: correção assistida: criar a nota alvo de um link quebrado, ligar um órfão ao index.
103. P1 M: arquivar órfãos em pasta definida, sem apagar (Find orphaned files).
104. P1 S: ignorar por padrão (`lint-ignore:` no frontmatter) e por pasta.
105. P1 M: relatório diário em nota Markdown: o que mudou, novos órfãos, links quebrados (Hivemynd "daily report").
106. P1 S: indicadores de saúde no rodapé com cores: verde, amarelo, vermelho.
107. P2 M: histórico da saúde ao longo do tempo (gráfico simples em Canvas).
108. P2 M: regras de lint configuráveis por vault em um arquivo.

### J. Agentes e wiki LLM (nosso espaço)
109. P0 M: ler `wiki/log.md` e `wiki/index.md` da `llm-wiki-template` e mostrá-los no cérebro.
110. P0 L: rastros de agente: cada leitura, escrita e busca acende um caminho com a cor do agente (Hivemynd).
111. P0 M: detectar edição por agente (Claude Code, Codex) versus humano por intervalo e por `log.md`.
112. P1 M: painel de monitor: atividade por agente, alertas, páginas mais usadas (Hivemynd).
113. P1 M: reivindicação de nota: avisar quando duas edições chegam à mesma nota (Hivemynd "claims").
114. P1 M: pacotes de contexto: notas mais relevantes para uma tarefa dentro de um orçamento de tokens, copiáveis.
115. P1 M: "Add context" para o agente: selecionar nós e copiar caminhos e resumos.
116. P1 M: prévia de mudanças propostas pelo agente em cima do grafo antes de aplicar (Auto LLM Wiki).
117. P1 M: histórico de edição com diff e restauração das alterações de agente (Gemini Helper).
118. P1 L: servidor MCP somente leitura do grafo (nós, links, clusters, lint) para Claude Code e Codex.
119. P1 M: API pública do plugin (`plugin.api`) para outros plugins consumirem o grafo e dispararem fluxos.
120. P2 M: ponte opcional para ver agentes em outro processo via arquivo de eventos.
121. P2 M: permissões: pastas ocultas e somente leitura aplicadas à API e ao MCP.
122. P2 L: modo multi-monitor com um cérebro dividido (Hivemynd).

### K. Exportação e integração
123. P0 S: exportar PNG da vista atual com fundo e legenda.
124. P0 M: exportar SVG vetorial da vista (Extended Graph).
125. P1 M: exportar vizinhança como Canvas do Obsidian (Breadcrumbs, Link Exploder).
126. P1 M: exportar o grafo como JSON e GraphML para Gephi e outras ferramentas.
127. P1 M: bloco de código ` ```brain ` que renderiza um cérebro pequeno dentro da nota (Juggl, Breadcrumbs).
128. P1 S: incorporar o grafo local no cabeçalho da nota (Graph Banner).
129. P1 M: Bases e Dataview: ler consultas e mostrar o resultado no cérebro.
130. P2 M: exportar HTML interativo autocontido para publicar.
131. P2 S: copiar link para uma vista salva (`obsidian://` com estado).

### L. Usabilidade e primeiro uso
132. P0 S: assistente de primeira abertura: detectar `wiki/`, sugerir a pasta, mostrar a legenda.
133. P0 M: tour de 5 passos opcional e permanentemente dispensável.
134. P0 S: estado vazio útil (já parcial): botão "usar o vault inteiro" e "criar index".
135. P0 S: barra de ferramentas com ícones e dicas, agrupada, que cabe em painéis estreitos.
136. P1 S: central de ajuda: lista de gestos e atalhos no próprio painel (`?`).
137. P1 S: comandos na paleta para tudo, com nomes consistentes.
138. P1 M: configurações com busca e agrupamento em seções (Visual, Fluxo, Filtros, IA, Avançado).
139. P1 S: reiniciar configurações e exportar/importar configuração.
140. P1 S: "dica do dia" opcional sobre recursos pouco usados.
141. P1 M: painel lateral compacto com lista de hubs, órfãos e recentes (Waypoint, Zoottelkeeper).
142. P2 S: mensagens de erro claras com ação sugerida em vez de console.

### M. Acessibilidade, idiomas e mobile
143. P0 M: alternativa de lista navegável por teclado e leitor de tela ao canvas.
144. P0 S: `aria-live` para seleção, fluxo, lint e busca.
145. P0 M: gestos de toque: um dedo gira, dois movem e dão zoom, toque longo seleciona.
146. P0 S: alvo de toque mínimo de 44 px nos controles.
147. P1 M: i18n com pt-BR e en no começo e estrutura para outros.
148. P1 S: modo daltônico com paleta e formas distintas por tipo.
149. P1 M: foco visível e ordem de tabulação corretas.
150. P1 S: teste de contraste automático nos dois temas.

### N. Qualidade, segurança e distribuição
151. P0 M: testes de unidade do grafo do vault (`vaultGraph.ts`) com um `App` simulado.
152. P0 M: testes do motor: rota, lobos, portas dos dendritos, anchors, filtros, replay.
153. P0 S: CI de PR: type-check, build, testes, `eslint-plugin-obsidianmd`.
154. P0 M: teste de integração em Obsidian real via vault de teste e script de captura (screenshot reproduzível).
155. P0 S: `CHANGELOG.md`, versionamento semântico e notas de release.
156. P1 S: política de privacidade e "zero telemetria" no README e no manifest.
157. P1 M: relatório de erro com um clique, sem dados do vault.
158. P1 S: verificação de integridade do release (hash do `main.js` no corpo do release).
159. P1 S: matriz de compatibilidade (Obsidian mínimo, desktop e mobile) testada.
160. P1 M: modo seguro: se o desenho falhar, voltar a Canvas simples e avisar.
161. P2 S: licença e créditos da demo e dos dados (README).
162. P2 M: documentação em site (GitHub Pages) com GIFs e a demo ao vivo.

### O. Comunidade e distribuição
163. P0 S: GIF de 15 s no README e no diretório (fluxo do index e links dos dendritos).
164. P0 S: página de demonstração pública com dados de exemplo (a que já existe, ligada ao plugin).
165. P1 S: vault de exemplo para baixar e testar.
166. P1 S: post nos fóruns e no Discord com o GIF e comparação honesta.
167. P1 S: modelo de issue com versão, sistema e tamanho do vault.
168. P1 S: roteiro público (`ROADMAP.md`) com votação.
169. P2 S: parceria com a `llm-wiki-template`: botão "Instalar o plugin" no README.
170. P2 M: temas e vistas da comunidade em uma galeria.

## 5. Sequência sugerida (antes da revisão)

1. **0.3: ver melhor e abrir rápido**: A1 a A7, B16 a B18, C27 a C31, D41 a D43, K123 a K124, L132 a L135, N151 a N155, O163 a O164.
2. **0.4: entender**: H87 a H89, I98 a I101, G78 a G79, F64 a F68, J109 a J111.
3. **0.5: agentes**: J110, J112 a J119, F69 a F70, K125 a K129.
4. **1.0: consolidar**: M143 a M150, A8 a A15, E51 a E62, H90 a H97.

## 6. Riscos

- **Escopo**: 170 itens são meses de trabalho de uma pessoa. Sem corte, o plugin vira mais um que faz tudo e não faz bem nada.
- **WebGL e WASM**: aumentam o tamanho do `main.js` e o risco de falha em dispositivos móveis. O diretório revisa tamanho e uso de rede.
- **Embeddings locais (item 90)**: peso de modelo e privacidade; só entra com consentimento e sem rede por padrão.
- **MCP e API (118, 119)**: abrem a superfície de segurança; precisam de permissões e de somente leitura por padrão.
- **Concorrentes vivos**: Hivemynd, Cortex Graph e Brain Atlas estão ativos e crescendo; copiam rápido o que for fácil.
- **Evidência fraca**: os READMEs dizem o que o plugin promete, não o que funciona. Nenhum concorrente foi instalado e medido aqui.

---

# 7. Revisão CEO (2026-10-27, modo SCOPE REDUCTION, profundidade só estratégia)

## 7.1 Registro de decisões

| ID | Dono | Contrato e evidência | Atual | Proposto | Status | Aprovação exata e escopo |
|---|---|---|---|---|---|---|
| D1 | revisão | modo da revisão | SCOPE REDUCTION | HOLD, SELECTIVE, EXPANSION | approved | resposta do usuário a D1, só o modo |
| D2 | produto | cunha; evidência: downloads dos 30 em `community-plugin-stats.json` | **Wiki de LLM viva** (grafo vivo, lint de wiki, fluxo do index, rastro de agente) | grafo 3D geral; cérebro bonito | approved | resposta a D2, só a cunha |
| D3 | motor | itens 1, 2, 3, 14, 15 (WebGL2, worker/WASM, octree, instancing, OffscreenCanvas) | **motor leve**: Canvas 2D com grade espacial, LOD e qualidade adaptativa | fazer agora | approved (reaberto) | resposta inicial A, depois instrução direta do usuário "Use motor leve"; vale só para esses 5 itens; vão para TODOS.md com gatilho |
| D4 | IA | itens 90, 96, 97, 118, 119, 120, 121, 122 (embeddings, MCP, API pública, permissões, ponte, multi-monitor) | adiar com gatilho | fazer agora; cortar | approved | resposta a D4 (B), só esses 8 itens; vão para TODOS.md |
| D5 | acabamento | itens 53, 54, 60, 62, 70, 71, 75, 124, 126, 130, 147, 170 (formas e imagens, CSS/YAML, profundidade de campo, temas, vídeo e GIF do replay, som, SVG/GraphML/HTML, i18n extra, galeria) | adiar; manter só PNG (123) e GIF do README (163) | fazer todos; cortar tudo | approved | resposta a D5 (B), só esses 12 itens; vão para TODOS.md |
| D6 | entrega | ordem dos releases | A) provar, diferenciar, expandir | diferenciar primeiro; paridade primeiro | approved | resposta a D6 (A), só a ordem |

`Approval readiness: PASS` (D1 a D6, cada um com a resposta do usuário como referência; nenhum item foi adicionado sem aprovação).

## 7.2 O que o plano é depois da revisão

- **Cunha**: o plugin é a melhor camada visual e de saúde para uma wiki de LLM mantida por agentes (Claude Code, Codex). Não compete em chat com Copilot e Claudian e não compete em grafo 3D de 10 mil nós.
- **Cortes aprovados**: 25 itens (5 + 8 + 12) vão para o backlog com gatilho, não para o lixo. Restam **145 itens**. Isso ainda é muito para uma pessoa; por isso só os releases 0.3 e 0.4 são **compromisso**, o resto é backlog ordenado.
- **Item novo proposto pela revisão e aprovado como parte de D6-A**: B1, benchmark de 5 concorrentes (Smart Connections Visualizer, 3D Graph New, New 3D Graph, Extended Graph, Brain Atlas) em um vault de 1.000 notas, medindo fps, tamanho do `main.js` e tempo de abertura. O plano inteiro repousa em READMEs; sem B1 as comparações são alegações.

## 7.3 Ordem de entrega (D6-A)

**0.3 Provar (compromisso, ~30 itens)**: B1; N151 a N155 (testes do grafo, do motor, CI, teste em Obsidian real, changelog); A5 a A8, A10 (desempenho barato); B16 a B18 (posições, pin, vistas salvas); C27 a C31 (grafo local, foco, preview ao passar, hover do explorador, seguir a nota ativa); D41 a D43 (consulta `path:`/`tag:`/`property:`, tipo de link); K123 (PNG); L132, L134, L135 (primeiro uso, estado vazio, barra); O163, O164 (GIF e demo).

**0.4 Diferenciar (compromisso, ~25 itens)**: J109 a J115 (ler `log.md` e `index.md`, rastro de agente, detecção humano vs agente, monitor, reivindicação, pacote de contexto); I98 a I102 (lint de wiki LLM, contradições, lista clicável, correção assistida); F64 a F69 (rota ponderada, fila de fluxo, cores por operação, legenda, replay do `log.md`, controles); H87 a H89 (clusters, métricas, lacunas); G78, G79 (relações tipadas, direção).

**0.5 Paridade (backlog ordenado, não compromisso)**: B19 a B26, C32 a C40, D44 a D50, E51 a E59, G80 a G86, I103 a I108, K125, K127 a K129, L136 a L142.

**1.0 Consolidar (backlog ordenado)**: M143 a M150, N156 a N162, O165 a O169, A9, A11 a A13.

## 7.4 Não está no escopo (cortado ou adiado, com resposta do usuário)

Adiado para TODOS.md, cada um com gatilho (D3, D4, D5): ver `TODOS.md`. Nada foi cortado de vez.

## 7.5 O que já existe

`src/engine.ts` (física com grade espacial, portas de dendritos, fluxo, replay, Ask, filtros), `src/route.ts` (rota e comunidades), `src/vaultGraph.ts`, `src/view.ts`, 7 testes. O plano reaproveita tudo; nada será reescrito.

## 7.6 Estado de sonho

Hoje: grafo vivo com fluxo do index e lint básico. Em 12 meses: a ferramenta que quem mantém wiki com agentes abre todo dia para ver o que o agente fez, o que está quebrado e o que falta ligar. Este plano move em direção a isso nos releases 0.3 e 0.4.

## 7.7 Revisão por área (estratégia; "dono deve provar" no lugar de contratos)

| Área | Achado | Veredito |
|---|---|---|
| Arquitetura | uma fonte de dados nova (`wiki/log.md`) além de `metadataCache`; sem rede; motor continua único | **WARNING**: `log.md` não tem formato garantido. Dono: engine/parser deve provar leitura tolerante a linhas fora do padrão. |
| Erros e resgate | falhas por capacidade: `log.md` ausente, malformado ou enorme; vault com 0 notas; `ctime` igual para todos (sync); canvas sem contexto 2D | **WARNING**: cada uma precisa mensagem visível e fallback; ver 7.8. |
| Segurança | conteúdo de `log.md` e de notas é texto não confiável; nome de agente e caminhos aparecem na UI; hoje sem rede e sem telemetria | **OK** se ficar sem `innerHTML`, sem eval e sem rede. **WARNING**: rastro de agente não deve executar nem abrir nada a partir do log. |
| Dados e interação | log vazio, log gigante, mesma nota por dois agentes, nota renomeada no meio do replay, duplo clique durante fluxo | **WARNING**: dono deve provar cada caso nos testes. |
| Qualidade de código | `engine.ts` já tem mais de 1.400 linhas e mistura física, desenho, entrada e fluxo | **WARNING**: separar em módulos antes de 0.4 (não em 0.3). |
| Testes | 7 testes cobrem só rota e lobos; nenhum para portas, âncoras, filtros, replay, `vaultGraph` | **CRITICAL GAP**: 0.3 inclui N151 e N152 por isso. |
| Desempenho | 33 fps ambiente, teto de 800 nós; sem medição contra concorrentes | **WARNING**: B1 mede; gatilho de D3 reabre o motor. |
| Observabilidade | só `frameMs` interno | **WARNING**: comando de diagnóstico (A10) em 0.3. |
| Implantação | release por tag; sem canal beta; submissão manual no diretório | **WARNING**: usar BRAT como canal beta antes de cada release grande. |
| Trajetória | reversibilidade 4/5: tudo é local e aditivo; maior dívida é `engine.ts` e a falta de teste em Obsidian real | **OK** com N154. |
| Design/UX | interface com muitos controles novos (barra, filtros, painel) | ver 7.9; **WARNING**: sem teste de uso em painel estreito. |

## 7.8 Registro de falhas (por capacidade)

| Capacidade | Falha | Resgatado? | Teste? | Usuário vê? | Logado? |
|---|---|---|---|---|---|
| Ler `log.md` | arquivo ausente | desconhecido | não | desconhecido | não |
| Ler `log.md` | linha malformada | desconhecido | não | desconhecido | não |
| Replay | `ctime` igual para todas | não | não | silencioso | não |
| Fluxo | index inexistente | sim (maior grau) | não | status na barra | não |
| Desenho | exceção no `draw` | sim (qualidade 0) | não | silencioso, só `console.warn` | parcial |
| Lint | vault sem pasta `wiki` | sim (mensagem) | não | aviso | não |

Linhas com RESCUED=desconhecido, TEST=não ou USER SEES=silencioso são **CRITICAL GAP** até o dono provar o contrário: `log.md` ausente ou malformado, `ctime` igual e exceção no desenho. Dono: parser do log e motor, em 0.3 e 0.4.

## 7.9 Diagrama do fluxo reduzido

```
  vault (metadataCache)   wiki/log.md        eventos de arquivo
         |                     |                    |
         v                     v                    v
   buildVaultGraph       parseLog (0.4)       create/modify/rename
         \                    |                   /
          +-------------> BrainEngine <-----------+
                              |
        +---------+-----------+-----------+---------+
        v         v           v           v         v
      física   filtros     fluxo/replay  lint   rastro de agente (0.4)
                              |
                              v
                     Canvas 2D + painel + barra
```

Diagrama de implantação: `main` verde (testes, build, `eslint-plugin-obsidianmd`) → tag → release → BRAT beta → submissão. Rollback: apontar a tag anterior no BRAT ou reinstalar a versão anterior; tempo: minutos.

## 7.10 Tarefas (estratégia: próxima ação e dono)

- [ ] **T1 (P1)** B1 benchmark de 5 concorrentes em vault de 1.000 notas. Dono: autor. Verificar: tabela fps, `main.js`, abertura.
- [x] **T2 (P1)** N151 e N152 testes do grafo e do motor. Verificar: `npm test` com portas, âncoras, filtros, replay.
- [ ] **T3 (P1)** N154 teste em Obsidian real (vault de teste) com captura reproduzível. Verificar: roteiro manual documentado e screenshot.
- [x] **T4 (P1)** parser de `log.md` tolerante, com testes de ausente, vazio, malformado e grande. Verificar: testes passam e a UI mostra mensagem.
- [x] **T5 (P2)** separar `engine.ts` em módulos antes de 0.4. Verificar: build igual, testes iguais.

## 7.11 Voz externa

Indisponível: Codex respondeu `MODEL_UNUSABLE` para o modelo `gpt-6-astra` (a conta não o usa). Reparo: `gstack-config set plan_review_tier smart` ou `host`. O fallback nativo não foi executado nesta sessão. **Não há cobertura independente nesta revisão**; ela não conta como revisão limpa.

---

# 8. Revisão de engenharia do 0.3 (plan-eng-review, 2026-10-27)

## 8.1 Registro de escopo (Scope Challenge)

`feature answers: D1 (R1) = B harness de navegador versionado + roteiro manual de 10 passos, no lugar de N154 automatizado; structure: D2 (R2) = Smaller (4 módulos puros: physics, ports, filters, logParser; entrada, câmera e desenho ficam no engine); accepted scope: 0.3 do plano 7.3 com N154 trocado por harness + roteiro; pending remedies: R3 script de teste por módulo, R4 CI de PR, R5 import type no vaultGraph, R6 fonte do replay quando ctime colapsa, R7 método e tamanho do benchmark B1.`

Resultado do Scope Challenge: **scope reduced per recommendation** (a automação de Obsidian real saiu do 0.3).

| ID | Dono | Contrato e evidência | Atual | Proposto | Status | Aprovação e escopo |
|---|---|---|---|---|---|---|
| R1 | testes | N154; `engine.ts` roda só com canvas | N154 automatizado | harness + roteiro; adiar | approved | D1, resposta B, só N154 |
| R2 | arquitetura | `engine.ts:295-298` exige canvas e ResizeObserver; 1.578 linhas | classe única | 8 módulos; 4 módulos | approved | D2, resposta Smaller, só a estrutura de arquivos |
| R3 | testes | `package.json:10` empacota só `route.ts` | script fixo | empacotar todo módulo puro | approved (mecânica de N151/N152) | CEO 7.3 N151, N152; sem comportamento novo |
| R4 | CI | `.github/workflows/release.yml:3-6` só roda em tag | sem CI de PR | workflow de PR e de `main` | approved (CEO N153) | plano 7.3, N153 |
| R5 | testes | `src/vaultGraph.ts:1` importa `App, TFile` como valor | valor | `import type` | approved (mecânica de N151) | CEO 7.3 N151 |
| R6 | dados | `wiki/log.md:3,5` formato `## [YYYY-MM-DD] op \| title` | `ctime` | ctime + fallback pelo log quando mais de 80% das páginas têm o mesmo dia | approved | D3, resposta A |
| R7 | benchmark | B1 exige rodar rivais sem API de medição | 5 rivais | 3 rivais (New 3D Graph, Brain Atlas, Cortex Graph), método fixo | approved | D4, resposta B |
| R8 | arquitetura | `src/engine.ts:373-376` zera animações em todo `setGraph`; `src/main.ts:66` | zera | adiar refresh até 5 s enquanto há animação | approved | D5, resposta B |
| R9 | erros | `src/engine.ts:1262` só `console.warn` | silencioso | mensagem única na barra | approved | D6, resposta A |

`Approval readiness: PASS` (R1 a R9: R1, R2, R6 a R9 com resposta do usuário D1 a D6; R3, R4, R5 por aprovação exata do plano 7.3).

## 8.2 Seção 1: Arquitetura

- `[P1] (confidence: 9/10) src/engine.ts:373-376` — `this.signals = []; this.packets = []; this.waves = []; this.replayState = null;` rodam em todo `setGraph`, e `src/main.ts:66` chama `refresh()` em todo `resolved`. A animação central some quando o vault muda. Remédio aprovado: R8 (D5-B, adiar refresh até 5 s).
- `[P1] (confidence: 9/10) src/engine.ts:295-298` — `constructor(private canvas: HTMLCanvasElement, ...)` chama `canvas.getContext("2d")` e `new ResizeObserver`, então a lógica não roda em Node. Remédio aprovado: R2 (D2, 4 módulos puros).

Dispositions: achado 1 aceito (D5-B); achado 2 aceito (D2).

```
  vault ──► vaultGraph.ts (types only, R5) ──► pages, links, ctime
                                   │                  │
                       logParser.ts (R6, fallback) ◄──┘
                                   │
   ┌────────────── BrainEngine (engine.ts, ~1.100 linhas após R2) ───────────────┐
   │  physics.ts (puro)   ports.ts (puro: portas, âncoras, curvas)   filters.ts  │
   │  entrada, câmera, desenho, fluxo, replay permanecem aqui                    │
   └──────────────────────────────┬──────────────────────────────────────────────┘
                                  ▼
                       Canvas 2D + view.ts + main.ts (refresh deferido, R8)
```

Quatro caminhos do dado `log.md → ordem de criação`: **feliz** (39 entradas, datas válidas, uma por dia ou mais); **nulo** (arquivo ausente: cai para `ctime`, mensagem na barra); **vazio** (zero entradas: idem); **erro** (linha malformada ou data inválida: a linha é ignorada, o resto é lido).

## 8.3 Seção 2: Qualidade de código

- `[P3] (confidence: 9/10) src/view.ts:202` — `private field(label: string, _self: () => HTMLSelectElement)`: o parâmetro `_self` nunca é usado. Remover (mecânico, T11).
- Código duplicado: `ePts` (cúbica com portas) e `segPoint` virtual (quadrática) calculam curvas parecidas, mas servem a casos diferentes (aresta real com dendritos vs arco que representa um link ausente); não extrair.

Dispositions: achado 1 aceito (mecânico, T11); duplicação rejeitada com a razão acima.

## 8.4 Seção 3: Revisão de testes

Estrutura atual: `test/route.test.mjs`, 5+2 testes, só `route.ts`. Framework: `node --test` (sem dependência nova). Harness de navegador versionado cobre o desenho.

```
  NOVO / ALTERADO                         TIPO           HAPPY   FALHA                    BORDA
  ports.assign (R2)                       unit (Node)    sim     sem arestas              hub com mais arestas que dendritos
  ports.anchor / ePts                     unit           sim     dendrito ausente         pr abaixo do mínimo (sem dendrito visível)
  filters.visible                         unit           sim     filtro vazio             tipo + pasta + tag combinados
  physics.step (R2)                       unit           sim     0 nós                    nós na mesma posição
  replay (ordem por ctime/log)            unit           sim     ctime colapsado          log ausente
  logParser (R6)                          unit           sim     linha malformada         arquivo grande (33 KB), data duplicada
  vaultGraph com App simulado (R5)        unit           sim     arquivo sem frontmatter  vault vazio, 800+ páginas
  refresh deferido (R8)                   unit + relógio sim     teto de 5 s              várias chamadas seguidas
  falha de desenho (R9)                   unit           sim     contexto que lança       mensagem uma só vez
  Flow rota real / arco virtual           harness        sim     index inexistente        página órfã
  ativar plugin, abrir view, clicar nota  roteiro manual sim     pasta wiki ausente       painel estreito
```

Lacunas: **9** (ports, anchors, filters, physics, replay, logParser, vaultGraph, refresh deferido, falha de desenho). Cada uma entra como tarefa de teste dentro dos remédios já aprovados; nenhum teste novo foi adicionado fora deles.

Teste de "2h da manhã de sexta": o harness de navegador com 220 nós, flow e replay rodando, mais o roteiro de 10 passos. Teste hostil: `log.md` de 10 MB com linhas inválidas; um vault onde todos os arquivos têm o mesmo `ctime`. Teste de caos: vault mudando 20 vezes por segundo durante um replay (R8).

Sem mudança de prompt ou LLM: sem eval.

## 8.5 Seção 4: Desempenho

- `[P3] (confidence: 8/10) src/engine.ts` (`simStep`) — `new Map<number, Cell[]>()` e listas por célula são alocadas a cada passo da física (até ~60 passos por assentamento). Já listado como A9 (pool de objetos) no backlog; sem remédio agora.
- `[P3] (confidence: 8/10) src/engine.ts` (`draw`) — `new Uint8Array(nodes.length)` e três arrays de buckets por quadro. Idem A9.

Dispositions: ambos adiados (A9, 1.0). Caminho mais lento previsto: `draw` com 800 nós e dendritos no nível de qualidade 2 (ordem de 10 a 13 ms em laptop; `[estimated]`, a medir em B1).

## 8.6 Não está no escopo

- N154 automatizado em Obsidian real: trocado por harness + roteiro (D1-B); automatizar fica no TODOS.md se houver demanda.
- Extração de input, câmera, desenho e fluxo em módulos próprios (D2): fica para quando houver motivo (nenhum teste novo precisa deles).
- Benchmark de 3D Graph New e Extended Graph (D4).
- Pool de objetos e menos alocação por quadro (A9).

## 8.7 O que já existe

Harness de navegador em `scratchpad/harness` (a versionar em `scripts/harness/`, T9); `route.ts` e testes; `release.yml`; `findRoute`, `assignLobes`, `communities`. O plano reaproveita todos; o CI de PR e o parser do log são novos.

## 8.8 Registro de falhas

| Capacidade | Falha | Resgatado? | Teste? | Usuário vê? | Logado? |
|---|---|---|---|---|---|
| `setGraph` durante animação | zera pacotes e replay | não (R8 aprovado, não implementado) | não | silencioso | não |
| `draw()` | exceção | parcial (qualidade 0) | não | silencioso (R9 aprovado) | `console.warn` |
| Ordem de criação | `ctime` igual e sem `log.md` | não (R6 aprovado) | não | silencioso | não |
| Parser do log | linha inválida | planejado (T5) | planejado | mensagem planejada | planejado |
| Flow | index inexistente | sim (maior grau) | não | barra | não |

**CRITICAL GAP: 3** (os três primeiros). Cada um tem remédio aprovado e tarefa; permanecem até a implementação e o teste.

## 8.9 Voz externa

Indisponível: o Codex retornou `MODEL_UNUSABLE` para `gpt-6-astra` na revisão CEO desta mesma sessão e a configuração não mudou; não foi repetido. O fallback nativo não foi executado. **Sem cobertura externa**; não conta como revisão limpa. Reparo: `gstack-config set plan_review_tier smart`.

## 8.10 Estratégia de paralelização

| Passo | Módulos tocados | Depende de |
|---|---|---|
| A: extrair physics, ports, filters | `src/` | — |
| A2: testes dos módulos puros | `test/`, `package.json` | A |
| B: CI de PR e script de teste | `.github/`, `package.json` | — |
| C: harness versionado, roteiro, benchmark | `scripts/`, `docs/` | — |
| D: refresh deferido, mensagem de falha, parser do log | `src/` (`engine.ts`, `main.ts`, `view.ts`, `vaultGraph.ts`) | A |

Lane 1: A → A2 → D (todos em `src/`, `engine.ts` compartilhado, sequencial). Lane 2: B (independente). Lane 3: C (independente).
Ordem: iniciar lanes 1, 2 e 3 em paralelo; B e C terminam antes de A2 (B usa `package.json`, que A2 também altera: B primeiro). Conflito: `package.json` entre B e A2.
Resumo: 3 lanes, 2 paralelas e 1 sequencial.

## 8.11 Tarefas de implementação

Synthesized from this review's findings. Each task derives from a specific finding above.

- [x] **T1 (P1, human: ~1d / CC: ~35min)** — engine — extrair `physics.ts`, `ports.ts`, `filters.ts` (D2)
  - Surfaced by: Arquitetura — `src/engine.ts:295-298`
  - Files: `src/engine.ts`, `src/physics.ts`, `src/ports.ts`, `src/filters.ts`
  - Verify: `npm run build` igual; harness renderiza o mesmo (lobos, portas, fluxo).
- [x] **T2 (P1, human: ~1d / CC: ~25min)** — testes — ports, âncoras, filtros, física, replay
  - Surfaced by: Testes — lacunas 1 a 5
  - Files: `test/ports.test.mjs`, `test/filters.test.mjs`, `test/physics.test.mjs`, `test/replay.test.mjs`
  - Verify: `npm test` passa; cada teste falha sem a lógica correspondente.
- [x] **T3 (P1, human: ~2h / CC: ~10min)** — build — script de teste que empacota todo módulo puro (R3)
  - Surfaced by: Escopo — `package.json:10`
  - Files: `package.json`
  - Verify: adicionar um módulo novo sem editar o script e ver o teste rodar.
- [x] **T4 (P1, human: ~3h / CC: ~15min)** — vaultGraph — `import type` e testes com App simulado (R5)
  - Surfaced by: Escopo — `src/vaultGraph.ts:1`
  - Files: `src/vaultGraph.ts`, `test/vaultGraph.test.mjs`
  - Verify: testes com vault vazio, 800+ páginas e arquivo sem frontmatter.
- [x] **T5 (P1, human: ~3h / CC: ~20min)** — dados — parser de `log.md` tolerante + fallback quando `ctime` colapsa (R6)
  - Surfaced by: Escopo — `wiki/log.md:3,5`; D3
  - Files: `src/logParser.ts`, `src/vaultGraph.ts`, `test/logParser.test.mjs`
  - Verify: 39 entradas do `llm-wiki/wiki/log.md` lidas; ausente, vazio e malformado sem exceção.
- [x] **T6 (P1, human: ~3h / CC: ~15min)** — refresh — adiar `refresh()` até 5 s enquanto há animação (R8)
  - Surfaced by: Arquitetura — `src/engine.ts:373-376`
  - Files: `src/main.ts`, `src/view.ts`, `src/engine.ts` (`isBusy()`)
  - Verify: teste com relógio falso: 20 eventos seguidos, um refresh ao fim; replay termina.
- [x] **T7 (P2, human: ~1h / CC: ~10min)** — erros — mensagem única quando o desenho falha (R9)
  - Surfaced by: Registro de falhas — `src/engine.ts:1262`
  - Files: `src/engine.ts`, `src/view.ts`
  - Verify: contexto que lança mostra a mensagem uma só vez.
- [x] **T8 (P1, human: ~2h / CC: ~10min)** — CI — workflow de PR e de `main` com type-check, build, testes (R4, N153)
  - Surfaced by: Escopo — `.github/workflows/release.yml:3-6`
  - Files: `.github/workflows/ci.yml`
  - Verify: PR de teste fica verde; PR com teste quebrado fica vermelho.
- [x] **T9 (P2, human: ~1d / CC: ~30min)** — verificação — versionar o harness e escrever o roteiro de 10 passos (R1)
  - Surfaced by: Escopo — D1
  - Files: `scripts/harness/`, `docs/RELEASE-CHECKLIST.md`
  - Verify: roteiro executado em um vault real antes de 0.3.
- [ ] **T10 (P2, human: ~1d / CC: ~45min)** — benchmark — B1 com New 3D Graph, Brain Atlas e Cortex Graph, método fixo (R7)
  - Surfaced by: Escopo — D4
  - Files: `docs/benchmark.md`
  - Verify: tabela com `[measured: máquina, vault, data]`.
- [x] **T11 (P3, human: ~10min / CC: ~2min)** — view — remover o parâmetro `_self` sem uso
  - Surfaced by: Qualidade — `src/view.ts:202`
  - Files: `src/view.ts`
  - Verify: `npm run build`.

Suposição de esforço: razões padrão (testes ~50x, arquitetura ~5x, features ~30x, scaffolding ~100x).

## 8.12 Unresolved decisions

Nenhuma. Os remédios R1 a R9 têm resposta do usuário ou aprovação exata do plano.

## 8.13 Resumo de conclusão

- Step 0: Scope Challenge: **scope reduced per recommendation**
- Reality rows: 7/7 emitidas; 11 premissas não verificadas
- Architecture Review: 2 issues found
- Code Quality Review: 1 issue found
- Test Review: diagrama produzido, 9 lacunas
- Performance Review: 2 issues found
- NOT in scope: escrito
- What already exists: escrito
- TODOS.md updates: 0 itens propostos
- Failure modes: 3 critical gaps flagged
- Unresolved decisions: 0 nesta revisão
- Outside voice: Codex, unavailable (`MODEL_UNUSABLE`)
- Parallelization: 3 lanes, 2 paralelas / 1 sequencial
- Lake Score: N/A (nenhuma pergunta ofereceu uma opção 10/10)

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 2 (1 anterior de 2026-09, fora deste projeto e obsoleta; 1 de hoje) | ISSUES OPEN | mode: SCOPE_REDUCTION, 3 critical gaps |
| Outside Review | Codex, `plan-review` | Independent 2nd opinion | 1 hoje | unavailable | `MODEL_UNUSABLE` para `gpt-6-astra`; sem cobertura externa |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 (1 anterior de 2026-09, obsoleta, outro projeto) | ISSUES OPEN | 14 issues, 3 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | não executado | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | não executado | — |

**OUTSIDE COVERAGE:** Codex, fase `plan-review`, indisponível (`MODEL_UNUSABLE`); o fallback nativo não foi executado. Cobertura externa ausente não é revisão limpa.

**VERDICT:** CEO e ENG com ressalvas: escopo e engenharia estão decididos (R1 a R9), mas há 3 critical gaps com remédio aprovado e ainda não implementado (animação apagada no refresh, falha de desenho silenciosa, ordem de criação sem fallback). Não implementar nada além das tarefas T1 a T11 sem nova revisão. Design Review não rodou; a interface do 0.3 ganha barra, filtros e painel, então vale rodar `/plan-design-review` antes de construir a interface.

NO UNRESOLVED DECISIONS
