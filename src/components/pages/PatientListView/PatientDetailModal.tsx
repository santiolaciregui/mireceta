/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  FileCheck,
  ExternalLink,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter
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
  // Modal active section tab: 'overview' | 'titular' | 'dependents' | 'orders'
  const [activeSectionTab, setActiveSectionTab] = useState<'overview' | 'titular' | 'dependents' | 'orders'>('overview');
  
  // Orders filtering
  const [selectedOrderTab, setSelectedOrderTab] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all'); // 'all' | 'titular' | cleanDni
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const titularCleanDni = (patient.dni || '').replace(/\D/g, '');
  const titularAge = calculateAge(patient.birthDate);
  const dependentsList = patient.dependents || [];

  // Categorize orders (titular vs specific dependent)
  const titularOrders = patient.orders.filter(o => {
    if (o.isForDependent) return false;
    const cleanOrdDni = (o.patientDni || '').replace(/\D/g, '');
    return !cleanOrdDni || cleanOrdDni === titularCleanDni;
  });

  const dependentsOrders = patient.orders.filter(o => o.isForDependent);

  // Filter orders according to member filter and status tab
  const filteredOrders = patient.orders.filter(order => {
    // 1. Member filter
    if (selectedMemberFilter !== 'all') {
      if (selectedMemberFilter === 'titular') {
        if (order.isForDependent) return false;
        const cleanOrdDni = (order.patientDni || '').replace(/\D/g, '');
        if (cleanOrdDni && cleanOrdDni !== titularCleanDni) return false;
      } else {
        // Filter by specific dependent DNI
        const cleanOrdDni = (order.patientDni || '').replace(/\D/g, '');
        if (cleanOrdDni !== selectedMemberFilter) return false;
      }
    }

    // 2. Status filter
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

  // Helper for quick copyable row
  const DetailRow = ({
    label,
    value,
    copyValue,
    fieldId,
    icon: Icon,
    isMono = false,
  }: {
    label: string;
    value: string | React.ReactNode;
    copyValue?: string;
    fieldId: string;
    icon?: any;
    isMono?: boolean;
  }) => {
    const isCopied = copiedField === fieldId;
    const textToCopy = copyValue !== undefined ? copyValue : (typeof value === 'string' ? value : '');

    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50/80 rounded-xl transition-colors border-b border-slate-100 last:border-0 gap-3">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
          <span>{label}</span>
        </span>
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className={`text-xs font-bold text-slate-800 break-words text-right ${isMono ? 'font-mono' : ''}`}>
            {value || '—'}
          </span>
          {textToCopy && textToCopy !== '—' && (
            <button
              type="button"
              onClick={() => handleCopy(textToCopy, fieldId)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer shrink-0"
              title={`Copiar ${label}`}
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0141BC] via-[#1661E1] to-[#0F6C7D] px-5 py-4 sm:px-7 sm:py-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 border border-white/25 text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-inner shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  {patient.lastName}, {patient.name}
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-400/20 text-blue-100 border border-blue-300/40">
                  Paciente Titular
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  patient.status === 'Activo'
                    ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                    : 'bg-slate-400/20 text-slate-200 border-slate-300/40'
                }`}>
                  {patient.status}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium flex items-center gap-2 flex-wrap">
                <span>DNI: <strong className="font-mono text-white">{patient.dni}</strong></span>
                {titularAge !== null && <span>• {titularAge} años ({formatBirthDate(patient.birthDate)})</span>}
                {patient.obraSocial && <span>• {patient.obraSocial}</span>}
                {dependentsList.length > 0 && (
                  <span className="bg-purple-400/30 text-purple-100 border border-purple-300/40 px-2 py-0.2 rounded-full text-[10px] font-bold">
                    {dependentsList.length} familiares a cargo
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToChat(patient.dni);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/20 shadow-xs"
                title="Abrir canal de chat con el paciente"
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

        {/* Section Navigation Tabs */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-7 pt-2 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSectionTab('overview')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSectionTab === 'overview'
                ? 'border-[#1661E1] text-[#1661E1]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Vista General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('titular')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSectionTab === 'titular'
                ? 'border-[#1661E1] text-[#1661E1]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Ficha del Titular</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('dependents')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSectionTab === 'dependents'
                ? 'border-purple-600 text-purple-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Pacientes a Cargo ({dependentsList.length})</span>
            {dependentsList.length > 0 && (
              <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {dependentsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('orders')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSectionTab === 'orders'
                ? 'border-[#1661E1] text-[#1661E1]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Solicitudes y Recetas ({patient.orders.length})</span>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-7 space-y-6">
          
          {/* ========================================================================= */}
          {/* TAB 1: VISTA GENERAL (OVERVIEW) OR TAB 2: FICHA DEL TITULAR              */}
          {/* ========================================================================= */}
          {(activeSectionTab === 'overview' || activeSectionTab === 'titular') && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Titular Section Header Banner */}
              <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#1661E1] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {patient.name} {patient.lastName}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0141BC]">
                        Titular de la Cuenta
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      DNI: <span className="font-mono font-bold text-slate-700">{patient.dni}</span> • ID Sistema: <span className="font-mono text-slate-500">{patient.id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {patient.phone && (
                    <a
                      href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>WhatsApp Directo</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 3 Blocks Grid for Titular */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Datos Personales */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#1661E1]" /> Datos Personales
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{patient.id}</span>
                  </div>
                  <div className="space-y-0.5">
                    <DetailRow label="Nombre Completo" value={`${patient.name} ${patient.lastName}`} fieldId="t_name" />
                    <DetailRow label="DNI" value={patient.dni} copyValue={patient.dni} fieldId="t_dni" isMono />
                    <DetailRow 
                      label="Nacimiento" 
                      value={`${formatBirthDate(patient.birthDate)}${titularAge !== null ? ` (${titularAge} años)` : ''}`} 
                      copyValue={formatBirthDate(patient.birthDate)}
                      fieldId="t_birth" 
                    />
                    <DetailRow label="Estado Cuenta" value={patient.status} fieldId="t_status" />
                    <DetailRow label="Familiares a Cargo" value={`${dependentsList.length} registrados`} fieldId="t_deps" />
                  </div>
                </div>

                {/* 2. Contacto y Residencia */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" /> Contacto y Ubicación
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">Verificado</span>
                  </div>
                  <div className="space-y-0.5">
                    <DetailRow label="Teléfono / Celular" value={patient.phone || '—'} copyValue={patient.phone} fieldId="t_phone" />
                    <DetailRow label="Correo Electrónico" value={patient.email || '—'} copyValue={patient.email} fieldId="t_email" />
                    <DetailRow label="Ciudad / Localidad" value={patient.city || '—'} fieldId="t_city" />
                    <DetailRow label="Provincia" value={patient.province || 'Buenos Aires'} fieldId="t_province" />
                  </div>
                </div>

                {/* 3. Cobertura Médica */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-600" /> Cobertura Médica
                    </span>
                    <span className="text-[10px] font-bold text-blue-600">Titular</span>
                  </div>
                  <div className="space-y-0.5">
                    <DetailRow label="Obra Social / Prepaga" value={patient.obraSocial || 'Particular'} fieldId="t_os" />
                    <DetailRow 
                      label="Nº Afiliado / Credencial" 
                      value={patient.obraSocialNumber || '—'} 
                      copyValue={patient.obraSocialNumber}
                      fieldId="t_osNum" 
                      isMono 
                    />
                    <DetailRow label="Condición" value="Titular de Cobertura" fieldId="t_cond" />
                    <DetailRow 
                      label="Total Solicitudes" 
                      value={`${patient.orders.length} (${completedCount} emitidas, ${pendingCount} pend.)`} 
                      fieldId="t_orders_tot" 
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PACIENTES A CARGO (FAMILIARES / ADHERENTES)                       */}
          {/* ========================================================================= */}
          {(activeSectionTab === 'overview' || activeSectionTab === 'dependents') && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-purple-950 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-700" />
                    <span>Pacientes a Cargo / Familiares Adherentes ({dependentsList.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Familiares declarados bajo la titularidad de <strong>{patient.name} {patient.lastName}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-xl">
                    {dependentsList.length} miembros a cargo
                  </span>
                </div>
              </div>

              {dependentsList.length === 0 ? (
                <div className="p-8 text-center bg-purple-50/30 border border-dashed border-purple-200 rounded-2xl">
                  <Users className="h-8 w-8 text-purple-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No posee familiares a cargo registrados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">El paciente gestiona únicamente trámites a su propio nombre.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dependentsList.map((dep, index) => {
                    const depCleanDni = (dep.dni || '').replace(/\D/g, '');
                    const depAge = calculateAge(dep.birthDate);
                    const depInitials = `${(dep.name || '').charAt(0)}${(dep.lastName || '').charAt(0)}`.toUpperCase();
                    
                    // Count orders specific to this dependent
                    const depOrders = patient.orders.filter(o => {
                      const oCleanDni = (o.patientDni || '').replace(/\D/g, '');
                      return oCleanDni === depCleanDni;
                    });
                    const depCompletedCount = depOrders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
                    const depPendingCount = depOrders.filter(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Solicita más información').length;

                    return (
                      <div 
                        key={dep.id || dep.dni || index}
                        className="bg-white border-2 border-purple-150 hover:border-purple-300 rounded-2xl p-4.5 transition-all shadow-2xs space-y-3 relative overflow-hidden group"
                      >
                        {/* Top corner relationship badge */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-100">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 font-extrabold text-sm flex items-center justify-center shadow-3xs shrink-0">
                              {depInitials || 'FAM'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                                {dep.name} {dep.lastName}
                              </h4>
                              <p className="text-[11px] text-purple-700 font-bold mt-0.5 flex items-center gap-1">
                                <span>Parentesco:</span>
                                <span className="bg-purple-50 text-purple-900 px-2 py-0.2 rounded-md border border-purple-200">
                                  {dep.relationship || 'Familiar a cargo'}
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Complete Dependent Details Table */}
                        <div className="space-y-1 bg-purple-50/30 p-2.5 rounded-xl border border-purple-100/70 text-xs">
                          
                          {/* DNI */}
                          <div className="flex items-center justify-between py-1 px-1.5 border-b border-purple-100/50">
                            <span className="text-slate-500 font-semibold">Documento (DNI):</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-slate-800">{dep.dni || '—'}</span>
                              {dep.dni && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(dep.dni, `dep_${index}_dni`)}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copiar DNI"
                                >
                                  {copiedField === `dep_${index}_dni` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* BirthDate & Age */}
                          <div className="flex items-center justify-between py-1 px-1.5 border-b border-purple-100/50">
                            <span className="text-slate-500 font-semibold">Fecha de Nacimiento:</span>
                            <span className="font-bold text-slate-800">
                              {formatBirthDate(dep.birthDate)} {depAge !== null ? `(${depAge} años)` : ''}
                            </span>
                          </div>

                          {/* Health Insurance */}
                          <div className="flex items-center justify-between py-1 px-1.5 border-b border-purple-100/50">
                            <span className="text-slate-500 font-semibold">Obra Social / Prepaga:</span>
                            <span className="font-bold text-purple-900">
                              {dep.obraSocial || patient.obraSocial || 'Particular'}
                            </span>
                          </div>

                          {/* Health Insurance Card Number */}
                          <div className="flex items-center justify-between py-1 px-1.5 border-b border-purple-100/50">
                            <span className="text-slate-500 font-semibold">Nº Afiliado / Credencial:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-slate-800">
                                {dep.obraSocialNumber || patient.obraSocialNumber || '—'}
                              </span>
                              {(dep.obraSocialNumber || patient.obraSocialNumber) && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(dep.obraSocialNumber || patient.obraSocialNumber || '', `dep_${index}_osNum`)}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copiar Credencial"
                                >
                                  {copiedField === `dep_${index}_osNum` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Contact if available */}
                          {(dep.phone || dep.email) && (
                            <div className="flex items-center justify-between py-1 px-1.5 border-b border-purple-100/50">
                              <span className="text-slate-500 font-semibold">Contacto Propio:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[170px]">
                                {dep.phone || dep.email}
                              </span>
                            </div>
                          )}

                          {/* Residencia if available */}
                          {(dep.city || dep.province) && (
                            <div className="flex items-center justify-between py-1 px-1.5">
                              <span className="text-slate-500 font-semibold">Ubicación:</span>
                              <span className="font-bold text-slate-800">
                                {dep.city ? `${dep.city}${dep.province ? `, ${dep.province}` : ''}` : dep.province}
                              </span>
                            </div>
                          )}

                        </div>

                        {/* Action footer for this dependent */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-[11px] text-slate-500 font-medium">
                            <span>Solicitudes del familiar: <strong>{depOrders.length}</strong></span>
                            {depPendingCount > 0 && <span className="text-amber-700 font-bold ml-1">({depPendingCount} pend.)</span>}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberFilter(depCleanDni);
                              setActiveSectionTab('orders');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 hover:bg-purple-700 text-purple-900 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                          >
                            <span>Ver Solicitudes</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HISTORIAL DE SOLICITUDES Y RECETAS (TITULAR Y ADHERENTES)          */}
          {/* ========================================================================= */}
          {(activeSectionTab === 'overview' || activeSectionTab === 'orders') && (
            <div className="space-y-4 animate-fadeIn pt-2">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1661E1]" />
                    <span>Historial de Solicitudes y Recetas ({patient.orders.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial cronológico de recetas solicitadas tanto por el titular como para familiares a cargo.
                  </p>
                </div>

                {/* Order Status Filters */}
                <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex text-xs font-semibold self-start sm:self-auto">
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

              {/* Member Filter Pills (if patient has dependents) */}
              {dependentsList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Filtrar por Paciente:
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedMemberFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedMemberFilter === 'all'
                        ? 'bg-[#1661E1] text-white shadow-3xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Toda la Familia ({patient.orders.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMemberFilter('titular')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedMemberFilter === 'titular'
                        ? 'bg-[#1661E1] text-white shadow-3xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    👤 Solo Titular: {patient.name} ({titularOrders.length})
                  </button>

                  {dependentsList.map((dep, idx) => {
                    const depCleanDni = (dep.dni || '').replace(/\D/g, '');
                    const depOrdersCount = patient.orders.filter(o => (o.patientDni || '').replace(/\D/g, '') === depCleanDni).length;
                    const isSelected = selectedMemberFilter === depCleanDni;

                    return (
                      <button
                        key={dep.id || depCleanDni || idx}
                        type="button"
                        onClick={() => setSelectedMemberFilter(depCleanDni)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-700 text-white shadow-3xs'
                            : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        👥 {dep.name} ({depOrdersCount})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Orders List Container */}
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No se encontraron solicitudes</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No hay solicitudes registradas con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const isCompleted = order.status === 'Emitida' || order.status === 'Enviada';
                    const isPending = order.status === 'Pendiente' || order.status === 'En revisión' || order.status === 'Solicita más información';
                    const isDependentOrder = order.isForDependent;

                    return (
                      <div 
                        key={order.id} 
                        className={`bg-white border rounded-2xl transition-all shadow-2xs overflow-hidden ${
                          isExpanded ? 'border-[#1661E1]/50 ring-2 ring-[#1661E1]/10' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Order Header Summary Row */}
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            
                            {/* Badges Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-[#1661E1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                {order.id}
                              </span>

                              {/* Patient Target Badge: Titular vs Familiar */}
                              {isDependentOrder ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-250 flex items-center gap-1">
                                  <Users className="h-3 w-3 text-purple-700" />
                                  <span>Familiar a Cargo: <strong>{order.patientName} {order.patientLastName}</strong> ({order.dependentRelationship || 'A cargo'})</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
                                  <User className="h-3 w-3 text-[#1661E1]" />
                                  <span>Paciente Titular: <strong>{patient.name} {patient.lastName}</strong></span>
                                </span>
                              )}

                              {/* Status Badge */}
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                isCompleted 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                  : isPending 
                                    ? 'bg-amber-50 text-amber-700 border-amber-250' 
                                    : 'bg-rose-50 text-rose-700 border-rose-250'
                              }`}>
                                {order.status}
                              </span>

                              {/* Payment Badge */}
                              {(() => {
                                const pStatus = order.paymentStatus;
                                const isExempt = pStatus === 'exempt' || order.obraSocial === 'PAMI (Inssjp)' || String(order.paymentAmount) === '0';
                                if (pStatus === 'approved') return <span className="text-[9px] font-extrabold text-[#14BE99] bg-[#14BE99]/10 px-2 py-0.5 rounded-md border border-[#14BE99]/20">Pagado (${order.paymentAmount || '10.000'})</span>;
                                if (pStatus === 'refunded') return <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Reintegrado</span>;
                                if (isExempt) return <span className="text-[9px] font-extrabold text-[#3066C6] bg-[#3066C6]/10 px-2 py-0.5 rounded-md border border-[#3066C6]/20">Exento</span>;
                                if (pStatus === 'rejected') return <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Rechazado</span>;
                                return <span className="text-[9px] font-extrabold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200">Pago Pendiente</span>;
                              })()}
                            </div>

                            {/* Medication Summary */}
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {order.medicationItems && order.medicationItems.length > 0
                                ? order.medicationItems.map(m => `${m.nombreComercial} (${m.cantidadCajas} ${m.cantidadCajas === 1 ? 'caja' : 'cajas'})`).join(' • ')
                                : order.medicationText || 'Medicación sin especificar'}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleDateString('es-AR')} {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>• Cobertura: <strong className="text-slate-600">{order.obraSocial}</strong></span>
                              {order.diagnostic && (
                                <span className="truncate max-w-[220px]" title={order.diagnostic}>
                                  • Diagnóstico: <strong className="text-slate-600">{order.diagnostic}</strong>
                                </span>
                              )}
                            </div>

                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Menos' : 'Detalles'}</span>
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>

                            {onSelectOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectOrder(order.id);
                                }}
                                className="px-3.5 py-1.5 bg-[#1661E1] hover:bg-[#0141BC] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Abrir en bandeja de solicitudes"
                              >
                                <span>Ver Solicitud</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Drawer */}
                        {isExpanded && (
                          <div className="p-4.5 bg-slate-50/80 border-t border-slate-200 space-y-3.5 text-xs animate-fadeIn">
                            
                            {/* Patient & Beneficiary Data Box */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Paciente Beneficiario</span>
                                <p className="font-bold text-slate-900">{order.patientName} {order.patientLastName}</p>
                                <p className="text-[11px] text-slate-500 font-mono">DNI: {order.patientDni}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Cobertura Utilizada</span>
                                <p className="font-bold text-slate-900">{order.obraSocial}</p>
                                <p className="text-[11px] text-slate-500 font-mono">Nº Af: {order.obraSocialNumber || '—'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Titular Solicitante</span>
                                <p className="font-bold text-slate-900">{order.requestedByTitularName || `${patient.name} ${patient.lastName}`}</p>
                                <p className="text-[11px] text-slate-500 font-mono">DNI: {order.requestedByTitularDni || patient.dni}</p>
                              </div>
                            </div>

                            {/* Diagnostic & Comments */}
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
                              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Medicamentos Solicitados ({order.medicationItems.length})
                                </span>
                                <div className="divide-y divide-slate-100">
                                  {order.medicationItems.map((item, idx) => (
                                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                                      <div>
                                        <p className="font-bold text-slate-900">{item.nombreComercial}</p>
                                        <p className="text-[11px] text-slate-500">
                                          {item.droga ? `Droga: ${item.droga}` : ''} {item.miligramos ? `• ${item.miligramos}` : ''} {item.presentacion ? `• ${item.presentacion}` : ''}
                                        </p>
                                        {item.posologia && (
                                          <p className="text-[10px] text-slate-400 mt-0.5">Posología: {item.posologia}</p>
                                        )}
                                      </div>
                                      <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                                        {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Doctor notes if issued */}
                            {order.doctorNotes && (
                              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                                  Observaciones Médicas / Auditoría
                                </span>
                                <p className="font-semibold text-emerald-950">{order.doctorNotes}</p>
                              </div>
                            )}

                            {/* Action Footer for this Order */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
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
                                    className="px-3.5 py-1.5 bg-[#14BE99] hover:bg-[#109e7f] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
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
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>Ficha clínica vinculada</span>
            <span>•</span>
            <span><strong>{patient.orders.length}</strong> solicitudes</span>
            <span>•</span>
            <span><strong>{dependentsList.length}</strong> familiares a cargo</span>
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
