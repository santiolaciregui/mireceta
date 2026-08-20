/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MedicationItem, DependentPatient } from '../../../types';
import { OBRA_SOCIAL_OPTIONS } from '../../../constants/orderStatus';
import { 
  User, 
  Users,
  Heart,
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
  Copy,
  Search,
  UserPlus,
  ShieldCheck,
  Printer,
  Pill,
  RotateCcw
} from 'lucide-react';
import MercadoPagoIcon from '../../MercadoPagoIcon';
import OfficialOrderReceipt from '../../OfficialOrderReceipt';
import { fileToBase64, compressImageAndGetBase64 } from '../../../utils/file';
import { useFormDraft } from '../../../hooks/useFormDraft';
import { trackInitiatePrescription, trackCompletePrescription } from '../../../services/metaPixelService';


interface PatientFormProps {
  onSubmitOrder: (data: any) => Promise<string>;
  onSuccess: (orderId: string) => void;
  recentDni: string;
  onSetDni: (dni: string) => void;
  initialName?: string;
  initialLastName?: string;
  orders?: any[];
  users?: any[];
  currentUser?: any;
  isOficio?: boolean;
  onAddDependent?: (dependent: any) => void;
  onUpdateDependent?: (dependent: any) => void;
  onRemoveDependent?: (dependentId: string) => void;
  currentTenant?: any;
}

const BANK_DETAILS = {
  cbu: '0000003100087922246734',
  alias: 'mireceta.online',
  titular: 'Mariano Daniel Sein',
};

