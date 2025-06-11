import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, type, brand } = body

    if (!name || !type || !brand) {
      return NextResponse.json({ success: false, error: "Nombre, tipo y marca son requeridos" }, { status: 400 })
    }

    const db = await getDatabase()

    // Verificar si existe otro material con el mismo nombre (excluyendo el actual)
    const existingMaterial = await db.collection("materials").findOne({
      name,
      _id: { $ne: new ObjectId(id) },
    })

    if (existingMaterial) {
      return NextResponse.json({ success: false, error: "Ya existe un material con ese nombre" }, { status: 400 })
    }

    const result = await db.collection("materials").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          type,
          brand,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Material no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { id, name, type, brand },
    })
  } catch (error) {
    console.error("Error updating material:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar material" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const db = await getDatabase()

    const result = await db.collection("materials").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Material no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting material:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar material" }, { status: 500 })
  }
}
