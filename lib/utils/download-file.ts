/**
 * Descarga un archivo remoto forzando el flujo "guardar como" en lugar de visualizarlo.
 * No se valida el tipo de archivo para cumplir con el requerimiento del backend.
 */
export async function downloadFile(url: string, suggestedName?: string): Promise<void> {
  if (!url) {
    throw new Error('No se proporcionó la URL del comprobante')
  }

  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`No se pudo descargar el comprobante (${response.status})`)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fallbackName = url.split('/').pop()?.split('?')[0] || 'comprobante'

    link.href = downloadUrl
    link.download = suggestedName || fallbackName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Error downloading file from url', url, error)
    throw error instanceof Error ? error : new Error('No se pudo descargar el comprobante')
  }
}
