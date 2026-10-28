# TODOS

Itens adiados pela revisão CEO de 2026-10-27 (nenhum foi cortado de vez). Cada um tem gatilho.

## Motor pesado (D3, itens 1, 2, 3, 14, 15)
- **O que:** renderer WebGL2 com fallback, física em worker/WASM, octree, instancing, OffscreenCanvas.
- **Por quê:** vaults grandes (mais de 2.000 notas) com muita CPU; Brain Atlas e New 3D Graph já fazem.
- **Gatilho:** mais de 3 relatos de lentidão, ou fps abaixo de 30 acima de 2.000 nós no benchmark B1.
- **Contexto:** hoje Canvas 2D com grade espacial que acompanha a densidade, neurônios completos só para os maiores na tela, links retos acima de 3.500 e qualidade adaptativa; teto de 800 nós (configurável até 10.000; 10.000 nós desenham em 25 a 33 ms no harness, veja docs/benchmark.md). Decisão do usuário: "Use motor leve".
- **Esforço:** humano XL / CC L. **Prioridade:** P3.

## Superfície de IA (D4, itens 90, 96, 97, 118, 119, 120, 121, 122)
- **O que:** embeddings locais, servidor MCP somente leitura, API pública do plugin, permissões por agente, ponte de eventos, multi-monitor.
- **Por quê:** deixar agentes consultarem o grafo e sugerir links por significado.
- **Gatilho:** pedidos de 3 usuários, ou depois da v1.0.
- **Contexto:** o rastro de agente em 0.4 usa `wiki/log.md` e eventos de arquivo, sem servidor. Qualquer servidor ou modelo precisa de consentimento e de revisão de segurança.
- **Esforço:** humano XL / CC L. **Prioridade:** P3.

## Acabamento (D5, itens 53, 54, 60, 62, 70, 71, 75, 124, 126, 130, 147, 170)
- **O que:** formas e imagens nos nós, estilo por CSS/YAML, profundidade de campo, pacote de temas, vídeo e GIF do replay, som, exportação SVG/GraphML/HTML, i18n além de pt-BR e en, galeria.
- **Por quê:** paridade com Juggl, Extended Graph, Cortex Graph.
- **Gatilho:** v1.0 entregue e pedidos recorrentes.
- **Contexto:** mantidos PNG (123) e GIF do README (163), que servem à divulgação.
- **Esforço:** humano L / CC M. **Prioridade:** P3.
