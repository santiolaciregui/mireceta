/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OBRA_SOCIAL_OPTIONS, MedicationItem } from '../types';
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
  Sparkles
} from 'lucide-react';

interface NewOrderFormProps {
  currentUser?: any;
  orders?: any[];
  users?: any[];
  onSubmitOrder?: (data: any) => Promise<string>;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NewOrderForm({
  currentUser,
  orders = [],
  users = [],
  onSubmitOrder,
  onSuccess,
  onCancel
}: NewOrderFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchStatus, setSearchStatus] = useState<{ found: boolean; message: string } | null>(null);

  // Patient Identification Fields
  const [patientDni, setPatientDni] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [selectedObraSocial, setSelectedObraSocial] = useState('');
  const [obraSocialNumber, setObraSocialNumber] = useState('');

  // Medication Items State
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  const [curNombreComercial, setCurNombreComercial] = useState('');
  const [curMiligramos, setCurMiligramos] = useState('');
  const [curPresentacion, setCurPresentacion] = useState('Comprimidos');
  const [curCantidadCajas, setCurCantidadCajas] = useState('1');

  // Photo uploads
  const [medicationPhotos, setMedicationPhotos] = useState<{ url: string; name: string }[]>([]);

  // Clinical & Admin Notes
  const [diagnostic, setDiagnostic] = useState('');
  const [comments, setComments] = useState('');
  const [lastConsultationTime, setLastConsultationTime] = useState('');
  const [lastConsultationDoctor, setLastConsultationDoctor] = useState('');

  // Payment / Registry Details
  const [paymentMethod, setPaymentMethod] = useState<'cash_desk' | 'bonificado' | 'transfer'>('cash_desk');
  const [paymentAmount, setPaymentAmount] = useState('10000');

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
      const obraSocial = foundOrder?.obraSocial || foundUser?.obraSocial || '';
      const osNumber = foundOrder?.obraSocialNumber || foundUser?.obraSocialNumber || '';

      if (name) setPatientName(name);
      if (lastName) setPatientLastName(lastName);
      if (birthDate) setPatientBirthDate(birthDate);
      if (email) setPatientEmail(email);
      if (phone) setPatientPhone(phone);
      if (obraSocial) setSelectedObraSocial(obraSocial);
      if (osNumber) setObraSocialNumber(osNumber);

