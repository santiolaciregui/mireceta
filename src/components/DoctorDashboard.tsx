/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import PatientForm from './PatientForm';
import { MedicalOrder, OrderStatus, OBRA_SOCIAL_OPTIONS } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  User, 
  CreditCard, 
  Upload, 
  ExternalLink, 
  Search, 
  FileCheck, 
  AlertCircle,
  TrendingUp,
  Inbox,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  Printer,
  Plus,
  Coins,
  Download,
  MessageSquare,
  X
} from 'lucide-react';

interface DoctorDashboardProps {
  orders: MedicalOrder[];
  onUpdateStatus: (
    id: string, 
    status: OrderStatus, 
    doctorNotes?: string, 
    recipePdfUrl?: string, 
    recipePdfName?: string
  ) => void;
  onCreateOrder?: (data: any) => Promise<string>;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    lastName: string;
    role: string;
    medicoId?: string;
    medicoName?: string;
  };
  forcedSubview?: 'pendientes' | 'revision' | 'completadas' | 'reportes';
  onNavigateToChat?: (orderId: string) => void;
}

export default function DoctorDashboard({ 
  orders, 
  onUpdateStatus, 
  onCreateOrder, 
  currentUser, 
  forcedSubview,
  onNavigateToChat 
}: DoctorDashboardProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<'Todos' | 'Pendientes' | 'En revisión' | 'Listos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('Todos');
  const [activeDashboardTab, setActiveDashboardTab] = useState<'requests' | 'operators'>('requests');
  const [activeDetailTab, setActiveDetailTab] = useState<'rx' | 'patient' | 'payment'>('rx');

  // Sync with forcedSubview from sidebar
  React.useEffect(() => {
    if (forcedSubview) {
      if (forcedSubview === 'pendientes') {
        setFilter('Pendientes');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'revision') {
        setFilter('En revisión');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'completadas') {
        setFilter('Listos');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'reportes') {
        setActiveDashboardTab('operators');
      }
    }
  }, [forcedSubview]);

  // Doctor Action Inputs
  const [doctorNotes, setDoctorNotes] = useState('');
  const [uploadedRecipe, setUploadedRecipe] = useState<{ url: string; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Operator Payout settings
  const [payoutRate, setPayoutRate] = useState<number>(500); // 500 ARS per prescription by default
  const [selectedReportOperator, setSelectedReportOperator] = useState<string>('Todos');

  // Manual Creation Fields
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderDni, setNewOrderDni] = useState('');
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderLastName, setNewOrderLastName] = useState('');
  const [newOrderObraSocial, setNewOrderObraSocial] = useState('');
  const [newOrderObraSocialNumber, setNewOrderObraSocialNumber] = useState('');
  const [newOrderMedication, setNewOrderMedication] = useState('');
  const [newOrderConsultationTime, setNewOrderConsultationTime] = useState('');
  const [newOrderConsultationDoctor, setNewOrderConsultationDoctor] = useState('');
  const [newOrderPaymentAmount, setNewOrderPaymentAmount] = useState('10000');
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState(false);

  const handleManualOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewOrderModal(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Derive unique operators in current orders
  const operatorsList = Array.from(
    new Set(
      orders
        .map(o => o.createdByOperatorName)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    )
  );

  // Compute selected order reference
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || (orders.length > 0 ? orders[0] : null);

  const [extractedTextCache, setExtractedTextCache] = useState<Record<string, string>>({});
  const [isExtractingCache, setIsExtractingCache] = useState<Record<string, boolean>>({});

  // Sync notes and recipe fields once an order is selected
  React.useEffect(() => {
    setActiveDetailTab('rx');
    if (selectedOrder) {
      setDoctorNotes(selectedOrder.doctorNotes || '');
      if (selectedOrder.recipePdfUrl) {
        setUploadedRecipe({
          url: selectedOrder.recipePdfUrl,
          name: selectedOrder.recipePdfName || 'receta_cargada.pdf'
        });
      } else {
        setUploadedRecipe(null);
      }

      // Handle automatic text extraction from prescription images
      const images = [];
      if (selectedOrder.medicationPhotos && selectedOrder.medicationPhotos.length > 0) {
        images.push(...selectedOrder.medicationPhotos.map(p => p.url));
      } else if (selectedOrder.medicationPhotoUrl) {
        images.push(selectedOrder.medicationPhotoUrl);
      }

      const validImages = images.filter(url => url.startsWith('data:image/') || url.startsWith('data:application/pdf'));

      if (validImages.length > 0 && !extractedTextCache[selectedOrder.id] && !isExtractingCache[selectedOrder.id]) {
        setIsExtractingCache(prev => ({ ...prev, [selectedOrder.id]: true }));

        const token = localStorage.getItem('token');
        fetch('/api/analyze-prescription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ images: validImages })
        })
        .then(res => res.json())
        .then(data => {
           if (data.text) {
              setExtractedTextCache(prev => ({ ...prev, [selectedOrder.id]: data.text }));
           } else {
              setExtractedTextCache(prev => ({ ...prev, [selectedOrder.id]: 'No se pudo extraer texto. Asegúrese de que la imagen sea legible.' }));
           }
        })
        .catch(err => {
           console.error(err);
           setExtractedTextCache(prev => ({ ...prev, [selectedOrder.id]: 'Error de conexión al analizar la imagen.' }));
        })
        .finally(() => {
           setIsExtractingCache(prev => ({ ...prev, [selectedOrder.id]: false }));
        });
      }
    }
  }, [selectedOrderId, selectedOrder]);

  // Filters logic
  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (filter === 'Pendientes' && order.status !== 'Pendiente') return false;
    if (filter === 'En revisión' && order.status !== 'En revisión' && order.status !== 'Aprobada' && order.status !== 'Solicita más información') return false;
    if (filter === 'Listos' && order.status !== 'Emitida' && order.status !== 'Enviada') return false;

    // Operator Filter
    if (selectedOperatorFilter !== 'Todos') {
      if (selectedOperatorFilter === 'Paciente') {
        if (order.createdByOperatorName) return false;
      } else {
        if (order.createdByOperatorName !== selectedOperatorFilter) return false;
      }
    }

    // Search Query (Patient Name, LastName, Dni, OS)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const patientFullName = `${order.patientName} ${order.patientLastName}`.toLowerCase();
      const matchName = patientFullName.includes(q);
      const matchDni = order.patientDni.includes(q);
      const matchOs = order.obraSocial.toLowerCase().includes(q);
      const matchId = order.id.toLowerCase().includes(q);
      return matchName || matchDni || matchOs || matchId;
    }

    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'Pendiente').length;
  const inProcessCount = orders.filter(o => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length;
  const completedCount = orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;

  // Handler to mark an order as "En revisión"
  const handleMarkInProcess = (id: string) => {
    onUpdateStatus(id, 'En revisión', 'Trabajando en el pedido. Evaluando médicamente la renovación.');
    showToast('El pedido ha sido marcado en estado "En Revisión". El paciente lo verá actualizado en tiempo real.');
  };

  // Helper to convert co-signed recipe upload from Doctor to Base64
  const handleDoctorRecipeUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUploadedRecipe({
        url: base64String,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // Auto generator for simulated recipes
  const handleGenerateSimulatedRecipe = (order: MedicalOrder) => {
    const simulatedPdfUrl = 'MOCK_RECIPE_PDF_GENERATED';
    const simulatedPdfName = `receta_emitida_${order.patientLastName.toLowerCase()}_${order.id}.pdf`;
    setUploadedRecipe({
      url: simulatedPdfUrl,
      name: simulatedPdfName
    });
  };

  // Submit complete co-signed recipe back to Patient
  const handleCompletePrescription = (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    if (!uploadedRecipe) {
      showToast('Por favor, selecciona un archivo de receta digital o haz clic en "Simular Receta PDF" para continuar.');
      return;
    }

    onUpdateStatus(
      orderId, 
      'Emitida', 
      doctorNotes.trim() || 'Receta digital oficial firmada por el médico de cabecera.',
      uploadedRecipe.url,
      uploadedRecipe.name
    );

    showToast(`¡Éxito! La receta ${orderId} ha sido firmada e integrada. Se ha notificado electrónicamente al paciente.`);
  };

  // Submit manual prescription on behalf of a patient (Cargar de Oficio)
  const handleSubmitNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderDni.trim() || !newOrderName.trim() || !newOrderLastName.trim() || !newOrderObraSocial || !newOrderMedication.trim()) {
      showToast('Por favor complete todos los campos obligatorios (*)');
      return;
    }

    setIsSubmittingNewOrder(true);
    try {
      if (onCreateOrder) {
        // Create a simulated pre-cleared payment receipt
        const simulatedReceiptSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23eff6ff"/><rect x="30" y="15" width="240" height="170" rx="8" fill="%23ffffff" stroke="%232563eb" stroke-width="2"/><circle cx="150" cy="60" r="22" fill="%23dbeafe"/><path d="M142,60 L148,66 L158,54" fill="none" stroke="%232563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="150" y="110" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e3a8a" text-anchor="middle">CARGA MANUAL DE OFICIO</text><text x="150" y="135" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232563eb" text-anchor="middle">EFECTIVO / CAJA</text><text x="150" y="160" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">Autorizado en Mesa de Entrada</text></svg>`;
        
        await onCreateOrder({
          patientName: newOrderName.trim(),
          patientLastName: newOrderLastName.trim(),
          patientDni: newOrderDni.trim(),
          obraSocial: newOrderObraSocial,
          obraSocialNumber: newOrderObraSocialNumber.trim() || undefined,
          medicationText: newOrderMedication.trim(),
          medicationPhotoUrl: null,
          medicationPhotoName: null,
          paymentReceiptUrl: simulatedReceiptSvg,
          paymentReceiptName: 'carga_manual_efectivo.png',
          paymentAmount: newOrderPaymentAmount || '10000',
          paymentDate: new Date().toISOString().split('T')[0],
          lastConsultationTime: newOrderConsultationTime || undefined,
          lastConsultationDoctor: newOrderConsultationDoctor.trim() || undefined,
          consentsAccepted: {
            isOfAge: true,
            termsAccepted: true,
            informedConsentAccepted: true,
            swornStatementAccepted: true
          }
        });

        showToast('¡Éxito! La solicitud ha sido cargada de oficio en el sistema de manera exitosa.');
        setShowNewOrderModal(false);
        // Reset form fields
        setNewOrderDni('');
        setNewOrderName('');
        setNewOrderLastName('');
        setNewOrderObraSocial('');
        setNewOrderObraSocialNumber('');
        setNewOrderMedication('');
        setNewOrderConsultationTime('');
        setNewOrderConsultationDoctor('');
      } else {
        showToast('Error: No se encuentra enlazada la función de registro de órdenes.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Ocurrió un error al enviar el pedido manual.');
    } finally {
      setIsSubmittingNewOrder(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Statistics calculations for operators list
  const operatorStats = operatorsList.map(name => {
    const operatorOrders = orders.filter(o => o.createdByOperatorName === name);
    const completed = operatorOrders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
    const pending = operatorOrders.filter(o => o.status === 'Pendiente').length;
    const inProcess = operatorOrders.filter(o => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length;
    return {
      name,
      totalCreated: operatorOrders.length,
      completed,
      pending,
      inProcess,
      estimatedPayout: completed * payoutRate
    };
  });

  // Filter orders for the report detailed table
  const reportOrders = orders.filter(order => {
    if (selectedReportOperator === 'Todos') {
      return !!order.createdByOperatorName;
    }
    return order.createdByOperatorName === selectedReportOperator;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[var(--ink)] text-white py-3 px-6 rounded-lg shadow-xl text-[0.85rem] font-[500] animate-fadeIn flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-[var(--accent)]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Manual Registration Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative">
            <button onClick={() => setShowNewOrderModal(false)} className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-slate-800">
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-y-auto">
              <PatientForm 
                isOficio={true}
                currentUser={currentUser}
                recentDni={''}
                onSetDni={() => {}}
                onSubmitOrder={async (data) => {
                  if (onCreateOrder) {
                    await onCreateOrder({
                      ...data,
                      status: 'En revisión'
                    });
                    return 'ok';
                  }
                  return 'error';
                }}
                onSuccess={() => {
                  showToast('Solicitud creada de oficio y enviada a revisión.');
                  setShowNewOrderModal(false);
                }}
                orders={orders}
              />
            </div>
          </div>
        </div>
      )}

      {/* Internal Tabs Switcher - Only visible if no forced subview */}
      {!forcedSubview && (
        <div className="flex border-b border-[var(--ink-faint)] bg-white px-8 pt-4 shrink-0">
          <button
            onClick={() => setActiveDashboardTab('requests')}
            className={`pb-3 px-4 font-[600] text-[0.85rem] border-b-2 transition-all flex items-center gap-2 ${
              activeDashboardTab === 'requests'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            Gestión de Solicitudes
          </button>
          
          <button
            onClick={() => setActiveDashboardTab('operators')}
            className={`pb-3 px-4 font-[600] text-[0.85rem] border-b-2 transition-all flex items-center gap-2 ${
              activeDashboardTab === 'operators'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            Operadores y Reportes
          </button>
        </div>
      )}

      {activeDashboardTab === 'requests' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {(!forcedSubview || forcedSubview === 'pendientes') && (
             <header className="px-8 py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
               <div className="space-y-1">
                  <h1 className="text-[1.5rem] font-[700] tracking-[-0.03em]">Pedidos Pendientes de Auditoría</h1>
                  <p className="text-[0.85rem] text-[var(--ink-muted)] mt-1">Visualizá y auditá las nuevas solicitudes de renovación médica.</p>
               </div>
               <button
                 onClick={() => setShowNewOrderModal(true)}
                 className="bg-[var(--accent)] text-white px-5 py-3 rounded-lg text-[0.8rem] font-[600] flex items-center gap-2"
               >
                 <Plus className="h-4 w-4" /> Nueva Solicitud (De Oficio)
               </button>
             </header>
          )}

          <section className="workspace flex-1">
            {/* List Pane */}
            <div className={`list-pane ${selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
              <div className="search-bar shrink-0 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por DNI, Apellido o ID..."
                  />
                </div>
                
                {/* Filters */}
                {!forcedSubview && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--ink-faint)] rounded-md text-[0.75rem] outline-none"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Pendientes">Pendientes</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Listos">Emitidas</option>
                    </select>
                    <select
                      value={selectedOperatorFilter}
                      onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--ink-faint)] rounded-md text-[0.75rem] outline-none"
                    >
                      <option value="Todos">Operador: Todos</option>
                      <option value="Paciente">Paciente</option>
                      {operatorsList.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-[var(--ink-muted)]">
                    <p className="text-[0.85rem]">No se encontraron solicitudes</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const isActive = selectedOrderId === order.id;
                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`order-card ${isActive ? 'selected' : ''}`}
                      >
                        <div className="order-meta">
                          <span>{order.id.split('-')[0]}-{order.id.substring(order.id.length-4)}</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('es-AR')}</span>
                        </div>
                        <p className="order-name">
                          {order.patientLastName}, {order.patientName}
                        </p>
                        <p className="order-sub">
                          {order.obraSocial} • DNI: {order.patientDni}
                        </p>
                        {order.status === 'Pendiente' && <span className="inline-block mt-2 h-2 w-2 rounded-full bg-amber-500" />}
                        {(order.status === 'En revisión' || order.status === 'Solicita más información') && <span className="inline-block mt-2 h-2 w-2 rounded-full bg-blue-500" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail Pane */}
            <div className={`detail-pane ${!selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
              {selectedOrder ? (
                <div className="animate-fadeIn flex flex-col h-full">
                  <div className="detail-header shrink-0">
                    <button onClick={() => setSelectedOrderId(null)} className="lg:hidden block text-[var(--ink-muted)] text-sm mb-4">&larr; Volver</button>
                    
                    <span className="status-pill">{selectedOrder.status}</span>
                    <h2 style={{ fontSize: '2rem', letterSpacing: '-0.04em', fontWeight: 700, lineHeight: 1.2 }}>
                      {selectedOrder.patientLastName}, {selectedOrder.patientName}
                    </h2>
                    <p style={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
                      ID: {selectedOrder.id} | DNI: {selectedOrder.patientDni} | {new Date(selectedOrder.createdAt).toLocaleTimeString('es-AR')}
                    </p>
                    {onNavigateToChat && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <button
                          onClick={() => onNavigateToChat(selectedOrder.id)}
                          className="bg-[var(--bg)] text-[var(--ink)] border border-[var(--ink-faint)] px-4 py-2 rounded-lg text-[0.85rem] font-[600] flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" /> Chatear con Paciente
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="detail-section">
                      <span className="section-label">Medicación Requerida</span>
                      <div className="medic-box">
                        {selectedOrder.medicationText}
                      </div>
                      
                      {/* Box Photo Attachments */}
                      {((selectedOrder.medicationPhotos && selectedOrder.medicationPhotos.length > 0) || selectedOrder.medicationPhotoUrl) && (
                        <div className="mt-4 flex flex-wrap gap-4">
                          {(selectedOrder.medicationPhotos || 
                            (selectedOrder.medicationPhotoUrl ? [{ url: selectedOrder.medicationPhotoUrl, name: selectedOrder.medicationPhotoName || 'foto.jpg' }] : [])
                          ).map((photo, i) => (
                            <div key={i} className="border border-[var(--ink-faint)] rounded-lg overflow-hidden max-w-[200px]">
                              {photo.url.startsWith('MOCK') ? (
                                <div className="h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Imagen de prueba</div>
                              ) : photo.url.startsWith('data:application/pdf') ? (
                                <div className="h-24 bg-slate-50 flex items-center justify-center p-2"><FileText className="h-6 w-6 text-red-500" /></div>
                              ) : (
                                <img src={photo.url} alt="Envase" className="h-24 w-full object-cover" />
                              )}
                              <div className="p-2 text-[0.65rem] truncate bg-[var(--bg)] font-mono">{photo.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AI Feedback */}
                    {((selectedOrder.medicationPhotos && selectedOrder.medicationPhotos.length > 0) || selectedOrder.medicationPhotoUrl) && (
                      <div className="detail-section">
                        <span className="section-label">Análisis de Inteligencia Artificial</span>
                        <div className="ia-feedback">
                          <Sparkles className="h-5 w-5" />
                          <div className="flex-1">
                            {isExtractingCache[selectedOrder.id] ? (
                              'Esperando inicio de análisis de envase...'
                            ) : extractedTextCache[selectedOrder.id] ? (
                              <div className="font-mono text-[0.75rem] whitespace-pre-wrap">{extractedTextCache[selectedOrder.id]}</div>
                            ) : (
                              'La IA no logró extraer información del envase.'
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Audit Log (Registro de Cambios) */}
                    {selectedOrder.auditLog && selectedOrder.auditLog.length > 0 && (
                      <div className="detail-section mt-6">
                        <span className="section-label mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4"/> Registro de Cambios (Auditoría)</span>
                        <div className="space-y-3">
                          {selectedOrder.auditLog.map((log, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900">{log.action}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString('es-AR')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                                <User className="h-3.5 w-3.5" />
                                <span className="font-medium">{log.user}</span>
                              </div>
                              {log.notes && (
                                <p className="text-slate-500 italic mt-1 border-l-2 border-slate-300 pl-2 py-0.5">"{log.notes}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Area */}
                  <div style={{ paddingTop: '2rem' }} className="shrink-0 border-t border-[var(--ink-faint)] mt-4">
                    {selectedOrder.status === 'Pendiente' && currentUser?.role === 'medico' && (
                      <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                        <strong>Atención:</strong> Esta solicitud requiere revisión clínica. Verifique medicación antes de firmar.
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {selectedOrder.status === 'Pendiente' && currentUser?.role === 'medico' && (
                        <button
                          onClick={() => handleMarkInProcess(selectedOrder.id)}
                          className="bg-[var(--accent)] text-white w-full py-4 rounded-lg text-[0.9rem] font-[600]"
                        >
                          EMPEZAR REVISIÓN CLÍNICA
                        </button>
                      )}
                      {(selectedOrder.status === 'En revisión' || selectedOrder.status === 'Aprobada' || selectedOrder.status === 'Solicita más información') && currentUser?.role === 'medico' && (
                          <div className="bg-[var(--bg)] p-6 rounded-xl border border-[var(--ink-faint)]">
                            <label className="block text-[0.65rem] font-mono uppercase text-[var(--ink-muted)] mb-2">Notas Clínicas</label>
                            <textarea
                              className="w-full p-3 bg-white border border-[var(--ink-faint)] rounded-md text-[0.85rem] mb-4 outline-none focus:border-[var(--accent)]"
                              rows={3}
                              placeholder="Indicaciones para el paciente..."
                              value={doctorNotes}
                              onChange={e => setDoctorNotes(e.target.value)}
                            />
                            <label className="block text-[0.65rem] font-mono uppercase text-[var(--ink-muted)] mb-2">Adjuntar Receta Firmada (PDF)</label>
                            <input type="file" accept="application/pdf" onChange={handleDoctorRecipeUploadChange} className="text-[0.75rem] mb-4 w-full" />
                            <button onClick={() => {
                              onUpdateStatus(selectedOrder.id, 'Emitida', doctorNotes, uploadedRecipe?.url, uploadedRecipe?.name);
                              showToast('Receta emitida y enviada con éxito.');
                            }} className="w-full bg-[var(--accent)] text-white py-3 rounded-lg text-[0.9rem] font-[600]">
                              EMITIR RECETA FINAL
                            </button>
                          </div>
                      )}
                      {selectedOrder.status === 'Emitida' && (
                          <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
                            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <h4 className="font-[600] text-green-900">Receta Emitida</h4>
                            <p className="text-[0.75rem] text-green-700 mt-1">El proceso ha concluido correctamente.</p>
                            {selectedOrder.recipePdfUrl && (
                              <a href={selectedOrder.recipePdfUrl} download={selectedOrder.recipePdfName || 'receta.pdf'} className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-md text-[0.8rem] font-[600]">Descargar PDF</a>
                            )}
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="m-auto text-[var(--ink-muted)] text-[0.85rem] text-center max-w-xs">
                  <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  <p>Seleccione un pedido del listado para ver el detalle y realizar la auditoría.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8">
           {/* OPERATORS REPORTING VIEW */}
           <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-[var(--ink-faint)] rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-[700] text-[var(--ink)] flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" /> Rendimiento de Operadores
                  </h3>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-500">Tarifa p/receta ($):</label>
                    <input
                      type="number"
                      value={payoutRate}
                      onChange={(e) => setPayoutRate(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-[var(--bg)] border border-[var(--ink-faint)] rounded-md text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <p className="text-[0.85rem] text-[var(--ink-muted)] mb-8">Consolidado de honorarios según recetas procesadas.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {operatorsList.map(operator => {
                    const operatorOrders = orders.filter(o => o.createdByOperatorName === operator);
                    const approvedCount = operatorOrders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
                    const pendingOpCount = operatorOrders.length - approvedCount;
                    const totalPayout = approvedCount * payoutRate;

                    return (
                      <div key={operator} className="bg-[var(--bg)] border border-[var(--ink-faint)] p-5 rounded-xl">
                        <h4 className="font-[600] text-[var(--ink)] text-[1rem] mb-4">{operator}</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[0.85rem]">
                            <span className="text-[var(--ink-muted)]">Emitidas</span>
                            <span className="font-[600] text-emerald-600">{approvedCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[0.85rem]">
                            <span className="text-[var(--ink-muted)]">En Trámite</span>
                            <span className="font-[600] text-amber-600">{pendingOpCount}</span>
                          </div>
                          <div className="pt-3 border-t border-[var(--ink-faint)] mt-2 flex justify-between items-center">
                            <span className="text-[0.65rem] font-mono uppercase tracking-widest text-[var(--ink-muted)]">A Liquidar</span>
                            <span className="font-[700] text-[var(--ink)]">
                              ${totalPayout.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
