/** US-015 / T-007, 2026-10-29. Reopen the actual exported OOXML to verify cells and privacy. */
import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { analyticsXlsx } from "./analyticsXlsx.js";
import { buildAnalyticsReport } from "./analyticsReport.js";
import { parseReportQuery } from "./analyticsPolicy.js";
test("Excel contains typed aggregate values, explicit missing data and no raw identifiers", async () => {
  const asOf = new Date("2026-10-29T15:00:00Z");
  const input = {
    views: [],
    events: [],
    facts: [],
    coverage: { start: null, pauses: [] },
    asOf,
    windowDays: 7,
  };
  const report = buildAnalyticsReport(
    input,
    parseReportQuery({ from: "2026-10-01", to: "2026-10-02" }).periods,
  );
  const bytes = await analyticsXlsx(report);
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as any);
  assert.deepEqual(
    wb.worksheets.map((s) => s.name),
    ["Resumen", "Detalle diario"],
  );
  assert.equal(
    wb.getWorksheet("Resumen")!.getCell("B8").value,
    "No disponible",
  );
  assert(wb.getWorksheet("Resumen")!.getCell("B2").value instanceof Date);
  assert.equal(wb.getWorksheet("Detalle diario")!.rowCount, 3);
  const text = JSON.stringify(wb.model);
  for (const secret of [
    "patientDni",
    "patientName",
    "orderId",
    "visitorId",
    "sessionId",
    "medicationText",
  ])
    assert(!text.includes(secret));
});
