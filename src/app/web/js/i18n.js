// PlayLoop — i18n.js
/* ---------- idioma do app: o texto-fonte é português; inglês e espanhol são aplicados na tela por tradução de frases ---------- */
// [pt, en, es] — as frases mais longas são trocadas primeiro
const I18N_RAW = [
  // tela inicial / topo
  ['Buscar em todos os jogos... (é só começar a digitar)', 'Search all games... (just start typing)', 'Buscar en todos los juegos... (solo empieza a escribir)'],
  ['Buscar em todos os jogos', 'Search all games', 'Buscar en todos los juegos'],
  ['buscar em todos os jogos', 'search all games', 'buscar en todos los juegos'],
  ['Som ligado/desligado', 'Sound on/off', 'Sonido sí/no'],
  ['Layout para TV de tubo (CRT)', 'CRT TV layout', 'Diseño para TV de tubo (CRT)'],
  ['Voltar ao layout de monitor', 'Back to monitor layout', 'Volver al diseño de monitor'],
  ['Nenhum console encontrado — abra a ⚙ configuração', 'No consoles found — open ⚙ settings', 'No se encontró ninguna consola — abre la ⚙ configuración'],
  ['Minimizar', 'Minimize', 'Minimizar'], ['Maximizar', 'Maximize', 'Maximizar'],
  ['Voltar para a tela inicial (Esc)', 'Back to home (Esc)', 'Volver al inicio (Esc)'],
  ['Voltar ao início (Esc)', 'Back to home (Esc)', 'Volver al inicio (Esc)'],
  ['Todos os jogos', 'All games', 'Todos los juegos'],
  ['Carregando todos os jogos', 'Loading all games', 'Cargando todos los juegos'],
  ['Digite o nome de um jogo.', 'Type a game name.', 'Escribe el nombre de un juego.'],
  ['Digite para buscar', 'Type to search', 'Escribe para buscar'],
  ['Nenhum jogo encontrado.', 'No games found.', 'No se encontraron juegos.'],
  ['Nenhum jogo favoritado ainda — use a ⭐ ao lado de um jogo', 'No favorite games yet — use the ⭐ next to a game', 'Aún no hay juegos favoritos — usa la ⭐ junto a un juego'],
  ['Mudar ordenação', 'Change sorting', 'Cambiar orden'],
  ['Nome A→Z', 'Name A→Z', 'Nombre A→Z'], ['Nome Z→A', 'Name Z→A', 'Nombre Z→A'],
  ['Solte em uma categoria', 'Drop on a category', 'Suelta en una categoría'],
  ['Limpar seleção', 'Clear selection', 'Limpiar selección'],
  ['Mover para', 'Move to', 'Mover a'],
  ['Ocultar jogo', 'Hide game', 'Ocultar juego'], ['Mostrar jogo', 'Show game', 'Mostrar juego'],
  ['Remover dos favoritos', 'Remove from favorites', 'Quitar de favoritos'],
  ['Favoritar', 'Favorite', 'Marcar favorito'],
  ['Renomear (F2)', 'Rename (F2)', 'Renombrar (F2)'],
  ['Ocultos', 'Hidden', 'Ocultos'],
  ['Beta / Protótipo', 'Beta / Prototype', 'Beta / Prototipo'], ['Não licenciado', 'Unlicensed', 'Sin licencia'],
  ['sem emulador', 'no emulator', 'sin emulador'],
  // jogos / capa / menus
  ['Abrir a pasta do arquivo', 'Open file location', 'Abrir la carpeta del archivo'],
  ['Desinstalar / excluir', 'Uninstall / delete', 'Desinstalar / eliminar'],
  ['Desinstalar este jogo?', 'Uninstall this game?', '¿Desinstalar este juego?'],
  ['Excluir este jogo do seu PC?', 'Delete this game from your PC?', '¿Eliminar este juego de tu PC?'],
  ['Não foi possível desinstalar', 'Could not uninstall', 'No se pudo desinstalar'],
  ['Desfavoritar este jogo?', 'Remove this game from favorites?', '¿Quitar este juego de favoritos?'],
  ['jogos removidos dos favoritos', 'games removed from favorites', 'juegos quitados de favoritos'],
  ['jogos favoritos', 'favorite games', 'juegos favoritos'],
  ['Trocar capa', 'Change cover', 'Cambiar portada'], ['Trocar fundo do console', 'Change console background', 'Cambiar fondo de la consola'],
  ['Trocar fundo', 'Change background', 'Cambiar fondo'], ['trocar fundo', 'change background', 'cambiar fondo'],
  ['Trocar ícone', 'Change icon', 'Cambiar icono'], ['trocar ícone', 'change icon', 'cambiar icono'],
  ['Trocar título (lombada)', 'Change title (spine)', 'Cambiar título (lomo)'], ['Trocar título', 'Change title', 'Cambiar título'], ['Imagem do título (lombada)', 'Title image (spine)', 'Imagen del título (lomo)'], ['Voltar para o título automático', 'Back to automatic title', 'Volver al título automático'], ['Voltou para o título automático', 'Back to automatic title', 'Se volvió al título automático'], ['Título salvo!', 'Title saved!', '¡Título guardado!'], ['como título', 'as title', 'como título'], ['como capa', 'as cover', 'como portada'],
  ['Alterar fundo', 'Change background', 'Cambiar fondo'], ['Alterar imagem', 'Change image', 'Cambiar imagen'],
  ['Reposicionar imagem', 'Reposition image', 'Reposicionar imagen'], ['Reposicionar capa', 'Reposition cover', 'Reposicionar portada'], ['Reposicionar fundo', 'Reposition background', 'Reposicionar fondo'], ['Posição do fundo salva', 'Background position saved', 'Posición del fondo guardada'], ['Posição da capa salva', 'Cover position saved', 'Posición de la portada guardada'], ['Este jogo ainda não tem fundo', 'This game has no background yet', 'Este juego aún no tiene fondo'], ['Ative "Fundo do jogo" em Configuração → Favoritos', 'Turn on "Game background" in Settings → Favorites', 'Activa "Fondo del juego" en Configuración → Favoritos'],
  ['Escolher imagem de fundo', 'Choose background image', 'Elegir imagen de fondo'],
  ['Mais fundos de console', 'More console backgrounds', 'Más fondos de consola'],
  ['Mais ícones de console', 'More console icons', 'Más iconos de consola'],
  ['Escolher capa', 'Choose cover', 'Elegir portada'],
  ['Nome do jogo para buscar', 'Game name to search', 'Nombre del juego a buscar'],
  ['imagens encontradas — clique para usar como capa', 'images found — click to use as cover', 'imágenes encontradas — haz clic para usarla como portada'],
  ['Nada encontrado. Tente outro nome, ou cole o link de uma imagem', 'Nothing found. Try another name, or paste an image link', 'No se encontró nada. Prueba otro nombre o pega el enlace de una imagen'],
  ['ou cole aqui o link de uma imagem da internet', 'or paste an image link from the internet here', 'o pega aquí el enlace de una imagen de internet'],
  ['Arquivo do computador', 'File from computer', 'Archivo del ordenador'],
  ['Usar link', 'Use link', 'Usar enlace'],
  ['Cole um link começando com http', 'Paste a link starting with http', 'Pega un enlace que empiece con http'],
  ['Voltar para a capa automática', 'Back to automatic cover', 'Volver a la portada automática'],
  ['Voltar para a imagem automática', 'Back to automatic image', 'Volver a la imagen automática'],
  ['Voltar para o fundo automático', 'Back to automatic background', 'Volver al fondo automático'],
  ['Voltou para a capa automática', 'Back to automatic cover', 'Se volvió a la portada automática'],
  ['Voltou para a imagem automática', 'Back to automatic image', 'Se volvió a la imagen automática'],
  ['Voltou para o fundo automático', 'Back to automatic background', 'Se volvió al fondo automático'],
  ['capa escolhida manualmente', 'manually chosen cover', 'portada elegida manualmente'],
  ['Capa salva!', 'Cover saved!', '¡Portada guardada!'], ['Fundo salvo!', 'Background saved!', '¡Fondo guardado!'],
  ['Imagem do card salva!', 'Card image saved!', '¡Imagen de la tarjeta guardada!'],
  ['Posição da imagem salva', 'Image position saved', 'Posición de la imagen guardada'],
  ['Este card ainda não tem imagem', 'This card has no image yet', 'Esta tarjeta aún no tiene imagen'],
  ['Fundo salvo — ative "Fundo do jogo" em Configuração → Favoritos para vê-lo nesta tela', 'Background saved — turn on "Game background" in Settings → Favorites to see it here', 'Fondo guardado — activa "Fondo del juego" en Configuración → Favoritos para verlo aquí'],
  ['Arraste a imagem (mouse ou D-pad) · roda do mouse / LB RB = zoom', 'Drag the image (mouse or D-pad) · mouse wheel / LB RB = zoom', 'Arrastra la imagen (ratón o D-pad) · rueda del ratón / LB RB = zoom'],
  ['Centralizar', 'Center', 'Centrar'], ['Salvar (Enter)', 'Save (Enter)', 'Guardar (Enter)'],
  ['Cancelar (Esc)', 'Cancel (Esc)', 'Cancelar (Esc)'], ['Fechar (Esc)', 'Close (Esc)', 'Cerrar (Esc)'],
  ['Info (I)', 'Info (I)', 'Info (I)'],
  ['Código do jogo', 'Game code', 'Código del juego'],
  ['Bom jogo.', 'Have fun.', 'Buen juego.'], ['Bom jogo', 'Have fun', 'Buen juego'],
  ['Já está abrindo', 'Already opening', 'Ya se está abriendo'], ['Abrindo', 'Opening', 'Abriendo'],
  ['Emulador salvo:', 'Emulator saved:', 'Emulador guardado:'],
  ['Nenhum emulador configurado', 'No emulator set up', 'Ningún emulador configurado'],
  ['ainda não tem emulador. Os mais recomendados (gratuitos) são:', "doesn't have an emulator yet. The most recommended (free) ones are:", 'aún no tiene emulador. Los más recomendados (gratuitos) son:'],
  ['Baixe um deles no site oficial e depois selecione o executável aqui', 'Download one from its official site, then select the executable here', 'Descarga uno desde su sitio oficial y luego selecciona el ejecutable aquí'],
  ['ainda não tem emulador. Quer selecionar o executável do emulador agora? O PlayLoop configura tudo e já abre o jogo', "doesn't have an emulator yet. Select the emulator executable now? PlayLoop sets everything up and opens the game", 'aún no tiene emulador. ¿Seleccionar ahora el ejecutable del emulador? PlayLoop lo configura todo y abre el juego'],
  ['Selecionar emulador', 'Select emulator', 'Seleccionar emulador'], ['Selecionar .exe', 'Select .exe', 'Seleccionar .exe'],
  ['Controle conectado:', 'Controller connected:', 'Mando conectado:'],
  ['Diagnóstico do vídeo', 'Video diagnostics', 'Diagnóstico del vídeo'],
  ['nenhum vídeo conseguiu tocar — ficando só com a capa', 'no video could play — showing the cover only', 'ningún vídeo pudo reproducirse — solo se muestra la portada'],
  ['vídeo removido/privado', 'video removed/private', 'vídeo eliminado/privado'],
  ['dono não permite incorporar', 'owner does not allow embedding', 'el propietario no permite insertarlo'],
  ['erro ao buscar', 'search error', 'error al buscar'],
  ['Renomeado para', 'Renamed to', 'Renombrado a'],
  ['Erro ao salvar', 'Error saving', 'Error al guardar'],
  ['Carregando a lista do repositório', 'Loading repository list', 'Cargando la lista del repositorio'],
  ['Buscar pelo nome (ex.: snes, playstation, arcade)', 'Search by name (e.g. snes, playstation, arcade)', 'Buscar por nombre (ej.: snes, playstation, arcade)'],
  ['Buscando...', 'Searching...', 'Buscando...'], ['Buscando…', 'Searching…', 'Buscando…'],
  ['Jogar', 'Play', 'Jugar'], ['Fechar', 'Close', 'Cerrar'], ['Cancelar', 'Cancel', 'Cancelar'], ['Excluir', 'Delete', 'Eliminar'],
  ['Continuar sem', 'Continue without', 'Continuar sin'], ['Continuar', 'Continue', 'Continuar'], ['Pular', 'Skip', 'Saltar'],
  // configuração
  ['Trocar o modo da grade?', 'Change grid mode?', '¿Cambiar el modo de la cuadrícula?'], ['A organização atual dos cards (posições e tamanhos) será perdida e os Favoritos serão reorganizados.', 'The current card arrangement (positions and sizes) will be lost and Favorites will be rearranged.', 'La organización actual de las tarjetas (posiciones y tamaños) se perderá y Favoritos se reorganizará.'], ['Trocar', 'Change', 'Cambiar'],
  ['Organização dos cards', 'Card layout', 'Organización de las tarjetas'], ['Tamanho da grade', 'Grid size', 'Tamaño de la cuadrícula'], ['Livre', 'Free', 'Libre'], ['Grade fixa', 'Fixed grid', 'Cuadrícula fija'],
  ['tamanho e posição à vontade (mais lenta)', 'any size and position (slower)', 'tamaño y posición libres (más lenta)'], ['cards encaixados na grade (mais leve)', 'cards snapped to the grid (lighter)', 'tarjetas encajadas en la cuadrícula (más ligera)'],
  ['Nova subcategoria', 'New subcategory', 'Nueva subcategoría'], ['Ela fica vazia até você arrastar jogos para ela.', 'It stays empty until you drag games into it.', 'Queda vacía hasta que arrastres juegos a ella.'], ['Criar', 'Create', 'Crear'], ['Nome da subcategoria', 'Subcategory name', 'Nombre de la subcategoría'],
  ['Renomear subcategoria', 'Rename subcategory', 'Renombrar subcategoría'], ['Só o nome muda; os jogos continuam nela.', 'Only the name changes; the games stay in it.', 'Solo cambia el nombre; los juegos siguen en ella.'],
  ['Excluir subcategoria?', 'Delete subcategory?', '¿Eliminar subcategoría?'], ['Subcategoria criada', 'Subcategory created', 'Subcategoría creada'], ['Subcategoria renomeada', 'Subcategory renamed', 'Subcategoría renombrada'], ['Subcategoria excluída', 'Subcategory deleted', 'Subcategoría eliminada'],
  ['Editar ou excluir subcategorias', 'Edit or delete subcategories', 'Editar o eliminar subcategorías'], ['Nenhuma subcategoria', 'No subcategories', 'Ninguna subcategoría'], ['Já existe uma subcategoria com esse nome', 'A subcategory with that name already exists', 'Ya existe una subcategoría con ese nombre'],
  ['Traduzidos', 'Translated', 'Traducidos'], ['Hack / Mod', 'Hack / Mod', 'Hack / Mod'], ['Homebrew / Port', 'Homebrew / Port', 'Homebrew / Port'], ['Ferramentas para jogos', 'Game tools', 'Herramientas para juegos'], ['Outros programas', 'Other programs', 'Otros programas'],
  ['Renomear', 'Rename', 'Renombrar'], ['mover console', 'move console', 'mover consola'], ['som', 'sound', 'sonido'],
  ['Nada para desfazer', 'Nothing to undo', 'Nada que deshacer'], ['Desfeito', 'Undone', 'Deshecho'], ['desfazer', 'undo', 'deshacer'],
  ['Ordenar por nome', 'Sort by name', 'Ordenar por nombre'], ['Ordenados por nome', 'Sorted by name', 'Ordenados por nombre'],
  ['imagem do card', 'card image', 'imagen de la tarjeta'], ['proporção', 'proportions', 'proporción'], ['Arrastar no vazio', 'Drag on empty space', 'Arrastrar en vacío'], ['selecionar vários', 'select many', 'seleccionar varios'], ['mover', 'move', 'mover'],
  ['Alt+arrastar', 'Alt+drag', 'Alt+arrastrar'], ['mover imagem do card', 'move card image', 'mover imagen de la tarjeta'], ['Ctrl+redimensionar', 'Ctrl+resize', 'Ctrl+redimensionar'], ['manter proporção', 'keep proportions', 'mantener proporción'],
  ['Alinhar à grade "opção mais leve"', 'Snap to grid "lighter option"', 'Alinear a la cuadrícula "opción más ligera"'],
  ['Não alinhar à grade "opção mais lenta"', 'Free layout "slower option"', 'No alinear a la cuadrícula "opción más lenta"'],
  ['Alinhar automaticamente', 'Auto-align', 'Alinear automáticamente'], ['Cards alinhados', 'Cards aligned', 'Tarjetas alineadas'],
  ['Aumentar', 'Bigger', 'Agrandar'], ['Diminuir', 'Smaller', 'Reducir'], ['Formato da capa', 'Cover shape', 'Forma de la portada'],
  ['Configuração', 'Settings', 'Configuración'],
  ['Sobre e créditos', 'About & credits', 'Acerca de y créditos'],
  ['Consoles e emuladores', 'Consoles & emulators', 'Consolas y emuladores'],
  ['Capas e vídeo', 'Covers & video', 'Portadas y vídeo'],
  ['Inicialização', 'Startup', 'Inicio'],
  ['Abrir na inicialização do Windows (em segundo plano, perto do relógio)', 'Start with Windows (in the background, near the clock)', 'Abrir al iniciar Windows (en segundo plano, junto al reloj)'],
  ['Refazer configuração inicial (detectar consoles de novo)', 'Redo initial setup (detect consoles again)', 'Rehacer la configuración inicial (detectar consolas de nuevo)'],
  ['Refazer a configuração inicial? Os consoles serão detectados de novo (capas, favoritos e ocultos são mantidos).', 'Redo the initial setup? Consoles will be detected again (covers, favorites and hidden games are kept).', '¿Rehacer la configuración inicial? Las consolas se detectarán de nuevo (se mantienen portadas, favoritos y ocultos).'],
  ['do PlayLoop? (os arquivos não são apagados)', 'from PlayLoop? (files are not deleted)', 'de PlayLoop? (los archivos no se borran)'],
  ['Pasta dos emuladores e jogos', 'Emulators & games folder', 'Carpeta de emuladores y juegos'],
  ['Nenhuma pasta escolhida', 'No folder chosen', 'Ninguna carpeta elegida'],
  ['Escolher pasta', 'Choose folder', 'Elegir carpeta'], ['Procurar...', 'Browse...', 'Examinar...'],
  ['Adicionar console', 'Add console', 'Añadir consola'], ['Adicionar jogos de PC', 'Add PC games', 'Añadir juegos de PC'],
  ['Novo console', 'New console', 'Nueva consola'], ['Jogos de PC', 'PC games', 'Juegos de PC'],
  ['Habilitar', 'Enable', 'Activar'],
  ['Emulador (.exe)', 'Emulator (.exe)', 'Emulador (.exe)'],
  ['Argumentos — {rom} é trocado pelo caminho do jogo', 'Arguments — {rom} is replaced by the game path', 'Argumentos — {rom} se sustituye por la ruta del juego'],
  ['Abrir os jogos em tela cheia', 'Open games in fullscreen', 'Abrir los juegos en pantalla completa'],
  ['Argumento de tela cheia deste emulador (vai antes dos argumentos)', "This emulator's fullscreen argument (goes before the arguments)", 'Argumento de pantalla completa de este emulador (va antes de los argumentos)'],
  ['Pastas com atalhos dos jogos (uma por linha)', 'Folders with game shortcuts (one per line)', 'Carpetas con accesos directos de juegos (una por línea)'],
  ['Pastas de jogos (uma por linha)', 'Game folders (one per line)', 'Carpetas de juegos (una por línea)'],
  ['Extensões dos jogos (separadas por vírgula)', 'Game extensions (comma separated)', 'Extensiones de los juegos (separadas por comas)'],
  ['Jogos de PC — escolha uma ou mais pastas com atalhos (.lnk / .url / .exe) dos jogos instalados. Eles abrem direto, sem emulador.', 'PC games — choose one or more folders with shortcuts (.lnk / .url / .exe) to installed games. They open directly, no emulator.', 'Juegos de PC — elige una o más carpetas con accesos directos (.lnk / .url / .exe) de los juegos instalados. Se abren directamente, sin emulador.'],
  ['✓ encontrado', '✓ found', '✓ encontrado'], ['✗ não encontrado', '✗ not found', '✗ no encontrado'], ['✓ salvo', '✓ saved', '✓ guardado'],
  ['Fundo dos jogos', 'Game background', 'Fondo de los juegos'], ['Estilo das capas', 'Cover style', 'Estilo de portadas'],
  ['caixa girando', 'spinning box', 'caja girando'], ['encarte aberto, mais leve', 'open sleeve, lighter', 'carátula abierta, más ligera'],
  ['gameplay do YouTube', 'YouTube gameplay', 'gameplay de YouTube'], ['tela ou arte do jogo', 'game screenshot or art', 'captura o arte del juego'],
  ['Imagem', 'Image', 'Imagen'], ['Vídeo', 'Video', 'Vídeo'],
  ['Usar o SteamGridDB para capas, fundos e logos', 'Use SteamGridDB for covers, backgrounds and logos', 'Usar SteamGridDB para portadas, fondos y logos'],
  ['Salvar capas no computador (carregam na hora nas próximas vezes)', 'Save covers on this computer (load instantly next time)', 'Guardar portadas en el ordenador (cargan al instante la próxima vez)'],
  ['Limpar cache de capas', 'Clear cover cache', 'Limpiar caché de portadas'], ['Cache de capas limpo', 'Cover cache cleared', 'Caché de portadas limpiada'],
  ['arquivos', 'files', 'archivos'],
  ['Cole aqui a sua chave da API', 'Paste your API key here', 'Pega aquí tu clave de API'],
  ['Cole a chave da API primeiro', 'Paste the API key first', 'Pega primero la clave de API'],
  ['Testar chave', 'Test key', 'Probar clave'], ['Chave válida! ✓', 'Valid key! ✓', '¡Clave válida! ✓'],
  ['Chave inválida ou sem internet', 'Invalid key or no internet', 'Clave no válida o sin internet'],
  ['Salvar chave e prosseguir', 'Save key and continue', 'Guardar clave y continuar'],
  ['é um site gratuito, feito pela comunidade, com milhares de capas, fundos e logos de jogos em alta qualidade. Para o PlayLoop buscar essas imagens, você precisa de uma', 'is a free, community-made site with thousands of high-quality game covers, backgrounds and logos. For PlayLoop to fetch them, you need a', 'es un sitio gratuito, hecho por la comunidad, con miles de portadas, fondos y logos de juegos en alta calidad. Para que PlayLoop busque esas imágenes, necesitas una'],
  ['chave da API', 'API key', 'clave de API'], ['(gratuita)', '(free)', '(gratuita)'],
  ['Entre no site com a sua conta Steam', 'Sign in to the site with your Steam account', 'Entra en el sitio con tu cuenta de Steam'],
  ['e clique em', 'and click', 'y haz clic en'], ['Copie a chave e cole no campo abaixo', 'Copy the key and paste it below', 'Copia la clave y pégala abajo'],
  ['Preferências → API', 'Preferences → API', 'Preferencias → API'], ['Abra', 'Open', 'Abre'],
  ['Capas, fundos e logos (opcional, com a sua chave da API).', 'Covers, backgrounds and logos (optional, with your API key).', 'Portadas, fondos y logos (opcional, con tu clave de API).'],
  ['Grade dos favoritos', 'Favorites grid', 'Cuadrícula de favoritos'], ['Fundo da tela', 'Screen background', 'Fondo de pantalla'],
  ['Fundo do jogo', 'Game background', 'Fondo del juego'], ['Fundo fixo', 'Fixed background', 'Fondo fijo'],
  ['muda ao selecionar um card', 'changes when you select a card', 'cambia al seleccionar una tarjeta'],
  ['uma imagem que você escolhe', 'an image you choose', 'una imagen que tú eliges'],
  ['cards maiores', 'bigger cards', 'tarjetas más grandes'], ['mais jogos por página', 'more games per page', 'más juegos por página'],
  ['Buscar imagem de fundo (ex.: montanhas, synthwave)', 'Search background image (e.g. mountains, synthwave)', 'Buscar imagen de fondo (ej.: montañas, synthwave)'],
  ['Escreva o que você quer e aperte Buscar. Só aparecem imagens grandes (resolução de wallpaper).', 'Type what you want and press Search. Only large images show up (wallpaper resolution).', 'Escribe lo que quieras y pulsa Buscar. Solo aparecen imágenes grandes (resolución de fondo de pantalla).'],
  ['Nada encontrado em alta resolução. Tente outras palavras (em inglês costuma render mais).', 'Nothing found in high resolution. Try other words (English usually works best).', 'No se encontró nada en alta resolución. Prueba otras palabras (en inglés suele dar más resultados).'],
  ['Fundo escolhido — salve a configuração para aplicar', 'Background chosen — save settings to apply', 'Fondo elegido — guarda la configuración para aplicarlo'],
  ['Cada jogo favorito vira um card. Arraste um card para mudar de lugar (até para outra página), arraste a borda direita/de baixo para aumentar (até 4 × 4) ou use o botão direito → Redimensionar.', 'Each favorite game becomes a card. Drag a card to move it (even to another page), drag the right/bottom edge to enlarge it (up to 4 × 4) or use right-click → Resize.', 'Cada juego favorito se convierte en una tarjeta. Arrastra una tarjeta para moverla (incluso a otra página), arrastra el borde derecho/inferior para agrandarla (hasta 4 × 4) o usa clic derecho → Redimensionar.'],
  ['Grade com todos os jogos que você marcou com ⭐. Arraste na tela inicial para mudar a posição deste console.', 'A grid with every game you marked with ⭐. Drag it on the home screen to move this console.', 'Cuadrícula con todos los juegos que marcaste con ⭐. Arrástrala en la pantalla de inicio para mover esta consola.'],
  ['Tema', 'Theme', 'Tema'], ['Azul', 'Blue', 'Azul'], ['Preto', 'Black', 'Negro'], ['Branco', 'White', 'Blanco'],
  ['ideal para telas OLED', 'great for OLED screens', 'ideal para pantallas OLED'], ['claro', 'light', 'claro'], ['padrão', 'default', 'predeterminado'], ['Padrão', 'Default', 'Predeterminado'],
  ['Idioma', 'Language', 'Idioma'], ['Som do vídeo', 'Video sound', 'Sonido del vídeo'], ['Português', 'Portuguese', 'Portugués'], ['Inglês', 'English', 'Inglés'], ['Espanhol', 'Spanish', 'Español'],
  ['Marcas registradas', 'Trademarks', 'Marcas registradas'],
  ['Nintendo, PlayStation, Xbox, Sega, Neo Geo, Steam e demais nomes e logos de consoles são marcas registradas de seus respectivos donos e aparecem apenas para identificar cada plataforma. O PlayLoop não é afiliado a nenhuma delas.', 'Nintendo, PlayStation, Xbox, Sega, Neo Geo, Steam and other console names and logos are trademarks of their respective owners and appear only to identify each platform. PlayLoop is not affiliated with any of them.', 'Nintendo, PlayStation, Xbox, Sega, Neo Geo, Steam y demás nombres y logos de consolas son marcas registradas de sus respectivos dueños y aparecen solo para identificar cada plataforma. PlayLoop no está afiliado a ninguna de ellas.'],
  ['Front-end para os seus emuladores e jogos. Os jogos, capas, logos e vídeos pertencem aos seus respectivos donos; o PlayLoop apenas os exibe a partir das fontes abaixo.', 'A front-end for your emulators and games. Games, covers, logos and videos belong to their respective owners; PlayLoop only displays them from the sources below.', 'Front-end para tus emuladores y juegos. Los juegos, portadas, logos y vídeos pertenecen a sus respectivos dueños; PlayLoop solo los muestra a partir de las fuentes de abajo.'],
  ['Logos, fundos e desenhos de controle dos consoles. Licença CC BY-NC-SA (atribuição, uso não comercial, compartilha igual). As imagens são exibidas sem alteração de conteúdo (apenas redimensionadas/recortadas na tela).', 'Console logos, backgrounds and controller drawings. CC BY-NC-SA license (attribution, non-commercial, share-alike). Images are shown unaltered (only resized/cropped on screen).', 'Logos, fondos y dibujos de mandos de las consolas. Licencia CC BY-NC-SA (atribución, no comercial, compartir igual). Las imágenes se muestran sin alterar su contenido (solo redimensionadas/recortadas en pantalla).'],
  ['Imagens do tema es-theme-carbon (com reserva automática se o site cair)', 'es-theme-carbon images (with automatic fallback if the site goes down)', 'Imágenes del tema es-theme-carbon (con respaldo automático si el sitio cae)'],
  ['Tema "carbon" para EmulationStation', '"carbon" theme for EmulationStation', 'Tema "carbon" para EmulationStation'],
  ['Rookervik — baseado no tema "simple" de Nils Bonenberger', 'Rookervik — based on the "simple" theme by Nils Bonenberger', 'Rookervik — basado en el tema "simple" de Nils Bonenberger'],
  ['Capas, telas e títulos de jogos.', 'Game covers, screenshots and titles.', 'Portadas, capturas y títulos de juegos.'],
  ['Capas de jogos de GameCube, Wii, Wii U, 3DS e DS.', 'GameCube, Wii, Wii U, 3DS and DS game covers.', 'Portadas de juegos de GameCube, Wii, Wii U, 3DS y DS.'],
  ['Capas e fundos de jogos de PC.', 'PC game covers and backgrounds.', 'Portadas y fondos de juegos de PC.'],
  ['Capas encontradas pelas APIs públicas das wikis.', 'Covers found through the wikis’ public APIs.', 'Portadas encontradas mediante las API públicas de las wikis.'],
  ['Vídeos de gameplay exibidos pelo player oficial incorporado.', 'Gameplay videos shown through the official embedded player.', 'Vídeos de gameplay mostrados con el reproductor oficial insertado.'],
  ['Motor da janela do aplicativo.', "The app window's engine.", 'Motor de la ventana de la aplicación.'],
  ['Comunidades de cada wiki', 'Each wiki’s communities', 'Comunidades de cada wiki'],
  ['Projeto libretro / RetroArch e colaboradores', 'libretro / RetroArch project and contributors', 'Proyecto libretro / RetroArch y colaboradores'],
  ['Comunidade SteamGridDB', 'SteamGridDB community', 'Comunidad SteamGridDB'],
  ['Licença SIL Open Font License 1.1.', 'SIL Open Font License 1.1.', 'Licencia SIL Open Font License 1.1.'],
  ['Licença CC BY-NC-SA', 'CC BY-NC-SA license', 'Licencia CC BY-NC-SA'],
  ['Termos do YouTube', 'YouTube Terms', 'Términos de YouTube'], ['Repositório', 'Repository', 'Repositorio'],
  ['Documentação', 'Documentation', 'Documentación'], ['Loja', 'Store', 'Tienda'], ['Site', 'Website', 'Sitio'], ['reserva', 'fallback', 'respaldo'],
  ['Fonte Poppins', 'Poppins font', 'Fuente Poppins'],
  // boas-vindas
  ['Emuladores', 'Emulators', 'Emuladores'], ['Emulador de PS1', 'PS1 emulator', 'Emulador de PS1'],
  ['Uma pasta para cada console. O PlayLoop configura o resto sozinho.', 'One folder per console. PlayLoop sets up the rest on its own.', 'Una carpeta por consola. PlayLoop configura el resto solo.'],
  ['Organize assim e o PlayLoop faz o resto:', 'Organize it like this and PlayLoop does the rest:', 'Organízalo así y PlayLoop hace el resto:'],
  ['ele encontra os consoles, os emuladores e os jogos e configura tudo automaticamente.', 'it finds the consoles, emulators and games and sets everything up automatically.', 'encuentra las consolas, los emuladores y los juegos y lo configura todo automáticamente.'],
  ['Uma pasta principal', 'One main folder', 'Una carpeta principal'], ['é ela que você escolhe abaixo', 'this is the one you choose below', 'es la que eliges abajo'],
  ['uma subpasta por console, com o nome dele', 'one subfolder per console, named after it', 'una subcarpeta por consola, con su nombre'],
  ['emulador (.exe)', 'emulator (.exe)', 'emulador (.exe)'], ['o programa do emulador pode ficar aqui dentro', 'the emulator program can live in here', 'el programa del emulador puede ir aquí dentro'],
  ['os jogos desse console', "that console's games", 'los juegos de esa consola'], ['um console por pasta', 'one console per folder', 'una consola por carpeta'],
  ['Use o nome do console na pasta', "Use the console's name for the folder", 'Usa el nombre de la consola en la carpeta'], ['abreviações conhecidas como', 'well-known abbreviations like', 'abreviaturas conocidas como'], ['também funcionam.', 'also work.', 'también funcionan.'],
  ['são aceitos na maioria dos consoles.', 'are accepted on most consoles.', 'se aceptan en la mayoría de las consolas.'], ['Jogos em', 'Games in', 'Juegos en'],
  ['Faltou algo? Dá para ajustar depois em', 'Missing something? You can adjust it later in', '¿Falta algo? Puedes ajustarlo después en'], ['Configuração → Consoles', 'Settings → Consoles', 'Configuración → Consolas'],
  ['Escolha a pasta onde você guarda os atalhos dos jogos instalados no computador. Se não quiser, é só pular.', 'Choose the folder where you keep shortcuts to games installed on this computer. If you prefer, just skip.', 'Elige la carpeta donde guardas los accesos directos de los juegos instalados. Si no quieres, solo omítelo.'],
  ['Procurando consoles, emuladores e jogos. Isso leva só alguns segundos', 'Looking for consoles, emulators and games. This only takes a few seconds', 'Buscando consolas, emuladores y juegos. Solo tarda unos segundos'],
  ['Onde estão seus emuladores?', 'Where are your emulators?', '¿Dónde están tus emuladores?'],
  ['Escolha a pasta principal onde ficam os emuladores e as ROMs (uma subpasta por console). O PlayLoop encontra tudo sozinho.', 'Choose the main folder with your emulators and ROMs (one subfolder per console). PlayLoop finds everything on its own.', 'Elige la carpeta principal donde están los emuladores y las ROM (una subcarpeta por consola). PlayLoop lo encuentra todo solo.'],
  ['E os seus jogos de PC?', 'What about your PC games?', '¿Y tus juegos de PC?'],
  ['Passo 1 de 3', 'Step 1 of 3', 'Paso 1 de 3'], ['Passo 2 de 3', 'Step 2 of 3', 'Paso 2 de 3'], ['Passo 3 de 3 · opcional', 'Step 3 of 3 · optional', 'Paso 3 de 3 · opcional'],
  // legenda do controle / teclado
  ['console / ↑ topo', 'console / ↑ top', 'consola / ↑ arriba'], ['escolher console', 'choose console', 'elegir consola'],
  ['escolher imagem', 'choose image', 'elegir imagen'], ['escolher tecla', 'choose key', 'elegir tecla'],
  ['campos do card', 'card fields', 'campos de la tarjeta'], ['sair do card', 'leave card', 'salir de la tarjeta'], ['editar card', 'edit card', 'editar tarjeta'],
  ['mover card', 'move card', 'mover tarjeta'], ['mover imagem', 'move image', 'mover imagen'], ['girar capa', 'rotate cover', 'girar portada'],
  ['digitar busca', 'type search', 'escribir búsqueda'], ['modo TV', 'TV mode', 'modo TV'],
  ['configuração', 'settings', 'configuración'], ['maiúsculas', 'caps', 'mayúsculas'],
  ['escolher', 'choose', 'elegir'], ['entrar', 'enter', 'entrar'], ['buscar', 'search', 'buscar'], ['Buscar', 'Search', 'Buscar'],
  ['navegar', 'navigate', 'navegar'], ['jogar', 'play', 'jugar'], ['pular', 'skip', 'saltar'], ['página', 'page', 'página'],
  ['voltar', 'back', 'volver'], ['Voltar', 'Back', 'Volver'], ['fechar', 'close', 'cerrar'], ['cancelar', 'cancel', 'cancelar'],
  ['confirmar', 'confirm', 'confirmar'], ['Sem mais imagens', 'No more images', 'No hay más imágenes'], ['Mais', 'More', 'Más'], ['capas / fundos', 'covers / backgrounds', 'portadas / fondos'], ['🖼 Imagem do card', '🖼 Card image', '🖼 Imagen de la tarjeta'], ['🖼 Imagem do card', '🖼 Card image', '🖼 Imagen de la tarjeta'], ['horizontal', 'landscape', 'horizontal'], ['vertical', 'portrait', 'vertical'], ['Fundos', 'Backgrounds', 'Fondos'], ['Capas', 'Covers', 'Portadas'], ['Nenhuma subcategoria ainda', 'No subcategories yet', 'Aún no hay subcategorías'], ['Para mover jogos: arraste-os ou use o menu do jogo', 'To move games, drag them or use the game menu', 'Para mover juegos, arrástralos o usa el menú del juego'], ['Mover para subcategoria', 'Move to subcategory', 'Mover a subcategoría'], ['Subcategorias', 'Subcategories', 'Subcategorías'], ['Redimensionar lote', 'Resize selection', 'Redimensionar selección'], ['Tamanho (colunas × linhas)', 'Size (columns × rows)', 'Tamaño (columnas × filas)'], ['Redimensionar', 'Resize', 'Redimensionar'], ['Organizar Favoritos', 'Arrange Favorites', 'Organizar Favoritos'], ['Fundo', 'Background', 'Fondo'], ['Card', 'Card', 'Tarjeta'], ['Organização', 'Layout', 'Organización'], ['Marque a Steam para usar a pasta padrão dos atalhos dela (dá para trocar). Para outras lojas ou pastas, use "Outra pasta...". Se não quiser, é só pular.', 'Tick Steam to use its default shortcut folder (you can change it). For other stores or folders, use "Another folder...". Or just skip.', 'Marca Steam para usar su carpeta predeterminada de accesos (puedes cambiarla). Para otras tiendas o carpetas, usa "Otra carpeta...". O simplemente omite.'], ['Loja', 'Store', 'Tienda'], ['Excluir pasta', 'Remove folder', 'Quitar carpeta'], ['+ Adicionar pasta', '+ Add folder', '+ Añadir carpeta'], ['Caminho da pasta', 'Folder path', 'Ruta de la carpeta'], ['(pasta padrão não encontrada)', '(default folder not found)', '(carpeta predeterminada no encontrada)'], ['Pastas com atalhos dos jogos (.lnk / .url / .exe)', 'Game shortcut folders (.lnk / .url / .exe)', 'Carpetas con accesos de juegos (.lnk / .url / .exe)'], ['Pastas de jogos', 'Game folders', 'Carpetas de juegos'], ['Outra pasta...', 'Another folder...', 'Otra carpeta...'], ['Nenhuma outra pasta', 'No other folder', 'Ninguna otra carpeta'], ['(pasta não encontrada neste PC)', '(folder not found on this PC)', '(carpeta no encontrada en este PC)'], ['Marque as lojas que você usa — já deixamos a pasta padrão de cada uma (dá para trocar). Se guardar atalhos em outra pasta, escolha abaixo. Se não quiser, é só pular.', 'Tick the stores you use — each one already has its default folder (you can change it). If you keep shortcuts somewhere else, pick it below. Or just skip.', 'Marca las tiendas que usas — cada una ya tiene su carpeta predeterminada (puedes cambiarla). Si guardas accesos en otra carpeta, elígela abajo. O simplemente omite.'], ['Alinhar à grade', 'Snap to grid', 'Alinear a la cuadrícula'], ['lista', 'list', 'lista'], ['grade', 'grid', 'cuadrícula'], ['grade / lista', 'grid / list', 'cuadrícula / lista'], ['selecionar', 'select', 'seleccionar'], ['soltar', 'drop', 'soltar'],
  ['salvar', 'save', 'guardar'], ['Salvar', 'Save', 'Guardar'], ['abrir', 'open', 'abrir'], ['usar', 'use', 'usar'], ['sair', 'exit', 'salir'],
  ['favoritar', 'favorite', 'favorito'], ['renomear', 'rename', 'renombrar'], ['digitar', 'type', 'escribir'], ['apagar', 'delete', 'borrar'],
  ['espaço', 'space', 'espacio'], ['Espaço', 'Space', 'Espacio'], ['Setas', 'Arrows', 'Flechas'], ['Clique', 'Click', 'Clic'],
  ['campos', 'fields', 'campos'], ['cards', 'cards', 'tarjetas'], ['topo', 'top', 'arriba'], ['editar', 'edit', 'editar'],
  // gerais
  ['Favoritos', 'Favorites', 'Favoritos'], ['Geral', 'General', 'General'], ['Consoles', 'Consoles', 'Consolas'],
  ['jogos', 'games', 'juegos'], ['jogo', 'game', 'juego'], ['Jogos', 'Games', 'Juegos'],
];
let LANG = 'pt';
try { LANG = localStorage.getItem('lang') || 'pt'; } catch (e) {}
const I18N_KEYS = I18N_RAW.map(r => r[0]).sort((a, b) => b.length - a.length);
const I18N_MAP = new Map(I18N_RAW.map(r => [r[0], r]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const I18N_RE = new RegExp('(?<![\\p{L}])(' + I18N_KEYS.map(escRe).join('|') + ')(?![\\p{L}])', 'gu');
function T(s) {
  if (LANG === 'pt' || !s) return s;
  const k = LANG === 'en' ? 1 : 2;
  return String(s).replace(I18N_RE, m => (I18N_MAP.get(m) || [])[k] || m);
}
// texto original (pt) de cada nó/atributo, para poder trocar de idioma de novo
const i18nOrig = new WeakMap(), i18nSet = new WeakMap();
const I18N_SKIP = '.nm, .fgname, .gtitle .gn, #gHead .gname, .gt, textarea, script, style, [data-noi18n]';
function i18nText(n) {
  const p = n.parentElement; if (!p || p.closest(I18N_SKIP)) return;
  if (i18nSet.get(n) !== n.nodeValue) i18nOrig.set(n, n.nodeValue);
  const o = i18nOrig.get(n); if (o == null || !/[a-zà-ú]{2}/i.test(o)) return;
  const v = T(o); if (n.nodeValue !== v) { i18nSet.set(n, v); n.nodeValue = v; } else i18nSet.set(n, v);
}
function i18nAttr(el) {
  ['placeholder', 'title'].forEach(a => {
    if (!el.hasAttribute(a)) return;
    const key = 'i18n_' + a, cur = el.getAttribute(a);
    if (el[key + '_set'] !== cur) el[key] = cur;
    const v = T(el[key]); el[key + '_set'] = v; if (cur !== v) el.setAttribute(a, v);
  });
}
function i18nTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { i18nText(root); return; }
  if (root.nodeType !== 1) return;
  if (root.closest && root.closest(I18N_SKIP)) return;
  i18nAttr(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) i18nText(n); else i18nAttr(n); }
}
const i18nObs = new MutationObserver(ms => {
  if (LANG === 'pt' && !i18nObs.dirty) return;
  ms.forEach(m => {
    if (m.type === 'characterData') i18nText(m.target);
    else if (m.type === 'attributes') i18nAttr(m.target);
    else m.addedNodes.forEach(i18nTree);
  });
});
function setLang(l) {
  LANG = ['pt', 'en', 'es'].includes(l) ? l : 'pt';
  try { localStorage.setItem('lang', LANG); } catch (e) {}
  document.documentElement.lang = LANG === 'en' ? 'en' : LANG === 'es' ? 'es' : 'pt-BR';
  i18nObs.dirty = true;   // depois de sair do pt, o observador continua ativo para restaurar o texto
  i18nTree(document.body);
}
// confirmações nativas também traduzidas
const _confirm = window.confirm.bind(window), _alert = window.alert.bind(window);
window.confirm = m => _confirm(T(m)); window.alert = m => _alert(T(m));
i18nObs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] });
if (LANG !== 'pt') { if (document.body) setLang(LANG); else document.addEventListener('DOMContentLoaded', () => setLang(LANG)); }
