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
  Sparkles
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
    }, 4500);
  };

  const cleanDni = searchDni.trim().replace(/\s/g, '');
  
  // Filter orders matching DNI
  const matchedOrders = orders.filter((order) => {
    const orderDniClean = order.patientDni.trim().replace(/\s/g, '');
    return orderDniClean.toLowerCase() === cleanDni.toLowerCase();
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni.trim()) return;
    onSetDni(searchDni.trim());
    setHasSearched(true);
  };

  // Helper code to print/simulate downloading the receta
  const handleSimulateDownload = (order: MedicalOrder) => {
    setSelectedRecipe(order);
  };

  // Helper function to format ISO date to readable string
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shouldShowResults = hasSearched || !!recentDni;

  return (
    <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Search Bar Panel (Only shown if NOT logged in / no recentDni) */}
      {!recentDni && (
        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border border-white/40">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Consulta el Estado de tu Receta</h3>
          <p className="text-xs text-slate-500 mb-4">
            Ingresa el número de DNI del paciente para verificar los pedidos cargados y descargar la orden médica lista.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="search-dni-input"
                type="text"
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value)}
                placeholder="Ingrese número de DNI..."
                className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-300 rounded-xl font-semibold text-[#1C2435] focus:bg-white focus:ring-2 focus:ring-[#295EF3] focus:outline-none transition-all"
              />
            </div>
            <button
              id="btn-search-dni"
              type="submit"
              className="bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold px-6 py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </div>
      )}

      {/* Search Results */}
      {shouldShowResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pedidos de receta encontrados ({matchedOrders.length})
            </h4>
            {cleanDni && (
              <span className="text-xs text-[#295EF3] font-bold bg-[#295EF3]/10 border border-[#295EF3]/20 px-3 py-1 rounded-full">
                DNI: {cleanDni}
              </span>
            )}
          </div>

          {matchedOrders.length === 0 ? (
            <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-3 shadow-xs border border-white/40">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-805 text-sm">No encontramos solicitudes</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Verifica el número de DNI ingresado o inicia un nuevo trámite con el formulario de la pestaña "Iniciar Solicitud".
                </p>
              </div>
            </div>
          ) : (
            matchedOrders.map((order) => {
              const isPending = order.status === 'Pendiente';
              const isInProcess = order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
              const isReady = order.status === 'Emitida' || order.status === 'Enviada';
              const isRejected = order.status === 'Rechazada';

              return (
                <div 
                  key={order.id} 
                  className={`glass rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm transition-all ring-1 ${
                    isReady 
                      ? 'ring-emerald-500/25 border-emerald-500/30' 
                      : isRejected
                        ? 'ring-red-500/25 border-red-500/30'
                        : isInProcess 
                          ? 'ring-blue-500/25' 
                          : 'ring-amber-500/15'
                  }`}
                >
                  {/* Card Header Status */}
                  <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-105 flex items-center justify-between flex-wrap gap-2 ${
                    isReady 
                      ? 'bg-emerald-50/25 font-bold' 
                      : isRejected
                        ? 'bg-red-50/25 font-bold'
                        : isInProcess 
                          ? 'bg-[#295EF3]/10 font-bold' 
                          : 'bg-amber-50/15 font-bold'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#1C2435] text-sm">ID: {order.id}</span>
                      <span className="text-slate-300 text-sm">|</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(order.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    {/* Status Badges */}
                    {order.status === 'Pendiente' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-55 text-amber-900 border border-amber-200">
                        <Clock className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                        Pendiente de Revisión
                      </span>
                    )}

                    {order.status === 'En revisión' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#295EF3]/15 text-[#295EF3] border border-[#295EF3]/30">
                        <Activity className="h-3.5 w-3.5 text-[#295EF3] animate-pulse" />
                        En revisión médica
                      </span>
                    )}

                    {order.status === 'Solicita más información' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                        Se solicita más información
                      </span>
                    )}

                    {order.status === 'Aprobada' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#295EF3]/15 text-[#295EF3] border border-[#295EF3]/30">
                        <FileCheck className="h-3.5 w-3.5 text-[#295EF3]" />
                        Solicitud Pre-aprobada
                      </span>
                    )}

                    {order.status === 'Rechazada' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-200">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                        Rechazada (Pago Reembolsado)
                      </span>
                    )}

                    {order.status === 'Emitida' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#316F80] text-white shadow-xs">
                        <FileCheck className="h-3.5 w-3.5 text-white font-bold" />
                        Listo para retirar / farmacia
                      </span>
                    )}

                    {order.status === 'Enviada' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#316F80] text-white shadow-xs">
                        <FileCheck className="h-3.5 w-3.5 text-white font-bold" />
                        Enviada al paciente
                      </span>
                    )}
                  </div>

                  {/* Order Details Body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-semibold">Paciente</p>
                        <p className="font-bold text-[#1C2435] text-sm">{order.patientLastName}, {order.patientName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold">Obra Social o Cobertura</p>
                        <p className="font-bold text-[#316F80] text-sm">{order.obraSocial}</p>
                      </div>
                    </div>

                    {/* Mercado Pago Payment Status Info */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800">Pago Mercado Pago: </span>
                          <span className={`font-extrabold ${
                            order.paymentStatus === 'approved' ? 'text-emerald-700' :
                            order.paymentStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
                          }`}>
                            {order.paymentStatus === 'approved' ? 'Aprobado' :
                             order.paymentStatus === 'rejected' ? 'Rechazado' : 'Pendiente de acreditación'}
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
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <MercadoPagoIcon className="h-4 w-4" />
                          <span>Pagar con Mercado Pago</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-white/40 border border-slate-105 rounded-xl p-3 text-xs">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Medicación Solicitada</p>
                      <p className="text-slate-800 font-semibold whitespace-pre-line">{order.medicationText}</p>
                    </div>

                    {/* Show uploaded medication preview if any */}
                    {order.medicationPhotoUrl && (
                      <div className="flex items-center gap-2 bg-white/40 p-2 rounded-xl border border-white/45">
                        <div className="h-10 w-12 bg-white rounded border border-slate-205 overflow-hidden flex items-center justify-center shrink-0">
                          <img 
                            src={order.medicationPhotoUrl} 
                            alt="Foto medicamento" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Foto del Medicamento Adjunta</p>
                          <p className="text-[11px] font-mono text-slate-600 truncate max-w-[200px] sm:max-w-xs">{order.medicationPhotoName}</p>
                        </div>
                      </div>
                    )}

                    {/* Ready state download panel */}
                    {isReady && (
                      <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/50 space-y-3 mt-1.5 animate-fadeIn">
                        <div className="flex items-start gap-2.5">
                          <BookmarkCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-bold text-emerald-950">¡Tu receta digital ya fue firmada de forma autorizada!</p>
                            <p className="text-emerald-800 mt-1">
                              El médico resolvió tu pedido. Descarga a continuación tu comprobante digital de receta. Llévalo en tu celular para presentarlo en cualquier farmacia habilitada.
                            </p>
                            
                            {order.doctorNotes && (
                              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 mt-2.5 text-[11px] text-slate-700 font-semibold">
                                <span className="font-bold text-slate-800 block mb-0.5">Nota de la Dra./Dr:</span>
                                "{order.doctorNotes}"
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          id={`btn-download-recipe-${order.id}`}
                          type="button"
                          onClick={() => handleSimulateDownload(order)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
                        >
                          <Download className="h-4.5 w-4.5" />
                          <span>DESCARGAR RECETA DIGITAL (PDF)</span>
                        </button>
                      </div>
                    )}

                    {/* Progress feedback for process or pending state */}
                    {!isReady && !isRejected && (
                      <div className="p-3 bg-white/40 border border-slate-105 rounded-xl text-xs flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">
                          {isPending 
                            ? 'Esperando a que el panel médico valide tu comprobante y prepare tu receta.' 
                            : order.status === 'Solicita más información'
                              ? 'El médico ha solicitado información adicional. Revisa las notas abajo o contacta soporte.'
                              : 'La médica / médico de cabecera está confeccionando la receta en este momento.'}
                        </span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-semibold animate-fadeIn">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-750">
                          {order.doctorNotes 
                            ? `Motivo de rechazo: "${order.doctorNotes}"` 
                            : 'No cumple con las pautas de renovación asincrónica de tratamientos crónicos.'} El pago ha sido reembolsado a su cuenta.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cancel / Delete option for pending orders (safety feature) */}
                  {isPending && (
                    <div className="px-5 py-3 border-t border-slate-105 bg-white/20 flex justify-end">
                      <button
                        id={`btn-cancel-order-${order.id}`}
                        onClick={() => {
                          onCancelOrder(order.id);
                          showToast('Solicitud de receta cancelada exitosamente.');
                        }}
                        className="text-xs text-red-655 hover:text-red-800 font-bold flex items-center gap-1 px-2.5 py-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancelar Pedido</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Receta Digital Presentación */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-dark rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/20 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-[#1C2435] text-white px-6 py-4 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-[#295EF3]" />
                <span className="font-extrabold text-xs sm:text-sm tracking-widest text-slate-100">COMPROBANTE OFICIAL DE RECETA</span>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setSelectedRecipe(null)}
                className="text-white hover:text-slate-200 text-xs bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl cursor-pointer font-extrabold transition-all border border-white/20"
              >
                Cerrar
              </button>
            </div>

            {/* Simulated Printed Prescription Recipe Card */}
            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4">
              <div className="bg-white border-[3px] border-[#316F80] p-5 rounded-2xl space-y-4 shadow-inner relative">
                
                {/* Stamp overlay or watermark */}
                <div className="absolute top-2 right-2 border-2 border-dashed border-[#316F80] rounded-lg px-2.5 py-1 text-[10px] font-black text-[#316F80] uppercase rotate-6 pointer-events-none select-none">
                  Firma Digitalizada
                </div>

                {/* Doctor Header */}
                <div className="border-b-2 border-[#316F80]/20 pb-3 flex justify-between items-start">
                  <div>
                    <h5 className="font-black text-[#1C2435] text-base">PRESCRIPCIÓN MÉDICA OFICIAL</h5>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wide">
                      AUDITORÍA MÉDICA DIGITAL Y VALIDACIÓN PROFESIONAL
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold">Portal Oficial de Recetas Médicas</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold bg-[#295EF3]/10 text-[#295EF3] px-2.5 py-1 rounded-full border border-[#295EF3]/20">
                      Receta Validada
                    </span>
                  </div>
                </div>

                {/* Recipe Body details */}
                <div className="space-y-3.5 py-2">
                  <div className="grid grid-cols-2 text-xs gap-y-1.5 border-b border-slate-100 pb-2">
                    <p className="text-slate-400 font-semibold">Paciente:</p>
                    <p className="font-bold text-[#1C2435] text-right">{selectedRecipe.patientLastName}, {selectedRecipe.patientName}</p>
                    
                    <p className="text-slate-400 font-semibold">DNI del Paciente:</p>
                    <p className="font-bold text-[#1C2435] text-right font-mono">{selectedRecipe.patientDni}</p>

                    <p className="text-slate-400 font-semibold">Obra Social:</p>
                    <p className="font-bold text-[#316F80] text-right">{selectedRecipe.obraSocial}</p>

                    {selectedRecipe.obraSocialNumber && (
                      <>
                        <p className="text-slate-400 font-semibold">Credencial N°:</p>
                        <p className="font-bold font-mono text-[#1C2435] text-right">{selectedRecipe.obraSocialNumber}</p>
                      </>
                    )}
                  </div>

                  {/* Prescription RP */}
                  <div className="space-y-2 mt-2">
                    <span className="font-black text-[#1C2435] text-lg block">Rp.</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="font-bold text-[#1C2435] text-sm italic">
                        "{selectedRecipe.medicationText}"
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Tratamiento habitual crónica autorizado. Dispensación mensual según cobertura autorizada de la Obra Social.
                      </p>
                    </div>
                  </div>

                  {/* Doctor notes if provided */}
                  {selectedRecipe.doctorNotes && (
                    <div className="text-xs bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                      <span className="font-extrabold text-[#1C2435] block">Indicaciones médicas especiales:</span>
                      <p className="text-slate-600 leading-relaxed italic">{selectedRecipe.doctorNotes}</p>
                    </div>
                  )}
                </div>

                {/* Stamp Signature and Barcode */}
                <div className="pt-4 border-t-2 border-[#316F80]/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                  
                  {/* QR and Barcode */}
                  <div className="space-y-1">
                    <div className="h-6 w-38 bg-[#1C2435] text-white flex items-center justify-center font-mono text-[9px] tracking-[4px] px-1 select-none">
                      ||| | || ||| || ||
                    </div>
                    <p className="text-[8px] text-slate-400 font-mono font-semibold">RECETA-TOKEN: {selectedRecipe.id}-{selectedRecipe.patientDni.replace(/\D/g, '')}</p>
                  </div>

                  {/* Doctor Signature Stamp */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-[#316F80] font-bold border-b border-[#316F80] pb-1 px-8 italic">
                      Firma y Sello Digital Validado
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                      Sello de Validación Oficial
                    </span>
                  </div>

                </div>

              </div>

              {/* Action Buttons inside Modal */}
              <div className="pt-2 flex gap-2">
                <button
                  id="btn-print-recipe"
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="h-4.5 w-4.5" />
                  <span>Imprimir Receta</span>
                </button>
                <a
                  id="btn-simulation-download"
                  href={selectedRecipe.recipePdfUrl || '#'}
                  download={selectedRecipe.recipePdfName || 'receta_autorizada.pdf'}
                  onClick={(e) => {
                    if (!selectedRecipe.recipePdfUrl || selectedRecipe.recipePdfUrl.startsWith('MOCK')) {
                      e.preventDefault();
                      showToast('Descargando comprobante oficial de receta: ' + (selectedRecipe.recipePdfName || 'receta_firmada.pdf'));
                    }
                  }}
                  className="flex-1 bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Descargar PDF</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-white/20 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-fadeIn font-semibold text-xs max-w-sm">
          <Check className="h-5 w-5 text-emerald-400 shrink-0 stroke-[2.5]" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
