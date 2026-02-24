"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shared/molecule/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  disablePortal?: boolean;
  truncateSelected?: boolean;
  truncateOptions?: boolean;
  listClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  className,
  disablePortal = false,
  truncateSelected = true,
  truncateOptions = true,
  listClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  // Enfocar el input cuando se abre el popover
  useEffect(() => {
    if (open) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        const input = document.querySelector(
          "[cmdk-input]",
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 0);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-gray-900",
            !truncateSelected && "h-auto min-h-10 items-start py-2",
            className,
          )}
          type="button"
        >
          <span
            className={cn(
              "text-left",
              truncateSelected
                ? "truncate"
                : "block line-clamp-2 break-words leading-snug",
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        disablePortal={disablePortal}
      >
        <Command shouldFilter={true}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className={cn("max-h-[300px]", listClassName)}>
            <CommandEmpty>
              <div className="px-3 py-2 text-center text-sm text-gray-500">
                No se encontraron resultados.
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => (
                <CommandItem
                  key={`${option.value}-${index}`}
                  value={`${option.value} ${option.label}`}
                  className={cn(!truncateOptions && "items-start py-2")}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      truncateOptions
                        ? "truncate"
                        : "block line-clamp-2 break-words leading-snug",
                    )}
                  >
                    {option.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
