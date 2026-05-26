/**
 * Configuración de la sorpresa personal.
 *
 * IMPORTANTE — Antes de mergear a main:
 *   1. Quita tu propia CI de CI_SORPRESA (debe quedar SOLO la de ella).
 *   2. Revisa que todo el contenido sea el final.
 *
 * Si quieres desactivar todo de emergencia: deja CI_SORPRESA = [].
 */

// CIs que activan la sorpresa. En DEV: incluye la tuya para probar.
// EN MAIN: deja SOLO la CI de ella.
export const CI_SORPRESA: string[] = [
  "96021609459", // ella
]

// WhatsApp — número en formato internacional sin "+" ni espacios.
export const TELEFONO_WHATSAPP = "5358412294"

// Mensaje predefinido que ella enviará.
export const MENSAJE_WHATSAPP = "Sé que hoy no nos podemos escribir pero te extraño."

// Fecha exacta de regreso. Formato ISO con hora local.
// El contador llega a cero a esta hora.
export const FECHA_REGRESO_DEFAULT = "2026-06-20T00:00:00"

// --- CONTENIDO DEL REVEAL ---

export const TITULO_REVEAL = "Cosita,"
export const SUBTITULO_REVEAL = "" // vacío para que la carta hable directo

// La carta — cada string es un párrafo. Se escriben en secuencia con efecto
// máquina de escribir, párrafo tras párrafo.
export const CARTA_LINEAS: string[] = [
  "Bueno… claramente esto de \"no escribirnos\" me duró bastante poco 😂",
  "Y sinceramente menos mal.",
  "Porque por mucho que me haga el interesante o el disciplinado, me gusta demasiado saber de ti. Me gusta cuando apareces con un mensaje random, cuando me cuentas tu caos del día, cuando me mandas fotos de cualquier tontería o cuando de repente decides provocarme porque sí 😅",
  "La verdad es que desde que te fuiste me he dado cuenta de algo curioso… y es que ya formas parte de mi rutina sin sentirse rutina. Y eso no me pasa fácil.",
  "Me gusta cómo se siente esto contigo. La tensión, las risas, nuestras conversaciones absurdas, las ganas que nos tenemos, pero también la calma que aparece a veces en medio de todo eso.",
  "Y aunque estés lejos, consigues estar bastante presente aquí.",
  "Así que no, no pienso seguir fingiendo que no quiero hablar contigo 😂",
  "Te extraño también.",
  "Mucho más de lo que debería probablemente.",
]

export const TEXTO_CONTADOR_REVEAL = "Para volver a vernos"
export const TEXTO_BOTON_CERRAR = "Entrar al sistema"
export const TEXTO_BOTON_INTRIGA = "Continuar"

export const TITULO_INTRIGA = "Acción pendiente"
export const MENSAJE_INTRIGA = "Tu cuenta tiene una acción pendiente antes de cargar los módulos."

// --- KEYS DE LOCALSTORAGE (no tocar) ---
export const LS_KEY_COMPLETADA = "sorpresa_completada_v1"
export const LS_KEY_FECHA_REGRESO = "sorpresa_fecha_regreso_v1"
