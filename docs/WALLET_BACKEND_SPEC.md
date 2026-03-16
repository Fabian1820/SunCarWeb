# Wallet / Billetera - Backend Spec

## Objetivo
Crear una billetera virtual manual por usuario autenticado, registrar ingresos/gastos con motivo obligatorio, y exponer un historial global visible para todos los usuarios con permiso del módulo `wallet`.

## Reglas de negocio obligatorias
1. Una sola billetera por usuario (`user_ci` único).
2. `POST /wallet/me/inicializar` debe ser idempotente:
   - Si no existe, crea la billetera.
   - Si ya existe, devuelve la existente (200).
3. Todas las transacciones son manuales, requieren `motivo` y NO se pueden eliminar.
4. Cada transacción debe guardar trazabilidad:
   - `created_by_ci`, `created_by_nombre`
   - `wallet_user_ci`, `wallet_user_nombre`
   - `saldo_anterior`, `saldo_posterior`
   - `created_at`
5. El listado global devuelve transacciones de todas las billeteras.
6. Operación de registrar transacción debe ser atómica (transacción DB).
7. Validación de saldo:
   - Si `tipo = gasto`, `monto <= saldo_actual`.

---

## Endpoints exactos

### 1) Inicializar billetera del usuario autenticado
`POST /api/wallet/me/inicializar`

**Auth:** JWT requerido (Bearer).

**Body:** vacío.

**Response 200**
```json
{
  "success": true,
  "message": "Billetera activa",
  "data": {
    "id": "wallet_01",
    "user_ci": "12345678",
    "user_nombre": "Juan Perez",
    "saldo_actual": 0,
    "moneda": "USD",
    "estado": "activa",
    "created_at": "2026-03-16T10:00:00Z",
    "updated_at": "2026-03-16T10:00:00Z",
    "initialized_by_ci": "12345678"
  }
}
```

---

### 2) Obtener billetera del usuario autenticado
`GET /api/wallet/me`

**Auth:** JWT requerido.

**Response 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "wallet_01",
    "user_ci": "12345678",
    "user_nombre": "Juan Perez",
    "saldo_actual": 1450.5,
    "moneda": "USD",
    "estado": "activa",
    "created_at": "2026-03-16T10:00:00Z",
    "updated_at": "2026-03-16T11:30:00Z"
  }
}
```

**Response 404**
```json
{
  "success": false,
  "message": "La billetera del usuario no existe"
}
```

---

### 3) Registrar transacción manual en mi billetera
`POST /api/wallet/transacciones`

**Auth:** JWT requerido.

**Body**
```json
{
  "tipo": "ingreso",
  "monto": 1500,
  "motivo": "Cobro en efectivo de cliente #C-2231",
  "referencia_externa": "REC-2026-0001"
}
```

**Reglas**
- `tipo` solo `ingreso | gasto`
- `monto > 0`
- `motivo` requerido, min 5 chars, max 500
- si `tipo = gasto`, validar saldo suficiente

**Response 201**
```json
{
  "success": true,
  "message": "Transacción registrada",
  "data": {
    "id": "trx_01",
    "wallet_id": "wallet_01",
    "wallet_user_ci": "12345678",
    "wallet_user_nombre": "Juan Perez",
    "tipo": "ingreso",
    "monto": 1500,
    "motivo": "Cobro en efectivo de cliente #C-2231",
    "saldo_anterior": 0,
    "saldo_posterior": 1500,
    "created_at": "2026-03-16T11:00:00Z",
    "created_by_ci": "12345678",
    "created_by_nombre": "Juan Perez",
    "referencia_externa": "REC-2026-0001",
    "es_manual": true
  }
}
```

---

### 4) Listado global de transacciones (todas las billeteras)
`GET /api/wallet/transacciones`

**Auth:** JWT requerido.

**Query params**
- `tipo` (`ingreso|gasto`) opcional
- `skip` (default `0`)
- `limit` (default `50`, max recomendado `500`)
- `fecha_desde` (ISO datetime) opcional
- `fecha_hasta` (ISO datetime) opcional

**Response 200**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "trx_02",
      "wallet_id": "wallet_02",
      "wallet_user_ci": "87654321",
      "wallet_user_nombre": "Maria Lopez",
      "tipo": "gasto",
      "monto": 120,
      "motivo": "Compra de útiles de oficina",
      "saldo_anterior": 800,
      "saldo_posterior": 680,
      "created_at": "2026-03-16T11:15:00Z",
      "created_by_ci": "87654321",
      "created_by_nombre": "Maria Lopez",
      "es_manual": true
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 50
}
```

---

### 5) Obtener detalle de una transacción
`GET /api/wallet/transacciones/{transaccion_id}`

**Auth:** JWT requerido.

**Response 200**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "trx_01",
    "wallet_id": "wallet_01",
    "wallet_user_ci": "12345678",
    "wallet_user_nombre": "Juan Perez",
    "tipo": "ingreso",
    "monto": 1500,
    "motivo": "Cobro en efectivo de cliente #C-2231",
    "saldo_anterior": 0,
    "saldo_posterior": 1500,
    "created_at": "2026-03-16T11:00:00Z",
    "created_by_ci": "12345678",
    "created_by_nombre": "Juan Perez",
    "referencia_externa": "REC-2026-0001",
    "es_manual": true
  }
}
```

---

## Schemas exactos (Pydantic)

```python
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field, condecimal, constr

WalletEstado = Literal["activa", "bloqueada"]
WalletTransactionTipo = Literal["ingreso", "gasto"]

class WalletOut(BaseModel):
    id: str
    user_ci: str
    user_nombre: str
    saldo_actual: Decimal
    moneda: str = "USD"
    estado: WalletEstado = "activa"
    created_at: datetime
    updated_at: Optional[datetime] = None
    initialized_by_ci: Optional[str] = None

class WalletTransactionCreateIn(BaseModel):
    tipo: WalletTransactionTipo
    monto: condecimal(gt=0, max_digits=14, decimal_places=2)
    motivo: constr(min_length=5, max_length=500)
    referencia_externa: Optional[constr(max_length=120)] = None

class WalletTransactionOut(BaseModel):
    id: str
    wallet_id: str
    wallet_user_ci: str
    wallet_user_nombre: str
    tipo: WalletTransactionTipo
    monto: Decimal
    motivo: str
    saldo_anterior: Decimal
    saldo_posterior: Decimal
    created_at: datetime
    created_by_ci: str
    created_by_nombre: str
    referencia_externa: Optional[str] = None
    es_manual: bool = True

class WalletTransactionListOut(BaseModel):
    success: bool = True
    message: str = "OK"
    data: list[WalletTransactionOut]
    total: int
    skip: int
    limit: int
```

---

## Persistencia mínima sugerida

### Tabla/Colección `wallets`
- `id`
- `user_ci` (unique index)
- `user_nombre`
- `saldo_actual`
- `moneda`
- `estado`
- `created_at`
- `updated_at`
- `initialized_by_ci`

### Tabla/Colección `wallet_transactions`
- `id`
- `wallet_id` (index)
- `wallet_user_ci` (index)
- `wallet_user_nombre`
- `tipo` (index)
- `monto`
- `motivo`
- `saldo_anterior`
- `saldo_posterior`
- `created_at` (index desc)
- `created_by_ci` (index)
- `created_by_nombre`
- `referencia_externa`
- `es_manual`

**Importante:** no crear endpoint `DELETE` para transacciones.
