"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/shared/molecule/pagination"

interface SmartPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisiblePages?: number
  className?: string
}

/**
 * Componente de paginación inteligente que muestra:
 * - Primera página
 * - Página actual y sus adyacentes
 * - Última página
 * - Puntos suspensivos entre gaps
 *
 * @example
 * <SmartPagination
 *   currentPage={5}
 *   totalPages={20}
 *   onPageChange={(page) => setPage(page)}
 * />
 */
export function SmartPagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  className,
}: SmartPaginationProps) {
  // No mostrar paginación si solo hay una página
  if (totalPages <= 1) {
    return null
  }

  // Calcular qué páginas mostrar
  const getVisiblePages = (): number[] => {
    // Si hay pocas páginas, mostrar todas
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Siempre mostrar: primera, última, actual y sus adyacentes
    const pages = new Set<number>()

    // Primera página
    pages.add(1)

    // Última página
    pages.add(totalPages)

    // Página actual y sus adyacentes
    pages.add(currentPage)
    if (currentPage > 1) pages.add(currentPage - 1)
    if (currentPage < totalPages) pages.add(currentPage + 1)

    // Si estamos cerca del inicio, mostrar más páginas iniciales
    if (currentPage <= 3) {
      for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
        pages.add(i)
      }
    }

    // Si estamos cerca del final, mostrar más páginas finales
    if (currentPage >= totalPages - 2) {
      for (let i = Math.max(2, totalPages - 3); i < totalPages; i++) {
        pages.add(i)
      }
    }

    return Array.from(pages).sort((a, b) => a - b)
  }

  const visiblePages = getVisiblePages()

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* Botón Anterior */}
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            aria-disabled={currentPage <= 1}
            className={
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        {/* Páginas numeradas */}
        {visiblePages.map((page, idx) => {
          const prevPage = visiblePages[idx - 1]
          const showEllipsis = idx > 0 && prevPage !== page - 1

          return (
            <div key={`page-group-${page}`} className="contents">
              {/* Mostrar puntos suspensivos si hay un gap */}
              {showEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Botón de página */}
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                  aria-label={`Ir a página ${page}`}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            </div>
          )
        })}

        {/* Botón Siguiente */}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            className={
              currentPage >= totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
