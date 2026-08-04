/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
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
        setForgotSuccessMsg(res.data.message || 'Instrucciones de recuperación enviadas con éxito a su casilla de correo electrónico.');
      } else {
        setErrorMsg(res.error || 'No se encontró ningún usuario con ese identificador.');
      }
    } else {
      setForgotSuccessMsg('Se ha enviado un correo electrónico para reestablecer la contraseña.');
    }
  };

  return (
    <div className="grid grid-cols-1 w-full max-w-[500px] mx-auto gap-8 p-8 flex-1 content-center min-h-screen">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-[#316F80] hover:text-[#295EF3] transition-colors font-mono text-[0.65rem] uppercase tracking-widest font-bold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Inicio
        </button>
      )}

      <header className="text-center sm:text-left">
        <Logo variant="full" size="lg" className="mb-4" />
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#316F80] mt-1">Portal de Renovación de Medicación Crónica</p>
      </header>

      <main>
        {/* Error / Success Messages */}
        {(errorMsg || successMsg || forgotSuccessMsg) && (
          <div className="mb-6 p-4 border border-[#1C2435]/15 bg-slate-50 rounded-xl">
            {errorMsg && <p className="text-[0.75rem] font-bold text-red-600 uppercase font-mono">{errorMsg}</p>}
            {successMsg && <p className="text-[0.75rem] font-bold text-[#316F80] uppercase font-mono">{successMsg}</p>}
            {forgotSuccessMsg && <p className="text-[0.75rem] font-bold text-[#295EF3] uppercase font-mono">{forgotSuccessMsg}</p>}
          </div>
        )}

        {/* VIEW 1: LOGIN */}
        {activeMode === 'login' && (
          <form onSubmit={handleSubmitLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Identificador de Usuario</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="DNI o Credencial"
                className="border border-[#1C2435]/20 p-4 w-full rounded-xl text-base focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-[#1C2435]/20 p-4 w-full rounded-xl text-base focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-between items-center py-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#1C2435] hover:text-[#295EF3] transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1C2435]/20 text-[#295EF3]"
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
                className="bg-transparent text-[#316F80] hover:text-[#295EF3] p-0 m-0 border-none hover:underline font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold cursor-pointer"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#1C2435] hover:bg-[#295EF3] text-white p-4 rounded-xl border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] transition-all shadow-md mt-2 disabled:opacity-50 font-bold"
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
              className="bg-transparent text-[#1C2435] border border-[#1C2435]/20 p-4 rounded-xl cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-[#1C2435] hover:text-white transition-all font-bold"
            >
              Crear Nueva Cuenta
            </button>
          </form>
        )}

        {/* VIEW 2: REGISTER */}
        {activeMode === 'register' && (
          <div className="space-y-6">
            <h2 className="font-mono text-[0.85rem] uppercase tracking-[0.1em] font-bold border-b-2 border-[#316F80] text-[#1C2435] pb-2">
              {regStep === 1 ? 'Paso 1: Datos Personales' : 'Paso 2: Declaraciones'}
            </h2>
            
            {regStep === 1 ? (
              <form onSubmit={handleNextRegisterStep} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">DNI (Sin puntos) *</label>
                  <input
                    type="text"
                    required
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 34555888"
                    className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Apellido *</label>
                    <input
                      type="text"
                      required
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Fecha Nac. *</label>
                  <input
                    type="date"
                    required
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Celular *</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                  />
                </div>

                <div className={`grid gap-4 ${regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Obra Social *</label>
                    <select
                      required
                      value={regObraSocial}
                      onChange={(e) => setRegObraSocial(e.target.value)}
                      className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                    >
                      <option value="">-- Seleccionar cobertura --</option>
                      {OBRA_SOCIAL_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {regObraSocial && regObraSocial !== 'Particular / Sin Obra Social' && (
                    <div className="flex flex-col gap-2 animate-fadeIn">
                      <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Nro. Afiliado (Opcional)</label>
                      <input
                        type="text"
                        value={regObraSocialNumber}
                        onChange={(e) => setRegObraSocialNumber(e.target.value)}
                        placeholder="Ej: 12345678-01"
                        className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">Contraseña *</label>
                  <input
                    type={regShowPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="border border-[#1C2435]/20 p-3 w-full rounded-xl text-sm focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveMode('login')}
                    className="bg-transparent text-[#1C2435] border border-[#1C2435]/20 p-4 rounded-xl cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-100 transition-colors font-bold"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="bg-[#295EF3] hover:bg-[#1C2435] text-white p-4 rounded-xl border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] transition-all font-bold shadow-md"
                  >
                    Siguiente
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmitRegister} className="flex flex-col gap-4">
                
                <div className="space-y-4 font-mono text-[0.65rem] leading-relaxed uppercase tracking-[0.05em] text-[#1C2435] border border-[#1C2435]/20 bg-slate-50 p-4 rounded-xl">
                  <p className="font-bold text-[#316F80]">Consentimiento y Declaración:</p>
                  <p>El usuario solicita la intermediación administrativa de recetas destinadas al control y tratamiento de dolencias o patologías crónicas.</p>
                </div>

                <div className="space-y-4 border border-[#1C2435]/20 p-4 rounded-xl bg-white">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentAge} onChange={(e) => setConsentAge(e.target.checked)} className="w-4 h-4 rounded text-[#295EF3]" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold text-[#1C2435]">Soy mayor de 18 años</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentTerms} onChange={(e) => setConsentTerms(e.target.checked)} className="w-4 h-4 rounded text-[#295EF3]" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold text-[#1C2435]">Acepto Términos y Condiciones</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentInformed} onChange={(e) => setConsentInformed(e.target.checked)} className="w-4 h-4 rounded text-[#295EF3]" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold text-[#1C2435]">Acepto Consentimiento Informado</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={consentSworn} onChange={(e) => setConsentSworn(e.target.checked)} className="w-4 h-4 rounded text-[#295EF3]" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] font-bold text-[#1C2435]">Información Verídica (DDJJ)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="bg-transparent text-[#1C2435] border border-[#1C2435]/20 p-4 rounded-xl cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-100 transition-colors font-bold"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#295EF3] hover:bg-[#1C2435] text-white p-4 rounded-xl border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] disabled:opacity-50 font-bold transition-all shadow-md"
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
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#316F80] font-bold mb-4 leading-loose">
              Ingrese el número de DNI o el correo registrado para recibir sus claves.
            </p>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] uppercase tracking-[0.15em] font-bold text-[#1C2435]">DNI o Correo</label>
              <input
                type="text"
                required
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                className="border border-[#1C2435]/20 p-4 w-full rounded-xl text-base focus:border-[#295EF3] focus:outline-none bg-white text-[#1C2435]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                type="button"
                onClick={() => setActiveMode('login')}
                className="bg-transparent text-[#1C2435] border border-[#1C2435]/20 p-4 rounded-xl cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-100 transition-colors font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#295EF3] hover:bg-[#1C2435] text-white p-4 rounded-xl border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] font-bold transition-all shadow-md"
              >
                {isLoading ? '...' : 'Recuperar'}
              </button>
            </div>
          </form>
        )}

      </main>

      <footer className="border-t border-[#1C2435]/10 pt-4 mt-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-slate-500 font-bold text-center">Mi Receta Online — 2026</p>
      </footer>
    </div>
  );
}
