"""
Script para inicializar la colección ordenes_trabajo en MongoDB
Incluye creación de índices y datos de prueba
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
import random

# Configuración de conexión
MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "suncar"

# Conectar a MongoDB
client = MongoClient(MONGODB_URL)
db = client[DB_NAME]

print(f"🔌 Conectado a MongoDB: {DB_NAME}")

# Eliminar colección si existe (para testing)
if "ordenes_trabajo" in db.list_collection_names():
    print("⚠️  Colección 'ordenes_trabajo' ya existe. Eliminando...")
    db.ordenes_trabajo.drop()

print("📦 Creando colección 'ordenes_trabajo'...")

# Crear índices para optimizar búsquedas
print("🔍 Creando índices...")

db.ordenes_trabajo.create_index("brigada_id")
db.ordenes_trabajo.create_index("cliente_numero")
db.ordenes_trabajo.create_index([("fecha_ejecucion", -1)])
db.ordenes_trabajo.create_index("estado")
db.ordenes_trabajo.create_index([("fecha_creacion", -1)])
db.ordenes_trabajo.create_index([("estado", 1), ("fecha_ejecucion", -1)])

print("✅ Índices creados correctamente")

# Datos de prueba
print("📝 Insertando datos de prueba...")

# Obtener IDs de brigadas y clientes existentes (o crear algunos de prueba)
brigadas_ejemplo = [
    {"id": "brigada001", "nombre": "Brigada Solar Norte"},
    {"id": "brigada002", "nombre": "Brigada Mantenimiento Centro"},
    {"id": "brigada003", "nombre": "Brigada Instalación Sur"},
]

clientes_ejemplo = [
    {"numero": "CLI001", "nombre": "Empresa ABC S.A."},
    {"numero": "CLI002", "nombre": "Juan Pérez"},
    {"numero": "CLI003", "nombre": "Comercial XYZ"},
    {"numero": "CLI004", "nombre": "María González"},
    {"numero": "CLI005", "nombre": "Industrias DEF"},
]

tipos_reporte = ["inversión", "avería", "mantenimiento"]
estados = ["pendiente", "en_proceso", "completada", "cancelada"]

comentarios_ejemplos = [
    "Instalación de panel solar residencial en techo",
    "Reparación urgente de inversor dañado",
    "Mantenimiento preventivo anual de instalación",
    "Ampliación de sistema solar existente",
    "Revisión de conexiones y cables",
    "Instalación de baterías de respaldo",
    "Limpieza profunda de paneles solares",
    None,  # Sin comentarios
    "Verificación de rendimiento del sistema",
    "Reemplazo de módulo fotovoltaico defectuoso"
]

# Generar órdenes de trabajo de prueba
ordenes_prueba = []

for i in range(20):
    brigada = random.choice(brigadas_ejemplo)
    cliente = random.choice(clientes_ejemplo)
    tipo = random.choice(tipos_reporte)
    estado = random.choice(estados)
    comentario = random.choice(comentarios_ejemplos)
    
    # Generar fechas aleatorias
    dias_desde_creacion = random.randint(0, 30)
    dias_hasta_ejecucion = random.randint(-10, 30)
    
    fecha_creacion = datetime.now() - timedelta(days=dias_desde_creacion)
    fecha_ejecucion = datetime.now() + timedelta(days=dias_hasta_ejecucion)
    
    orden = {
        "brigada_id": brigada["id"],
        "brigada_nombre": brigada["nombre"],
        "cliente_numero": cliente["numero"],
        "cliente_nombre": cliente["nombre"],
        "tipo_reporte": tipo,
        "fecha_ejecucion": fecha_ejecucion.isoformat(),
        "comentarios": comentario,
        "fecha_creacion": fecha_creacion.isoformat(),
        "estado": estado
    }
    
    ordenes_prueba.append(orden)

# Insertar todas las órdenes
result = db.ordenes_trabajo.insert_many(ordenes_prueba)

print(f"✅ Se insertaron {len(result.inserted_ids)} órdenes de trabajo de prueba")

# Mostrar estadísticas
print("\n📊 Estadísticas de la colección:")
print(f"Total de documentos: {db.ordenes_trabajo.count_documents({})}")

for tipo in tipos_reporte:
    count = db.ordenes_trabajo.count_documents({"tipo_reporte": tipo})
    print(f"  - {tipo.capitalize()}: {count}")

for estado in estados:
    count = db.ordenes_trabajo.count_documents({"estado": estado})
    print(f"  - {estado.replace('_', ' ').capitalize()}: {count}")

# Mostrar algunas órdenes de ejemplo
print("\n📋 Ejemplos de órdenes creadas:")
for orden in db.ordenes_trabajo.find().limit(3):
    print(f"\n  ID: {orden['_id']}")
    print(f"  Brigada: {orden['brigada_nombre']}")
    print(f"  Cliente: {orden['cliente_nombre']}")
    print(f"  Tipo: {orden['tipo_reporte']}")
    print(f"  Estado: {orden['estado']}")
    print(f"  Fecha ejecución: {orden['fecha_ejecucion'][:10]}")

print("\n✅ Inicialización completada!")
print("\n💡 Próximos pasos:")
print("   1. Iniciar el servidor FastAPI")
print("   2. Verificar que los endpoints funcionan correctamente")
print("   3. Actualizar el frontend para usar la API real")
print("   4. Probar la integración completa")

# Cerrar conexión
client.close()
