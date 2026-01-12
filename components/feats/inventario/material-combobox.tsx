"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/molecule/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shared/molecule/command"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import type { Material } from "@/lib/material-types"

interface MaterialComboboxProps {
  materials: Material[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  onCreateRequested?: (query: string) => void
}

export function MaterialCombobox({
  materials,
  value,
  onValueChange,
  placeholder = "Seleccionar material",
  onCreateRequested,
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedMaterial = useMemo(() => {
    return materials.find((material) => String(material.codigo) === value)
  }, [materials, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate text-left">
            {selectedMaterial
              ? `${selectedMaterial.codigo} - ${selectedMaterial.descripcion}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar material..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="space-y-3 px-3 py-2 text-center text-sm">
                <p>No se encontraron materiales.</p>
                {onCreateRequested ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      onCreateRequested(search)
                      setOpen(false)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Crear material
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {materials.map((material) => (
                <CommandItem
                  key={`${material.categoria}-${material.codigo}`}
                  value={`${material.codigo} ${material.descripcion} ${material.categoria || ""}`}
                  onSelect={() => {
                    onValueChange(String(material.codigo))
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === String(material.codigo) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {material.codigo} - {material.descripcion}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
