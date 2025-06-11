import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { MaterialDocument } from "@/lib/models/material"

export async function GET() {
  try {
    const db = await getDatabase()
    const materials = await db.collection<MaterialDocument>("materials").find({}).toArray()

    return NextResponse.json({
      success: true,
      data: materials.map((material) => ({
        id: material._id?.toString(),
        name: material.name,
        type: material.type,
        brand: material.brand,
      })),
    })
  } catch (error) {
    console.error("Error fetching materials:", error)
    return NextResponse.json({ success: false, error: "Error al obtener materiales" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, brand } = body

    if (!name || !type || !brand) {
      return NextResponse.json({ success: false, error: "Nombre, tipo y marca son requeridos" }, { status: 400 })
    }

    const db = await getDatabase()

    // Verificar si ya existe un material con el mismo nombre
    const existingMaterial = await db.collection("materials").findOne({ name })
    if (existingMaterial) {
      return NextResponse.json({ success: false, error: "Ya existe un material con ese nombre" }, { status: 400 })
    }

    const newMaterial: MaterialDocument = {
      name,
      type,
      brand,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("materials").insertOne(newMaterial)

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        name,
        type,
        brand,
      },
    })
  } catch (error) {
    console.error("Error creating material:", error)
    return NextResponse.json({ success: false, error: "Error al crear material" }, { status: 500 })
  }
}
