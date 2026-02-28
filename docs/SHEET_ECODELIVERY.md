# Hojas Google Sheets – Ecodelivery

Este documento describe las dos hojas de Google Sheets utilizadas para Ecodelivery:
1. **Turnos Ecodelivery** (iniciar/cerrar turno)
2. **Carreras_bikers** (registro de deliveries por biker)

---

## 1. Hoja: Turnos Ecodelivery

### Spreadsheet

- **URL**: https://docs.google.com/spreadsheets/d/1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8/
- **ID**: `1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8`
- **Hoja (pestaña)**: crear una pestaña llamada **`Ecodelivery`** (mismo nombre que en `GOOGLE_SHEET_ID` si usas este spreadsheet).

### Columnas (fila 1 = encabezados)

| Columna | Nombre header      | Descripción                    | Ejemplo |
|---------|--------------------|--------------------------------|---------|
| A       | TurnoId            | Número consecutivo (0, 1, 2…)  | 0, 1, 2 |
| B       | Usuario            | Nombre del biker (usuario)     | Jhon Kevin Fernandez |
| C       | Fecha Inicio       | Fecha de inicio (YYYY-MM-DD)   | 2026-02-07 |
| D       | Hora Inicio        | Hora de inicio (HH:MM)         | 08:30 |
| E       | Lat Inicio         | Latitud al iniciar             | -17.123456 |
| F       | Lng Inicio         | Longitud al iniciar            | -63.654321 |
| G       | Timestamp Inicio   | ISO completo inicio            | 2026-02-07T08:30:00.000Z |
| H       | Foto Inicio        | URL de la foto en S3 (opcional)| https://... |
| I       | Fecha Cierre       | Fecha de cierre                | 2026-02-07 |
| J       | Hora Cierre        | Hora de cierre (HH:MM)         | 14:00 |
| K       | Lat Cierre         | Latitud al cerrar              | -17.123456 |
| L       | Lng Cierre         | Longitud al cerrar             | -63.654321 |
| M       | Timestamp Cierre   | ISO completo cierre           | 2026-02-07T14:00:00.000Z |
| N       | Foto Cierre        | URL de la foto en S3 (opcional)| https://... |
| O       | Estado             | INICIADO o CERRADO             | CERRADO |
| P       | Timestamp Creación | createdAt (ISO)               | 2026-02-07T08:30:00.000Z |
| Q       | Timestamp Actualización | updatedAt (ISO)           | 2026-02-07T14:00:00.000Z |

### Cómo crear la hoja

1. Abre el spreadsheet con el enlace de arriba.
2. Crea una **nueva pestaña** (abajo) y nómbrala **Ecodelivery**.
3. En la **fila 1** pega o escribe exactamente estos headers (una celda por columna, en este orden). Puedes copiar esta línea y pegarla en la fila 1 (pegar en la celda A1 y que se separen por columnas, o pegar cada uno en A1, B1, C1…):

   ```
   TurnoId	Usuario	Fecha Inicio	Hora Inicio	Lat Inicio	Lng Inicio	Timestamp Inicio	Foto Inicio	Fecha Cierre	Hora Cierre	Lat Cierre	Lng Cierre	Timestamp Cierre	Foto Cierre	Estado	Timestamp Creación	Timestamp Actualización
   ```

   (Separados por tabulación; en Google Sheets al pegar desde Excel o con tabulaciones se reparten en columnas.)

4. Comparte el spreadsheet con el email de la **cuenta de servicio** de Google (la que usa `GOOGLE_CREDENTIALS_PATH` o `GOOGLE_CREDENTIALS_JSON`) con permiso **Editor**, para que el backend pueda escribir.

### Flujo

- **Iniciar turno**: el backend añade una fila con datos de inicio y deja vacíos Fecha/Hora/Lat/Lng/Timestamp/Foto Cierre; Estado = INICIADO.
- **Cerrar turno**: el backend localiza la fila por **TurnoId** (columna A) y actualiza Fecha Cierre, Hora Cierre, ubicación, foto cierre, Estado = CERRADO y Timestamp Actualización.

### Fotos en S3

Las fotos de turnos se guardan en: **`Registros_BeeTracked/Ecodelivery/Turnos/`**

Formato del archivo: `{usuario}_{YYYY-MM-DD}_{HH-mm-ss}_{inicio|cierre}.jpg`

---

## 2. Hoja: Carreras_bikers

### Spreadsheet

- **URL**: https://docs.google.com/spreadsheets/d/1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs/
- **ID**: `1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs`
- **Hojas (pestañas)**: Cada biker tiene su propia pestaña con su nombre (ej: "Jhon Kevin Fernandez"). Si no existe, se crea automáticamente al registrar su primer delivery.

### Columnas (fila 1 = encabezados)

| Columna | Nombre header      | Descripción                    | Ejemplo |
|---------|--------------------|--------------------------------|---------|
| A       | DeliveryId         | Número consecutivo (0, 1, 2…)  | 0, 1, 2 |
| B       | Biker              | Nombre del biker               | Jhon Kevin Fernandez |
| C       | Fecha Registro     | Fecha de registro (YYYY-MM-DD) | 2026-02-07 |
| D       | Hora Registro      | Hora de registro (HH:MM)       | 08:30 |
| E       | Cliente            | Nombre del cliente             | Juan Pérez |
| F       | Lugar Origen       | Dirección de recogida          | Av. 6 de Agosto |
| G       | Hora Inicio        | Hora de inicio (HH:MM)         | 08:45 |
| H       | Lugar Destino      | Dirección de entrega           | Plaza Murillo |
| I       | Hora Fin           | Hora de finalización (HH:MM)   | 09:15 |
| J       | Distancia (km)     | Distancia en kilómetros        | 2.5 |
| K       | Por Hora           | Carrera por hora (Sí/No)       | Sí |
| L       | Notas              | Observaciones adicionales      | Cliente amable |
| M       | Foto               | URL de la foto en S3 (opcional)| https://... |

### Cómo crear la hoja

1. Abre el spreadsheet con el enlace de arriba.
2. Las pestañas para cada biker se crean **automáticamente** la primera vez que registran un delivery.
3. Comparte el spreadsheet con el email de la **cuenta de servicio** de Google (la que usa `GOOGLE_CREDENTIALS_PATH` o `GOOGLE_CREDENTIALS_JSON`) con permiso **Editor**.

### Flujo

- **Registrar delivery**: el backend busca/crea la pestaña del biker y añade una fila con todos los datos del delivery.
- **DeliveryId**: Número consecutivo que inicia en 0 para cada biker.

### Fotos en S3

Las fotos de deliveries se guardan en: **`Registros_BeeTracked/Ecodelivery/Deliveries/`**

Formato del archivo: `{usuario}_{YYYY-MM-DD}_{HH-mm-ss}.jpg`
