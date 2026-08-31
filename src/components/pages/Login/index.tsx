/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  ArrowRight,
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  Building2,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  KeyRound,
  Check,
  MapPin
} from 'lucide-react';
import { OBRA_SOCIAL_OPTIONS } from '../../../constants/orderStatus';
import Logo from '../../Logo';
import InformationalModal from '../../InformationalModal';
import { CustomDatePicker } from '../../common/CustomDatePicker';

interface LoginProps {
  onLogin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  onRegister?: (userData: any) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword?: (identifier: string, email: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onSendForgotPasswordLink?: (identifier: string, channel: 'email' | 'whatsapp') => Promise<{ success: boolean; message?: string; error?: string }>;
  onResetPassword?: (token: string, newPassword: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLogin, isLoading, onRegister, onForgotPassword, onSendForgotPasswordLink, onResetPassword, onBack, initialMode }: LoginProps) {
  const [activeMode, setActiveMode] = useState<'login' | 'register' | 'forgot'>(initialMode || 'login');
  
  useEffect(() => {
    if (initialMode) setActiveMode(initialMode);
  }, [initialMode]);
  
  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Register fields
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regName, setRegName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regProvince, setRegProvince] = useState('');
  const [regObraSocial, setRegObraSocial] = useState('');
  const [regCustomObraSocial, setRegCustomObraSocial] = useState('');
  const [regObraSocialNumber, setRegObraSocialNumber] = useState('');
  const [regStep, setRegStep] = useState<1 | 2>(1); // 1: Datos, 2: T&C + DDJJ

