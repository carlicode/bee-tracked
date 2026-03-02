# 📊 Resumen por Driver – Definición y Cálculo de KPIs (BeeZero)

Este documento describe cómo se calcula cada indicador mostrado en la hoja **Resumen por Driver**.

---

## 1. Driver (Nombre de la hoja)

**Descripción:**
Nombre del driver. Se obtiene directamente del nombre de la pestaña correspondiente en el Google Sheet.

---

## 2. Total Carreras

**Cálculo:**
Conteo de todas las filas con datos válidos (excluyendo encabezado).

Representa la cantidad total de servicios registrados por el driver.

---

## 3. Total Km recorridos

**Fórmula lógica:**

Total Km = SUMA(Distancia (km))

Suma total de la columna "Distancia (km)".

---

## 4. Total Facturación (Bs)

**Fórmula lógica:**

Total Facturación = SUMA(Precio (Bs))

Es el total facturado por el driver en el período analizado.

---

## 5. Promedio por carrera

**Fórmula:**

Promedio por carrera = Total Facturación / Total Carreras

Indica cuánto genera en promedio cada servicio.

---

## 6. Promedio Bs por km

**Fórmula:**

Promedio Bs por km = Total Facturación / Total Km recorridos

Mide eficiencia económica por distancia recorrida.

---

## 7. Carreras por hora (si aplica)

**Fórmula estimada:**

Carreras por hora = Total Carreras / Total horas trabajadas

Se utiliza cuando se tiene registro confiable del tiempo total trabajado.

---

## 8. Total "Por hora"

**Cálculo:**
Conteo de registros donde la columna "Por hora" = "si".

---

## 9. Total "Pago por QR"

**Cálculo:**
Conteo de registros donde la columna "Pago por QR" = "si".

---

## 10. Total "A cuenta"

**Cálculo:**
Conteo de registros donde la columna "A cuenta" = "si".

---

## 11. Carreras por pagar

**Cálculo:**
Conteo de registros donde la columna "Observaciones" contiene "por pagar".

Identifica servicios pendientes de cobro.

---

## 12. % Pagadas

**Fórmula:**

% Pagadas = (Total Carreras - Carreras por pagar) / Total Carreras

Se expresa en porcentaje.

---

## 13. Primer servicio (fecha)

**Fórmula:**

Primer servicio = MIN(Fecha)

Fecha más antigua registrada.

---

## 14. Último servicio (fecha)

**Fórmula:**

Último servicio = MAX(Fecha)

Fecha más reciente registrada.

---

## 15. Días activos

**Cálculo:**
Cantidad de fechas únicas registradas en la columna "Fecha".

Representa cuántos días distintos trabajó el driver.

---

## 16. Promedio tiempo por carrera

**Fórmula:**

Promedio tiempo = SUMA(Tiempo en minutos) / Total Carreras con tiempo válido

Requiere que el campo "Tiempo" esté en formato numérico (minutos).

---

## 17. Ticket promedio

**Fórmula:**

Ticket promedio = Total Facturación / Total Carreras

(Equivalente a Promedio por carrera; puede mantenerse separado para claridad ejecutiva.)

---

## 18. Ingreso estimado BeeZero (35%)

**Fórmula:**

Ingreso BeeZero = Total Facturación × 0.35

---

## 19. Ingreso estimado Driver (65%)

**Fórmula:**

Ingreso Driver = Total Facturación × 0.65

---

# 🎯 Objetivo Estratégico

Estos indicadores permiten:

* Medir productividad individual.
* Comparar rendimiento entre drivers.
* Detectar eficiencia por kilómetro.
* Controlar servicios pendientes de pago.
* Proyectar ingresos de la empresa.
* Tomar decisiones operativas y financieras basadas en datos.

Este resumen convierte datos operativos en información ejecutiva accionable.
