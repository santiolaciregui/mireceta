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
  Check
} from 'lucide-react';
import { OBRA_SOCIAL_OPTIONS } from '../types';
import Logo from './Logo';

interface LoginProps {
  onLogin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  onRegister?: (userData: any) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword?: (identifier: string, email: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLogin, isLoading, onRegister, onForgotPassword, onBack, initialMode }: LoginProps) {
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
  const [regObraSocial, setRegObraSocial] = useState('');
  const [regObraSocialNumber, setRegObraSocialNumber] = useState('');
  const [regStep, setRegStep] = useState<1 | 2>(1); // 1: Datos, 2: T&C + DDJJ

  // Register Consents
  const [consentAge, setConsentAge] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentInformed, setConsentInformed] = useState(false);
  const [consentSworn, setConsentSworn] = useState(false);

  // Forgot Password fields
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

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

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor complete todos los campos requeridos.');
      return;
    }

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
    if (!regIdentifier.trim() || !regName.trim() || !regLastName.trim() || !regPassword.trim() || !regBirthDate || !regPhone.trim() || !regObraSocial) {
      setErrorMsg('Por favor complete todos los campos obligatorios del registro.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres por seguridad.');
      return;
    }
    setRegStep(2);
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!consentAge || !consentTerms || !consentInformed || !consentSworn) {
      setErrorMsg('Debe aceptar obligatoriamente todos los consentimientos y declaraciones juradas para continuar.');
      return;
    }

    if (onRegister) {
      const res = await onRegister({
        identifier: regIdentifier.trim(),
        password: regPassword.trim(),
        name: regName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        birthDate: regBirthDate,
        obraSocial: regObraSocial,
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

    if (!forgotInput.trim()) {
      setErrorMsg('Por favor ingrese su número de DNI o email registrado.');
      return;
    }

    if (onForgotPassword) {
      const isEmail = forgotInput.includes('@');
      const res = await onForgotPassword(isEmail ? '' : forgotInput, isEmail ? forgotInput : '');
      if (res.success) {
        setForgotSuccessMsg(res.data?.message || 'Instrucciones de recuperación enviadas con éxito a su casilla de correo electrónico.');
      } else {
        setErrorMsg(res.error || 'No se encontró ningún usuario registrado con esos datos.');
      }
    } else {
      setForgotSuccessMsg('Se ha enviado un correo electrónico para reestablecer la contraseña.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1C2435] text-white flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#295EF3] selection:text-white">
      
      {/* Background Ambience & Lighting */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1920&auto=format&fit=crop')`
        }}
      />
      <div className="absolute top-0 -left-40 w-96 h-96 bg-[#295EF3]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-[#316F80]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1C2435]/90 via-[#1C2435]/95 to-[#1C2435] pointer-events-none" />

      {/* Top Header / Back Navigation */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        {onBack ? (
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer backdrop-blur-sm shadow-xs"
          >
            <ArrowLeft className="h-4 w-4 text-[#295EF3]" />
            <span>Volver al Inicio</span>
          </button>
        ) : (
          <div />
        )}

      </header>

      {/* Center Main Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <div className={`w-full ${activeMode === 'register' ? 'max-w-[580px]' : 'max-w-[480px]'} transition-all duration-300 bg-white text-[#1C2435] rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-10 relative overflow-hidden backdrop-blur-md`}>
          
          {/* Top Decorative Gradient Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#316F80] via-[#295EF3] to-[#316F80] absolute top-0 left-0" />

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
                    ? 'bg-white text-[#295EF3] shadow-sm font-black'
                    : 'text-slate-600 hover:text-[#1C2435]'
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
                    ? 'bg-white text-[#295EF3] shadow-sm font-black'
                    : 'text-slate-600 hover:text-[#1C2435]'
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
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {forgotSuccessMsg && (
            <div className="mb-6 p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-[#295EF3] shrink-0 mt-0.5" />
              <span>{forgotSuccessMsg}</span>
            </div>
          )}

          {/* VIEW 1: INICIAR SESIÓN */}
          {activeMode === 'login' && (
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              
              {/* Field: DNI / Identificador */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Identificador (DNI o Usuario)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ej: 34555888"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Field: Contraseña */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-[#316F80] hover:text-[#295EF3] font-bold transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
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
              </div>

              {/* Recordarme */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#295EF3] focus:ring-[#295EF3]"
                  />
                  <span>Recordar mi DNI en este dispositivo</span>
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 mt-2"
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
                    regStep === 1 ? 'bg-[#295EF3] text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {regStep === 1 ? '1' : <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-xs font-extrabold text-[#1C2435]">
                    {regStep === 1 ? 'Paso 1: Datos Personales' : 'Paso 2: Declaraciones Legales'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Paso {regStep} de 2
                </span>
              </div>

              {regStep === 1 ? (
                <form onSubmit={handleNextRegisterStep} className="space-y-4">
                  
                  {/* Field: DNI */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      DNI (Sin puntos) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={regIdentifier}
                        onChange={(e) => setRegIdentifier(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 34555888"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Fields: Nombre & Apellido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ej: Juan"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Ej: Pérez"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Fields: Fecha Nac. & Celular */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Fecha de Nacimiento <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <input
                          type="date"
                          required
                          value={regBirthDate}
                          onChange={(e) => setRegBirthDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Celular / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="Ej: 1122334455"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fields: Obra Social & Número */}
                  <div className={`grid gap-3 ${regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Obra Social / Prepaga <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <select
                          required
                          value={regObraSocial}
                          onChange={(e) => setRegObraSocial(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden cursor-pointer"
                        >
                          <option value="">-- Seleccionar cobertura --</option>
                          {OBRA_SOCIAL_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Nro. Afiliado (Opcional)
                        </label>
                        <input
                          type="text"
                          value={regObraSocialNumber}
                          onChange={(e) => setRegObraSocialNumber(e.target.value)}
                          placeholder="Ej: 12345678-01"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                        />
                      </div>
                    )}
                  </div>

                  {/* Field: Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Correo Electrónico (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="tuemail@ejemplo.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Field: Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Crear Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
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
                  </div>

                  {/* Stepper Next Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold py-3.5 px-6 rounded-xl transition-all font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Continuar al Paso 2</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                </form>
              ) : (
                /* STEP 2: LEGAL CONSENTS */
                <form onSubmit={handleSubmitRegister} className="space-y-4">
                  
                  <div className="bg-[#316F80]/10 border border-[#316F80]/20 p-4 rounded-2xl text-xs text-[#1C2435] leading-relaxed flex items-start gap-3">
                    <FileText className="h-5 w-5 text-[#316F80] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#1C2435] mb-1">Declaración y Consentimiento de Telemedicina</p>
                      <p className="text-slate-600 text-[11px]">
                        Al registrarte confirmás que la información proporcionada es fidedigna y autorizás la evaluación médica asincrónica bajo secreto médico profesional.
                      </p>
                    </div>
                  </div>

                  {/* Consent Checkboxes */}
                  <div className="space-y-2.5">
                    
                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentAge ? 'bg-[#295EF3]/5 border-[#295EF3]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentAge} 
                        onChange={(e) => setConsentAge(e.target.checked)} 
                        className="mt-0.5 w-4 h-4 rounded text-[#295EF3] focus:ring-[#295EF3]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1C2435] block">Soy mayor de 18 años</span>
                        <span className="text-[11px] text-slate-500 font-medium">Declaro tener la mayoría de edad requerida para solicitar recetas.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentTerms ? 'bg-[#295EF3]/5 border-[#295EF3]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentTerms} 
                        onChange={(e) => setConsentTerms(e.target.checked)} 
                        className="mt-0.5 w-4 h-4 rounded text-[#295EF3] focus:ring-[#295EF3]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1C2435] block">Acepto los Términos y Condiciones</span>
                        <span className="text-[11px] text-slate-500 font-medium">Acepto las condiciones generales del servicio de telemedicina.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentInformed ? 'bg-[#295EF3]/5 border-[#295EF3]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentInformed} 
                        onChange={(e) => setConsentInformed(e.target.checked)} 
                        className="mt-0.5 w-4 h-4 rounded text-[#295EF3] focus:ring-[#295EF3]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1C2435] block">Consentimiento Informado</span>
                        <span className="text-[11px] text-slate-500 font-medium">Entiendo que la emisión queda sujeta al criterio médico profesional.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      consentSworn ? 'bg-[#295EF3]/5 border-[#295EF3]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={consentSworn} 
                        onChange={(e) => setConsentSworn(e.target.checked)} 
                        className="mt-0.5 w-4 h-4 rounded text-[#295EF3] focus:ring-[#295EF3]" 
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1C2435] block">Declaración Jurada (DDJJ)</span>
                        <span className="text-[11px] text-slate-500 font-medium">Declaro bajo juramento que los datos suministrados son reales.</span>
                      </div>
                    </label>

                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1C2435] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Paso Anterior
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#295EF3] hover:bg-[#1C2435] text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
              
              {!forgotSuccessMsg ? (
                <form onSubmit={handleSubmitForgot} className="space-y-4">
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                    Ingresá el número de DNI o el correo electrónico registrado con el que creaste tu cuenta y te enviaremos las instrucciones de restablecimiento.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      DNI o Correo Electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotInput}
                        onChange={(e) => setForgotInput(e.target.value)}
                        placeholder="DNI o email@ejemplo.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#1C2435] placeholder:text-slate-400 focus:bg-white focus:border-[#295EF3] focus:ring-4 focus:ring-[#295EF3]/10 transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-[#1C2435] py-3.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#295EF3] hover:bg-[#1C2435] text-white py-3.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </button>
                  </div>

                </form>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-[#1C2435]">Solicitud Enviada</h3>
                  <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                    Si los datos coinciden con un usuario registrado, recibirás un correo con el enlace de recuperación.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('login');
                      setForgotSuccessMsg(null);
                      setErrorMsg(null);
                    }}
                    className="w-full bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md cursor-pointer text-xs"
                  >
                    Volver a Iniciar Sesión
                  </button>
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

    </div>
  );
}
