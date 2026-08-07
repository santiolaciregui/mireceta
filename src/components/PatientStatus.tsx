/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MedicalOrder } from '../types';
import { 
  Search, 
  Check,
  Clock, 
  HelpCircle, 
  Activity, 
  Download, 
  FileCheck, 
  AlertCircle,
  Calendar,
  XCircle,
  FileText,
  BookmarkCheck,
  Printer,
  CreditCard,
  ShieldCheck,
  Eye,
  Copy,
  Pill,
  Camera,
  Phone,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  User,
  X
} from 'lucide-react';
import MercadoPagoIcon from './MercadoPagoIcon';

interface PatientStatusProps {
  orders: MedicalOrder[];
  onCancelOrder: (id: string) => void;
  recentDni: string;
  onSetDni: (dni: string) => void;
}

export default function PatientStatus({
  orders,
  onCancelOrder,
  recentDni,
  onSetDni,
}: PatientStatusProps) {
  const [searchDni, setSearchDni] = useState(recentDni || '');
  const [hasSearched, setHasSearched] = useState(!!recentDni);
  const [selectedRecipe, setSelectedRecipe] = useState<MedicalOrder | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'rejected'>('all');
  const [toast, setToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (recentDni) {
      setSearchDni(recentDni);
      setHasSearched(true);
    }
  }, [recentDni]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    showToast(`Código de trámite ${id} copiado al portapapeles`);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2500);
  };

  const cleanDni = searchDni.trim().replace(/\s/g, '');
  
  // Filter orders matching DNI
  const matchedOrders = orders.filter((order) => {
    const orderDniClean = (order.patientDni || '').trim().replace(/\s/g, '');
    return orderDniClean.toLowerCase() === cleanDni.toLowerCase();
  });

  // Filter by status tab
  const filteredOrders = matchedOrders.filter((order) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') {
      return order.status === 'Pendiente' || order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
    }
    if (statusFilter === 'ready') {
      return order.status === 'Emitida' || order.status === 'Enviada';
    }
    if (statusFilter === 'rejected') {
      return order.status === 'Rechazada';
    }
    return true;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni.trim()) return;
    onSetDni(searchDni.trim());
    setHasSearched(true);
  };

  const shouldShowResults = hasSearched || !!recentDni;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fadeIn pb-12">
      
      {/* Search Bar Panel (Shown when no active recentDni or to search another patient) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Search className="h-5 w-5 text-[#295EF3]" />
              <span>Consulta de Estado de Solicitudes</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ingrese el DNI del paciente para consultar el estado en tiempo real y descargar las recetas médicas autorizadas.
            </p>
          </div>

          {cleanDni && (
            <div className="self-start sm:self-auto bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold text-blue-600 tracking-wider">DNI Activo:</span>
              <strong className="font-mono text-xs text-blue-950">{cleanDni}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <input
              id="search-dni-input"
              type="text"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              placeholder="Ej: 42090557"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#295EF3] focus:border-[#295EF3] focus:outline-none transition-all"
            />
          </div>
          <button
            id="btn-search-dni"
            type="submit"
            className="bg-[#1C2435] hover:bg-[#295EF3] text-white font-extrabold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
          >
            Buscar Solicitudes
          </button>
        </form>
      </div>

      {/* Results Header and Quick Filter Tabs */}
      {shouldShowResults && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-wide uppercase">
                Trámites Encontrados ({matchedOrders.length})
              </h4>
            </div>

            {/* Status Filter Pills */}
            {matchedOrders.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                    statusFilter === 'all'
                      ? 'bg-[#1C2435] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos ({matchedOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                  }`}
                >
                  En Proceso ({matchedOrders.filter(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ready')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                    statusFilter === 'ready'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  Emitidas ({matchedOrders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length})
                </button>
                {matchedOrders.some(o => o.status === 'Rechazada') && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                      statusFilter === 'rejected'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-red-50 border border-slate-200'
                    }`}
                  >
                    Rechazadas ({matchedOrders.filter(o => o.status === 'Rechazada').length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Empty State */}
          {matchedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm border border-slate-200/90">
              <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                <HelpCircle className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">No se encontraron solicitudes para este DNI</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Verifique que el número de documento sea el correcto. Si aún no ha solicitado su receta, puede iniciar el trámite en simples pasos.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-[#295EF3] hover:bg-[#1C2435] text-white font-extrabold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  Iniciar Nueva Solicitud
                </button>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-200 text-slate-500 text-xs">
              <p className="font-bold text-slate-700">No hay trámites con el filtro seleccionado</p>
              <button 
                type="button" 
                onClick={() => setStatusFilter('all')}
                className="text-[#295EF3] font-bold hover:underline cursor-pointer"
              >
                Ver todos los trámites
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isPending = order.status === 'Pendiente';
              const isInProcess = order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
              const isReady = order.status === 'Emitida' || order.status === 'Enviada';
              const isRejected = order.status === 'Rechazada';

              return (
                <div 
                  key={order.id} 
                  className={`bg-white rounded-3xl overflow-hidden shadow-md transition-all border ${
                    isReady 
                      ? 'border-emerald-300 ring-1 ring-emerald-500/20' 
                      : isRejected
                        ? 'border-red-300 ring-1 ring-red-500/20'
                        : isInProcess 
                          ? 'border-blue-300 ring-1 ring-blue-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Top Header */}
                  <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100/80 px-5 sm:px-6 py-4 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ID:</span>
                        <strong className="font-mono text-xs font-black text-slate-900">{order.id}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(order.id)}
                          className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                          title="Copiar ID del trámite"
                        >
                          {copiedOrderId === order.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      <span className="text-xs text-slate-500 flex items-center gap-1.5 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(order.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Status Badges */}
                    {order.status === 'Pendiente' && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                        <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                        Pendiente de Revisión
                      </span>
                    )}

                    {order.status === 'En revisión' && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                        <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                        En Auditoría Médica
                      </span>
                    )}

                    {order.status === 'Solicita más información' && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-orange-50 text-orange-900 border border-orange-200 shadow-2xs">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                        Información Solicitada
                      </span>
                    )}

                    {order.status === 'Aprobada' && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs">
                        <FileCheck className="h-3.5 w-3.5 text-teal-600" />
                        Pre-aprobada por Médico
                      </span>
                    )}

                    {order.status === 'Rechazada' && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-red-50 text-red-900 border border-red-200 shadow-2xs">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                        Rechazada (Reembolso listo)
                      </span>
                    )}

                    {(order.status === 'Emitida' || order.status === 'Enviada') && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                        Receta Oficial Emitida
                      </span>
                    )}
                  </div>

                  {/* 3-Step Visual Progress Bar */}
                  <div className="px-5 sm:px-6 pt-4 pb-2 bg-white">
                    <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                      {/* Step 1 */}
                      <div className="flex flex-col items-center text-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          ✓
                        </div>
                        <span className="font-bold text-slate-800">1. Ingresada</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center text-center gap-1">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                          isReady 
                            ? 'bg-emerald-500 text-white' 
                            : isRejected 
                              ? 'bg-red-500 text-white' 
                              : 'bg-blue-600 text-white animate-pulse'
                        }`}>
                          {isReady ? '✓' : isRejected ? '✕' : '2'}
                        </div>
                        <span className={`font-bold ${isReady || isInProcess ? 'text-slate-800' : 'text-slate-400'}`}>
                          2. Auditoría
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center text-center gap-1">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isReady 
                            ? 'bg-emerald-500 text-white shadow-2xs' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                          {isReady ? '✓' : '3'}
                        </div>
                        <span className={`font-bold ${isReady ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}`}>
                          3. Firma y QR
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="p-5 sm:p-6 space-y-5">
                    
                    {/* Patient & Obra Social Key Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          Paciente
                        </p>
                        <p className="font-black text-slate-900 text-sm mt-0.5">
                          {order.patientLastName}, {order.patientName}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">DNI</p>
                        <p className="font-mono font-black text-slate-900 text-sm mt-0.5">
                          {order.patientDni}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Cobertura Médica</p>
                        <p className="font-extrabold text-[#295EF3] text-sm mt-0.5">
                          {order.obraSocial || 'Particular'}
                        </p>
                        {order.obraSocialNumber && (
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">N° {order.obraSocialNumber}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Medio de Notificación</p>
                        <p className="font-extrabold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                          {order.patientPhone ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-mono text-[11px]">
                              WA: {order.patientPhone}
                            </span>
                          ) : (
                            <span className="text-slate-500">Email: {order.patientEmail || 'Cargado'}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Mercado Pago Payment Status Bar */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-xs flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <MercadoPagoIcon className="h-5 w-5" />
                        <div>
                          <span className="font-bold text-slate-800">Estado del Pago: </span>
                          <span className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md ${
                            order.paymentStatus === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : order.paymentStatus === 'rejected' 
                                ? 'bg-red-100 text-red-800 border border-red-200' 
                                : 'bg-amber-100 text-amber-850 border border-amber-200'
                          }`}>
                            {order.paymentStatus === 'approved' ? '✓ Aprobado' :
                             order.paymentStatus === 'rejected' ? '✕ Rechazado' : 'Pendiente de acreditación'}
                          </span>
                        </div>
                      </div>

                      {order.paymentStatus !== 'approved' && order.obraSocial !== 'PAMI (Inssjp)' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/payments/create-preference', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  orderId: order.id,
                                  amount: order.paymentAmount || '10000',
                                  patientName: `${order.patientName} ${order.patientLastName}`,
                                  patientEmail: order.patientEmail,
                                  patientDni: order.patientDni,
                                  origin: window.location.origin,
                                }),
                              });
                              const data = await res.json();
                              if (data.initPoint) {
                                window.location.href = data.initPoint;
                              }
                            } catch (e: any) {
                              alert('Error al conectar con Mercado Pago: ' + e.message);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        >
                          <MercadoPagoIcon className="h-4 w-4" />
                          <span>Pagar $10000 ARS con Mercado Pago</span>
                        </button>
                      )}
                    </div>

                    {/* Requested Medication Card */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <Pill className="h-3.5 w-3.5 text-blue-600" />
                          Medicación Solicitada
                        </p>
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                          Tratamiento Crónico
                        </span>
                      </div>

                      <p className="text-slate-900 font-bold text-xs sm:text-sm whitespace-pre-line leading-relaxed pl-1 border-l-2 border-[#295EF3]">
                        {order.medicationText || 'Medicación según receta adjunta'}
                      </p>
                    </div>

                    {/* Uploaded Medication Photo Preview */}
                    {order.medicationPhotoUrl && (
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-14 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                            <img 
                              src={order.medicationPhotoUrl} 
                              alt="Foto medicamento" 
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-all"
                              onClick={() => setPreviewPhotoUrl(order.medicationPhotoUrl || null)}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <Camera className="h-3.5 w-3.5 text-blue-600" />
                              Foto de Envase / Receta Adjunta
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 truncate max-w-[200px] sm:max-w-xs">{order.medicationPhotoName || 'receta_foto.jpg'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(order.medicationPhotoUrl || null)}
                          className="text-xs font-bold text-[#295EF3] hover:text-[#1C2435] px-3 py-1.5 rounded-xl hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Foto</span>
                        </button>
                      </div>
                    )}

                    {/* READY STATE: Download Banner */}
                    {isReady && (
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4 animate-fadeIn">
                        <div className="flex items-start gap-3.5">
                          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-white shadow-inner">
                            <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
                          </div>
                          <div>
                            <h5 className="font-black text-base sm:text-lg tracking-tight">¡Su receta digital ya fue firmada y validada!</h5>
                            <p className="text-xs text-emerald-100 leading-relaxed mt-1">
                              El médico emisor matriculado ha autorizado su prescripción médica. Puede descargar la orden oficial en PDF o presentar el comprobante digital directamente desde su celular en cualquier farmacia.
                            </p>
                            
                            {order.doctorNotes && (
                              <div className="bg-black/15 p-3 rounded-xl border border-white/15 mt-3 text-xs text-white">
                                <span className="font-bold text-emerald-200 block mb-0.5">Indicación del Profesional Médico:</span>
                                "{order.doctorNotes}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <button
                            id={`btn-download-recipe-${order.id}`}
                            type="button"
                            onClick={() => setSelectedRecipe(order)}
                            className="bg-white text-emerald-950 hover:bg-emerald-50 font-black py-3.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                          >
                            <Eye className="h-4 w-4 text-emerald-700" />
                            <span>Ver Receta Oficial y QR</span>
                          </button>

                          <a
                            href={order.recipePdfUrl || '#'}
                            download={order.recipePdfName || `receta_${order.id}.pdf`}
                            onClick={(e) => {
                              if (!order.recipePdfUrl || order.recipePdfUrl.startsWith('MOCK')) {
                                e.preventDefault();
                                setSelectedRecipe(order);
                              }
                            }}
                            className="bg-emerald-900/40 hover:bg-emerald-900/60 border border-white/20 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                          >
                            <Download className="h-4 w-4" />
                            <span>Descargar PDF</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* PENDING / IN-PROCESS Notice */}
                    {!isReady && !isRejected && (
                      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-950 flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-blue-950 text-xs sm:text-sm">
                            {isPending 
                              ? 'Solicitud en cola de auditoría médica' 
                              : order.status === 'Solicita más información'
                                ? 'El médico ha solicitado información adicional'
                                : 'El profesional médico está evaluando su receta'}
                          </p>
                          <p className="text-blue-900 leading-relaxed">
                            {isPending 
                              ? 'Un médico matriculado validará su diagnóstico y tratamiento. Plazo de resolución: menos de 24 hs hábiles. Recibirá aviso por WhatsApp y correo electrónico.' 
                              : order.status === 'Solicita más información'
                                ? 'Por favor verifique las notas adjuntas o comuníquese a soporte para completar su trámite.'
                                : 'La prescripción está siendo confeccionada con firma electrónica y código QR.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* REJECTED Notice */}
                    {isRejected && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-950 flex items-start gap-3 animate-fadeIn">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-red-950 text-xs sm:text-sm">Solicitud No Aprobada por Criterio Clínico</p>
                          <p className="text-red-900 leading-relaxed">
                            {order.doctorNotes 
                              ? `Observación médica: "${order.doctorNotes}"` 
                              : 'La solicitud no reúne las pautas médicas para renovación asincrónica de tratamiento.'}
                          </p>
                          <p className="text-red-800 font-bold text-[11px] pt-1">
                            🛡️ Garantía de Devolución: El arancel abonado ha sido reintegrado automáticamente a su medio de pago.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://wa.me/5492926414331?text=${encodeURIComponent(`Hola! Consulto por el estado del trámite Nro ${order.id} (DNI ${order.patientDni}).`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Consultar por WhatsApp</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {isReady && (
                        <button
                          type="button"
                          onClick={() => setSelectedRecipe(order)}
                          className="bg-[#1C2435] hover:bg-[#295EF3] text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Comprobante</span>
                        </button>
                      )}

                      {isPending && (
                        <button
                          id={`btn-cancel-order-${order.id}`}
                          onClick={() => {
                            if (window.confirm('¿Está seguro de que desea cancelar esta solicitud? Se procesará la anulación del trámite.')) {
                              onCancelOrder(order.id);
                              showToast('Solicitud de receta cancelada exitosamente.');
                            }
                          }}
                          className="text-red-600 hover:text-red-800 font-bold flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Cancelar Trámite</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Receta Digital Modal Presentación */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-[#1C2435] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-[#295EF3]" />
                <span className="font-black text-xs sm:text-sm tracking-widest text-slate-100 uppercase">
                  Receta Médica Digital Oficial
                </span>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setSelectedRecipe(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Prescription Card */}
            <div className="p-6 overflow-y-auto max-h-[78vh] space-y-4">
              <div className="bg-white border-2 border-[#1C2435] p-5 sm:p-6 rounded-2xl space-y-4 shadow-sm relative">
                
                {/* Stamp overlay */}
                <div className="absolute top-3 right-3 border-2 border-emerald-600 bg-emerald-50/90 rounded-lg px-2.5 py-1 text-[10px] font-black text-emerald-800 uppercase rotate-3 pointer-events-none select-none shadow-xs">
                  ✓ Firma Digital Validada
                </div>

                {/* Doctor Header */}
                <div className="border-b-2 border-slate-200 pb-3 flex justify-between items-start">
                  <div>
                    <h5 className="font-black text-[#1C2435] text-base sm:text-lg">PRESCRIPCIÓN MÉDICA</h5>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide">
                      LEY NACIONAL DE RECETA DIGITAL N° 27.553
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold mt-0.5">Portal Oficial Mi Receta Online</p>
                  </div>
                </div>

                {/* Patient Specs */}
                <div className="space-y-3 py-1">
                  <div className="grid grid-cols-2 text-xs gap-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase">Paciente:</p>
                      <p className="font-black text-slate-900">{selectedRecipe.patientLastName}, {selectedRecipe.patientName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase">DNI:</p>
                      <p className="font-mono font-black text-slate-900">{selectedRecipe.patientDni}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase">Cobertura:</p>
                      <p className="font-bold text-[#295EF3]">{selectedRecipe.obraSocial}</p>
                    </div>
                    {selectedRecipe.obraSocialNumber && (
                      <div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase">N° Credencial:</p>
                        <p className="font-mono font-bold text-slate-800">{selectedRecipe.obraSocialNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Prescription Rp */}
                  <div className="space-y-1.5 pt-2">
                    <span className="font-serif italic font-black text-[#1C2435] text-xl block">Rp.</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="font-black text-slate-900 text-sm whitespace-pre-line leading-relaxed">
                        {selectedRecipe.medicationText}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2 font-medium">
                        Dispensación mensual de tratamiento crónico conforme a la cobertura de la Obra Social.
                      </p>
                    </div>
                  </div>

                  {/* Doctor notes */}
                  {selectedRecipe.doctorNotes && (
                    <div className="text-xs bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-amber-950">
                      <span className="font-bold block mb-0.5">Indicación médica:</span>
                      <p className="leading-relaxed italic">{selectedRecipe.doctorNotes}</p>
                    </div>
                  )}
                </div>

                {/* Footer Stamp & QR Token */}
                <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                  <div className="space-y-1">
                    <div className="h-6 w-36 bg-slate-900 text-white flex items-center justify-center font-mono text-[9px] tracking-[4px] px-1 select-none rounded">
                      ||| | || ||| || ||
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono font-semibold">TOKEN: {selectedRecipe.id}-{selectedRecipe.patientDni.replace(/\D/g, '')}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[11px] text-[#295EF3] font-black border-b border-[#295EF3] pb-0.5 px-4 italic">
                      Firma Médica Digitalizada
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      Matrícula Nacional Habilitada
                    </span>
                  </div>
                </div>

              </div>

              {/* Modal Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  id="btn-print-recipe"
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Imprimir Receta</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast('Receta lista para presentar en farmacia.');
                    setSelectedRecipe(null);
                  }}
                  className="flex-1 bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>Aceptar y Cerrar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setPreviewPhotoUrl(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/20 p-4 space-y-3 animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <p className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-blue-600" />
                Foto de Medicamento Adjunta
              </p>
              <button 
                type="button" 
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-hidden rounded-2xl flex items-center justify-center bg-slate-100">
              <img src={previewPhotoUrl} alt="Foto medicamento ampliada" className="max-h-[58vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-white/20 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-fadeIn font-semibold text-xs max-w-sm">
          <Check className="h-5 w-5 text-emerald-400 shrink-0 stroke-[2.5]" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
