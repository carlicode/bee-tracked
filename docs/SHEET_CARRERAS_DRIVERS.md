# Hoja Google Sheets – Carreras BeeZero (Drivers)

Este documento describe la hoja de Google Sheets para el registro de carreras de BeeZero (conductores/Abejitas).

## Spreadsheet

- **URL**: https://docs.google.com/spreadsheets/d/1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs/edit
- **ID**: `1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs`
- **Variable de entorno**: `CARRERAS_DRIVERS_SHEET_ID` (si no está definida, se usa `CARRERAS_BIKERS_SHEET_ID`)

## Estructura

- **Una pestaña por driver**: Cada conductor (Abejita) tiene su propia pestaña con su nombre.
- **Creación automática**: Si la pestaña no existe, se crea al registrar la primera carrera.
- **IDs consecutivos**: CarreraId empieza en 0 y es incremental por driver (0, 1, 2...).

## Columnas (fila 1 = encabezados)

| Columna | Nombre header      | Descripción                    | Ejemplo |
|---------|--------------------|--------------------------------|---------|
| A       | CarreraId          | Número consecutivo (0, 1, 2…)  | 0, 1, 2 |
| B       | Abejita            | Nombre del conductor           | Carlicode Bee |
| C       | Fecha              | Fecha de la carrera (YYYY-MM-DD)| 2026-02-28 |
| D       | Cliente            | Nombre del cliente             | AeroContact |
| E       | Hora Inicio        | Hora de inicio (HH:mm)         | 23:17 |
| F       | Hora Fin           | Hora de fin (HH:mm)            | 23:34 |
| G       | Lugar Recojo       | Origen / punto de recogida     | Tarija, Bolivia |
| H       | Lugar Destino      | Destino                        | Capitán Ñuflo |
| I       | Tiempo             | Duración del viaje             | 0:17 |
| J       | Distancia (km)     | Distancia en kilómetros        | 9.5 |
| K       | Precio (Bs)        | Precio en bolivianos           | 18 |
| L       | Observaciones      | Notas adicionales              | Cliente amable |
| M       | Foto               | URL de foto en S3 (opcional)   | https://... |
| N       | Timestamp Creación | Fecha/hora de registro (ISO)   | 2026-02-28T03:17:00.000Z |
| O       | Por hora           | "si" si es carrera por hora, "no" si no | si, no |

## Compartir con la cuenta de servicio

Comparte el spreadsheet con el email de la **cuenta de servicio** de Google con permiso **Editor**:
- `bee-tracked-service@beezero.iam.gserviceaccount.com`

## Flujo

1. **Registrar carrera**: El usuario BeeZero envía el formulario "Registrar carrera".
2. El backend busca/crea la pestaña con el nombre del driver (Abejita).
3. Calcula el siguiente CarreraId (rowCount - 1 si hay datos, 0 si es la primera fila).
4. Añade una fila con todos los datos.
