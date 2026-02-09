"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { cn } from "@/lib/utils";
import {
  Upload,
  Image as ImageIcon,
  X,
  FileImage,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";

interface FileUploadSingleProps {
  id?: string;
  label?: string;
  accept?: string;
  multiple?: false;
  value?: File | null;
  onChange: (file: File | null) => void;
  className?: string;
  disabled?: boolean;
  maxSizeInMB?: number;
  showPreview?: boolean;
  currentImageUrl?: string;
}

interface FileUploadMultipleProps {
  id?: string;
  label?: string;
  accept?: string;
  multiple: true;
  value?: File[];
  onChange: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
  maxSizeInMB?: number;
  showPreview?: boolean;
  currentImageUrl?: string;
}

type FileUploadProps = FileUploadSingleProps | FileUploadMultipleProps;

export function FileUpload(props: FileUploadProps) {
  const {
    id = "file-upload",
    label = "Seleccionar archivo",
    accept = "image/*",
    multiple = false,
    className,
    disabled = false,
    maxSizeInMB = 10,
    showPreview = true,
    currentImageUrl,
  } = props;

  const isMultiple = multiple === true;

  // Normalize to array for internal use
  const files: File[] = isMultiple
    ? (props as FileUploadMultipleProps).value || []
    : (props as FileUploadSingleProps).value
      ? [(props as FileUploadSingleProps).value!]
      : [];

  const hasFiles = files.length > 0;

  const [isDragOver, setIsDragOver] = useState(false);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (accept === "image/*") {
        const extensionesImagen = [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".bmp",
          ".svg",
          ".heic",
          ".heif",
          ".tiff",
          ".tif",
          ".ico",
          ".avif",
        ];

        const extension = file.name
          .substring(file.name.lastIndexOf("."))
          .toLowerCase();
        const esImagen =
          extensionesImagen.includes(extension) ||
          (file.type && file.type.startsWith("image/"));

        if (!esImagen) {
          toast.error(`"${file.name}" no es un archivo de imagen válido`);
          return false;
        }
      } else if (accept) {
        const tieneTipoMimeValido =
          file.type && file.type.match(accept.replace(/\*/g, ".*"));
        if (!tieneTipoMimeValido) {
          toast.error(`"${file.name}": tipo de archivo no válido`);
          return false;
        }
      }

      if (file.size > maxSizeInMB * 1024 * 1024) {
        toast.error(
          `"${file.name}" es demasiado grande. Máximo ${maxSizeInMB}MB`,
        );
        return false;
      }

      return true;
    },
    [accept, maxSizeInMB],
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles = newFiles.filter((f) => validateFile(f));
      if (validFiles.length === 0) return;

      if (isMultiple) {
        const updated = [...files, ...validFiles];
        (props as FileUploadMultipleProps).onChange(updated);
        toast.success(
          validFiles.length === 1
            ? "Archivo agregado"
            : `${validFiles.length} archivos agregados`,
        );
      } else {
        (props as FileUploadSingleProps).onChange(validFiles[0]);
        toast.success("Archivo seleccionado correctamente");
      }
    },
    [validateFile, isMultiple, files, props],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    addFiles(Array.from(selected));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      addFiles(isMultiple ? dropped : [dropped[0]]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        addFiles([file]);
        setIsPasteMode(false);
      }
    }
  };

  const handleRemoveFile = (index?: number) => {
    if (isMultiple) {
      if (index !== undefined) {
        const updated = files.filter((_, i) => i !== index);
        (props as FileUploadMultipleProps).onChange(updated);
      } else {
        (props as FileUploadMultipleProps).onChange([]);
      }
    } else {
      (props as FileUploadSingleProps).onChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div
        ref={dropZoneRef}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragOver && "border-primary bg-primary/10",
          disabled && "opacity-50 cursor-not-allowed",
          hasFiles && "border-green-500 bg-green-50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={handleClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept={accept === "image/*" ? "image/*,.heic,.heif" : accept}
          multiple={isMultiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center text-center space-y-3">
          {hasFiles && !isMultiple ? (
            /* Single file selected - original view */
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <FileImage className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">
                  {files[0].name}
                </p>
                <p className="text-xs text-green-600">
                  {formatFileSize(files[0].size)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </>
          ) : hasFiles && isMultiple ? (
            /* Multiple files selected */
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <FileImage className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-700">
                {files.length}{" "}
                {files.length === 1
                  ? "imagen seleccionada"
                  : "imágenes seleccionadas"}
              </p>
              <div className="w-full max-h-40 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-xs border"
                  >
                    <span className="truncate mr-2 text-gray-700">
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  disabled={disabled}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Agregar más
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Eliminar todas
                </Button>
              </div>
            </>
          ) : (
            /* No files - empty state */
            <>
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                  isDragOver ? "bg-primary/20" : "bg-gray-100",
                )}
              >
                <Upload
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isDragOver ? "text-primary" : "text-gray-400",
                  )}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  {isDragOver
                    ? isMultiple
                      ? "Suelta los archivos aquí"
                      : "Suelta el archivo aquí"
                    : isMultiple
                      ? "Arrastra y suelta archivos"
                      : "Arrastra y suelta un archivo"}
                </p>
                <p className="text-xs text-gray-500">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400">
                  Máximo {maxSizeInMB}MB {isMultiple ? "por archivo" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  disabled={disabled}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {isMultiple ? "Seleccionar archivos" : "Seleccionar archivo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPasteMode(!isPasteMode);
                  }}
                  disabled={disabled}
                  className={isPasteMode ? "bg-primary/10 border-primary" : ""}
                >
                  <Clipboard className="w-4 h-4 mr-1" />
                  Pegar
                </Button>
              </div>
            </>
          )}
        </div>

        {isPasteMode && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-primary border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Clipboard className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-medium text-primary">
                Pega una imagen (Ctrl+V)
              </p>
              <p className="text-xs text-gray-500">
                Presiona Escape para cancelar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview de imagen actual (solo en modo edición) */}
      {showPreview && currentImageUrl && !hasFiles && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
          <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border">
            <img
              src={currentImageUrl}
              alt="Imagen actual"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>
      )}

      {/* Preview de nueva imagen (single mode) */}
      {showPreview && !isMultiple && files.length === 1 && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border">
            <img
              src={URL.createObjectURL(files[0])}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
