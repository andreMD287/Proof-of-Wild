/**
 * Textos compartidos por todo el sitio: marca, menú, pie, selector de idioma, estados de carga y error, y etiquetas
 * de catálogo. `es` es la fuente: tiene todas las claves; `en` y `pt` (Brasil) las traducen y el compilador avisa si
 * falta o sobra alguna. Las claves empiezan por «comun.».
 *
 * No se traducen: Proof of Wild, Stellar, Stellar Expert, Soroban, USDC, XLM, Freighter, testnet, los códigos de
 * caso (POW_001) ni los nombres propios.
 */
const es = {
  // ── Metadatos del sitio ──
  "comun.meta.descripcion":
    "Apadrina a un animal rescatado y sigue cada paso de su recuperación. Todo queda registrado en Stellar y lo puedes verificar.",

  // ── Marca ──
  "comun.logo.aria": "Proof of Wild, ir al inicio",
  "comun.demoTestnet": "Demo en testnet",

  // ── Selector de idioma ──
  "comun.idioma.grupo": "Idioma",
  "comun.idioma.cambiar": "Ver esta página en {idioma}",

  // ── Menú ──
  "comun.nav.aria": "Principal",
  "comun.nav.inicio": "Inicio",
  "comun.nav.comoFunciona": "Cómo funciona",
  "comun.nav.casos": "Casos",
  "comun.nav.voluntariados": "Voluntariados",
  "comun.nav.soyOng": "Soy ONG",
  "comun.nav.ingresar": "Ingresar",
  "comun.nav.crearCuenta": "Crear cuenta",
  "comun.nav.cerrarSesion": "Cerrar sesión",
  "comun.nav.abrirMenu": "Abrir el menú",
  "comun.nav.cerrarMenu": "Cerrar el menú",
  "comun.nav.miPerfil": "Mi perfil",
  "comun.nav.miPortal": "Mi portal",
  "comun.nav.administrador": "Administrador",

  // ── Pie de página ──
  "comun.pie.demo": "Demo con datos ficticios. No se usa dinero real.",
  "comun.pie.pruebaTitulo": "Qué prueba la red",
  "comun.pie.pruebaTexto":
    "Stellar demuestra que hubo un pago, a quién y por cuánto, y que una factura no se modificó después de registrarla. No demuestra que la factura sea auténtica ni que el animal se haya atendido bien: eso lo revisa una persona.",
  "comun.pie.contacto": "Contacto",

  // ── Componentes de interfaz ──
  "comun.ui.porcentajeRecaudado": "Porcentaje recaudado",
  "comun.ui.abreOtraPestana": "(abre en otra pestaña)",

  // ── Estados ──
  "comun.cargando.pagina": "Cargando la página…",
  "comun.cargando.caso": "Cargando el caso…",
  "comun.error.titulo": "No pudimos cargar esta página.",
  "comun.error.texto": "Puede ser la conexión o la red de pruebas. Vuelve a intentarlo en unos segundos.",
  "comun.error.reintentar": "Reintentar",
  "comun.error.conexion": "No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  "comun.irAlInicio": "Ir al inicio",
  "comun.noEncontrado.titulo": "Esta ruta no está en el mapa",
  "comun.noEncontrado.texto":
    "La página que buscas no existe o el enlace está incompleto. Revisa el código del caso o vuelve al inicio.",
  "comun.noEncontrado.verCasos": "Ver casos",

  // ── Etiquetas de catálogo ──
  "comun.categoria.medicamentos": "Medicamentos",
  "comun.categoria.atencion_veterinaria": "Atención veterinaria",
  "comun.categoria.alimentacion": "Alimentación",
  "comun.categoria.rehabilitacion": "Rehabilitación y recintos",
  "comun.categoria.traslado_liberacion": "Traslado y liberación",
  "comun.validacion.presentado.long": "Presentado por la ONG",
  "comun.validacion.presentado.short": "Presentado",
  "comun.validacion.revisado.long": "Revisado por un profesional",
  "comun.validacion.revisado.short": "Revisado",
  "comun.validacion.verificado_independiente.long": "Verificado de forma independiente",
  "comun.validacion.verificado_independiente.short": "Verificado",
  "comun.etapa.completada": "Completada",
  "comun.etapa.en_curso": "En curso",
  "comun.etapa.pendiente": "Pendiente",
  "comun.desenlace.liberado": "Liberado",
  "comun.desenlace.en_reserva": "En reserva",
  "comun.desenlace.reubicado": "Reubicado",
  "comun.desenlace.fallecido": "Fallecido",
};

