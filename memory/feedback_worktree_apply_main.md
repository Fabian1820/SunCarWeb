---
name: Aplicar cambios en proyecto principal
description: El usuario quiere que los cambios se apliquen siempre en el directorio principal del proyecto, no en el worktree
type: feedback
---

Siempre aplicar los cambios directamente en `/Users/yanyhurtado/MIO/Suncar/SunCarWeb/` (proyecto principal), NO en el worktree.

**Why:** El servidor de desarrollo corre desde el proyecto principal. Los cambios en el worktree (`claude/gifted-robinson`) no son visibles en el servidor activo.

**How to apply:** Cuando termines de editar/crear archivos en el worktree, replica inmediatamente los mismos cambios en el proyecto principal. Si solo trabajas en el proyecto principal desde el inicio, mejor aún.
