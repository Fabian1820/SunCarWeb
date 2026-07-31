export type IdiomaActualizacionesFelicity = "zh" | "en" | "es";

export interface TextosActualizacionesFelicity {
  tituloPagina: string;
  subtitulo: string;

  loginTitulo: string;
  loginUsuario: string;
  loginPassword: string;
  loginBoton: string;
  loginBotonCargando: string;
  loginErrorGenerico: string;

  cerrarSesion: string;

  formTitulo: string;
  formTipoEquipoLabel: string;
  formTipoEquipoPlaceholder: string;
  formTipoEquipoAyuda: string;
  formTipoEquipoSinResultados: string;
  formCantidadLabel: string;
  formCantidadAyuda: string;
  formConfiguracionLabel: string;
  formConfiguracionPlaceholder: string;
  formConfiguracionAyuda: string;
  formVersionLabel: string;
  formNotasLabel: string;
  formSubidoPorLabel: string;
  formSubidoPorPlaceholder: string;
  formArchivoLabel: string;
  formSubmitBoton: string;
  formSubmitBotonCargando: string;
  formExitoTitulo: string;
  formExitoMensaje: string;
  formSubirOtra: string;
  formErrorGenerico: string;
  formCamposObligatorios: string;
}

export const TEXTOS_ACTUALIZACIONES_FELICITY: Record<
  IdiomaActualizacionesFelicity,
  TextosActualizacionesFelicity
> = {
  zh: {
    tituloPagina: "Felicity 设备更新上传",
    subtitulo: "在此上传固件/软件更新，供 SunCar 技术人员查找和下载。",

    loginTitulo: "登录",
    loginUsuario: "用户名",
    loginPassword: "密码",
    loginBoton: "登录",
    loginBotonCargando: "登录中...",
    loginErrorGenerico: "用户名或密码错误",

    cerrarSesion: "退出登录",

    formTitulo: "上传新的更新",
    formTipoEquipoLabel: "设备型号",
    formTipoEquipoPlaceholder: "按型号、品牌或代码搜索...",
    formTipoEquipoAyuda: "在 SunCar 的设备目录中搜索并选择设备型号。",
    formTipoEquipoSinResultados: "未找到结果",
    formCantidadLabel: "连接数量",
    formCantidadAyuda: "此配置中并联/连接的相同型号设备数量（例如：2）。",
    formConfiguracionLabel: "配置说明",
    formConfiguracionPlaceholder: "例如：2台并联，三相输出",
    formConfiguracionAyuda: "简短描述此更新适用的具体安装配置。",
    formVersionLabel: "版本（可选）",
    formNotasLabel: "备注（可选）",
    formSubidoPorLabel: "您的姓名（可选）",
    formSubidoPorPlaceholder: "例如：张伟",
    formArchivoLabel: "更新文件",
    formSubmitBoton: "上传",
    formSubmitBotonCargando: "上传中...",
    formExitoTitulo: "上传成功",
    formExitoMensaje: "更新已保存，SunCar 团队现在可以找到它。",
    formSubirOtra: "上传另一个",
    formErrorGenerico: "上传失败，请重试。",
    formCamposObligatorios: "请填写设备型号、数量、配置说明并选择文件。",
  },
  en: {
    tituloPagina: "Felicity Equipment Updates Upload",
    subtitulo: "Upload firmware/software updates here so SunCar technicians can find and download them.",

    loginTitulo: "Sign in",
    loginUsuario: "Username",
    loginPassword: "Password",
    loginBoton: "Sign in",
    loginBotonCargando: "Signing in...",
    loginErrorGenerico: "Incorrect username or password",

    cerrarSesion: "Sign out",

    formTitulo: "Upload a new update",
    formTipoEquipoLabel: "Equipment model",
    formTipoEquipoPlaceholder: "Search by model, brand or code...",
    formTipoEquipoAyuda: "Search and pick the equipment model from SunCar's catalog.",
    formTipoEquipoSinResultados: "No results",
    formCantidadLabel: "Units connected",
    formCantidadAyuda: "How many units of this model are connected/paralleled in this setup (e.g. 2).",
    formConfiguracionLabel: "Configuration",
    formConfiguracionPlaceholder: "e.g. 2 units in parallel, 3-phase output",
    formConfiguracionAyuda: "Short description of the exact installation setup this update applies to.",
    formVersionLabel: "Version (optional)",
    formNotasLabel: "Notes (optional)",
    formSubidoPorLabel: "Your name (optional)",
    formSubidoPorPlaceholder: "e.g. Wei Zhang",
    formArchivoLabel: "Update file",
    formSubmitBoton: "Upload",
    formSubmitBotonCargando: "Uploading...",
    formExitoTitulo: "Upload successful",
    formExitoMensaje: "The update was saved and SunCar's team can now find it.",
    formSubirOtra: "Upload another",
    formErrorGenerico: "Upload failed. Please try again.",
    formCamposObligatorios: "Fill in the equipment model, quantity, configuration and choose a file.",
  },
  es: {
    tituloPagina: "Subida de actualizaciones de equipos Felicity",
    subtitulo: "Sube aquí las actualizaciones de firmware/software para que el equipo de SunCar las encuentre y descargue.",

    loginTitulo: "Iniciar sesión",
    loginUsuario: "Usuario",
    loginPassword: "Contraseña",
    loginBoton: "Entrar",
    loginBotonCargando: "Entrando...",
    loginErrorGenerico: "Usuario o contraseña incorrectos",

    cerrarSesion: "Cerrar sesión",

    formTitulo: "Subir una nueva actualización",
    formTipoEquipoLabel: "Modelo de equipo",
    formTipoEquipoPlaceholder: "Buscar por modelo, marca o código...",
    formTipoEquipoAyuda: "Busca y elige el modelo de equipo del catálogo de SunCar.",
    formTipoEquipoSinResultados: "Sin resultados",
    formCantidadLabel: "Cantidad conectada",
    formCantidadAyuda: "Cuántos equipos de este modelo están conectados/en paralelo en esta configuración (ej. 2).",
    formConfiguracionLabel: "Configuración",
    formConfiguracionPlaceholder: "ej. 2 equipos en paralelo, salida trifásica",
    formConfiguracionAyuda: "Descripción corta de la instalación exacta a la que aplica esta actualización.",
    formVersionLabel: "Versión (opcional)",
    formNotasLabel: "Notas (opcional)",
    formSubidoPorLabel: "Tu nombre (opcional)",
    formSubidoPorPlaceholder: "ej. Wei Zhang",
    formArchivoLabel: "Archivo de la actualización",
    formSubmitBoton: "Subir",
    formSubmitBotonCargando: "Subiendo...",
    formExitoTitulo: "Subida exitosa",
    formExitoMensaje: "La actualización quedó guardada y el equipo de SunCar ya puede encontrarla.",
    formSubirOtra: "Subir otra",
    formErrorGenerico: "No se pudo subir. Intenta de nuevo.",
    formCamposObligatorios: "Completa el modelo de equipo, la cantidad, la configuración y elige un archivo.",
  },
};

export const IDIOMAS_ACTUALIZACIONES_FELICITY: {
  value: IdiomaActualizacionesFelicity;
  label: string;
}[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const STORAGE_KEY = "actualizaciones_felicity_idioma";

export function leerIdiomaGuardado(): IdiomaActualizacionesFelicity {
  if (typeof window === "undefined") return "zh";
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (guardado === "zh" || guardado === "en" || guardado === "es") return guardado;
  return "zh";
}

export function guardarIdioma(idioma: IdiomaActualizacionesFelicity): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, idioma);
}
