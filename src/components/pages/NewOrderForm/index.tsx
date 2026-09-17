/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { MedicationItem, MedicationPhoto } from '../../../types';
import { OBRA_SOCIAL_OPTIONS } from '../../../constants/orderStatus';
import Toast from '../../common/Toast';
import { useToast } from '../../../hooks/useToast';
import { CustomDatePicker } from '../../common/CustomDatePicker';
import { 
  ArrowLeft, 
  User, 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle, 
  Upload, 
  ShieldCheck, 
  AlertCircle,
  CreditCard,
  Phone, 
  Mail, 
  Calendar, 
  Sparkles,
  ClipboardPaste,
  Loader2,
  Clock,
  ClipboardCheck,
  Camera,
  Copy
} from 'lucide-react';
import { compressImageAndGetBase64 } from '../../../utils/file';
import { readImagesFromClipboard } from '../../../utils/clipboard';
import { 
  filterPatientOrders, 
  getRepeatableOrderData, 
  getPastOrderDisplaySummary 
} from './orderMethods';

interface NewOrderFormProps {
  currentUser?: any;
  orders?: any[];
  users?: any[];
  onLoadOrderDetails?: (id: string) => Promise<any>;
  onSubmitOrder?: (data: any) => Promise<string>;
  onSuccess: () => void;
  onCancel: () => void;
  currentTenant?: any;
}