export const comun = {
  es,
  en: {
    "comun.meta.descripcion":
      "Sponsor a rescued animal and follow every step of its recovery. Everything is recorded on Stellar, and you can verify it.",

    "comun.logo.aria": "Proof of Wild, go to home",
    "comun.demoTestnet": "Testnet demo",

    "comun.idioma.grupo": "Language",
    "comun.idioma.cambiar": "View this page in {idioma}",

    "comun.nav.aria": "Main",
    "comun.nav.inicio": "Home",
    "comun.nav.comoFunciona": "How it works",
    "comun.nav.casos": "Cases",
    "comun.nav.voluntariados": "Volunteering",
    "comun.nav.soyOng": "I'm an NGO",
    "comun.nav.ingresar": "Sign in",
    "comun.nav.crearCuenta": "Create account",
    "comun.nav.cerrarSesion": "Sign out",
    "comun.nav.abrirMenu": "Open menu",
    "comun.nav.cerrarMenu": "Close menu",
    "comun.nav.miPerfil": "My profile",
    "comun.nav.miPortal": "My portal",
    "comun.nav.administrador": "Administrator",

    "comun.pie.demo": "Demo with fictional data. No real money is used.",
    "comun.pie.pruebaTitulo": "What the network proves",
    "comun.pie.pruebaTexto":
      "Stellar proves that a payment happened, to whom and for how much, and that an invoice wasn't changed after it was recorded. It doesn't prove the invoice is authentic or that the animal was cared for well: a person reviews that.",
    "comun.pie.contacto": "Contact",

    "comun.ui.porcentajeRecaudado": "Percentage raised",
    "comun.ui.abreOtraPestana": "(opens in a new tab)",

    "comun.cargando.pagina": "Loading the page…",
    "comun.cargando.caso": "Loading the case…",
    "comun.error.titulo": "We couldn't load this page.",
    "comun.error.texto": "It may be the connection or the test network. Try again in a few seconds.",
    "comun.error.reintentar": "Try again",
    "comun.error.conexion": "We couldn't reach the server. Check your connection and try again.",
    "comun.irAlInicio": "Go to home",
    "comun.noEncontrado.titulo": "This route isn't on the map",
    "comun.noEncontrado.texto":
      "The page you're looking for doesn't exist or the link is incomplete. Check the case code or go back home.",
    "comun.noEncontrado.verCasos": "See cases",

    "comun.categoria.medicamentos": "Medicines",
    "comun.categoria.atencion_veterinaria": "Veterinary care",
    "comun.categoria.alimentacion": "Food",
    "comun.categoria.rehabilitacion": "Rehabilitation and enclosures",
    "comun.categoria.traslado_liberacion": "Transport and release",
    "comun.validacion.presentado.long": "Submitted by the NGO",
    "comun.validacion.presentado.short": "Submitted",
    "comun.validacion.revisado.long": "Reviewed by a professional",
    "comun.validacion.revisado.short": "Reviewed",
    "comun.validacion.verificado_independiente.long": "Independently verified",
    "comun.validacion.verificado_independiente.short": "Verified",
    "comun.etapa.completada": "Completed",
    "comun.etapa.en_curso": "In progress",
    "comun.etapa.pendiente": "Pending",
    "comun.desenlace.liberado": "Released",
    "comun.desenlace.en_reserva": "In sanctuary",
    "comun.desenlace.reubicado": "Relocated",
    "comun.desenlace.fallecido": "Deceased",
  } satisfies Record<keyof typeof es, string>,
  pt: {
    "comun.meta.descripcion":
      "Apadrinhe um animal resgatado e acompanhe cada passo da sua recuperação. Tudo fica registrado na Stellar e você pode verificar.",

    "comun.logo.aria": "Proof of Wild, ir para o início",
    "comun.demoTestnet": "Demo na testnet",

    "comun.idioma.grupo": "Idioma",
    "comun.idioma.cambiar": "Ver esta página em {idioma}",

    "comun.nav.aria": "Principal",
    "comun.nav.inicio": "Início",
    "comun.nav.comoFunciona": "Como funciona",
    "comun.nav.casos": "Casos",
    "comun.nav.voluntariados": "Voluntariado",
    "comun.nav.soyOng": "Sou ONG",
    "comun.nav.ingresar": "Entrar",
    "comun.nav.crearCuenta": "Criar conta",
    "comun.nav.cerrarSesion": "Sair",
    "comun.nav.abrirMenu": "Abrir o menu",
    "comun.nav.cerrarMenu": "Fechar o menu",
    "comun.nav.miPerfil": "Meu perfil",
    "comun.nav.miPortal": "Meu portal",
    "comun.nav.administrador": "Administrador",

    "comun.pie.demo": "Demo com dados fictícios. Nenhum dinheiro real é usado.",
    "comun.pie.pruebaTitulo": "O que a rede prova",
    "comun.pie.pruebaTexto":
      "A Stellar prova que houve um pagamento, para quem e de quanto, e que uma nota fiscal não foi alterada depois de registrada. Não prova que a nota seja autêntica nem que o animal tenha sido bem cuidado: isso é revisado por uma pessoa.",
    "comun.pie.contacto": "Contato",

    "comun.ui.porcentajeRecaudado": "Porcentagem arrecadada",
    "comun.ui.abreOtraPestana": "(abre em outra aba)",

    "comun.cargando.pagina": "Carregando a página…",
    "comun.cargando.caso": "Carregando o caso…",
    "comun.error.titulo": "Não conseguimos carregar esta página.",
    "comun.error.texto": "Pode ser a conexão ou a rede de testes. Tente novamente em alguns segundos.",
    "comun.error.reintentar": "Tentar novamente",
    "comun.error.conexion": "Não conseguimos falar com o servidor. Verifique sua conexão e tente novamente.",
    "comun.irAlInicio": "Ir para o início",
    "comun.noEncontrado.titulo": "Esta rota não está no mapa",
    "comun.noEncontrado.texto":
      "A página que você procura não existe ou o link está incompleto. Confira o código do caso ou volte ao início.",
    "comun.noEncontrado.verCasos": "Ver casos",

    "comun.categoria.medicamentos": "Medicamentos",
    "comun.categoria.atencion_veterinaria": "Atendimento veterinário",
    "comun.categoria.alimentacion": "Alimentação",
    "comun.categoria.rehabilitacion": "Reabilitação e recintos",
    "comun.categoria.traslado_liberacion": "Transporte e soltura",
    "comun.validacion.presentado.long": "Apresentado pela ONG",
    "comun.validacion.presentado.short": "Apresentado",
    "comun.validacion.revisado.long": "Revisado por um profissional",
    "comun.validacion.revisado.short": "Revisado",
    "comun.validacion.verificado_independiente.long": "Verificado de forma independente",
    "comun.validacion.verificado_independiente.short": "Verificado",
    "comun.etapa.completada": "Concluída",
    "comun.etapa.en_curso": "Em andamento",
    "comun.etapa.pendiente": "Pendente",
    "comun.desenlace.liberado": "De volta à natureza",
    "comun.desenlace.en_reserva": "Em santuário",
    "comun.desenlace.reubicado": "Realocado",
    "comun.desenlace.fallecido": "Falecido",
  } satisfies Record<keyof typeof es, string>,
};
