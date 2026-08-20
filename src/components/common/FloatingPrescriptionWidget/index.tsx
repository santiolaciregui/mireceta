/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { MedicalOrder } from '../../../types';
import { copyToClipboard } from '../../../utils/clipboard';
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
  CreditCard,
  Users,
  Download,
  Phone,
  Mail,
  MapPin,
  Clock,
  Tag
} from 'lucide-react';

interface FloatingPrescriptionWidgetProps {
  order: MedicalOrder | null;
  onClose?: () => void;
  onFocusMainWindow?: () => void;
  extractedText?: string;
  isExtracting?: boolean;
}

export default function FloatingPrescriptionWidget({
  order,
  onClose,
  onFocusMainWindow,
  extractedText,
  isExtracting,
}: FloatingPrescriptionWidgetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'meds' | 'patient' | 'payment' | 'photos'>('meds');

  if (!order) {
    return (
      <div className="p-6 bg-slate-50 text-slate-600 h-screen flex flex-col items-center justify-center text-center">
        <Pill className="h-10 w-10 text-slate-400 mb-3 animate-pulse" />
        <h3 className="font-bold text-sm text-slate-800">Sin solicitud seleccionada</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
          Seleccioná una solicitud en la bandeja principal de Mi Receta para ver los datos completos en esta ventana flotante.
        </p>
      </div>
    );
  }

  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async (text: string | number | undefined | null, fieldId: string) => {
    if (text === undefined || text === null) return;
    const strText = String(text).trim();
    if (!strText || strText === '—') return;
    
    const targetDoc = containerRef.current?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const success = await copyToClipboard(strText, targetDoc);
    if (success) {
      setCopiedField(fieldId);
      setTimeout(() => {
        setCopiedField((curr) => (curr === fieldId ? null : curr));
      }, 1800);
    }
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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getPaymentMethodLabel = (ord: MedicalOrder) => {
    if (ord.paymentMethod === 'mp') return 'Mercado Pago (Online)';
    if (ord.paymentMethod === 'transfer') return 'Transferencia Bancaria';
    if (ord.paymentMethod === 'cash_desk') return 'Mesa de Entrada / Efectivo';
    if (ord.paymentMethod === 'bonificado') return 'Bonificado / Exento';

    const paymentId = ord.paymentId || '';
    const receiptName = ord.paymentReceiptName || '';
    const receiptUrl = ord.paymentReceiptUrl || '';
    if (paymentId.startsWith('EFECTIVO-') || receiptName === 'cobrado_ventanilla.png' || receiptName === 'carga_manual_efectivo.png' || receiptName === 'registro_oficio.png') {
      return 'Mesa de Entrada / Efectivo';
    }
    if (ord.paymentStatus === 'exempt' || ord.obraSocial === 'PAMI (Inssjp)' || String(ord.paymentAmount) === '0') {
      return 'Bonificado / Exento';
    }
    if (receiptUrl && !receiptUrl.startsWith('data:image/svg+xml') && receiptName !== 'cobrado_ventanilla.png' && receiptName !== 'carga_manual_efectivo.png' && receiptName !== 'registro_oficio.png') {
      return 'Transferencia Bancaria';
    }
    return 'Mercado Pago (Online)';
  };

  const getPaymentStatusLabel = (status?: string) => {
    if (status === 'approved') return 'Aprobado';
    if (status === 'pending') return 'Pendiente';
    if (status === 'rejected') return 'Rechazado';
    if (status === 'refunded') return 'Devuelto';
    if (status === 'exempt') return 'Exento';
    return 'Desconocido';
  };

  const handleCopyAllSummary = async () => {
    const lines: string[] = [];
    lines.push(`SOLICITUD ID: ${order.id}`);
    lines.push(`FECHA DE SOLICITUD: ${formatDateTime(order.createdAt)}`);
    lines.push(`ESTADO: ${order.status}`);
    lines.push(`CANAL ENTREGA: ${order.deliveryMethod === 'both' ? 'Email y WhatsApp' : order.deliveryMethod === 'email' ? 'Email' : 'WhatsApp'}`);
    lines.push('');
    lines.push(`PACIENTE: ${order.patientLastName}, ${order.patientName}`);
    lines.push(`DNI: ${order.patientDni}`);
    if (order.patientBirthDate) {
      const age = calculateAge(order.patientBirthDate);
      lines.push(`FECHA NAC.: ${formatBirthDate(order.patientBirthDate)} ${age ? `(${age})` : ''}`);
    }
    if (order.patientEmail) lines.push(`EMAIL: ${order.patientEmail}`);
    if (order.patientPhone) lines.push(`TELÉFONO / WHATSAPP: ${order.patientPhone}`);
    if (order.patientCity || order.patientProvince) {
      lines.push(`UBICACIÓN: ${[order.patientCity, order.patientProvince].filter(Boolean).join(', ')}`);
    }
    if (order.lastConsultationTime) lines.push(`ÚLTIMA CONSULTA: ${order.lastConsultationTime}`);
    if (order.lastConsultationDoctor) lines.push(`MÉDICO ÚLTIMA CONSULTA: ${order.lastConsultationDoctor}`);

    if (order.isForDependent) {
      lines.push('');
      lines.push(`PACIENTE A CARGO (${order.dependentRelationship || 'Familiar'}):`);
      lines.push(`  - Titular: ${order.requestedByTitularName || '—'}`);
      lines.push(`  - DNI Titular: ${order.requestedByTitularDni || '—'}`);
      if (order.requestedByTitularPhone) lines.push(`  - Tel Titular: ${order.requestedByTitularPhone}`);
      if (order.requestedByTitularEmail) lines.push(`  - Email Titular: ${order.requestedByTitularEmail}`);
    }

    lines.push('');
    lines.push(`OBRA SOCIAL / COBERTURA: ${order.obraSocial}`);
    if (order.obraSocialNumber) {
      lines.push(`N° AFILIADO: ${order.obraSocialNumber}`);
    }

    lines.push('');
    lines.push('INFORMACIÓN DE PAGO:');
    lines.push(`  - Método: ${getPaymentMethodLabel(order)}`);
    lines.push(`  - Monto: $${order.paymentAmount || '0'}`);
    lines.push(`  - Estado Pago: ${getPaymentStatusLabel(order.paymentStatus)}`);
    if (order.paymentId) lines.push(`  - ID Transacción: ${order.paymentId}`);
    if (order.paymentDate) lines.push(`  - Fecha Pago: ${formatDateTime(order.paymentDate)}`);

    lines.push('');
    lines.push('MEDICACIÓN SOLICITADA:');
    if (order.diagnostic) {
      lines.push(`DIAGNÓSTICO PRINCIPAL: ${order.diagnostic}`);
    }

    if (order.medicationItems && order.medicationItems.length > 0) {
      order.medicationItems.forEach((item, idx) => {
        lines.push(`[#${idx + 1}] ${item.nombreComercial}`);
        if (item.droga) lines.push(`  - Monodroga: ${item.droga}`);
        if (item.miligramos) lines.push(`  - Dosis: ${item.miligramos}`);
        if (item.presentacion) lines.push(`  - Presentación: ${item.presentacion}`);
        if (item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null) lines.push(`  - Unidades por caja: ${item.unidadesPorCaja}`);
        lines.push(`  - Cantidad: ${item.cantidadCajas} ${item.cantidadCajas === 1 ? 'caja' : 'cajas'}`);
        if (item.diagnostic || item.diagnostico) lines.push(`  - Diagnóstico específico: ${item.diagnostic || item.diagnostico}`);
        if (item.posologia) lines.push(`  - Posología: ${item.posologia}`);
        if (item.comments) lines.push(`  - Comentarios: ${item.comments}`);
      });
    } else if (order.medicationText) {
      lines.push(order.medicationText);
    }
    if (order.comments) {
      lines.push(`COMENTARIOS PACIENTE: ${order.comments}`);
    }

    const targetDoc = containerRef.current?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const success = await copyToClipboard(lines.join('\n'), targetDoc);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const medicationPhotoList = order.medicationPhotos || (order.medicationPhotoUrl ? [{ url: order.medicationPhotoUrl, name: order.medicationPhotoName || 'envase.jpg' }] : []);
  const hasMedicationPhotos = medicationPhotoList.length > 0;
  const hasPaymentReceipt = !!order.paymentReceiptUrl;
  const totalPhotosCount = medicationPhotoList.length + (hasPaymentReceipt ? 1 : 0);

  const WidgetRow = ({
    label,
    value,
    copyValue,
    fieldId,
    highlight = false,
  }: {
    label: string;
    value: React.ReactNode;
    copyValue?: string;
    fieldId: string;
    highlight?: boolean;
  }) => {
    const textToCopy = copyValue ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
    const canCopy = Boolean(textToCopy && textToCopy !== '—');

    return (
      <div className={`p-2 flex items-center justify-between gap-2 transition-colors ${highlight ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{label}</span>
          <div className="text-[11px] font-bold text-slate-800 break-words leading-tight mt-0.5">{value}</div>
        </div>
        {canCopy && (
          <button
            onClick={() => handleCopy(textToCopy, fieldId)}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all shrink-0 cursor-pointer border border-slate-200 active:scale-95"
            title={`Copiar ${label}`}
          >
            {copiedField === fieldId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-screen max-h-screen bg-slate-50 text-slate-900 text-xs select-text overflow-hidden font-sans">
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
              ID: <strong className="text-white">{order.id}</strong> • DNI: <strong className="text-white">{order.patientDni}</strong> • {order.obraSocial}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyAllSummary}
            className="px-2 py-1 bg-[#1661E1] hover:bg-[#1E6EFB] text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Copiar todo el resumen completo de la solicitud"
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
      <div className="bg-white border-b border-slate-200 px-2 flex items-center justify-between shrink-0 select-none overflow-x-auto">
        <div className="flex gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('meds')}
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
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
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'patient'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="h-3 w-3 text-[#1661E1]" />
            <span>Paciente & Solicitud</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'payment'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="h-3 w-3 text-indigo-600" />
            <span>Pago (${order.paymentAmount || '0'})</span>
          </button>

          {totalPhotosCount > 0 && (
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-2 py-1 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'photos'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="h-3 w-3 text-purple-600" />
              <span>Adjuntos ({totalPhotosCount})</span>
            </button>
          )}
        </div>

        <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md shrink-0 ml-1">
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
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">Diagnóstico Principal</span>
                  <p className="text-[11px] font-bold text-amber-950 mt-0.5 leading-snug break-words">
                    {order.diagnostic}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(order.diagnostic, 'diag-main')}
                  className="p-1 rounded bg-white/80 hover:bg-white text-amber-700 border border-amber-200 transition-all shrink-0 cursor-pointer shadow-3xs"
                  title="Copiar Diagnóstico Principal"
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

                  <div className="divide-y divide-slate-100 bg-white">
                    <WidgetRow label="Nombre Comercial" value={item.nombreComercial} fieldId={`med-${idx}-nombre`} />
                    
                    {item.droga && (
                      <WidgetRow label="Droga / Monodroga" value={item.droga} fieldId={`med-${idx}-droga`} />
                    )}

                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                      {item.miligramos && (
                        <WidgetRow label="Dosis/Mg" value={item.miligramos} fieldId={`med-${idx}-mg`} />
                      )}
                      {item.presentacion && (
                        <WidgetRow label="Presentación" value={item.presentacion} fieldId={`med-${idx}-pres`} />
                      )}
                    </div>

                    {item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null && item.unidadesPorCaja > 0 && (
                      <WidgetRow label="Unidades por Caja" value={String(item.unidadesPorCaja)} fieldId={`med-${idx}-unidades`} />
                    )}

                    <WidgetRow 
                      label="Cantidad Solicitada" 
                      value={`${item.cantidadCajas} ${item.cantidadCajas === 1 ? 'caja' : 'cajas'}`} 
                      copyValue={String(item.cantidadCajas)}
                      fieldId={`med-${idx}-cant`} 
                    />

                    {(item.diagnostic || item.diagnostico) && (
                      <WidgetRow 
                        label="Diagnóstico Específico" 
                        value={item.diagnostic || item.diagnostico || ''} 
                        fieldId={`med-${idx}-diag`} 
                      />
                    )}

                    {item.posologia && (
                      <WidgetRow label="Posología" value={item.posologia} fieldId={`med-${idx}-pos`} />
                    )}

                    {item.comments && (
                      <WidgetRow label="Comentarios / Aclaraciones" value={item.comments} fieldId={`med-${idx}-comm`} />
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
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-[10px] text-slate-600 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-slate-700 block mb-0.5">Comentarios del Paciente:</span>
                  <p className="italic">{order.comments}</p>
                </div>
                <button
                  onClick={() => handleCopy(order.comments, 'p-comments')}
                  className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 shrink-0 cursor-pointer"
                  title="Copiar Comentarios"
                >
                  {copiedField === 'p-comments' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}

            {/* Análisis automático de envase con IA */}
            {(extractedText || isExtracting) && (
              <div className="p-2.5 rounded-xl border border-[#0F6C7D]/30 bg-[#0F6C7D]/5 text-[#0F6C7D] space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#0F6C7D] shrink-0" />
                    <span className="font-extrabold text-[11px] text-[#0141BC]">Análisis de Envase (IA)</span>
                  </div>
                  {extractedText && (
                    <button
                      onClick={() => handleCopy(extractedText, 'ia-extracted')}
                      className="p-1 rounded bg-white hover:bg-slate-100 text-[#0F6C7D] border border-[#0F6C7D]/30 transition-all shrink-0 cursor-pointer"
                      title="Copiar texto extraído"
                    >
                      {copiedField === 'ia-extracted' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                {isExtracting ? (
                  <p className="text-[10px] italic text-slate-600">Analizando imagen de envase...</p>
                ) : (
                  <div className="font-mono text-[10px] whitespace-pre-wrap bg-white/90 p-2 rounded-lg border border-[#0F6C7D]/20 text-[#0141BC]">
                    {extractedText}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACIENTE Y SOLICITUD */}
        {activeTab === 'patient' && (
          <div className="space-y-3">
            {/* 1. Datos de la Solicitud */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#1661E1]" />
                <h4 className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider">Datos de la Solicitud</h4>
              </div>
              <div className="divide-y divide-slate-100">
                <WidgetRow label="ID Solicitud" value={order.id} fieldId="sol-id" />
                <WidgetRow label="Fecha de Solicitud" value={formatDateTime(order.createdAt)} fieldId="sol-created" />
                <WidgetRow label="Estado" value={order.status} fieldId="sol-status" />
                <WidgetRow 
                  label="Canal de Entrega" 
                  value={order.deliveryMethod === 'both' ? 'Email y WhatsApp' : order.deliveryMethod === 'email' ? 'Email' : 'WhatsApp'} 
                  fieldId="sol-delivery" 
                />
                {order.lastConsultationTime && (
                  <WidgetRow label="Última Consulta" value={order.lastConsultationTime} fieldId="sol-last-time" />
                )}
                {order.lastConsultationDoctor && (
                  <WidgetRow label="Médico de Última Consulta" value={order.lastConsultationDoctor} fieldId="sol-last-doc" />
                )}
              </div>
            </div>

            {/* 2. Información del Paciente */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#1661E1]" />
                <h4 className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider">Información del Paciente</h4>
              </div>
              <div className="divide-y divide-slate-100">
                <WidgetRow label="Apellido" value={order.patientLastName} fieldId="p-lastname" />
                <WidgetRow label="Nombre" value={order.patientName} fieldId="p-name" />
                <WidgetRow label="DNI / Documento" value={order.patientDni} fieldId="p-dni" />
                <WidgetRow 
                  label="Fecha de Nacimiento" 
                  value={`${formatBirthDate(order.patientBirthDate)} ${order.patientBirthDate ? `(${calculateAge(order.patientBirthDate)})` : ''}`} 
                  copyValue={formatBirthDate(order.patientBirthDate)}
                  fieldId="p-birth" 
                />
                <WidgetRow label="Teléfono / WhatsApp" value={order.patientPhone || '—'} fieldId="p-phone" />
                <WidgetRow label="Correo Electrónico" value={order.patientEmail || '—'} fieldId="p-email" />
                {order.patientCity && (
                  <WidgetRow label="Ciudad" value={order.patientCity} fieldId="p-city" />
                )}
                {order.patientProvince && (
                  <WidgetRow label="Provincia" value={order.patientProvince} fieldId="p-prov" />
                )}
              </div>
            </div>

            {/* 3. Cobertura Médica */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <h4 className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider">Obra Social / Cobertura</h4>
              </div>
              <div className="divide-y divide-slate-100">
                <WidgetRow label="Obra Social / Prepaga" value={order.obraSocial} fieldId="p-os" />
                <WidgetRow 
                  label="Número de Credencial / Afiliado" 
                  value={order.obraSocialNumber || 'Particular / Sin número'} 
                  copyValue={order.obraSocialNumber || ''}
                  fieldId="p-osnum" 
                />
              </div>
            </div>

            {/* 4. Paciente a Cargo (Si aplica) */}
            {order.isForDependent && (
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl shadow-xs overflow-hidden">
                <div className="bg-purple-100/80 px-3 py-1.5 border-b border-purple-200 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-700" />
                  <h4 className="font-extrabold text-purple-900 text-[11px] uppercase tracking-wider">Paciente a Cargo / Familiar</h4>
                </div>
                <div className="divide-y divide-purple-100/80">
                  <WidgetRow label="Relación / Parentesco" value={order.dependentRelationship || 'Familiar'} fieldId="dep-rel" />
                  <WidgetRow label="Nombre Titular de Cuenta" value={order.requestedByTitularName || '—'} fieldId="dep-tit-name" />
                  <WidgetRow label="DNI Titular" value={order.requestedByTitularDni || '—'} fieldId="dep-tit-dni" />
                  <WidgetRow label="Teléfono Titular" value={order.requestedByTitularPhone || '—'} fieldId="dep-tit-phone" />
                  <WidgetRow label="Email Titular" value={order.requestedByTitularEmail || '—'} fieldId="dep-tit-email" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INFORMACIÓN DE PAGO */}
        {activeTab === 'payment' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                <h4 className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider">Detalles de Pago</h4>
              </div>
              <div className="divide-y divide-slate-100">
                <WidgetRow label="Método de Pago" value={getPaymentMethodLabel(order)} fieldId="pay-method" />
                <WidgetRow label="Monto Solicitado" value={`$${order.paymentAmount || '0'}`} fieldId="pay-amount" />
                <WidgetRow label="Estado del Pago" value={getPaymentStatusLabel(order.paymentStatus)} fieldId="pay-status" />
                {order.paymentId && (
                  <WidgetRow label="ID de Transacción / Pago" value={order.paymentId} fieldId="pay-id" />
                )}
                {order.paymentDate && (
                  <WidgetRow label="Fecha de Pago" value={formatDateTime(order.paymentDate)} fieldId="pay-date" />
                )}
              </div>
            </div>

            {/* Comprobante de pago si existe */}
            {order.paymentReceiptUrl && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-3 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Comprobante de Transferencia</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-6 w-6 text-rose-500 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 truncate">
                      {order.paymentReceiptName || 'comprobante_pago.jpg'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={order.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-[10px] flex items-center gap-1 transition-colors"
                      title="Ver en pantalla completa"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver
                    </a>
                    <a
                      href={order.paymentReceiptUrl}
                      download={order.paymentReceiptName || 'comprobante_pago'}
                      className="px-2 py-1 bg-[#1661E1] hover:bg-[#1E6EFB] text-white rounded font-bold text-[10px] flex items-center gap-1 transition-colors"
                      title="Descargar comprobante"
                    >
                      <Download className="h-3 w-3" /> Descargar
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FOTOS Y ADJUNTOS */}
        {activeTab === 'photos' && totalPhotosCount > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 block">Archivos y fotos adjuntas en la solicitud:</span>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Fotos de envases o recetas anteriores */}
              {medicationPhotoList.map((photo, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {photo.url.startsWith('data:application/pdf') ? (
                    <div className="p-4 bg-slate-50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-6 w-6 text-rose-500 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-700 truncate">{photo.name}</span>
                      </div>
                      <a
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-[#1661E1] text-white rounded font-bold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir PDF
                      </a>
                    </div>
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
                    Envase/Receta: {photo.name}
                  </div>
                </div>
              ))}

              {/* Comprobante de pago */}
              {hasPaymentReceipt && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {order.paymentReceiptUrl!.startsWith('data:application/pdf') || order.paymentReceiptName?.endsWith('.pdf') ? (
                    <div className="p-4 bg-slate-50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-6 w-6 text-indigo-500 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-700 truncate">
                          {order.paymentReceiptName || 'comprobante_pago.pdf'}
                        </span>
                      </div>
                      <a
                        href={order.paymentReceiptUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-[#1661E1] text-white rounded font-bold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir PDF
                      </a>
                    </div>
                  ) : (
                    <a
                      href={order.paymentReceiptUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative group cursor-zoom-in"
                    >
                      <img src={order.paymentReceiptUrl!} alt="Comprobante" className="max-h-48 w-full object-contain bg-slate-100" />
                      <div className="p-1.5 bg-slate-900/80 text-white text-[9px] flex items-center justify-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Abrir comprobante de pago
                      </div>
                    </a>
                  )}
                  <div className="p-2 text-[9px] font-mono text-slate-500 truncate bg-slate-50 border-t border-slate-100">
                    Comprobante de Pago: {order.paymentReceiptName || 'comprobante_pago'}
                  </div>
                </div>
              )}
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
