"""
Genera el mapa de Cuba que usa Planificación, en la web y en la app.

Parte de public/data/cuba-municipios.geojson (geoBoundaries, 168 municipios,
~900 KB) y deja un JSON pequeño ya proyectado, en enteros y sin librerías de
mapas: se pinta como SVG en la web y con Canvas en la app.

- La simplificación va por tramos compartidos: el borde entre dos municipios
  se simplifica una sola vez, así que no aparecen huecos entre vecinos.
- El geojson no trae la provincia de cada municipio; sale de la tabla de abajo
  (división político-administrativa de 2011).
- Los bordes de provincia son los tramos cuyo vecino es de otra provincia o
  no existe (costa).

Uso: python3 scripts/generar-mapa-planificacion.py <salida.json> [otra.json ...]
"""
import json, math, re, sys, unicodedata, collections

ORIGEN = "public/data/cuba-municipios.geojson"
ANCHO = 10000
TOLERANCIA = 1.5

PROVINCIAS = {
    "Pinar del Río": ["Consolación del Sur", "Guane", "La Palma", "Los Palacios", "Mantua", "Minas de Matahambre",
                      "Pinar del Río", "San Juan y Martínez", "San Luis", "Sandino", "Viñales"],
    "Artemisa": ["Alquízar", "Artemisa", "Bahía Honda", "Bauta", "Caimito", "Candelaria", "Guanajay",
                 "Güira de Melena", "Mariel", "San Antonio de los Baños", "San Cristóbal"],
    "La Habana": ["Arroyo Naranjo", "Boyeros", "Centro Habana", "Cerro", "Cotorro", "Diez de Octubre", "Guanabacoa",
                  "Habana del Este", "La Habana Vieja", "La Lisa", "Marianao", "Playa", "Plaza de la Revolución",
                  "Regla", "San Miguel del Padrón"],
    "Mayabeque": ["Batabanó", "Bejucal", "Güines", "Jaruco", "Madruga", "Melena del Sur", "Nueva Paz", "Quivicán",
                  "San José de las Lajas", "San Nicolás", "Santa Cruz del Norte"],
    "Matanzas": ["Calimete", "Cárdenas", "Ciénaga de Zapata", "Colón", "Jagüey Grande", "Jovellanos", "Limonar",
                 "Los Arabos", "Martí", "Matanzas", "Pedro Betancourt", "Perico", "Unión de Reyes"],
    "Cienfuegos": ["Abreus", "Aguada de Pasajeros", "Cienfuegos", "Cruces", "Cumanayagua", "Palmira", "Rodas",
                   "Santa Isabel de las Lajas"],
    "Villa Clara": ["Caibarién", "Camajuaní", "Cifuentes", "Corralillo", "Encrucijada", "Manicaragua", "Placetas",
                    "Quemado de Güines", "Ranchuelo", "Remedios", "Sagua La Grande", "Santa Clara", "Santo Domingo"],
    "Sancti Spíritus": ["Cabaiguán", "Fomento", "Jatibonico", "La Sierpe", "Sancti Spiritus", "Taguasco", "Trinidad",
                        "Yaguajay"],
    "Ciego de Ávila": ["Baraguá", "Bolivia", "Chambas", "Ciego de Ávila", "Ciro Redondo", "Florencia", "Majagua",
                       "Morón", "Primero de Enero", "Venezuela"],
    "Camagüey": ["Camagüey", "Céspedes", "Esmeralda", "Florida", "Guáimaro", "Jimaguayú", "Minas", "Najasa",
                 "Nuevitas", "Santa Cruz del Sur", "Sibanicú", "Sierra de Cubitas", "Vertientes"],
    "Las Tunas": ["Amancio", "Colombia", "Jesús Menéndez", "Jobabo", "Las Tunas", "Majibacoa", "Manati",
                  "Puerto Padre"],
    "Holguín": ["Antilla", "Báguanos", "Banes", "Cacocum", "Calixto García", "Cueto", "Frank País", "Gibara",
                "Holguín", "Mayarí", "Moa", "Rafael Freyre", "Sagua de Tánamo", "Urbano Noris"],
    "Granma": ["Bartolomé Masó", "Bayamo", "Buey Arriba", "Campechuela", "Cauto Cristo", "Guisa", "Jiguaní",
               "Manzanillo", "Media Luna", "Niquero", "Pilón", "Río Cauto", "Yara"],
    "Santiago de Cuba": ["Contramaestre", "Guamá", "Mella", "Palma Soriano", "San Luis", "Santiago de Cuba",
                         "Segundo Frente", "Songo - La Maya", "Tercer Frente"],
    "Guantánamo": ["Baracoa", "Caimanera", "El Salvador", "Guantánamo", "Imías", "Maisí", "Manuel Tames",
                   "Niceto Pérez", "San Antonio del Sur", "Yateras"],
    "Isla de la Juventud": ["Isle of Youth"],
}

