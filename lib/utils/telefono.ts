/**
 * Validación compartida para campos de teléfono (`telefono`, `telefono_adicional`)
 * en los formularios de Lead y Cliente.
 *
 * Formato exigido: solo dígitos, con un "+" opcional al inicio (formato
 * internacional). Sin espacios, guiones, paréntesis ni letras — evita que
 * se cuelen valores como "50749406 (Secretaria)" o "Erika Cabrera" en un
 * campo que debe contener solo un número. Debe coincidir exactamente con
 * el patrón que valida el backend (telefono_validators.py).
 */

const TELEFONO_REGEX = /^\+?\d{6,15}$/;

/**
 * Filtra en tiempo real lo que el usuario escribe: deja solo dígitos y,
 * si está al inicio, un "+". Se usa en el onChange del input para que
 * sea físicamente imposible teclear espacios o letras.
 */
export function sanitizarTelefono(valor: string): string {
  const tienePlusInicial = valor.trimStart().startsWith("+");
  const soloDigitos = valor.replace(/\D/g, "");
  return tienePlusInicial ? `+${soloDigitos}` : soloDigitos;
}

/** Valida el formato final antes de enviar el formulario. Vacío es válido (campo opcional). */
export function esTelefonoValido(valor: string | undefined | null): boolean {
  if (!valor || !valor.trim()) return true;
  return TELEFONO_REGEX.test(valor.trim());
}

export const TELEFONO_ERROR_MSG =
  "Solo números, sin espacios ni letras (puede empezar con +)";
