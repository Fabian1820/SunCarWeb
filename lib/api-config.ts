// ConfiguraciÃ³n de la API
// FunciÃ³n para obtener la URL de la API directamente del backend
function getApiBaseUrl(): string {
  const PROD_BACKEND_FALLBACK = "https://api.suncarsrl.com";
  const backendUrlEnvRaw =
    process.env.NEXT_PUBLIC_BACKEND_URL || PROD_BACKEND_FALLBACK;
  // Sanitiza comillas accidentales en variables de entorno, ej: "https://api..."
  const backendUrlEnv = backendUrlEnvRaw
    .trim()
    .replace(/^['"]+/, "")
    .replace(/['"]+$/, "");

  let normalized = backendUrlEnv || PROD_BACKEND_FALLBACK;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  let backendOrigin = normalized.replace(/\/+$/, "");
  try {
    const parsed = new URL(normalized);
    const isLocalhost =
      parsed.hostname.includes("localhost") || parsed.hostname === "127.0.0.1";

    // En producciÃ³n siempre usar HTTPS para evitar redirects que rompen preflight (CORS)
    if (!isLocalhost && parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    // Si la app corre en https y el backend quedÃ³ en http, elevar a https igualmente.
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      parsed.protocol === "http:" &&
      !isLocalhost
    ) {
      parsed.protocol = "https:";
    }

    const suppliedPath = parsed.pathname.replace(/\/+$/, "");
    if (
      suppliedPath &&
      suppliedPath !== "/" &&
      suppliedPath !== "/api" &&
      typeof console !== "undefined"
    ) {
    }

    const isSuncarNonApiHost =
      !isLocalhost &&
      parsed.hostname.includes("suncarsrl.com") &&
      !parsed.hostname.startsWith("api.");

    if (isSuncarNonApiHost) {
      backendOrigin = PROD_BACKEND_FALLBACK;
    } else {
      // Siempre construir la base con el origen para evitar duplicar /api o paths extra.
      backendOrigin = parsed.origin;
    }
  } catch {
    // Fallback conservador
    const isLocalhost =
      backendUrlEnv.includes("localhost") ||
      backendUrlEnv.includes("127.0.0.1");

    const protocol = isLocalhost ? "http" : "https";
    const hostOnly = backendUrlEnv
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "");

    const fallbackGuess = `${protocol}://${hostOnly}`;
    const isSuncarNonApiHost =
      !isLocalhost &&
      hostOnly.includes("suncarsrl.com") &&
      !hostOnly.startsWith("api.");
    backendOrigin = isSuncarNonApiHost ? PROD_BACKEND_FALLBACK : fallbackGuess;
  }
  const apiUrl = `${backendOrigin.replace(/\/+$/, "")}/api`;

  return apiUrl;
}

// Exportar la URL base
export const API_BASE_URL = getApiBaseUrl();

// Headers comunes para las peticiones
export const API_HEADERS = {
  "Content-Type": "application/json",
};

// ConfiguraciÃ³n de timeout
export const API_TIMEOUT = 10000; // 10 segundos

// Las funciones de autenticaciÃ³n se manejan directamente en apiRequest()
// usando el token guardado en localStorage por el AuthContext

function ensureSecureRequestUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (window.location.protocol !== "https:") return url;

  try {
    const parsed = new URL(url);
    const isLocalhost =
      parsed.hostname.includes("localhost") || parsed.hostname === "127.0.0.1";

    if (!isLocalhost && parsed.protocol === "http:") {
      parsed.protocol = "https:";
      const upgraded = parsed.toString();
      return upgraded;
    }
  } catch {
    if (url.startsWith("http://")) {
      const upgraded = `https://${url.slice("http://".length)}`;
      return upgraded;
    }
  }

  return url;
}
// FunciÃ³n helper para hacer peticiones HTTP con autenticaciÃ³n automÃ¡tica
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { responseType?: "json" | "blob" } = {},
): Promise<T> {
  const rawUrl = `${API_BASE_URL}${endpoint}`;
  const url = ensureSecureRequestUrl(rawUrl);
  const { responseType = "json", ...requestOptions } = options;

  try {
    // Obtener token de autenticaciÃ³n del localStorage
    let authToken = "";
    if (typeof window !== "undefined") {
      authToken =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      authToken = authToken
        .trim()
        .replace(/^['"]+/, "")
        .replace(/['"]+$/, "");
    }

    // Preparar headers base
    const baseHeaders: Record<string, string> = {};

    // Agregar token de autorizaciÃ³n si existe
    if (authToken) {
      baseHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    // Solo agregar Content-Type si no es FormData
    if (!(requestOptions.body instanceof FormData)) {
      baseHeaders["Content-Type"] = "application/json";
    }

    // Extraer headers de requestOptions para hacer merge correcto
    const { headers: requestHeaders, ...restOptions } = requestOptions;

    const config: RequestInit = {
      ...restOptions,
      mode: "cors",
      credentials: "omit",
      headers: {
        ...baseHeaders,
        ...(requestHeaders || {}),
      },
    };

    const method = (config.method || "GET").toUpperCase();
    const isLeadsCreateEndpoint =
      endpoint === "/leads/" || endpoint === "/leads";
    if (
      isLeadsCreateEndpoint &&
      method === "POST" &&
      typeof config.body === "string"
    ) {
      try {
        const payload = JSON.parse(config.body) as {
          nombre?: string;
          telefono?: string;
          estado?: string;
          fuente?: string;
          direccion?: string;
        };

        const nombre = payload.nombre?.trim().toLowerCase();
        const telefono = payload.telefono?.trim();
        const estado = payload.estado?.trim().toLowerCase();
        const fuente = payload.fuente?.trim().toLowerCase();
        const direccion = payload.direccion?.trim().toLowerCase();

        const isPlaceholderLead =
          nombre === "cliente temporal" &&
          telefono === "+00000000000" &&
          estado === "nuevo" &&
          fuente === "sistema" &&
          direccion === "temporal";

        if (isPlaceholderLead) {
          throw new Error(
            "Se bloqueÃ³ un lead temporal de marcador de posiciÃ³n. Completa nombre, telÃ©fono y direcciÃ³n reales.",
          );
        }
      } catch (parseOrValidationError) {
        if (
          parseOrValidationError instanceof Error &&
          parseOrValidationError.message.includes("bloqueÃ³ un lead temporal")
        ) {
          throw parseOrValidationError;
        }
      }
    }


    // 🔥 LOG ESPECIAL PARA CREACIÓN DE LEADS
    if ((endpoint === "/leads/" || endpoint === "/leads") && method === "POST") {
      console.log("🎯🎯🎯 CREANDO LEAD - DATOS ENVIADOS AL BACKEND 🎯🎯🎯");
      console.log("📍 Endpoint:", endpoint);
      console.log("📍 URL completa:", url);
      console.log("📍 Método:", method);
      console.log("📦 Body RAW (string):", config.body);
      
      if (typeof config.body === "string") {
        try {
          const parsedBody = JSON.parse(config.body);
          console.log("📦 Body PARSEADO (objeto):", parsedBody);
          console.log("📦 Body FORMATEADO (JSON pretty):");
          console.log(JSON.stringify(parsedBody, null, 2));
          
          console.log("📊 RESUMEN DE DATOS:");
          console.log("  ✓ Nombre:", parsedBody.nombre);
          console.log("  ✓ Teléfono:", parsedBody.telefono);
          console.log("  ✓ Email:", parsedBody.email);
          console.log("  ✓ Estado:", parsedBody.estado);
          console.log("  ✓ Fuente:", parsedBody.fuente);
          console.log("  ✓ Dirección:", parsedBody.direccion);
          console.log("  ✓ Prioridad:", parsedBody.prioridad);
          console.log("  ✓ Ofertas:", parsedBody.ofertas?.length || 0);
          
          if (parsedBody.ofertas && parsedBody.ofertas.length > 0) {
            console.log("🎁 OFERTAS INCLUIDAS:");
            parsedBody.ofertas.forEach((oferta: any, index: number) => {
              console.log(`  Oferta ${index + 1}:`, oferta);
            });
          }
          
          console.log("  ✓ Elementos personalizados:", parsedBody.elementos_personalizados?.length || 0);
          console.log("  ✓ Notas:", parsedBody.notas || "N/A");
        } catch (e) {
          console.error("❌ Error al parsear body:", e);
        }
      }
      console.log("🎯🎯🎯 FIN DE DATOS ENVIADOS 🎯🎯🎯");
    }

    const response = await fetch(url, config);

    // Intentar parsear la respuesta priorizando JSON, con fallback seguro para cuerpo vacÃ­o/no-JSON.
    let data: unknown;
    if (responseType === "blob") {
      const blob = await response.blob();

      // Si hay error HTTP con blob, intentar leer como texto para ver si es JSON
      if (!response.ok) {
        const text = await blob.text();
        try {
          const jsonData = JSON.parse(text);
          // Devolver el error para que el servicio lo maneje
          if (jsonData.success === false || jsonData.detail || jsonData.error) {
            return jsonData as T;
          }
        } catch {
          // No es JSON, lanzar error
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      return blob as unknown as T;
    }

    if (response.status === 204 || response.status === 205) {
      data = {};
    } else {
      const contentType = response.headers.get("content-type") || "";
      const rawText = await response.text();

      if (!rawText.trim()) {
        if (response.ok) {
          data = {};
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(rawText);
        } catch {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          throw new Error("Respuesta JSON invÃ¡lida del servidor");
        }
      } else {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Fallback para respuestas texto/html
          data = {
            detail: rawText.slice(0, 500),
          };
          if (!response.ok) {
            throw new Error(
              rawText.slice(0, 500) || `HTTP error! status: ${response.status}`,
            );
          }
        }
      }
    }

    const dataRecord =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : null;
    const dataDetail =
      typeof dataRecord?.detail === "string" ? dataRecord.detail : "";
    const dataMessage =
      typeof dataRecord?.message === "string" ? dataRecord.message : "";
    const dataSuccess = dataRecord?.success;
    const dataError = dataRecord?.error;

    // Detectar token expirado o invÃ¡lido (401) ANTES de cualquier otro manejo
    if (!response.ok && response.status === 401) {
      const errorMessage = dataDetail || dataMessage || "";

      if (
        errorMessage.toLowerCase().includes("token") &&
        (errorMessage.toLowerCase().includes("expirado") ||
          errorMessage.toLowerCase().includes("invÃ¡lido") ||
          errorMessage.toLowerCase().includes("invalido"))
      ) {

        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_data");

          setTimeout(() => {
            window.location.reload();
          }, 500);
        }

        throw new Error("SesiÃ³n expirada. Redirigiendo al login...");
      }
    }

    // Si la respuesta tiene estructura de error del backend
    // Devolverla tal cual para que el servicio la maneje
    if (
      dataSuccess === false ||
      (Boolean(dataDetail) && !response.ok) ||
      Boolean(dataError)
    ) {
      if (dataRecord) {
        return {
          ...dataRecord,
          _httpStatus: response.status,
          _requestUrl: url,
          _requestMethod: method,
        } as T;
      }
      return data as T;
    }

    // Si el HTTP status no es OK pero no tenemos estructura de error, lanzar excepciÃ³n
    if (!response.ok) {

      // Para errores 400 (Bad Request), devolver la respuesta como error estructurado
      // en lugar de lanzar excepciÃ³n para evitar el overlay de Next.js
      if (response.status === 400) {
        return {
          success: false,
          error: {
            code: "BAD_REQUEST",
            title: "Error de ValidaciÃ³n",
            message: dataDetail || dataMessage || "Error en la solicitud",
          },
        } as T;
      }

      throw new Error(
        `${
          dataDetail || dataMessage || `HTTP error! status: ${response.status}`
        } [${method} ${url}]`,
      );
    }

    return data;
  } catch (error) {
    if (
      error instanceof TypeError &&
      /failed to fetch|load failed/i.test(error.message)
    ) {
      throw new Error(
        `No se pudo conectar con el backend (${url}). Revisa CORS, SSL y disponibilidad del endpoint.`,
      );
    }

    throw error;
  }
}

