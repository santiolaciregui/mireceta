/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { copyToClipboard } from '../../../utils/clipboard';
import { 
  Check,
  Clock, 
  HelpCircle, 
  Download, 
  AlertCircle,
  FileText,
  CreditCard,
  ShieldCheck,
  Copy,
  Pill,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  MessageSquare,
  X,
  Eye,
  PlusCircle,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  Printer,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { MedicalOrder, DependentPatient } from '../../../types';
import MercadoPagoIcon from '../../MercadoPagoIcon';
import OfficialOrderReceipt from '../../OfficialOrderReceipt';
import ConfirmDeleteModal from '../../common/ConfirmDeleteModal';

interface PatientStatusProps {
  orders: MedicalOrder[];
  onCancelOrder: (id: string) => Promise<boolean | void> | void;
  recentDni?: string;
  onSetDni?: (dni: string) => void;
  currentUser?: any;
  onNavigateToChat?: (orderId: string) => void;
  onNavigateToNew?: () => void;
}

export default function PatientStatus({
  orders,
  onCancelOrder,
  currentUser,
  onNavigateToChat,
  onNavigateToNew,
}: PatientStatusProps) {
  // State filters
  const [selectedPerson, setSelectedPerson] = useState<string>('all'); // 'all' | 'titular' | dependent DNI
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Expanded card state: set of order IDs expanded
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  
  // Modal / Preview state
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<MedicalOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<MedicalOrder | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;
    setIsCancellingOrder(true);
    try {
      await onCancelOrder(orderToCancel.id);
      showToast('Solicitud cancelada y eliminada correctamente');
      setOrderToCancel(null);
    } catch (err: any) {
      showToast(err.message || 'Error al cancelar la solicitud');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleCopyOrderId = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const success = await copyToClipboard(id);
    if (success) {
      setCopiedOrderId(id);
      showToast(`Código de trámite ${id} copiado al portapapeles`);
      setTimeout(() => {
        setCopiedOrderId(null);
      }, 2500);
    }
  };

  const handlePrintOrder = (e: React.MouseEvent, order: MedicalOrder) => {
    e.stopPropagation();
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    filteredOrders.forEach(o => {
      next[o.id] = expand;
    });
    setExpandedOrderIds(next);
  };

  // Extract patient titular and dependents
  const titularDni = (currentUser?.identifier || '').trim().replace(/\s/g, '').toLowerCase();
  const titularName = `${currentUser?.name || ''} ${currentUser?.lastName || ''}`.trim() || 'Titular';
  const dependents: DependentPatient[] = currentUser?.dependents || [];

  // Filter orders corresponding to this patient and their dependents
  const patientOrders = useMemo(() => {
    const depDnis = dependents.map(d => (d.dni || d.identifier || '').trim().replace(/\s/g, '').toLowerCase()).filter(Boolean);
    
    return orders.filter(order => {
      const orderDni = (order.patientDni || '').trim().replace(/\s/g, '').toLowerCase();
      // If matches titular DNI or any dependent DNI
      if (titularDni && orderDni === titularDni) return true;
      if (depDnis.includes(orderDni)) return true;
      // Fallback: if no user DNI is available, show user's orders
      if (!titularDni && depDnis.length === 0) return true;
      return false;
    });
  }, [orders, titularDni, dependents]);

  // Filter by person (Titular vs. specific Persona a cargo)
  const personFilteredOrders = useMemo(() => {
    if (selectedPerson === 'all') return patientOrders;
    if (selectedPerson === 'titular') {
      return patientOrders.filter(o => (o.patientDni || '').trim().replace(/\s/g, '').toLowerCase() === titularDni);
    }
    // Specific dependent DNI
    return patientOrders.filter(o => (o.patientDni || '').trim().replace(/\s/g, '').toLowerCase() === selectedPerson.toLowerCase());
  }, [patientOrders, selectedPerson, titularDni]);

  // Filter by status and search query
  const filteredOrders = useMemo(() => {
    return personFilteredOrders.filter(order => {
      // Status filter
      if (statusFilter === 'pending') {
        const isPending = order.status === 'Pendiente' || order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
        if (!isPending) return false;
      } else if (statusFilter === 'ready') {
        const isReady = order.status === 'Emitida' || order.status === 'Enviada';
        if (!isReady) return false;
      } else if (statusFilter === 'rejected') {
        if (order.status !== 'Rechazada') return false;
      }

      // Search filter (by ID, medication name, or patient name)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesId = (order.id || '').toLowerCase().includes(term);
        const matchesMedText = (order.medicationText || '').toLowerCase().includes(term);
        const matchesPatient = `${order.patientName} ${order.patientLastName}`.toLowerCase().includes(term);
        const matchesItems = (order.medicationItems || []).some(item => 
          item.nombreComercial.toLowerCase().includes(term) || item.droga.toLowerCase().includes(term)
        );
        return matchesId || matchesMedText || matchesPatient || matchesItems;
      }

      return true;
    });
  }, [personFilteredOrders, statusFilter, searchTerm]);

  // Status counts for tabs
  const pendingCount = personFilteredOrders.filter(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length;
  const readyCount = personFilteredOrders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
  const rejectedCount = personFilteredOrders.filter(o => o.status === 'Rechazada').length;

  const allExpanded = filteredOrders.length > 0 && filteredOrders.every(o => expandedOrderIds[o.id]);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 animate-fadeIn pb-16">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0141BC] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2.5 animate-slideRight">
          <Check className="h-4 w-4 text-[#14BE99]" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

      {/* Lightbox Modal for Photo Preview */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#0141BC] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl space-y-3 animate-scaleUp max-h-[calc(100dvh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pt-1 shrink-0">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Foto de Medicación Adjunta</h4>
              <button 
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center flex-1 min-h-0">
              <img 
                src={previewPhotoUrl} 
                alt="Foto Medicación" 
                className="max-h-[70dvh] max-w-full w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Person Filter Cards (Titular & Personas a cargo) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1661E1]" />
              <span>Solicitudes del Grupo Familiar</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Consultá el estado de renovación de tus recetas y las de tus familiares a cargo.
            </p>
          </div>

          {/* Quick New Request Button */}
          {onNavigateToNew && (
            <button
              onClick={onNavigateToNew}
              className="bg-[#1661E1] hover:bg-[#0141BC] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nueva Solicitud</span>
            </button>
          )}
        </div>

        {/* Person Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Paciente:
          </span>

          <button
            type="button"
            onClick={() => setSelectedPerson('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedPerson === 'all'
                ? 'bg-[#0141BC] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Todos ({patientOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPerson('titular')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedPerson === 'titular'
                ? 'bg-[#1661E1] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{titularName} (Titular)</span>
          </button>

          {dependents.map((dep) => {
            const depDniClean = (dep.dni || dep.identifier || '').trim().replace(/\s/g, '');
            const depOrdersCount = patientOrders.filter(o => (o.patientDni || '').trim().replace(/\s/g, '').toLowerCase() === depDniClean.toLowerCase()).length;
            const isSelected = selectedPerson.toLowerCase() === depDniClean.toLowerCase();

            return (
              <button
                key={dep.id || depDniClean}
                type="button"
                onClick={() => setSelectedPerson(depDniClean)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0F6C7D] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-[#0F6C7D]" />
                <span>{dep.name} {dep.lastName} ({dep.relationship || 'A cargo'})</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {depOrdersCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
              statusFilter === 'all'
                ? 'bg-[#0141BC] text-white shadow-xs font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todos ({personFilteredOrders.length})
          </button>
          
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>En Proceso ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
              statusFilter === 'ready'
                ? 'bg-[#14BE99] text-white shadow-xs font-extrabold'
                : 'bg-white text-slate-600 hover:bg-[#14BE99]/10 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Emitidas ({readyCount})</span>
          </button>

          {rejectedCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Rechazadas ({rejectedCount})</span>
            </button>
          )}
        </div>

        {/* Search Input & Expand/Collapse All */}
        <div className="flex items-center gap-2">
          {personFilteredOrders.length > 2 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar medicamento o código..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1661E1] w-48 sm:w-56"
              />
            </div>
          )}

          {filteredOrders.length > 0 && (
            <button
              type="button"
              onClick={() => toggleAll(!allExpanded)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title={allExpanded ? 'Colapsar todas las solicitudes' : 'Expandir todas las solicitudes'}
            >
              {allExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>{allExpanded ? 'Colapsar Todo' : 'Expandir Todo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm border border-slate-200/90">
          <div className="mx-auto w-14 h-14 bg-[#1661E1]/10 text-[#1661E1] rounded-2xl flex items-center justify-center shadow-inner">
            <FileText className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-extrabold text-slate-900 text-base">
              {searchTerm ? 'No hay trámites que coincidan con la búsqueda' : 'No tenés solicitudes registradas para este filtro'}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              {searchTerm ? 'Probá buscando por otro nombre de medicamento o código de solicitud.' : 'Podés iniciar la renovación de tu medicación crónica en simples pasos.'}
            </p>
          </div>
          {onNavigateToNew && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToNew}
                className="bg-[#1661E1] hover:bg-[#0141BC] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Solicitar Receta Ahora
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrderIds[order.id];
            const isEmitida = order.status === 'Emitida' || order.status === 'Enviada';
            const isPending = order.status === 'Pendiente';
            const isInReview = order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
            const isRejected = order.status === 'Rechazada';

            // Check if this order is for titular or a dependent
            const isDependent = Boolean(order.isForDependent) || (order.patientDni || '').trim().replace(/\s/g, '').toLowerCase() !== titularDni;
            const matchingDependent = dependents.find(d => (d.dni || d.identifier || '').trim().replace(/\s/g, '').toLowerCase() === (order.patientDni || '').trim().replace(/\s/g, '').toLowerCase());
            const relationshipLabel = order.dependentRelationship || matchingDependent?.relationship;

            // Medication pill list
            const medicationList = (order.medicationItems && order.medicationItems.length > 0)
              ? order.medicationItems.map(i => `${i.nombreComercial}${i.miligramos ? ` (${i.miligramos})` : ''}`)
              : [order.medicationText || 'Tratamiento Crónico'];

            return (
              <div 
                key={order.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded 
                    ? 'border-[#1661E1]/50 shadow-md ring-1 ring-[#1E6EFB]/20' 
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Header Summary Row (Clickable to toggle) */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer select-none bg-white hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Status Icon Pillar */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isEmitida
                        ? 'bg-[#14BE99]/10 text-[#14BE99] border-[#14BE99]/30'
                        : isRejected
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : isInReview
                        ? 'bg-[#1661E1]/10 text-[#1661E1] border-[#1661E1]/20'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {isEmitida ? <CheckCircle2 className="h-5 w-5" /> : isRejected ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>

                    {/* Order Information */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Order ID Badge with 1-click copy */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderId(e, order.id)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                          title="Copiar código de trámite"
                        >
                          <span>{order.id}</span>
                          <Copy className="h-2.5 w-2.5 text-slate-400" />
                        </button>

                        {/* Person Badge */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDependent
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-[#1661E1]/10 text-[#1661E1] border border-[#1661E1]/20'
                        }`}>
                          <User className="h-2.5 w-2.5" />
                          <span>{order.patientName} {order.patientLastName}</span>
                          {isDependent && (
                            <span className="text-[9px] font-bold text-purple-700">({relationshipLabel || 'Familiar a cargo'})</span>
                          )}
                        </span>

                        {/* Status Pill */}
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isEmitida
                            ? 'bg-[#14BE99] text-white'
                            : isRejected
                            ? 'bg-rose-600 text-white'
                            : isInReview
                            ? 'bg-[#1661E1] text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {order.status}
                        </span>

                        {/* Date */}
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 ml-auto sm:ml-0">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Medication Summary Line */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Pill className="h-3 w-3 text-slate-400 shrink-0" />
                        {medicationList.slice(0, 3).map((med, idx) => (
                          <span 
                            key={idx}
                            className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md truncate max-w-[220px]"
                          >
                            {med}
                          </span>
                        ))}
                        {medicationList.length > 3 && (
                          <span className="text-[10px] font-bold text-slate-400">
                            +{medicationList.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Direct Delete Button if pending */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToCancel(order);
                        }}
                        className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200/80 hover:border-rose-300 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Eliminar solicitud pendiente"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    )}

                    {/* Direct Download Button if emitted */}
                    {isEmitida && order.recipePdfUrl && order.recipePdfUrl !== 'PAMI' && order.recipePdfUrl !== 'IOMA' && (
                      <a
                        href={order.recipePdfUrl}
                        download={order.recipePdfName || `receta-${order.id}.pdf`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#14BE99] hover:bg-[#0fa685] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Descargar receta firmada"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Descargar Receta</span>
                      </a>
                    )}

                    <div className={`p-1.5 rounded-xl text-slate-400 bg-slate-50 border border-slate-200 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-[#1661E1] bg-[#1661E1]/10 border-[#1661E1]/20' : ''
                    }`}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Accordion Panel */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-5 animate-fadeIn">
                    
                    {/* Tracking Timeline Stepper */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
                      <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#1661E1]" />
                        <span>Estado y Proceso del Trámite</span>
                      </h5>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        {/* Step 1 */}
                        <div className="space-y-1.5">
                          <div className="mx-auto h-7 w-7 rounded-full bg-[#14BE99] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-800">1. Ingresada</p>
                          <p className="text-[9px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</p>
                        </div>

                        {/* Step 2 */}
                        <div className="space-y-1.5">
                          <div className={`mx-auto h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                            isEmitida
                              ? 'bg-[#14BE99] text-white'
                              : isRejected
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#1661E1] text-white animate-pulse'
                          }`}>
                            {isEmitida ? <Check className="h-3.5 w-3.5" /> : isRejected ? <X className="h-3.5 w-3.5" /> : '2'}
                          </div>
                          <p className={`text-[11px] font-bold ${
                            isEmitida ? 'text-slate-800' : isRejected ? 'text-rose-600' : 'text-[#1661E1]'
                          }`}>
                            2. Auditoría Médica
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {isRejected ? 'Rechazado' : isEmitida ? 'Completada' : 'En evaluación'}
                          </p>
                        </div>

                        {/* Step 3 */}
                        <div className="space-y-1.5">
                          <div className={`mx-auto h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                            isEmitida
                              ? 'bg-[#14BE99] text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {isEmitida ? <Check className="h-3.5 w-3.5" /> : '3'}
                          </div>
                          <p className={`text-[11px] font-bold ${isEmitida ? 'text-emerald-700' : 'text-slate-400'}`}>
                            3. Firma y Receta
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {isEmitida ? 'Lista para farmacia' : 'Pendiente de firma'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Prescription and Medications Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Medications list */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-blue-500" />
                          <span>Medicamentos Solicitados</span>
                        </h5>

                        {order.medicationItems && order.medicationItems.length > 0 ? (
                          <div className="space-y-2.5">
                            {order.medicationItems.map((item, idx) => (
                              <div key={idx} className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-left shadow-3xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-black text-slate-400 uppercase font-mono">#{idx + 1}</span>
                                      {item.droga && item.droga.toLowerCase() !== item.nombreComercial.toLowerCase() && (
                                        <span className="text-[10px] text-slate-500 font-normal">({item.droga})</span>
                                      )}
                                    </div>
                                    <h6 className="font-extrabold text-slate-900 text-sm leading-snug break-words mt-0.5">
                                      {item.nombreComercial}
                                    </h6>
                                  </div>
                                  <span className="text-[11px] bg-white border border-slate-250 text-[#0141BC] font-extrabold px-2.5 py-0.5 rounded-lg shadow-3xs shrink-0">
                                    {item.cantidadCajas || 1} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {item.miligramos && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                      <span className="text-slate-400 font-normal">Dosis:</span>
                                      <span className="text-[#0141BC] font-extrabold">{item.miligramos}</span>
                                    </span>
                                  )}
                                  {item.presentacion && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                      <span className="text-slate-400 font-normal">Formato:</span>
                                      <span>{item.presentacion}</span>
                                    </span>
                                  )}
                                  {item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null && Number(item.unidadesPorCaja) > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                      <span className="text-slate-400 font-normal">Envase:</span>
                                      <span>x {item.unidadesPorCaja} u.</span>
                                    </span>
                                  )}
                                </div>

                                {((item.diagnostic || item.diagnostico) || item.comments || item.posologia) && (
                                  <div className="pt-2 border-t border-slate-200/60 space-y-1 text-[11px]">
                                    {(item.diagnostic || item.diagnostico) && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="font-bold text-slate-400 text-[10px] uppercase shrink-0">Diagnóstico:</span>
                                        <span className="font-semibold text-[#0141BC] bg-blue-50/70 border border-blue-150 px-1.5 py-0.2 rounded text-[10px]">
                                          {item.diagnostic || item.diagnostico}
                                        </span>
                                      </div>
                                    )}
                                    {(item.comments || item.posologia) && (
                                      <div className="flex items-start gap-1.5 text-slate-600 italic text-[10px]">
                                        <span className="font-bold text-slate-400 not-italic uppercase text-[9px] shrink-0">Indicaciones:</span>
                                        <span className="text-slate-700 font-medium">"{item.comments || item.posologia}"</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-800">
                            {order.medicationText || 'Tratamiento crónico ingresado por el paciente.'}
                          </div>
                        )}

                        {order.diagnostic && (
                          <div className="pt-2 border-t border-slate-100 text-xs">
                            <span className="font-bold text-slate-500 text-[10px] uppercase font-mono block">Diagnóstico:</span>
                            <p className="text-slate-800 font-medium mt-0.5">{order.diagnostic}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Coverage, Doctor & Payment Info */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Cobertura y Datos Administrativos</span>
                        </h5>

                        <div className="space-y-2 text-xs">
                          {isDependent && (
                            <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                              <span className="text-[10px] uppercase font-bold text-purple-800 block">
                                Solicitado por el Titular:
                              </span>
                              <span className="font-bold text-purple-950 text-xs">
                                {order.requestedByTitularName || titularName} (Titular de la cuenta)
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                            <span className="text-slate-500 font-medium">Cobertura:</span>
                            <span className="font-bold text-blue-700">{order.obraSocial || 'Particular'}</span>
                          </div>

                          {order.obraSocialNumber && (
                            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 font-medium">N° de Afiliado:</span>
                              <span className="font-mono font-bold text-slate-800">{order.obraSocialNumber}</span>
                            </div>
                          )}

                          {order.lastConsultationDoctor && (
                            <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 font-medium">Médico Tratante:</span>
                              <span className="font-bold text-slate-800">{order.lastConsultationDoctor}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded-xl">
                            <span className="text-slate-500 font-medium">Estado del Pago:</span>
                            {(() => {
                              const pStatus = order.paymentStatus;
                              const isExempt = pStatus === 'exempt' || order.obraSocial === 'PAMI (Inssjp)' || String(order.paymentAmount) === '0';

                              if (pStatus === 'approved') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="h-3 w-3" /> Pagado
                                  </span>
                                );
                              }
                              if (pStatus === 'refunded') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200" title="Proceso de reintegro de arancel activado">
                                    <RotateCcw className="h-3 w-3" /> En devolución
                                  </span>
                                );
                              }
                              if (isExempt) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    <ShieldCheck className="h-3 w-3" /> Exento
                                  </span>
                                );
                              }
                              if (pStatus === 'rejected') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                    <AlertCircle className="h-3 w-3" /> Rechazado
                                  </span>
                                );
                              }
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    <Clock className="h-3 w-3" /> Pendiente
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const res = await fetch(`/api/payments/status/${order.id}`);
                                        if (res.ok) {
                                          window.location.reload();
                                        }
                                      } catch (err) {
                                        console.warn('Sync error', err);
                                      }
                                    }}
                                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                    title="Consultar estado de acreditación en Mercado Pago"
                                  >
                                    Verificar
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Medication Photos Preview thumbnails */}
                        {order.medicationPhotos && order.medicationPhotos.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5">
                              Fotos / Archivos Adjuntos:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {order.medicationPhotos.map((photo, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (photo.url.startsWith('data:application/pdf') || photo.name?.toLowerCase().endsWith('.pdf')) {
                                        window.open(photo.url, '_blank');
                                      } else {
                                        setPreviewPhotoUrl(photo.url);
                                      }
                                    }}
                                    className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 relative group cursor-pointer flex items-center justify-center bg-slate-50 shrink-0"
                                    title={`${photo.name || 'Adjunto'} (${photo.cantidadCajas || 1} cajas)`}
                                  >
                                    {photo.url.startsWith('data:application/pdf') || photo.name?.toLowerCase().endsWith('.pdf') ? (
                                      <FileText className="h-6 w-6 text-rose-500" />
                                    ) : (
                                      <img src={photo.url} alt="Adjunto" className="h-full w-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <Eye className="h-4 w-4" />
                                    </div>
                                  </button>
                                  <span className="text-[9px] font-bold text-slate-600 text-center max-w-[60px] truncate">
                                    {photo.cantidadCajas || 1} {(photo.cantidadCajas || 1) === 1 ? 'caja' : 'cajas'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Doctor Clinical Notes (if any) */}
                    {order.doctorNotes && (
                      <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                        isRejected 
                          ? 'bg-rose-50 border-rose-200 text-rose-900' 
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          {isRejected ? <AlertCircle className="h-4 w-4 text-rose-600" /> : <FileText className="h-4 w-4 text-blue-600" />}
                          <span>{isRejected ? 'Motivo del Rechazo Clínico:' : 'Indicaciones del Profesional Médico:'}</span>
                        </div>
                        <p className="leading-relaxed font-medium pl-5">{order.doctorNotes}</p>
                      </div>
                    )}

                    {/* Electronic Recipe Information Box (PAMI / IOMA) */}
                    {isEmitida && (order.recipePdfUrl === 'PAMI' || order.recipePdfUrl === 'IOMA') && (
                      <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 text-xs space-y-2.5 animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span>¡Medicamentos Listos en Farmacia!</span>
                        </div>
                        <p className="leading-relaxed font-medium">
                          Tu receta ha sido emitida de manera electrónica en el sistema de <strong>{order.recipePdfUrl}</strong>. No necesitas descargar ningún archivo impreso ni digital.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <div className="bg-white border border-emerald-200 px-3.5 py-2 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Obra Social</span>
                            <span className="font-bold text-emerald-900">{order.obraSocial || order.recipePdfUrl}</span>
                          </div>
                          <div className="bg-white border border-emerald-200 px-3.5 py-2 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Nro de Afiliado</span>
                            <span className="font-mono font-bold text-emerald-900">{order.obraSocialNumber || 'No ingresado'}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold italic">
                          Dirígete a tu farmacia habitual y presenta tu credencial física o digital de la obra social para retirar los medicamentos prescritos.
                        </p>
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Imprimir Comprobante Oficial */}
                        <button
                          type="button"
                          onClick={(e) => handlePrintOrder(e, order)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Imprimir comprobante oficial de la solicitud"
                        >
                          <Printer className="h-3.5 w-3.5 text-slate-600" />
                          <span>Comprobante</span>
                        </button>

                        {/* Chat with doctor button */}
                        {onNavigateToChat && (
                          <button
                            type="button"
                            onClick={() => onNavigateToChat(order.id)}
                            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[#1661E1]" />
                            <span>Consultar al Médico</span>
                          </button>
                        )}

                        {/* Cancel/Delete order button if pending */}
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => setOrderToCancel(order)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            <span>Eliminar Solicitud</span>
                          </button>
                        )}
                      </div>

                      {/* PDF Download Button */}
                      {isEmitida && order.recipePdfUrl && order.recipePdfUrl !== 'PAMI' && order.recipePdfUrl !== 'IOMA' && (
                        <a
                          href={order.recipePdfUrl}
                          download={order.recipePdfName || `receta-${order.id}.pdf`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ml-auto"
                        >
                          <Download className="h-4 w-4" />
                          <span>Descargar Receta Oficial</span>
                        </a>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Printable Area for Official Receipt */}
      {orderToPrint && (
        <div id="official-receipt-print-area" className="hidden print:block">
          <OfficialOrderReceipt
            orderId={orderToPrint.id}
            createdAt={orderToPrint.createdAt}
            patientName={orderToPrint.patientName}
            patientLastName={orderToPrint.patientLastName}
            patientDni={orderToPrint.patientDni}
            patientBirthDate={orderToPrint.patientBirthDate}
            patientEmail={orderToPrint.patientEmail}
            patientPhone={orderToPrint.patientPhone}
            obraSocial={orderToPrint.obraSocial}
            obraSocialNumber={orderToPrint.obraSocialNumber}
            deliveryMethod={orderToPrint.deliveryMethod}
            medicationItems={orderToPrint.medicationItems}
            medicationPhotos={orderToPrint.medicationPhotos}
            medicationText={orderToPrint.medicationText}
            diagnostic={orderToPrint.diagnostic}
            comments={orderToPrint.comments}
            paymentAmount={orderToPrint.paymentAmount}
            paymentId={orderToPrint.paymentId}
            paymentStatus={orderToPrint.paymentStatus}
            status={orderToPrint.status}
          />
        </div>
      )}

      {/* Confirmation Modal for Patient Order Cancellation / Deletion */}
      <ConfirmDeleteModal
        isOpen={!!orderToCancel}
        onClose={() => {
          if (!isCancellingOrder) setOrderToCancel(null);
        }}
        onConfirm={handleCancelConfirm}
        isLoading={isCancellingOrder}
        title="¿Eliminar Solicitud Pendiente?"
        description="Esta acción eliminará de forma permanente tu solicitud pendiente del sistema. Si ya realizaste un pago, el mismo será procesado según las políticas de reembolso."
        itemSummary={orderToCancel ? {
          id: orderToCancel.id,
          title: `${orderToCancel.patientLastName}, ${orderToCancel.patientName}`,
          subtitle: `Obra Social: ${orderToCancel.obraSocial}`,
          tag: 'Pendiente',
          extra: `Fecha: ${new Date(orderToCancel.createdAt).toLocaleDateString('es-AR')}`
        } : undefined}
        confirmLabel="Sí, eliminar solicitud"
        cancelLabel="Cancelar"
      />

    </div>
  );
}
