/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MedicalOrder } from '../../../types';
import { 
  User, 
  X, 
  FileText, 
  Clock, 
  Shield, 
  Phone, 
  Mail, 
  Calendar, 
  Pill, 
  Download, 
  MessageSquare, 
  ChevronRight, 
  Users, 
  Copy, 
  Check, 
  FileCheck 
} from 'lucide-react';
import { copyToClipboard } from '../../../utils/clipboard';

export interface PatientRecord {
  id: string;
  dni: string;
  name: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  city?: string;
  province?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  status: 'Activo' | 'Inactivo';
  dependents?: any[];
  createdAt?: string;
  orders: MedicalOrder[];
}

interface PatientDetailModalProps {
  patient: PatientRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
  onNavigateToChat?: (orderIdOrDni: string) => void;
}

export default function PatientDetailModal({
  patient,
  isOpen,
  onClose,
  onSelectOrder,
  onNavigateToChat,
}: PatientDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedOrderTab, setSelectedOrderTab] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!isOpen || !patient) return null;

  const handleCopy = async (text: string, fieldId: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
    } catch {}
    return dateStr;
  };

  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const birth = new Date(dateStr);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 && age < 125 ? age : null;
    } catch {
      return null;
    }
  };

  const patientAge = calculateAge(patient.birthDate);

  // Filter orders for this patient
  const filteredOrders = patient.orders.filter(order => {
    if (selectedOrderTab === 'pending') {
      return order.status === 'Pendiente' || order.status === 'En revisión' || order.status === 'Solicita más información';
    }
    if (selectedOrderTab === 'completed') {
      return order.status === 'Emitida' || order.status === 'Enviada';
    }
    if (selectedOrderTab === 'rejected') {
      return order.status === 'Rechazada';
    }
    return true;
  });

  const pendingCount = patient.orders.filter(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Solicita más información').length;
  const completedCount = patient.orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
  const rejectedCount = patient.orders.filter(o => o.status === 'Rechazada').length;

  const initials = `${patient.name.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0141BC] via-[#1661E1] to-[#0F6C7D] px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/25 text-white font-extrabold text-lg flex items-center justify-center shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {patient.lastName}, {patient.name}
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  patient.status === 'Activo'
                    ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                    : 'bg-slate-400/20 text-slate-200 border-slate-300/40'
                }`}>
                  {patient.status}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 font-medium flex items-center gap-2">
                <span>DNI: <strong className="font-mono text-white">{patient.dni}</strong></span>
                {patientAge !== null && <span>• {patientAge} años</span>}
                {patient.obraSocial && <span>• {patient.obraSocial}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToChat(patient.dni);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/20"
                title="Abrir canal de mensajería con el paciente"
              >
                <MessageSquare className="h-4 w-4 text-[#14BE99]" />
                <span>Chat</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/15 rounded-full transition-colors cursor-pointer text-white/90"
              aria-label="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          
          {/* Patient Quick Info Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Contact Info */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[#1661E1]" /> Contacto
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Teléfono:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">{patient.phone || '—'}</span>
                    {patient.phone && (
                      <button
                        onClick={() => handleCopy(patient.phone!, 'phone')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copiar teléfono"
                      >
                        {copiedField === 'phone' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-slate-800 truncate max-w-[140px]" title={patient.email}>{patient.email || '—'}</span>
                    {patient.email && (
                      <button
                        onClick={() => handleCopy(patient.email!, 'email')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                        title="Copiar email"
                      >
                        {copiedField === 'email' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Ubicación:</span>
                  <span className="font-bold text-slate-800">
                    {patient.city ? `${patient.city}${patient.province ? `, ${patient.province}` : ''}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Health Insurance */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-600" /> Cobertura Médica
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Obra Social:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[140px]" title={patient.obraSocial}>
                    {patient.obraSocial || 'Particular'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Nº Afiliado:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800 font-mono">{patient.obraSocialNumber || '—'}</span>
                    {patient.obraSocialNumber && (
                      <button
                        onClick={() => handleCopy(patient.obraSocialNumber!, 'osNumber')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copiar Nro de Afiliado"
                      >
                        {copiedField === 'osNumber' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 font-medium">Nacimiento:</span>
                  <span className="font-bold text-slate-800">
                    {formatBirthDate(patient.birthDate)} {patientAge !== null ? `(${patientAge}a)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Orders Metric Summary */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-[#14BE99]" /> Historial de Trámites
              </span>
              <div className="flex items-center justify-between pt-1">
                <div className="text-center flex-1 border-r border-slate-200 pr-2">
                  <p className="text-lg font-black text-slate-900">{patient.orders.length}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total</p>
                </div>
                <div className="text-center flex-1 border-r border-slate-200 px-2">
                  <p className="text-lg font-black text-[#14BE99]">{completedCount}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Emitidas</p>
                </div>
                <div className="text-center flex-1 pl-2">
                  <p className="text-lg font-black text-amber-600">{pendingCount}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pendientes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dependents Section if exists */}
          {patient.dependents && patient.dependents.length > 0 && (
            <div className="bg-purple-50/40 border border-purple-200/70 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-700" /> Familiares a Cargo ({patient.dependents.length})
                </span>
                <span className="text-[10px] text-purple-700 font-bold">Adherentes vinculados</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patient.dependents.map((dep, i) => (
                  <div key={dep.id || i} className="bg-white border border-purple-150 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-3xs">
                    <div>
                      <p className="font-bold text-slate-800">{dep.name} {dep.lastName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        DNI: {dep.dni} • {dep.relationship || 'A cargo'}
                      </p>
                    </div>
                    {dep.obraSocial && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-100/70 text-purple-800">
                        {dep.obraSocial}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Orders List of this Patient */}
          <div className="space-y-3.5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1661E1]" />
                  <span>Listado de Solicitudes ({patient.orders.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Historial cronológico de recetas y consultas gestionadas por este paciente.
                </p>
              </div>

              {/* Order Status Filter Buttons */}
              <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 flex text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedOrderTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedOrderTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({patient.orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderTab('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedOrderTab === 'pending' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  Pendientes ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderTab('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedOrderTab === 'completed' ? 'bg-white text-[#0F6C7D] shadow-xs font-bold' : 'text-slate-600 hover:text-[#0141BC]'
                  }`}
                >
                  Emitidas ({completedCount})
                </button>
                {rejectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrderTab('rejected')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedOrderTab === 'rejected' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-rose-800'
                    }`}
                  >
                    Rechazadas ({rejectedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Orders List Container */}
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay solicitudes en esta categoría</p>
                <p className="text-[11px] text-slate-400 mt-0.5">El paciente no registra solicitudes con el filtro seleccionado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isCompleted = order.status === 'Emitida' || order.status === 'Enviada';
                  const isPending = order.status === 'Pendiente' || order.status === 'En revisión' || order.status === 'Solicita más información';

                  return (
                    <div 
                      key={order.id} 
                      className={`bg-white border rounded-2xl transition-all shadow-2xs overflow-hidden ${
                        isExpanded ? 'border-[#1661E1]/40 ring-2 ring-[#1661E1]/10' : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {/* Order Card Summary Row */}
                      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#1661E1] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                              {order.id}
                            </span>
                            
                            {/* Status pill */}
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isCompleted 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                                : isPending
                                  ? 'bg-amber-50 text-amber-700 border-amber-250'
                                  : 'bg-rose-50 text-rose-700 border-rose-250'
                            }`}>
                              {order.status}
                            </span>

                            {/* Payment pill */}
                            {(() => {
                              const pStatus = order.paymentStatus;
                              const isExempt = pStatus === 'exempt' || order.obraSocial === 'PAMI (Inssjp)' || String(order.paymentAmount) === '0';
                              if (pStatus === 'approved') return <span className="text-[9px] font-bold text-[#14BE99] bg-[#14BE99]/10 px-2 py-0.5 rounded-md border border-[#14BE99]/20">Pagado</span>;
                              if (pStatus === 'refunded') return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Reintegrado</span>;
                              if (isExempt) return <span className="text-[9px] font-bold text-[#3066C6] bg-[#3066C6]/10 px-2 py-0.5 rounded-md border border-[#3066C6]/20">Exento</span>;
                              if (pStatus === 'rejected') return <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Pago Rechazado</span>;
                              return <span className="text-[9px] font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200">Pago Pendiente</span>;
                            })()}

                            {order.isForDependent && (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                <Users className="h-2.5 w-2.5" /> Familiar: {order.patientName} {order.patientLastName}
                              </span>
                            )}
                          </div>

                          {/* Medication Summary */}
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {order.medicationItems && order.medicationItems.length > 0
                              ? order.medicationItems.map(m => `${m.nombreComercial} (${m.cantidadCajas} cajas)`).join(', ')
                              : order.medicationText || 'Medicación sin especificar'}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.createdAt).toLocaleDateString('es-AR')} {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {order.diagnostic && (
                              <span className="truncate max-w-[200px]" title={order.diagnostic}>
                                Diag: {order.diagnostic}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons on card */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            {isExpanded ? 'Menos' : 'Detalles'}
                          </button>

                          {onSelectOrder && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectOrder(order.id);
                              }}
                              className="px-3 py-1.5 bg-[#1661E1] hover:bg-[#0141BC] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Ver en la bandeja de trabajo"
                            >
                              <span>Ver Solicitud</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 space-y-3 text-xs animate-fadeIn">
                          {/* Diagnostic and comments */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Diagnóstico
                              </span>
                              <p className="font-semibold text-slate-800">{order.diagnostic || 'No especificado'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Comentarios del Paciente
                              </span>
                              <p className="font-semibold text-slate-800">{order.comments || 'Sin comentarios adicionales'}</p>
                            </div>
                          </div>

                          {/* Medication items breakdown */}
                          {order.medicationItems && order.medicationItems.length > 0 && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Medicamentos Solicitados
                              </span>
                              <div className="divide-y divide-slate-100">
                                {order.medicationItems.map((item, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                                    <div>
                                      <p className="font-bold text-slate-800">{item.nombreComercial}</p>
                                      <p className="text-[10px] text-slate-500">
                                        {item.droga || ''} {item.miligramos ? `• ${item.miligramos}` : ''} {item.presentacion ? `• ${item.presentacion}` : ''}
                                      </p>
                                    </div>
                                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Doctor notes if issued */}
                          {order.doctorNotes && (
                            <div className="bg-emerald-50/50 border border-emerald-200/60 p-3 rounded-xl">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                                Observaciones Médicas
                              </span>
                              <p className="font-semibold text-emerald-950">{order.doctorNotes}</p>
                            </div>
                          )}

                          {/* Action Footer for this Order */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="text-[11px] text-slate-500">
                              {order.createdByOperatorName && (
                                <span>Cargada por operador: <strong>{order.createdByOperatorName}</strong></span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {onNavigateToChat && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToChat(order.id);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Chat de Solicitud</span>
                                </button>
                              )}

                              {order.recipePdfUrl && (
                                <a
                                  href={order.recipePdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-[#14BE99] hover:bg-[#109e7f] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Ver Receta PDF</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Ficha clínica vinculada • <strong>{patient.orders.length}</strong> solicitudes registradas
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
}
