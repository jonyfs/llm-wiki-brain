/* Page translations. English is the page itself (no-JS fallback); pt, es and fr are below. ?lang=pt|es|fr or the selector; the choice is remembered. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var K = function (o) { return o; };
  var PT = K({
    'skip': 'Ir para o conteúdo', 'a.top': 'Voltar ao topo', 'a.theme': 'Alternar o tema', 'a.menu': 'Menu', 'a.primary': 'Principal', 'a.lang': 'Idioma',
    'nav.cta': 'Baixar o plugin', 'nav.demo': 'Demonstração', 'nav.features': 'Recursos', 'nav.neuron': 'Modelo do neurônio', 'nav.search': 'Busca', 'nav.use': 'Atalhos', 'nav.start': 'Instalar', 'nav.faq': 'Perguntas',
    'hero.badge': 'Plugin do Obsidian · Sem rede · MIT',
    'hero.title': 'Veja sua wiki como um <span class="grad">cérebro 3D</span> vivo',
    'hero.sub': '<strong>Cada página é um neurônio, cada link uma sinapse.</strong> O LLM Wiki Brain transforma seu cofre do Obsidian num cérebro que você gira, busca, filtra e reproduz, e mostra como a informação flui do índice até todas as páginas.',
    'hero.cta1': 'Instalar o plugin', 'hero.cta2': 'Testar a demonstração', 'hero.cta3': 'Ver no GitHub',
    'hero.m0': 'Obsidian 1.5 ou mais novo', 'hero.m1': 'Desktop e celular', 'hero.m2': 'Sem telemetria, sem dependências', 'hero.m3': 'EN · PT · ES · FR',
    'hero.alt': 'A vista do plugin: um cérebro 3D de páginas ligadas, com chips de tipo e barra de ferramentas no alto, busca com um chip de filtro ativo e lista de resultados, uma página selecionada com entradas e saídas, legenda e linha de status',
    'hero.shotcap': 'A vista do próprio plugin num cofre de demonstração: uma busca com filtro ativo, uma página selecionada com entradas e saídas, uma onda de Flow em movimento, a legenda e a linha de status.',
    'demo.eyebrow': 'Experimente', 'demo.title': 'O plugin de verdade, rodando no navegador',
    'demo.sub': 'Esta é a vista e o motor do próprio plugin sobre uma wiki de LLM inventada. Aperte <strong>Flow</strong> para enviar informação do índice a todas as páginas, arraste para girar, clique num neurônio, digite na busca.',
    'demo.hint': 'Dica: <span class="kbd">Alt</span>+arrastar seleciona uma área, <span class="kbd">?</span> lista os atalhos. As notas da demonstração são inventadas; as suas nunca saem da sua máquina.',
    'demo.loading': 'Carregando a demonstração…',
    'feat.eyebrow': 'O que faz', 'feat.title': 'Um retrato vivo da sua wiki', 'feat.sub': 'Feito para wikis de LLM (fontes, entidades, conceitos, sínteses, um índice e um log) e útil em qualquer cofre.',
    'f1.t': 'Um cérebro feito das suas notas', 'f1.p': 'Páginas ligadas dividem uma região do cérebro. Uma nuvem suave mostra o volume e os neurônios o preenchem, de dez páginas a dez mil.',
    'f2.t': 'Flow: a informação chega a todas as páginas', 'f2.p': 'Uma onda sai do índice e atravessa os links salto a salto, com anéis, cometas e links brilhando, e um contador de páginas alcançadas.',
    'f3.t': 'Reveja a wiki crescendo', 'f3.p': 'Veja as páginas voltarem na ordem de criação, com o que o log registrou em cada dia, um controle deslizante, velocidade e repetição.',
    'f4.t': 'Busca e Pergunta', 'f4.p': 'Palavras, <code>tag:</code>, <code>links:&gt;3</code>, <code>edited:&lt;7d</code>, <code>is:orphan</code>, regex. Aperte Enter para perguntar: a resposta se espalha pelos links.',
    'f5.t': 'Filtros e visões salvas', 'f5.p': 'Tipo, pasta, tag, links, datas, direção, uma consulta de filtro e o log. Os filtros ativos são chips que você remove com um clique.',
    'f6.t': 'Selecionar, isolar, exportar', 'f6.p': 'Selecione um grupo por clique, área ou lobo; isole, copie como links, transforme num Canvas do Obsidian ou salve a vista em PNG.',
    'f7.t': 'Aponte o que está quebrado', 'f7.p': 'Órfãs, links quebrados e páginas sem tipo ganham um anel e uma lista clicável, para a wiki ficar saudável.',
    'f8.t': 'Rápido e privado', 'f8.p': 'Canvas 2D, sem rede, sem telemetria. Cerca de 25 ms por quadro com 10.000 páginas no nosso teste sintético; neurônios completos só onde são grandes o bastante para ver.',
    'f9.t': 'Quatro idiomas', 'f9.p': 'Inglês, português (Brasil), espanhol e francês, seguindo o idioma do Obsidian.',
    'how.eyebrow': 'Como funciona', 'how.title': 'De um cofre a um cérebro', 'how.sub': 'Tudo é derivado do que o Obsidian já sabe.',
    'h1.t': 'Seu cofre', 'h1.s': 'Notas, <code>[[links]]</code>, tags, frontmatter, <code>wiki/log.md</code>',
    'h2.t': 'Um grafo dirigido', 'h2.s': 'Um link sai da página que o contém e chega à página para a qual aponta',
    'h3.t': 'Um modelo de neurônio', 'h3.s': 'As páginas somam entradas, disparam num limiar, aprendem e esmaecem',
    'h4.t': 'O cérebro', 'h4.s': 'Lobos, dendritos, axônios e uma onda que você acompanha',
    'n.eyebrow': 'A analogia', 'n.title': 'O modelo do neurônio', 'n.sub': 'A imagem segue a biologia, então o que você vê diz algo sobre a sua wiki.', 'n.th1': 'Biologia', 'n.th2': 'No plugin',
    'r1a': 'Dendritos', 'r1b': 'Entradas: as páginas que apontam para esta',
    'r2a': 'Axônio', 'r2b': 'Saídas: os links que esta página contém',
    'r3a': 'Força sináptica', 'r3b': 'Quantas vezes um link se repete; links usados juntos ficam mais fortes e esmaecem quando ociosos',
    'r4a': 'Limiar de disparo', 'r4b': 'Uma página dispara tudo ou nada quando a carga recebida chega a um limiar que cresce com suas entradas; o arco em volta mostra o quanto falta',
    'r5a': 'Inibição', 'r5b': 'Um link <code>contradicts:</code> no frontmatter reduz a carga do alvo; seus pulsos são vermelhos',
    'r6a': 'Mielina', 'r6b': 'Links entre páginas movimentadas conduzem mais rápido, em saltos',
    'r7a': 'Atenção', 'r7b': 'Páginas parecidas mas sem link acendem por um instante, com pesos',
    's.eyebrow': 'Sintaxe da busca', 's.title': 'Pergunte à sua wiki', 's.sub': 'Uma caixa de busca filtra, destaca e pergunta. Aperte Enter para perguntar: a resposta se espalha pelos links.', 's.th1': 'Sintaxe', 's.th2': 'Significado',
    's1': 'Todas as palavras devem aparecer no nome, caminho, títulos ou tags', 's2': 'Qualquer um dos lados pode casar', 's9': 'Excluir um termo', 's3': 'Número de links', 's4': 'Idade ou data',
    's5': 'Propriedade do frontmatter: igual, contém, existe', 's6': 'Estado da página: orphan, broken, untyped, index, log, hub', 's7': 'Aponta para uma página / é apontada por uma página', 's8': 'Expressão regular',
    'u.eyebrow': 'Use', 'u.title': 'Comandos e atalhos', 'c1.t': 'Comandos', 'c2.t': 'Teclado e mouse',
    'cm1': 'Abrir a visão do cérebro', 'cm2': 'Perguntar ao cérebro', 'cm3': 'Enviar informação do índice a todas as páginas', 'cm4': 'Refazer o crescimento da wiki na ordem de criação', 'cm5': 'Executar a camada de lint da wiki', 'cm6': 'Focar a caixa de busca', 'cm7': 'Limpar filtros e busca', 'cm8': 'Salvar a vista como imagem', 'cm9': 'Criar um canvas a partir da seleção',
    'k1': '<span class="kbd">Arrastar</span> girar · <span class="kbd">Shift</span>+arrastar mover · roda: zoom',
    'k2': '<span class="kbd">Clique</span> selecionar · <span class="kbd">Cmd/Ctrl</span>+clique somar · <span class="kbd">Alt</span>+arrastar selecionar uma área',
    'k3': '<span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> frente, topo, lado · <span class="kbd">0</span> reiniciar',
    'k4': '<span class="kbd">n</span> / <span class="kbd">p</span> próximo ou anterior hub · <span class="kbd">Alt</span>+setas pular para um vizinho',
    'k5': '<span class="kbd">Enter</span> abrir · <span class="kbd">Cmd/Ctrl</span>+<span class="kbd">Enter</span> abrir ao lado · <span class="kbd">Esc</span> limpar',
    'k6': '<span class="kbd">?</span> lista todos os atalhos · clique direito abre um menu',
    'i.eyebrow': 'Instalar', 'i.title': 'Obtenha o LLM Wiki Brain', 'i.sub': 'O plugin ainda não está no diretório da comunidade do Obsidian. Instale com o BRAT ou à mão.',
    'i1': '<strong>BRAT (beta):</strong> no Obsidian, instale o plugin BRAT, rode <em>BRAT: Add a beta plugin</em> e informe <code>jonyfs/llm-wiki-brain</code>.',
    'i2': '<strong>À mão:</strong> baixe <code>main.js</code>, <code>manifest.json</code> e <code>styles.css</code> da <a href="https://github.com/jonyfs/llm-wiki-brain/releases/latest">última release</a> para <code>&lt;cofre&gt;/.obsidian/plugins/llm-wiki-brain/</code>.',
    'i3': 'Ative o <em>LLM Wiki Brain</em> em Configurações → Plugins da comunidade e clique no ícone do cérebro na faixa lateral.',
    'app.copy': 'Copiar',
    'faq.title': 'Perguntas',
    'q1': 'Envia minhas notas para algum lugar?', 'a1': 'Não. O plugin não faz requisições de rede nem tem telemetria. A demonstração desta página usa páginas inventadas.',
    'q2': 'Funciona em qualquer cofre?', 'a2': 'Sim. Por padrão lê a pasta <code>wiki</code>; deixe essa configuração vazia para usar o cofre inteiro. O tipo de uma página vem do <code>type</code> do frontmatter e depois dos nomes de pasta.',
    'q3': 'Quantas páginas ele mostra?', 'a3': 'De algumas a 10.000 (o limite é uma configuração; o padrão é 800). Um quadro leva cerca de 25 ms com 10.000 páginas no nosso teste sintético; seu resultado depende da sua máquina.',
    'q4': 'Funciona no celular?', 'a4': 'Não é só para desktop e aceita toque (arrastar, pinça), mas foi testado principalmente no desktop.',
    'q5': 'Quais idiomas fala?', 'a5': 'Inglês, português (Brasil), espanhol e francês. Segue o idioma do Obsidian, e você pode escolher outro nas configurações.',
    'q6': 'Tem relação com o LLM Wiki Template?', 'a6': 'Sim, mesmo autor. O <a href="https://jonyfs.github.io/llm-wiki-template/">LLM Wiki Template</a> é um ponto de partida para uma wiki mantida por um assistente de IA; este plugin mostra essa wiki como um cérebro. Este site reaproveita o design system do template.',
    'fin.t': 'Veja sua wiki pensar', 'fin.p': 'Instale o plugin e aperte Flow.', 'fin.b1': 'Baixar a última release',
    'foot.l': 'LLM Wiki Brain · licença MIT', 'foot.change': 'Histórico de versões', 'foot.road': 'Roteiro'
  });
  var ES = K({
    'skip': 'Saltar al contenido', 'a.top': 'Volver arriba', 'a.theme': 'Cambiar el tema', 'a.menu': 'Menú', 'a.primary': 'Principal', 'a.lang': 'Idioma',
    'nav.cta': 'Obtener el plugin', 'nav.demo': 'Demostración', 'nav.features': 'Funciones', 'nav.neuron': 'Modelo de la neurona', 'nav.search': 'Búsqueda', 'nav.use': 'Atajos', 'nav.start': 'Instalar', 'nav.faq': 'Preguntas',
    'hero.badge': 'Plugin de Obsidian · Sin red · MIT',
    'hero.title': 'Ve tu wiki como un <span class="grad">cerebro 3D</span> vivo',
    'hero.sub': '<strong>Cada página es una neurona, cada enlace una sinapsis.</strong> LLM Wiki Brain convierte tu bóveda de Obsidian en un cerebro que puedes girar, buscar, filtrar y reproducir, y muestra cómo fluye la información del índice a todas las páginas.',
    'hero.cta1': 'Instalar el plugin', 'hero.cta2': 'Probar la demostración', 'hero.cta3': 'Ver en GitHub',
    'hero.m0': 'Obsidian 1.5 o más reciente', 'hero.m1': 'Escritorio y móvil', 'hero.m2': 'Sin telemetría, sin dependencias', 'hero.m3': 'EN · PT · ES · FR',
    'hero.alt': 'La vista del plugin: un cerebro 3D de páginas enlazadas, con chips de tipo y barra de herramientas arriba, búsqueda con un chip de filtro activo y lista de resultados, una página seleccionada con sus entradas y salidas, leyenda y línea de estado',
    'hero.shotcap': 'La vista del propio plugin en una bóveda de demostración: una búsqueda con filtro activo, una página seleccionada con sus entradas y salidas, una onda de Flow en movimiento, la leyenda y la línea de estado.',
    'demo.eyebrow': 'Pruébalo', 'demo.title': 'El plugin de verdad, en tu navegador',
    'demo.sub': 'Esta es la vista y el motor del propio plugin sobre una wiki de LLM inventada. Pulsa <strong>Flow</strong> para enviar información del índice a todas las páginas, arrastra para girar, haz clic en una neurona, escribe en la búsqueda.',
    'demo.hint': 'Consejo: <span class="kbd">Alt</span>+arrastrar selecciona un área, <span class="kbd">?</span> lista los atajos. Las notas de la demostración son inventadas; las tuyas nunca salen de tu máquina.',
    'demo.loading': 'Cargando la demostración…',
    'feat.eyebrow': 'Qué hace', 'feat.title': 'Un retrato vivo de tu wiki', 'feat.sub': 'Hecho para wikis de LLM (fuentes, entidades, conceptos, síntesis, un índice y un registro) y útil en cualquier bóveda.',
    'f1.t': 'Un cerebro hecho de tus notas', 'f1.p': 'Las páginas enlazadas comparten una región del cerebro. Una nube suave muestra su volumen y las neuronas lo llenan, de diez páginas a diez mil.',
    'f2.t': 'Flow: la información llega a todas las páginas', 'f2.p': 'Una onda sale del índice y cruza los enlaces salto a salto, con anillos, cometas y enlaces que brillan, y un contador de páginas alcanzadas.',
    'f3.t': 'Revive el crecimiento de la wiki', 'f3.p': 'Mira las páginas volver en orden de creación, con lo que el registro anotó cada día, un deslizador, velocidad y repetición.',
    'f4.t': 'Búsqueda y Pregunta', 'f4.p': 'Palabras, <code>tag:</code>, <code>links:&gt;3</code>, <code>edited:&lt;7d</code>, <code>is:orphan</code>, regex. Pulsa Enter para preguntar: la respuesta se extiende por los enlaces.',
    'f5.t': 'Filtros y vistas guardadas', 'f5.p': 'Tipo, carpeta, etiqueta, enlaces, fechas, dirección, una consulta de filtro y el registro. Los filtros activos son chips que quitas con un clic.',
    'f6.t': 'Seleccionar, aislar, exportar', 'f6.p': 'Selecciona un grupo por clic, área o lóbulo; aíslalo, cópialo como enlaces, conviértelo en un Canvas de Obsidian o guarda la vista como PNG.',
    'f7.t': 'Señala lo que está roto', 'f7.p': 'Las huérfanas, los enlaces rotos y las páginas sin tipo reciben un anillo y una lista clicable, para que la wiki siga sana.',
    'f8.t': 'Rápido y privado', 'f8.p': 'Canvas 2D, sin red, sin telemetría. Unos 25 ms por fotograma con 10.000 páginas en nuestra prueba sintética; neuronas completas solo donde son lo bastante grandes para verse.',
    'f9.t': 'Cuatro idiomas', 'f9.p': 'Inglés, portugués (Brasil), español y francés, según el idioma de Obsidian.',
    'how.eyebrow': 'Cómo funciona', 'how.title': 'De una bóveda a un cerebro', 'how.sub': 'Todo se deriva de lo que Obsidian ya sabe.',
    'h1.t': 'Tu bóveda', 'h1.s': 'Notas, <code>[[enlaces]]</code>, etiquetas, frontmatter, <code>wiki/log.md</code>',
    'h2.t': 'Un grafo dirigido', 'h2.s': 'Un enlace sale de la página que lo contiene y llega a la página a la que apunta',
    'h3.t': 'Un modelo de neurona', 'h3.s': 'Las páginas suman entradas, disparan en un umbral, aprenden y se desvanecen',
    'h4.t': 'El cerebro', 'h4.s': 'Lóbulos, dendritas, axones y una onda que puedes ver',
    'n.eyebrow': 'La analogía', 'n.title': 'El modelo de la neurona', 'n.sub': 'La imagen sigue la biología, así que lo que ves dice algo de tu wiki.', 'n.th1': 'Biología', 'n.th2': 'En el plugin',
    'r1a': 'Dendritas', 'r1b': 'Entradas: las páginas que enlazan a esta',
    'r2a': 'Axón', 'r2b': 'Salidas: los enlaces que contiene esta página',
    'r3a': 'Fuerza sináptica', 'r3b': 'Cuántas veces se repite un enlace; los enlaces usados juntos se fortalecen y se desvanecen en reposo',
    'r4a': 'Umbral de disparo', 'r4b': 'Una página dispara todo o nada cuando la carga recibida alcanza un umbral que crece con sus entradas; el arco alrededor muestra cuánto falta',
    'r5a': 'Inhibición', 'r5b': 'Un enlace <code>contradicts:</code> en el frontmatter reduce la carga del destino; sus pulsos son rojos',
    'r6a': 'Mielina', 'r6b': 'Los enlaces entre páginas activas conducen más rápido, a saltos',
    'r7a': 'Atención', 'r7b': 'Las páginas parecidas pero sin enlace se iluminan un instante, con pesos',
    's.eyebrow': 'Sintaxis de búsqueda', 's.title': 'Pregunta a tu wiki', 's.sub': 'Un cuadro de búsqueda filtra, resalta y pregunta. Pulsa Enter para preguntar: la respuesta se extiende por los enlaces.', 's.th1': 'Sintaxis', 's.th2': 'Significado',
    's1': 'Todas las palabras deben aparecer en el nombre, la ruta, los títulos o las etiquetas', 's2': 'Puede coincidir cualquiera de los lados', 's9': 'Excluir un término', 's3': 'Número de enlaces', 's4': 'Edad o fecha',
    's5': 'Propiedad del frontmatter: igual, contiene, existe', 's6': 'Estado de la página: orphan, broken, untyped, index, log, hub', 's7': 'Enlaza a una página / es enlazada desde una página', 's8': 'Expresión regular',
    'u.eyebrow': 'Úsalo', 'u.title': 'Comandos y atajos', 'c1.t': 'Comandos', 'c2.t': 'Teclado y ratón',
    'cm1': 'Abrir la vista del cerebro', 'cm2': 'Preguntar al cerebro', 'cm3': 'Enviar información del índice a todas las páginas', 'cm4': 'Repetir el crecimiento de la wiki en orden de creación', 'cm5': 'Ejecutar la capa de lint de la wiki', 'cm6': 'Enfocar el cuadro de búsqueda', 'cm7': 'Limpiar filtros y búsqueda', 'cm8': 'Guardar la vista como imagen', 'cm9': 'Crear un canvas desde la selección',
    'k1': '<span class="kbd">Arrastrar</span> girar · <span class="kbd">Shift</span>+arrastrar mover · rueda: zoom',
    'k2': '<span class="kbd">Clic</span> seleccionar · <span class="kbd">Cmd/Ctrl</span>+clic añadir · <span class="kbd">Alt</span>+arrastrar seleccionar un área',
    'k3': '<span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> frontal, superior, lateral · <span class="kbd">0</span> reiniciar',
    'k4': '<span class="kbd">n</span> / <span class="kbd">p</span> siguiente o anterior hub · <span class="kbd">Alt</span>+flechas saltar a un vecino',
    'k5': '<span class="kbd">Enter</span> abrir · <span class="kbd">Cmd/Ctrl</span>+<span class="kbd">Enter</span> abrir al lado · <span class="kbd">Esc</span> limpiar',
    'k6': '<span class="kbd">?</span> lista todos los atajos · clic derecho abre un menú',
    'i.eyebrow': 'Instalar', 'i.title': 'Consigue LLM Wiki Brain', 'i.sub': 'El plugin aún no está en el directorio de la comunidad de Obsidian. Instálalo con BRAT o a mano.',
    'i1': '<strong>BRAT (beta):</strong> en Obsidian, instala el plugin BRAT, ejecuta <em>BRAT: Add a beta plugin</em> e introduce <code>jonyfs/llm-wiki-brain</code>.',
    'i2': '<strong>A mano:</strong> descarga <code>main.js</code>, <code>manifest.json</code> y <code>styles.css</code> de la <a href="https://github.com/jonyfs/llm-wiki-brain/releases/latest">última release</a> en <code>&lt;bóveda&gt;/.obsidian/plugins/llm-wiki-brain/</code>.',
    'i3': 'Activa <em>LLM Wiki Brain</em> en Ajustes → Plugins de la comunidad y haz clic en el icono del cerebro de la barra lateral.',
    'app.copy': 'Copiar',
    'faq.title': 'Preguntas',
    'q1': '¿Envía mis notas a algún sitio?', 'a1': 'No. El plugin no hace peticiones de red ni tiene telemetría. La demostración de esta página usa páginas inventadas.',
    'q2': '¿Funciona en cualquier bóveda?', 'a2': 'Sí. Por defecto lee la carpeta <code>wiki</code>; deja ese ajuste vacío para usar toda la bóveda. El tipo de una página viene del <code>type</code> del frontmatter y luego de los nombres de carpeta.',
    'q3': '¿Cuántas páginas puede mostrar?', 'a3': 'De unas pocas a 10.000 (el límite es un ajuste; el valor por defecto es 800). Un fotograma tarda unos 25 ms con 10.000 páginas en nuestra prueba sintética; tu resultado depende de tu máquina.',
    'q4': '¿Funciona en el móvil?', 'a4': 'No es solo de escritorio y admite el tacto (arrastrar, pellizcar), pero se ha probado sobre todo en escritorio.',
    'q5': '¿Qué idiomas habla?', 'a5': 'Inglés, portugués (Brasil), español y francés. Sigue el idioma de Obsidian y puedes elegir otro en los ajustes.',
    'q6': '¿Tiene relación con LLM Wiki Template?', 'a6': 'Sí, mismo autor. <a href="https://jonyfs.github.io/llm-wiki-template/">LLM Wiki Template</a> es un punto de partida para una wiki que mantiene un asistente de IA; este plugin muestra esa wiki como un cerebro. Este sitio reutiliza el sistema de diseño de la plantilla.',
    'fin.t': 'Mira a tu wiki pensar', 'fin.p': 'Instala el plugin y pulsa Flow.', 'fin.b1': 'Descargar la última release',
    'foot.l': 'LLM Wiki Brain · licencia MIT', 'foot.change': 'Historial de versiones', 'foot.road': 'Hoja de ruta'
  });
  var FR = K({
    'skip': 'Aller au contenu', 'a.top': 'Retour en haut', 'a.theme': 'Changer de thème', 'a.menu': 'Menu', 'a.primary': 'Principal', 'a.lang': 'Langue',
    'nav.cta': 'Obtenir le plugin', 'nav.demo': 'Démo', 'nav.features': 'Fonctions', 'nav.neuron': 'Modèle du neurone', 'nav.search': 'Recherche', 'nav.use': 'Raccourcis', 'nav.start': 'Installer', 'nav.faq': 'Questions',
    'hero.badge': 'Plugin Obsidian · Sans réseau · MIT',
    'hero.title': 'Voyez votre wiki comme un <span class="grad">cerveau 3D</span> vivant',
    'hero.sub': '<strong>Chaque page est un neurone, chaque lien une synapse.</strong> LLM Wiki Brain transforme votre coffre Obsidian en un cerveau que vous faites tourner, cherchez, filtrez et rejouez, et montre comment l\'information circule de l\'index vers toutes les pages.',
    'hero.cta1': 'Installer le plugin', 'hero.cta2': 'Essayer la démo', 'hero.cta3': 'Voir sur GitHub',
    'hero.m0': 'Obsidian 1.5 ou plus récent', 'hero.m1': 'Ordinateur et mobile', 'hero.m2': 'Sans télémétrie, sans dépendances', 'hero.m3': 'EN · PT · ES · FR',
    'hero.alt': 'La vue du plugin : un cerveau 3D de pages liées, avec des puces de type et une barre d\'outils en haut, une recherche avec une puce de filtre active et une liste de résultats, une page sélectionnée avec ses entrées et sorties, une légende et une ligne d\'état',
    'hero.shotcap': 'La vue du plugin lui-même sur un coffre de démonstration : une recherche avec un filtre actif, une page sélectionnée avec ses entrées et sorties, une onde de Flow en mouvement, la légende et la ligne d\'état.',
    'demo.eyebrow': 'Essayez', 'demo.title': 'Le vrai plugin, dans votre navigateur',
    'demo.sub': 'Voici la vue et le moteur du plugin lui-même sur un wiki de LLM inventé. Appuyez sur <strong>Flow</strong> pour envoyer l\'information de l\'index à toutes les pages, faites glisser pour tourner, cliquez sur un neurone, tapez dans la recherche.',
    'demo.hint': 'Astuce : <span class="kbd">Alt</span>+glisser sélectionne une zone, <span class="kbd">?</span> liste les raccourcis. Les notes de la démo sont inventées ; les vôtres ne quittent jamais votre machine.',
    'demo.loading': 'Chargement de la démo…',
    'feat.eyebrow': 'Ce qu\'il fait', 'feat.title': 'Un portrait vivant de votre wiki', 'feat.sub': 'Conçu pour les wikis de LLM (sources, entités, concepts, synthèses, un index et un journal) et utile sur n\'importe quel coffre.',
    'f1.t': 'Un cerveau fait de vos notes', 'f1.p': 'Les pages liées partagent une région du cerveau. Un nuage doux montre son volume et les neurones le remplissent, de dix pages à dix mille.',
    'f2.t': 'Flow : l\'information atteint toutes les pages', 'f2.p': 'Une onde part de l\'index et traverse les liens saut après saut, avec des anneaux, des comètes et des liens qui brillent, et un compteur de pages atteintes.',
    'f3.t': 'Rejouez la croissance du wiki', 'f3.p': 'Regardez les pages revenir dans l\'ordre de création, avec ce que le journal a noté chaque jour, un curseur, la vitesse et la boucle.',
    'f4.t': 'Recherche et Question', 'f4.p': 'Mots, <code>tag:</code>, <code>links:&gt;3</code>, <code>edited:&lt;7d</code>, <code>is:orphan</code>, regex. Appuyez sur Entrée pour demander : la réponse se propage le long des liens.',
    'f5.t': 'Filtres et vues enregistrées', 'f5.p': 'Type, dossier, tag, liens, dates, sens, une requête de filtre et le journal. Les filtres actifs sont des puces que vous retirez d\'un clic.',
    'f6.t': 'Sélectionner, isoler, exporter', 'f6.p': 'Sélectionnez un groupe par clic, zone ou lobe ; isolez-le, copiez-le en liens, faites-en un Canvas Obsidian ou enregistrez la vue en PNG.',
    'f7.t': 'Repérez ce qui est cassé', 'f7.p': 'Les orphelines, les liens cassés et les pages sans type reçoivent un anneau et une liste cliquable, pour garder le wiki en bonne santé.',
    'f8.t': 'Rapide et privé', 'f8.p': 'Canvas 2D, sans réseau, sans télémétrie. Environ 25 ms par image à 10 000 pages dans notre test synthétique ; des neurones complets seulement là où ils sont assez grands pour être vus.',
    'f9.t': 'Quatre langues', 'f9.p': 'Anglais, portugais (Brésil), espagnol et français, selon la langue d\'Obsidian.',
    'how.eyebrow': 'Comment ça marche', 'how.title': 'D\'un coffre à un cerveau', 'how.sub': 'Tout est dérivé de ce qu\'Obsidian sait déjà.',
    'h1.t': 'Votre coffre', 'h1.s': 'Notes, <code>[[liens]]</code>, tags, frontmatter, <code>wiki/log.md</code>',
    'h2.t': 'Un graphe orienté', 'h2.s': 'Un lien part de la page qui le contient et arrive sur la page qu\'il désigne',
    'h3.t': 'Un modèle de neurone', 'h3.s': 'Les pages additionnent les entrées, se déclenchent à un seuil, apprennent et s\'estompent',
    'h4.t': 'Le cerveau', 'h4.s': 'Lobes, dendrites, axones et une onde que vous pouvez suivre',
    'n.eyebrow': 'L\'analogie', 'n.title': 'Le modèle du neurone', 'n.sub': 'L\'image suit la biologie, donc ce que vous voyez dit quelque chose de votre wiki.', 'n.th1': 'Biologie', 'n.th2': 'Dans le plugin',
    'r1a': 'Dendrites', 'r1b': 'Entrées : les pages qui pointent vers celle-ci',
    'r2a': 'Axone', 'r2b': 'Sorties : les liens que cette page contient',
    'r3a': 'Force synaptique', 'r3b': 'Combien de fois un lien se répète ; les liens utilisés ensemble se renforcent et s\'estompent au repos',
    'r4a': 'Seuil de déclenchement', 'r4b': 'Une page se déclenche en tout ou rien quand la charge reçue atteint un seuil qui croît avec ses entrées ; l\'arc autour montre ce qu\'il reste',
    'r5a': 'Inhibition', 'r5b': 'Un lien <code>contradicts:</code> dans le frontmatter diminue la charge de la cible ; ses impulsions sont rouges',
    'r6a': 'Myéline', 'r6b': 'Les liens entre pages actives conduisent plus vite, par sauts',
    'r7a': 'Attention', 'r7b': 'Les pages proches mais non liées s\'allument un instant, avec des poids',
    's.eyebrow': 'Syntaxe de recherche', 's.title': 'Interrogez votre wiki', 's.sub': 'Une seule boîte filtre, surligne et interroge. Appuyez sur Entrée pour demander : la réponse se propage le long des liens.', 's.th1': 'Syntaxe', 's.th2': 'Signification',
    's1': 'Chaque mot doit apparaître dans le nom, le chemin, les titres ou les tags', 's2': 'L\'un ou l\'autre côté peut correspondre', 's9': 'Exclure un terme', 's3': 'Nombre de liens', 's4': 'Âge ou date',
    's5': 'Propriété du frontmatter : égal, contient, existe', 's6': 'État de la page : orphan, broken, untyped, index, log, hub', 's7': 'Pointe vers une page / est pointée par une page', 's8': 'Expression régulière',
    'u.eyebrow': 'Utilisez-le', 'u.title': 'Commandes et raccourcis', 'c1.t': 'Commandes', 'c2.t': 'Clavier et souris',
    'cm1': 'Ouvrir la vue du cerveau', 'cm2': 'Interroger le cerveau', 'cm3': 'Envoyer l\'information de l\'index à toutes les pages', 'cm4': 'Rejouer la croissance du wiki dans l\'ordre de création', 'cm5': 'Lancer la couche de lint du wiki', 'cm6': 'Placer le curseur dans la recherche', 'cm7': 'Effacer les filtres et la recherche', 'cm8': 'Enregistrer la vue comme image', 'cm9': 'Créer un canvas depuis la sélection',
    'k1': '<span class="kbd">Glisser</span> tourner · <span class="kbd">Maj</span>+glisser déplacer · molette : zoom',
    'k2': '<span class="kbd">Clic</span> sélectionner · <span class="kbd">Cmd/Ctrl</span>+clic ajouter · <span class="kbd">Alt</span>+glisser sélectionner une zone',
    'k3': '<span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span> face, dessus, côté · <span class="kbd">0</span> réinitialiser',
    'k4': '<span class="kbd">n</span> / <span class="kbd">p</span> hub suivant ou précédent · <span class="kbd">Alt</span>+flèches passer à un voisin',
    'k5': '<span class="kbd">Entrée</span> ouvrir · <span class="kbd">Cmd/Ctrl</span>+<span class="kbd">Entrée</span> ouvrir à côté · <span class="kbd">Échap</span> effacer',
    'k6': '<span class="kbd">?</span> liste tous les raccourcis · clic droit ouvre un menu',
    'i.eyebrow': 'Installer', 'i.title': 'Obtenez LLM Wiki Brain', 'i.sub': 'Le plugin n\'est pas encore dans le répertoire de la communauté Obsidian. Installez-le avec BRAT ou à la main.',
    'i1': '<strong>BRAT (bêta) :</strong> dans Obsidian, installez le plugin BRAT, lancez <em>BRAT: Add a beta plugin</em> et saisissez <code>jonyfs/llm-wiki-brain</code>.',
    'i2': '<strong>À la main :</strong> téléchargez <code>main.js</code>, <code>manifest.json</code> et <code>styles.css</code> depuis la <a href="https://github.com/jonyfs/llm-wiki-brain/releases/latest">dernière release</a> dans <code>&lt;coffre&gt;/.obsidian/plugins/llm-wiki-brain/</code>.',
    'i3': 'Activez <em>LLM Wiki Brain</em> dans Réglages → Plugins de la communauté, puis cliquez sur l\'icône du cerveau dans le ruban.',
    'app.copy': 'Copier',
    'faq.title': 'Questions',
    'q1': 'Envoie-t-il mes notes quelque part ?', 'a1': 'Non. Le plugin ne fait aucune requête réseau et n\'a pas de télémétrie. La démo de cette page utilise des pages inventées.',
    'q2': 'Fonctionne-t-il sur n\'importe quel coffre ?', 'a2': 'Oui. Par défaut il lit le dossier <code>wiki</code> ; videz ce réglage pour utiliser tout le coffre. Le type d\'une page vient du <code>type</code> du frontmatter, puis des noms de dossier.',
    'q3': 'Combien de pages peut-il afficher ?', 'a3': 'De quelques-unes à 10 000 (la limite est un réglage ; la valeur par défaut est 800). Une image prend environ 25 ms à 10 000 pages dans notre test synthétique ; votre résultat dépend de votre machine.',
    'q4': 'Fonctionne-t-il sur mobile ?', 'a4': 'Il n\'est pas réservé au bureau et gère le tactile (glisser, pincer), mais il a surtout été testé sur ordinateur.',
    'q5': 'Quelles langues parle-t-il ?', 'a5': 'Anglais, portugais (Brésil), espagnol et français. Il suit la langue d\'Obsidian, et vous pouvez en choisir une autre dans les réglages.',
    'q6': 'Est-il lié au LLM Wiki Template ?', 'a6': 'Oui, même auteur. <a href="https://jonyfs.github.io/llm-wiki-template/">LLM Wiki Template</a> est un point de départ pour un wiki qu\'un assistant IA entretient ; ce plugin montre ce wiki comme un cerveau. Ce site reprend le système de design du modèle.',
    'fin.t': 'Regardez votre wiki penser', 'fin.p': 'Installez le plugin et appuyez sur Flow.', 'fin.b1': 'Télécharger la dernière release',
    'foot.l': 'LLM Wiki Brain · licence MIT', 'foot.change': 'Historique des versions', 'foot.road': 'Feuille de route'
  });
  var DICT = { pt: PT, es: ES, fr: FR };
  var UI = {
    en: { copied: 'Copied', failed: 'Failed', ver: 'Latest release: {v}', stars: '{n} stars' },
    pt: { copied: 'Copiado', failed: 'Falhou', ver: 'Última release: {v}', stars: '{n} estrelas' },
    es: { copied: 'Copiado', failed: 'Error', ver: 'Última release: {v}', stars: '{n} estrellas' },
    fr: { copied: 'Copié', failed: 'Échec', ver: 'Dernière release : {v}', stars: '{n} étoiles' }
  };
  var lang = 'en';
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var nodes = [].slice.call(d.querySelectorAll('[data-i18n]'));
  var attrNodes = [].slice.call(d.querySelectorAll('[data-i18n-attr]'));
  nodes.forEach(function (el) { el.setAttribute('data-en', el.innerHTML); });
  attrNodes.forEach(function (el) {
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) { var a = pair.split(':')[0]; el.setAttribute('data-en-' + a, el.getAttribute(a) || ''); });
  });
  function tr(key, l) { return l === 'en' ? null : (DICT[l] && DICT[l][key]) || null; }
  function apply(l) {
    lang = DICT[l] ? l : 'en';
    root.setAttribute('lang', lang);
    nodes.forEach(function (el) { var t = tr(el.getAttribute('data-i18n'), lang); el.innerHTML = t !== null ? t : el.getAttribute('data-en'); });
    attrNodes.forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'), t = tr(p[1], lang);
        el.setAttribute(p[0], t !== null ? t : el.getAttribute('data-en-' + p[0]));
      });
    });
    var sel = d.getElementById('langSelect'); if (sel) sel.value = lang;
    d.dispatchEvent(new Event('llmw:lang'));
    window.dispatchEvent(new Event('llmw:lang'));
  }
  window.llmwT = function (k, v) {
    var s = (UI[lang] && UI[lang][k]) || UI.en[k] || k;
    if (v) Object.keys(v).forEach(function (n) { s = s.replace('{' + n + '}', v[n]); });
    return s;
  };
  var q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
  var start = q && (q === 'en' || DICT[q]) ? q : store.get('lang') || ((navigator.language || 'en').slice(0, 2));
  apply(start === 'en' || DICT[start] ? start : 'en');
  var sel = d.getElementById('langSelect');
  if (sel) sel.addEventListener('change', function () { store.set('lang', sel.value); apply(sel.value); });
  window.llmwDict = { en: null, pt: PT, es: ES, fr: FR };
})();
