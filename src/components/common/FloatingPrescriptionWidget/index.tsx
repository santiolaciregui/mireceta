/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MedicalOrder } from '../../../types';
import { 
  Pill, 
  User, 
  Shield, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Sparkles, 
  Calendar, 
  FileText,
  Eye,
  CheckCheck,
  Maximize2
} from 'lucide-react';

interface FloatingPrescriptionWidgetProps {
  order: MedicalOrder | null;
  onClose?: () => void;
  onFocusMainWindow?: () => void;
}

export default function FloatingPrescriptionWidget({
  order,
  onClose,
  onFocusMainWindow,
}: FloatingPrescriptionWidgetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'meds' | 'patient' | 'photos'>('meds');

  if (!order) {
    return (
      <div className="p-6 bg-slate-50 text-slate-600 h-screen flex flex-col items-center justify-center text-center">
        <Pill className="h-10 w-10 text-slate-400 mb-3 animate-pulse" />
        <h3 className="font-bold text-sm text-slate-800">Sin solicitud seleccionada</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
          Seleccioná una solicitud en la bandeja principal de Mi Receta para ver los datos de medicación en esta ventana.
        </p>
      </div>
    );
  }

  const handleCopy = (text: string, fieldId: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldId ? null : curr));
    }, 1800);
  };

  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const birth = new Date(dateStr);
      if (isNaN(birth.getTime())) return '';
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} años`;
    } catch {
      return '';
    }
  };

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
      }
    } catch (e) {}
    return dateStr;
  };

  const handleCopyAllSummary = () => {
    const lines: string[] = [];
    lines.push(`PACIENTE: ${order.patientLastName}, ${order.patientName}`);
    lines.push(`DNI: ${order.patientDni}`);
    if (order.patientBirthDate) {
      const age = calculateAge(order.patientBirthDate);
      lines.push(`FECHA NAC.: ${formatBirthDate(order.patientBirthDate)} ${age ? `(${age})` : ''}`);
    }
    lines.push(`OBRA SOCIAL: ${order.obraSocial}`);
    if (order.obraSocialNumber) {
      lines.push(`N° AFILIADO: ${order.obraSocialNumber}`);
    }
    if (order.diagnostic) {
      lines.push(`DIAGNÓSTICO: ${order.diagnostic}`);
    }
    lines.push('');
    lines.push('MEDICACIÓN SOLICITADA:');

    if (order.medicationItems && order.medicationItems.length > 0) {
      order.medicationItems.forEach((item, idx) => {
        lines.push(`[#${idx + 1}] ${item.nombreComercial}`);
        if (item.droga) lines.push(`  - Monodroga: ${item.droga}`);
        if (item.miligramos) lines.push(`  - Dosis: ${item.miligramos}`);
        if (item.presentacion) lines.push(`  - Presentación: ${item.presentacion}`);
        lines.push(`  - Cantidad: ${item.cantidadCajas} ${item.cantidadCajas === 1 ? 'caja' : 'cajas'}`);
        if (item.diagnostic || item.diagnostico) lines.push(`  - Diagnóstico: ${item.diagnostic || item.diagnostico}`);
        if (item.posologia) lines.push(`  - Posología: ${item.posologia}`);
        if (item.comments) lines.push(`  - Observaciones: ${item.comments}`);
      });
    } else if (order.medicationText) {
      lines.push(order.medicationText);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const hasPhotos = (order.medicationPhotos && order.medicationPhotos.length > 0) || !!order.medicationPhotoUrl;
  const photoList = order.medicationPhotos || (order.medicationPhotoUrl ? [{ url: order.medicationPhotoUrl, name: order.medicationPhotoName || 'envase.jpg' }] : []);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-50 text-slate-900 text-xs select-text overflow-hidden font-sans">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between shadow-md shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-[#1661E1] flex items-center justify-center shrink-0">
            <Pill className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-[12px] truncate leading-tight">
              {order.patientLastName}, {order.patientName}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">
              DNI: <strong className="text-white">{order.patientDni}</strong> • {order.obraSocial}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyAllSummary}
            className="px-2 py-1 bg-[#1661E1] hover:bg-[#1E6EFB] text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Copiar todo el resumen del paciente y medicación"
          >
            {copiedAll ? (
              <>
                <CheckCheck className="h-3 w-3 text-emerald-300" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copiar Todo</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Cerrar ventana flotante"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Tabs navigation */}
      <div className="bg-white border-b border-slate-200 px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('meds')}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'meds'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Pill className="h-3 w-3 text-emerald-600" />
            <span>Medicación ({order.medicationItems?.length || 1})</span>
          </button>

          <button
            onClick={() => setActiveTab('patient')}
            className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'patient'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="h-3 w-3 text-[#1661E1]" />
            <span>Paciente & Obra Social</span>
          </button>

          {hasPhotos && (
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'photos'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="h-3 w-3 text-purple-600" />
              <span>Fotos ({photoList.length})</span>
            </button>
          )}
        </div>

        <span className="text-[10px] font-semibold text-slate-400 px-1">
          {order.status}
        </span>
      </div>

      {/* Main Body Content with scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: MEDICACIÓN */}
        {activeTab === 'meds' && (
          <div className="space-y-3">
            {/* Diagnóstico principal */}
            {order.diagnostic && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">Diagnóstico</span>
                  <p className="text-[11px] font-bold text-amber-950 mt-0.5 leading-snug break-words">
                    {order.diagnostic}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(order.diagnostic, 'diag-main')}
                  className="p-1 rounded bg-white/80 hover:bg-white text-amber-700 border border-amber-200 transition-all shrink-0 cursor-pointer shadow-3xs"
                  title="Copiar Diagnóstico"
                >
                  {copiedField === 'diag-main' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}

            {/* Structured Medications */}
            {order.medicationItems && order.medicationItems.length > 0 ? (
              order.medicationItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100"
                >
                  <div className="bg-slate-100/80 px-3 py-1.5 flex items-center justify-between border-b border-slate-200">
                    <span className="font-black text-slate-800 text-[11px]">Medicamento #{idx + 1}</span>
                    <span className="bg-white border border-slate-300 text-slate-800 font-extrabold text-[10px] px-2 py-0.5 rounded shadow-3xs">
                      {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2 bg-white">
                    {/* Nombre comercial */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Nombre Comercial</span>
                        <span className="text-[12px] font-black text-slate-900 break-words">{item.nombreComercial}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.nombreComercial, `med-${idx}-nombre`)}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-all shrink-0 cursor-pointer"
                        title="Copiar Nombre"
                      >
                        {copiedField === `med-${idx}-nombre` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Droga / Monodroga */}
                    {item.droga && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Droga / Monodroga</span>
                          <span className="text-[11px] font-bold text-slate-800 break-words">{item.droga}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(item.droga!, `med-${idx}-droga`)}
                          className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-all shrink-0 cursor-pointer"
                          title="Copiar Droga"
                        >
                          {copiedField === `med-${idx}-droga` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}

                    {/* Dosis / Presentación / Unidades */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      {item.miligramos && (
                        <div className="flex items-center justify-between gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Dosis/Mg</span>
                            <span className="text-[10px] font-extrabold text-slate-800 truncate block">{item.miligramos}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(item.miligramos!, `med-${idx}-mg`)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copiar Dosis"
                          >
                            {copiedField === `med-${idx}-mg` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}

                      {item.presentacion && (
                        <div className="flex items-center justify-between gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Presentación</span>
                            <span className="text-[10px] font-extrabold text-slate-800 truncate block">{item.presentacion}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(item.presentacion!, `med-${idx}-pres`)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copiar Presentación"
                          >
                            {copiedField === `med-${idx}-pres` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Cantidad de cajas */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-500">Cantidad Solicitada:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900">{item.cantidadCajas} cajas</span>
                        <button
                          onClick={() => handleCopy(String(item.cantidadCajas), `med-${idx}-cant`)}
                          className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-all shrink-0 cursor-pointer"
                          title="Copiar Cantidad"
                        >
                          {copiedField === `med-${idx}-cant` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Posología o Diagnóstico individual si existe */}
                    {item.posologia && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Posología:</span>
                          <button
                            onClick={() => handleCopy(item.posologia!, `med-${idx}-pos`)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {copiedField === `med-${idx}-pos` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-700 mt-0.5">{item.posologia}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : order.medicationText ? (
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Texto de la Solicitud</span>
                  <button
                    onClick={() => handleCopy(order.medicationText, 'med-text-full')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                    title="Copiar texto de receta"
                  >
                    {copiedField === 'med-text-full' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800">
                  {order.medicationText}
                </div>
              </div>
            ) : null}

            {/* Comentarios adicionales del paciente */}
            {order.comments && (
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-[10px] text-slate-600">
                <span className="font-bold text-slate-700 block mb-0.5">Comentarios del Paciente:</span>
                <p className="italic">{order.comments}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACIENTE Y OBRA SOCIAL */}
        {activeTab === 'patient' && (
          <div className="space-y-2.5">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs divide-y divide-slate-100 overflow-hidden">
              {/* DNI */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">DNI / Documento</span>
                  <span className="text-[12px] font-black text-slate-900">{order.patientDni}</span>
                </div>
                <button
                  onClick={() => handleCopy(order.patientDni, 'p-dni')}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  title="Copiar DNI"
                >
                  {copiedField === 'p-dni' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Apellido */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Apellido</span>
                  <span className="text-[11px] font-bold text-slate-800">{order.patientLastName}</span>
                </div>
                <button
                  onClick={() => handleCopy(order.patientLastName, 'p-lastname')}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  title="Copiar Apellido"
                >
                  {copiedField === 'p-lastname' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Nombre */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Nombre</span>
                  <span className="text-[11px] font-bold text-slate-800">{order.patientName}</span>
                </div>
                <button
                  onClick={() => handleCopy(order.patientName, 'p-name')}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  title="Copiar Nombre"
                >
                  {copiedField === 'p-name' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Fecha de Nacimiento & Edad */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Fecha de Nacimiento</span>
                  <span className="text-[11px] font-bold text-slate-800">
                    {formatBirthDate(order.patientBirthDate)} {order.patientBirthDate ? `(${calculateAge(order.patientBirthDate)})` : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(formatBirthDate(order.patientBirthDate), 'p-birth')}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  title="Copiar Fecha de Nacimiento"
                >
                  {copiedField === 'p-birth' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Obra Social */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Obra Social / Prepaga</span>
                  <span className="text-[11px] font-bold text-blue-700">{order.obraSocial}</span>
                </div>
                <button
                  onClick={() => handleCopy(order.obraSocial, 'p-os')}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  title="Copiar Obra Social"
                >
                  {copiedField === 'p-os' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Número de Afiliado */}
              <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">N° Credencial / Afiliado</span>
                  <span className="text-[11px] font-bold text-slate-800 font-mono">
                    {order.obraSocialNumber || 'Particular / Sin número'}
                  </span>
                </div>
                {order.obraSocialNumber && (
                  <button
                    onClick={() => handleCopy(order.obraSocialNumber!, 'p-osnum')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Copiar N° Afiliado"
                  >
                    {copiedField === 'p-osnum' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Teléfono / WhatsApp */}
              {order.patientPhone && (
                <div className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Teléfono / WhatsApp</span>
                    <span className="text-[11px] font-medium text-slate-800">{order.patientPhone}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(order.patientPhone, 'p-phone')}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Copiar Teléfono"
                  >
                    {copiedField === 'p-phone' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Familiar a cargo si aplica */}
            {order.isForDependent && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 block">
                  Paciente a Cargo ({order.dependentRelationship || 'Familiar'})
                </span>
                <p className="text-[10px] text-purple-900">
                  Titular de la cuenta: <strong>{order.requestedByTitularName || '—'}</strong> (DNI: {order.requestedByTitularDni || '—'})
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FOTOS Y ADJUNTOS */}
        {activeTab === 'photos' && hasPhotos && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 block">Fotos de envases o recetas anteriores:</span>
            <div className="grid grid-cols-1 gap-2.5">
              {photoList.map((photo, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {photo.url.startsWith('data:application/pdf') ? (
                    <a
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-slate-50 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <FileText className="h-6 w-6 text-rose-500" />
                      <span className="text-[11px] font-bold text-slate-700">Ver Archivo PDF</span>
                    </a>
                  ) : (
                    <a
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative group cursor-zoom-in"
                    >
                      <img src={photo.url} alt="Envase" className="max-h-48 w-full object-contain bg-slate-100" />
                      <div className="p-1.5 bg-slate-900/80 text-white text-[9px] flex items-center justify-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Abrir imagen en tamaño completo
                      </div>
                    </a>
                  )}
                  <div className="p-2 text-[9px] font-mono text-slate-500 truncate bg-slate-50 border-t border-slate-100">
                    {photo.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Hint */}
      <footer className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex items-center justify-between text-[10px] text-slate-500 shrink-0 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="h-3.5 w-3.5 text-[#1661E1] shrink-0" />
          <span className="truncate">Copiá campos con 1-click al recetar en el otro sistema</span>
        </div>

        {onFocusMainWindow && (
          <button
            onClick={onFocusMainWindow}
            className="text-[#1661E1] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
          >
            Ir a Mi Receta
          </button>
        )}
      </footer>
    </div>
  );
}
