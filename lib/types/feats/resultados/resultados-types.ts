export interface MunicipioInstalado {
  provincia: string
  municipio: string
  cantidad_clientes: number
}

export interface DashboardEmpresaPrincipal {
  cantidad_clientes: number
  cantidad_municipios_instalados: number
  municipios_instalados: MunicipioInstalado[]
  total_kw_paneles: number
  total_kw_inversores: number
  total_kw_baterias: number
  promedio_kw_paneles_por_cliente: number
  promedio_kw_inversores_por_cliente: number
  promedio_kw_baterias_por_cliente: number
  max_kw_paneles_cliente: number
  max_kw_inversores_cliente: number
  max_kw_baterias_cliente: number
}
