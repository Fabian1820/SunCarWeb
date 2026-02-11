"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Package } from "lucide-react"
import { useMaterials } from "@/hooks/use-materials"
import { useMemo } from "react"

interface VerMaterialesOfertaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: any | null
  nombreCliente?: string
}

const formatCurrency = (value: number) => {
  return