      setSearchStatus({
        found: true,
        message: `Paciente registrado encontrado: ${name} ${lastName}`
      });
    } else {
      setSearchStatus({
        found: false,
        message: `No se registraron datos previos para el DNI ${queryDni}. Puede completar el formulario libremente.`
      });
    }
  };

  const handleAddMedication = () => {
    setError(null);
    if (!curNombreComercial.trim()) {
      setError('Ingrese el nombre comercial del medicamento.');
      return;
    }
    const count = parseInt(curCantidadCajas) || 1;
    if (count <= 0) {
      setError('La cantidad de cajas debe ser mayor a 0.');
      return;
    }

    setMedicationItems(prev => [
      ...prev,
      {
        nombreComercial: curNombreComercial.trim(),
        miligramos: curMiligramos.trim(),
        presentacion: curPresentacion,
        cantidadCajas: count
      }
    ]);

    setCurNombreComercial('');
    setCurMiligramos('');
    setCurPresentacion('Comprimidos');
    setCurCantidadCajas('1');
  };

  const handleRemoveMedication = (index: number) => {
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setMedicationPhotos(prev => [...prev, { url: base64String, name: file.name }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!patientDni.trim()) {
      setError('El DNI del paciente es obligatorio.');
      return;
    }
    if (!patientName.trim() || !patientLastName.trim()) {
      setError('El Nombre y Apellido del paciente son obligatorios.');
      return;
    }
    if (!selectedObraSocial) {
      setError('Debe seleccionar la obra social o prepaga del paciente.');
      return;
    }
    if (medicationItems.length === 0 && medicationPhotos.length === 0) {
      setError('Debe agregar al menos un medicamento o adjuntar una foto/documento de la receta.');
      return;
    }
    if (!diagnostic.trim()) {
      setError('El diagnóstico de origen es obligatorio.');
      return;
    }

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
          summaryText += `\n- Fotos/archivos adjuntos: ${medicationPhotos.length} archivo(s).`;
        }
      } else {
        summaryText = `Carga por Adjunto/Foto (${medicationPhotos.length} archivo(s)). Medicación visible en adjunto.`;
      }

      const simulatedReceiptSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23eff6ff"/><rect x="30" y="15" width="240" height="170" rx="8" fill="%23ffffff" stroke="%232563eb" stroke-width="2"/><circle cx="150" cy="60" r="22" fill="%23dbeafe"/><path d="M142,60 L148,66 L158,54" fill="none" stroke="%232563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="150" y="110" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e3a8a" text-anchor="middle">CARGA MANUAL DE OFICIO</text><text x="150" y="135" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232563eb" text-anchor="middle">${paymentMethod === 'bonificado' ? 'EXENTO / BONIFICADO' : 'MESA DE ENTRADA'}</text><text x="150" y="160" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">Registrado por Personal Sanitario</text></svg>`;

      await onSubmitOrder({
        patientName: patientName.trim(),
        patientLastName: patientLastName.trim(),
        patientDni: patientDni.trim(),
        patientBirthDate: patientBirthDate || undefined,
        patientEmail: patientEmail.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        deliveryMethod,
        obraSocial: selectedObraSocial,
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
        paymentAmount: paymentMethod === 'bonificado' ? '0' : paymentAmount,
        paymentStatus: 'approved',
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Pedidos
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Nueva Solicitud de Oficio</h1>
              <p className="text-xs text-slate-500 font-medium">Estructura administrativa de carga directa para personal médico o colaboradores</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#295EF3]/10 border border-[#295EF3]/20 rounded-xl text-[#295EF3] text-xs font-bold">
            <ShieldCheck className="h-4 w-4" />
            <span>Operador: {currentUser?.name || 'Personal Autorizado'}</span>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-medium flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: DATOS DEL PACIENTE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#295EF3]/10 text-[#295EF3] flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span>1. Identificación del Paciente</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Campos obligatorios (*)</span>
            </div>

            {/* DNI Search Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-700">DNI / Documento del Paciente *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={patientDni}
                    onChange={e => setPatientDni(e.target.value)}
                    placeholder="Ej: 35123456"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-[#295EF3] focus:ring-2 focus:ring-[#295EF3]/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchPatient}
                  className="px-4 py-2.5 bg-[#295EF3] text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#295EF3]/90 transition-all cursor-pointer shadow-xs"
                >
                  <Search className="h-4 w-4" /> Buscar en Base de Datos
                </button>
              </div>

              {searchStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  searchStatus.found ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{searchStatus.message}</span>
                </div>
              )}
            </div>

            {/* Main Patient Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Ej: María"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Apellido *</label>
                <input
                  type="text"
                  value={patientLastName}
                  onChange={e => setPatientLastName(e.target.value)}
                  placeholder="Ej: González"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={patientBirthDate}
                  onChange={e => setPatientBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Obra Social / Prepaga *</label>
                <select
                  value={selectedObraSocial}
                  onChange={e => setSelectedObraSocial(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                  required
                >
                  <option value="">-- Seleccionar cobertura --</option>
                  {OBRA_SOCIAL_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.name}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {requiresObraSocialNumber && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">N° de Afiliado *</label>
                  <input
                    type="text"
                    value={obraSocialNumber}
                    onChange={e => setObraSocialNumber(e.target.value)}
                    placeholder="Número de carnet"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-[#295EF3]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp / Celular de Contacto *</label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="Ej: 2926123456"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-[#295EF3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={e => setPatientEmail(e.target.value)}
                  placeholder="paciente@correo.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Canal de Envío de la Receta Emitida</label>
                <select
                  value={deliveryMethod}
                  onChange={e => setDeliveryMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                >
                  <option value="email">Por Email</option>
                  <option value="whatsapp">Por WhatsApp</option>
                  <option value="both">Por Ambos Canales</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: MEDICACIÓN Y DIAGNÓSTICO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#295EF3]/10 text-[#295EF3] flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span>2. Medicación Crónica y Diagnóstico</span>
              </div>
            </div>

            {/* Manual Item Creator Panel */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <span className="block text-xs font-bold text-slate-800">Agregar Medicamento al Pedido</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={curNombreComercial}
                    onChange={e => setCurNombreComercial(e.target.value)}
                    placeholder="Nombre comercial (Ej: Losartán)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#295EF3]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={curMiligramos}
                    onChange={e => setCurMiligramos(e.target.value)}
                    placeholder="Dosis (Ej: 50mg)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#295EF3]"
                  />
                </div>
                <div>
                  <select
                    value={curPresentacion}
                    onChange={e => setCurPresentacion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#295EF3]"
                  >
                    <option value="Comprimidos">Comprimidos</option>
                    <option value="Cápsulas">Cápsulas</option>
                    <option value="Gotas / Jarabe">Gotas / Jarabe</option>
                    <option value="Inyectable / Pluma">Inyectable / Pluma</option>
                    <option value="Inhalador">Inhalador</option>
                    <option value="Crema / Gel">Crema / Gel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Cantidad de cajas:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={curCantidadCajas}
                    onChange={e => setCurCantidadCajas(e.target.value)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold outline-none focus:border-[#295EF3]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Añadir Medicamento
                </button>
              </div>
            </div>

            {/* List of Added Medication Items */}
            {medicationItems.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Medicamentos Agregados ({medicationItems.length}):</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {medicationItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.nombreComercial} {item.miligramos && `(${item.miligramos})`}</p>
                        <p className="text-[11px] text-slate-500">{item.presentacion} • Cantidad: {item.cantidadCajas} caja(s)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Photo Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Adjuntar Fotos/Escaneo de Receta Anterior o Envase (Opcional)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#295EF3]/10 file:text-[#295EF3] hover:file:bg-[#295EF3]/20 cursor-pointer"
              />
              {medicationPhotos.length > 0 && (
                <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  <span>{medicationPhotos.length} archivo(s) adjuntado(s) correctamente</span>
                </div>
              )}
            </div>

            {/* Mandatory Diagnostic Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Diagnóstico de Origen / Motivo Clínico *</label>
              <textarea
                rows={2}
                value={diagnostic}
                onChange={e => setDiagnostic(e.target.value)}
                placeholder="Ej: Hipertensión arterial esencial / Diabetes Tipo 2"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                required
              />
            </div>

            {/* Optional Doctor Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Observaciones o Notas Internas (Opcional)</label>
              <input
                type="text"
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Aclaraciones para la auditoría o indicaciones de la caja"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
              />
            </div>
          </div>

          {/* SECTION 3: REGISTRO ADMINISTRATIVO Y PAGO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="h-7 w-7 rounded-lg bg-[#295EF3]/10 text-[#295EF3] flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>3. Registro de Cobro en Mesa de Entrada</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Modalidad de Cobro</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-[#295EF3]"
                >
                  <option value="cash_desk">Cobrado en Caja / Mesa de Entrada</option>
                  <option value="bonificado">Exento / Bonificado (PAMI u Orden Municipal)</option>
                  <option value="transfer">Transferencia Bancaria Comprobada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Monto Registrado ($ ARS)</label>
                <input
                  type="number"
                  value={paymentMethod === 'bonificado' ? '0' : paymentAmount}
                  disabled={paymentMethod === 'bonificado'}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-[#295EF3]"
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
              className="px-8 py-3.5 bg-[#295EF3] hover:bg-[#295EF3]/90 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando solicitud...</span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Guardar y Enviar a Auditoría
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
