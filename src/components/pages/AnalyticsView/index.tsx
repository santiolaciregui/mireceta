/** US-015 / T-006, 2026-10-29. Small tenant-admin report with the same query for screen and Excel. */
import React, { useState } from "react";
import { Download, Plus, Trash2, BarChart3, LoaderCircle } from "lucide-react";
import { apiFetch } from "../../../services/api";
import { METRIC_LABELS, type PeriodReport } from "../../../analytics/contracts";
interface Report {
  asOf: string;
  captureStartedAt: string | null;
  observationWindowDays: number;
  periods: PeriodReport[];
  total: PeriodReport;
  lastReconciledAt: string | null;
  reconciliationError: boolean;
}
const date = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const reportError = (error: unknown) => {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    INVALID_RANGE:
      "Cada período admite hasta 90 días y debe terminar después de su fecha inicial.",
    OVERLAPPING_PERIODS:
      "Los períodos no pueden superponerse. Revisá las fechas.",
    INVALID_WINDOW: "La ventana de conversión debe estar entre 1 y 30 días.",
    ANALYTICS_NOT_CONFIGURED:
      "La analítica todavía no está configurada en este entorno.",
    ANALYTICS_REPORT_DENIED:
      "No tenés permisos para consultar la analítica de este centro.",
    ANALYTICS_REPORT_TOO_LARGE:
      "El informe es demasiado grande. Elegí períodos más cortos.",
    ANALYTICS_UNAVAILABLE:
      "La analítica no está disponible temporalmente. Intentá nuevamente.",
  };
  return (
    messages[code] ||
    "No se pudo consultar el informe. Revisá los rangos, los permisos y la configuración de analítica."
  );
};
export default function AnalyticsView() {
  const [periods, setPeriods] = useState([
    {
      from: date(new Date(Date.now() - 6 * 86400000)),
      to: date(new Date()),
      label: "Período 1",
    },
  ]);
  const [windowDays, setWindowDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [usedQuery, setUsedQuery] = useState("");
  const query = () =>
    new URLSearchParams({
      periods: JSON.stringify(periods),
      windowDays: String(windowDays),
    }).toString();
  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const q = query();
      const r = await apiFetch(`/api/analytics/report?${q}`);
      setReport(await r.json());
      setUsedQuery(q);
    } catch (error) {
      setError(reportError(error));
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    setExporting(true);
    setError("");
    try {
      const r = await apiFetch(`/api/analytics/report.xlsx?${usedQuery}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MiReceta-analitica.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No se pudo descargar el Excel. Intentá nuevamente.");
    } finally {
      setExporting(false);
    }
  };
  const format = (p: PeriodReport, k: string) => {
    const m = p.metrics[k];
    if (m?.value == null)
      return m?.reason === "not_applicable" ? "No aplica" : "No disponible";
    return [
      "visitToForm",
      "visitToOrder",
      "formToOrder",
      "visitToPayment",
      "orderToPayment",
    ].includes(k)
      ? new Intl.NumberFormat("es-AR", {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(m.value)
      : new Intl.NumberFormat("es-AR", {
          maximumFractionDigits: k === "activeSeconds" ? 1 : 0,
        }).format(m.value);
  };
  const coverage = (p: PeriodReport) =>
    p.coverage === "unavailable"
      ? "Sin datos de captura"
      : p.coverage === "partial"
        ? "Cobertura parcial"
        : "Captura disponible";
  const rows = [
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
    "validationFailures",
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
    "stopped_info",
    "stopped_identification",
    "stopped_medication",
    "stopped_payment",
    "stopped_confirmation",
    "unpaidPending",
    "unpaidRejected",
    "unpaidCancelled",
    "unpaidTransfer",
    "businessPatient",
    "businessStaff",
    "businessApproved",
    "businessExempt",
    "businessPending",
    "businessRejected",
    "businessRefunded",
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 text-slate-900">
      <header>
        <div className="mb-2 flex items-center gap-2 text-blue-700">
          <BarChart3 size={20} />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Medición propia
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Analítica web</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Consultá las visitas estimadas, el avance del formulario y los pagos.
          Compará hasta tres períodos y descargá los resultados.
        </p>
      </header>
      <form
        onSubmit={load}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        {periods.map((p, i) => (
          <fieldset
            key={i}
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <legend className="sr-only">Período {i + 1}</legend>
            <label className="text-xs font-semibold">
              Nombre
              <input
                maxLength={80}
                required
                value={p.label}
                onChange={(e) =>
                  setPeriods((v) =>
                    v.map((r, j) =>
                      j === i ? { ...r, label: e.target.value } : r,
                    ),
                  )
                }
                className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold">
              Desde
              <input
                type="date"
                required
                value={p.from}
                onChange={(e) =>
                  setPeriods((v) =>
                    v.map((r, j) =>
                      j === i ? { ...r, from: e.target.value } : r,
                    ),
                  )
                }
                className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold">
              Hasta
              <input
                type="date"
                required
                min={p.from}
                value={p.to}
                onChange={(e) =>
                  setPeriods((v) =>
                    v.map((r, j) =>
                      j === i ? { ...r, to: e.target.value } : r,
                    ),
                  )
                }
                className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal"
              />
            </label>
            <button
              type="button"
              disabled={periods.length === 1}
              aria-label={`Quitar período ${i + 1}`}
              onClick={() => setPeriods((v) => v.filter((_, j) => j !== i))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <Trash2 size={18} />
            </button>
          </fieldset>
        ))}
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <button
              disabled={periods.length === 3}
              type="button"
              onClick={() =>
                setPeriods((v) => [
                  ...v,
                  { from: "", to: "", label: `Período ${v.length + 1}` },
                ])
              }
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
            >
              <Plus size={16} />
              Agregar período
            </button>
            <label className="text-xs font-semibold">
              Ventana de conversión (días)
              <input
                type="number"
                min={1}
                max={30}
                required
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className="mt-1 block min-h-11 w-24 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
          </div>
          <button
            disabled={busy}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy && <LoaderCircle size={17} className="animate-spin" />}
            Consultar
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Fechas inclusivas de Argentina. Hasta 90 días por período, sin
          solapamiento.
        </p>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      {!report && !busy && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Elegí los períodos y presioná Consultar para ver los resultados.
        </div>
      )}
      {report && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-xs leading-relaxed text-slate-500">
              Consulta:{" "}
              {new Date(report.asOf).toLocaleString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                hour12: false,
              })}
              <br />
              Captura desde:{" "}
              {report.captureStartedAt
                ? new Date(report.captureStartedAt).toLocaleString("es-AR", {
                    timeZone: "America/Argentina/Buenos_Aires",
                    hour12: false,
                  })
                : "Sin activación registrada"}
            </div>
            <button
              onClick={download}
              disabled={exporting}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 disabled:opacity-60"
            >
              <Download size={17} />
              {exporting ? "Preparando…" : "Descargar Excel"}
            </button>
          </div>
          {(!report.lastReconciledAt || report.reconciliationError) && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              La conciliación de analítica aún no se completó o requiere
              revisión. Los datos pueden estar incompletos.
            </p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-4 font-semibold">Métrica</th>
                  {[...report.periods, report.total].map((p, i) => (
                    <th key={i} className="p-4 text-right font-semibold">
                      <div>{p.label}</div>
                      <div className="mt-1 text-[11px] font-normal text-slate-500">
                        {coverage(p)}
                      </div>
                      {p.inObservation && (
                        <div className="mt-1 text-[11px] font-medium text-amber-700">
                          En observación
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((k) => (
                  <tr
                    key={k}
                    className={k.startsWith("business") ? "bg-slate-50/60" : ""}
                  >
                    <th className="p-4 text-left text-xs font-medium text-slate-600">
                      {METRIC_LABELS[k]}
                    </th>
                    {[...report.periods, report.total].map((p, i) => (
                      <td key={i} className="p-4 text-right tabular-nums">
                        {format(p, k)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-500">
            Visitantes significa navegadores estimados. El tiempo activo no
            incluye pestañas ocultas ni inactividad prolongada. Las conversiones
            usan la ventana de {report.observationWindowDays} días; el volumen
            de solicitudes muestra su estado al consultar. Sin datos no equivale
            a cero. La descarga realiza una consulta nueva con los mismos
            filtros y puede incorporar actividad posterior.
          </p>
        </section>
      )}
    </div>
  );
}