export default function PatientForm({
  onSubmitOrder,
  onSuccess,
  recentDni,
  onSetDni,
  initialName = '',
  initialLastName = '',
  orders = [],
  users = [],
  currentUser,
  isOficio = false,
  onAddDependent,
  onUpdateDependent,
  onRemoveDependent,
  currentTenant,
}: PatientFormProps) {
  const isThirdPartyUser = Boolean(isOficio || (currentUser && currentUser.role !== 'paciente'));
  const userKey = currentUser?.id || currentUser?.identifier || recentDni;
  const { saveDraft, loadDraft, clearDraft } = useFormDraft(userKey);

  // Wizard steps: 'info' -> 'identification' -> 'medication' -> 'payment' -> 'confirmation'
  const [step, setStep] = useState<'info' | 'identification' | 'medication' | 'payment' | 'confirmation'>('info');
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    patientDni?: string;
    patientName?: string;
    patientLastName?: string;
    patientBirthDate?: string;
    patientPhone?: string;
    patientEmail?: string;
    selectedObraSocial?: string;
    obraSocialNumber?: string;
    curNombreComercial?: string;
    curCantidadCajas?: string;
    medicationList?: string;
    paymentReceipt?: string;
  }>({});
  const [depFieldErrors, setDepFieldErrors] = useState<{
    name?: string;
    lastName?: string;
    dni?: string;
    birthDate?: string;
    relationship?: string;
    obraSocial?: string;
    customObraSocial?: string;
    obraSocialNumber?: string;
    phone?: string;
    email?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [returnedOrder, setReturnedOrder] = useState<any>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isThirdPartyUser);
  const [searchStatus, setSearchStatus] = useState<{ found: boolean; message: string } | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Check URL query parameters for Mercado Pago payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment') || params.get('collection_status') || params.get('status');
    const orderId = params.get('orderId') || params.get('external_reference');
    const collectionId = params.get('collection_id') || params.get('payment_id');
    const preferenceId = params.get('preference_id');

    if (payment && orderId) {
      if (payment === 'approved' || payment === 'pending') {
        trackCompletePrescription({
          orderId,
          value: currentTenant?.pricePerPrescription || 10000,
          currency: 'ARS',
        });
        clearDraft();
        setDraftRestored(false);
        setCreatedOrderId(orderId);
        setStep('confirmation');

        // Active server synchronization to immediately confirm payment in MongoDB
        fetch('/api/payments/sync-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            payment,
            collection_id: collectionId,
            payment_id: collectionId,
            preference_id: preferenceId,
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.order) {
            setReturnedOrder(data.order);
          }
        })
        .catch(err => {
          console.warn('[Payment Return Sync Warning]:', err);
        });
      } else if (payment === 'rejected') {
        setError(`El pago para la receta ${orderId} fue rechazado por Mercado Pago. Puede reintentar el pago o seleccionar otro método.`);
        setStep('payment');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clearDraft]);

  // --- Titular (Account Holder) Isolated State ---
  const [titularData, setTitularData] = useState(() => ({
    name: currentUser?.name || initialName || '',
    lastName: currentUser?.lastName || initialLastName || '',
    dni: currentUser?.identifier || recentDni || '',
    birthDate: currentUser?.birthDate || '',
    obraSocial: currentUser?.obraSocial || '',
    obraSocialNumber: currentUser?.obraSocialNumber || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.city || '',
    province: currentUser?.province || '',
  }));

  // Keep titularData synced if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setTitularData(prev => ({
        name: currentUser.name || initialName || prev.name,
        lastName: currentUser.lastName || initialLastName || prev.lastName,
        dni: currentUser.identifier || recentDni || prev.dni,
        birthDate: currentUser.birthDate || prev.birthDate,
        obraSocial: currentUser.obraSocial || prev.obraSocial,
        obraSocialNumber: currentUser.obraSocialNumber || prev.obraSocialNumber,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
        city: currentUser.city || prev.city,
        province: currentUser.province || prev.province,
      }));
    }
  }, [currentUser, initialName, initialLastName, recentDni]);

  // --- Step 1 Fields: Active Patient Selected for the Order ---
  const [patientDni, setPatientDni] = useState(isThirdPartyUser ? '' : (currentUser?.identifier || recentDni));
  const [patientName, setPatientName] = useState(isThirdPartyUser ? '' : (currentUser?.name || initialName));
  const [patientLastName, setPatientLastName] = useState(isThirdPartyUser ? '' : (currentUser?.lastName || initialLastName));
  const [patientBirthDate, setPatientBirthDate] = useState(currentUser?.birthDate || '');
  const [patientEmail, setPatientEmail] = useState(currentUser?.email || '');
  const [patientPhone, setPatientPhone] = useState(currentUser?.phone || '');
  const [patientCity, setPatientCity] = useState(isThirdPartyUser ? '' : (currentUser?.city || ''));
  const [patientProvince, setPatientProvince] = useState(isThirdPartyUser ? '' : (currentUser?.province || ''));
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp' | 'both'>('both');
  const [selectedObraSocial, setSelectedObraSocial] = useState(currentUser?.obraSocial || '');
  const [obraSocialNumber, setObraSocialNumber] = useState(currentUser?.obraSocialNumber || '');

  // --- Pacientes a Cargo (Dependents) State & Handlers ---
  const [dependents, setDependents] = useState<DependentPatient[]>(() => {
    return currentUser?.dependents || [];
  });

  const [selectedCardId, setSelectedCardId] = useState<string>('titular');
  const [showAddDependentModal, setShowAddDependentModal] = useState<boolean>(false);

  // New/Edit Patient Modal State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [depName, setDepName] = useState('');
  const [depLastName, setDepLastName] = useState('');
  const [depDni, setDepDni] = useState('');
  const [depBirthDate, setDepBirthDate] = useState('');
  const [depRelationship, setDepRelationship] = useState('Hijo/a');
  const [depObraSocial, setDepObraSocial] = useState('');
  const [depCustomObraSocial, setDepCustomObraSocial] = useState('');
  const [depObraSocialNumber, setDepObraSocialNumber] = useState('');
  const [depEmail, setDepEmail] = useState('');
  const [depPhone, setDepPhone] = useState('');
  const [depCity, setDepCity] = useState('');
  const [depProvince, setDepProvince] = useState('');
  const [depFormError, setDepFormError] = useState<string | null>(null);

  // Keep dependents synced if currentUser updates
  useEffect(() => {
    if (currentUser?.dependents && currentUser.dependents.length > 0) {
      setDependents(currentUser.dependents);
    }
  }, [currentUser?.dependents]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showAddDependentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddDependentModal]);

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    if (cardId === 'titular') {
      setPatientName(titularData.name);
      setPatientLastName(titularData.lastName);
      setPatientDni(titularData.dni);
      setPatientBirthDate(titularData.birthDate);
      setSelectedObraSocial(titularData.obraSocial);
      setObraSocialNumber(titularData.obraSocialNumber);
      setPatientEmail(titularData.email);
      setPatientPhone(titularData.phone);
      setPatientCity(titularData.city || '');
      setPatientProvince(titularData.province || '');
      if (searchStatus) setSearchStatus(null);
    } else {
      const dep = dependents.find((d) => d.id === cardId);
      if (dep) {
        setPatientName(dep.name);
        setPatientLastName(dep.lastName);
        setPatientDni(dep.dni);
        setPatientBirthDate(dep.birthDate || '');
        setSelectedObraSocial(dep.obraSocial || '');
        setObraSocialNumber(dep.obraSocialNumber || '');
        setPatientEmail(dep.email || titularData.email || '');
        setPatientPhone(dep.phone || titularData.phone || '');
        setPatientCity(dep.city || '');
        setPatientProvince(dep.province || '');
        setSearchStatus({
          found: true,
          message: `Cargados datos de paciente a cargo: ${dep.name} ${dep.lastName} (${dep.relationship})`,
        });
      }
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    setEditingCardId(cardId);
    setDepFormError(null);
    setDepFieldErrors({});

    let osVal = '';
    if (cardId === 'titular') {
      setDepName(titularData.name);
      setDepLastName(titularData.lastName);
      setDepDni(titularData.dni);
      setDepBirthDate(titularData.birthDate);
      setDepRelationship('Titular');
      osVal = titularData.obraSocial;
      setDepObraSocialNumber(titularData.obraSocialNumber);
      setDepEmail(titularData.email);
      setDepPhone(titularData.phone);
      setDepCity(titularData.city || '');
      setDepProvince(titularData.province || '');
    } else {
      const dep = dependents.find((d) => d.id === cardId);
      if (dep) {
        setDepName(dep.name);
        setDepLastName(dep.lastName);
        setDepDni(dep.dni);
        setDepBirthDate(dep.birthDate || '');
        setDepRelationship(dep.relationship || 'A Cargo');
        osVal = dep.obraSocial || '';
        setDepObraSocialNumber(dep.obraSocialNumber || '');
        setDepEmail(dep.email || '');
        setDepPhone(dep.phone || '');
        setDepCity(dep.city || '');
        setDepProvince(dep.province || '');
      }
    }

    const matchOS = OBRA_SOCIAL_OPTIONS.find((o) => o.name === osVal && o.id !== 'otra');
    if (matchOS) {
      setDepObraSocial(osVal);
      setDepCustomObraSocial('');
    } else if (osVal) {
      setDepObraSocial('Otra Obra Social / Prepaga');
      setDepCustomObraSocial(osVal === 'Otra Obra Social / Prepaga' ? '' : osVal);
    } else {
      setDepObraSocial('');
      setDepCustomObraSocial('');
    }

    setShowAddDependentModal(true);
  };

  const handleOpenNewDependentModal = () => {
    setEditingCardId(null);
    setDepFormError(null);
    setDepFieldErrors({});
    setDepName('');
    setDepLastName('');
    setDepDni('');
    setDepBirthDate('');
    setDepRelationship('Hijo/a');
    setDepObraSocial('');
    setDepCustomObraSocial('');
    setDepObraSocialNumber('');
    setDepEmail(titularData.email || '');
    setDepPhone(titularData.phone || '');
    setDepCity('');
    setDepProvince('');
    setShowAddDependentModal(true);
  };

  const handleSaveModalPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setDepFormError(null);
    const errors: typeof depFieldErrors = {};

    if (!depName.trim()) {
      errors.name = 'El nombre es obligatorio.';
    }

    if (!depLastName.trim()) {
      errors.lastName = 'El apellido es obligatorio.';
    }

    const cleanDni = depDni.trim();
    if (!cleanDni) {
      errors.dni = 'El número de DNI es obligatorio.';
    } else if (cleanDni.length < 6 || cleanDni.length > 10) {
      errors.dni = 'Ingrese un DNI válido (entre 6 y 10 dígitos).';
    }

    if (!depBirthDate) {
      errors.birthDate = 'La fecha de nacimiento es obligatoria.';
    }

    let finalObraSocial = depObraSocial;
    if (!depObraSocial) {
      errors.obraSocial = 'Debe seleccionar una obra social o prepaga.';
    } else if (depObraSocial === 'Otra Obra Social / Prepaga') {
      if (!depCustomObraSocial.trim()) {
        errors.customObraSocial = 'Por favor escriba el nombre de la Obra Social / Prepaga.';
      } else {
        finalObraSocial = depCustomObraSocial.trim();
      }
    } else {
      const selectedOs = OBRA_SOCIAL_OPTIONS.find((o) => o.name === depObraSocial);
      if (selectedOs?.requiresNumber && !depObraSocialNumber.trim()) {
        errors.obraSocialNumber = `El número de afiliado es obligatorio para ${depObraSocial}.`;
      }
    }

    if (depEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(depEmail.trim())) {
      errors.email = 'Ingrese un correo electrónico válido o déjelo en blanco.';
    }

    if (depPhone.trim() && depPhone.replace(/\D/g, '').length < 8) {
      errors.phone = 'Ingrese un número de teléfono/WhatsApp válido o déjelo en blanco.';
    }

    if (Object.keys(errors).length > 0) {
      setDepFieldErrors(errors);
      setDepFormError('Por favor complete todos los campos obligatorios marcados en rojo.');
      return;
    }

    setDepFieldErrors({});

    if (editingCardId === 'titular') {
      const updatedTitular = {
        ...titularData,
        name: depName.trim(),
        lastName: depLastName.trim(),
        dni: depDni.trim(),
        birthDate: depBirthDate,
        obraSocial: finalObraSocial,
        obraSocialNumber: depObraSocialNumber,
        email: depEmail,
        phone: depPhone,
        city: depCity.trim(),
        province: depProvince.trim(),
      };
      setTitularData(updatedTitular);

      if (selectedCardId === 'titular') {
        setPatientName(updatedTitular.name);
        setPatientLastName(updatedTitular.lastName);
        setPatientDni(updatedTitular.dni);
        setPatientBirthDate(updatedTitular.birthDate);
        setSelectedObraSocial(updatedTitular.obraSocial);
        setObraSocialNumber(updatedTitular.obraSocialNumber);
        setPatientEmail(updatedTitular.email);
        setPatientPhone(updatedTitular.phone);
        setPatientCity(updatedTitular.city);
        setPatientProvince(updatedTitular.province);
      }

      setShowAddDependentModal(false);
      setNotificationMsg('¡Datos del Titular actualizados con éxito!');
      setTimeout(() => setNotificationMsg(null), 4000);
      return;
    }

    if (editingCardId) {
      // Editing existing dependent
      const updatedDep: DependentPatient = {
        id: editingCardId,
        name: depName.trim(),
        lastName: depLastName.trim(),
        dni: depDni.trim(),
        birthDate: depBirthDate,
        relationship: depRelationship,
        obraSocial: finalObraSocial,
        obraSocialNumber: depObraSocialNumber,
        email: depEmail,
        phone: depPhone,
        city: depCity.trim(),
        province: depProvince.trim(),
      };

      const updated = dependents.map((d) => (d.id === editingCardId ? updatedDep : d));
      setDependents(updated);

      if (onUpdateDependent) {
        onUpdateDependent(updatedDep);
      }

      if (selectedCardId === editingCardId) {
        setPatientName(updatedDep.name);
        setPatientLastName(updatedDep.lastName);
        setPatientDni(updatedDep.dni);
        setPatientBirthDate(updatedDep.birthDate);
        setSelectedObraSocial(updatedDep.obraSocial || '');
        setObraSocialNumber(updatedDep.obraSocialNumber || '');
        setPatientEmail(updatedDep.email || '');
        setPatientPhone(updatedDep.phone || '');
        setPatientCity(updatedDep.city || '');
        setPatientProvince(updatedDep.province || '');
      }

      setShowAddDependentModal(false);
      setNotificationMsg(`¡Datos de "${depName.trim()} ${depLastName.trim()}" actualizados con éxito!`);
      setTimeout(() => setNotificationMsg(null), 4000);
      return;
    }

    // Creating new dependent
    const newDep: DependentPatient = {
      id: `dep-${Date.now()}`,
      name: depName.trim(),
      lastName: depLastName.trim(),
      dni: depDni.trim(),
      birthDate: depBirthDate,
      relationship: depRelationship,
      obraSocial: finalObraSocial,
      obraSocialNumber: depObraSocialNumber,
      email: depEmail || titularData.email || '',
      phone: depPhone || titularData.phone || '',
      city: depCity.trim(),
      province: depProvince.trim(),
    };

    const updated = [...dependents, newDep];
    setDependents(updated);

    if (onAddDependent) {
      onAddDependent(newDep);
    }

    // Auto select newly created dependent card
    setSelectedCardId(newDep.id);
    setPatientName(newDep.name);
    setPatientLastName(newDep.lastName);
    setPatientDni(newDep.dni);
    setPatientBirthDate(newDep.birthDate);
    setSelectedObraSocial(newDep.obraSocial || '');
    setObraSocialNumber(newDep.obraSocialNumber || '');
    setPatientEmail(newDep.email || titularData.email || '');
    setPatientPhone(newDep.phone || titularData.phone || '');
    setPatientCity(newDep.city || '');
    setPatientProvince(newDep.province || '');

    setShowAddDependentModal(false);
    setNotificationMsg(`¡Paciente a cargo "${newDep.name} ${newDep.lastName}" agregado exitosamente!`);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleRemoveDependentCard = (e: React.MouseEvent, depId: string) => {
    e.stopPropagation();
    const updated = dependents.filter((d) => d.id !== depId);
    setDependents(updated);
    if (onRemoveDependent) {
      onRemoveDependent(depId);
    }
    if (selectedCardId === depId) {
      handleSelectCard('titular');
    }
  };

  // Helper function to search patient in orders/users database by DNI
  const handleSearchPatientByDni = (targetDni?: string) => {
    const queryDni = (targetDni !== undefined ? targetDni : patientDni).trim();
    if (!queryDni) {
      setSearchStatus({ found: false, message: 'Ingrese un número de DNI para realizar la búsqueda.' });
      return;
    }

    const foundOrder = orders.find(
      (o: any) => o.patientDni && o.patientDni.trim() === queryDni
    );

    const foundUser = users.find(
      (u: any) => u.identifier && u.identifier.trim() === queryDni
    );

    if (foundOrder || foundUser) {
      const name = foundOrder?.patientName || foundUser?.name || '';
      const lastName = foundOrder?.patientLastName || foundUser?.lastName || '';
      const birthDate = foundOrder?.patientBirthDate || foundUser?.birthDate || '';
      const email = foundOrder?.patientEmail || foundUser?.email || '';
      const phone = foundOrder?.patientPhone || foundUser?.phone || '';
      const obraSocial = foundOrder?.obraSocial || foundUser?.obraSocial || '';
      const osNumber = foundOrder?.obraSocialNumber || foundUser?.obraSocialNumber || '';
      const dMethod = foundOrder?.deliveryMethod || 'both';

      if (name) setPatientName(name);
      if (lastName) setPatientLastName(lastName);
      if (birthDate) setPatientBirthDate(birthDate);
      if (email) setPatientEmail(email);
      if (phone) setPatientPhone(phone);
      if (obraSocial) setSelectedObraSocial(obraSocial);
      if (osNumber) setObraSocialNumber(osNumber);
      if (dMethod) setDeliveryMethod(dMethod as any);

      setSearchStatus({
        found: true,
        message: `¡Paciente registrado encontrado! Se cargaron los datos de ${name} ${lastName}.`,
      });
    } else {
      setSearchStatus({
        found: false,
        message: `No se encontraron registros previos para el DNI ${queryDni}. Complete los datos del paciente manualmente.`,
      });
    }
  };

  // --- Step 2 Fields: Medication ---
  const [medicationMethod, setMedicationMethod] = useState<'new_manual' | 'upload_photo' | 'past_orders'>('new_manual');
  const [selectedPastOrderId, setSelectedPastOrderId] = useState<string>('');
  
  // A. Manual Carga
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  // Manual Current Input Fields
  const [curNombreComercial, setCurNombreComercial] = useState('');
  const [curDroga, setCurDroga] = useState('');
  const [curMiligramos, setCurMiligramos] = useState('');
  const [curPresentacion, setCurPresentacion] = useState('Comprimidos');
  const [curPresentacionOtra, setCurPresentacionOtra] = useState('');
  const [curUnidadesPorCaja, setCurUnidadesPorCaja] = useState('30');
  const [curCantidadCajas, setCurCantidadCajas] = useState('1');
  const [curDiagnostic, setCurDiagnostic] = useState('');
  const [curComments, setCurComments] = useState('');

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
  const [paymentMethod, setPaymentMethod] = useState<'mp' | 'transfer' | 'cash_desk'>(
    isThirdPartyUser ? 'cash_desk' : 'mp'
  );
  const [paymentAmount, setPaymentAmount] = useState(
    currentTenant?.pricePerPrescription ? currentTenant.pricePerPrescription.toString() : '10000'
  );
  
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

  // Synchronize initialName and initialLastName when props update (only if not isThirdPartyUser)
  useEffect(() => {
    if (!isThirdPartyUser && (!currentUser || currentUser.role === 'paciente')) {
      if (initialName && !patientName) setPatientName(initialName);
      if (initialLastName && !patientLastName) setPatientLastName(initialLastName);
    }
  }, [initialName, initialLastName, isThirdPartyUser, currentUser]);

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
      if (lastOrder.deliveryMethod) {
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
    if (!draftRestored && patientOrders && patientOrders.length > 0) {
      setMedicationMethod('past_orders');
    }
  }, [patientOrders.length, draftRestored]);

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

  // Calculate costs based on medications count
  useEffect(() => {
    const itemsCount = medicationItems.length;
    const photosCount = medicationPhotos.length;
    const count = (itemsCount + photosCount) > 0 ? (itemsCount + photosCount) : 1;

    const basePrice = currentTenant?.pricePerPrescription || 10000;
    const calculated = Math.max(1, Math.ceil(count / 2)) * basePrice;
    setPaymentAmount(calculated.toString());
  }, [selectedObraSocial, medicationItems.length, medicationPhotos.length, currentTenant]);

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

  // --- Draft Restoration, Persistence, and Reset Handlers ---

  // 1. Restore draft on mount
  useEffect(() => {
    if (isThirdPartyUser) return;

    const draft = loadDraft();
    if (draft) {
      if (draft.step && draft.step !== 'confirmation') {
        setStep(draft.step);
      }
      if (draft.patientDni) setPatientDni(draft.patientDni);
      if (draft.patientName) setPatientName(draft.patientName);
      if (draft.patientLastName) setPatientLastName(draft.patientLastName);
      if (draft.patientBirthDate) setPatientBirthDate(draft.patientBirthDate);
      if (draft.patientEmail) setPatientEmail(draft.patientEmail);
      if (draft.patientPhone) setPatientPhone(draft.patientPhone);
      if (draft.patientCity) setPatientCity(draft.patientCity);
      if (draft.patientProvince) setPatientProvince(draft.patientProvince);
      if (draft.deliveryMethod) setDeliveryMethod(draft.deliveryMethod);
      if (draft.selectedObraSocial) setSelectedObraSocial(draft.selectedObraSocial);
      if (draft.obraSocialNumber) setObraSocialNumber(draft.obraSocialNumber);
      if (draft.selectedCardId) setSelectedCardId(draft.selectedCardId);

      if (draft.medicationMethod) setMedicationMethod(draft.medicationMethod);
      if (draft.selectedPastOrderId) setSelectedPastOrderId(draft.selectedPastOrderId);
      if (Array.isArray(draft.medicationItems) && draft.medicationItems.length > 0) {
        setMedicationItems(draft.medicationItems);
      }
      if (Array.isArray(draft.medicationPhotos) && draft.medicationPhotos.length > 0) {
        setMedicationPhotos(draft.medicationPhotos);
      }
      if (draft.diagnostic) setDiagnostic(draft.diagnostic);
      if (draft.comments) setComments(draft.comments);
      if (draft.lastConsultationTime) setLastConsultationTime(draft.lastConsultationTime);
      if (draft.lastConsultationDoctor) setLastConsultationDoctor(draft.lastConsultationDoctor);

      if (typeof draft.consentAge === 'boolean') setConsentAge(draft.consentAge);
      if (typeof draft.consentTerms === 'boolean') setConsentTerms(draft.consentTerms);
      if (typeof draft.consentInformed === 'boolean') setConsentInformed(draft.consentInformed);
      if (typeof draft.consentSworn === 'boolean') setConsentSworn(draft.consentSworn);

      if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
      if (draft.paymentAmount) setPaymentAmount(draft.paymentAmount);

      setDraftRestored(true);
    }
  }, []);

  // 2. Auto-Save Draft on state change
  useEffect(() => {
    if (isThirdPartyUser || step === 'confirmation') return;

    const hasMeaningfulData =
      step !== 'info' ||
      patientDni.trim() ||
      patientName.trim() ||
      medicationItems.length > 0 ||
      medicationPhotos.length > 0;

    if (hasMeaningfulData) {
      saveDraft({
        step,
        patientDni,
        patientName,
        patientLastName,
        patientBirthDate,
        patientEmail,
        patientPhone,
        patientCity,
        patientProvince,
        deliveryMethod,
        selectedObraSocial,
        obraSocialNumber,
        selectedCardId,
        medicationMethod,
        selectedPastOrderId,
        medicationItems,
        medicationPhotos,
        diagnostic,
        comments,
        lastConsultationTime,
        lastConsultationDoctor,
        consentAge,
        consentTerms,
        consentInformed,
        consentSworn,
        paymentMethod,
        paymentAmount,
      });
    }
  }, [
    isThirdPartyUser,
    step,
    patientDni,
    patientName,
    patientLastName,
    patientBirthDate,
    patientEmail,
    patientPhone,
    patientCity,
    patientProvince,
    deliveryMethod,
    selectedObraSocial,
    obraSocialNumber,
    selectedCardId,
    medicationMethod,
    selectedPastOrderId,
    medicationItems,
    medicationPhotos,
    diagnostic,
    comments,
    lastConsultationTime,
    lastConsultationDoctor,
    consentAge,
    consentTerms,
    consentInformed,
    consentSworn,
    paymentMethod,
    paymentAmount,
    saveDraft,
  ]);

  // 3. Reset form and discard draft
  const handleResetForm = () => {
    clearDraft();
    setDraftRestored(false);
    setStep('info');
    if (!isThirdPartyUser) {
      setPatientDni(titularData.dni);
      setPatientName(titularData.name);
      setPatientLastName(titularData.lastName);
      setPatientBirthDate(titularData.birthDate);
      setPatientEmail(titularData.email);
      setPatientPhone(titularData.phone);
      setSelectedObraSocial(titularData.obraSocial);
      setObraSocialNumber(titularData.obraSocialNumber);
    } else {
      setPatientDni('');
      setPatientName('');
      setPatientLastName('');
      setPatientBirthDate('');
      setPatientEmail('');
      setPatientPhone('');
      setSelectedObraSocial('');
      setObraSocialNumber('');
    }
    setSelectedCardId('titular');
    setMedicationMethod('new_manual');
    setSelectedPastOrderId('');
    setMedicationItems([]);
    setMedicationPhotos([]);
    setDiagnostic('');
    setComments('');
    setLastConsultationTime('');
    setLastConsultationDoctor('');
    setPaymentReceipt(null);
    setMpPaymentApproved(false);
    setError(null);
  };

  // --- File Conversion and drag & drop handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'medication' | 'payment') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      compressImageAndGetBase64(file).then((base64String) => {
        if (target === 'medication') {
          setMedicationPhotos(prev => [...prev, { url: base64String, name: file.name }]);
        } else {
          setPaymentReceipt({ url: base64String, name: file.name });
          setError(null);
        }
      }).catch((err) => {
        console.error('Error procesando imagen:', err);
        setError('Error al procesar la imagen. Intente nuevamente.');
      });
    }
  };

  // --- Action Handlers ---

  const validateStep1 = (): boolean => {
    setError(null);
    const errors: typeof fieldErrors = {};

    const cleanDni = patientDni.trim();
    if (!cleanDni) {
      errors.patientDni = 'El número de DNI es obligatorio.';
    } else if (cleanDni.length < 6 || cleanDni.length > 10) {
      errors.patientDni = 'El número de DNI debe contener entre 6 y 10 dígitos.';
    }

    if (!patientName.trim()) {
      errors.patientName = 'El nombre del paciente es obligatorio.';
    }
    if (!patientLastName.trim()) {
      errors.patientLastName = 'El apellido del paciente es obligatorio.';
    }

    if (!patientBirthDate) {
      errors.patientBirthDate = 'La fecha de nacimiento es obligatoria.';
    } else {
      const age = calculateAge(patientBirthDate);
      if (age < 18 && selectedCardId === 'titular') {
        errors.patientBirthDate = 'Debe ser mayor de edad (18 años o más) para ser titular de la solicitud.';
      }
    }

    // Email is optional, but if entered, validate it
    if (patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      errors.patientEmail = 'Por favor ingrese un correo electrónico válido o déjelo en blanco.';
    }

    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (!patientPhone.trim() || cleanPhone.length < 8) {
      errors.patientPhone = 'Por favor ingrese un número de WhatsApp / Celular válido (mínimo 8 dígitos).';
    }

    if (!selectedObraSocial) {
      errors.selectedObraSocial = 'Debe seleccionar su cobertura médica u obra social.';
    } else {
      const selectedOs = OBRA_SOCIAL_OPTIONS.find(o => o.name === selectedObraSocial);
      if (selectedOs?.requiresNumber && !obraSocialNumber.trim()) {
        errors.obraSocialNumber = `El número de afiliado es obligatorio para ${selectedObraSocial}.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Faltan datos obligatorios del paciente o cobertura. Por favor haga clic en "Editar" en la tarjeta seleccionada para completarlos.');
      setTimeout(() => {
        document.getElementById('main-error-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const goToMedication = () => {
    if (validateStep1()) {
      setStep('medication');
    }
  };

  const addManualMedication = () => {
    setError(null);
    const errors: typeof fieldErrors = {};

    if (!curNombreComercial.trim()) {
      errors.curNombreComercial = 'Ingrese el nombre comercial de la medicación.';
    }

    const count = parseInt(curCantidadCajas);
    if (!curCantidadCajas || isNaN(count) || count <= 0) {
      errors.curCantidadCajas = 'Seleccione una cantidad de cajas o envases válida (mayor a 0).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      setError('Por favor complete el nombre comercial y la cantidad de cajas o envases de la medicación.');
      return;
    }

    setFieldErrors(prev => ({
      ...prev,
      curNombreComercial: undefined,
      curCantidadCajas: undefined,
      medicationList: undefined
    }));

    const finalPresentacion = curPresentacion === 'Otra' 
      ? (curPresentacionOtra.trim() || 'Otra') 
      : curPresentacion;

    const newItem: MedicationItem = {
      nombreComercial: curNombreComercial.trim(),
      miligramos: curMiligramos.trim(),
      presentacion: finalPresentacion,
      unidadesPorCaja: curUnidadesPorCaja ? parseInt(curUnidadesPorCaja) : undefined,
      cantidadCajas: parseInt(curCantidadCajas) || 1,
      diagnostic: curDiagnostic.trim(),
      comments: curComments.trim(),
    };

    setMedicationItems(prev => [...prev, newItem]);
    
    // Clear inputs
    setCurNombreComercial('');
    setCurMiligramos('');
    setCurPresentacion('Comprimidos');
    setCurPresentacionOtra('');
    setCurUnidadesPorCaja('30');
    setCurCantidadCajas('1');
    setCurDiagnostic('');
    setCurComments('');
  };

  const removeMedicationItem = (index: number) => {
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep2 = (): boolean => {
    setError(null);
    if (medicationMethod === 'new_manual') {
      if (medicationItems.length === 0 && medicationPhotos.length === 0) {
        setFieldErrors(prev => ({ ...prev, medicationList: 'Aún no ha ingresado ningún medicamento al carrito. Complete los datos y presione "Agregar al carrito" para continuar.' }));
        setError('Aún no ha ingresado ningún medicamento al carrito. Por favor complete los datos del medicamento y presione "Agregar al carrito" para continuar.');
        setTimeout(() => {
          document.getElementById('main-error-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return false;
      }
    } else if (medicationMethod === 'upload_photo') {
      if (medicationPhotos.length === 0 && medicationItems.length === 0) {
        setFieldErrors(prev => ({ ...prev, medicationList: 'Aún no ha adjuntado ninguna foto de su receta anterior o medicación. Seleccione o tome una foto para continuar.' }));
        setError('Aún no ha adjuntado ninguna foto de su receta anterior o medicación. Por favor seleccione o tome una foto para continuar.');
        setTimeout(() => {
          document.getElementById('main-error-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return false;
      }
    } else if (medicationMethod === 'past_orders') {
      if (medicationItems.length === 0 && medicationPhotos.length === 0) {
        if (patientOrders.length === 0) {
          setError('Aún no ha realizado solicitudes previamente, debe ingresar una nueva carga manual o adjuntar una foto.');
          return false;
        } else {
          setError('Debe seleccionar una de sus solicitudes anteriores y presionar "Repetir" para cargar la medicación, o elegir otro Método de Carga.');
          return false;
        }
      }
    } else {
      if (medicationItems.length === 0 && medicationPhotos.length === 0) {
        setError('Debe cargar al menos un medicamento o foto de receta para continuar.');
        return false;
      }
    }

    setFieldErrors(prev => ({ ...prev, medicationList: undefined }));
    return true;
  };

  const goToPayment = () => {
    if (validateStep2()) {
      isOficio ? setStep('confirmation') : setStep('payment');
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

    setMpProcessing(true);

    try {
      // Build medication summary text
      const mappedMedicationMethod = medicationItems.length > 0 ? 'manual' : 'foto';
      let summaryText = '';
      if (medicationItems.length > 0) {
        summaryText = medicationItems.map(item => 
          `- ${item.nombreComercial}${item.miligramos ? ` (${item.miligramos})` : ''}${item.diagnostic ? ` [Diag: ${item.diagnostic}]` : ''}, Pres: ${item.presentacion}${item.unidadesPorCaja ? `, ${item.unidadesPorCaja} u/caja` : ''} x ${item.cantidadCajas} cajas`
        ).join('\n');
        if (medicationPhotos.length > 0) {
          summaryText += `\n- Fotos de envases adjuntas: ${medicationPhotos.length} archivos.`;
        }
      } else {
        summaryText = `Carga por Foto (${medicationPhotos.length} adjuntos). Medicamentos visibles en el archivo adjunto.`;
      }

      const aggregatedDiagnostic = diagnostic.trim() || medicationItems.map(i => i.diagnostic).filter(Boolean).join(', ') || 'Sin especificar';

      const isForDependent = !isThirdPartyUser && selectedCardId !== 'titular';
      const selectedDep = isForDependent ? dependents.find((d) => d.id === selectedCardId) : null;
      const dependentRelationship = selectedDep?.relationship || (isForDependent ? 'A Cargo' : undefined);
      const requestedByTitularName = isForDependent ? `${titularData.name} ${titularData.lastName}`.trim() : undefined;
      const requestedByTitularDni = isForDependent ? titularData.dni : undefined;
      const requestedByTitularEmail = isForDependent ? titularData.email : undefined;
      const requestedByTitularPhone = isForDependent ? titularData.phone : undefined;

      // 1. Create order in database with pending payment status
      const fullOrderPayload = {
        patientName: patientName.trim(),
        patientLastName: patientLastName.trim(),
        patientDni: patientDni.trim(),
        patientBirthDate,
        patientEmail: patientEmail.trim(),
        patientPhone: patientPhone.trim(),
        patientCity: patientCity.trim() || undefined,
        patientProvince: patientProvince.trim() || undefined,
        deliveryMethod,
        obraSocial: selectedObraSocial,
        obraSocialNumber: obraSocialNumber.trim() || undefined,
        isForDependent,
        dependentRelationship,
        requestedByTitularName,
        requestedByTitularDni,
        requestedByTitularEmail,
        requestedByTitularPhone,
        medicationMethod: mappedMedicationMethod,
        medicationText: summaryText,
        medicationItems,
        diagnostic: aggregatedDiagnostic,
        comments: comments.trim() || undefined,
        medicationPhotos,
        medicationPhotoUrl: medicationPhotos.length > 0 ? medicationPhotos[0].url : null,
        medicationPhotoName: medicationPhotos.length > 0 ? medicationPhotos[0].name : null,
        paymentMethod: 'mp',
        paymentAmount,
        paymentDate: new Date().toISOString(),
        paymentStatus: 'pending',
        status: 'Pendiente',
        createdByOperatorName: isThirdPartyUser ? (currentUser?.name ? `${currentUser.name} ${currentUser.lastName || ''}`.trim() : 'Personal Médico') : undefined,
        lastConsultationTime: lastConsultationTime || undefined,
        lastConsultationDoctor: lastConsultationDoctor || undefined,
        consentsAccepted: {
          isOfAge: consentAge,
          termsAccepted: consentTerms,
          informedConsentAccepted: consentInformed,
          swornStatementAccepted: consentSworn,
          acceptedAt: new Date().toISOString(),
          termsVersion: TERMS_VERSION
        }
      };

      const orderId = await onSubmitOrder(fullOrderPayload);

      // 2. Create Mercado Pago checkout preference using generated orderId
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          patientName: `${patientName} ${patientLastName}`.trim(),
          patientEmail,
          patientDni,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con Mercado Pago');
      }

      if (data.initPoint) {
        // 3. Redirect to official Mercado Pago Checkout
        window.location.href = data.initPoint;
      } else {
        throw new Error('No se pudo generar el enlace de cobro oficial.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con Mercado Pago');
      setMpProcessing(false);
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final payment checks
    if (paymentMethod !== 'cash_desk') {
      if (paymentMethod === 'mp' && !mpPaymentApproved) {
        // Direct execution of Mercado Pago payment redirect
        processMercadoPagoPayment();
        return;
      }
      if (paymentMethod === 'transfer' && !paymentReceipt) {
        setFieldErrors(prev => ({ ...prev, paymentReceipt: 'Debe adjuntar el comprobante de transferencia bancaria para continuar.' }));
        setError('Debe adjuntar el comprobante de transferencia bancaria para poder enviar la solicitud.');
        setTimeout(() => {
          document.getElementById('payment-receipt-dropzone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
    }

    setSubmitting(true);

    // Build human readable medication summary
    const mappedMedicationMethod = medicationItems.length > 0 ? 'manual' : 'foto';
    let summaryText = '';
    if (medicationItems.length > 0) {
      summaryText = medicationItems.map(item => 
        `- ${item.nombreComercial}${item.miligramos ? ` (${item.miligramos})` : ''}${item.diagnostic ? ` [Diag: ${item.diagnostic}]` : ''}, Pres: ${item.presentacion}${item.unidadesPorCaja ? `, ${item.unidadesPorCaja} u/caja` : ''} x ${item.cantidadCajas} cajas`
      ).join('\n');
      if (medicationPhotos.length > 0) {
        summaryText += `\n- Fotos de envases adjuntas: ${medicationPhotos.length} archivos.`;
      }
    } else {
      summaryText = `Carga por Foto (${medicationPhotos.length} adjuntos). Medicamentos visibles en el archivo adjunto.`;
    }

    const simulatedCashReceipt = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23ecfdf5"/><rect x="30" y="15" width="240" height="170" rx="8" fill="%23ffffff" stroke="%2310b981" stroke-width="2"/><circle cx="150" cy="60" r="22" fill="%23d1fae5"/><path d="M142,60 L148,66 L158,54" fill="none" stroke="%2310b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="150" y="110" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23065f46" text-anchor="middle">MARCADA COMO COBRADA</text><text x="150" y="135" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2310b981" text-anchor="middle">EFECTIVO / CAJA</text><text x="150" y="160" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">Registrado en mesa de entrada / profesional</text></svg>`;

    const aggregatedDiagnostic = diagnostic.trim() || medicationItems.map(i => i.diagnostic).filter(Boolean).join(', ') || 'Sin especificar';

    const isForDependent = !isThirdPartyUser && selectedCardId !== 'titular';
    const selectedDep = isForDependent ? dependents.find((d) => d.id === selectedCardId) : null;
    const dependentRelationship = selectedDep?.relationship || (isForDependent ? 'A Cargo' : undefined);
    const requestedByTitularName = isForDependent ? `${titularData.name} ${titularData.lastName}`.trim() : undefined;
    const requestedByTitularDni = isForDependent ? titularData.dni : undefined;
    const requestedByTitularEmail = isForDependent ? titularData.email : undefined;
    const requestedByTitularPhone = isForDependent ? titularData.phone : undefined;

    // Build full order object mapping to backend fields
    const fullOrderPayload = {
      patientName: patientName.trim(),
      patientLastName: patientLastName.trim(),
      patientDni: patientDni.trim(),
      patientBirthDate,
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      patientCity: patientCity.trim() || undefined,
      patientProvince: patientProvince.trim() || undefined,
      deliveryMethod,
      obraSocial: selectedObraSocial,
      obraSocialNumber: obraSocialNumber.trim() || undefined,
      isForDependent,
      dependentRelationship,
      requestedByTitularName,
      requestedByTitularDni,
      requestedByTitularEmail,
      requestedByTitularPhone,
      medicationMethod: mappedMedicationMethod,
      medicationText: summaryText,
      medicationItems,
      diagnostic: aggregatedDiagnostic,
      comments: comments.trim() || undefined,
      medicationPhotos,
      medicationPhotoUrl: medicationPhotos.length > 0 ? medicationPhotos[0].url : null,
      medicationPhotoName: medicationPhotos.length > 0 ? medicationPhotos[0].name : null,
      paymentMethod,
      
      // Payment details
      paymentReceiptUrl: paymentMethod === 'cash_desk'
        ? simulatedCashReceipt
        : (paymentReceipt ? paymentReceipt.url : null),
      paymentReceiptName: paymentMethod === 'cash_desk'
        ? 'cobrado_ventanilla.png'
        : (paymentReceipt ? paymentReceipt.name : null),
      paymentAmount,
      paymentDate: new Date().toISOString(),
      paymentId: paymentMethod === 'cash_desk'
        ? `EFECTIVO-${Math.floor(100000 + Math.random() * 900000)}`
        : (paymentMethod === 'mp' ? mpTransactionId : `TRANS-${Math.floor(100000 + Math.random() * 900000)}`),
      paymentStatus: paymentAmount === '0' ? 'exempt' : 'approved',
      createdByOperatorName: isThirdPartyUser ? (currentUser?.name ? `${currentUser.name} ${currentUser.lastName || ''}`.trim() : 'Personal Médico') : undefined,

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
      trackCompletePrescription({
        orderId,
        value: paymentAmount || currentTenant?.pricePerPrescription || 10000,
        currency: 'ARS',
        obraSocial: selectedObraSocial,
        deliveryMethod,
      });
      clearDraft();
      setDraftRestored(false);
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
    const matchedOrder = returnedOrder || orders.find((o: any) => o.id === createdOrderId);
    const displayPatientName = patientName || matchedOrder?.patientName || currentUser?.name || 'Paciente';
    const displayPatientLastName = patientLastName || matchedOrder?.patientLastName || currentUser?.lastName || '';
    const displayPatientDni = patientDni || matchedOrder?.patientDni || currentUser?.identifier || '';
    const displayObraSocial = selectedObraSocial || matchedOrder?.obraSocial || currentUser?.obraSocial || 'Particular';
    const displayObraSocialNumber = obraSocialNumber || matchedOrder?.obraSocialNumber || currentUser?.obraSocialNumber || '';
    const displayDeliveryMethod = deliveryMethod || matchedOrder?.deliveryMethod || 'both';
    const displayMedicationItems = (medicationItems && medicationItems.length > 0)
      ? medicationItems
      : (matchedOrder?.medicationItems || []);
    const displayMedicationPhotos = (medicationPhotos && medicationPhotos.length > 0)
      ? medicationPhotos
      : (matchedOrder?.medicationPhotos || []);
    const displayMedicationText = matchedOrder?.medicationText || '';
    const displayDiagnostic = diagnostic || matchedOrder?.diagnostic || '';
    const displayComments = comments || matchedOrder?.comments || '';
    const displayPaymentAmount = paymentAmount || matchedOrder?.paymentAmount || '';

    const isForDependent = matchedOrder?.isForDependent ?? (!isThirdPartyUser && selectedCardId !== 'titular');
    const selectedDep = isForDependent ? dependents.find((d) => d.id === selectedCardId) : null;
    const dependentRelationship = matchedOrder?.dependentRelationship || selectedDep?.relationship || (isForDependent ? 'A Cargo' : undefined);
    const requestedByTitularName = matchedOrder?.requestedByTitularName || (isForDependent ? `${titularData.name} ${titularData.lastName}`.trim() : undefined);
    const requestedByTitularDni = matchedOrder?.requestedByTitularDni || (isForDependent ? titularData.dni : undefined);

    const handleCopyOrderId = () => {
      if (createdOrderId) {
        navigator.clipboard.writeText(createdOrderId);
        setCopiedOrderId(true);
        setTimeout(() => setCopiedOrderId(false), 2500);
      }
    };

    const handlePrint = () => {
      window.print();
    };

    return (
      <>
        {/* Printable Official Receipt Area (Hidden on screen, rendered exclusively during print/PDF) */}
        <div id="official-receipt-print-area" className="hidden print:block">
          <OfficialOrderReceipt
            orderId={createdOrderId || 'ORD-CONFIRMADO'}
            createdAt={matchedOrder?.createdAt || new Date().toISOString()}
            patientName={displayPatientName}
            patientLastName={displayPatientLastName}
            patientDni={displayPatientDni}
            patientBirthDate={patientBirthDate || matchedOrder?.patientBirthDate}
            patientEmail={patientEmail || matchedOrder?.patientEmail}
            patientPhone={patientPhone || matchedOrder?.patientPhone}
            obraSocial={displayObraSocial}
            obraSocialNumber={displayObraSocialNumber}
            deliveryMethod={displayDeliveryMethod}
            medicationItems={displayMedicationItems}
            medicationPhotos={displayMedicationPhotos}
            medicationText={displayMedicationText}
            diagnostic={displayDiagnostic}
            comments={displayComments}
            paymentAmount={displayPaymentAmount}
            paymentMethod={paymentMethod}
            paymentId={matchedOrder?.paymentId || (paymentMethod === 'cash_desk' ? 'Cobro en ventanilla' : paymentMethod === 'mp' ? mpTransactionId : 'Transferencia')}
            paymentStatus={matchedOrder?.paymentStatus || 'approved'}
            status={matchedOrder?.status || 'En revisión'}
            isForDependent={matchedOrder?.isForDependent ?? isForDependent}
            dependentRelationship={matchedOrder?.dependentRelationship ?? dependentRelationship}
            requestedByTitularName={matchedOrder?.requestedByTitularName ?? requestedByTitularName}
            requestedByTitularDni={matchedOrder?.requestedByTitularDni ?? requestedByTitularDni}
          />
        </div>

        {/* Interactive Screen View */}
        <div className="no-print screen-only-view max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden animate-scaleUp">
          {/* Formal Header */}
          <div className="bg-[#0141BC] p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Trámite Ingresado Correctamente</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Solicitud Registrada con Éxito
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  Su solicitud ha ingresado formalmente al circuito de auditoría médica.
                </p>
              </div>

              {/* Official Code Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:px-4 sm:py-3 shrink-0 flex items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-1 shadow-inner">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Código de Gestión</span>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black font-mono tracking-wider text-emerald-300">
                    {createdOrderId || 'ORD-CONFIRMADO'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none ${
                      copiedOrderId 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : 'bg-white/15 hover:bg-white/25 text-white active:scale-95'
                    }`}
                    title="Copiar código de seguimiento"
                  >
                    {copiedOrderId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-slate-200" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* 3-Step Process Stepper */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">1. Registrada</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">Completado</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-7 w-7 rounded-full bg-[#1661E1] text-white flex items-center justify-center text-xs font-bold shadow-xs ring-4 ring-[#1E6EFB]/20 animate-pulse">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">2. Auditoría Médica</p>
                    <p className="text-[10px] text-[#1661E1] font-bold">En evaluación</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">3. Emisión y Receta</p>
                    <p className="text-[10px] text-slate-400 font-medium">Pendiente</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1661E1]" />
                  <span>Resumen del Trámite</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-semibold font-mono">
                  {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Paciente</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">{displayPatientName} {displayPatientLastName}</p>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">DNI: {displayPatientDni || 'S/D'}</p>
                    {(matchedOrder?.isForDependent ?? isForDependent) && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded">
                        Familiar a cargo ({matchedOrder?.dependentRelationship || dependentRelationship || 'A cargo'})
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Cobertura</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">{displayObraSocial || 'Particular'}</p>
                    {displayObraSocialNumber && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Afiliado N° {displayObraSocialNumber}</p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Entrega y Notificación</p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {displayDeliveryMethod === 'both' ? 'WhatsApp y Email' : displayDeliveryMethod === 'whatsapp' ? 'WhatsApp' : 'Correo Electrónico'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {patientPhone || patientEmail || 'Canal confirmado'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Arancel de Gestión</p>
                    <p className="font-mono font-extrabold text-slate-900 text-sm mt-0.5">
                      {paymentAmount ? `$${paymentAmount} ARS` : 'Bonificado'}
                    </p>
                    <p className="text-[11px] text-[#14BE99] font-bold mt-0.5 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Pago Confirmado
                    </p>
                  </div>
                </div>

                {/* Medication Summary */}
                <div className="border-t border-slate-100 pt-3.5 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">
                      Medicación Solicitada {displayMedicationItems.length > 0 ? `(${displayMedicationItems.length})` : ''}
                    </p>
                    {displayMedicationItems.length > 0 && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        {displayMedicationItems.reduce((acc: number, it: any) => acc + (Number(it.cantidadCajas) || 1), 0)}{' '}
                        {displayMedicationItems.reduce((acc: number, it: any) => acc + (Number(it.cantidadCajas) || 1), 0) === 1 ? 'caja en total' : 'cajas en total'}
                      </span>
                    )}
                  </div>
                  
                  {/* Manual Medication Items */}
                  {displayMedicationItems.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {displayMedicationItems.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="bg-slate-50/90 hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 flex flex-col justify-between gap-2.5 transition-all shadow-3xs text-left"
                        >
                          {/* Header: Icon, Name, Active Ingredient & Quantity */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#1661E1] border border-blue-100/80 flex items-center justify-center shrink-0 mt-0.5">
                                <Pill className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                                    #{idx + 1}
                                  </span>
                                  {item.droga && item.droga.toLowerCase() !== item.nombreComercial.toLowerCase() && (
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      ({item.droga})
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-extrabold text-slate-900 text-sm leading-snug break-words">
                                  {item.nombreComercial}
                                </h5>
                              </div>
                            </div>

                            <span className="bg-white border border-slate-250 text-[#0141BC] font-extrabold text-[11px] px-2.5 py-1 rounded-xl shrink-0 shadow-3xs flex items-center gap-1">
                              <span>{item.cantidadCajas || 1}</span>
                              <span className="text-slate-600 font-semibold">{item.cantidadCajas === 1 ? 'caja' : 'cajas'}</span>
                            </span>
                          </div>

                          {/* Specification Badges (Dosis, Presentación, Unidades) */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {item.miligramos && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-3xs">
                                <span className="text-slate-400 font-normal">Dosis:</span>
                                <span className="text-[#0141BC] font-extrabold">{item.miligramos}</span>
                              </span>
                            )}
                            {item.presentacion && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-3xs">
                                <span className="text-slate-400 font-normal">Formato:</span>
                                <span>{item.presentacion}</span>
                              </span>
                            )}
                            {item.unidadesPorCaja !== undefined && item.unidadesPorCaja !== null && Number(item.unidadesPorCaja) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-3xs">
                                <span className="text-slate-400 font-normal">Envase:</span>
                                <span>x {item.unidadesPorCaja} u.</span>
                              </span>
                            )}
                          </div>

                          {/* Diagnostic / Comments */}
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
                  )}

                  {/* Free text medication if loaded without structured items */}
                  {displayMedicationText && displayMedicationItems.length === 0 && displayMedicationPhotos.length === 0 && (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-left space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Pill className="h-4 w-4 text-[#1661E1]" />
                        <span>Prescripción cargada en texto libre</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap pl-6">{displayMedicationText}</p>
                    </div>
                  )}

                  {/* Overall Clinical Context / Order Diagnostic */}
                  {(displayDiagnostic && displayDiagnostic !== 'Sin especificar' && !displayMedicationItems.some(i => (i.diagnostic || i.diagnostico) === displayDiagnostic)) || (displayComments && !displayMedicationItems.some(i => i.comments === displayComments)) ? (
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 text-left space-y-1.5 mt-2">
                      {displayDiagnostic && displayDiagnostic !== 'Sin especificar' && !displayMedicationItems.some(i => (i.diagnostic || i.diagnostico) === displayDiagnostic) && (
                        <div className="text-[11px] flex items-center gap-1.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Diagnóstico Clínico General:</span>
                          <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">{displayDiagnostic}</span>
                        </div>
                      )}
                      {displayComments && !displayMedicationItems.some(i => i.comments === displayComments) && (
                        <div className="text-[11px] flex items-start gap-1.5 text-slate-600">
                          <span className="font-bold text-slate-400 uppercase tracking-wide text-[10px] shrink-0">Aclaraciones Generales:</span>
                          <span className="font-medium italic text-slate-700">"{displayComments}"</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Attached Medication Photos/Documents */}
                  {displayMedicationPhotos.length > 0 ? (
                    <div className="mt-3 text-left">
                      <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider text-left">
                        Documentación / Fotos de Envases o Recetas Adjuntas ({displayMedicationPhotos.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {displayMedicationPhotos.map((photo, i) => (
                          <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
                            <div className="h-10 w-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                              {photo.url.startsWith('data:application/pdf') || photo.name.toLowerCase().endsWith('.pdf') ? (
                                <FileText className="h-5 w-5 text-rose-500" />
                              ) : (
                                <img src={photo.url} alt="Adjunto" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="truncate text-left flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-[11px] truncate">{photo.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Camera className="h-3 w-3 text-blue-500" />
                                <span>Archivo #{i + 1}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    displayMedicationItems.length === 0 && !displayMedicationText && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                        <Camera className="h-4 w-4 text-[#1661E1] shrink-0" />
                        <span>Medicación cargada mediante imagen/documentación adjunta.</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Compact Formal Institutional Note */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
              <Clock className="h-4 w-4 text-[#1661E1] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-slate-800">Plazo de auditoría y emisión:</strong> Las solicitudes se evalúan en un plazo de hasta 24 hs hábiles. Una vez aprobada por el médico matriculado, recibirá la receta digital oficial con firma electrónica y código QR por el medio seleccionado.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <button
                id="btn-confirm-finish"
                type="button"
                onClick={() => onSuccess(createdOrderId || '')}
                className="w-full bg-[#0141BC] hover:bg-[#1661E1] text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-[0.99]"
              >
                <span>Ir a Mis Solicitudes</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Imprimir / Guardar Comprobante Oficial</span>
                </button>

                <a
                  href={`https://wa.me/15554511065?text=${encodeURIComponent(`Hola! Acabo de ingresar la solicitud con Nro de Gestión ${createdOrderId}. Quisiera hacer una consulta.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2.5 px-4 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-2 text-xs text-center"
                >
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`w-full ${isThirdPartyUser ? 'max-w-none shadow-none border-0 rounded-none bg-white' : 'max-w-6xl mx-auto bg-white rounded-none sm:rounded-3xl shadow-none border-0 sm:border border-slate-150 sm:border-slate-100'} overflow-hidden animate-scaleUp`}>
      {/* Brand Header */}
      <div className="bg-[#0141BC] text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden">
        <div className="relative">
          <span className="text-[10px] font-bold uppercase bg-[#1661E1]/40 px-2.5 py-0.5 rounded-full text-white border border-white/20">
            {isOficio ? 'Carga de Solicitud para Paciente' : 'Formulario '}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 flex items-center gap-1.5">
            {isOficio ? 'Nueva Solicitud de Renovación' : 'Renovación de Medicación Crónica'}
          </h2>
          <p className="text-xs text-blue-100 font-medium">
            {isOficio ? 'Ingrese los datos del paciente para generar la solicitud' : 'Complete paso a paso su trámite digital'}
          </p>
        </div>
        <HeartHandshake className="h-10 w-10 text-white/80 hidden sm:block stroke-[1.5]" />
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/50 py-2.5 sm:py-3 text-center text-[10px] sm:text-[11px] font-bold">
        <div 
          onClick={() => setStep('info')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'info' ? 'text-[#1661E1]' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'info' 
              ? 'bg-[#1661E1] text-white shadow' 
              : 'bg-[#1661E1]/10 text-[#1661E1] border border-[#1661E1]/20'
          }`}>1</span>
          <span className="hidden sm:inline">Información Previa</span>
          <span className="sm:hidden">Info</span>
        </div>

        <div 
          onClick={() => {
            setStep('identification');
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'identification' ? 'text-[#1661E1]' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'identification' 
              ? 'bg-[#1661E1] text-white shadow' 
              : step !== 'info' ? 'bg-[#1661E1]/10 text-[#1661E1] border border-[#1661E1]/20' : 'bg-slate-200 text-slate-400'
          }`}>2</span>
          <span className="hidden sm:inline">Identificación</span>
          <span className="sm:hidden">Datos</span>
        </div>

        <div 
          onClick={() => {
            if (patientName && patientLastName && patientDni && selectedObraSocial) {
              setStep('medication');
            }
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
            step === 'medication' ? 'text-[#1661E1]' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'medication' 
              ? 'bg-[#1661E1] text-white shadow' 
              : step === 'payment' ? 'bg-[#1661E1]/10 text-[#1661E1] border border-[#1661E1]/20' : 'bg-slate-200 text-slate-400'
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
            step === 'payment' ? 'text-[#1661E1]' : 'text-slate-400'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'payment' ? 'bg-[#1661E1] text-white shadow' : 'bg-slate-200 text-slate-400'
          }`}>4</span>
          <span className="hidden sm:inline">Pagar y Enviar Solicitud</span>
          <span className="sm:hidden">Pago</span>
        </div>
      </div>

      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-[#1661E1]/10 border border-[#1661E1]/20 text-[#0141BC] rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-[#1661E1] shrink-0" />
            <span>
              Restauramos tu solicitud en el <strong>paso en el que habías quedado</strong> con tus datos guardados.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetForm}
            className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline shrink-0 cursor-pointer px-2.5 py-1 bg-white/80 hover:bg-white rounded-lg border border-red-200/60 transition-all"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {/* Main Error Box */}
      {error && (
        <div id="main-error-banner" className="mx-6 mt-4 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-900 rounded-xl flex items-start gap-2.5 text-sm shadow-sm animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-950">Atención</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmitAll} className="p-4 sm:p-6" noValidate>
        
        {/* STEP 0: INFO */}
        {step === 'info' && (
          <div className="space-y-6 animate-fadeIn">

            {/* Informative service info block */}
            <div className="bg-[#0F6C7D]/5 p-5 rounded-2xl border border-[#0F6C7D]/20 text-xs text-[#0141BC] leading-relaxed space-y-3 shadow-xs">
              <p className="font-extrabold flex items-center gap-1.5 text-sm text-[#0141BC]">
                <Info className="h-5 w-5 text-[#0F6C7D]" />
                Información del Servicio de Renovación
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700 font-medium">
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
                <strong className="font-black text-red-950">NO está permitido</strong> solicitar psicofármacos (recetas rosas, archivadas, listas de psicotrópicos), opioides, morfina o derivados, ni medicamentos de uso clínico crítico controlado, uso restringido o trámites de excepción. Cualquier pedido de estos productos será <strong className="font-black text-red-950">rechazado automáticamente</strong> sin excepción.
              </p>
            </div>

            <button
              id="btn-confirm-info"
              type="button"
              onClick={() => {
                trackInitiatePrescription('patient_form_info');
                setStep('identification');
              }}
              className="w-full bg-[#1661E1] hover:bg-[#1E6EFB] text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>Iniciar Solicitud</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* STEP 1: IDENTIFICATION */}
        {step === 'identification' && (
          <div className="space-y-6 animate-fadeIn">
            
            {notificationMsg && (
              <div className="bg-[#14BE99]/10 border border-[#14BE99]/30 text-[#0F6C7D] rounded-2xl p-4 text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
                <CheckCircle2 className="h-5 w-5 text-[#14BE99] shrink-0" />
                <span>{notificationMsg}</span>
              </div>
            )}

            {/* CARDS SELECCIÓN DE PACIENTE / PACIENTES A CARGO */}
            {!isThirdPartyUser && (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0141BC] flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-[#1661E1]" />
                      ¿Para quién es la receta?
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Seleccioná la tarjeta del paciente titular o a tu cargo. Podés editar o agregar nuevos familiares.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewDependentModal}
                    className="px-4 py-2.5 bg-[#1661E1] hover:bg-[#0141BC] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Agregar Paciente a Cargo</span>
                  </button>
                </div>

                {/* GRID DE CARDS CON DATOS COMPLETOS Y BOTÓN EDITAR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* CARD TITULAR */}
                  <div
                    onClick={() => handleSelectCard('titular')}
                    className={`relative rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
                      selectedCardId === 'titular'
                        ? 'p-[17px] bg-blue-50/60 border-2 border-[#1661E1] ring-4 ring-[#1E6EFB]/15 shadow-md'
                        : 'p-[18px] bg-white border border-slate-250 hover:border-slate-350 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-[#1661E1]/10 text-[#1661E1] border border-[#1661E1]/20">
                          <User className="h-3.5 w-3.5" />
                          Titular (Yo)
                        </span>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(e, 'titular')}
                            className="px-2 py-1 rounded-lg text-slate-500 hover:text-[#1661E1] hover:bg-[#1661E1]/10 border border-slate-200 hover:border-[#1661E1]/30 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="Editar datos del titular"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#1661E1]" />
                            <span>Editar</span>
                          </button>

                          {selectedCardId === 'titular' && (
                            <span className="h-8 w-8 rounded-full bg-[#14BE99] text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-[#14BE99]/20 animate-scaleUp">
                              <Check className="h-5 w-5 stroke-[3.5]" />
                            </span>
                          )}
                        </div>
                      </div>

                      <h5 className="font-black text-[#0141BC] text-base leading-tight">
                        {titularData.name || 'Titular'} {titularData.lastName || ''}
                      </h5>
                      
                      <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-400 shrink-0">DNI:</span>
                          <span className="font-mono font-bold text-[#0141BC] truncate flex-1 min-w-0 text-right">{titularData.dni || 'Sin registrar'}</span>
                        </div>

                        {titularData.birthDate && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-400 shrink-0">F. Nacimiento:</span>
                            <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{titularData.birthDate}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-400 shrink-0">Obra Social:</span>
                          <span className="font-bold text-[#0F6C7D] truncate flex-1 min-w-0 text-right">{titularData.obraSocial || 'Sin especificar'}</span>
                        </div>

                        {titularData.obraSocialNumber && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-400 shrink-0">Credencial N°:</span>
                            <span className="font-mono font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{titularData.obraSocialNumber}</span>
                          </div>
                        )}

                        {titularData.phone && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-400 shrink-0">WhatsApp:</span>
                            <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{titularData.phone}</span>
                          </div>
                        )}

                        {titularData.email && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-400 shrink-0">Email:</span>
                            <span className="font-medium text-slate-700 truncate flex-1 min-w-0 text-right">{titularData.email}</span>
                          </div>
                        )}

                        {(titularData.city || titularData.province) && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-400 shrink-0">Ciudad/Prov:</span>
                            <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">
                              {titularData.city || '—'}{titularData.province ? `, ${titularData.province}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARDS DEPENDIENTES */}
                  {dependents.map((dep) => {
                    const isSelected = selectedCardId === dep.id;
                    return (
                      <div
                        key={dep.id}
                        onClick={() => handleSelectCard(dep.id)}
                        className={`relative rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'p-[17px] bg-blue-50/60 border-2 border-[#1661E1] ring-4 ring-[#1E6EFB]/15 shadow-md'
                            : 'p-[18px] bg-white border border-slate-250 hover:border-slate-350 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-[#0F6C7D]/10 text-[#0F6C7D] border border-[#0F6C7D]/20">
                              <Heart className="h-3.5 w-3.5" />
                              {dep.relationship || 'A Cargo'}
                            </span>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(e, dep.id)}
                                className="px-2 py-1 rounded-lg text-slate-500 hover:text-[#1661E1] hover:bg-[#1661E1]/10 border border-slate-200 hover:border-[#1661E1]/30 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                title="Editar datos del paciente"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-[#1661E1]" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleRemoveDependentCard(e, dep.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                                title="Eliminar paciente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {isSelected && (
                                <span className="h-8 w-8 rounded-full bg-[#14BE99] text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-[#14BE99]/20 animate-scaleUp">
                                  <Check className="h-5 w-5 stroke-[3.5]" />
                                </span>
                              )}
                            </div>
                          </div>

                          <h5 className="font-black text-[#0141BC] text-base leading-tight">
                            {dep.name} {dep.lastName}
                          </h5>

                          <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-400 shrink-0">DNI:</span>
                              <span className="font-mono font-bold text-[#0141BC] truncate flex-1 min-w-0 text-right">{dep.dni || 'Sin registrar'}</span>
                            </div>

                            {dep.birthDate && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-400 shrink-0">F. Nacimiento:</span>
                                <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{dep.birthDate}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-400 shrink-0">Obra Social:</span>
                              <span className="font-bold text-[#0F6C7D] truncate flex-1 min-w-0 text-right">{dep.obraSocial || 'Sin especif.'}</span>
                            </div>

                            {dep.obraSocialNumber && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-400 shrink-0">Credencial N°:</span>
                                <span className="font-mono font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{dep.obraSocialNumber}</span>
                              </div>
                            )}

                            {dep.phone && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-400 shrink-0">WhatsApp:</span>
                                <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">{dep.phone}</span>
                              </div>
                            )}

                            {dep.email && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-400 shrink-0">Email:</span>
                                <span className="font-medium text-slate-700 truncate flex-1 min-w-0 text-right">{dep.email}</span>
                              </div>
                            )}

                            {(dep.city || dep.province) && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-400 shrink-0">Ciudad/Prov:</span>
                                <span className="font-bold text-slate-700 truncate flex-1 min-w-0 text-right">
                                  {dep.city || '—'}{dep.province ? `, ${dep.province}` : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* BOTÓN NUEVO DEPENDIENTE EN GRID */}
                  <button
                    type="button"
                    onClick={handleOpenNewDependentModal}
                    className="rounded-2xl p-5 border-2 border-dashed border-slate-300 hover:border-[#1661E1] hover:bg-[#1661E1]/5 text-slate-500 hover:text-[#1661E1] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[160px] group shadow-2xs"
                  >
                    <div className="h-10 w-10 rounded-full bg-[#1661E1]/10 text-[#1661E1] group-hover:bg-[#1661E1] group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-slate-700 group-hover:text-[#1661E1]">+ Nuevo Paciente a Cargo</span>
                  </button>
                </div>
              </div>
            )}

            {isThirdPartyUser && (
              <div className="bg-[#0F6C7D]/5 border border-[#0F6C7D]/20 rounded-2xl p-4 text-xs text-[#0141BC] flex items-start gap-3 shadow-xs">
                <Info className="h-5 w-5 text-[#0F6C7D] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-[#0141BC]">Solicitud para Paciente Tercero</p>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Ingresá los datos completos del paciente en la tarjeta antes de continuar con la solicitud.
                  </p>
                </div>
              </div>
            )}

            {/* PREFERENCIA DE ENTREGA */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <label htmlFor="delivery-method" className="block text-xs font-bold text-[#0141BC] uppercase">
                Medio Preferido de Envío de la Receta <span className="text-red-500">*</span>
              </label>
              <select
                id="delivery-method"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as 'email' | 'whatsapp' | 'both')}
                className="w-full px-4 py-3 bg-white border border-slate-250 rounded-xl font-semibold text-slate-800 cursor-pointer focus:ring-2 focus:ring-[#1661E1] focus:outline-none text-xs transition-all shadow-2xs hover:border-slate-350"
              >
                <option value="both">Enviar por Ambos Medios (Email y WhatsApp)</option>
                <option value="whatsapp">Enviar solo por WhatsApp</option>
                <option value="email">Enviar solo por Email (Correo Electrónico)</option>
              </select>
            </div>

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
                className="w-2/3 bg-[#1661E1] hover:bg-[#0141BC] text-white font-extrabold py-4 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>Siguiente Paso</span>
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

            {/* 🛒 CARRITO DE LA SOLICITUD (PLACED ABOVE MÉTODO DE CARGA) */}
            <div className={`p-4.5 rounded-2xl border space-y-3 transition-all ${
              fieldErrors.medicationList 
                ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-500/10' 
                : 'bg-emerald-50/30 border-[#14BE99]/30 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>🛒 Carrito de la Solicitud</span>
                  <span className="bg-[#14BE99] text-white text-[10px] px-2.5 py-0.5 rounded-full font-black shadow-xs">
                    {medicationItems.length + medicationPhotos.length} {medicationItems.length + medicationPhotos.length === 1 ? 'item' : 'items'}
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

              {fieldErrors.medicationList && (
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-fadeIn">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fieldErrors.medicationList}</span>
                </p>
              )}

              {medicationItems.length === 0 && medicationPhotos.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-400 font-medium bg-white/60 rounded-xl border border-dashed border-slate-250">
                  El recetario está vacío. Seleccione un <strong>Método de Carga</strong> a continuación para ingresar medicamentos o adjuntar fotos.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {/* Items ingresados por texto / manual */}
                  {medicationItems.map((item, index) => (
                    <div 
                      key={`text-${index}`} 
                      className="bg-white border border-slate-200 p-3.5 rounded-2xl text-xs shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black text-[#14BE99] bg-[#14BE99]/10 border border-[#14BE99]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Medicamento #{index + 1}
                          </span>
                          <h6 className="font-extrabold text-[#0141BC] text-sm mt-1">
                            {item.nombreComercial} {item.miligramos && <span className="text-[#1661E1] font-black">({item.miligramos})</span>}
                          </h6>
                        </div>
                        <button
                          id={`btn-remove-med-item-${index}`}
                          type="button"
                          onClick={() => removeMedicationItem(index)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                          title="Quitar medicamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                        {item.miligramos && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-400">Dosis / Miligramos:</span>
                            <span className="font-bold text-slate-800">{item.miligramos}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-400">Cantidad:</span>
                          <span className="font-bold text-slate-800">
                            {item.cantidadCajas} {item.cantidadCajas === 1 ? 'Caja' : 'Cajas'}
                            {item.unidadesPorCaja ? ` x ${item.unidadesPorCaja} u.` : ''}
                            {item.presentacion ? ` (${item.presentacion})` : ''}
                          </span>
                        </div>

                        {item.diagnostic && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-400">Diagnóstico:</span>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md text-right max-w-[220px] truncate">
                              {item.diagnostic}
                            </span>
                          </div>
                        )}

                        {item.comments && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-400">Aclaraciones:</span>
                            <span className="font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-right max-w-[220px] truncate">
                              {item.comments}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Fotos de envase o receta agregadas */}
                  {medicationPhotos.map((photo, index) => (
                    <div 
                      key={`photo-${index}`} 
                      className="bg-white p-3.5 rounded-2xl border border-blue-200 text-xs shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                            {photo.url.startsWith('data:application/pdf') ? (
                              <span className="text-[10px] font-black text-slate-600">PDF</span>
                            ) : (
                              <img src={photo.url} alt="Receta" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-[#14BE99] bg-[#14BE99]/10 border border-[#14BE99]/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Adjunto #{index + 1}
                            </span>
                            <h6 className="font-extrabold text-[#0141BC] text-xs mt-1 truncate max-w-[170px] sm:max-w-[240px]">
                              {photo.name}
                            </h6>
                          </div>
                        </div>
                        <button
                          id={`btn-remove-photo-${index}`}
                          type="button"
                          onClick={() => setMedicationPhotos(prev => prev.filter((_, i) => i !== index))}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                          title="Quitar adjunto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-400">Tipo de Documento:</span>
                          <span className="font-bold text-emerald-700">Foto de Receta / Envase</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Method Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Método de Carga <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  id="btn-method-past-orders"
                  type="button"
                  onClick={() => setMedicationMethod('past_orders')}
                  className={`py-3.5 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                    medicationMethod === 'past_orders'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>Últimas Solicitudes</span>
                </button>

                <button
                  id="btn-method-new-manual"
                  type="button"
                  onClick={() => setMedicationMethod('new_manual')}
                  className={`py-3.5 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                    medicationMethod === 'new_manual'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span>Nueva Carga Manual</span>
                </button>

                <button
                  id="btn-method-upload-photo"
                  type="button"
                  onClick={() => setMedicationMethod('upload_photo')}
                  className={`py-3.5 px-3 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                    medicationMethod === 'upload_photo'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Camera className="h-5 w-5" />
                  <span>Adjuntar foto de receta anterior o de la medicación</span>
                </button>
              </div>
            </div>

            {/* SECTION A: NUEVA CARGA MANUAL */}
            {medicationMethod === 'new_manual' && (
              <div className="space-y-4 animate-fadeIn">
                {/* A1. Formulario intuitivo para agregar medicación */}
                <div className="bg-slate-100 p-5 rounded-2xl border-2 border-slate-300 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#14BE99] animate-pulse" />
                      <span>Datos del Medicamento</span>
                    </h4>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="cur-nombre-comercial" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Nombre Comercial o Droga de la Medicación <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="cur-nombre-comercial"
                        type="text"
                        value={curNombreComercial}
                        onChange={(e) => {
                          setCurNombreComercial(e.target.value);
                          if (fieldErrors.curNombreComercial) setFieldErrors(prev => ({ ...prev, curNombreComercial: undefined }));
                        }}
                        placeholder="Ej. Lotrial, Amoxidal, Enalapril..."
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all outline-hidden ${
                          fieldErrors.curNombreComercial
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-white border border-slate-250 text-slate-850 focus:ring-2 focus:ring-blue-500'
                        }`}
                      />
                      {fieldErrors.curNombreComercial && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.curNombreComercial}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        <label htmlFor="cur-presentacion" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Presentación
                        </label>
                        <select
                          id="cur-presentacion"
                          value={curPresentacion}
                          onChange={(e) => setCurPresentacion(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="Comprimidos">Comprimidos</option>
                          <option value="Gotas">Gotas</option>
                          <option value="Crema">Crema</option>
                          <option value="Gel">Gel</option>
                          <option value="Sobres">Sobres</option>
                          <option value="Polvo">Polvo</option>
                          <option value="Solución">Solución</option>
                          <option value="Otra">Otra</option>
                        </select>
                        {curPresentacion === 'Otra' && (
                          <input
                            type="text"
                            value={curPresentacionOtra}
                            onChange={(e) => setCurPresentacionOtra(e.target.value)}
                            placeholder="Especificar presentación..."
                            className="w-full mt-2 px-3.5 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>

                      <div>
                        <label htmlFor="cur-unidades-por-caja" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Cantidad x envase
                        </label>
                        <input
                          id="cur-unidades-por-caja"
                          type="number"
                          value={curUnidadesPorCaja}
                          onChange={(e) => setCurUnidadesPorCaja(e.target.value)}
                          placeholder="Ej. 30, 60"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="cur-cajas" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Cant. Envases <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="cur-cajas"
                          value={curCantidadCajas}
                          onChange={(e) => {
                            setCurCantidadCajas(e.target.value);
                            if (fieldErrors.curCantidadCajas) setFieldErrors(prev => ({ ...prev, curCantidadCajas: undefined }));
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-center cursor-pointer outline-hidden ${
                            fieldErrors.curCantidadCajas
                              ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                              : 'bg-white border border-slate-250 text-slate-850 focus:ring-2 focus:ring-blue-500'
                          }`}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={num}>
                              {num} {num === 1 ? 'Caja' : 'Cajas'}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.curCantidadCajas && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{fieldErrors.curCantidadCajas}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="cur-diagnostic" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Diagnóstico o Motivo de prescripción
                        </label>
                        <input
                          id="cur-diagnostic"
                          type="text"
                          value={curDiagnostic}
                          onChange={(e) => setCurDiagnostic(e.target.value)}
                          placeholder="Ej. Hipertensión arterial, Diabetes tipo 2, Hipotiroidismo..."
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="cur-comments" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Comentarios / Aclaraciones Adicionales <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <input
                          id="cur-comments"
                          type="text"
                          value={curComments}
                          onChange={(e) => setCurComments(e.target.value)}
                          placeholder="Ej. Tomo 1 comprimido diario por la mañana. Marca habitual: Lotrial."
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        id="btn-add-medication-item"
                        type="button"
                        onClick={addManualMedication}
                        className="bg-[#14BE99] hover:bg-[#0fa685] text-white font-extrabold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Agregar al carrito</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION B: ADJUNTAR FOTO DE RECETA O MEDICACIÓN */}
            {medicationMethod === 'upload_photo' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-50/75 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-blue-600" />
                      <span>Adjuntar Foto de Receta Anterior o Medicación</span>
                    </h4>
                  </div>

                  <label className="w-full bg-white hover:bg-slate-100 border-2 border-dashed border-blue-300 hover:border-blue-500 text-slate-700 p-6 rounded-2xl transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center shadow-xs">
                    <Camera className="h-8 w-8 text-blue-600" />
                    <span className="font-extrabold text-xs sm:text-sm text-blue-800">
                      Adjuntar foto de receta anterior o de la medicación
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Formatos permitidos: JPG, PNG, HEIC, PDF. Puede adjuntar múltiples imágenes.
                    </span>
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
                    placeholder="Ej. Dr. López / Médico Tratante"
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
                    <h4 className="font-extrabold text-sm text-slate-50">Arancel de la medicación</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Gestión</p>
                  </div>
                </div>

                <div className="text-right">
                  <div>
                    <span className="text-2xl font-black text-blue-400">${paymentAmount}</span>
                    <span className="text-xs text-slate-400 font-bold"> ARS</span>
                  </div>
                </div>
              </div>

              {/* Cost rules explained */}
              <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-200">Medicamentos Solicitados ({medicationItems.length > 0 ? medicationItems.length : medicationPhotos.length}):</p>
                  <span className="text-[11px] text-blue-300 font-mono font-bold">
                    $10.000 c/ 2 medicamentos
                  </span>
                </div>
                
                {medicationItems.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {medicationItems.map((med, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-600 rounded-xl p-3 flex flex-col gap-1.5 text-xs shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-blue-400 shrink-0" />
                            <span className="font-bold text-slate-100 text-[13px] leading-tight">{med.nombreComercial}</span>
                          </div>
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[10px] px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                            {med.cantidadCajas} {med.cantidadCajas === 1 ? 'caja' : 'cajas'}
                          </span>
                        </div>
                        {(med.miligramos || med.presentacion) && (
                          <div className="pl-6 text-slate-400 flex items-center gap-1.5 text-[11px] font-medium">
                            {med.miligramos && <span>{med.miligramos}</span>}
                            {med.miligramos && med.presentacion && <span>•</span>}
                            {med.presentacion && <span>{med.presentacion}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : medicationPhotos.length > 0 ? (
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-300">
                    <Camera className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>{medicationPhotos.length} foto(s) de envase o receta adjunta(s).</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Checkout form */}
            <div className="space-y-4">
              {/* Payment method selector */}
              <div className={`grid ${isThirdPartyUser ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'} gap-3.5`}>
                  {isThirdPartyUser && (
                    <button
                      id="btn-pay-cash-desk"
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash_desk');
                        setError(null);
                      }}
                      className={`py-3 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === 'cash_desk'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-black ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Dar como Cobrada (Efectivo / Ventanilla)</span>
                    </button>
                  )}

                  <button
                    id="btn-pay-mp"
                    type="button"
                    onClick={() => {
                      setPaymentMethod('mp');
                      setError(null);
                    }}
                    className={`py-3 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'mp'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-black ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <MercadoPagoIcon className="h-4.5 w-4.5" />
                    <span>Pago Mercado Pago</span>
                  </button>

                  <button
                    id="btn-pay-transfer"
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transfer');
                      setError(null);
                    }}
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

                {/* OPTION 3: COBRADA EN VENTANILLA / EFECTIVO (MÉDICO / COLABORADOR) */}
                {paymentMethod === 'cash_desk' && isThirdPartyUser && (
                  <div className="bg-emerald-50/80 p-5 rounded-3xl border border-emerald-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-sm">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                      <span>Registrar Solicitud como Cobrada</span>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      Esta opción permite marcar la solicitud como <strong>Cobrada en Efectivo o Ventanilla Institucional</strong>. Se generará el registro de pago aprobado sin necesidad de pasarela online ni comprobantes adjuntos.
                    </p>
                  </div>
                )}

                {/* OPTION 1: MERCADO PAGO CHECKOUT PRO */}
                {paymentMethod === 'mp' && (
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3.5 animate-fadeIn">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <MercadoPagoIcon variant="full" className="h-6 w-auto" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full">
                        Total: ${paymentAmount} ARS
                      </span>
                    </div>

                    {mpPaymentApproved ? (
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-scaleUp font-semibold leading-relaxed">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-emerald-950">Pago Online Autorizado con Éxito</p>
                          <p>Id de Operación Mercado Pago: <strong className="font-mono text-[11px] bg-white border border-emerald-200 px-1 py-0.5 rounded text-emerald-800">{mpTransactionId}</strong></p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5 text-blue-950">
                          <MercadoPagoIcon className="h-4 w-4" />
                          <span>Pago con Mercado Pago</span>
                        </p>
                        <p className="text-[11px] text-blue-800 font-medium">
                          Al presionar el botón <strong>"Pagar con Mercado Pago y Enviar"</strong>, serás redirigido a la pasarela segura de Mercado Pago para abonar con tarjeta de crédito, débito o dinero en cuenta. Al confirmarse el pago, tu solicitud ingresará automáticamente.
                        </p>
                      </div>
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
                        Cuenta para transferir
                      </p>
                      <p><strong>CBU:</strong> <span className="font-mono">{BANK_DETAILS.cbu}</span></p>
                      <p><strong>Alias:</strong> <span className="font-mono bg-amber-100 px-1 rounded text-amber-955 font-bold">{BANK_DETAILS.alias}</span></p>
                      <p><strong>Titular de la Cuenta:</strong> {BANK_DETAILS.titular}</p>
                    </div>

                    {/* Receipt upload / simulation */}
                    <div 
                      id="payment-receipt-dropzone"
                      className={`rounded-2xl p-4.5 text-center flex flex-col items-center justify-center transition-all ${
                        fieldErrors.paymentReceipt
                          ? 'border-2 border-dashed border-rose-400 bg-rose-50/40 ring-2 ring-rose-500/10'
                          : 'border border-dashed border-amber-300 bg-white/70'
                      }`}
                    >
                      <p className="font-bold text-slate-800 mb-1">
                        Adjunte el Comprobante de Transferencia <span className="text-red-500">*</span>
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mb-3">
                        Suba la captura o PDF generado por su Homebanking o billetera virtual.
                      </p>

                      {fieldErrors.paymentReceipt && (
                        <p className="text-[11px] text-rose-600 font-semibold mb-3 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.paymentReceipt}</span>
                        </p>
                      )}

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
                            onClick={() => {
                              setPaymentReceipt(null);
                              setError(null);
                              setFieldErrors(prev => ({ ...prev, paymentReceipt: undefined }));
                            }}
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
                              onChange={(e) => {
                                handleFileChange(e, 'payment');
                                setFieldErrors(prev => ({ ...prev, paymentReceipt: undefined }));
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            {/* Step 4 Inline Warning/Error Banner */}
            {error && (
              <div 
                id="payment-step-error"
                className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-fadeIn shadow-xs"
              >
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-rose-950 text-sm">Pago Requerido</p>
                  <p className="text-rose-850 leading-relaxed font-normal">{error}</p>
                </div>
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
                disabled={submitting || mpProcessing}
                className={`w-2/3 text-white font-extrabold py-4 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm ${
                  paymentMethod === 'mp' && !mpPaymentApproved
                    ? 'bg-[#009EE3] hover:bg-[#0081b8]'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {submitting || mpProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{mpProcessing ? 'Conectando con Mercado Pago...' : 'Guardando Prescripción...'}</span>
                  </>
                ) : (
                  <>
                    {paymentMethod === 'mp' && !mpPaymentApproved ? (
                      <>
                        <MercadoPagoIcon className="h-5 w-5" />
                        <span>Pagar con Mercado Pago y Enviar</span>
                      </>
                    ) : paymentMethod === 'transfer' ? (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Enviar Solicitud con Comprobante</span>
                      </>
                    ) : paymentMethod === 'cash_desk' ? (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Registrar Solicitud Cobrada</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Enviar Solicitud</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </form>

      {/* MODAL AGREGAR / EDITAR PACIENTE */}
      {showAddDependentModal && (
        <div 
          className="fixed inset-0 z-50 bg-[#0141BC]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn"
          onClick={() => setShowAddDependentModal(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-scaleUp max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0141BC] text-white p-4 sm:p-5 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0">
                  {editingCardId ? <Edit3 className="h-4 w-4 sm:h-5 sm:w-5" /> : <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm sm:text-base">
                    {editingCardId === 'titular' 
                      ? 'Editar Datos del Titular' 
                      : editingCardId 
                      ? 'Editar Paciente a Cargo' 
                      : 'Agregar Nuevo Paciente a Cargo'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-blue-100 font-semibold">
                    {editingCardId ? 'Modifique los datos necesarios' : 'Complete la información requerida del familiar'}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowAddDependentModal(false)}
                className="text-slate-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModalPatient} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
              {depFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{depFormError}</span>
                </div>
              )}

              {/* Section 1: Identification & Contact */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0141BC] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#1661E1]" />
                  1. Datos del Paciente y Contacto
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nombre/s <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={depName}
                      onChange={(e) => {
                        setDepName(e.target.value);
                        if (depFieldErrors.name) setDepFieldErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Ej. Lucas"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.name
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.name && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.name}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={depLastName}
                      onChange={(e) => {
                        setDepLastName(e.target.value);
                        if (depFieldErrors.lastName) setDepFieldErrors(prev => ({ ...prev, lastName: undefined }));
                      }}
                      placeholder="Ej. Olaciregui"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.lastName
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.lastName && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.lastName}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      DNI (Sin puntos) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={depDni}
                      onChange={(e) => {
                        setDepDni(e.target.value.replace(/\D/g, ''));
                        if (depFieldErrors.dni) setDepFieldErrors(prev => ({ ...prev, dni: undefined }));
                      }}
                      placeholder="Ej. 48912345"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.dni
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.dni && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.dni}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Fecha de Nacimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={depBirthDate}
                      onChange={(e) => {
                        setDepBirthDate(e.target.value);
                        if (depFieldErrors.birthDate) setDepFieldErrors(prev => ({ ...prev, birthDate: undefined }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden cursor-pointer ${
                        depFieldErrors.birthDate
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.birthDate && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.birthDate}</span>
                      </p>
                    )}
                  </div>
                </div>

                {editingCardId !== 'titular' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Parentesco / Relación <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={depRelationship}
                      onChange={(e) => {
                        setDepRelationship(e.target.value);
                        if (depFieldErrors.relationship) setDepFieldErrors(prev => ({ ...prev, relationship: undefined }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold text-[#0F172A] text-xs focus:ring-2 focus:ring-[#1661E1] focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="Hijo/a">Hijo/a</option>
                      <option value="Padre/Madre">Padre/Madre mayor</option>
                      <option value="Cónyuge">Cónyuge / Pareja</option>
                      <option value="Abuelo/a">Abuelo/a</option>
                      <option value="Hermano/a">Hermano/a</option>
                      <option value="Otro">Otro familiar a cargo</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      WhatsApp / Celular
                    </label>
                    <input
                      type="tel"
                      value={depPhone}
                      onChange={(e) => {
                        setDepPhone(e.target.value);
                        if (depFieldErrors.phone) setDepFieldErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      placeholder="Ej. 2926442385"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.phone
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.phone}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={depEmail}
                      onChange={(e) => {
                        setDepEmail(e.target.value);
                        if (depFieldErrors.email) setDepFieldErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      placeholder="ejemplo@gmail.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.email
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.email && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={depCity}
                      onChange={(e) => setDepCity(e.target.value)}
                      placeholder="Ej. Coronel Suárez"
                      className="w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={depProvince}
                      onChange={(e) => setDepProvince(e.target.value)}
                      placeholder="Ej. Buenos Aires"
                      className="w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Coverage */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0141BC] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#1661E1]" />
                  2. Cobertura Médica
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Obra Social / Prepaga <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={depObraSocial}
                      onChange={(e) => {
                        setDepObraSocial(e.target.value);
                        if (depFieldErrors.obraSocial) setDepFieldErrors(prev => ({ ...prev, obraSocial: undefined }));
                        if (depFieldErrors.customObraSocial) setDepFieldErrors(prev => ({ ...prev, customObraSocial: undefined }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer outline-hidden ${
                        depFieldErrors.obraSocial
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    >
                      <option value="">Seleccionar Obra Social</option>
                      {OBRA_SOCIAL_OPTIONS.map((os) => (
                        <option key={os.id} value={os.name}>{os.name}</option>
                      ))}
                    </select>
                    {depFieldErrors.obraSocial && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.obraSocial}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      N° de Afiliado / Credencial
                    </label>
                    <input
                      type="text"
                      value={depObraSocialNumber}
                      onChange={(e) => {
                        setDepObraSocialNumber(e.target.value);
                        if (depFieldErrors.obraSocialNumber) setDepFieldErrors(prev => ({ ...prev, obraSocialNumber: undefined }));
                      }}
                      placeholder="Ej. 210-48912345"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.obraSocialNumber
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.obraSocialNumber && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.obraSocialNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                {depObraSocial === 'Otra Obra Social / Prepaga' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nombre de la Obra Social / Prepaga <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={depCustomObraSocial}
                      onChange={(e) => {
                        setDepCustomObraSocial(e.target.value);
                        if (depFieldErrors.customObraSocial) setDepFieldErrors(prev => ({ ...prev, customObraSocial: undefined }));
                      }}
                      placeholder="Escriba el nombre de la obra social o prepaga..."
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all outline-hidden ${
                        depFieldErrors.customObraSocial
                          ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'bg-slate-50 border border-slate-250 text-[#0F172A] focus:ring-2 focus:ring-[#1661E1] focus:bg-white'
                      }`}
                    />
                    {depFieldErrors.customObraSocial && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{depFieldErrors.customObraSocial}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDependentModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1661E1] hover:bg-[#0141BC] text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingCardId ? 'Guardar Cambios' : 'Guardar Paciente a Cargo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
