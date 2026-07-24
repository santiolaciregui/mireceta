/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OBRA_SOCIAL_OPTIONS, MedicationItem } from '../types';
import { 
  User, 
  FileText, 
  CreditCard, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  HeartHandshake,
  Plus,
  Trash2,
  Mail,
  Phone,
  Calendar,
  ClipboardCheck,
  Info,
  ShieldAlert,
  Sparkles,
  Camera,
  Download,
  Clock,
  CheckCircle2,
  Edit3,
  Lock,
  Unlock,
  Copy
} from 'lucide-react';

interface PatientFormProps {
  onSubmitOrder: (data: any) => Promise<string>;
  onSuccess: (orderId: string) => void;
  recentDni: string;
  onSetDni: (dni: string) => void;
  initialName?: string;
  initialLastName?: string;
  orders?: any[];
  currentUser?: any;
  isOficio?: boolean;
}

const BANK_DETAILS = {
  cbu: '0140305101300005522431',
  alias: 'receta.facil.suarez',
  titular: 'Plataforma Mi Receta Online',
};

export default function PatientForm({
  onSubmitOrder,
  onSuccess,
  recentDni,
  onSetDni,
  initialName = '',
  initialLastName = '',
  orders = [],
  currentUser,
  isOficio = false,
}: PatientFormProps) {
  // Wizard steps: 'info' -> 'identification' -> 'medication' -> 'payment' -> 'confirmation'
  const [step, setStep] = useState<'info' | 'identification' | 'medication' | 'payment' | 'confirmation'>('info');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);


  // --- Step 1 Fields: Identification ---
  const [patientDni, setPatientDni] = useState(recentDni);
  const [patientName, setPatientName] = useState(initialName);
  const [patientLastName, setPatientLastName] = useState(initialLastName);
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [selectedObraSocial, setSelectedObraSocial] = useState('');
  const [obraSocialNumber, setObraSocialNumber] = useState('');

  // --- Step 2 Fields: Medication ---
  const [medicationMethod, setMedicationMethod] = useState<'new_manual' | 'past_orders'>('new_manual');
  const [selectedPastOrderId, setSelectedPastOrderId] = useState<string>('');
  
  // A. Manual Carga
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  // Manual Current Input Fields
  const [curNombreComercial, setCurNombreComercial] = useState('');
  const [curDroga, setCurDroga] = useState('');
  const [curMiligramos, setCurMiligramos] = useState('');
  const [curPresentacion, setCurPresentacion] = useState('Comprimidos');
  const [curUnidadesPorCaja, setCurUnidadesPorCaja] = useState('30');
  const [curCantidadCajas, setCurCantidadCajas] = useState('1');

  // B. Photo Carga
  const [medicationPhotos, setMedicationPhotos] = useState<{ url: string; name: string }[]>([]);
  
  // Mandatory Diagnosis
  const [diagnostic, setDiagnostic] = useState('');
  // Optional Comments
  const [comments, setComments] = useState('');

  // Chronic Renewal Questions
  const [lastConsultationTime, setLastConsultationTime] = useState('');
  const [lastConsultationDoctor, setLastConsultationDoctor] = useState('');

  // --- Step 3 Fields: Consents & Terms ---
  const [consentAge, setConsentAge] = useState(true);
  const [consentTerms, setConsentTerms] = useState(true);
  const [consentInformed, setConsentInformed] = useState(true);
  const [consentSworn, setConsentSworn] = useState(true);
  const TERMS_VERSION = 'v1.2';

  // --- Step 4 Fields: Payment ---
  const [paymentMethod, setPaymentMethod] = useState<'mp' | 'transfer'>('mp');
  const [paymentAmount, setPaymentAmount] = useState('10000');
  
  // Transfer Details
  const [paymentReceipt, setPaymentReceipt] = useState<{ url: string; name: string } | null>(null);
  
  // Mercado Pago Card Details
  const [mpCardNumber, setMpCardNumber] = useState('');
  const [mpCardHolder, setMpCardHolder] = useState('');
  const [mpCardExpiry, setMpCardExpiry] = useState('');
  const [mpCardCvv, setMpCardCvv] = useState('');
  const [mpPaymentApproved, setMpPaymentApproved] = useState(false);
  const [mpProcessing, setMpProcessing] = useState(false);
  const [mpTransactionId, setMpTransactionId] = useState('');

  // Synchronize initialName and initialLastName when props update (only if not isOficio and patient)
  useEffect(() => {
    if (!isOficio && (!currentUser || currentUser.role === 'paciente')) {
      if (initialName && !patientName) setPatientName(initialName);
      if (initialLastName && !patientLastName) setPatientLastName(initialLastName);
    }
  }, [initialName, initialLastName, isOficio, currentUser]);

  // Synchronize recentDni when props update
  useEffect(() => {
    if (!isOficio && recentDni && !patientDni) setPatientDni(recentDni);
  }, [recentDni, isOficio]);

  // Find all orders of the patient sorted by date
  const patientOrders = React.useMemo(() => {
    if (!orders || orders.length === 0 || !patientDni) return [];
    return orders
      .filter((o: any) => o.patientDni && o.patientDni.trim() === patientDni.trim())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, patientDni]);

  // Find the last order of the patient
  const lastOrder = React.useMemo(() => {
    if (patientOrders.length === 0) return null;
    return patientOrders[0];
  }, [patientOrders]);

  // Prefill from lastOrder or currentUser (only for patient role)
  useEffect(() => {
    if (currentUser && currentUser.role === 'paciente' && !isOficio) {
      if (!patientName && currentUser.name) {
        setPatientName(currentUser.name);
      }
      if (!patientLastName && currentUser.lastName) {
        setPatientLastName(currentUser.lastName);
      }
      if (!patientDni && currentUser.identifier) {
        setPatientDni(currentUser.identifier);
      }
      if (!patientBirthDate && currentUser.birthDate) {
        setPatientBirthDate(currentUser.birthDate);
      }
      if (!patientPhone && currentUser.phone) {
        setPatientPhone(currentUser.phone);
      }
      if (!selectedObraSocial && currentUser.obraSocial) {
        setSelectedObraSocial(currentUser.obraSocial);
      }
      if (!obraSocialNumber && currentUser.obraSocialNumber) {
        setObraSocialNumber(currentUser.obraSocialNumber);
      }
      if (!patientEmail && currentUser.email) {
        setPatientEmail(currentUser.email);
      }
    }

    if (lastOrder) {
      if (!patientBirthDate && lastOrder.patientBirthDate) {
        setPatientBirthDate(lastOrder.patientBirthDate);
      }
      if (!patientEmail && lastOrder.patientEmail) {
        setPatientEmail(lastOrder.patientEmail);
      }
      if (!patientPhone && lastOrder.patientPhone) {
        setPatientPhone(lastOrder.patientPhone);
      }
      if (!deliveryMethod && lastOrder.deliveryMethod) {
        setDeliveryMethod(lastOrder.deliveryMethod);
      }
      if (!selectedObraSocial && lastOrder.obraSocial) {
        setSelectedObraSocial(lastOrder.obraSocial);
      }
      if (!obraSocialNumber && lastOrder.obraSocialNumber) {
        setObraSocialNumber(lastOrder.obraSocialNumber);
      }
    }
  }, [lastOrder, currentUser]);

  useEffect(() => {
    if (patientOrders && patientOrders.length > 0) {
      setMedicationMethod('past_orders');
    }
  }, [patientOrders.length]);

  const handleRepeatLastOrder = () => {
    if (!lastOrder) return;
    setMedicationMethod('new_manual');
    if (lastOrder.medicationItems) {
      setMedicationItems(JSON.parse(JSON.stringify(lastOrder.medicationItems)));
    } else {
      setMedicationItems([]);
    }
    if (lastOrder.medicationPhotos) {
      setMedicationPhotos(JSON.parse(JSON.stringify(lastOrder.medicationPhotos)));
    } else {
      setMedicationPhotos([]);
    }
    setDiagnostic(lastOrder.diagnostic || '');
    setComments(lastOrder.comments || '');
    setLastConsultationTime(lastOrder.lastConsultationTime || '');
    setLastConsultationDoctor(lastOrder.lastConsultationDoctor || '');
    
    setNotificationMsg('¡Se copiaron con éxito todos los medicamentos, el diagnóstico que dio origen al tratamiento y los comentarios adicionales de su última solicitud al Carrito!');
    setTimeout(() => {
      setNotificationMsg(null);
    }, 6000);
  };

  const handleRepeatPastOrder = (orderId: string) => {
    const order = patientOrders.find((o: any) => o.id === orderId);
    if (!order) return;
    setMedicationMethod('new_manual');
    if (order.medicationItems) {
      setMedicationItems(JSON.parse(JSON.stringify(order.medicationItems)));
    } else {
      setMedicationItems([]);
    }
    if (order.medicationPhotos) {
      setMedicationPhotos(JSON.parse(JSON.stringify(order.medicationPhotos)));
    } else {
      setMedicationPhotos([]);
    }
    setDiagnostic(order.diagnostic || '');
    setComments(order.comments || '');
    setLastConsultationTime(order.lastConsultationTime || '');
    setLastConsultationDoctor(order.lastConsultationDoctor || '');
    
    setNotificationMsg(`¡Se copiaron con éxito todos los medicamentos, el diagnóstico que dio origen al tratamiento y los comentarios adicionales de la solicitud del ${new Date(order.createdAt).toLocaleDateString('es-AR')} al Carrito!`);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 6000);
  };

  // Calculate costs based on medications count and PAMI exemption
  useEffect(() => {
    if (selectedObraSocial === 'PAMI (Inssjp)') {
      setPaymentAmount('0');
    } else {
      const itemsCount = medicationItems.length;
      const photosCount = medicationPhotos.length;
      const count = (itemsCount + photosCount) > 0 ? (itemsCount + photosCount) : 1;
      
      const calculated = Math.max(1, Math.ceil(count / 2)) * 10000;
      setPaymentAmount(calculated.toString());
    }
  }, [selectedObraSocial, medicationItems.length, medicationPhotos.length]);

  // --- Age calculation helper ---
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // --- File Conversion and drag & drop handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'medication' | 'payment') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (target === 'medication') {
          setMedicationPhotos(prev => [...prev, { url: base64String, name: file.name }]);
        } else {
          setPaymentReceipt({ url: base64String, name: file.name });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadMockReceipt = () => {
    // Generate simulated homebanking screenshot
    setPaymentReceipt({
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f0fdf4"/><text x="150" y="80" font-family="monospace" font-size="12" fill="%2315803d" font-weight="bold" text-anchor="middle">TRANSFERENCIA EXITOSA</text><text x="150" y="110" font-family="monospace" font-size="10" fill="%23166534" text-anchor="middle">ID: BANCO-987452-ARS</text><text x="150" y="130" font-family="monospace" font-size="9" fill="%234b5563" text-anchor="middle">CBU: ...5522431</text></svg>',
      name: 'Simulacion_Transferencia_Homebanking.png'
    });
    setError(null);
  };

  // --- Action Handlers ---

  const validateStep1 = (): boolean => {
    setError(null);
    if (!patientDni.trim()) {
      setError('El número de DNI es obligatorio.');
      return false;
    }
    if (!patientName.trim() || !patientLastName.trim()) {
      setError('El nombre y el apellido son obligatorios.');
      return false;
    }
    if (!patientBirthDate) {
      setError('La fecha de nacimiento es obligatoria.');
      return false;
    }
    const age = calculateAge(patientBirthDate);
    if (age < 18) {
      setError('Debe ser mayor de edad (18 años o más) para realizar la solicitud.');
      return false;
    }
    // Email is optional, but if entered, validate it
    if (patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
      setError('Por favor ingrese un correo electrónico válido o déjelo en blanco.');
      return false;
    }
    if (!patientPhone.trim() || patientPhone.replace(/\D/g, '').length < 8) {
      setError('Por favor ingrese un número de WhatsApp / Celular válido.');
      return false;
    }
    if (!selectedObraSocial) {
      setError('Debe seleccionar su cobertura médica u obra social.');
      return false;
    }
    return true;
  };

  const goToMedication = () => {
    if (validateStep1()) {
      setStep('medication');
    }
  };

  const addManualMedication = () => {
    setError(null);
    if (!curNombreComercial.trim()) {
      setError('Ingrese el nombre comercial del medicamento.');
      return;
    }
    if (!curCantidadCajas || parseInt(curCantidadCajas) <= 0) {
      setError('Ingrese una cantidad de cajas válida.');
      return;
    }

    const newItem: MedicationItem = {
      nombreComercial: curNombreComercial.trim(),
      miligramos: curMiligramos.trim(),
      presentacion: curPresentacion,
      cantidadCajas: parseInt(curCantidadCajas) || 1,
    };

    setMedicationItems(prev => [...prev, newItem]);
    
    // Clear inputs
    setCurNombreComercial('');
    setCurMiligramos('');
    setCurPresentacion('Comprimidos');
    setCurCantidadCajas('1');
  };

  const removeMedicationItem = (index: number) => {
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep2 = (): boolean => {
    setError(null);
    if (medicationMethod === 'new_manual') {
      if (medicationItems.length === 0 && medicationPhotos.length === 0) {
        setError('Debe cargar al menos un medicamento en su carrito o subir una foto de su envase o receta anterior para continuar.');
        return false;
      }
    } else {
      // past_orders: must have copied an order
      if (medicationItems.length === 0 && medicationPhotos.length === 0) {
        setError('Debe elegir una de sus solicitudes anteriores y hacer clic en "Repetir" para copiar la medicación y continuar.');
        return false;
      }
    }

    return true;
  };

  const goToPayment = () => {
    if (validateStep2()) {
      isOficio ? setStep('confirmation') : isOficio ? setStep('confirmation') : setStep('payment');
    }
  };

  // --- Simulated Mercado Pago Sandbox Purchase ---
  const handleFillSandboxCard = () => {
    setMpCardNumber('4509 9500 1284 3915');
    setMpCardHolder((patientName + ' ' + patientLastName).toUpperCase());
    setMpCardExpiry('11/29');
    setMpCardCvv('721');
    setError(null);
  };

  const processMercadoPagoPayment = async () => {
    setError(null);
    
    // If PAMI, no payment is required!
    if (selectedObraSocial === 'PAMI (Inssjp)') {
      setMpPaymentApproved(true);
      setMpTransactionId('MP-PAMI-BONIFICADO');
      return;
    }

    setMpProcessing(true);

    try {
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          patientName: `${patientName} ${patientLastName}`,
          patientEmail: patientEmail,
          patientDni: patientDni,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con Mercado Pago');
      }

      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        throw new Error('No se pudo generar el enlace de cobro oficial.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con Mercado Pago');
    } finally {
      setMpProcessing(false);
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final checks
    if (selectedObraSocial !== 'PAMI (Inssjp)') {
      if (paymentMethod === 'mp' && !mpPaymentApproved) {
        setError('Debe completar el pago mediante Mercado Pago para poder enviar la solicitud.');
        return;
      }
      if (paymentMethod === 'transfer' && !paymentReceipt) {
        setError('Debe subir el comprobante de transferencia bancaria para poder enviar la solicitud.');
        return;
      }
    }

    setSubmitting(true);

    // Build human readable medication summary
    const mappedMedicationMethod = medicationItems.length > 0 ? 'manual' : 'foto';
    let summaryText = '';
    if (medicationItems.length > 0) {
      summaryText = medicationItems.map(item => 
        `- ${item.nombreComercial} (${item.droga} ${item.miligramos}), Pres: ${item.presentacion}, ${item.unidadesPorCaja} u/caja x ${item.cantidadCajas} cajas`
      ).join('\n');
      if (medicationPhotos.length > 0) {
        summaryText += `\n- Fotos de envases adjuntas: ${medicationPhotos.length} archivos.`;
      }
    } else {
      summaryText = `Carga por Foto (${medicationPhotos.length} adjuntos). Medicamentos visibles en el archivo adjunto.`;
    }

    // Build full order object mapping to backend fields
    const fullOrderPayload = {
      patientName: patientName.trim(),
      patientLastName: patientLastName.trim(),
      patientDni: patientDni.trim(),
      patientBirthDate,
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      deliveryMethod,
      obraSocial: selectedObraSocial,
      obraSocialNumber: obraSocialNumber.trim() || undefined,
      medicationMethod: mappedMedicationMethod,
      medicationText: summaryText,
      medicationItems,
      diagnostic: diagnostic.trim(),
      comments: comments.trim() || undefined,
      medicationPhotos,
      medicationPhotoUrl: medicationPhotos.length > 0 ? medicationPhotos[0].url : null,
      medicationPhotoName: medicationPhotos.length > 0 ? medicationPhotos[0].name : null,
      
      // Payment details
      paymentReceiptUrl: paymentReceipt ? paymentReceipt.url : null,
      paymentReceiptName: paymentReceipt ? paymentReceipt.name : null,
      paymentAmount,
      paymentDate: new Date().toISOString(),
      paymentId: paymentMethod === 'mp' ? mpTransactionId : `TRANS-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentStatus: 'approved', // automatic sandbox approval

      // Chronics
      lastConsultationTime: lastConsultationTime || undefined,
      lastConsultationDoctor: lastConsultationDoctor || undefined,

      // Consents audit
      consentsAccepted: {
        isOfAge: consentAge,
        termsAccepted: consentTerms,
        informedConsentAccepted: consentInformed,
        swornStatementAccepted: consentSworn,
        acceptedAt: new Date().toISOString(),
        termsVersion: TERMS_VERSION
      }
    };

    try {
      const orderId = await onSubmitOrder(fullOrderPayload);
      setCreatedOrderId(orderId);
      setStep('confirmation');
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Confirmation View ---
  if (step === 'confirmation') {
    return (
      <div className="max-w-xl mx-auto w-auto -mx-4 sm:mx-auto bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xl border-0 sm:border border-slate-100 overflow-hidden animate-scaleUp">
        <div className="bg-emerald-600 p-8 text-center text-white relative">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 bg-white/10 h-32 w-32 rounded-full blur-xl" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="h-14 w-14 bg-white/25 rounded-2xl flex items-center justify-center text-white animate-bounce">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">¡Solicitud Enviada con Éxito!</h2>
              <p className="text-xs text-emerald-100 mt-1">Nro. de Gestión: <strong className="bg-emerald-800/60 px-2 py-0.5 rounded text-white font-mono">{createdOrderId}</strong></p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-150 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Resumen del Trámite</h4>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-450 font-bold">Paciente</p>
                <p className="font-extrabold text-slate-800">{patientName} {patientLastName}</p>
              </div>
              <div>
                <p className="text-slate-450 font-bold">DNI</p>
                <p className="font-extrabold text-slate-800">{patientDni}</p>
              </div>
              <div>
                <p className="text-slate-450 font-bold">Cobertura Médica</p>
                <p className="font-extrabold text-slate-850">{selectedObraSocial}</p>
              </div>
              <div>
                <p className="text-slate-450 font-bold">Medio de Recepción</p>
                <p className="font-extrabold text-slate-850 uppercase text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  {deliveryMethod === 'both' ? 'Email y WhatsApp' : deliveryMethod}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3">
              <p className="text-[10px] text-slate-450 font-bold mb-1 uppercase">Medicamentos Solicitados</p>
              {medicationMethod === 'manual' ? (
                <ul className="text-xs space-y-1 font-semibold text-slate-700">
                  {medicationItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-blue-500">•</span>
                      <span>{item.nombreComercial} ({item.droga} {item.miligramos}) - {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-semibold text-slate-650 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-blue-500" />
                  Cargado mediante {medicationPhotos.length} foto(s) de envase o receta.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <Clock className="h-5 w-5 text-blue-650 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed space-y-1">
                <p className="font-extrabold">Tiempo de respuesta: 24 hs hábiles</p>
                <p className="text-blue-800">
                  Hemos enviado un email de confirmación a <strong>{patientEmail}</strong> y un aviso a su WhatsApp <strong>{patientPhone}</strong>. Recibirá su receta digital firmada por el profesional apenas finalice la auditoría médica.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Garantía Médica de Devolución</p>
                <p className="text-amber-850">
                  La emisión de la receta digital depende exclusivamente de la auditoría y criterio del profesional matriculado habilitado. En caso de no ser aprobada por razones clínicas, el arancel transferido de ${paymentAmount} ARS será devuelto en su totalidad de manera inmediata.
                </p>
              </div>
            </div>
          </div>

          <button
            id="btn-confirm-finish"
            type="button"
            onClick={() => onSuccess(createdOrderId || '')}
            className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <span>Ir al Panel de Seguimiento</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-xl border-0 sm:border border-slate-150 sm:border-slate-100 overflow-hidden animate-scaleUp">
      {/* Brand Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 bg-white/10 h-32 w-32 rounded-full blur-xl" />
        <div className="relative">
          <span className="text-[10px] font-bold uppercase bg-blue-500/55 px-2.5 py-0.5 rounded-full text-blue-100 border border-blue-400/30">
            {isOficio ? 'Carga de Solicitud para Paciente' : 'Formulario Oficial'}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 flex items-center gap-1.5">
            {isOficio ? 'Nueva Solicitud de Renovación' : 'Renovación de Medicación Crónica'}
          </h2>
          <p className="text-xs text-blue-150 font-medium">
            {isOficio ? 'Ingrese los datos del paciente para generar la solicitud' : 'Complete paso a paso su trámite digital'}
          </p>
        </div>
        <HeartHandshake className="h-10 w-10 text-blue-200 hidden sm:block stroke-[1.5]" />
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-4 border-b border-blue-100/30 bg-slate-50/50 py-3 text-center text-[10px] sm:text-[11px] font-bold">
        <div 
          onClick={() => setStep('info')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'info' ? 'text-blue-700' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'info' 
              ? 'bg-blue-600 text-white shadow' 
              : 'bg-blue-50 text-blue-800 border border-blue-100'
          }`}>1</span>
          <span>Información Previa</span>
        </div>

        <div 
          onClick={() => {
            setStep('identification');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'identification' ? 'text-blue-700' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'identification' 
              ? 'bg-blue-600 text-white shadow' 
              : step !== 'info' ? 'bg-blue-50 text-blue-800 border border-blue-100' : 'bg-slate-200 text-slate-400'
          }`}>2</span>
          <span>Identificación</span>
        </div>

        <div 
          onClick={() => {
            if (patientName && patientLastName && patientDni && selectedObraSocial) {
              setStep('medication');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'medication' ? 'text-blue-700' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'medication' 
              ? 'bg-blue-600 text-white shadow' 
              : step === 'payment' ? 'bg-blue-50 text-blue-800 border border-blue-100' : 'bg-slate-200 text-slate-400'
          }`}>3</span>
          <span>Medicación</span>
        </div>

        <div 
          onClick={() => {
            if (patientName && patientLastName && patientDni && selectedObraSocial && (medicationItems.length > 0 || medicationPhotos.length > 0) && diagnostic) {
              setStep('payment');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'payment' ? 'text-blue-700' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'payment' ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-400'
          }`}>4</span>
          <span>Pago y Firma</span>
        </div>
      </div>

      {/* Main Error Box */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-900 rounded-xl flex items-start gap-2.5 text-sm shadow-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-950">Atención</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmitAll} className="p-4 sm:p-6">
        
        {/* STEP 0: INFO */}
        {step === 'info' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2 max-w-md mx-auto py-2">
              <ClipboardCheck className="h-10 w-10 text-blue-600 mx-auto stroke-[1.5]" />
              <h3 className="text-base font-extrabold text-slate-800">
                Condiciones y Requisitos de Renovación
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Por favor, lea con atención las siguientes condiciones antes de iniciar el trámite de renovación de su receta digital.
              </p>
            </div>

            {/* Informative service info block */}
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/80 text-xs text-blue-900 leading-relaxed space-y-3 shadow-xs">
              <p className="font-extrabold flex items-center gap-1.5 text-sm text-blue-950">
                <Info className="h-5 w-5 text-blue-650" />
                Información del Servicio de Renovación
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-blue-800 font-medium">
                <li>El trámite opera como una <strong>consulta médica asincrónica</strong>.</li>
                <li>Tiempo promedio de auditoría y respuesta: <strong>24 hs hábiles</strong>.</li>
                <li>La firma y emisión de la receta depende exclusivamente del <strong>criterio clínico médico</strong>.</li>
                <li>Si la receta es rechazada por razones justificadas, <strong>se devuelve el dinero íntegramente</strong>.</li>
              </ul>
            </div>

            {/* Forbidden medicines disclaimer block */}
            <div className="bg-red-50/70 p-5 rounded-2xl border border-red-150/80 text-xs text-red-950 leading-relaxed space-y-3 shadow-xs">
              <p className="font-extrabold text-red-900 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="h-5 w-5 text-red-700" />
                Aviso: Medicación Restringida y Controlada
              </p>
              <p className="font-medium leading-relaxed">
                <strong>NO está permitido</strong> solicitar psicofármacos (recetas rosas, archivadas, listas de psicotrópicos), opioides, morfina o derivados, ni medicamentos de uso clínico crítico controlado. Cualquier pedido de estos productos será <strong>rechazado automáticamente</strong> sin excepción.
              </p>
            </div>

            <button
              id="btn-confirm-info"
              type="button"
              onClick={() => setStep('identification')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>Entendido, Iniciar Solicitud</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* STEP 1: IDENTIFICATION */}
        {step === 'identification' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-150 pb-3 gap-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-blue-600" />
                Datos Personales del Paciente
              </h3>
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                  isEditMode 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm'
                }`}
              >
                {isEditMode ? (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Guardar y Bloquear Datos</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Modificar / Editar Campos</span>
                  </>
                )}
              </button>
            </div>

            {!isEditMode && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Los datos personales están autocompletados y bloqueados. Haga clic en <strong>Modificar / Editar Campos</strong> para editarlos.</span>
              </div>
            )}

            {/* DNI and Birthdate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-dni" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  DNI (Sin puntos) <span className="text-red-500">*</span>
                </label>
                <input
                  id="patient-dni"
                  type="text"
                  value={patientDni}
                  onChange={(e) => setPatientDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 34555888"
                  disabled={!isEditMode}
                  className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-bold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="patient-birthdate" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="patient-birthdate"
                    type="date"
                    value={patientBirthDate}
                    onChange={(e) => setPatientBirthDate(e.target.value)}
                    disabled={!isEditMode}
                    className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-bold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Name and LastName */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-name" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Nombre/s <span className="text-red-500">*</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ej. Ana"
                  disabled={!isEditMode}
                  className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="patient-lastName" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  id="patient-lastName"
                  type="text"
                  value={patientLastName}
                  onChange={(e) => setPatientLastName(e.target.value)}
                  placeholder="Ej. González"
                  disabled={!isEditMode}
                  className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 pt-2">
              <Mail className="h-4.5 w-4.5 text-blue-600" />
              Contacto y Envío de la Receta
            </h3>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-email" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Correo Electrónico <span className="text-slate-400 font-semibold">(Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="patient-email"
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="ana.gonzalez@gmail.com"
                    disabled={!isEditMode}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="patient-phone" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  WhatsApp / Celular <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    id="patient-phone"
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="Ej. 2926442385"
                    disabled={!isEditMode}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Delivery preference */}
            <div>
              <label htmlFor="delivery-method" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                Medio de Recepción Preferido de la Receta <span className="text-red-500">*</span>
              </label>
              <select
                id="delivery-method"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as any)}
                disabled={!isEditMode}
                className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="email">Únicamente por Correo Electrónico (PDF)</option>
                <option value="whatsapp">Únicamente por WhatsApp (PDF)</option>
                <option value="both">Enviar por Ambos Medios (Email y WhatsApp)</option>
              </select>
            </div>

            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 pt-2">
              <ClipboardCheck className="h-4.5 w-4.5 text-blue-600" />
              Obra Social / Cobertura
            </h3>

            {/* Obra Social */}
            <div>
              <label htmlFor="patient-obraSocial" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                Obra Social o Prepaga <span className="text-red-500">*</span>
              </label>
              <select
                id="patient-obraSocial"
                value={selectedObraSocial}
                onChange={(e) => setSelectedObraSocial(e.target.value)}
                disabled={!isEditMode}
                className="w-full px-4 py-3 bg-slate-50 disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-semibold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="">Seleccione una opción...</option>
                {OBRA_SOCIAL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Affiliate number input */}
            {selectedObraSocial && selectedObraSocial !== 'Particular / Sin Obra Social' && (
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/70 space-y-1.5 animate-fadeIn">
                <label htmlFor="patient-obraSocialNumber" className="block text-xs font-bold text-blue-950 uppercase">
                  Número de Afiliado / Nro. de Credencial <span className="text-slate-400 font-semibold">(Opcional)</span>
                </label>
                <input
                  id="patient-obraSocialNumber"
                  type="text"
                  value={obraSocialNumber}
                  onChange={(e) => setObraSocialNumber(e.target.value)}
                  placeholder="Ingrese el número completo impreso en su credencial"
                  disabled={!isEditMode}
                  className="w-full px-4 py-3 bg-white disabled:bg-slate-100 border border-slate-250 disabled:border-slate-200 rounded-xl font-bold text-slate-800 disabled:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-blue-600 font-semibold">Conserve guiones y dígitos verificadores.</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                id="btn-back-to-info"
                type="button"
                onClick={() => setStep('info')}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-800 font-bold py-4 px-3 rounded-2xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
              
              <button
                id="btn-next-step-medication"
                type="button"
                onClick={goToMedication}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MEDICATION */}
        {step === 'medication' && (
          <div className="space-y-4 animate-fadeIn">

            {/* Notification Alert */}
            {notificationMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center gap-2.5 text-xs shadow-sm animate-fadeIn">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{notificationMsg}</span>
              </div>
            )}

            {/* Input Method Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Método de Carga de Medicación <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-method-new-manual"
                  type="button"
                  onClick={() => setMedicationMethod('new_manual')}
                  className={`py-3.5 px-4 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    medicationMethod === 'new_manual'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span>Nueva Carga Manual (Carrito)</span>
                </button>

                <button
                  id="btn-method-past-orders"
                  type="button"
                  onClick={() => setMedicationMethod('past_orders')}
                  className={`py-3.5 px-4 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    medicationMethod === 'past_orders'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>Últimas Solicitudes</span>
                </button>
              </div>
            </div>

            {/* SECTION A: NUEVA CARGA MANUAL (CARRITO + PHOTOS) */}
            {medicationMethod === 'new_manual' && (
              <div className="space-y-4 animate-fadeIn">
                {/* A1. Formulario intuitivo para agregar remedio o foto */}
                <div className="bg-slate-50/75 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                      <span>Ingresar Medicamento</span>
                    </h4>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="cur-nombre-comercial" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Nombre Comercial del Remedio <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="cur-nombre-comercial"
                        type="text"
                        value={curNombreComercial}
                        onChange={(e) => setCurNombreComercial(e.target.value)}
                        placeholder="Ej. Lotrial, Amoxidal, Enalapril..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="cur-miligramos" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Dosis / Miligramos
                        </label>
                        <input
                          id="cur-miligramos"
                          type="text"
                          value={curMiligramos}
                          onChange={(e) => setCurMiligramos(e.target.value)}
                          placeholder="Ej. 10mg, 50mg, 500mg"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="cur-cajas" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Cantidad de Cajas <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="cur-cajas"
                          type="number"
                          min="1"
                          value={curCantidadCajas}
                          onChange={(e) => setCurCantidadCajas(e.target.value)}
                          placeholder="1"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <button
                        id="btn-add-medication-item"
                        type="button"
                        onClick={addManualMedication}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Agregar al carrito</span>
                      </button>

                      {/* Divider with 'ó' */}
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-[1px] bg-slate-250 flex-1" />
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">ó</span>
                        <div className="h-[1px] bg-slate-250 flex-1" />
                      </div>

                      <label className="w-full bg-white hover:bg-slate-100 border border-blue-200 text-blue-700 font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                        <Camera className="h-4.5 w-4.5 text-blue-600" />
                        <span>Adjuntar foto de receta anterior o de la medicación</span>
                        <input
                          id="input-medication-file"
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.heic,application/pdf"
                          onChange={(e) => handleFileChange(e, 'medication')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* A2. Lista / Carrito de Medicamentos Agregados */}
                <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>🛒 Carrito de la Solicitud</span>
                      <span className="bg-blue-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black shadow-xs">
                        {medicationItems.length + medicationPhotos.length} items
                      </span>
                    </h5>
                    {(medicationItems.length > 0 || medicationPhotos.length > 0) && (
                      <button
                        type="button"
                        onClick={() => { setMedicationItems([]); setMedicationPhotos([]); }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                      >
                        Vaciar Todo
                      </button>
                    )}
                  </div>

                  {medicationItems.length === 0 && medicationPhotos.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      El recetario está vacío. Ingrese el nombre de su remedio o adjunte una foto arriba.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {/* Items ingresados por texto */}
                      {medicationItems.map((item, index) => (
                        <div 
                          key={`text-${index}`} 
                          className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-xs"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900">
                              {item.nombreComercial} {item.miligramos && <span className="text-blue-600 font-black">({item.miligramos})</span>}
                            </p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {item.cantidadCajas} {item.cantidadCajas === 1 ? 'Caja' : 'Cajas'}
                            </p>
                          </div>
                          <button
                            id={`btn-remove-med-item-${index}`}
                            type="button"
                            onClick={() => removeMedicationItem(index)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Quitar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {/* Fotos de envase o receta agregadas */}
                      {medicationPhotos.map((photo, index) => (
                        <div key={`photo-${index}`} className="bg-white p-2.5 rounded-xl border border-blue-200 flex items-center justify-between text-left text-xs shadow-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="h-10 w-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                              {photo.url.startsWith('data:application/pdf') ? (
                                <span className="text-[9px] font-bold text-slate-500">PDF</span>
                              ) : (
                                <img src={photo.url} alt="Caja" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-[220px]">
                                {photo.name}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-bold">Foto de envase adjuntada</p>
                            </div>
                          </div>
                          <button
                            id={`btn-remove-photo-${index}`}
                            type="button"
                            onClick={() => setMedicationPhotos(prev => prev.filter((_, i) => i !== index))}
                            className="text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50 font-bold px-2 py-1 rounded-lg cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION B: PAST ORDERS (ÚLTIMAS SOLICITUDES) */}
            {medicationMethod === 'past_orders' && (
              <div className="space-y-4 animate-fadeIn">
                {patientOrders.length === 0 ? (
                  <div className="bg-slate-50 p-6 text-center text-xs text-slate-500 font-medium rounded-2xl border border-slate-200">
                    No posee solicitudes anteriores asociadas a su DNI en el sistema. Seleccione <strong>Nueva Carga Manual (Carrito)</strong> para ingresar sus medicamentos.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* B1. Repetir último pedido (Prominent Action) */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/85 rounded-3xl p-5 space-y-3.5 shadow-sm animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-650 shrink-0" />
                          <div>
                            <h4 className="font-extrabold text-sm text-blue-950">Última Solicitud Registrada</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                              Fecha: {new Date(lastOrder.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRepeatLastOrder}
                          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Repetir Último Pedido Completo</span>
                        </button>
                      </div>

                      <div className="bg-white/80 rounded-2xl p-4 text-xs space-y-2.5 border border-blue-100">
                        <div>
                          <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wide">Diagnóstico de Tratamiento:</span>
                          <span className="font-semibold text-slate-800">{lastOrder.diagnostic}</span>
                        </div>

                        <div>
                          <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wide">Medicamentos:</span>
                          {lastOrder.medicationItems && lastOrder.medicationItems.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1 text-slate-800 mt-1 font-medium">
                              {lastOrder.medicationItems.map((item: any, i: number) => (
                                <li key={i}>
                                  <strong>{item.nombreComercial}</strong> ({item.droga} {item.miligramos}) - {item.cantidadCajas} {item.cantidadCajas === 1 ? 'caja' : 'cajas'}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-800 font-semibold flex items-center gap-1.5 mt-1">
                              <Camera className="h-3.5 w-3.5 text-blue-500" />
                              Cargado mediante foto(s) de envase o receta
                            </span>
                          )}
                        </div>

                        {lastOrder.comments && (
                          <div>
                            <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wide">Comentarios Adicionales:</span>
                            <span className="font-semibold text-slate-700 italic">"{lastOrder.comments}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* B2. Elegir otra solicitud de la lista */}
                    {patientOrders.length > 1 && (
                      <div className="bg-slate-50 p-4.5 border border-slate-200 rounded-2xl space-y-3.5">
                        <label htmlFor="past-order-select" className="block text-xs font-bold text-slate-600 uppercase">
                          Elegir otra solicitud de las anteriores
                        </label>
                        <select
                          id="past-order-select"
                          value={selectedPastOrderId}
                          onChange={(e) => setSelectedPastOrderId(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-250 rounded-xl font-semibold text-xs text-slate-800 cursor-pointer focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccione otra solicitud...</option>
                          {patientOrders.slice(1).map((o: any) => (
                            <option key={o.id} value={o.id}>
                              {new Date(o.createdAt).toLocaleDateString('es-AR')} - {o.diagnostic || 'Sin diagnóstico'} ({o.medicationItems?.length || 0} medicamentos)
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
                                  onClick={() => handleRepeatPastOrder(selectedPastOrderId)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" />
                                  <span>Repetir esta solicitud</span>
                                </button>
                              </div>

                              <div className="text-xs space-y-2 font-medium">
                                <div>
                                  <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wide">Diagnóstico:</span>
                                  <span className="text-slate-800">{selectedOrder.diagnostic}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wide">Medicamentos:</span>
                                  {selectedOrder.medicationItems && selectedOrder.medicationItems.length > 0 ? (
                                    <ul className="list-disc pl-4 space-y-0.5 text-slate-800 mt-0.5">
                                      {selectedOrder.medicationItems.map((item: any, i: number) => (
                                        <li key={i}>
                                          <strong>{item.nombreComercial}</strong> ({item.droga} {item.miligramos})
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-slate-500 italic mt-0.5 block">Cargado por foto</span>
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

            {/* OPTIONAL DIAGNOSIS FIELD */}
            <div>
              <label htmlFor="diagnostic-text" className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Diagnóstico que dio origen al tratamiento crónico <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <textarea
                id="diagnostic-text"
                rows={2}
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                placeholder="Ej. Hipertensión arterial, Diabetes, Hipotiroidismo..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none text-xs font-semibold placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Opcional. Permite al médico auditar de forma más ágil su historia clínica.</p>
            </div>

            {/* OPTIONAL COMMENTS FIELD */}
            <div>
              <label htmlFor="comments-text" className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Comentarios / Aclaraciones Adicionales (Opcional)
              </label>
              <textarea
                id="comments-text"
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Ej. Deseo que me receten la misma marca comercial si es posible. Tomo 1 comprimido diario por la mañana."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none text-xs font-semibold placeholder:text-slate-400"
              />
            </div>

            {/* CONTROL PREGUNTAS (OPCIONALES) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1 uppercase tracking-wider">
                <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                Información de Control Clínico (Opcional)
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="last-consultation-time" className="block text-[10px] font-bold text-slate-600 mb-1">
                    ¿Cuándo fue su última consulta presencial?
                  </label>
                  <select
                    id="last-consultation-time"
                    value={lastConsultationTime}
                    onChange={(e) => setLastConsultationTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Seleccione una opción...</option>
                    <option value="Hace menos de 3 meses">Hace menos de 3 meses</option>
                    <option value="Hace entre 3 y 6 meses">Hace entre 3 y 6 meses</option>
                    <option value="Hace más de 6 meses">Hace más de 6 meses</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="last-consultation-doctor" className="block text-[10px] font-bold text-slate-600 mb-1">
                    ¿Con qué profesional?
                  </label>
                  <input
                    id="last-consultation-doctor"
                    type="text"
                    value={lastConsultationDoctor}
                    onChange={(e) => setLastConsultationDoctor(e.target.value)}
                    placeholder="Ej. Dr. Martínez"
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                id="btn-back-1"
                type="button"
                onClick={() => setStep('identification')}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-800 font-bold py-4 px-3 rounded-2xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
              
              <button
                id="btn-next-step-payment"
                type="button"
                onClick={goToPayment}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {step === 'payment' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Elegant calculation card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-50">Arancel del Trámite</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Gestión Digital de Firmas</p>
                  </div>
                </div>

                <div className="text-right">
                  {selectedObraSocial === 'PAMI (Inssjp)' ? (
                    <div>
                      <span className="text-lg font-black text-emerald-400">GRATIS</span>
                      <p className="text-[9px] text-emerald-350 font-extrabold uppercase">Bonificado PAMI</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl font-black text-blue-400">${paymentAmount}</span>
                      <span className="text-xs text-slate-400 font-bold"> ARS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cost rules explained */}
              <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 space-y-1">
                {selectedObraSocial === 'PAMI (Inssjp)' ? (
                  <p className="text-emerald-300 font-bold flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    ¡Su trámite está 100% bonificado! Al tener credencial activa de PAMI, la plataforma gestiona su firma digital sin costo de arancel.
                  </p>
                ) : (
                  <>
                    <p className="font-semibold text-slate-200">¿Cómo se calcula el costo de arancel?</p>
                    <p className="text-slate-400 text-[11px]">
                      La tasa de auditoría y renovación es de <strong>$10.000 ARS por cada dos (2) medicamentos</strong>. Se han cargado {medicationMethod === 'manual' ? medicationItems.length : medicationPhotos.length} medicamentos en su solicitud.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* PAMI bypass checkout form */}
            {selectedObraSocial === 'PAMI (Inssjp)' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3 animate-fadeIn">
                <div className="h-10 w-10 bg-emerald-150 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                  <Check className="h-5.5 w-5.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-950">No se requiere transferencia ni pago online</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed mt-1">
                    Su credencial de afiliado de PAMI fue cargada de forma segura en el Paso 1. Puede proceder de forma directa a enviar la solicitud de receta haciendo click en "Enviar Solicitud".
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Payment method selector */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    id="btn-pay-mp"
                    type="button"
                    onClick={() => setPaymentMethod('mp')}
                    className={`py-3 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'mp'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-black ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span>Pago Mercado Pago (Online)</span>
                  </button>

                  <button
                    id="btn-pay-transfer"
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-3 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'transfer'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-black ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Transferencia Directa (CBU)</span>
                  </button>
                </div>

                {/* OPTION 1: MERCADO PAGO CHECKOUT PRO */}
                {paymentMethod === 'mp' && (
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 animate-fadeIn">
                    
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider bg-blue-600 text-white px-2.5 py-0.5 rounded-md">
                          Checkout Pro
                        </span>
                        <p className="text-xs font-black text-slate-850">Mercado Pago Oficial</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">Pago 100% Protegido</span>
                    </div>

                    {/* Method details */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                      <p className="font-extrabold text-slate-800">Medios de pago soportados por Mercado Pago:</p>
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">💳 Tarjetas de Crédito / Débito</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">💙 Dinero en Cuenta Mercado Pago</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">💵 PagoFácil / RapiPago</span>
                      </div>
                    </div>

                    {/* Submit checkout preference button */}
                    {mpPaymentApproved ? (
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-scaleUp font-semibold leading-relaxed">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-emerald-950">Pago Online Autorizado con Éxito</p>
                          <p>Id de Operación Mercado Pago: <strong className="font-mono text-[11px] bg-white border border-emerald-200 px-1 py-0.5 rounded text-emerald-800">{mpTransactionId}</strong></p>
                          <p className="text-[10px] text-slate-500 mt-1">Haga click en "Enviar Solicitud" abajo para finalizar el trámite.</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        id="btn-submit-mp-payment"
                        type="button"
                        onClick={processMercadoPagoPayment}
                        disabled={mpProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="h-4.5 w-4.5 text-blue-200 animate-pulse" />
                        <span>{mpProcessing ? 'Generando preferencia de cobro...' : `Pagar $${paymentAmount} ARS con Mercado Pago`}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* OPTION 2: TRANSFERENCIA BANCARIA COMPROBANTE */}
                {paymentMethod === 'transfer' && (
                  <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100/80 space-y-3.5 animate-fadeIn text-xs">
                    
                    {/* Bank Details list */}
                    <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-amber-200/50 text-slate-700 font-medium">
                      <p className="font-extrabold text-amber-950 flex items-center gap-1.5 text-[10px] uppercase mb-1">
                        <span className="flex h-1.5 w-1.5 bg-amber-500 rounded-full" />
                        Cuentas de Depósito Oficiales
                      </p>
                      <p><strong>CBU (Banco Provincia):</strong> <span className="font-mono">{BANK_DETAILS.cbu}</span></p>
                      <p><strong>Alias MercadoPago:</strong> <span className="font-mono bg-amber-100 px-1 rounded text-amber-955 font-bold">{BANK_DETAILS.alias}</span></p>
                      <p><strong>Titular de la Cuenta:</strong> {BANK_DETAILS.titular}</p>
                    </div>

                    {/* Receipt upload / simulation */}
                    <div className="border border-dashed border-amber-300 rounded-2xl p-4.5 bg-white/70 text-center flex flex-col items-center justify-center">
                      <p className="font-bold text-slate-800 mb-1">
                        Adjunte el Comprobante de Transferencia <span className="text-red-500">*</span>
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mb-3">
                        Suba la captura o PDF generado por su Homebanking o billetera virtual.
                      </p>

                      {paymentReceipt ? (
                        <div className="w-full bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2 truncate">
                            <div className="h-10 w-12 bg-slate-50 border border-slate-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                              {paymentReceipt.url.startsWith('data:application/pdf') ? (
                                <span className="text-[9px] font-bold text-slate-500">PDF</span>
                              ) : (
                                <img src={paymentReceipt.url} alt="Comprobante" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-850 truncate max-w-[150px] sm:max-w-[200px]">
                                {paymentReceipt.name}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-bold">Comprobante validado</p>
                            </div>
                          </div>
                          <button
                            id="btn-remove-receipt"
                            type="button"
                            onClick={() => setPaymentReceipt(null)}
                            className="text-[11px] text-red-650 hover:text-red-800 hover:bg-red-50 font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="w-full space-y-2.5">
                          <label className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-sm transition-colors text-xs">
                            <Upload className="h-4 w-4 text-slate-505" />
                            <span>Elegir captura de mi galería</span>
                            <input
                              id="input-payment-file"
                              type="file"
                              accept=".jpg,.jpeg,.png,.heic,application/pdf"
                              onChange={(e) => handleFileChange(e, 'payment')}
                              className="hidden"
                            />
                          </label>

                          <button
                            id="btn-mock-transfer"
                            type="button"
                            onClick={handleLoadMockReceipt}
                            className="text-[11px] bg-amber-100 hover:bg-amber-150 text-amber-900 border border-amber-250 font-extrabold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-xs"
                          >
                            <Check className="h-4 w-4" />
                            Simular Carga de Comprobante
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                id="btn-back-3"
                type="button"
                onClick={() => setStep('medication')}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-800 font-bold py-4 px-3 rounded-2xl transition-all flex items-center justify-center gap-1 cursor-pointer text-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
              
              <button
                id="btn-submit-order"
                type="submit"
                disabled={submitting}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Guardando Prescripción...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Enviar Solicitud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
