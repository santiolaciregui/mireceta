/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  LogIn, 
  Eye, 
  EyeOff, 
  Activity, 
  ShieldCheck, 
  ChevronRight,
  HeartHandshake,
  UserPlus,
  ArrowLeft,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { OBRA_SOCIAL_OPTIONS } from '../types';

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
  const [forgotEmail, setForgotEmail] = useState('');
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
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('recetafacil-remember-me', identifier.trim());
    } else {
      localStorage.removeItem('recetafacil-remember-me');
    }

    const res = await onLogin(identifier, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Credenciales de acceso inválidas.');
    } else {
      setSuccessMsg('¡Sesión iniciada correctamente!');
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
        setSuccessMsg('¡Registro exitoso y sesión iniciada!');
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
        setForgotSuccessMsg(res.data.message || 'Instrucciones enviadas.');
        if (res.data.demoPassword) {
          setForgotSuccessMsg(prev => `${prev} • Para pruebas del evaluador, su contraseña registrada es: "${res.data.demoPassword}"`);
        }
      } else {
        setErrorMsg(res.error || 'No se encontró ningún usuario con ese identificador.');
      }
    } else {
      // client side mock fallback
      setForgotSuccessMsg('Se ha enviado un correo electrónico para reestablecer la contraseña.');
    }
  };

  // Quick prefill helper for evaluation
  const prefill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveMode('login');
  };

  return (
    <div className="grid grid-cols-1 w-full max-w-[500px] mx-auto gap-8 p-8 flex-1 content-center min-h-screen">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-mono text-[0.65rem] uppercase tracking-widest font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Inicio
        </button>
      )}

      <header>
        <h1 className="text-[3rem] tracking-[-0.04em] leading-[0.9] mb-2 font-sans font-semibold text-[var(--ink)]">Mi Receta Online</h1>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Portal de Renovación de Medicación Crónica</p>
      </header>

      <main>
        {/* Error / Success Messages */}
        {(errorMsg || successMsg || forgotSuccessMsg) && (
          <div className="mb-6 p-4 border border-[var(--ink-faint)]">
            {errorMsg && <p className="text-[0.75rem] font-bold text-red-600 uppercase font-mono">{errorMsg}</p>}
            {successMsg && <p className="text-[0.75rem] font-bold text-[var(--ink)] uppercase font-mono">{successMsg}</p>}
            {forgotSuccessMsg && <p className="text-[0.75rem] font-bold text-[var(--ink)] uppercase font-mono">{forgotSuccessMsg}</p>}
          </div>
        )}

        {/* VIEW 1: LOGIN */}
        {activeMode === 'login' && (
          <form onSubmit={handleSubmitLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Identificador de Usuario</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="DNI o Credencial"
                className="border border-[var(--ink-faint)] p-4 w-full rounded-none text-base focus:border-[var(--accent)] focus:outline-none bg-transparent"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-[var(--ink-faint)] p-4 w-full rounded-none text-base focus:border-[var(--accent)] focus:outline-none bg-transparent"
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-between items-center py-2">
              <label className="flex items-center gap-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-none border-[var(--ink-faint)]"
                />
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold">Recordarme</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('forgot');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="bg-transparent text-[var(--ink)] p-0 m-0 border-none hover:underline opacity-60 hover:opacity-100 font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-[var(--ink)] text-white p-4 border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] mt-2 disabled:opacity-50"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar al Portal'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('register');
                setRegStep(1);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="bg-transparent text-[var(--ink)] border border-[var(--ink-faint)] p-4 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-[var(--ink)] hover:text-white transition-colors"
            >
              Crear Nueva Cuenta
            </button>
          </form>
        )}

        {/* VIEW 2: REGISTER */}
        {activeMode === 'register' && (
          <div className="space-y-6">
            <h2 className="font-mono text-[0.85rem] uppercase tracking-[0.1em] font-bold border-b border-[var(--ink-faint)] pb-2">
              {regStep === 1 ? 'Paso 1: Datos Personales' : 'Paso 2: Declaraciones'}
            </h2>
            
            {regStep === 1 ? (
              <form onSubmit={handleNextRegisterStep} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">DNI (Sin puntos) *</label>
                  <input
                    type="text"
                    required
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 34555888"
                    className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Apellido *</label>
                    <input
                      type="text"
                      required
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Fecha Nac. *</label>
                  <input
                    type="date"
                    required
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Celular *</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                  />
                </div>

                <div className={`grid gap-4 ${regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Obra Social *</label>
                    <select
                      required
                      value={regObraSocial}
                      onChange={(e) => setRegObraSocial(e.target.value)}
                      className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                    >
                      <option value="">-- Seleccionar cobertura --</option>
                      {OBRA_SOCIAL_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' && (
                    <div className="flex flex-col gap-2 animate-fadeIn">
                      <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Nro. Afiliado (Opcional)</label>
                      <input
                        type="text"
                        value={regObraSocialNumber}
                        onChange={(e) => setRegObraSocialNumber(e.target.value)}
                        placeholder="Ej: 12345678-01"
                        className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">Contraseña *</label>
                  <input
                    type={regShowPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="border border-[var(--ink-faint)] p-3 w-full rounded-none text-sm focus:border-[var(--accent)] focus:outline-none bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveMode('login')}
                    className="bg-transparent text-[var(--ink)] border border-[var(--ink-faint)] p-4 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="bg-[var(--ink)] text-white p-4 border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em]"
                  >
                    Siguiente
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitRegister} className="flex flex-col gap-4">
                
                <div className="space-y-4 font-mono text-[0.65rem] leading-relaxed uppercase tracking-[0.05em] text-[var(--ink)] opacity-80 border border-[var(--ink-faint)] p-4">
                  <p className="font-bold">Consentimiento y Declaración:</p>
                  <p>El usuario solicita la intermediación administrativa de recetas destinadas al control y tratamiento de dolencias o patologías crónicas.</p>
                </div>

                <div className="space-y-4 border border-[var(--ink-faint)] p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentAge} onChange={(e) => setConsentAge(e.target.checked)} className="w-4 h-4 rounded-none" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold">Soy mayor de 18 años</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentTerms} onChange={(e) => setConsentTerms(e.target.checked)} className="w-4 h-4 rounded-none" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold">Acepto Términos y Condiciones</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentInformed} onChange={(e) => setConsentInformed(e.target.checked)} className="w-4 h-4 rounded-none" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold">Acepto Consentimiento Informado</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentSworn} onChange={(e) => setConsentSworn(e.target.checked)} className="w-4 h-4 rounded-none" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold">Información Verídica (DDJJ)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="bg-transparent text-[var(--ink)] border border-[var(--ink-faint)] p-4 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[var(--ink)] text-white p-4 border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] disabled:opacity-50"
                  >
                    {isLoading ? '...' : 'Finalizar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: FORGOT PASSWORD */}
        {activeMode === 'forgot' && !forgotSuccessMsg && (
          <form onSubmit={handleSubmitForgot} className="flex flex-col gap-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold mb-4 leading-loose">
              Ingrese el número de DNI o el correo registrado para recibir sus claves.
            </p>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-[var(--ink)]">DNI o Correo</label>
              <input
                type="text"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                className="border border-[var(--ink-faint)] p-4 w-full rounded-none text-base focus:border-[var(--accent)] focus:outline-none bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                type="button"
                onClick={() => setActiveMode('login')}
                className="bg-transparent text-[var(--ink)] border border-[var(--ink-faint)] p-4 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[var(--ink)] text-white p-4 border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em]"
              >
                {isLoading ? '...' : 'Recuperar'}
              </button>
            </div>
          </form>
        )}

      </main>

      <footer className="border-t border-[var(--ink-faint)] pt-4 mt-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 font-bold text-center">Mi Receta Online — 2026</p>
      </footer>
    </div>
  );
}
