/**
 * Textos del área «huella»: la insignia «Huella verificada», su página pública y las secciones del donante (casos
 * que apoya, historial de aportes y voluntariados), que también usa el perfil. `es` es la fuente: tiene todas las
 * claves; `en` y `pt` (Brasil) las traducen y el compilador avisa si falta o sobra alguna. Las claves empiezan por
 * «huella.».
 */
const es = {
  // ── Página pública de la huella ──
  "huella.meta.noEncontrada": "Huella no encontrada",
  "huella.meta.titulo": "Huella verificada de {quien}",
  "huella.meta.descripcion_one":
    "Apoya {n} caso de fauna silvestre rescatada. Cada aporte se puede comprobar en Stellar.",
  "huella.meta.descripcion_other":
    "Apoya {n} casos de fauna silvestre rescatada. Cada aporte se puede comprobar en Stellar.",
  "huella.publica.donante": "Donante",
  "huella.publica.intro":
    "Estos aportes están en la red Stellar: cualquiera puede comprobarlos en Stellar Expert. Proof of Wild no muestra el nombre ni los datos de contacto de nadie.",

  // ── Insignia ──
  "huella.insignia.titulo": "Huella verificada",
  "huella.insignia.apoya_one": "Apoya {n} caso",
  "huella.insignia.apoya_other": "Apoya {n} casos",
  "huella.insignia.voluntariado": "Voluntariado inscrito",
  "huella.insignia.comprobable": "Cada aporte que la respalda se puede comprobar en Stellar Expert.",
  "huella.insignia.compartirTexto": "Mi Huella verificada en Proof of Wild: {partes}.",
  "huella.insignia.verPublica": "Ver la página pública de tu insignia",
  "huella.insignia.inactiva": "Se activa con tu primer aporte o voluntariado.",

  // ── Compartir ──
  "huella.compartir.linkedin": "Compartir en LinkedIn",
  "huella.compartir.redes": "Compartir en redes",
  "huella.compartir.copiado": "Enlace copiado",
  "huella.compartir.titulo": "Huella verificada · Proof of Wild",

  // ── Cabecera ──
  "huella.cabecera.sinBilletera": "Sin billetera vinculada",
  "huella.cabecera.identidadVerificada": "Identidad verificada",

  // ── Totales ──
  "huella.totales.aportado": "Total aportado",
  "huella.totales.casosPropios": "Casos que apoyas",
  "huella.totales.casosAjenos": "Casos que apoya",
  "huella.totales.voluntariados": "Voluntariados inscritos",

  // ── Secciones del donante ──
  "huella.vacio.propio": "Aún no apadrinas ningún caso.",
  "huella.vacio.ajeno": "Esta billetera aún no apoya ningún caso.",
  "huella.vacio.texto": "Elige un animal, apadrínalo con tu billetera y aquí verás en qué etapa se usó tu aporte.",
  "huella.vacio.verCasos": "Ver casos",
  "huella.casos.propios": "Mis casos",
  "huella.casos.ajenos": "Casos que apoya",
  "huella.casos.ultimaActualizacion": "Última actualización:",
  "huella.casos.ongPago": "la ONG pagó {concepto}.",
  "huella.casos.usoPropio": "Tu aporte se usó en",
  "huella.casos.usoAjeno": "Su aporte se usó en",
  "huella.casos.verCaso": "Ver el caso",
  "huella.historial.titulo": "Historial de aportes",
  "huella.historial.vacio": "Sin aportes todavía.",
  "huella.historial.comprobante": "Comprobante",
  "huella.voluntariados.propios": "Mis voluntariados",
  "huella.voluntariados.ajenos": "Voluntariados",
  "huella.voluntariados.vacioPropio": "Aún no te inscribes.",
  "huella.voluntariados.ver": "Ver voluntariados",
  "huella.voluntariados.vacioAjeno": "Sin voluntariados inscritos.",
  "huella.voluntariados.inscrito": "Inscrito",
};

