/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PatientForm from '../PatientForm';
import NewOrderForm from '../NewOrderForm';
import { MedicalOrder, OrderStatus } from '../../../types';
import { OBRA_SOCIAL_OPTIONS } from '../../../constants/orderStatus';
import { useFloatingPrescriptionWindow } from '../../../hooks/useFloatingPrescriptionWindow';
import FloatingPrescriptionWidget from '../../common/FloatingPrescriptionWidget';
import ConfirmDeleteModal from '../../common/ConfirmDeleteModal';
import { copyToClipboard } from '../../../utils/clipboard';
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
  X,
  FileUp,
  Trash2,
  File,
  RotateCcw,
  Pill,
  Shield,
  Phone,
  Eye,
  Send,
  Mail,
  Share2,
  Loader2,
  Copy,
  CheckCheck,
  Users,
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  AppWindow,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown
} from 'lucide-react';
import { compressImageAndGetBase64 } from '../../../utils/file';
interface DoctorDashboardProps {
  orders: MedicalOrder[];
  users?: any[];
  onUpdateStatus: (
    id: string, 
    status: OrderStatus, 
    doctorNotes?: string, 
    recipePdfUrl?: string, 
    recipePdfName?: string
  ) => void;
  onDeleteOrder?: (id: string) => Promise<boolean | void> | void;
  onCreateOrder?: (data: any) => Promise<string>;
  onSendRecipeLink?: (
    orderId: string,
    channel: 'whatsapp' | 'email' | 'both'
  ) => Promise<{
    success: boolean;
    channel: 'whatsapp' | 'email' | 'both';
    whatsapp?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
    message: string;
  }>;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    lastName: string;
    role: string;
    medicoId?: string;
    medicoName?: string;
  };
  currentTenant?: any;
  forcedSubview?: 'pendientes' | 'pago_pendiente' | 'revision' | 'completadas' | 'rechazadas' | 'reportes' | 'nueva';
  onNavigateToChat?: (orderId: string) => void;
  onNavigateToSubview?: (subview: string) => void;
}

