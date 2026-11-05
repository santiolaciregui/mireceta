/** US-015 / T-006, 2026-10-29. A real OOXML workbook with aggregated data only. */
import ExcelJS from "exceljs";
import {
  METRIC_LABELS,
  type PeriodReport,
} from "../../src/analytics/contracts.js";
import type { buildAnalyticsReport } from "./analyticsReport.js";
export async function analyticsXlsx(
  report: ReturnType<typeof buildAnalyticsReport>,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MiReceta";
  wb.created = new Date(report.asOf);
  const sheet = wb.addWorksheet("Resumen", {
    views: [{ showGridLines: false }],
  });
  sheet.addRow(["MiReceta · Analítica web"]);
  sheet.addRow([
    "Estado observado durante la consulta",
    new Date(Date.parse(report.asOf) - 3 * 3600000),
  ]);
  sheet.getCell("B2").numFmt = "dd/mm/yyyy hh:mm";
  sheet.addRow(["Zona horaria", "Argentina (UTC-3)"]);
  sheet.addRow(["Ventana de conversión (días)", report.observationWindowDays]);
  const cols = [...report.periods, report.total];
  sheet.addRow(["Métrica", ...cols.map((p) => p.label)]);
  sheet.addRow([
    "Cobertura",
    ...cols.map((p) =>
      p.coverage === "unavailable"
        ? "No disponible"
        : p.coverage === "partial"
          ? "Parcial"
          : "Completa",
    ),
  ]);
  sheet.addRow([
    "Observación",
    ...cols.map((p) =>
      p.inObservation ? "En observación" : "Ventana cerrada",
    ),
  ]);
  const metricOrder = [
    ...new Set([
      "visitors",
      "sessions",
      "views",
      "activeSeconds",
      "missingSamples",
      "attempts",
      "startedAttempts",
      "step_info",
      "step_identification",
      "step_medication",
      "step_payment",
      "step_confirmation",
      "attributedOrders",
      "paidOrders",
      "exempt",
      "unknownApproval",
      "unlinked",
      "visitToForm",
      "visitToOrder",
      "formToOrder",
      "visitToPayment",
      "orderToPayment",
      "unsubmitted",
      ...Object.keys(METRIC_LABELS),
    ]),
  ];
  for (const key of metricOrder) {
    const label = METRIC_LABELS[key];
    const row = sheet.addRow([
      label,
      ...cols.map(
        (p) =>
          p.metrics[key]?.value ??
          (p.metrics[key]?.reason === "not_applicable"
            ? "No aplica"
            : "No disponible"),
      ),
    ]);
    if (
      [
        "visitToForm",
        "visitToOrder",
        "formToOrder",
        "visitToPayment",
        "orderToPayment",
      ].includes(key)
    )
      row.eachCell((cell, i) => {
        if (i > 1) cell.numFmt = "0.0%";
      });
    else if (key === "activeSeconds")
      row.eachCell((cell, i) => {
        if (i > 1) cell.numFmt = "0.0";
      });
  }
  sheet.addRow([]);
  for (const text of [
    "Visitantes = navegadores estimados; varias pestañas son sesiones distintas. No identifica personas únicas.",
    "Permanencia = tiempo activo observado. Pestañas ocultas, sin foco o inactivas no suman.",
    "Tasas por cohorte de sesiones y ventana de observación. Exenciones y personal se distinguen de pagos de pacientes.",
    "El volumen de negocio usa fecha de creación y estado actual al corte. No es el embudo de visitas.",
    "Un intento sin envío observado es una interrupción estimada, no una prueba de abandono.",
    "Las cifras anteriores a la activación no están disponibles. Las trazas diagnósticas anteriores no completan esta serie.",
    "Visitantes del total y del período se calculan por unión. Sumar visitantes diarios puede contar el mismo navegador varias veces.",
    "La captura del navegador puede perder eventos. Un dato no disponible no equivale a cero.",
  ])
    sheet.addRow([text]);
  const daily = wb.addWorksheet("Detalle diario", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  const keys = [
    "visitors",
    "sessions",
    "views",
    "activeSeconds",
    "attempts",
    "attributedOrders",
    "paidOrders",
    "businessPatient",
    "businessStaff",
    "unlinked",
  ];
  daily.addRow([
    "Día de inicio de cohorte",
    "Cobertura",
    ...keys.map((k) => METRIC_LABELS[k]),
  ]);
  for (const p of report.daily)
    daily.addRow([
      new Date(`${p.from}T00:00:00Z`),
      p.coverage,
      ...keys.map((k) => p.metrics[k]?.value ?? "No disponible"),
    ]);
  daily.getColumn(1).numFmt = "dd/mm/yyyy";
  daily.getColumn(6).numFmt = "0.0";
  for (const [s, header] of [
    [sheet, 5],
    [daily, 1],
  ] as const) {
    s.columns.forEach(
      (c, i) =>
        (c.width = s === sheet ? (i === 0 ? 58 : 25) : i === 0 ? 24 : 24),
    );
    s.eachRow((r) => {
      r.height = 24;
      r.eachCell((cell) => {
        cell.font = { name: "Arial", size: 11, color: { argb: "FF253448" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: typeof cell.value === "number" ? "right" : "left",
        };
      });
    });
    s.getRow(header).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF243D5A" },
      };
      cell.font = {
        name: "Arial",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
    s.getRow(header).height = 44;
  }
  sheet.getCell("A1").font = { name: "Arial", size: 16, bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
