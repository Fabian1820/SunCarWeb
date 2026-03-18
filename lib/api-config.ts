// ConfiguraciÃ³n de la API
// FunciÃ³n para obtener la URL de la API directamente del backend
function getApiBaseUrl(): string {
  const PROD_BACKEND_FALLBACK = "https://api.suncarsrl.com";
  const backendUrlEnvRaw =
    process.env.NEXT_PUBLIC_BACKEND_URL || PROD_BACKEND_FALLBACK;
  const backendUrlEnv = backendUrlEnvRaw.trim();

  let normalized = backendUrlEnv;
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
      console.warn(
        `âš ï¸ NEXT_PUBLIC_BACKEND_URL incluye path '${suppliedPath}'. Se ignorarÃ¡ y se usarÃ¡ solo el origen.`,
      );
    }

    const isSuncarNonApiHost =
      !isLocalhost &&
      parsed.hostname.includes("suncarsrl.com") &&
      !parsed.hostname.startsWith("api.");

    if (isSuncarNonApiHost) {
      console.warn(
        `âš ï¸ Host backend '${parsed.hostname}' no es API. Se usarÃ¡ '${PROD_BACKEND_FALLBACK}'.`,
      );
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

  console.log("âœ… Using direct backend URL:", apiUrl);
  console.log("ðŸ”§ Backend origin URL:", backendOrigin);

  return apiUrl;
}

// Exportar la URL base
export const API_BASE_URL = getApiBaseUrl();

// Log inicial para verificar configuraciÃ³n
console.log("ðŸ”§ API Configuration loaded:", {
  API_BASE_URL,
  timestamp: new Date().toISOString(),
});

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
      console.warn("⚠️ URL HTTP detectada en cliente HTTPS. Se fuerza HTTPS:", {
        original: url,
        upgraded,
      });
      return upgraded;
    }
  } catch {
    if (url.startsWith("http://")) {
      const upgraded = `https://${url.slice("http://".length)}`;
      console.warn("⚠️ URL HTTP inválida detectada en cliente HTTPS. Se fuerza HTTPS:", {
        original: url,
        upgraded,
      });
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

  console.log("ðŸš€ Starting API request:", { endpoint, url, API_BASE_URL });
  console.log("ðŸŒ Environment check:", {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    isBrowser: typeof window !== "undefined",
  });

  try {
    // Obtener token de autenticaciÃ³n del localStorage
    let authToken = "";
    if (typeof window !== "undefined") {
      authToken = localStorage.getItem("auth_token") || "";
      if (authToken) {
        console.log(
          "ðŸ” Using auth token from localStorage:",
          authToken.substring(0, 20) + "...",
        );
      } else {
        console.warn("âš ï¸ No auth token found in localStorage");
      }
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
          console.error(
            "â›” Payload bloqueado para POST /leads/:",
            parseOrValidationError.message,
          );
          throw parseOrValidationError;
        }
      }
    }
    console.log(`ðŸ“¡ Making API request to: ${url}`);
    console.log("ðŸ“‹ Request config:", {
      method: config.method || "GET",
      headers: config.headers,
      body: config.body ? "Present" : "None",
      responseType,
    });
    console.log(
      "ðŸ” Authorization header:",
      config.headers?.["Authorization"] ? "Present" : "NOT FOUND",
    );

    const response = await fetch(url, config);
    console.log("ðŸ“¨ Response received:", {
      status: response.status,
      ok: response.ok,
      url: response.url,
    });

    // Intentar parsear la respuesta priorizando JSON, con fallback seguro para cuerpo vacÃ­o/no-JSON.
    let data: unknown;
    if (responseType === "blob") {
      const blob = await response.blob();
      console.log("ðŸ“„ API Response blob size:", blob.size);

      // Si hay error HTTP con blob, intentar leer como texto para ver si es JSON
      if (!response.ok) {
        const text = await blob.text();
        try {
          const jsonData = JSON.parse(text);
          // Devolver el error para que el servicio lo maneje
          if (jsonData.success === false || jsonData.detail || jsonData.error) {
            console.log("ðŸ“¦ Returning error response from blob");
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
      console.log(
        "ðŸ“¦ Empty response body (no content), returning empty object",
      );
    } else {
      const contentType = response.headers.get("content-type") || "";
      const rawText = await response.text();

      if (!rawText.trim()) {
        if (response.ok) {
          data = {};
          console.log("ðŸ“¦ Empty response body, returning empty object");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error("âŒ Could not parse response as JSON");
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
      console.log("ðŸ“¦ Response data:", data);
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
        console.warn(
          "ðŸ” Token expirado o invÃ¡lido - cerrando sesiÃ³n automÃ¡ticamente",
        );

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
      console.log("ðŸ“¦ Returning error response to service for handling");
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
      console.error(
        `âŒ API request failed: ${response.status} ${response.statusText}`,
      );
      console.error("âŒ Error data:", data);

      // Para errores 400 (Bad Request), devolver la respuesta como error estructurado
      // en lugar de lanzar excepciÃ³n para evitar el overlay de Next.js
      if (response.status === 400) {
        console.log("ðŸ“¦ Returning 400 error as structured response");
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

    console.error("ðŸ’¥ API Request Error:", error);
    console.error("ðŸ’¥ API Request Error Details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "Unknown",
      url,
      endpoint,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorString: String(error),
    });
    throw error;
  }
}