# Cómo se escribe de verdad (el geojson trae algunos en inglés o recortados).
NOMBRE_OFICIAL = {
    "Isle of Youth": "Isla de la Juventud",
    "Habana del Este": "La Habana del Este",
    "Céspedes": "Carlos Manuel de Céspedes",
    "Manati": "Manatí",
    "Sancti Spiritus": "Sancti Spíritus",
    "Songo - La Maya": "Songo-La Maya",
    "Sagua La Grande": "Sagua la Grande",
}


def clave(texto):
    t = unicodedata.normalize("NFD", texto)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def area(anillo):
    return sum(anillo[i][0] * anillo[i - 1][1] - anillo[i - 1][0] * anillo[i][1] for i in range(len(anillo))) / 2


def dentro(p, anillo):
    x, y = p
    c = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i]
        xj, yj = anillo[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def rdp(puntos, tol):
    if len(puntos) < 3:
        return puntos
    a, b = puntos[0], puntos[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    largo = math.hypot(dx, dy)
    peor, indice = -1.0, 0
    for i in range(1, len(puntos) - 1):
        px, py = puntos[i]
        if largo == 0:
            d = math.hypot(px - a[0], py - a[1])
        else:
            d = abs(dy * px - dx * py + b[0] * a[1] - b[1] * a[0]) / largo
        if d > peor:
            peor, indice = d, i
    if peor <= tol:
        return [a, b]
    return rdp(puntos[: indice + 1], tol)[:-1] + rdp(puntos[indice:], tol)


def main(salidas):
    geo = json.load(open(ORIGEN))
    feats = geo["features"]

    # Proyección equirectangular corregida por la latitud media de Cuba.
    k = math.cos(math.radians(21.6))
    todos = []
    for f in feats:
        g = f["geometry"]
        for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
            for anillo in poly:
                todos.extend(anillo)
    lon0 = min(p[0] for p in todos)
    lat1 = max(p[1] for p in todos)
    xmax = max((p[0] - lon0) * k for p in todos)
    escala = ANCHO / xmax

    def proyectar(p):
        return (round((p[0] - lon0) * k * escala), round((lat1 - p[1]) * escala))

    # Anillos proyectados, sin puntos repetidos ni el de cierre.
    anillos = []  # (indice_municipio, [puntos])
    for i, f in enumerate(feats):
        g = f["geometry"]
        for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
            for anillo in poly:
                pts = []
                for p in anillo:
                    q = proyectar(p)
                    if not pts or pts[-1] != q:
                        pts.append(q)
                if len(pts) > 1 and pts[0] == pts[-1]:
                    pts.pop()
                if len(pts) >= 3:
                    anillos.append((i, pts))

    # A qué anillos pertenece cada punto: donde cambia, empieza un tramo nuevo.
    de_punto = collections.defaultdict(set)
    for r, (_, pts) in enumerate(anillos):
        for p in pts:
            de_punto[p].add(r)

    cache = {}
    simplificados = []
    for r, (m, pts) in enumerate(anillos):
        n = len(pts)
        nodos = [
            i for i in range(n)
            if de_punto[pts[i]] != de_punto[pts[i - 1]] or de_punto[pts[i]] != de_punto[pts[(i + 1) % n]]
        ]
        if not nodos:
            nodos = [pts.index(min(pts))]
        nuevo = []
        for j, ini in enumerate(nodos):
            fin = nodos[(j + 1) % len(nodos)]
            tramo = [pts[ini]]
            i = ini
            while True:
                i = (i + 1) % n
                tramo.append(pts[i])
                if i == fin:
                    break
            directo = tuple(tramo)
            inverso = tuple(reversed(tramo))
            canonico = min(directo, inverso)
            if canonico not in cache:
                s = rdp(list(canonico), TOLERANCIA)
                if s[0] == s[-1] and len(s) < 4:  # un lazo cerrado no puede quedar en una línea
                    s = list(canonico)[:: max(1, len(canonico) // 4)] + [canonico[-1]]
                cache[canonico] = s
            s = cache[canonico] if canonico == directo else list(reversed(cache[canonico]))
            nuevo.extend(s[:-1])
        compartido = any(len(de_punto[p]) > 1 for p in pts)
        if len(nuevo) >= 3 and (compartido or abs(area(nuevo)) >= 6):
            simplificados.append((m, nuevo))

    # Municipio -> provincia. San Luis existe en dos provincias: decide la longitud.
    provincia_de = {}
    for prov, nombres in PROVINCIAS.items():
        for nombre in nombres:
            provincia_de.setdefault(nombre, []).append(prov)
    faltan = [f["properties"]["shapeName"] for f in feats if f["properties"]["shapeName"] not in provincia_de]
    if faltan:
        sys.exit(f"Municipios sin provincia: {faltan}")

    por_municipio = collections.defaultdict(list)
    for m, pts in simplificados:
        por_municipio[m].append(pts)

    municipios = []
    for i, f in enumerate(feats):
        nombre_geo = f["properties"]["shapeName"]
        rs = por_municipio.get(i)
        if not rs:
            sys.exit(f"{nombre_geo} se quedó sin forma")
        mayor = max(rs, key=lambda a: abs(area(a)))
        cx = sum(p[0] for p in mayor) / len(mayor)
        cy = sum(p[1] for p in mayor) / len(mayor)
        # area() va en sentido contrario a la fórmula del centroide: se le cambia el signo.
        a = -area(mayor)
        if a:
            cx = sum((mayor[j - 1][0] + mayor[j][0]) * (mayor[j - 1][0] * mayor[j][1] - mayor[j][0] * mayor[j - 1][1]) for j in range(len(mayor))) / (6 * a)
            cy = sum((mayor[j - 1][1] + mayor[j][1]) * (mayor[j - 1][0] * mayor[j][1] - mayor[j][0] * mayor[j - 1][1]) for j in range(len(mayor))) / (6 * a)
        if not dentro((cx, cy), mayor):
            # Forma de media luna: el centro cae fuera. Se usa el tramo más ancho a esa altura.
            cortes = []
            for j in range(len(mayor)):
                (x1, y1), (x2, y2) = mayor[j - 1], mayor[j]
                if (y1 > cy) != (y2 > cy):
                    cortes.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
            cortes.sort()
            pares = [(cortes[j], cortes[j + 1]) for j in range(0, len(cortes) - 1, 2)]
            if pares:
                a0, a1 = max(pares, key=lambda t: t[1] - t[0])
                cx = (a0 + a1) / 2
        provs = provincia_de[nombre_geo]
        if len(provs) > 1:
            provs = [provs[0] if cx < ANCHO * 0.4 else provs[1]]
        xs = [p[0] for r in rs for p in r]
        ys = [p[1] for r in rs for p in r]
        nombre = NOMBRE_OFICIAL.get(nombre_geo, nombre_geo)
        municipios.append({
            "n": nombre,
            "k": clave(nombre),
            "p": provs[0],
            "c": [round(cx), round(cy)],
            "b": [min(xs), min(ys), max(xs), max(ys)],
            "r": [[v for p in r for v in p] for r in rs],
            "_a": sum(abs(area(r)) for r in rs),
        })

    # Bordes de provincia: tramos sin vecino o con vecino de otra provincia.
    uso = collections.defaultdict(set)
    for mi, mun in enumerate(municipios):
        for r in mun["r"]:
            pts = list(zip(r[0::2], r[1::2]))
            for j in range(len(pts)):
                a, b = pts[j - 1], pts[j]
                uso[(min(a, b), max(a, b))].add(mun["p"])
    cuenta = collections.Counter()
    for mun in municipios:
        for r in mun["r"]:
            pts = list(zip(r[0::2], r[1::2]))
            for j in range(len(pts)):
                a, b = pts[j - 1], pts[j]
                cuenta[(min(a, b), max(a, b))] += 1
    segmentos = [s for s, provs in uso.items() if len(provs) > 1 or cuenta[s] == 1]

    # Unir segmentos en líneas para que el dibujo sea más barato.
    vecinos = collections.defaultdict(list)
    for a, b in segmentos:
        vecinos[a].append(b)
        vecinos[b].append(a)
    usados = set()
    lineas = []
    for a, b in segmentos:
        if (a, b) in usados:
            continue
        usados.add((a, b))
        linea = [a, b]
        for extremo in (0, 1):
            while True:
                p = linea[-1] if extremo else linea[0]
                sig = None
                for q in vecinos[p]:
                    s = (min(p, q), max(p, q))
                    if s not in usados:
                        sig = q
                        usados.add(s)
                        break
                if sig is None:
                    break
                if extremo:
                    linea.append(sig)
                else:
                    linea.insert(0, sig)
        lineas.append([v for p in linea for v in p])

    provincias = []
    for prov in PROVINCIAS:
        ms = [m for m in municipios if m["p"] == prov]
        total = sum(m["_a"] for m in ms)
        cx = sum(m["c"][0] * m["_a"] for m in ms) / total
        cy = sum(m["c"][1] * m["_a"] for m in ms) / total
        dentro_prov = any(
            dentro((cx, cy), list(zip(r[0::2], r[1::2]))) for m in ms for r in m["r"]
        )
        if not dentro_prov:
            cx, cy = max(ms, key=lambda m: m["_a"])["c"]
        provincias.append({
            "n": prov,
            "k": clave(prov),
            "c": [round(cx), round(cy)],
            "b": [min(m["b"][0] for m in ms), min(m["b"][1] for m in ms),
                  max(m["b"][2] for m in ms), max(m["b"][3] for m in ms)],
        })

    for m in municipios:
        del m["_a"]

    alto = max(m["b"][3] for m in municipios)
    datos = {"ancho": ANCHO, "alto": alto, "provincias": provincias, "municipios": municipios, "bordes": lineas}
    texto = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    for salida in salidas:
        with open(salida, "w") as fh:
            fh.write(texto)
    puntos = sum(len(r) // 2 for m in municipios for r in m["r"])
    print(f"{len(municipios)} municipios, {len(provincias)} provincias, {puntos} puntos, "
          f"{len(lineas)} bordes, {len(texto) / 1024:.0f} KB, alto {alto}")
    for p in provincias:
        print(f"  {p['n']}: {sum(1 for m in municipios if m['p'] == p['n'])}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["planificacion-cuba.json"])
