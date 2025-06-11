import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { INITIAL_MATERIAL_TYPES } from "@/lib/types"
import type { MaterialTypeDocument } from "@/lib/models/material"

export async function GET() {
  try {
    const db = await getDatabase()
    let types = await db.collection<MaterialTypeDocument>("material_types").find({}).toArray()

    // Si no hay tipos en la base de datos, insertar los iniciales
    if (types.length === 0) {
      const initialTypes = INITIAL_MATERIAL_TYPES.map((name) => ({
        name,
        createdAt: new Date(),
      }))

      await db.collection("material_types").insertMany(initialTypes)
      types = await db.collection<MaterialTypeDocument>("material_types").find({}).toArray()
    }

    return NextResponse.json({
      success: true,
      data: types.map((type) => ({
        id: type._id?.toString(),
        name: type.name,
      })),
    })
  } catch (error) {
    console.error("Error fetching material types:", error)
    return NextResponse.json({ success: false, error: "Error al obtener tipos de materiales" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ success: false, error: "El nombre del tipo es requerido" }, { status: 400 })
    }

    const db = await getDatabase()

    // Verificar si ya existe
    const existingType = await db.collection("material_types").findOne({ name })
    if (existingType) {
      return NextResponse.json({ success: false, error: "Ya existe un tipo con ese nombre" }, { status: 400 })
    }

    const newType: MaterialTypeDocument = {
      name,
      createdAt: new Date(),
    }

    const result = await db.collection("material_types").insertOne(newType)

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        name,
      },
    })
  } catch (error) {
    console.error("Error creating material type:", error)
    return NextResponse.json({ success: false, error: "Error al crear tipo de material" }, { status: 500 })
  }
}