export default function NewOrderForm({
  currentUser,
  currentTenant,
  orders = [],
  users = [],
  onLoadOrderDetails,
  onSubmitOrder,
  onSuccess,
  onCancel
}: NewOrderFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    patientDni?: string;
    patientName?: string;
    patientLastName?: string;
    patientBirthDate?: string;
    patientPhone?: string;
    patientEmail?: string;
    selectedObraSocial?: string;
    customObraSocial?: string;
    obraSocialNumber?: string;
    curNombreComercial?: string;
    curCantidadCajas?: string;
    medicationList?: string;
    diagnostic?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{ found: boolean; message: string } | null>(null);

  // Patient Identification Fields
  const [patientDni, setPatientDni] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [patientGender, setPatientGender] = useState<'M' | 'F' | 'X'>('M');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp' | 'both'>('both');
  const [selectedObraSocial, setSelectedObraSocial] = useState('');
  const [customObraSocial, setCustomObraSocial] = useState('');
  const [obraSocialNumber, setObraSocialNumber] = useState('');

  // Medication Loading Method State
  const [medicationMethod, setMedicationMethod] = useState<'past_orders' | 'new_manual' | 'upload_photo'>('new_manual');
  const [selectedPastOrderId, setSelectedPastOrderId] = useState('');
  const [isLoadingPastOrder, setIsLoadingPastOrder] = useState(false);

  // Medication Items State
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  const [curNombreComercial, setCurNombreComercial] = useState('');
  const [curMiligramos, setCurMiligramos] = useState('');
  const [curPresentacion, setCurPresentacion] = useState('Comprimidos');
  const [curCantidadCajas, setCurCantidadCajas] = useState('1');

  // Photo uploads
  const [medicationPhotos, setMedicationPhotos] = useState<MedicationPhoto[]>([]);
  const [isPastingClipboard, setIsPastingClipboard] = useState(false);

  // Clinical & Admin Notes
  const [diagnostic, setDiagnostic] = useState('');
  const [comments, setComments] = useState('');
  const [lastConsultationTime, setLastConsultationTime] = useState('');
  const [lastConsultationDoctor, setLastConsultationDoctor] = useState('');

  // Payment / Registry Details
  const [paymentMethod, setPaymentMethod] = useState<'cash_desk' | 'bonificado' | 'transfer'>('cash_desk');
  const [paymentAmount, setPaymentAmount] = useState(
    currentTenant?.pricePerPrescription ? currentTenant.pricePerPrescription.toString() : '10000'
  );

  const { toast, showToast } = useToast();
  const cartSectionRef = useRef<HTMLDivElement>(null);

  // Derive historical orders belonging to patient by DNI
  const patientOrders = React.useMemo(() => {
    return filterPatientOrders(orders, patientDni);
  }, [orders, patientDni]);

  const lastOrder = React.useMemo(() => {
    return patientOrders.length > 0 ? patientOrders[0] : null;
  }, [patientOrders]);

  const scrollToCart = () => {
    setTimeout(() => {
      if (cartSectionRef.current) {
        cartSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const cartEl = document.getElementById('new-order-medications-panel');
        cartEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Search existing patient by DNI in system records
  const handleSearchPatient = () => {
    const queryDni = patientDni.trim();
    if (!queryDni) {
      setSearchStatus({ found: false, message: 'Por favor ingrese un DNI para buscar.' });
      return;
    }

    const foundOrder = orders.find((o: any) => o.patientDni && o.patientDni.trim() === queryDni);
    const foundUser = users.find((u: any) => u.identifier && u.identifier.trim() === queryDni);

    if (foundOrder || foundUser) {
      const name = foundOrder?.patientName || foundUser?.name || '';
      const lastName = foundOrder?.patientLastName || foundUser?.lastName || '';
      const birthDate = foundOrder?.patientBirthDate || foundUser?.birthDate || '';
      const email = foundOrder?.patientEmail || foundUser?.email || '';
      const phone = foundOrder?.patientPhone || foundUser?.phone || '';
      const gender = foundOrder?.patientGender || foundUser?.gender || 'M';
      const obraSocial = foundOrder?.obraSocial || foundUser?.obraSocial || '';
      const osNumber = foundOrder?.obraSocialNumber || foundUser?.obraSocialNumber || '';

      if (name) setPatientName(name);
      if (lastName) setPatientLastName(lastName);
      if (birthDate) setPatientBirthDate(birthDate);
      if (gender) setPatientGender(gender);
      if (email) setPatientEmail(email);
      if (phone) setPatientPhone(phone);
      if (obraSocial) {
        const matchOs = OBRA_SOCIAL_OPTIONS.find(o => o.name === obraSocial && o.id !== 'otra');
        if (matchOs) {
          setSelectedObraSocial(obraSocial);
          setCustomObraSocial('');
        } else {
          setSelectedObraSocial('Otra Obra Social / Prepaga');
          setCustomObraSocial(obraSocial === 'Otra Obra Social / Prepaga' ? '' : obraSocial);
        }
      }
      if (osNumber) setObraSocialNumber(osNumber);

      const matchingOrders = filterPatientOrders(orders, queryDni);
      const ordersCount = matchingOrders.length;

      setFieldErrors({});
      setSearchStatus({
        found: true,
        message: `Paciente registrado encontrado: ${name} ${lastName}${ordersCount > 0 ? ` (${ordersCount} ${ordersCount === 1 ? 'solicitud previa' : 'solicitudes previas'})` : ''}`
      });

      // Suggest past orders method if historical orders exist and cart is empty
      if (ordersCount > 0 && medicationItems.length === 0 && medicationPhotos.length === 0) {
        setMedicationMethod('past_orders');
      }
    } else {
      setSearchStatus({
        found: false,
        message: `No se registraron datos previos para el DNI ${queryDni}. Puede completar el formulario libremente.`
      });
    }
  };

  // Helper to clone past order data into active form state
  const applyRepeatedOrderData = async (targetOrder: any) => {
    let orderToUse = targetOrder;
    if (orderToUse._isSummary && onLoadOrderDetails) {
      try {
        setIsLoadingPastOrder(true);
        const detailed = await onLoadOrderDetails(orderToUse.id);
        if (detailed) {
          orderToUse = detailed;
        }
      } catch (e) {
        console.warn('Could not load full order details, using summary:', e);
      } finally {
        setIsLoadingPastOrder(false);
      }
    }

    const data = getRepeatableOrderData(orderToUse);
    setMedicationItems(data.medicationItems);
    setMedicationPhotos(data.medicationPhotos);
    if (data.diagnostic) setDiagnostic(data.diagnostic);
    if (data.comments) setComments(data.comments);
    if (data.lastConsultationTime) setLastConsultationTime(data.lastConsultationTime);
    if (data.lastConsultationDoctor) setLastConsultationDoctor(data.lastConsultationDoctor);

    // Clear validation warnings for medication and diagnostic
    setFieldErrors(prev => ({
      ...prev,
      medicationList: undefined,
      diagnostic: undefined,
    }));

    const dateStr = orderToUse.createdAt
      ? new Date(orderToUse.createdAt).toLocaleDateString('es-AR')
      : '';
    showToast(`¡Se cargó la medicación y diagnóstico de la solicitud ${dateStr ? `del ${dateStr}` : 'anterior'}!`);
    scrollToCart();
  };

  const handleRepeatLastOrder = async () => {
    if (!lastOrder) return;
    await applyRepeatedOrderData(lastOrder);
  };

  const handleRepeatPastOrder = async (orderId: string) => {
    const found = patientOrders.find((o: any) => o.id === orderId);
    if (!found) return;
    await applyRepeatedOrderData(found);
  };

  const handleAddMedication = () => {
    setError(null);
    const errors: typeof fieldErrors = {};

    if (!curNombreComercial.trim()) {
      errors.curNombreComercial = 'Ingrese el nombre comercial del medicamento.';
    }
    const count = parseInt(curCantidadCajas) || 1;
    if (count <= 0) {
      errors.curCantidadCajas = 'La cantidad de cajas o envases debe ser mayor a 0.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      return;
    }

    setFieldErrors(prev => ({
      ...prev,
      curNombreComercial: undefined,
      curCantidadCajas: undefined,
      medicationList: undefined
    }));

    const newItem = {
      nombreComercial: curNombreComercial.trim(),
      miligramos: curMiligramos.trim(),
      presentacion: curPresentacion,
      cantidadCajas: count
    };

    setMedicationItems(prev => [
      ...prev,
      newItem
    ]);

    showToast(`¡"${newItem.nombreComercial}" agregado al pedido con éxito!`);
    scrollToCart();

    setCurNombreComercial('');
    setCurMiligramos('');
    setCurPresentacion('Comprimidos');
    setCurCantidadCajas('1');
  };

  const handleRemoveMedication = (index: number) => {
    const item = medicationItems[index];
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
    if (item) {
      showToast(`"${item.nombreComercial}" eliminado del pedido`);
    }
  };

  const processMedicationFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        const base64String = await compressImageAndGetBase64(file);
        const newPhoto: MedicationPhoto = {
          url: base64String,
          name: file.name,
          cantidadCajas: 1,
          unidadesPorCaja: 30,
          diagnostic: '',
          comments: '',
        };
        setMedicationPhotos(prev => [...prev, newPhoto]);
        setFieldErrors(prev => ({ ...prev, medicationList: undefined }));
        showToast(`¡Foto "${file.name}" agregada con éxito!`);
        scrollToCart();
      } catch (err) {
        console.error('Error comprimiendo imagen:', err);
        setError('Error al procesar la imagen de receta.');
        showToast('Error al procesar la imagen.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    void processMedicationFiles(files);
    // Reset file input so selecting same file works
    e.target.value = '';
  };

  const handlePasteFromClipboard = async () => {
    setIsPastingClipboard(true);
    try {
      const result = await readImagesFromClipboard();
      if (!result.success || result.files.length === 0) {
        showToast(`Error: ${result.error || 'No se pudo obtener una imagen del portapapeles.'}`);
        return;
      }
      await processMedicationFiles(result.files);
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'Error al pegar desde el portapapeles.';
      showToast(`Error: ${errorMsg}`);
    } finally {
      setIsPastingClipboard(false);
    }
  };

  const handleUpdatePhotoField = (index: number, field: keyof MedicationPhoto, value: any) => {
    setMedicationPhotos(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: typeof fieldErrors = {};

    const cleanDni = patientDni.trim();
    if (!cleanDni) {
      errors.patientDni = 'El DNI del paciente es obligatorio.';
    } else if (cleanDni.length < 6 || cleanDni.length > 10) {
      errors.patientDni = 'El número de DNI debe contener entre 6 y 10 dígitos.';
    }

    if (!patientName.trim()) {
      errors.patientName = 'El nombre del paciente es obligatorio.';
    }

    if (!patientLastName.trim()) {
      errors.patientLastName = 'El apellido del paciente es obligatorio.';
    }

    if (!patientPhone.trim() || patientPhone.replace(/\D/g, '').length < 8) {
      errors.patientPhone = 'Ingrese un número de WhatsApp / Teléfono válido (mínimo 8 dígitos).';
    }

    if (!patientEmail.trim()) {
      errors.patientEmail = 'El correo electrónico es obligatorio para el despacho.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      errors.patientEmail = 'Ingrese un formato de correo electrónico válido.';
    }

    let finalObraSocial = selectedObraSocial;
    if (!selectedObraSocial) {
      errors.selectedObraSocial = 'Debe seleccionar la obra social o prepaga del paciente.';
    } else if (selectedObraSocial === 'Otra Obra Social / Prepaga') {
      if (!customObraSocial.trim()) {
        errors.customObraSocial = 'Por favor escriba el nombre de la Obra Social / Prepaga.';
      } else {
        finalObraSocial = customObraSocial.trim();
      }
      if (!obraSocialNumber.trim()) {
        errors.obraSocialNumber = 'El número de afiliado es obligatorio para Otra Obra Social / Prepaga.';
      }
    } else {
      const requiresNumber = OBRA_SOCIAL_OPTIONS.find(o => o.name === selectedObraSocial)?.requiresNumber;
      if (requiresNumber && !obraSocialNumber.trim()) {
        errors.obraSocialNumber = `El número de afiliado es obligatorio para ${selectedObraSocial}.`;
      }
    }

    if (medicationItems.length === 0 && medicationPhotos.length === 0) {
      errors.medicationList = 'Debe agregar al menos un medicamento o adjuntar una foto/documento de la receta.';
    }

    if (!diagnostic.trim()) {
      errors.diagnostic = 'El diagnóstico de origen o motivo clínico es obligatorio.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Por favor complete todos los campos obligatorios marcados en rojo.');
      setTimeout(() => {
        document.getElementById('new-order-error-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (!onSubmitOrder) {
        throw new Error('Función de registro no disponible.');
      }

      let summaryText = '';
      if (medicationItems.length > 0) {
        summaryText = medicationItems.map(item => 
          `- ${item.nombreComercial} (${item.miligramos || 'dosis habitual'}), Pres: ${item.presentacion} x ${item.cantidadCajas} caja(s)`
        ).join('\n');
        if (medicationPhotos.length > 0) {
          summaryText += '\n' + medicationPhotos.map((p, idx) => 
            `- Foto/Receta #${idx + 1} (${p.name}): ${p.cantidadCajas || 1} ${(p.cantidadCajas || 1) === 1 ? 'caja' : 'cajas'}${p.unidadesPorCaja ? ` x ${p.unidadesPorCaja} comp./u.` : ''}${p.diagnostic ? ` [Diag: ${p.diagnostic}]` : ''}${p.comments ? ` [Obs: ${p.comments}]` : ''}`
          ).join('\n');
        }
      } else {
        const photoSummaries = medicationPhotos.map((p, idx) => 
          `- Foto/Receta #${idx + 1} (${p.name}): ${p.cantidadCajas || 1} ${(p.cantidadCajas || 1) === 1 ? 'caja' : 'cajas'}${p.unidadesPorCaja ? ` x ${p.unidadesPorCaja} comp./u.` : ''}${p.diagnostic ? ` [Diag: ${p.diagnostic}]` : ''}${p.comments ? ` [Obs: ${p.comments}]` : ''}`
        ).join('\n');
        summaryText = `Carga por Adjunto/Foto (${medicationPhotos.length} archivo(s)):\n${photoSummaries}`;
      }

      const simulatedReceiptSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23eff6ff"/><rect x="30" y="15" width="240" height="170" rx="8" fill="%23ffffff" stroke="%232563eb" stroke-width="2"/><circle cx="150" cy="60" r="22" fill="%23dbeafe"/><path d="M142,60 L148,66 L158,54" fill="none" stroke="%232563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="150" y="110" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e3a8a" text-anchor="middle">CARGA MANUAL DE OFICIO</text><text x="150" y="135" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232563eb" text-anchor="middle">${paymentMethod === 'bonificado' ? 'EXENTO / BONIFICADO' : 'MESA DE ENTRADA'}</text><text x="150" y="160" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">Registrado por Personal Sanitario</text></svg>`;

      await onSubmitOrder({
        patientName: patientName.trim(),
        patientLastName: patientLastName.trim(),
        patientDni: patientDni.trim(),
        patientBirthDate: patientBirthDate || undefined,
        patientGender,
        patientEmail: patientEmail.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        deliveryMethod,
        obraSocial: finalObraSocial,
        obraSocialNumber: obraSocialNumber.trim() || undefined,
        medicationMethod: medicationItems.length > 0 ? 'manual' : 'foto',
        medicationText: summaryText,
        medicationItems,
        medicationPhotos,
        diagnostic: diagnostic.trim(),
        comments: comments.trim() || undefined,
        lastConsultationTime: lastConsultationTime || undefined,
        lastConsultationDoctor: lastConsultationDoctor.trim() || undefined,
        paymentReceiptUrl: simulatedReceiptSvg,
        paymentReceiptName: 'registro_oficio.png',
        paymentMethod,
        paymentAmount: paymentMethod === 'bonificado' ? '0' : paymentAmount,
        paymentStatus: paymentMethod === 'bonificado' ? 'exempt' : 'approved',
        status: 'En revisión',
        consentsAccepted: {
          isOfAge: true,
          termsAccepted: true,
          informedConsentAccepted: true,
          swornStatementAccepted: true,
          acceptedAt: new Date().toISOString(),
          termsVersion: 'v1.2-oficio'
        }
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar la solicitud de oficio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresObraSocialNumber = OBRA_SOCIAL_OPTIONS.find(o => o.name === selectedObraSocial)?.requiresNumber;

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto bg-slate-50/70 p-6 sm:p-8 animate-fadeIn">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Navigation Top Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Pedidos
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1661E1]/10 border border-[#1661E1]/20 rounded-xl text-[#1661E1] text-xs font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Operador: {currentUser?.name || 'Personal Autorizado'}</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-[#0141BC] tracking-tight">Nueva Solicitud de Oficio</h1>
            <p className="text-xs text-slate-500 font-medium">Estructura administrativa de carga directa para personal médico o colaboradores</p>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div id="new-order-error-banner" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          
          {/* SECTION 1: DATOS DEL PACIENTE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0141BC] font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#1661E1]/10 text-[#1661E1] flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span>1. Identificación del Paciente</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Campos obligatorios (*)</span>
            </div>

            {/* DNI Search Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                DNI / Documento del Paciente <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={patientDni}
                    onChange={e => {
                      setPatientDni(e.target.value.replace(/\D/g, ''));
                      if (fieldErrors.patientDni) setFieldErrors(prev => ({ ...prev, patientDni: undefined }));
                    }}
                    placeholder="Ej: 35123456"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all outline-hidden ${
                      fieldErrors.patientDni
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchPatient}
                  className="px-4 py-2.5 bg-[#1661E1] text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#0141BC] transition-all cursor-pointer shadow-xs"
                >
                  <Search className="h-4 w-4" /> Buscar en Base de Datos
                </button>
              </div>
              {fieldErrors.patientDni && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.patientDni}</span>
                </p>
              )}

              {searchStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  searchStatus.found ? 'bg-[#14BE99]/10 text-[#0F6C7D] border border-[#14BE99]/30' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <Sparkles className="h-4 w-4 shrink-0 text-[#14BE99]" />
                  <span>{searchStatus.message}</span>
                </div>
              )}
            </div>

            {/* Main Patient Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => {
                    setPatientName(e.target.value);
                    if (fieldErrors.patientName) setFieldErrors(prev => ({ ...prev, patientName: undefined }));
                  }}
                  placeholder="Ej: María"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-all outline-hidden ${
                    fieldErrors.patientName
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                />
                {fieldErrors.patientName && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.patientName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientLastName}
                  onChange={e => {
                    setPatientLastName(e.target.value);
                    if (fieldErrors.patientLastName) setFieldErrors(prev => ({ ...prev, patientLastName: undefined }));
                  }}
                  placeholder="Ej: Gómez"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-all outline-hidden ${
                    fieldErrors.patientLastName
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                />
                {fieldErrors.patientLastName && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.patientLastName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fecha de Nacimiento</label>
                <CustomDatePicker
                  value={patientBirthDate}
                  onChange={(val) => {
                    setPatientBirthDate(val);
                    if (fieldErrors.patientBirthDate) setFieldErrors(prev => ({ ...prev, patientBirthDate: undefined }));
                  }}
                  maxDate={new Date().toISOString().split('T')[0]}
                  error={fieldErrors.patientBirthDate}
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Sexo Biológico</label>
                <select
                  value={patientGender}
                  onChange={e => setPatientGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10 cursor-pointer"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="X">No binario / Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp / Teléfono Móvil <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => {
                    setPatientPhone(e.target.value);
                    if (fieldErrors.patientPhone) setFieldErrors(prev => ({ ...prev, patientPhone: undefined }));
                  }}
                  placeholder="Ej: 2926442385"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all outline-hidden ${
                    fieldErrors.patientPhone
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                />
                {fieldErrors.patientPhone && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.patientPhone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={e => {
                    setPatientEmail(e.target.value);
                    if (fieldErrors.patientEmail) setFieldErrors(prev => ({ ...prev, patientEmail: undefined }));
                  }}
                  placeholder="ejemplo@correo.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all outline-hidden ${
                    fieldErrors.patientEmail
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                />
                {fieldErrors.patientEmail && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.patientEmail}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Obra Social o Prepaga <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedObraSocial}
                  onChange={e => {
                    setSelectedObraSocial(e.target.value);
                    if (fieldErrors.selectedObraSocial) setFieldErrors(prev => ({ ...prev, selectedObraSocial: undefined }));
                    if (fieldErrors.customObraSocial) setFieldErrors(prev => ({ ...prev, customObraSocial: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs cursor-pointer outline-hidden ${
                    fieldErrors.selectedObraSocial
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                >
                  <option value="">Seleccionar Obra Social</option>
                  {OBRA_SOCIAL_OPTIONS.map(os => (
                    <option key={os.name} value={os.name}>
                      {os.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.selectedObraSocial && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.selectedObraSocial}</span>
                  </p>
                )}
              </div>

              {selectedObraSocial === 'Otra Obra Social / Prepaga' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nombre de la Obra Social / Prepaga <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customObraSocial}
                    onChange={e => {
                      setCustomObraSocial(e.target.value);
                      if (fieldErrors.customObraSocial) setFieldErrors(prev => ({ ...prev, customObraSocial: undefined }));
                    }}
                    placeholder="Escriba el nombre de la obra social o prepaga..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all outline-hidden ${
                      fieldErrors.customObraSocial
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                    }`}
                  />
                  {fieldErrors.customObraSocial && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.customObraSocial}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  N° de Afiliado {requiresObraSocialNumber ? <span className="text-red-500">*</span> : '(Opcional)'}
                </label>
                <input
                  type="text"
                  value={obraSocialNumber}
                  onChange={e => {
                    setObraSocialNumber(e.target.value);
                    if (fieldErrors.obraSocialNumber) setFieldErrors(prev => ({ ...prev, obraSocialNumber: undefined }));
                  }}
                  placeholder="Ej: 210-48912345/00"
                  disabled={!requiresObraSocialNumber}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all outline-hidden disabled:bg-slate-100 disabled:text-slate-400 ${
                    fieldErrors.obraSocialNumber
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                  }`}
                />
                {fieldErrors.obraSocialNumber && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.obraSocialNumber}</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Preferencia de Despacho de la Receta</label>
                <select
                  value={deliveryMethod}
                  onChange={e => setDeliveryMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10 cursor-pointer"
                >
                  <option value="email">Por Correo Electrónico (PDF)</option>
                  <option value="whatsapp">Por WhatsApp</option>
                  <option value="both">Por Ambos Canales</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: MEDICACIÓN Y DIAGNÓSTICO */}
          <div 
            ref={cartSectionRef}
            id="new-order-medications-panel"
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5 scroll-mt-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0141BC] font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#1661E1]/10 text-[#1661E1] flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span>2. Medicación Crónica y Diagnóstico</span>
              </div>
            </div>

            {/* Input Method Toggle Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Método de Carga <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* A. Últimas Solicitudes */}
                <button
                  id="btn-method-past-orders"
                  type="button"
                  aria-label="Últimas solicitudes"
                  aria-pressed={medicationMethod === 'past_orders'}
                  onClick={() => setMedicationMethod('past_orders')}
                  className={`group min-w-0 py-3 px-3 rounded-xl sm:rounded-2xl border font-bold text-xs flex flex-row sm:flex-col items-center sm:justify-center text-left sm:text-center gap-2 sm:gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    medicationMethod === 'past_orders'
                      ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/20 shadow-[0_8px_20px_rgba(79,70,229,0.24)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-indigo-900 hover:border-indigo-200 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 ${
                    medicationMethod === 'past_orders'
                      ? 'bg-indigo-800 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                  }`}>
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[12px] block">
                      Últimas Solicitudes {patientOrders.length > 0 && <span className="opacity-90">({patientOrders.length})</span>}
                    </span>
                    <span className={`text-[10px] font-medium block ${medicationMethod === 'past_orders' ? 'text-indigo-100' : 'text-slate-500'}`}>
                      Repetir pedido previo
                    </span>
                  </div>
                </button>

                {/* B. Nueva Carga Manual */}
                <button
                  id="btn-method-new-manual"
                  type="button"
                  aria-label="Nueva carga manual"
                  aria-pressed={medicationMethod === 'new_manual'}
                  onClick={() => setMedicationMethod('new_manual')}
                  className={`group min-w-0 py-3 px-3 rounded-xl sm:rounded-2xl border font-bold text-xs flex flex-row sm:flex-col items-center sm:justify-center text-left sm:text-center gap-2 sm:gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    medicationMethod === 'new_manual'
                      ? 'border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/20 shadow-[0_8px_20px_rgba(5,150,105,0.22)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-emerald-900 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 ${
                    medicationMethod === 'new_manual'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                  }`}>
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[12px] block">Nueva Carga Manual</span>
                    <span className={`text-[10px] font-medium block ${medicationMethod === 'new_manual' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Escribir medicamentos
                    </span>
                  </div>
                </button>

                {/* C. Adjuntar Foto / Receta */}
                <button
                  id="btn-method-upload-photo"
                  type="button"
                  aria-label="Adjuntar foto o receta"
                  aria-pressed={medicationMethod === 'upload_photo'}
                  onClick={() => setMedicationMethod('upload_photo')}
                  className={`group min-w-0 py-3 px-3 rounded-xl sm:rounded-2xl border font-bold text-xs flex flex-row sm:flex-col items-center sm:justify-center text-left sm:text-center gap-2 sm:gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    medicationMethod === 'upload_photo'
                      ? 'border-[#1661E1] bg-[#1661E1] text-white ring-2 ring-[#1661E1]/20 shadow-[0_8px_20px_rgba(22,97,225,0.24)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-[#0141BC] hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 ${
                    medicationMethod === 'upload_photo'
                      ? 'bg-[#0141BC] text-white shadow-xs'
                      : 'bg-blue-50 text-[#1661E1] group-hover:bg-blue-100'
                  }`}>
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[12px] block">Adjuntar Foto / Receta</span>
                    <span className={`text-[10px] font-medium block ${medicationMethod === 'upload_photo' ? 'text-blue-100' : 'text-slate-500'}`}>
                      Foto de envase o receta
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* METHOD PANEL A: PAST ORDERS (ÚLTIMAS SOLICITUDES) */}
            {medicationMethod === 'past_orders' && (
              <div className="space-y-4 animate-fadeIn">
                {!patientDni.trim() ? (
                  <div className="bg-slate-50 p-6 text-center text-xs text-slate-500 font-medium rounded-2xl border border-slate-200 space-y-2">
                    <Clock className="h-7 w-7 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">Consulte las solicitudes anteriores ingresando el DNI del paciente</p>
                    <p className="text-[11px] text-slate-500">Ingrese el número de DNI en la sección 1 para buscar automáticamente su historial clínico y repetir pedidos previos.</p>
                  </div>
                ) : patientOrders.length === 0 ? (
                  <div className="bg-amber-50/70 p-6 text-center text-xs text-amber-800 font-medium rounded-2xl border border-amber-200/80 space-y-2.5">
                    <AlertCircle className="h-7 w-7 text-amber-500 mx-auto" />
                    <p className="font-bold text-amber-900">
                      No se encontraron solicitudes anteriores asociadas al DNI {patientDni}.
                    </p>
                    <p className="text-[11px] text-amber-700 max-w-md mx-auto">
                      Este paciente no registra pedidos previos en el sistema. Puede utilizar{' '}
                      <button
                        type="button"
                        onClick={() => setMedicationMethod('new_manual')}
                        className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                      >
                        Nueva Carga Manual
                      </button>{' '}
                      para ingresar los medicamentos o{' '}
                      <button
                        type="button"
                        onClick={() => setMedicationMethod('upload_photo')}
                        className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                      >
                        Adjuntar Foto / Receta
                      </button>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* A1. Repetir último pedido completo (Prominent Card) */}
                    {lastOrder && (
                      <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/60 border border-indigo-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Clock className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-indigo-950">Última Solicitud Registrada</h4>
                                {lastOrder.status && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                                    {lastOrder.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold">
                                Fecha:{' '}
                                {new Date(lastOrder.createdAt).toLocaleDateString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}{' '}
                                hs
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isLoadingPastOrder}
                            onClick={handleRepeatLastOrder}
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isLoadingPastOrder ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>Repetir Último Pedido Completo</span>
                          </button>
                        </div>

                        <div className="bg-white/90 rounded-xl p-4 text-xs space-y-2.5 border border-indigo-100">
                          <div>
                            <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wide">Diagnóstico de Tratamiento:</span>
                            <span className="font-semibold text-slate-800">{lastOrder.diagnostic || 'Sin diagnóstico especificado'}</span>
                          </div>

                          <div>
                            <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wide">Medicamentos:</span>
                            {lastOrder.medicationItems && lastOrder.medicationItems.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-slate-800 mt-1 font-medium">
                                {lastOrder.medicationItems.map((item: any, i: number) => (
                                  <li key={i}>
                                    <strong>{item.nombreComercial}</strong> {item.miligramos && `(${item.miligramos})`} - {item.presentacion || 'Comprimidos'} x {item.cantidadCajas || 1} {(item.cantidadCajas || 1) === 1 ? 'caja' : 'cajas'}
                                  </li>
                                ))}
                              </ul>
                            ) : lastOrder.medicationPhotos && lastOrder.medicationPhotos.length > 0 ? (
                              <span className="text-slate-800 font-semibold flex items-center gap-1.5 mt-1">
                                <Camera className="h-3.5 w-3.5 text-blue-500" />
                                Cargado mediante {lastOrder.medicationPhotos.length} foto(s) de envase o receta
                              </span>
                            ) : (
                              <span className="text-slate-500 italic mt-1 block">Sin medicamentos desglosados</span>
                            )}
                          </div>

                          {lastOrder.comments && (
                            <div>
                              <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wide">Observaciones / Notas:</span>
                              <span className="font-medium text-slate-700 italic">"{lastOrder.comments}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* A2. Selector para solicitudes anteriores adicionales */}
                    {patientOrders.length > 1 && (
                      <div className="bg-slate-50 p-4 border border-slate-200/80 rounded-2xl space-y-3">
                        <label htmlFor="past-order-select" className="block text-xs font-bold text-slate-700 uppercase">
                          Otras Solicitudes Previas del Paciente
                        </label>
                        <select
                          id="past-order-select"
                          value={selectedPastOrderId}
                          onChange={e => setSelectedPastOrderId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 cursor-pointer focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10 outline-none"
                        >
                          <option value="">Seleccione otra solicitud previa para ver detalles...</option>
                          {patientOrders.slice(1).map((order: any) => (
                            <option key={order.id} value={order.id}>
                              {getPastOrderDisplaySummary(order)}
                            </option>
                          ))}
                        </select>

                        {selectedPastOrderId && (() => {
                          const selectedOrder = patientOrders.find((o: any) => o.id === selectedPastOrderId);
                          if (!selectedOrder) return null;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-slate-700">Detalles de la Solicitud Seleccionada</span>
                                <button
                                  type="button"
                                  disabled={isLoadingPastOrder}
                                  onClick={() => handleRepeatPastOrder(selectedPastOrderId)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isLoadingPastOrder ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  <span>Repetir esta solicitud</span>
                                </button>
                              </div>

                              <div className="text-xs space-y-1.5">
                                <div>
                                  <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wide">Diagnóstico:</span>
                                  <span className="text-slate-800 font-semibold">{selectedOrder.diagnostic || 'Sin diagnóstico'}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wide">Medicamentos:</span>
                                  {selectedOrder.medicationItems && selectedOrder.medicationItems.length > 0 ? (
                                    <ul className="list-disc pl-4 space-y-0.5 text-slate-800 mt-0.5">
                                      {selectedOrder.medicationItems.map((item: any, i: number) => (
                                        <li key={i}>
                                          <strong>{item.nombreComercial}</strong> {item.miligramos && `(${item.miligramos})`} - {item.cantidadCajas || 1} cj.
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-slate-500 italic mt-0.5 block">Cargado mediante fotos o archivo</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* METHOD PANEL B: NUEVA CARGA MANUAL */}
            {medicationMethod === 'new_manual' && (
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-3 animate-fadeIn">
                <span className="block text-xs font-bold text-slate-800">
                  Ingresar Medicamento al Pedido <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={curNombreComercial}
                      onChange={e => {
                        setCurNombreComercial(e.target.value);
                        if (fieldErrors.curNombreComercial) setFieldErrors(prev => ({ ...prev, curNombreComercial: undefined }));
                      }}
                      placeholder="Nombre comercial o droga (Ej: Losartán) *"
                      className={`w-full px-3 py-2 rounded-lg text-xs transition-all outline-hidden ${
                        fieldErrors.curNombreComercial
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                      }`}
                    />
                    {fieldErrors.curNombreComercial && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.curNombreComercial}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={curMiligramos}
                      onChange={e => setCurMiligramos(e.target.value)}
                      placeholder="Dosis (Ej: 50mg)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10"
                    />
                  </div>
                  <div>
                    <select
                      value={curPresentacion}
                      onChange={e => setCurPresentacion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10 cursor-pointer"
                    >
                      <option value="Comprimidos">Comprimidos</option>
                      <option value="Cápsulas">Cápsulas</option>
                      <option value="Gotas / Jarabe">Gotas / Jarabe</option>
                      <option value="Inyectable / Pluma">Inyectable / Pluma</option>
                      <option value="Inhalador">Inhalador</option>
                      <option value="Crema / Gel">Crema / Gel</option>
                      <option value="Sobres">Sobres</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Cantidad de cajas o envases :</span>
                    <select
                      value={curCantidadCajas}
                      onChange={e => {
                        setCurCantidadCajas(e.target.value);
                        if (fieldErrors.curCantidadCajas) setFieldErrors(prev => ({ ...prev, curCantidadCajas: undefined }));
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-[#1661E1] cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'caja' : 'cajas'}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.curCantidadCajas && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{fieldErrors.curCantidadCajas}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" /> Añadir Medicamento
                  </button>
                </div>
              </div>
            )}

            {/* METHOD PANEL C: ADJUNTAR FOTO / RECETA */}
            {medicationMethod === 'upload_photo' && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3.5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Adjuntar Foto de Receta Anterior o Envase
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Formatos admitidos: JPG, PNG, HEIC, PDF. Puede seleccionar múltiples archivos.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    disabled={isPastingClipboard}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-100 text-[#1661E1] hover:text-[#0141BC] border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                    title="Pegar imagen copiada previamente en el portapapeles"
                  >
                    {isPastingClipboard ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1661E1]" />
                    ) : (
                      <ClipboardPaste className="h-3.5 w-3.5 text-[#1661E1]" />
                    )}
                    <span>{isPastingClipboard ? 'Pegando...' : 'Pegar desde portapapeles'}</span>
                  </button>
                </div>

                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1661E1] file:text-white hover:file:bg-[#0141BC] cursor-pointer bg-white p-2.5 rounded-xl border border-blue-200/80"
                />
              </div>
            )}

            {/* PERMANENT ORDER CART / RESUMEN DE MEDICACIÓN EN EL PEDIDO */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Medicamentos y Recetas en el Pedido ({medicationItems.length + medicationPhotos.length})
                  </span>
                  <span className="text-red-500 font-bold text-xs">*</span>
                </div>
              </div>

              {fieldErrors.medicationList && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold animate-fadeIn">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{fieldErrors.medicationList}</span>
                </div>
              )}

              {medicationItems.length === 0 && medicationPhotos.length === 0 ? (
                <div className="py-5 px-4 text-center text-xs text-slate-400 font-medium bg-slate-50/70 rounded-xl border border-dashed border-slate-250">
                  El pedido aún no tiene medicamentos agregados. Seleccione un <strong>Método de Carga</strong> arriba para añadir medicamentos o recetas.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Manual items list */}
                  {medicationItems.length > 0 && (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {medicationItems.map((item, idx) => (
                        <div key={`item-${idx}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                          <div>
                            <p className="text-xs font-bold text-[#0141BC]">
                              {item.nombreComercial} {item.miligramos && <span className="text-[#1661E1]">({item.miligramos})</span>}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.presentacion} • Cantidad: {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Quitar medicamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached photos list */}
                  {medicationPhotos.length > 0 && (
                    <div className="space-y-2.5">
                      {medicationPhotos.map((photo, idx) => (
                        <div key={`photo-${idx}`} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-blue-700 font-bold">
                                {photo.url && photo.url.startsWith('data:image') ? (
                                  <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[10px]">DOC</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 truncate block max-w-[200px] sm:max-w-xs">{photo.name}</span>
                                <span className="text-[10px] text-slate-400">Receta / Envase adjunto</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setMedicationPhotos(prev => prev.filter((_, i) => i !== idx));
                                showToast(`"${photo.name}" eliminada del pedido`);
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Quitar adjunto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cantidad de Cajas</label>
                              <select
                                value={photo.cantidadCajas || 1}
                                onChange={e => handleUpdatePhotoField(idx, 'cantidadCajas', parseInt(e.target.value) || 1)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                  <option key={num} value={num}>
                                    {num} {num === 1 ? 'caja' : 'cajas'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Cantidad de Comprimidos</label>
                              <input
                                type="number"
                                min="1"
                                value={photo.unidadesPorCaja !== undefined ? photo.unidadesPorCaja : 30}
                                onChange={e => handleUpdatePhotoField(idx, 'unidadesPorCaja', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="30"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Diagnóstico o Motivo</label>
                              <input
                                type="text"
                                value={photo.diagnostic || ''}
                                onChange={e => handleUpdatePhotoField(idx, 'diagnostic', e.target.value)}
                                placeholder="Ej. Hipertensión arterial..."
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Comentarios / Aclaraciones</label>
                              <input
                                type="text"
                                value={photo.comments || ''}
                                onChange={e => handleUpdatePhotoField(idx, 'comments', e.target.value)}
                                placeholder="Ej. Tomo 1 por día..."
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mandatory Diagnostic Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Diagnóstico de Origen / Motivo Clínico <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={diagnostic}
                onChange={e => {
                  setDiagnostic(e.target.value);
                  if (fieldErrors.diagnostic) setFieldErrors(prev => ({ ...prev, diagnostic: undefined }));
                }}
                placeholder="Ej: Hipertensión arterial esencial / Diabetes Tipo 2"
                className={`w-full p-3 rounded-xl text-xs transition-all outline-hidden ${
                  fieldErrors.diagnostic
                    ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                    : 'bg-white border border-slate-300 focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10'
                }`}
              />
              {fieldErrors.diagnostic && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.diagnostic}</span>
                </p>
              )}
            </div>

            {/* Optional Doctor Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Observaciones o Notas Internas (Opcional)</label>
              <input
                type="text"
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Aclaraciones para la auditoría o indicaciones de la caja"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10"
              />
            </div>
          </div>

          {/* SECTION 3: REGISTRO ADMINISTRATIVO Y PAGO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#0141BC] font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#1661E1]/10 text-[#1661E1] flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>3. Registro de Cobro</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Modalidad de Cobro</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10 cursor-pointer"
                >
                  <option value="cash_desk">Cobrado en Caja / Mesa de Entrada</option>
                  <option value="transfer">Transferencia Bancaria</option>
                  <option value="bonificado">Exento / Bonificado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Monto Registrado ($ ARS)</label>
                <input
                  type="number"
                  value={paymentMethod === 'bonificado' ? '0' : paymentAmount}
                  disabled={paymentMethod === 'bonificado'}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-[#1661E1] focus:ring-2 focus:ring-[#1661E1]/10"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-[#1661E1] hover:bg-[#0141BC] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando solicitud...</span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Cargar solicitud
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Toast Notification */}
      <Toast message={toast} position="bottom-right" />
    </div>
  );
}
