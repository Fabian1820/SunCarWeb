"use client";

import { useEffect } from "react";
import { House, Package, Truck } from "lucide-react";

interface EntregaCelebrationAnimationProps {
  open: boolean;
  onClose: () => void;
  durationMs?: number;
}

export function EntregaCelebrationAnimation({
  open,
  onClose,
  durationMs = 1900,
}: EntregaCelebrationAnimationProps) {
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timeoutId);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/35 backdrop-blur-[1px]">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 bg-emerald-700 px-4 py-3 text-white">
          <p className="text-sm sm:text-base font-semibold">
            Entrega guardada con exito
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-emerald-800/80 px-2.5 py-1 text-xs font-medium hover:bg-emerald-900"
          >
            Cerrar
          </button>
        </div>

        <div className="relative h-44 overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50">
          <div className="absolute left-0 right-0 bottom-0 h-10 bg-slate-700" />
          <div className="absolute left-0 right-0 bottom-5 h-0.5 border-t-2 border-dashed border-slate-300/70" />

          <div className="house absolute right-6 bottom-10 text-amber-700">
            <House className="h-10 w-10 drop-shadow" strokeWidth={2.2} />
          </div>

          <div className="package-one absolute right-20 bottom-12 text-orange-600 opacity-0">
            <Package className="h-5 w-5" strokeWidth={2.3} />
          </div>
          <div className="package-two absolute right-14 bottom-12 text-amber-700 opacity-0">
            <Package className="h-4 w-4" strokeWidth={2.3} />
          </div>

          <div className="truck absolute left-[-82px] bottom-[30px] text-emerald-700">
            <Truck className="h-12 w-12 drop-shadow-md" strokeWidth={2.3} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .truck {
          animation: truck-drive-return 1.8s ease-in-out forwards;
        }

        .house {
          animation: house-wiggle 1.8s ease-in-out;
          transform-origin: bottom center;
        }

        .package-one {
          animation: package-drop 1.8s ease-out forwards;
        }

        .package-two {
          animation: package-drop-two 1.8s ease-out forwards;
        }

        @keyframes truck-drive-return {
          0% {
            left: -82px;
            transform: scaleX(1) translateY(0);
          }
          36% {
            left: calc(100% - 96px);
            transform: scaleX(1) translateY(0);
          }
          44% {
            left: calc(100% - 96px);
            transform: scaleX(1) translateY(-2px);
          }
          52% {
            left: calc(100% - 96px);
            transform: scaleX(1) translateY(0);
          }
          61% {
            left: calc(100% - 96px);
            transform: scaleX(-1) translateY(0);
          }
          100% {
            left: -82px;
            transform: scaleX(-1) translateY(0);
          }
        }

        @keyframes package-drop {
          0%,
          34% {
            opacity: 0;
            transform: translateY(-14px) scale(0.78);
          }
          44% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(4px) scale(0.96);
          }
          57% {
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes package-drop-two {
          0%,
          38% {
            opacity: 0;
            transform: translateY(-10px) scale(0.8);
          }
          48% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          54% {
            transform: translateY(3px) scale(0.97);
          }
          61% {
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes house-wiggle {
          0%,
          38%,
          100% {
            transform: rotate(0deg);
          }
          42% {
            transform: rotate(-1.6deg);
          }
          46% {
            transform: rotate(1.6deg);
          }
          50% {
            transform: rotate(-0.8deg);
          }
        }
      `}</style>
    </div>
  );
}