export const huella = {
  es,
  en: {
    "huella.meta.noEncontrada": "Footprint not found",
    "huella.meta.titulo": "Verified footprint of {quien}",
    "huella.meta.descripcion_one": "Supports {n} rescued wildlife case. Every contribution can be checked on Stellar.",
    "huella.meta.descripcion_other": "Supports {n} rescued wildlife cases. Every contribution can be checked on Stellar.",
    "huella.publica.donante": "Donor",
    "huella.publica.intro":
      "These contributions are on the Stellar network: anyone can check them on Stellar Expert. Proof of Wild doesn't show anyone's name or contact details.",

    "huella.insignia.titulo": "Verified footprint",
    "huella.insignia.apoya_one": "Supports {n} case",
    "huella.insignia.apoya_other": "Supports {n} cases",
    "huella.insignia.voluntariado": "Signed up to volunteer",
    "huella.insignia.comprobable": "Every contribution behind it can be checked on Stellar Expert.",
    "huella.insignia.compartirTexto": "My Verified footprint on Proof of Wild: {partes}.",
    "huella.insignia.verPublica": "View your badge's public page",
    "huella.insignia.inactiva": "It activates with your first contribution or volunteer sign-up.",

    "huella.compartir.linkedin": "Share on LinkedIn",
    "huella.compartir.redes": "Share on social media",
    "huella.compartir.copiado": "Link copied",
    "huella.compartir.titulo": "Verified footprint · Proof of Wild",

    "huella.cabecera.sinBilletera": "No linked wallet",
    "huella.cabecera.identidadVerificada": "Verified identity",

    "huella.totales.aportado": "Total contributed",
    "huella.totales.casosPropios": "Cases you support",
    "huella.totales.casosAjenos": "Cases supported",
    "huella.totales.voluntariados": "Volunteer sign-ups",

    "huella.vacio.propio": "You aren't sponsoring any case yet.",
    "huella.vacio.ajeno": "This wallet doesn't support any case yet.",
    "huella.vacio.texto": "Choose an animal, sponsor it with your wallet, and you'll see here which stage your contribution went to.",
    "huella.vacio.verCasos": "See cases",
    "huella.casos.propios": "My cases",
    "huella.casos.ajenos": "Cases supported",
    "huella.casos.ultimaActualizacion": "Last update:",
    "huella.casos.ongPago": "the NGO paid for {concepto}.",
    "huella.casos.usoPropio": "Your contribution went to",
    "huella.casos.usoAjeno": "Their contribution went to",
    "huella.casos.verCaso": "View the case",
    "huella.historial.titulo": "Contribution history",
    "huella.historial.vacio": "No contributions yet.",
    "huella.historial.comprobante": "Receipt",
    "huella.voluntariados.propios": "My volunteering",
    "huella.voluntariados.ajenos": "Volunteering",
    "huella.voluntariados.vacioPropio": "You haven't signed up yet.",
    "huella.voluntariados.ver": "See volunteering",
    "huella.voluntariados.vacioAjeno": "No volunteer sign-ups.",
    "huella.voluntariados.inscrito": "Signed up",
  } satisfies Record<keyof typeof es, string>,
  pt: {
    "huella.meta.noEncontrada": "Pegada não encontrada",
    "huella.meta.titulo": "Pegada verificada de {quien}",
    "huella.meta.descripcion_one":
      "Apoia {n} caso de fauna silvestre resgatada. Cada contribuição pode ser conferida na Stellar.",
    "huella.meta.descripcion_other":
      "Apoia {n} casos de fauna silvestre resgatada. Cada contribuição pode ser conferida na Stellar.",
    "huella.publica.donante": "Doador",
    "huella.publica.intro":
      "Estas contribuições estão na rede Stellar: qualquer pessoa pode conferi-las no Stellar Expert. O Proof of Wild não mostra o nome nem os dados de contato de ninguém.",

    "huella.insignia.titulo": "Pegada verificada",
    "huella.insignia.apoya_one": "Apoia {n} caso",
    "huella.insignia.apoya_other": "Apoia {n} casos",
    "huella.insignia.voluntariado": "Inscrito em voluntariado",
    "huella.insignia.comprobable": "Cada contribuição que a respalda pode ser conferida no Stellar Expert.",
    "huella.insignia.compartirTexto": "Minha Pegada verificada no Proof of Wild: {partes}.",
    "huella.insignia.verPublica": "Ver a página pública da sua insígnia",
    "huella.insignia.inactiva": "É ativada com sua primeira contribuição ou voluntariado.",

    "huella.compartir.linkedin": "Compartilhar no LinkedIn",
    "huella.compartir.redes": "Compartilhar nas redes",
    "huella.compartir.copiado": "Link copiado",
    "huella.compartir.titulo": "Pegada verificada · Proof of Wild",

    "huella.cabecera.sinBilletera": "Nenhuma carteira vinculada",
    "huella.cabecera.identidadVerificada": "Identidade verificada",

    "huella.totales.aportado": "Total contribuído",
    "huella.totales.casosPropios": "Casos que você apoia",
    "huella.totales.casosAjenos": "Casos que apoia",
    "huella.totales.voluntariados": "Voluntariados inscritos",

    "huella.vacio.propio": "Você ainda não apadrinha nenhum caso.",
    "huella.vacio.ajeno": "Esta carteira ainda não apoia nenhum caso.",
    "huella.vacio.texto": "Escolha um animal, apadrinhe com sua carteira e veja aqui em qual etapa sua contribuição foi usada.",
    "huella.vacio.verCasos": "Ver casos",
    "huella.casos.propios": "Meus casos",
    "huella.casos.ajenos": "Casos que apoia",
    "huella.casos.ultimaActualizacion": "Última atualização:",
    "huella.casos.ongPago": "a ONG pagou {concepto}.",
    "huella.casos.usoPropio": "Sua contribuição foi usada em",
    "huella.casos.usoAjeno": "A contribuição foi usada em",
    "huella.casos.verCaso": "Ver o caso",
    "huella.historial.titulo": "Histórico de contribuições",
    "huella.historial.vacio": "Nenhuma contribuição ainda.",
    "huella.historial.comprobante": "Comprovante",
    "huella.voluntariados.propios": "Meus voluntariados",
    "huella.voluntariados.ajenos": "Voluntariados",
    "huella.voluntariados.vacioPropio": "Você ainda não se inscreveu.",
    "huella.voluntariados.ver": "Ver voluntariados",
    "huella.voluntariados.vacioAjeno": "Nenhum voluntariado inscrito.",
    "huella.voluntariados.inscrito": "Inscrito",
  } satisfies Record<keyof typeof es, string>,
};
