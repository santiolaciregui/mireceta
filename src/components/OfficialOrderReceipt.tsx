/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MedicationItem, MedicationPhoto } from '../types';
import { QrCode } from 'lucide-react';

export interface OfficialOrderReceiptProps {
  orderId: string;
  createdAt?: string;
  patientName: string;
  patientLastName: string;
  patientDni: string;
  patientBirthDate?: string;
  patientEmail?: string;
  patientPhone?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  deliveryMethod?: 'email' | 'whatsapp' | 'both' | string;
  medicationItems?: MedicationItem[];
  medicationPhotos?: MedicationPhoto[];
  medicationText?: string;
  diagnostic?: string;
  comments?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  paymentId?: string;
  paymentStatus?: string;
  status?: string;
  isForDependent?: boolean;
  dependentRelationship?: string;
  requestedByTitularName?: string;
  requestedByTitularDni?: string;
}

export default function OfficialOrderReceipt({
  orderId,
  createdAt,
  patientName,
  patientLastName,
  patientDni,
  patientBirthDate,
  patientEmail,
  patientPhone,
  obraSocial,
  obraSocialNumber,
  deliveryMethod = 'email',
  medicationItems = [],
  medicationPhotos = [],
  medicationText,
  diagnostic,
  comments,
  paymentAmount,
  paymentMethod,
  paymentId,
  paymentStatus = 'approved',
  status = 'En revisión',
  isForDependent,
  dependentRelationship,
  requestedByTitularName,
  requestedByTitularDni
}: OfficialOrderReceiptProps) {
  const formattedDate = createdAt 
    ? new Date(createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getDeliveryLabel = () => {
    if (deliveryMethod === 'both') return 'WhatsApp y Correo Electrónico';
    if (deliveryMethod === 'whatsapp') return 'WhatsApp';
    return 'Correo Electrónico';
  };

  const getPaymentMethodLabel = () => {
    if (paymentMethod === 'mp') return 'Mercado Pago (Online)';
    if (paymentMethod === 'cash_desk') return 'Cobro en Ventanilla / Efectivo';
    if (paymentMethod === 'transfer') return 'Transferencia Bancaria';
    return 'Pago Electrónico Verificado';
  };

  const getPaymentStatusDisplay = () => {
    if (paymentStatus === 'approved') return { label: 'Pagado / Verificado', color: 'text-emerald-700' };
    if (paymentStatus === 'refunded') return { label: 'En devolución / Reembolso', color: 'text-amber-700' };
    if (paymentStatus === 'exempt' || String(paymentAmount) === '0' || obraSocial === 'PAMI (Inssjp)') return { label: 'Exento / Bonificado', color: 'text-blue-700' };
    if (paymentStatus === 'rejected') return { label: 'Rechazado', color: 'text-rose-700' };
    return { label: 'Pendiente de Acreditación', color: 'text-yellow-700' };
  };

  return (
    <div className="receipt-document bg-white text-slate-900 font-sans p-8 sm:p-10 max-w-[820px] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-0 print:p-0 print:max-w-none">
      {/* Header Institucional */}
      <div className="border-b-2 border-[#0141BC] pb-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#0141BC] text-white flex items-center justify-center font-black text-sm">
                MR
              </div>
              <span className="text-xl font-black tracking-tight text-[#0141BC]">MiReceta</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
              Sistema de Gestión y Prescripción Médica Digital
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded border border-slate-300">
              Documento Oficial de Trámite
            </span>
            <p className="text-sm font-black font-mono text-[#0141BC] mt-1.5">
              N° DE GESTIÓN: {orderId || 'ORD-S/N'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Fecha de Emisión: {formattedDate} hs
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
          <h1 className="text-base font-extrabold uppercase tracking-wide text-slate-800">
            Constancia de Solicitud de Receta Médica
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#14BE99]/10 text-[#0F6C7D] border border-[#14BE99]/30">
            Estado: {status || 'En Auditoría Médica'}
          </span>
        </div>
      </div>

      {/* 1. Datos del Paciente */}
      <div className="mb-6">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1.5 rounded border-l-4 border-[#1661E1] mb-3">
          1. Datos del Paciente / Solicitante
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente (Receptor de la Receta)</span>
            <span className="font-extrabold text-[#0141BC] text-sm">
              {patientName} {patientLastName}
              {isForDependent && (
                <span className="block text-[11px] font-bold text-purple-700">
                  Familiar a Cargo ({dependentRelationship || 'A cargo'})
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">DNI Paciente</span>
            <span className="font-mono font-extrabold text-[#0141BC] text-sm">{patientDni || 'No especificado'}</span>
          </div>
          {patientBirthDate && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Nacimiento</span>
              <span className="font-medium text-slate-800">{patientBirthDate}</span>
            </div>
          )}

          {isForDependent && (
            <div className="col-span-2 sm:col-span-3 bg-purple-50 border border-purple-200 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold text-purple-900 block">
                Solicitado por el Titular de la Cuenta:
              </span>
              <span className="font-bold text-purple-950 text-xs">
                {requestedByTitularName || 'Titular de la cuenta'} {requestedByTitularDni ? `(DNI: ${requestedByTitularDni})` : ''}
              </span>
            </div>
          )}

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cobertura Médica</span>
            <span className="font-bold text-[#0F6C7D]">{obraSocial || 'Particular'}</span>
          </div>
          {obraSocialNumber && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">N° de Afiliado</span>
              <span className="font-mono font-bold text-slate-800">{obraSocialNumber}</span>
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Teléfono / WhatsApp</span>
            <span className="font-medium text-slate-800">{patientPhone || 'No informado'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Correo Electrónico</span>
            <span className="font-medium text-slate-800">{patientEmail || 'No informado'}</span>
          </div>
        </div>
      </div>

      {/* 2. Medicación Solicitada */}
      <div className="mb-6">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1.5 rounded border-l-4 border-[#1661E1] mb-3">
          2. Detalle de la Medicación Solicitada
        </h2>

        {medicationItems && medicationItems.length > 0 && (
          <div className="mb-4">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Medicamento / Monodroga</th>
                  <th className="p-2 border-r border-slate-300">Dosis / Presentación</th>
                  <th className="p-2 border-r border-slate-300 text-center w-28">Cantidad</th>
                  <th className="p-2">Diagnóstico / Indicaciones</th>
                </tr>
              </thead>
              <tbody>
                {medicationItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold text-[#0141BC]">
                      <div>{item.nombreComercial}</div>
                      {item.droga && item.droga.toLowerCase() !== item.nombreComercial.toLowerCase() && (
                        <span className="block text-[10px] text-slate-500 font-normal">Principio activo: {item.droga}</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-700">
                      <div>{item.miligramos || 'Dosis habitual'} {item.presentacion ? `(${item.presentacion})` : ''}</div>
                      {item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null && Number(item.unidadesPorCaja) > 0 && (
                        <span className="text-[10px] text-slate-500 font-normal block">Contenido: {item.unidadesPorCaja} u. / caja</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                      {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                    </td>
                    <td className="p-2 text-slate-700">
                      <div className="font-semibold text-slate-850">{item.diagnostic || diagnostic || 'Tratamiento crónico continuado'}</div>
                      {(item.comments || item.posologia) && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5">Indicaciones: "{item.comments || item.posologia}"</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-700 border-t border-slate-300">
                  <td colSpan={2} className="p-2 border-r border-slate-300 text-right">
                    Total Medicamentos: {medicationItems.length}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[#0141BC]">
                    {medicationItems.reduce((acc, it) => acc + (Number(it.cantidadCajas) || 1), 0)} {medicationItems.reduce((acc, it) => acc + (Number(it.cantidadCajas) || 1), 0) === 1 ? 'caja' : 'cajas'}
                  </td>
                  <td className="p-2 text-slate-500 text-[10px] font-normal">
                    Prescripción digital formal
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {medicationPhotos && medicationPhotos.length > 0 && (
          <div className="border border-slate-300 p-3 rounded bg-slate-50 text-xs mb-4">
            <p className="font-bold text-slate-800 mb-2">Archivos / Fotografías de envases o recetas previas adjuntas:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {medicationPhotos.map((photo, i) => (
                <li key={i} className="truncate">
                  <span className="font-semibold text-slate-900">{photo.name || `archivo_adjunto_${i + 1}`}</span>
                  <span className="text-slate-600 font-medium ml-2">
                    — {photo.cantidadCajas || 1} {(photo.cantidadCajas || 1) === 1 ? 'Caja' : 'Cajas'}
                    {photo.unidadesPorCaja ? ` x ${photo.unidadesPorCaja} comp./u.` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(!medicationItems || medicationItems.length === 0) && (!medicationPhotos || medicationPhotos.length === 0) && (
          <div className="border border-slate-300 p-3 rounded bg-slate-50 text-xs">
            <p className="font-bold text-slate-800">Prescripción adjuntada:</p>
            <p className="text-slate-600 mt-1">
              {medicationText || 'Documentación en evaluación por el equipo de auditoría médica.'}
            </p>
          </div>
        )}

        {comments && (
          <div className="mt-2 text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
            <span className="font-bold not-italic">Observaciones: </span>{comments}
          </div>
        )}
      </div>

      {/* 3. Datos Administrativos y Pago */}
      <div className="mb-6">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1.5 rounded border-l-4 border-[#1661E1] mb-3">
          3. Datos Administrativos y Comprobante de Pago
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Concepto</span>
            <span className="font-bold text-slate-800">Arancel de Gestión Médica</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Importe Abonado</span>
            <span className="font-mono font-extrabold text-slate-900 text-sm">
              {paymentAmount ? `$${paymentAmount} ARS` : 'Arancel bonificado'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Medio de Pago</span>
            <span className="font-medium text-slate-800">{getPaymentMethodLabel()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado del Pago</span>
            <span className={`font-bold ${getPaymentStatusDisplay().color}`}>
              {getPaymentStatusDisplay().label}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Notificación y Plazo */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="border border-slate-200 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Canal de Notificación y Entrega</span>
          <p className="font-bold text-slate-800 mt-0.5">{getDeliveryLabel()}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Se remitirá el enlace de descarga de la receta firmada digitalmente con QR oficial.
          </p>
        </div>

        <div className="border border-slate-200 p-3 rounded bg-slate-50">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Plazo Estimado de Auditoría</span>
          <p className="font-bold text-slate-800 mt-0.5">Hasta 24 horas hábiles</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Sujeto a la revisión y criterio clínico del profesional médico matriculado asignado.
          </p>
        </div>
      </div>

      {/* 5. Marco Legal y Pie de Página */}
      <div className="border-t-2 border-slate-300 pt-4 mt-6 text-[10px] text-slate-500 leading-relaxed">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <p className="font-bold text-slate-700">Marco Legal y Términos de Validez:</p>
            <p>
              El presente documento constituye un comprobante formal de recepción de trámite en el sistema digital de gestión. La confección y emisión final de la receta electrónica se rige bajo la Ley N° 27.553 de Receta Digital y Teleasistencia en Salud y normativas concordantes. Este comprobante no posee validez como prescripción médica para dispensa en farmacias hasta tanto no sea emitida y firmada por el profesional médico matriculado.
            </p>
          </div>
          <div className="text-center shrink-0 border border-slate-300 p-2 rounded bg-slate-50">
            <div className="h-12 w-12 mx-auto bg-slate-200 flex items-center justify-center text-slate-600 rounded">
              <QrCode className="h-9 w-9" />
            </div>
            <span className="font-mono text-[8px] font-bold text-slate-600 block mt-1">
              VALIDACIÓN DIGITAL
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
          <span>MiReceta - Plataforma de Prescripciones Médicas Digitales</span>
          <span>Código de Verificación: {orderId ? `VLD-${orderId}` : 'VLD-SYS'}</span>
        </div>
      </div>
    </div>
  );
}
