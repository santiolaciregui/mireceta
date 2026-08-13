/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Logo from '../../Logo';

interface ResetPasswordProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function ResetPassword({ token, onSuccess, onBack }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!newPassword.trim()) {
      errors.newPassword = 'Ingresá tu nueva contraseña.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmá tu nueva contraseña.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }
      setSuccessMsg(data.message || '¡Contraseña actualizada con éxito!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0141BC] text-white flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#1661E1] selection:text-white">

      {/* Background Ambience */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity scale-105 pointer-events-none"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1920&auto=format&fit=crop')` }}
      />
      <div className="absolute top-0 -left-40 w-96 h-96 bg-[#1661E1]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-[#0F6C7D]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0141BC]/90 via-[#0141BC]/95 to-[#0141BC] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold border border-white/15 transition-all cursor-pointer backdrop-blur-sm shadow-xs"
        >
          <ArrowLeft className="h-4 w-4 text-[#1E6EFB]" />
          <span>Volver al Inicio</span>
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8 my-auto w-full">
        <div className="w-full max-w-[440px] bg-white text-[#0F172A] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 p-5 sm:p-8 lg:p-10 relative overflow-hidden">

          {/* Gradient top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#0F6C7D] via-[#1661E1] to-[#14BE99] absolute top-0 left-0" />

          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-6">
            <div className="flex justify-center">
              <Logo variant="full" size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Establecé tu nueva contraseña de acceso
            </p>
          </div>

          {successMsg ? (
            /* Success State */
            <div className="space-y-4 text-center py-2 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-9 w-9 text-[#14BE99]" />
              </div>
              <h3 className="text-base font-black text-[#0141BC]">¡Contraseña Actualizada!</h3>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 leading-relaxed font-medium text-left shadow-xs">
                <p className="font-semibold">{successMsg}</p>
                <p className="text-[11px] text-emerald-800/90 pt-2 border-t border-emerald-200/80 mt-2">
                  Ya podés iniciar sesión con tu nueva contraseña.
                </p>
              </div>
              <button
                type="button"
                onClick={onSuccess}
                className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-xs uppercase tracking-wider"
              >
                Iniciar Sesión
              </button>
            </div>
          ) : (
            /* Reset Form */
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#0141BC] shrink-0 mt-0.5" />
                <span>Elegí una contraseña segura de al menos 6 caracteres. No la compartás con nadie.</span>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs animate-fadeIn">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nueva Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${fieldErrors.newPassword ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                    }}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                      fieldErrors.newPassword
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.newPassword}</span>
                  </p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Confirmar Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${fieldErrors.confirmPassword ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="Repetí la nueva contraseña"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium placeholder:text-slate-400 transition-all outline-hidden ${
                      fieldErrors.confirmPassword
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-200 text-[#0F172A] focus:bg-white focus:border-[#1661E1] focus:ring-4 focus:ring-[#1E6EFB]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white py-3.5 px-4 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? 'Actualizando...' : 'Establecer Nueva Contraseña'}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full text-center text-xs text-slate-500 hover:text-[#0141BC] font-semibold py-1 transition-colors cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-[11px] text-slate-400 font-medium">
        <p>© {new Date().getFullYear()} Mi Receta · Plataforma segura de recetas digitales</p>
      </footer>
    </div>
  );
}