export default function DoctorDashboard({ 
  orders, 
  users = [],
  onUpdateStatus, 
  onDeleteOrder,
  onCreateOrder, 
  onSendRecipeLink,
  currentUser,
  currentTenant,
  forcedSubview,
  onNavigateToChat,
  onNavigateToSubview
}: DoctorDashboardProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const skipClearOrderIdRef = useRef<string | null>(null);
  
  const [filter, setFilter] = useState<'Todos' | 'Pendientes' | 'Pago Pendiente' | 'En revisión' | 'Listos' | 'Rechazadas'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('Todos');
  const [activeDashboardTab, setActiveDashboardTab] = useState<'requests' | 'operators'>('requests');
  const [activeDetailTab, setActiveDetailTab] = useState<'rx' | 'patient' | 'payment'>('rx');

  // Sync with forcedSubview from sidebar
  React.useEffect(() => {
    if (skipClearOrderIdRef.current) {
      setSelectedOrderId(skipClearOrderIdRef.current);
      skipClearOrderIdRef.current = null;
    } else {
      setSelectedOrderId(null);
    }
    if (forcedSubview) {
      if (forcedSubview === 'pendientes') {
        setFilter('Pendientes');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'pago_pendiente') {
        setFilter('Pago Pendiente');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'revision') {
        setFilter('En revisión');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'completadas') {
        setFilter('Listos');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'rechazadas') {
        setFilter('Rechazadas');
        setActiveDashboardTab('requests');
      } else if (forcedSubview === 'reportes' && (currentUser?.role === 'admin' || currentUser?.role === 'superadmin')) {
        setActiveDashboardTab('operators');
      }
    }
  }, [forcedSubview]);

  // Doctor Action Inputs
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptionType, setPrescriptionType] = useState<'RCTA' | 'PAMI' | 'IOMA'>('RCTA');
  const [uploadedRecipe, setUploadedRecipe] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const DEFAULT_COLLAPSED_SECTIONS: Record<string, boolean> = {
    patient: true,
    dependent: true,
    obraSocial: true,
    medication: true,
    payment: true,
  };

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED_SECTIONS);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const isAllCollapsed = Boolean(
    collapsedSections.patient &&
    collapsedSections.dependent &&
    collapsedSections.obraSocial &&
    collapsedSections.medication &&
    collapsedSections.payment
  );

  const toggleAllSections = () => {
    if (isAllCollapsed) {
      setCollapsedSections({});
    } else {
      setCollapsedSections(DEFAULT_COLLAPSED_SECTIONS);
    }
  };

  const handleCopy = async (text: string, fieldId: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldId);
      showToast(`Copiado: ${label}`);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
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

  const getOrderPaymentMethod = (order: MedicalOrder) => {
    if (order.paymentMethod) return order.paymentMethod;
    const paymentId = order.paymentId || '';
    const receiptName = order.paymentReceiptName || '';
    const receiptUrl = order.paymentReceiptUrl || '';
    if (paymentId.startsWith('EFECTIVO-') || receiptName === 'cobrado_ventanilla.png' || receiptName === 'carga_manual_efectivo.png' || receiptName === 'registro_oficio.png') {
      return 'cash_desk';
    }
    if (order.paymentStatus === 'exempt' || order.obraSocial === 'PAMI (Inssjp)' || String(order.paymentAmount) === '0') {
      return 'bonificado';
    }
    if (receiptUrl && !receiptUrl.startsWith('data:image/svg+xml') && receiptName !== 'cobrado_ventanilla.png' && receiptName !== 'carga_manual_efectivo.png' && receiptName !== 'registro_oficio.png') {
      return 'transfer';
    }
    return 'mp';
  };

  const CopyableFieldRow = ({
    label,
    value,
    copyValue,
    fieldId
  }: {
    label: string;
    value: string;
    copyValue?: string;
    fieldId: string;
  }) => {
    const isCopied = copiedField === fieldId;
    const textToCopy = copyValue !== undefined ? copyValue : value;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center py-3 px-4 hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0 gap-1 sm:gap-4">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className="sm:col-span-2 flex items-center justify-between gap-3 min-w-0">
          <span className="text-xs font-bold text-slate-800 break-words font-sans">{value || '—'}</span>
          {value && value !== '—' && (
            <button
              onClick={() => handleCopy(textToCopy, fieldId, label)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer shrink-0 flex items-center justify-center border border-transparent active:scale-95"
              title={`Copiar ${label}`}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleViewReceipt = (e: React.MouseEvent<HTMLAnchorElement>, url: string, name: string) => {
    if (url.startsWith('data:')) {
      e.preventDefault();
      try {
        const parts = url.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error('Error opening preview:', err);
        window.open(url, '_blank');
      }
    }
  };

  // Operator Payout settings
  const [payoutRate, setPayoutRate] = useState<number>(() => currentTenant?.collaboratorRate ?? 500);
  const [selectedReportOperator, setSelectedReportOperator] = useState<string>('Todos');

  React.useEffect(() => {
    if (currentTenant?.collaboratorRate !== undefined) {
      setPayoutRate(currentTenant.collaboratorRate);
    }
  }, [currentTenant?.collaboratorRate]);

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
  const [newOrderPaymentAmount, setNewOrderPaymentAmount] = useState(
    currentTenant?.pricePerPrescription ? currentTenant.pricePerPrescription.toString() : '10000'
  );
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

  // Delete Order States & Handler
  const [orderToDelete, setOrderToDelete] = useState<MedicalOrder | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !onDeleteOrder) return;
    setIsDeletingOrder(true);
    try {
      await onDeleteOrder(orderToDelete.id);
      if (selectedOrderId === orderToDelete.id) {
        setSelectedOrderId(null);
      }
      showToast('Solicitud eliminada correctamente');
      setOrderToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la solicitud');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Send Recipe Link Modal States
  const [isSendLinkModalOpen, setIsSendLinkModalOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [sendLinkFeedback, setSendLinkFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSendLinkSubmit = async () => {
    if (!selectedOrder) return;
    setSendLinkFeedback(null);

    // Validate recipient channels
    if (sendChannel === 'whatsapp' && !selectedOrder.patientPhone) {
      setSendLinkFeedback({ success: false, message: 'El paciente no posee un número de WhatsApp/Teléfono registrado en la solicitud.' });
      return;
    }

    if (sendChannel === 'email' && !selectedOrder.patientEmail) {
      setSendLinkFeedback({ success: false, message: 'El paciente no posee un correo electrónico registrado en la solicitud.' });
      return;
    }

    if (sendChannel === 'both' && !selectedOrder.patientPhone && !selectedOrder.patientEmail) {
      setSendLinkFeedback({ success: false, message: 'El paciente no posee ni teléfono ni correo electrónico registrado.' });
      return;
    }

    setIsSendingLink(true);

    try {
      let result;
      if (onSendRecipeLink) {
        result = await onSendRecipeLink(selectedOrder.id, sendChannel);
      } else {
        const res = await fetch(`/api/orders/${selectedOrder.id}/send-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}`,
          },
          body: JSON.stringify({ channel: sendChannel }),
        });
        result = await res.json();
      }

      if (result.success) {
        showToast(result.message || 'Link de receta enviado correctamente.');
        setSendLinkFeedback({ success: true, message: result.message || 'Enviado exitosamente' });
        setTimeout(() => {
          setIsSendLinkModalOpen(false);
          setSendLinkFeedback(null);
        }, 1400);
      } else {
        setSendLinkFeedback({ success: false, message: result.message || 'Error al enviar el link.' });
      }
    } catch (err: any) {
      setSendLinkFeedback({ success: false, message: err.message || 'Error de conexión.' });
    } finally {
      setIsSendingLink(false);
    }
  };

  // Derive unique operators in current orders
  const operatorsList = Array.from(
    new Set(
      orders
        .map(o => o.createdByOperatorName)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    )
  );

  // Filters logic
  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (filter === 'Pendientes' && (order.status !== 'Pendiente' || order.paymentStatus === 'pending')) return false;
    if (filter === 'Pago Pendiente' && order.paymentStatus !== 'pending') return false;
    if (filter === 'En revisión' && order.status !== 'En revisión' && order.status !== 'Aprobada' && order.status !== 'Solicita más información') return false;
    if (filter === 'Listos' && order.status !== 'Emitida' && order.status !== 'Enviada') return false;
    if (filter === 'Rechazadas' && order.status !== 'Rechazada') return false;

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

  // Compute selected order reference (strictly scoped to currently filtered list)
  const selectedOrder = filteredOrders.find(o => o.id === selectedOrderId) || null;

  // Floating Prescription Assistant (Document PiP / Popup window)
  const {
    isOpen: isFloatingWindowOpen,
    isPipSupported,
    pipContainer,
    autoOpenOnTabSwitch,
    openFloatingWindow,
    closeFloatingWindow,
    toggleFloatingWindow,
    toggleAutoOpen,
  } = useFloatingPrescriptionWindow({
    hasActiveOrder: !!selectedOrder,
  });

  const [extractedTextCache, setExtractedTextCache] = useState<Record<string, string>>({});
  const [isExtractingCache, setIsExtractingCache] = useState<Record<string, boolean>>({});

  // Reset collapsed sections whenever a new order is opened
  React.useEffect(() => {
    setCollapsedSections(DEFAULT_COLLAPSED_SECTIONS);
  }, [selectedOrderId]);

  // Sync notes and recipe fields once an order is selected
  React.useEffect(() => {
    setActiveDetailTab('rx');
    if (selectedOrder) {
      setDoctorNotes(selectedOrder.doctorNotes || '');
      if (selectedOrder.recipePdfUrl) {
        if (selectedOrder.recipePdfUrl === 'PAMI' || selectedOrder.recipePdfUrl === 'IOMA') {
          setPrescriptionType(selectedOrder.recipePdfUrl as 'PAMI' | 'IOMA');
          setUploadedRecipe(null);
        } else {
          setPrescriptionType('RCTA');
          setUploadedRecipe({
            url: selectedOrder.recipePdfUrl,
            name: selectedOrder.recipePdfName || 'receta_cargada.pdf'
          });
        }
      } else {
        setPrescriptionType('RCTA');
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
    } else {
      setDoctorNotes('');
      setPrescriptionType('RCTA');
      setUploadedRecipe(null);
    }
  }, [selectedOrderId, selectedOrder]);

  const pendingCount = orders.filter(o => o.status === 'Pendiente').length;
  const inProcessCount = orders.filter(o => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length;
  const completedCount = orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;

  // Handler to mark an order as "En revisión"
  const handleMarkInProcess = (id: string) => {
    onUpdateStatus(id, 'En revisión', 'Trabajando en el pedido. Evaluando médicamente la renovación.');
    showToast('El pedido ha sido marcado en estado "En Revisión". El paciente lo verá actualizado en tiempo real.');
    
    // Set ref to keep this order ID selected when changing subview
    skipClearOrderIdRef.current = id;
    
    // Move to the medical review subview/tab in the sidebar
    if (onNavigateToSubview) {
      onNavigateToSubview('revision');
    }
  };

  // Helper to validate and process recipe files (PDF or Images)
  const processPdfFile = (file: File) => {
    setPdfUploadError(null);

    // Validate MIME type and extension
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isValid = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    if (!isValid) {
      setPdfUploadError('Formato no válido. Se admiten archivos PDF o imágenes (PNG, JPG, JPEG, WEBP).');
      showToast('Error: Formato no soportado. Use PDF o imágenes.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPdfUploadError('El archivo excede el tamaño máximo permitido (15 MB).');
      showToast('Error: El archivo no puede superar los 15 MB.');
      return;
    }

    compressImageAndGetBase64(file).then((base64String) => {
      setUploadedRecipe({
        url: base64String,
        name: file.name,
        size: file.size
      });
      showToast(`Archivo "${file.name}" adjuntado correctamente.`);
    }).catch(err => {
      setPdfUploadError('Error al leer el archivo seleccionado.');
      showToast('Error al leer el archivo.');
    });
  };

  const handlePdfDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(true);
  };

  const handlePdfDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  // Auto generator for digital recipes
  const handleGenerateSimulatedRecipe = (order: MedicalOrder) => {
    const digitalPdfUrl = 'RECIPE_PDF_GENERATED';
    const digitalPdfName = `receta_emitida_${order.patientLastName.toLowerCase()}_${order.id}.pdf`;
    setUploadedRecipe({
      url: digitalPdfUrl,
      name: digitalPdfName
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
          paymentMethod: 'cash_desk',
          paymentAmount: newOrderPaymentAmount || currentTenant?.pricePerPrescription?.toString() || '10000',
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

  if (forcedSubview === 'nueva') {
    return (
      <NewOrderForm
        currentUser={currentUser}
        currentTenant={currentTenant}
        orders={orders}
        users={users}
        onSubmitOrder={onCreateOrder}
        onSuccess={() => {
          showToast('¡Solicitud creada de oficio exitosamente!');
          if (onNavigateToSubview) onNavigateToSubview('pendientes');
        }}
        onCancel={() => {
          if (onNavigateToSubview) onNavigateToSubview('pendientes');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[var(--ink)] text-white py-3 px-6 rounded-lg shadow-xl text-[0.85rem] font-[500] animate-fadeIn flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-[var(--accent)]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Internal Tabs Switcher - Only visible if no forced subview */}
      {!forcedSubview && (currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
        <div className="flex border-b border-[var(--ink-faint)] bg-white px-8 pt-4 shrink-0">
          <button
            onClick={() => setActiveDashboardTab('requests')}
            className={`pb-3 px-4 font-[600] text-[0.85rem] border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeDashboardTab === 'requests'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            Gestión de Solicitudes
          </button>
          
          <button
            onClick={() => setActiveDashboardTab('operators')}
            className={`pb-3 px-4 font-[600] text-[0.85rem] border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeDashboardTab === 'operators'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            Operadores y Reportes
          </button>
        </div>
      )}

      {activeDashboardTab === 'requests' || (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <section className="workspace flex-1">
            {/* List Pane */}
            <div className={`list-pane ${selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
              <div className="search-bar shrink-0 space-y-2.5">
                {onNavigateToSubview && (
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Bandeja de Pedidos
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigateToSubview('pacientes')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-[#1661E1] text-[#1661E1] hover:text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer border border-blue-200/70 hover:border-transparent group"
                      title="Explorar el padrón completo de pacientes y sus historiales clínicos"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Ver más pacientes</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                )}

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
                      onChange={(e) => {
                        setFilter(e.target.value as any);
                        setSelectedOrderId(null);
                      }}
                      className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--ink-faint)] rounded-md text-[0.75rem] outline-none"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Pendientes">Solicitudes pendientes</option>
                      <option value="Pago Pendiente">Pago pendiente</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Listos">Emitidas</option>
                      <option value="Rechazadas">Rechazadas</option>
                    </select>
                    <select
                      value={selectedOperatorFilter}
                      onChange={(e) => {
                        setSelectedOperatorFilter(e.target.value);
                        setSelectedOrderId(null);
                      }}
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
                    const hasMessages = order.messages && order.messages.length > 0;
                    const lastMsg = hasMessages ? order.messages[order.messages.length - 1] : null;
                    const isFromPatient = lastMsg && lastMsg.sender === 'paciente';

                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`order-card group relative ${isActive ? 'selected' : ''}`}
                      >
                        <div className="order-meta items-center">
                          <span>{order.id.split('-')[0]}-{order.id.substring(order.id.length-4)}</span>
                          <div className="flex items-center gap-1.5">
                            <span>{new Date(order.createdAt).toLocaleDateString('es-AR')}</span>
                            {onDeleteOrder && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    setOrderToDelete(order);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 transition-all cursor-pointer inline-flex items-center"
                                title="Eliminar solicitud"
                              >
                                <Trash2 className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="order-name">
                          {order.patientLastName}, {order.patientName}
                        </p>
                        {order.isForDependent && (
                          <div className="mt-0.5">
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" /> Familiar ({order.dependentRelationship || 'A cargo'})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="order-sub truncate">
                            {order.obraSocial} • DNI: {order.patientDni}
                          </p>
                          {(() => {
                            const pStatus = order.paymentStatus;
                            const isExempt = pStatus === 'exempt' || order.obraSocial === 'PAMI (Inssjp)' || String(order.paymentAmount) === '0';
                            if (pStatus === 'approved') return <span className="text-[9px] font-extrabold text-[#14BE99] bg-[#14BE99]/10 px-1.5 py-0.5 rounded border border-[#14BE99]/30 shrink-0">Pagado</span>;
                            if (pStatus === 'refunded') return <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">En dev.</span>;
                            if (isExempt) return <span className="text-[9px] font-extrabold text-[#3066C6] bg-[#3066C6]/10 px-1.5 py-0.5 rounded border border-[#3066C6]/30 shrink-0">Exento</span>;
                            if (pStatus === 'rejected') return <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">Rechazado</span>;
                            return <span className="text-[9px] font-extrabold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200 shrink-0">Pendiente</span>;
                          })()}
                        </div>

                        {hasMessages && (
                          <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md ${
                            isFromPatient 
                              ? 'bg-[#14BE99]/10 text-[#0F6C7D] border border-[#14BE99]/30 animate-pulse' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#14BE99]" />
                            <span className="truncate">
                              {order.messages.length} msg{order.messages.length > 1 ? 's' : ''} {isFromPatient ? '• Paciente escribió' : ''}
                            </span>
                          </div>
                        )}

                        {order.status === 'Pendiente' && <span className="inline-block mt-1 h-2 w-2 rounded-full bg-amber-500" />}
                        {(order.status === 'En revisión' || order.status === 'Solicita más información') && <span className="inline-block mt-1 h-2 w-2 rounded-full bg-[#1E6EFB]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail Pane */}
            <div className={`detail-pane ${!selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
              {selectedOrder ? (
                <div className="animate-fadeIn space-y-6 pb-12 w-full max-w-5xl mx-auto">
                  {/* Detail Header */}
                  <div className="border-b border-slate-200/80 pb-4 sm:pb-6">
                    <button
                      onClick={() => setSelectedOrderId(null)}
                      className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold mb-3.5 border border-slate-200/80 cursor-pointer transition-colors shadow-2xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Volver al listado</span>
                    </button>
                    
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="status-pill !m-0">{selectedOrder.status}</span>
                        {(() => {
                          const pStatus = selectedOrder.paymentStatus;
                          const isExempt = pStatus === 'exempt' || selectedOrder.obraSocial === 'PAMI (Inssjp)' || String(selectedOrder.paymentAmount) === '0';
                          if (pStatus === 'approved') {
                            return (
                              <span className="h-6 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 rounded-full bg-[#14BE99]/10 text-[#0F6C7D] border border-[#14BE99]/30 leading-none">
                                <Check className="h-3.5 w-3.5 text-[#14BE99]" /> Pagado (${selectedOrder.paymentAmount || currentTenant?.pricePerPrescription || '10000'})
                              </span>
                            );
                          }
                          if (pStatus === 'refunded') {
                            return (
                              <span className="h-6 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 leading-none" title="Arancel en proceso de devolución al paciente">
                                <RotateCcw className="h-3.5 w-3.5" /> En devolución (${selectedOrder.paymentAmount || '0'})
                              </span>
                            );
                          }
                          if (isExempt) {
                            return (
                              <span className="h-6 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 rounded-full bg-[#3066C6]/10 text-[#3066C6] border border-[#3066C6]/30 leading-none">
                                Exento / Bonificado
                              </span>
                            );
                          }
                          if (pStatus === 'rejected') {
                            return (
                              <span className="h-6 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 leading-none">
                                Pago Rechazado
                              </span>
                            );
                          }
                          return (
                            <span className="h-6 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 leading-none">
                              <Clock className="h-3.5 w-3.5" /> Pago Pendiente
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleFloatingWindow}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                            isFloatingWindowOpen
                              ? 'bg-[#1661E1] hover:bg-[#1E6EFB] text-white ring-2 ring-[#1661E1]/40'
                              : 'bg-white hover:bg-slate-50 text-[#1661E1] border border-blue-200/90'
                          }`}
                          title={isFloatingWindowOpen ? 'Cerrar ventana flotante' : 'Abrir ventana flotante (Picture-in-Picture) para tener los datos a mano mientras usás otro sistema'}
                        >
                          <AppWindow className="h-4 w-4" />
                          <span>{isFloatingWindowOpen ? 'Ventana Flotante (Abierta)' : 'Asistente Flotante (PiP)'}</span>
                        </button>

                        {onNavigateToChat && (
                          <button
                            onClick={() => onNavigateToChat(selectedOrder.id)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                          >
                            <MessageSquare className="h-4 w-4 text-emerald-600" />
                            <span>Chatear con Paciente</span>
                          </button>
                        )}

                        {onDeleteOrder && (
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(selectedOrder)}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/90 hover:border-rose-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            title="Eliminar esta solicitud"
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-5">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {selectedOrder.patientName} {selectedOrder.patientLastName}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Fecha de solicitud: {new Date(selectedOrder.createdAt).toLocaleDateString('es-AR')} {new Date(selectedOrder.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>

                    {/* Banner del Asistente Flotante para Prescripción Externa */}
                    <div className="mt-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#1661E1] text-white shadow-xs shrink-0 mt-0.5 sm:mt-0">
                          <AppWindow className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                              Asistente Flotante de Medicación
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0141BC] border border-blue-200">
                              {isPipSupported ? 'Always-on-Top / PiP' : 'Ventana Emergente'}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                            Mantiene los datos del paciente y la medicación visibles sobre el sistema oficial de recetas (RCTA, PAMI, IOMA, etc.) mientras cambiás de pestaña.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-200/60">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoOpenOnTabSwitch}
                            onChange={(e) => toggleAutoOpen(e.target.checked)}
                            className="rounded text-[#1661E1] focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Auto-activar al cambiar pestaña</span>
                        </label>

                        <button
                          onClick={toggleFloatingWindow}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            isFloatingWindowOpen
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-[#1661E1] hover:bg-[#1E6EFB] text-white'
                          }`}
                        >
                          {isFloatingWindowOpen ? (
                            <>
                              <X className="h-3.5 w-3.5" />
                              <span>Cerrar</span>
                            </>
                          ) : (
                            <>
                              <AppWindow className="h-3.5 w-3.5" />
                              <span>Abrir Ventana</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Structured Ordered Lists with Collapsible Accordion Sections */}
                  <div className="space-y-4">
                    {/* Toolbar to expand/collapse all */}
                    <div className="flex items-center justify-between gap-2 px-1 pb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>Secciones de la Solicitud</span>
                      </span>
                      <button
                        type="button"
                        onClick={toggleAllSections}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1661E1] hover:text-[#0141BC] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs select-none"
                      >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                        <span>{isAllCollapsed ? 'Expandir todas las secciones' : 'Comprimir todas las secciones'}</span>
                      </button>
                    </div>

                    {/* 1. INFORMACIÓN DEL PACIENTE */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleSection('patient')}
                        className="w-full bg-slate-50/70 hover:bg-slate-100/80 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none border-b border-transparent"
                        style={{ borderBottomColor: !collapsedSections.patient ? '#e2e8f0' : 'transparent' }}
                        aria-expanded={!collapsedSections.patient}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-lg bg-blue-100 text-[#1661E1] shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 truncate">1. Información del Paciente</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {collapsedSections.patient && (
                            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-250 px-2.5 py-0.5 rounded-md truncate max-w-[240px] shadow-3xs">
                              {selectedOrder.patientName} {selectedOrder.patientLastName} • DNI {selectedOrder.patientDni}
                            </span>
                          )}
                          <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.patient ? 'rotate-180 text-slate-600' : ''}`} />
                          </div>
                        </div>
                      </button>
                      {!collapsedSections.patient && (
                        <div className="divide-y divide-slate-100 animate-fadeIn">
                          <CopyableFieldRow label="ID Solicitud" value={selectedOrder.id} fieldId="id" />
                          <CopyableFieldRow label="Nombre" value={selectedOrder.patientName} fieldId="patientName" />
                          <CopyableFieldRow label="Apellido" value={selectedOrder.patientLastName} fieldId="patientLastName" />
                          <CopyableFieldRow label="DNI / Identificación" value={selectedOrder.patientDni} fieldId="patientDni" />
                          <CopyableFieldRow 
                            label="Fecha de Nacimiento" 
                            value={formatBirthDate(selectedOrder.patientBirthDate)} 
                            copyValue={formatBirthDate(selectedOrder.patientBirthDate)}
                            fieldId="patientBirthDate" 
                          />
                          <CopyableFieldRow label="Teléfono / WhatsApp" value={selectedOrder.patientPhone || '—'} fieldId="patientPhone" />
                          <CopyableFieldRow label="Correo Electrónico" value={selectedOrder.patientEmail || '—'} fieldId="patientEmail" />
                          {selectedOrder.patientCity && (
                            <CopyableFieldRow label="Ciudad" value={selectedOrder.patientCity} fieldId="patientCity" />
                          )}
                          {selectedOrder.patientProvince && (
                            <CopyableFieldRow label="Provincia" value={selectedOrder.patientProvince} fieldId="patientProvince" />
                          )}
                          <CopyableFieldRow 
                            label="Canal de Entrega" 
                            value={selectedOrder.deliveryMethod === 'both' ? 'Email y WhatsApp' : selectedOrder.deliveryMethod === 'email' ? 'Email' : 'WhatsApp'} 
                            copyValue={selectedOrder.deliveryMethod} 
                            fieldId="deliveryMethod" 
                          />
                          <CopyableFieldRow 
                            label="Fecha de Solicitud" 
                            value={new Date(selectedOrder.createdAt).toLocaleDateString('es-AR') + ' ' + new Date(selectedOrder.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} 
                            copyValue={new Date(selectedOrder.createdAt).toLocaleDateString('es-AR') + ' ' + new Date(selectedOrder.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} 
                            fieldId="createdAt" 
                          />
                          {selectedOrder.lastConsultationTime && (
                            <CopyableFieldRow label="Última Consulta" value={selectedOrder.lastConsultationTime} fieldId="lastConsultationTime" />
                          )}
                          {selectedOrder.lastConsultationDoctor && (
                            <CopyableFieldRow label="Médico de Última Consulta" value={selectedOrder.lastConsultationDoctor} fieldId="lastConsultationDoctor" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 1.1 PACIENTE A CARGO (Si aplica) */}
                    {selectedOrder.isForDependent && (
                      <div className="bg-purple-50/30 border border-purple-200/60 rounded-2xl shadow-2xs overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => toggleSection('dependent')}
                          className="w-full bg-purple-50/80 hover:bg-purple-100/80 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none border-b border-transparent"
                          style={{ borderBottomColor: !collapsedSections.dependent ? 'rgba(233, 213, 255, 0.6)' : 'transparent' }}
                          aria-expanded={!collapsedSections.dependent}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 rounded-lg bg-purple-200/80 text-purple-700 shrink-0">
                              <Users className="h-4 w-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-800 truncate">1.1 Paciente a Cargo / Familiar</h3>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {collapsedSections.dependent && (
                              <span className="text-[10px] font-bold text-purple-700 bg-white border border-purple-200 px-2.5 py-0.5 rounded-md truncate max-w-[240px] shadow-3xs">
                                {selectedOrder.dependentRelationship || 'Familiar'} de {selectedOrder.requestedByTitularName || 'Titular'}
                              </span>
                            )}
                            <div className="p-1 rounded-md text-purple-400 hover:text-purple-600 transition-colors">
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.dependent ? 'rotate-180 text-purple-600' : ''}`} />
                            </div>
                          </div>
                        </button>
                        {!collapsedSections.dependent && (
                          <div className="divide-y divide-purple-100 animate-fadeIn">
                            <CopyableFieldRow label="Relación / Parentesco" value={selectedOrder.dependentRelationship || 'Familiar'} fieldId="dependentRelationship" />
                            <CopyableFieldRow label="Nombre Titular de Cuenta" value={selectedOrder.requestedByTitularName || '—'} fieldId="requestedByTitularName" />
                            <CopyableFieldRow label="DNI Titular" value={selectedOrder.requestedByTitularDni || '—'} fieldId="requestedByTitularDni" />
                            <CopyableFieldRow label="Teléfono Titular" value={selectedOrder.requestedByTitularPhone || '—'} fieldId="requestedByTitularPhone" />
                            <CopyableFieldRow label="Email Titular" value={selectedOrder.requestedByTitularEmail || '—'} fieldId="requestedByTitularEmail" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. INFORMACIÓN DE LA OBRA SOCIAL */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleSection('obraSocial')}
                        className="w-full bg-slate-50/70 hover:bg-slate-100/80 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none border-b border-transparent"
                        style={{ borderBottomColor: !collapsedSections.obraSocial ? '#e2e8f0' : 'transparent' }}
                        aria-expanded={!collapsedSections.obraSocial}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                            <Shield className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 truncate">2. Obra Social / Cobertura Médica</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {collapsedSections.obraSocial && (
                            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-250 px-2.5 py-0.5 rounded-md truncate max-w-[240px] shadow-3xs">
                              {selectedOrder.obraSocial} {selectedOrder.obraSocialNumber ? `• N° ${selectedOrder.obraSocialNumber}` : ''}
                            </span>
                          )}
                          <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.obraSocial ? 'rotate-180 text-slate-600' : ''}`} />
                          </div>
                        </div>
                      </button>
                      {!collapsedSections.obraSocial && (
                        <div className="divide-y divide-slate-100 animate-fadeIn">
                          <CopyableFieldRow label="Cobertura / Obra Social" value={selectedOrder.obraSocial} fieldId="obraSocial" />
                          <CopyableFieldRow 
                            label="Número de Credencial / Afiliado" 
                            value={selectedOrder.obraSocialNumber || 'Particular / Sin Obra Social'} 
                            copyValue={selectedOrder.obraSocialNumber || ''} 
                            fieldId="obraSocialNumber" 
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. MEDICACIÓN SOLICITADA */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleSection('medication')}
                        className="w-full bg-slate-50/70 hover:bg-slate-100/80 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none border-b border-transparent"
                        style={{ borderBottomColor: !collapsedSections.medication ? '#e2e8f0' : 'transparent' }}
                        aria-expanded={!collapsedSections.medication}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                            <Pill className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 truncate">3. Medicación y Diagnóstico</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {collapsedSections.medication && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md truncate max-w-[260px] shadow-3xs">
                              {selectedOrder.medicationItems?.length ? `${selectedOrder.medicationItems.length} medicamento(s)` : selectedOrder.medicationText ? 'Texto libre' : 'Adjunto/Foto'}
                              {selectedOrder.diagnostic ? ` • ${selectedOrder.diagnostic}` : ''}
                            </span>
                          )}
                          <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.medication ? 'rotate-180 text-slate-600' : ''}`} />
                          </div>
                        </div>
                      </button>
                      {!collapsedSections.medication && (
                        <div className="animate-fadeIn">
                          <div className="divide-y divide-slate-100">
                            <CopyableFieldRow label="Diagnóstico Principal" value={selectedOrder.diagnostic || '—'} fieldId="diagnostic" />
                            {selectedOrder.comments && (
                              <CopyableFieldRow label="Comentarios del Paciente" value={selectedOrder.comments} fieldId="comments" />
                            )}
                          </div>

                          {/* Detalle estructurado de medicamentos si está disponible */}
                          {selectedOrder.medicationItems && selectedOrder.medicationItems.length > 0 ? (
                            <div className="p-4 bg-slate-50/40 border-t border-slate-100 space-y-4">
                              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Detalle de Medicamentos</h4>
                              <div className="space-y-3">
                                {selectedOrder.medicationItems.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50/80 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-200">
                                    <div className="bg-slate-200/60 px-4 py-2.5 flex justify-between items-center border-b border-slate-300">
                                      <span className="text-xs font-black text-slate-700">Medicamento #{idx + 1}</span>
                                      <span className="bg-white border-2 border-slate-300 text-slate-800 font-extrabold text-[11px] px-2.5 py-0.5 rounded-md shadow-3xs">
                                        {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                                      </span>
                                    </div>
                                    <div className="divide-y divide-slate-200 bg-white/40">
                                      <CopyableFieldRow label="Nombre Comercial" value={item.nombreComercial} fieldId={`med-${idx}-nombre`} />
                                      {item.droga && (
                                        <CopyableFieldRow label="Droga / Monodroga" value={item.droga} fieldId={`med-${idx}-droga`} />
                                      )}
                                      {item.miligramos && (
                                        <CopyableFieldRow label="Dosis / Miligramos" value={item.miligramos} fieldId={`med-${idx}-mgs`} />
                                      )}
                                      {item.presentacion && (
                                        <CopyableFieldRow label="Presentación" value={item.presentacion} fieldId={`med-${idx}-pres`} />
                                      )}
                                      {item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null && item.unidadesPorCaja > 0 && (
                                        <CopyableFieldRow label="Unidades por Caja" value={String(item.unidadesPorCaja)} fieldId={`med-${idx}-unidades`} />
                                      )}
                                      <CopyableFieldRow 
                                        label="Cantidad de Cajas" 
                                        value={`${item.cantidadCajas} ${item.cantidadCajas === 1 ? 'caja' : 'cajas'}`} 
                                        fieldId={`med-${idx}-cajas`} 
                                      />
                                      {(item.diagnostic || item.diagnostico) && (
                                        <CopyableFieldRow 
                                          label="Diagnóstico de la Medicación" 
                                          value={item.diagnostic || item.diagnostico || ''} 
                                          fieldId={`med-${idx}-diag`} 
                                        />
                                      )}
                                      {item.comments && (
                                        <CopyableFieldRow label="Comentarios / Aclaraciones" value={item.comments} fieldId={`med-${idx}-comments`} />
                                      )}
                                      {item.posologia && (
                                        <CopyableFieldRow label="Posología" value={item.posologia} fieldId={`med-${idx}-pos`} />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : selectedOrder.medicationText ? (
                            <div className="p-4 bg-slate-50/40 border-t border-slate-100">
                              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Detalle de Receta (Texto Libre)</h4>
                              <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-start gap-3 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">{selectedOrder.medicationText}</span>
                                <button
                                  onClick={() => handleCopy(selectedOrder.medicationText, 'medicationText', 'Detalle de Medicación')}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0 flex items-center justify-center border border-transparent active:scale-95"
                                  title="Copiar Medicación"
                                >
                                  {copiedField === 'medicationText' ? <Check className="h-3.5 w-3.5 text-emerald-600 animate-scaleIn" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {/* Fotos de envases y recetas adjuntas */}
                          {((selectedOrder.medicationPhotos && selectedOrder.medicationPhotos.length > 0) || selectedOrder.medicationPhotoUrl) && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/10">
                              <span className="text-xs font-bold text-slate-500 block mb-2">Fotos de envases / Recetas adjuntas:</span>
                              <div className="flex flex-wrap gap-3">
                                {(selectedOrder.medicationPhotos || 
                                  (selectedOrder.medicationPhotoUrl ? [{ url: selectedOrder.medicationPhotoUrl, name: selectedOrder.medicationPhotoName || 'foto.jpg' }] : [])
                                ).map((photo, i) => (
                                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-w-[220px]">
                                    {photo.url.startsWith('MOCK') || photo.url.startsWith('RECIPE') ? (
                                      <div className="h-28 bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-500 font-medium p-3 text-center">
                                        <FileText className="h-6 w-6 text-slate-400 mb-1" />
                                        <span>Archivo Adjunto</span>
                                      </div>
                                    ) : photo.url.startsWith('data:application/pdf') ? (
                                      <a 
                                        href={photo.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => handleViewReceipt(e, photo.url, photo.name || 'receta.pdf')}
                                        className="block h-28 bg-slate-50 flex flex-col items-center justify-center p-3 hover:bg-slate-100 transition-colors relative group cursor-zoom-in text-center"
                                      >
                                        <FileText className="h-8 w-8 text-rose-500 mb-1" />
                                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-full px-1">Documento PDF</span>
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                          <Eye className="h-4 w-4" /> Ver PDF
                                        </div>
                                      </a>
                                    ) : (
                                      <a 
                                        href={photo.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => handleViewReceipt(e, photo.url, photo.name || 'foto.jpg')}
                                        className="block relative group cursor-zoom-in"
                                      >
                                        <img src={photo.url} alt="Envase" className="h-28 w-full object-cover group-hover:opacity-90 transition-opacity" />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                          <Eye className="h-4 w-4" /> Ver foto
                                        </div>
                                      </a>
                                    )}
                                    <div className="p-2 text-[10px] bg-slate-50 border-t border-slate-100 space-y-0.5">
                                      <p className="font-mono text-slate-700 font-bold truncate">{photo.name}</p>
                                      <p className="text-[9px] font-bold text-[#1661E1]">
                                        {photo.cantidadCajas || 1} {(photo.cantidadCajas || 1) === 1 ? 'Caja' : 'Cajas'}
                                        {photo.unidadesPorCaja ? ` x ${photo.unidadesPorCaja} comp.` : ''}
                                      </p>
                                      {photo.diagnostic && (
                                        <p className="text-[9px] text-indigo-700 font-semibold truncate" title={photo.diagnostic}>
                                          Diag: {photo.diagnostic}
                                        </p>
                                      )}
                                      {photo.comments && (
                                        <p className="text-[9px] text-slate-600 italic truncate" title={photo.comments}>
                                          Obs: {photo.comments}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. INFORMACIÓN DE PAGO */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleSection('payment')}
                        className="w-full bg-slate-50/70 hover:bg-slate-100/90 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none border-b border-transparent"
                        style={{ borderBottomColor: !collapsedSections.payment ? '#e2e8f0' : 'transparent' }}
                        aria-expanded={!collapsedSections.payment}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 truncate">4. Información de Pago</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {collapsedSections.payment && (
                            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-250 px-2.5 py-0.5 rounded-md truncate max-w-[240px] shadow-3xs">
                              ${selectedOrder.paymentAmount || '0'} • {selectedOrder.paymentStatus === 'approved' ? 'Pagado' : selectedOrder.paymentStatus === 'refunded' ? 'En devolución' : selectedOrder.paymentStatus === 'exempt' ? 'Exento' : selectedOrder.paymentStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </span>
                          )}
                          <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.payment ? 'rotate-180 text-slate-600' : ''}`} />
                          </div>
                        </div>
                      </button>
                      {!collapsedSections.payment && (
                        <div className="animate-fadeIn">
                          <div className="divide-y divide-slate-100">
                            <CopyableFieldRow 
                              label="Método de Pago" 
                              value={(() => {
                                const method = getOrderPaymentMethod(selectedOrder);
                                if (method === 'mp') return 'Mercado Pago (Online)';
                                if (method === 'transfer') return 'Transferencia Bancaria';
                                if (method === 'cash_desk') return 'Mesa de Entrada / Efectivo';
                                if (method === 'bonificado') return 'Bonificado / Exento';
                                return 'No especificado';
                              })()} 
                              fieldId="paymentMethodDisplay" 
                            />
                            {selectedOrder.paymentId && (
                              <CopyableFieldRow label="ID de Transacción / Pago" value={selectedOrder.paymentId} fieldId="paymentId" />
                            )}
                            <CopyableFieldRow label="Monto" value={`$${selectedOrder.paymentAmount || '0'}`} fieldId="paymentAmount" />
                            <CopyableFieldRow 
                              label="Estado del Pago" 
                              value={(() => {
                                const status = selectedOrder.paymentStatus;
                                if (status === 'approved') return 'Aprobado';
                                if (status === 'pending') return 'Pendiente';
                                if (status === 'rejected') return 'Rechazado';
                                if (status === 'refunded') return 'Devuelto';
                                if (status === 'exempt') return 'Exento';
                                return 'Desconocido';
                              })()} 
                              fieldId="paymentStatusDisplay" 
                            />
                            {selectedOrder.paymentDate && (
                              <CopyableFieldRow 
                                label="Fecha de Pago" 
                                value={new Date(selectedOrder.paymentDate).toLocaleDateString('es-AR') + ' ' + new Date(selectedOrder.paymentDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} 
                                copyValue={selectedOrder.paymentDate}
                                fieldId="paymentDate" 
                              />
                            )}
                          </div>

                          {/* En caso de ser transferencia, mostrar el comprobante de pago cargado */}
                          {getOrderPaymentMethod(selectedOrder) === 'transfer' && selectedOrder.paymentReceiptUrl && (
                            <div className="p-4 bg-slate-50/40 border-t border-slate-100">
                              <span className="text-xs font-bold text-slate-500 block mb-2">Comprobante de Transferencia:</span>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-w-[280px]">
                                {selectedOrder.paymentReceiptUrl.startsWith('data:application/pdf') || selectedOrder.paymentReceiptName?.endsWith('.pdf') ? (
                                  <div className="p-4 flex flex-col items-center justify-center text-center">
                                    <FileText className="h-10 w-10 text-rose-500 mb-2" />
                                    <span className="text-[11px] text-slate-700 font-medium truncate max-w-full mb-3">
                                      {selectedOrder.paymentReceiptName || 'comprobante.pdf'}
                                    </span>
                                    <div className="flex gap-2 w-full">
                                      <a 
                                        href={selectedOrder.paymentReceiptUrl} 
                                        download={selectedOrder.paymentReceiptName || 'comprobante.pdf'}
                                        className="flex-1 inline-flex items-center justify-center gap-1 bg-[#1661E1] hover:bg-[#1E6EFB] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <Download className="h-3.5 w-3.5" /> Descargar
                                      </a>
                                      <a 
                                        href={selectedOrder.paymentReceiptUrl} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => handleViewReceipt(e, selectedOrder.paymentReceiptUrl, selectedOrder.paymentReceiptName || 'comprobante.pdf')}
                                        className="inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" /> Ver
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <a 
                                      href={selectedOrder.paymentReceiptUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      onClick={(e) => handleViewReceipt(e, selectedOrder.paymentReceiptUrl, selectedOrder.paymentReceiptName || 'comprobante.jpg')}
                                      className="block relative group cursor-zoom-in"
                                    >
                                      <img 
                                        src={selectedOrder.paymentReceiptUrl} 
                                        alt="Comprobante de Transferencia" 
                                        className="max-h-48 w-full object-contain bg-slate-50 group-hover:opacity-90 transition-opacity" 
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                        <Eye className="h-4 w-4" /> Ampliar comprobante
                                      </div>
                                    </a>
                                    <div className="p-2 text-[10px] truncate bg-slate-50 font-mono text-slate-600 border-t border-slate-100 flex justify-between items-center">
                                      <span className="truncate">{selectedOrder.paymentReceiptName || 'comprobante.jpg'}</span>
                                      <a 
                                        href={selectedOrder.paymentReceiptUrl} 
                                        download={selectedOrder.paymentReceiptName || 'comprobante.jpg'}
                                        className="text-blue-600 hover:text-blue-800 shrink-0 ml-2"
                                        title="Descargar comprobante"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Actions & Prescribing Workflow */}
                  <div className="mt-6 pt-6 border-t border-slate-200/80">
                    {currentUser?.role === 'admin' ? (
                      <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-center text-slate-600 text-xs font-medium">
                        Modo solo lectura (Administrador). Los administradores pueden visualizar solicitudes pero no crearlas ni modificar su estado.
                      </div>
                    ) : (
                      <>
                        {selectedOrder.status === 'Pendiente' && (currentUser?.role === 'medico' || currentUser?.role === 'colaborador') && (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-amber-900 text-sm">Solicitud Pendiente de Revisión Médica</h4>
                              <p className="text-xs text-amber-700 mt-0.5">Al iniciar la revisión médica, el paciente será notificado y la solicitud pasará al estado activo.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                              <button
                                onClick={() => handleMarkInProcess(selectedOrder.id)}
                                className="flex-1 sm:flex-initial bg-[#1661E1] hover:bg-[#1E6EFB] active:scale-[0.99] text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
                              >
                                EMPEZAR REVISIÓN CLÍNICA
                              </button>
                              <button
                                onClick={() => {
                                  onUpdateStatus(selectedOrder.id, 'Rechazada', doctorNotes.trim() || 'Solicitud no aprobada tras evaluación clínica.');
                                  showToast('La solicitud ha sido rechazada.');
                                }}
                                className="bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        )}

                        {(selectedOrder.status === 'En revisión' || selectedOrder.status === 'Aprobada' || selectedOrder.status === 'Solicita más información') && (currentUser?.role === 'medico' || currentUser?.role === 'colaborador') && (
                          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs uppercase tracking-wider text-slate-500 font-bold">
                                Gestión Médica y Emisión
                              </span>
                            </div>


                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Sistema de Emisión de Receta
                              </label>
                              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                                {(['RCTA', 'PAMI', 'IOMA'] as const).map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      setPrescriptionType(type);
                                      setPdfUploadError(null);
                                    }}
                                    className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all text-center ${
                                      prescriptionType === type
                                        ? 'bg-white text-[#1661E1] shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {prescriptionType !== 'RCTA' ? (
                              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 text-center space-y-2 animate-fadeIn">
                                <div className="h-10 w-10 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                  <Check className="h-5 w-5" />
                                </div>
                                <h5 className="font-bold text-slate-800 text-xs">Emisión Electrónica via {prescriptionType}</h5>
                                <p className="text-xs text-slate-600">
                                  Los medicamentos estarán listos para ser retirados en la farmacia bajo la cobertura de <strong>{prescriptionType}</strong> con el Nro de Obra Social:
                                </p>
                                <div className="inline-block bg-white px-4 py-2 rounded-xl border border-blue-200 font-mono text-sm font-bold text-slate-855 shadow-xs">
                                  {selectedOrder.obraSocialNumber || 'Sin número de afiliado cargado'}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  No es necesario adjuntar ningún archivo. Al presionar "Emitir Receta Final", el paciente será notificado con esta información.
                                </p>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                  <span>Adjuntar Receta Firmada Digitalmente o Documento</span>
                                  <span className="text-[11px] text-slate-400 font-normal">Formatos admitidos: PDF o Imágenes (.png, .jpg, .jpeg, .webp)</span>
                                </label>

                                {uploadedRecipe ? (
                                  <div className="bg-white border-2 border-[#14BE99] rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                      {uploadedRecipe.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/) ? (
                                        <img src={uploadedRecipe.url} className="h-10 w-10 object-cover rounded-lg shrink-0 border border-slate-200" alt="Vista previa receta" />
                                      ) : (
                                        <div className="h-10 w-10 rounded-lg bg-[#14BE99]/10 text-[#14BE99] flex items-center justify-center shrink-0 border border-[#14BE99]/20">
                                          <FileText className="h-5 w-5" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-xs truncate">{uploadedRecipe.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[11px] font-bold text-[#14BE99] flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Documento Listo para emisión oficial
                                          </span>
                                          {uploadedRecipe.size && (
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              ({(uploadedRecipe.size / 1024).toFixed(0)} KB)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => pdfInputRef.current?.click()}
                                        className="text-xs font-bold text-[#1661E1] hover:text-[#1E6EFB] bg-[#1661E1]/10 hover:bg-[#1661E1]/20 px-3 py-1.5 rounded-lg border border-[#1661E1]/20 transition-colors cursor-pointer"
                                      >
                                        Cambiar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUploadedRecipe(null);
                                          setPdfUploadError(null);
                                        }}
                                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Quitar archivo"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onDragOver={handlePdfDragOver}
                                    onDragLeave={handlePdfDragLeave}
                                    onDrop={handlePdfDrop}
                                    onClick={() => pdfInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
                                      pdfUploadError
                                        ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-500/15'
                                        : isDraggingPdf
                                        ? 'border-[#1661E1] bg-[#1661E1]/5 scale-[1.01] ring-4 ring-[#1E6EFB]/15'
                                        : 'border-slate-300 hover:border-[#1661E1] bg-white hover:bg-slate-50/50'
                                    }`}
                                  >
                                    <div className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                                      pdfUploadError ? 'bg-rose-100 text-rose-600' : 'bg-[#1661E1]/10 text-[#1661E1]'
                                    }`}>
                                      <FileUp className="h-5 w-5" />
                                    </div>
                                    <p className={`text-xs font-bold ${pdfUploadError ? 'text-rose-900' : 'text-slate-800'}`}>
                                      {isDraggingPdf ? 'Suelte el archivo aquí' : 'Arrastre y suelte la receta (PDF o Imagen) aquí *'}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      o haga clic para seleccionar desde su equipo (PDF o imágenes PNG, JPG, JPEG, WEBP)
                                    </p>
                                  </div>
                                )}

                                <input
                                  ref={pdfInputRef}
                                  type="file"
                                  accept="application/pdf,.pdf,image/png,.png,image/jpeg,.jpeg,image/jpg,.jpg,image/webp,.webp"
                                  onChange={handleFileInputChange}
                                  className="hidden"
                                />

                                {pdfUploadError && (
                                  <p className="text-[11px] text-rose-600 font-semibold mt-2 flex items-center gap-1 animate-fadeIn">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{pdfUploadError}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                              <button
                                onClick={() => {
                                  if (prescriptionType === 'RCTA' && !uploadedRecipe) {
                                    setPdfUploadError('Debe adjuntar el archivo (PDF o Imagen) de la receta oficial firmada antes de emitir.');
                                    showToast('Error: Debe adjuntar la receta oficial.');
                                    return;
                                  }
                                  
                                  const finalUrl = prescriptionType === 'RCTA' ? uploadedRecipe?.url : prescriptionType;
                                  const finalName = prescriptionType === 'RCTA' ? uploadedRecipe?.name : `receta_electronica_${prescriptionType.toLowerCase()}`;

                                  onUpdateStatus(selectedOrder.id, 'Emitida', doctorNotes, finalUrl, finalName);
                                  showToast('Receta emitida y enviada con éxito.');
                                }}
                                className="flex-1 bg-[#1661E1] hover:bg-[#1E6EFB] active:scale-[0.99] text-white py-3.5 px-6 rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>EMITIR RECETA FINAL</span>
                              </button>
                              <button
                                onClick={() => {
                                  onUpdateStatus(selectedOrder.id, 'Rechazada', doctorNotes.trim() || 'Solicitud rechazada en revisión médica.');
                                  showToast('La solicitud ha sido rechazada.');
                                }}
                                className="bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white px-6 py-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-sm hover:shadow"
                              >
                                RECHAZAR SOLICITUD
                              </button>
                              {onDeleteOrder && (
                                <button
                                  type="button"
                                  onClick={() => setOrderToDelete(selectedOrder)}
                                  className="bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-700 px-5 py-3.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                  title="Eliminar permanentemente esta solicitud"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" />
                                  <span>ELIMINAR SOLICITUD</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'Emitida' && (
                          <div className="bg-[#14BE99]/10 border border-[#14BE99]/30 p-6 rounded-2xl text-center">
                            <CheckCircle className="h-8 w-8 text-[#14BE99] mx-auto mb-2" />
                            <h4 className="font-bold text-[#0F6C7D] text-base">Receta Digital Emitida</h4>
                            <p className="text-xs text-[#0F6C7D]/80 mt-1">El proceso ha concluido correctamente y el paciente ha sido notificado.</p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                              {selectedOrder.recipePdfUrl && selectedOrder.recipePdfUrl !== 'PAMI' && selectedOrder.recipePdfUrl !== 'IOMA' ? (
                                <a
                                  href={selectedOrder.recipePdfUrl}
                                  download={selectedOrder.recipePdfName || 'receta.pdf'}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14BE99] hover:bg-[#0fa685] active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Descargar Receta Emitida</span>
                                </a>
                              ) : selectedOrder.recipePdfUrl ? (
                                <div className="px-5 py-2.5 bg-[#1661E1]/10 border border-[#1661E1]/20 text-[#1661E1] rounded-xl text-xs font-bold">
                                  Emitida Electrónicamente vía {selectedOrder.recipePdfUrl} (Afiliado: {selectedOrder.obraSocialNumber || 'Sin cargar'})
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedOrder.patientPhone && selectedOrder.patientEmail) {
                                    setSendChannel('both');
                                  } else if (selectedOrder.patientPhone) {
                                    setSendChannel('whatsapp');
                                  } else if (selectedOrder.patientEmail) {
                                    setSendChannel('email');
                                  } else {
                                    setSendChannel('whatsapp');
                                  }
                                  setSendLinkFeedback(null);
                                  setIsSendLinkModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1661E1] hover:bg-[#1E6EFB] active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm hover:shadow"
                              >
                                <Send className="h-4 w-4" />
                                <span>Enviar link de receta</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedOrder.status === 'Rechazada' && (
                          <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
                            <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
                            <div>
                              <h4 className="font-bold text-rose-900 text-base">Solicitud Rechazada</h4>
                              <p className="text-xs text-rose-700 mt-1">{selectedOrder.doctorNotes || 'La solicitud fue desestimada tras evaluación clínica.'}</p>
                            </div>
                            {onDeleteOrder && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setOrderToDelete(selectedOrder)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                  title="Eliminar permanentemente esta solicitud rechazada"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Eliminar Solicitud Rechazada</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Audit Log (Registro de Cambios) */}
                  {selectedOrder.auditLog && selectedOrder.auditLog.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200/80">
                      <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 mb-3">
                        <FileCheck className="h-4 w-4 text-slate-500" /> Registro de Cambios (Auditoría)
                      </span>
                      <div className="space-y-2.5">
                        {selectedOrder.auditLog.map((log, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-900">{log.action}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString('es-AR')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
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
              ) : (
                <div className="m-auto text-center max-w-sm p-8 space-y-3">
                  <div className="h-16 w-16 bg-[#1661E1]/10 text-[#1661E1] rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-[#1661E1]/20">
                    <FileText className="h-8 w-8 stroke-[1.75]" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {filteredOrders.length > 0 ? 'Seleccione una solicitud' : 'Sin solicitudes en esta sección'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {filteredOrders.length > 0 
                      ? 'Elija un pedido de la lista lateral para visualizar sus datos clínicos, auditar la medicación y emitir la receta digital.' 
                      : 'No hay trámites en esta categoría actualmente.'}
                  </p>
                  {filteredOrders.length > 0 && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1661E1] bg-[#1661E1]/10 px-3 py-1 rounded-full border border-[#1661E1]/20">
                        👈 {filteredOrders.length} {filteredOrders.length === 1 ? 'solicitud disponible' : 'solicitudes disponibles'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          <header className="px-8 py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
             <div className="space-y-1">
                <h1 className="text-[1.5rem] font-[700] tracking-[-0.03em]">Rendimiento de Operadores y Reportes</h1>
                <p className="text-[0.85rem] text-[var(--ink-muted)] mt-1">Consolidado de auditorías y honorarios según recetas procesadas.</p>
             </div>
          </header>
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
        </div>
      )}

      {/* Modal: Enviar link de receta (WhatsApp / Correo / Ambos) */}
      {isSendLinkModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-[#0141BC]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0141BC] to-[#1661E1] p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-xs shrink-0">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold">Enviar link de receta</h3>
                  <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">Seleccioná los canales de entrega al paciente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSendingLink) {
                    setIsSendLinkModalOpen(false);
                    setSendLinkFeedback(null);
                  }
                }}
                className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto">
              {/* Patient Info Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedOrder.patientName} {selectedOrder.patientLastName}
                  </span>
                  <span className="bg-[#1661E1]/10 text-[#1661E1] font-bold px-2 py-0.5 rounded-md text-[10px]">
                    Orden #{selectedOrder.id}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3.5 w-3.5 text-[#14BE99] shrink-0" />
                    <span className="truncate">{selectedOrder.patientPhone || 'Sin teléfono registrado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-[#1661E1] shrink-0" />
                    <span className="truncate">{selectedOrder.patientEmail || 'Sin email registrado'}</span>
                  </div>
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Canal de envío
                </label>
                <div className="space-y-2 sm:space-y-2.5">
                  {/* WhatsApp Option */}
                  <label
                    onClick={() => setSendChannel('whatsapp')}
                    className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      sendChannel === 'whatsapp'
                        ? 'border-[#14BE99] bg-[#14BE99]/5 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sendChannel"
                      value="whatsapp"
                      checked={sendChannel === 'whatsapp'}
                      onChange={() => setSendChannel('whatsapp')}
                      className="mt-1 text-[#14BE99] focus:ring-[#14BE99]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <MessageSquare className="h-4 w-4 text-[#14BE99] shrink-0" />
                        <span className="font-bold text-slate-900 text-xs">WhatsApp</span>
                        {selectedOrder.patientPhone ? (
                          <span className="text-[10px] bg-[#14BE99]/15 text-[#0F6C7D] px-1.5 py-0.5 rounded font-mono font-bold">
                            {selectedOrder.patientPhone}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                            Sin teléfono
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Envía un mensaje de WhatsApp con el enlace de descarga directa del PDF.
                      </p>
                    </div>
                  </label>

                  {/* Email Option */}
                  <label
                    onClick={() => setSendChannel('email')}
                    className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      sendChannel === 'email'
                        ? 'border-[#1661E1] bg-[#1661E1]/5 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sendChannel"
                      value="email"
                      checked={sendChannel === 'email'}
                      onChange={() => setSendChannel('email')}
                      className="mt-1 text-[#1661E1] focus:ring-[#1661E1]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Mail className="h-4 w-4 text-[#1661E1] shrink-0" />
                        <span className="font-bold text-slate-900 text-xs">Correo Electrónico</span>
                        {selectedOrder.patientEmail ? (
                          <span className="text-[10px] bg-[#1661E1]/15 text-[#1661E1] px-1.5 py-0.5 rounded font-mono font-bold truncate max-w-full">
                            {selectedOrder.patientEmail}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                            Sin correo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Envía un correo con diseño oficial, detalles de la solicitud y botón de descarga.
                      </p>
                    </div>
                  </label>

                  {/* Both Option */}
                  <label
                    onClick={() => setSendChannel('both')}
                    className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      sendChannel === 'both'
                        ? 'border-[#0F6C7D] bg-[#0F6C7D]/5 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sendChannel"
                      value="both"
                      checked={sendChannel === 'both'}
                      onChange={() => setSendChannel('both')}
                      className="mt-1 text-[#0F6C7D] focus:ring-[#0F6C7D]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Share2 className="h-4 w-4 text-[#0F6C7D] shrink-0" />
                        <span className="font-bold text-slate-900 text-xs">Ambos (WhatsApp y Correo)</span>
                        <span className="text-[10px] bg-[#0F6C7D]/15 text-[#0F6C7D] px-1.5 py-0.5 rounded font-bold">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Despacha simultáneamente la notificación por WhatsApp y por correo para asegurar la recepción.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Link Direct Preview & Copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-3.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                  <span>Enlace público del PDF:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const link = `${window.location.origin}/api/orders/public/${selectedOrder.id}/pdf`;
                      const success = await copyToClipboard(link);
                      if (success) {
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="text-[#1661E1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCheck className="h-3 w-3 text-[#14BE99]" />
                        <span className="text-[#14BE99]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate select-all bg-white p-2 rounded-xl border border-slate-200/80">
                  {`${window.location.origin}/api/orders/public/${selectedOrder.id}/pdf`}
                </p>
              </div>

              {/* Feedback Message */}
              {sendLinkFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    sendLinkFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {sendLinkFeedback.success ? (
                    <CheckCircle className="h-4 w-4 text-[#14BE99] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{sendLinkFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                disabled={isSendingLink}
                onClick={() => {
                  setIsSendLinkModalOpen(false);
                  setSendLinkFeedback(null);
                }}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSendingLink}
                onClick={handleSendLinkSubmit}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#1661E1] hover:bg-[#1E6EFB] active:scale-[0.99] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingLink ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Enviar link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Prescription Assistant Portal (PiP / Popup) */}
      {isFloatingWindowOpen && pipContainer && createPortal(
        <FloatingPrescriptionWidget
          order={selectedOrder}
          onClose={closeFloatingWindow}
          onFocusMainWindow={() => window.focus()}
          extractedText={selectedOrder ? extractedTextCache[selectedOrder.id] : undefined}
          isExtracting={selectedOrder ? isExtractingCache[selectedOrder.id] : false}
        />,
        pipContainer
      )}

      {/* Confirmation Modal for Order Deletion */}
      <ConfirmDeleteModal
        isOpen={!!orderToDelete}
        onClose={() => {
          if (!isDeletingOrder) setOrderToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeletingOrder}
        title="¿Eliminar Solicitud Médica?"
        description="Esta acción eliminará de forma permanente la solicitud médica seleccionada, sus comprobantes y su historial. Esta acción no se puede deshacer."
        itemSummary={orderToDelete ? {
          id: orderToDelete.id,
          title: `${orderToDelete.patientLastName}, ${orderToDelete.patientName}`,
          subtitle: `DNI: ${orderToDelete.patientDni} • ${orderToDelete.obraSocial}`,
          tag: orderToDelete.status,
          extra: `Fecha: ${new Date(orderToDelete.createdAt).toLocaleDateString('es-AR')}`
        } : undefined}
        confirmLabel="Sí, eliminar solicitud"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