  // Register Consents
  const [consentAge, setConsentAge] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentInformed, setConsentInformed] = useState(false);
  const [consentSworn, setConsentSworn] = useState(false);

  // Informational Modal State
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; type: 'privacidad' | 'terminos' | 'arrepentimiento'; title: string }>({
    isOpen: false,
    type: 'terminos',
    title: 'Términos y Condiciones'
  });

  const openInfoModal = (type: 'terminos' | 'privacidad' | 'arrepentimiento', title: string) => {
    setInfoModal({ isOpen: true, type, title });
  };

  // Forgot Password fields
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotTempPassword, setForgotTempPassword] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [recoveryOptions, setRecoveryOptions] = useState<{
    action: 'sent' | 'offer' | 'temp_password';
    method: 'email' | 'whatsapp' | 'both';
    email?: string;
    phone?: string;
    identifier: string;
  } | null>(null);

  // States for WhatsApp OTP code entry & reset
  const [isEnteringWhatsAppCode, setIsEnteringWhatsAppCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-level error states
  const [loginErrors, setLoginErrors] = useState<{ identifier?: string; password?: string }>({});
  const [regErrors, setRegErrors] = useState<{
    identifier?: string;
    name?: string;
    lastName?: string;
    birthDate?: string;
    phone?: string;
    obraSocial?: string;
    customObraSocial?: string;
    obraSocialNumber?: string;
    email?: string;
    password?: string;
    consents?: string;
  }>({});
  const [forgotErrors, setForgotErrors] = useState<{ forgotInput?: string }>({});

  // Helper to calculate age from birthDate
  const calculateAge = (dateStr: string): number => {
    if (!dateStr) return 0;
    const today = new Date();
    const birth = new Date(dateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // General Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Remember Me load
  useEffect(() => {
    const saved = localStorage.getItem('recetafacil-remember-me');
    if (saved) {
      setIdentifier(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errors.identifier = 'El número de DNI o usuario es obligatorio.';
    }
    if (!password.trim()) {
      errors.password = 'La contraseña es obligatoria.';
    }

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      setErrorMsg('Por favor complete los campos obligatorios para ingresar.');
      return;
    }

    setLoginErrors({});

    if (rememberMe) {
      localStorage.setItem('recetafacil-remember-me', identifier.trim());
    } else {
      localStorage.removeItem('recetafacil-remember-me');
    }

    const res = await onLogin(identifier, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Credenciales de acceso inválidas. Verifique su DNI y contraseña.');
    } else {
      setSuccessMsg('¡Sesión iniciada correctamente! Redirigiendo...');
    }
  };

  const handleNextRegisterStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const errors: typeof regErrors = {};

    const cleanDni = regIdentifier.trim();
    if (!cleanDni) {
      errors.identifier = 'El DNI es obligatorio.';
    } else if (cleanDni.length < 6 || cleanDni.length > 10) {
      errors.identifier = 'Ingrese un número de DNI válido (entre 6 y 10 dígitos).';
    }

    if (!regName.trim()) {
      errors.name = 'El nombre es obligatorio.';
    }

    if (!regLastName.trim()) {
      errors.lastName = 'El apellido es obligatorio.';
    }

    if (!regBirthDate) {
      errors.birthDate = 'La fecha de nacimiento es obligatoria.';
    } else {
      const age = calculateAge(regBirthDate);
      if (age < 18) {
        errors.birthDate = 'Debe ser mayor de 18 años para registrarse como titular.';
      }
    }

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!regPhone.trim() || cleanPhone.length < 8) {
      errors.phone = 'Ingrese un número de WhatsApp / celular válido (mínimo 8 dígitos).';
    }

    if (!regObraSocial) {
      errors.obraSocial = 'Debe seleccionar su cobertura médica u obra social.';
    } else if (regObraSocial === 'Otra Obra Social / Prepaga') {
      if (!regCustomObraSocial.trim()) {
        errors.customObraSocial = 'Por favor escriba el nombre de su Obra Social o Prepaga.';
      }
    } else {
      const selectedOs = OBRA_SOCIAL_OPTIONS.find(o => o.name === regObraSocial);
      if (selectedOs?.requiresNumber && !regObraSocialNumber.trim()) {
        errors.obraSocialNumber = `El número de afiliado es obligatorio para ${regObraSocial}.`;
      }
    }

    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = 'Ingrese un correo electrónico válido o déjelo en blanco.';
    }

    if (!regPassword.trim()) {
      errors.password = 'Debe crear una contraseña para su cuenta.';
    } else if (regPassword.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres por seguridad.';
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      setErrorMsg('Por favor corrija los campos marcados en rojo para continuar.');
      return;
    }

    setRegErrors({});
    setRegStep(2);
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!consentAge || !consentTerms || !consentInformed || !consentSworn) {
      setRegErrors({
        consents: 'Debe aceptar obligatoriamente todos los términos, condiciones y declaraciones juradas para continuar.'
      });
      setErrorMsg('Debe aceptar obligatoriamente todos los consentimientos y declaraciones juradas para continuar.');
      return;
    }

    setRegErrors({});

    if (onRegister) {
      const finalObraSocial = regObraSocial === 'Otra Obra Social / Prepaga' ? regCustomObraSocial.trim() : regObraSocial;

      const res = await onRegister({
        identifier: regIdentifier.trim(),
        password: regPassword.trim(),
        name: regName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        city: regCity.trim(),
        province: regProvince.trim(),
        birthDate: regBirthDate,
        obraSocial: finalObraSocial,
        obraSocialNumber: regObraSocialNumber.trim(),
        consentsAccepted: {
          isOfAge: consentAge,
          termsAccepted: consentTerms,
          informedConsentAccepted: consentInformed,
          swornStatementAccepted: consentSworn
        }
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Error al intentar registrarse.');
      } else {
        setSuccessMsg('¡Registro exitoso! Iniciando tu sesión...');
      }
    } else {
      setErrorMsg('El servicio de registro no está disponible temporalmente.');
    }
  };

  const handleSubmitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotSuccessMsg(null);
    setForgotTempPassword(null);
    setRecoveryOptions(null);
    setForgotErrors({});

    const cleanInput = forgotInput.trim();
    if (!cleanInput) {
      const errMsg = 'Por favor ingrese su DNI o correo electrónico registrado.';
      setForgotErrors({ forgotInput: errMsg });
      setErrorMsg(errMsg);
      return;
    }

    if (onForgotPassword) {
      const isEmail = cleanInput.includes('@');
      const res = await onForgotPassword(isEmail ? '' : cleanInput, isEmail ? cleanInput : '');
      if (res.success) {
        const data = res.data || {};
        if (data.action === 'sent') {
          setForgotSuccessMsg(data.message || 'Solicitud procesada con éxito.');
          setForgotStep(2);
        } else if (data.action === 'temp_password') {
          setForgotTempPassword(data.tempPassword);
          setForgotSuccessMsg(data.message);
          setForgotStep(2);
        } else if (data.action === 'offer') {
          setRecoveryOptions({
            action: data.action,
            method: data.method,
            email: data.email,
            phone: data.phone,
            identifier: data.identifier || cleanInput
          });
          setForgotStep(2);
        } else {
          // Fallback just in case
          setForgotSuccessMsg(data.message || 'Solicitud procesada con éxito.');
          setForgotStep(2);
        }
      } else {
        const errMsg = res.error || 'No existe ningún usuario registrado con el DNI o correo electrónico ingresado.';
        setErrorMsg(errMsg);
        setForgotErrors({ forgotInput: errMsg });
      }
    } else {
      setForgotSuccessMsg('Se ha enviado un correo electrónico para reestablecer la contraseña.');
      setForgotStep(2);
    }
  };

  const handleSendLink = async (channel: 'email' | 'whatsapp') => {
    if (!recoveryOptions) return;
    setErrorMsg(null);
    setForgotSuccessMsg(null);

    if (onSendForgotPasswordLink) {
      const res = await onSendForgotPasswordLink(recoveryOptions.identifier, channel);
      if (res.success) {
        setForgotSuccessMsg(res.message || 'Se ha enviado el enlace de recuperación con éxito.');
        if (channel === 'whatsapp') {
          setIsEnteringWhatsAppCode(true);
        } else {
          setRecoveryOptions(null); // Clear options so we show success screen
        }
      } else {
        setErrorMsg(res.error || 'Error al enviar el enlace de recuperación.');
      }
    } else {
      setErrorMsg('El servicio de recuperación no está disponible temporalmente.');
    }
  };

  const handleSubmitWhatsAppReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setErrorMsg('Por favor ingrese el código de verificación de 6 dígitos.');
      return;
    }
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setErrorMsg('El código de verificación debe ser un número de 6 dígitos.');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMsg('Por favor ingrese su nueva contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (onResetPassword) {
      const res = await onResetPassword(cleanCode, newPassword);
      if (res.success) {
        setSuccessMsg(res.data?.message || '¡Contraseña restablecida con éxito! Ya podés iniciar sesión.');
        
        // Reset states and return to login view
        setActiveMode('login');
        setForgotSuccessMsg(null);
        setForgotTempPassword(null);
        setRecoveryOptions(null);
        setForgotStep(1);
        setIsEnteringWhatsAppCode(false);
        setVerificationCode('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.error || 'El código de verificación es inválido o ya expiró.');
      }
    } else {
      setErrorMsg('El servicio de restablecimiento no está disponible.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0141BC] text-white flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#1661E1] selection:text-white">
      
      {/* Background Ambience & Lighting */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1920&auto=format&fit=crop')`
        }}
      />
      <div className="absolute top-0 -left-40 w-96 h-96 bg-[#1661E1]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-[#0F6C7D]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0141BC]/90 via-[#0141BC]/95 to-[#0141BC] pointer-events-none" />

      {/* Top Header / Back Navigation */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        {onBack ? (
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold border border-white/15 transition-all cursor-pointer backdrop-blur-sm shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-[#1E6EFB]" />
            <span>Volver al Inicio</span>
          </button>
        ) : (
          <div />
        )}

      </header>

      {/* Center Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8 my-auto w-full">
        <div className={`w-full ${activeMode === 'register' ? 'max-w-[580px]' : 'max-w-[480px]'} transition-all duration-300 bg-white text-[#0F172A] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 p-5 sm:p-8 lg:p-10 relative overflow-hidden backdrop-blur-md`}>
          
          {/* Top Decorative Gradient Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#0F6C7D] via-[#1661E1] to-[#14BE99] absolute top-0 left-0" />

          {/* Card Header & Brand */}
          <div className="text-center space-y-3 mb-6">
            <div className="flex justify-center">
              <Logo variant="full" size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {activeMode === 'login' && 'Ingresá a tu cuenta para gestionar tus recetas y solicitudes'}
              {activeMode === 'register' && 'Creá tu cuenta de paciente para solicitar recetas digitales'}
              {activeMode === 'forgot' && 'Recuperá el acceso a tu cuenta médica en simples pasos'}
            </p>
          </div>

          {/* Segmented Mode Switcher (Login / Register) */}
          {activeMode !== 'forgot' && (
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMode === 'login'
                    ? 'bg-white text-[#1661E1] shadow-sm font-black'
                    : 'text-slate-600 hover:text-[#0141BC]'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setRegStep(1);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMode === 'register'
                    ? 'bg-white text-[#1661E1] shadow-sm font-black'
                    : 'text-slate-600 hover:text-[#0141BC]'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-[#14BE99] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {forgotSuccessMsg && (
            <div className="mb-6 p-3.5 bg-blue-50 border border-blue-200 text-[#1661E1] rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-[#1661E1] shrink-0 mt-0.5" />
              <span>{forgotSuccessMsg}</span>
            </div>
          )}

          {/* VIEW 1: INICIAR SESIÓN */}
          {activeMode === 'login' && (
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              
              {/* Field: DNI / Identificador */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Identificador (DNI o Usuario) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${loginErrors.identifier ? 'text-rose-500' : 'text-slate-400'}`}>
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (loginErrors.identifier) setLoginErrors(prev => ({ ...prev, identifier: undefined }));
                    }}
                    placeholder="Ej: 34555888"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                      loginErrors.identifier
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                    }`}
                  />
                </div>
                {loginErrors.identifier && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{loginErrors.identifier}</span>
                  </p>
                )}
              </div>

              {/* Field: Contraseña */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setLoginErrors({});
                    }}
                    className="text-xs text-[#0F6C7D] hover:text-[#1661E1] font-bold transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${loginErrors.password ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginErrors.password) setLoginErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                      loginErrors.password
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{loginErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Recordarme */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1661E1] focus:ring-[#1E6EFB]"
                  />
                  <span>Recordar mi DNI en este dispositivo</span>
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  <>
                    <span>Ingresar al Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* VIEW 2: REGISTRO DE PACIENTE */}
          {activeMode === 'register' && (
            <div className="space-y-5">
              
              {/* Stepper Progress */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    regStep === 1 ? 'bg-[#1661E1] text-white' : 'bg-[#14BE99] text-white'
                  }`}>
                    {regStep === 1 ? '1' : <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-xs font-extrabold text-[#0141BC]">
                    {regStep === 1 ? 'Paso 1: Datos Personales' : 'Paso 2: Declaraciones Legales'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Paso {regStep} de 2
                </span>
              </div>

              {regStep === 1 ? (
                <form onSubmit={handleNextRegisterStep} className="space-y-4" noValidate>
                  
                  {/* Field: DNI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      DNI (Sin puntos) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${regErrors.identifier ? 'text-rose-500' : 'text-slate-400'}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={regIdentifier}
                        onChange={(e) => {
                          setRegIdentifier(e.target.value.replace(/\D/g, ''));
                          if (regErrors.identifier) setRegErrors(prev => ({ ...prev, identifier: undefined }));
                        }}
                        placeholder="Ej: 34555888"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.identifier
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                    </div>
                    {regErrors.identifier && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{regErrors.identifier}</span>
                      </p>
                    )}
                  </div>

                  {/* Fields: Nombre & Apellido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value);
                          if (regErrors.name) setRegErrors(prev => ({ ...prev, name: undefined }));
                        }}
                        placeholder="Ej: Juan"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.name
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                      {regErrors.name && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.name}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={regLastName}
                        onChange={(e) => {
                          setRegLastName(e.target.value);
                          if (regErrors.lastName) setRegErrors(prev => ({ ...prev, lastName: undefined }));
                        }}
                        placeholder="Ej: Pérez"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.lastName
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                      {regErrors.lastName && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.lastName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fields: Fecha Nac. & Celular */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Fecha de Nacimiento <span className="text-red-500">*</span>
                      </label>
                      <CustomDatePicker
                        value={regBirthDate}
                        onChange={(val) => {
                          setRegBirthDate(val);
                          if (regErrors.birthDate) setRegErrors(prev => ({ ...prev, birthDate: undefined }));
                        }}
                        maxDate={new Date().toISOString().split('T')[0]}
                        error={regErrors.birthDate}
                        placeholder="DD/MM/AAAA"
                      />
                      {regErrors.birthDate && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.birthDate}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Celular / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${regErrors.phone ? 'text-rose-500' : 'text-slate-400'}`}>
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => {
                            setRegPhone(e.target.value);
                            if (regErrors.phone) setRegErrors(prev => ({ ...prev, phone: undefined }));
                          }}
                          placeholder="Ej: 1122334455"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                            regErrors.phone
                              ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                              : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                          }`}
                        />
                      </div>
                      {regErrors.phone && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fields: Obra Social & Número */}
                  <div className={`grid gap-3 ${regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Obra Social / Prepaga <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${regErrors.obraSocial ? 'text-rose-500' : 'text-slate-400'}`}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <select
                          value={regObraSocial}
                          onChange={(e) => {
                            setRegObraSocial(e.target.value);
                            if (regErrors.obraSocial) setRegErrors(prev => ({ ...prev, obraSocial: undefined }));
                            if (regErrors.customObraSocial) setRegErrors(prev => ({ ...prev, customObraSocial: undefined }));
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden cursor-pointer ${
                            regErrors.obraSocial
                              ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                              : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                          }`}
                        >
                          <option value="">-- Seleccionar cobertura --</option>
                          {OBRA_SOCIAL_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                      </div>
                      {regErrors.obraSocial && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.obraSocial}</span>
                        </p>
                      )}
                    </div>
                    
                    {regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Nro. Afiliado {OBRA_SOCIAL_OPTIONS.find(o => o.name === regObraSocial)?.requiresNumber && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={regObraSocialNumber}
                          onChange={(e) => {
                            setRegObraSocialNumber(e.target.value);
                            if (regErrors.obraSocialNumber) setRegErrors(prev => ({ ...prev, obraSocialNumber: undefined }));
                          }}
                          placeholder="Ej: 12345678-01"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                            regErrors.obraSocialNumber
                              ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                              : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                          }`}
                        />
                        {regErrors.obraSocialNumber && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{regErrors.obraSocialNumber}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {regObraSocial === 'Otra Obra Social / Prepaga' && (
                    <div className="space-y-1.5 animate-fadeIn mt-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Nombre de la Obra Social / Prepaga <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={regCustomObraSocial}
                        onChange={(e) => {
                          setRegCustomObraSocial(e.target.value);
                          if (regErrors.customObraSocial) setRegErrors(prev => ({ ...prev, customObraSocial: undefined }));
                        }}
                        placeholder="Escriba el nombre de su Obra Social o Prepaga..."
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.customObraSocial
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                      {regErrors.customObraSocial && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{regErrors.customObraSocial}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Field: Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Correo Electrónico (Opcional)
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${regErrors.email ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          if (regErrors.email) setRegErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        placeholder="tuemail@ejemplo.com"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.email
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                    </div>
                    {regErrors.email && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{regErrors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Fields: Ciudad & Provincia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Ciudad
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="Ej. Coronel Suárez"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15 transition-all outline-hidden"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Provincia
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={regProvince}
                          onChange={(e) => setRegProvince(e.target.value)}
                          placeholder="Ej. Buenos Aires"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15 transition-all outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field: Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Crear Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${regErrors.password ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regErrors.password) setRegErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        placeholder="Mínimo 6 caracteres"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          regErrors.password
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {regErrors.password && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{regErrors.password}</span>
                      </p>
                    )}
                  </div>

                  {/* Stepper Next Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Continuar al Paso 2</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                </form>
              ) : (
                /* STEP 2: LEGAL CONSENTS */
                <form onSubmit={handleSubmitRegister} className="space-y-4">
                  
      
                  {regErrors.consents && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{regErrors.consents}</span>
                    </div>
                  )}

                  {/* Consent Checkboxes */}
                  <div className="space-y-2.5">
                    
                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentAge
                        ? 'bg-[#1661E1]/5 border-[#1661E1]/30'
                        : regErrors.consents && !consentAge
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentAge} 
                        onChange={(e) => {
                          setConsentAge(e.target.checked);
                          if (regErrors.consents) setRegErrors(prev => ({ ...prev, consents: undefined }));
                        }} 
                        className="mt-0.5 w-4 h-4 rounded text-[#1661E1] focus:ring-[#1E6EFB]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0141BC] block">Soy mayor de 18 años <span className="text-red-500">*</span></span>
                        <span className="text-[11px] text-slate-500 font-medium">Declaro tener la mayoría de edad requerida para solicitar recetas.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentSworn
                        ? 'bg-[#1661E1]/5 border-[#1661E1]/30'
                        : regErrors.consents && !consentSworn
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentSworn} 
                        onChange={(e) => {
                          setConsentSworn(e.target.checked);
                          if (regErrors.consents) setRegErrors(prev => ({ ...prev, consents: undefined }));
                        }} 
                        className="mt-0.5 w-4 h-4 rounded text-[#1661E1] focus:ring-[#1E6EFB]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0141BC] block">
                          Declaración jurada <span className="text-[#0F6C7D] font-normal text-[11px] ml-1">(Obligatorio)</span> <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                          Declaro que la información brindada es verdadera y completa. Comprendo que proporcionar información falsa puede constituir un delito según la legislación vigente.
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentInformed
                        ? 'bg-[#1661E1]/5 border-[#1661E1]/30'
                        : regErrors.consents && !consentInformed
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentInformed} 
                        onChange={(e) => {
                          setConsentInformed(e.target.checked);
                          if (regErrors.consents) setRegErrors(prev => ({ ...prev, consents: undefined }));
                        }} 
                        className="mt-0.5 w-4 h-4 rounded text-[#1661E1] focus:ring-[#1E6EFB]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0141BC] block">
                          Consentimiento del servicio <span className="text-[#0F6C7D] font-normal text-[11px] ml-1">(Obligatorio)</span> <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                          Entiendo que este es un servicio de renovación de tratamientos crónicos ya indicados por un médico. Este servicio NO reemplaza la consulta médica periódica. El profesional puede rechazar mi solicitud si considera que requiero evaluación presencial.
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentTerms
                        ? 'bg-[#1661E1]/5 border-[#1661E1]/30'
                        : regErrors.consents && !consentTerms
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentTerms} 
                        onChange={(e) => {
                          setConsentTerms(e.target.checked);
                          if (regErrors.consents) setRegErrors(prev => ({ ...prev, consents: undefined }));
                        }} 
                        className="mt-0.5 w-4 h-4 rounded text-[#1661E1] focus:ring-[#1E6EFB]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0141BC] block">
                          Política de privacidad <span className="text-[#0F6C7D] font-normal text-[11px] ml-1">(Obligatorio)</span> <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                          Acepto los{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openInfoModal('terminos', 'Términos y Condiciones');
                            }}
                            className="text-[#1661E1] hover:underline font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Términos y Condiciones
                          </button>{' '}
                          y la{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openInfoModal('privacidad', 'Política de Privacidad');
                            }}
                            className="text-[#1661E1] hover:underline font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Política de Privacidad
                          </button>
                          . Autorizo el tratamiento de mis datos de salud según la Ley 25.326 de Protección de Datos Personales.
                        </span>
                      </div>
                    </label>

                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="bg-slate-100 hover:bg-slate-200 text-[#0141BC] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Paso Anterior
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#1661E1] hover:bg-[#0141BC] text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Registrando...' : 'Finalizar Registro'}
                    </button>
                  </div>

                </form>
              )}

            </div>
          )}

          {/* VIEW 3: RECUPERAR CONTRASEÑA */}
          {activeMode === 'forgot' && (
            <div className="space-y-4">
              
              {forgotStep === 1 ? (
                <form onSubmit={handleSubmitForgot} className="space-y-4" noValidate>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                    Ingresá el número de DNI o el correo electrónico registrado con el que creaste tu cuenta y te enviaremos las instrucciones de restablecimiento.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      DNI o Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${forgotErrors.forgotInput ? 'text-rose-500' : 'text-slate-400'}`}>
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={forgotInput}
                        onChange={(e) => {
                          setForgotInput(e.target.value);
                          if (forgotErrors.forgotInput) setForgotErrors({});
                        }}
                        placeholder="DNI o email@ejemplo.com"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                          forgotErrors.forgotInput
                            ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                        }`}
                      />
                    </div>
                    {forgotErrors.forgotInput && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{forgotErrors.forgotInput}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setForgotErrors({});
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-[#0141BC] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#1661E1] hover:bg-[#0141BC] text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </button>
                  </div>

                </form>
              ) : (
                <div className="space-y-4 text-center py-2 animate-fadeIn">
                  {isEnteringWhatsAppCode ? (
                    <form onSubmit={handleSubmitWhatsAppReset} className="space-y-4 text-left" noValidate>
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-[#0141BC] leading-relaxed text-center font-medium shadow-xs">
                        {forgotSuccessMsg}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Código de Verificación <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 123456"
                          className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15 transition-all outline-hidden text-center tracking-widest font-mono text-lg"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Nueva Contraseña <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock className="h-4 w-4" />
                          </div>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15 transition-all outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Confirmar Contraseña <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock className="h-4 w-4" />
                          </div>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repetir contraseña"
                            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15 transition-all outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEnteringWhatsAppCode(false);
                            setForgotSuccessMsg(null);
                            setErrorMsg(null);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-[#0141BC] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                        >
                          Atrás
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="bg-[#1661E1] hover:bg-[#0141BC] text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isLoading ? 'Guardando...' : 'Cambiar Clave'}
                        </button>
                      </div>
                    </form>
                  ) : recoveryOptions && recoveryOptions.action === 'offer' ? (
                    <div className="space-y-4 text-left">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed text-center shadow-xs">
                        <p className="font-semibold text-sm text-[#0141BC] mb-2">¿Cómo querés recuperar tu acceso?</p>
                        Seleccioná una de las opciones registradas en tu cuenta para recibir tu código o enlace de recuperación.
                      </div>

                      <div className="space-y-2.5 pt-2">
                        {(recoveryOptions.method === 'whatsapp' || recoveryOptions.method === 'both') && (
                          <button
                            type="button"
                            onClick={() => handleSendLink('whatsapp')}
                            disabled={isLoading}
                            className="w-full bg-[#14BE99] hover:bg-[#0F9E7F] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <span>Enviar código por WhatsApp ({recoveryOptions.phone})</span>
                          </button>
                        )}

                        {recoveryOptions.method === 'both' && (
                          <button
                            type="button"
                            onClick={() => handleSendLink('email')}
                            disabled={isLoading}
                            className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <span>Enviar enlace por Correo ({recoveryOptions.email})</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          setRecoveryOptions(null);
                          setErrorMsg(null);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-[#0141BC] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        Volver
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="h-9 w-9 text-[#14BE99]" />
                      </div>
                      <h3 className="text-base font-black text-[#0141BC]">
                        {forgotTempPassword ? '¡Contraseña Temporal Generada!' : '¡Enlace Enviado!'}
                      </h3>

                      {forgotTempPassword ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed font-medium text-left shadow-xs space-y-3">
                          <p className="font-semibold">Tu cuenta no tiene datos de contacto registrados.</p>
                          <p>Generamos una contraseña temporal para que puedas ingresar:</p>
                          <div className="bg-white border-2 border-amber-300 rounded-xl px-4 py-3 text-center">
                            <span className="font-mono font-black text-xl text-[#0141BC] tracking-widest select-all">
                              {forgotTempPassword}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 pt-1 border-t border-amber-200/80">
                            ⚠️ <strong>Guardá esta contraseña</strong> antes de cerrar esta pantalla. Al ingresar, el sistema te pedirá que la cambies por una nueva.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 leading-relaxed font-medium max-w-sm mx-auto text-left shadow-xs space-y-2.5">
                          <p className="font-semibold">{forgotSuccessMsg}</p>
                          <p className="text-[11px] text-emerald-800/90 pt-2 border-t border-emerald-200/80 text-center">
                            💡 <strong>Recordá:</strong> Si es por correo y no lo encontrás, revisá la carpeta de <strong>Correo no deseado (SPAM)</strong>.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode('login');
                          setForgotSuccessMsg(null);
                          setForgotTempPassword(null);
                          setRecoveryOptions(null);
                          setForgotStep(1);
                          setErrorMsg(null);
                          setForgotInput('');
                          setForgotErrors({});
                        }}
                        className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-xs uppercase tracking-wider"
                      >
                        Ir a Iniciar Sesión
                      </button>
                    </>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Footer Security / Trust Bar */}
      <footer className="relative z-10 py-6 text-center text-[11px] text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className="hidden sm:inline text-slate-600">·</span>
          <span>Protección de datos personales Ley 25.326</span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span>Mi Receta Online © 2026</span>
        </div>
      </footer>

      {/* Informational Modal */}
      <InformationalModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
        title={infoModal.title}
        type={infoModal.type}
      />

    </div>
  );
}
