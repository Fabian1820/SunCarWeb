import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { INITIAL_MATERIAL_BRANDS } from "@/lib/types"
import type { MaterialBrandDocument } from "@/lib/models/material"

export async function GET() {
  try {
    const db = await getDatabase()
    let brands = await db.collection<MaterialBrandDocument>("material_brands").find({}).toArray()

    // Si no hay marcas en la base de datos, insertar las iniciales
    if (brands.length === 0) {
      const initialBrands = INITIAL_MATERIAL_BRANDS.map((name) => ({
        name,
        createdAt: new Date(),
      }))

      await db.collection("material_brands").insertMany(initialBrands)
      brands = await db.collection<MaterialBrandDocument>("material_brands").find({}).toArray()
    }

    return NextResponse.json({
      success: true,
      data: brands.map((brand) => ({
        id: brand._id?.toString(),
        name: brand.name,
      })),
    })
  } catch (error) {
    console.error("Error fetching material brands:", error)
    return NextResponse.json({ success: false, error: "Error al obtener marcas de materiales" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ success: false, error: "El nombre de la marca es requerido" }, { status: 400 })
    }

    const db = await getDatabase()

    // Verificar si ya existe
    const existingBrand = await db.collection("material_brands").findOne({ name })
    if (existingBrand) {
      return NextResponse.json({ success: false, error: "Ya existe una marca con ese nombre" }, { status: 400 })
    }

    const newBrand: MaterialBrandDocument = {
      name,
      createdAt: new Date(),
    }

    const result = await db.collection("material_brands").insertOne(newBrand)

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        name,
      },
    })
  } catch (error) {
    console.error("Error creating material brand:", error)
    return NextResponse.json({ success: false, error: "Error al crear marca de material" }, { status: 500 })
  }
}
