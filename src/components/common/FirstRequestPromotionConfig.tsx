/** US-016, 2026-11-10: independent administrative configuration, off by default. */
import React, { useEffect, useState } from 'react';
import { apiFetchJson } from '../../services/api';
import { PROMOTION_START } from '../../types/firstRequestPromotion';
import { promotionDayBoundary, promotionCalendarDay } from '../../utils/promotionDates';
export default function FirstRequestPromotionConfig() {
  const [config, setConfig] = useState<{ enabled: boolean; startsAt: string; endsAt: string } | null>(null);
  const [startDate, setStartDate] = useState(promotionCalendarDay(PROMOTION_START));
  const [endDate, setEndDate] = useState('2026-12-15');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiFetchJson<any>('/api/first-request-promotion/config').then(c => {
    setConfig(c); setStartDate(promotionCalendarDay(c.startsAt || PROMOTION_START)); setEndDate(promotionCalendarDay(c.endsAt, true));
  }).catch(e => setMessage(e.message)); }, []);
  const save = async () => {
    if (!config || busy) return;
    setBusy(true); setMessage('');
    try {
      const startsAt = promotionDayBoundary(startDate);
      const endsAt = promotionDayBoundary(endDate, true);
      if (Date.parse(startsAt) >= Date.parse(endsAt)) throw new Error('La fecha hasta debe ser igual o posterior a la fecha desde.');
      setConfig(await apiFetchJson<any>('/api/first-request-promotion/config', { method: 'PUT', body: JSON.stringify({ enabled: config.enabled, startsAt, endsAt }) }));
      setMessage('Promoción guardada. Las bonificaciones ya confirmadas se conservan.');
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 p-5 space-y-3" aria-label="Promoción primera solicitud">
    <h3 className="font-bold">Primera receta gratis</h3>
    <p className="text-sm text-slate-600">Una vez por cuenta sin pagos anteriores. Hasta 2 medicamentos con carga manual; se cobra el excedente.</p>
    {config && <><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={config.enabled} disabled={busy} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />Habilitar promoción</label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Fecha desde (inclusive)<input type="date" value={startDate} max={endDate || undefined} disabled={busy} onChange={e => setStartDate(e.target.value)} className="block w-full rounded-lg border p-2 mt-1" /></label>
    <label className="block text-sm">Fecha hasta (inclusive)<input type="date" value={endDate} min={startDate || undefined} disabled={busy} onChange={e => setEndDate(e.target.value)} className="block w-full rounded-lg border p-2 mt-1" /></label></div>
    <p className="text-xs text-slate-500">Vigencia desde las 00:00 del primer día hasta las 23:59 del último, con horario de Argentina.</p>
    <button type="button" disabled={busy || !startDate || !endDate || startDate > endDate} onClick={save} className="rounded-xl bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar promoción'}</button></>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
