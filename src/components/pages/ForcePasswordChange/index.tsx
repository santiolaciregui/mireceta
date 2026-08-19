import React, { useState } from 'react';
import { Lock, ShieldAlert, Check, AlertCircle } from 'lucide-react';

interface ForcePasswordChangeProps {
  onSuccess: () => void;
  token: string;
}

export default function ForcePasswordChange({ onSuccess, token }: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const errors: typeof fieldErrors = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = 'Debe ingresar la contraseña actual o temporal provista.';
    }

    if (!newPassword.trim()) {
      errors.newPassword = 'Debe ingresar una nueva contraseña.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres.';
    } else if (currentPassword.trim() && newPassword === currentPassword) {
      errors.newPassword = 'La nueva contraseña debe ser distinta a la contraseña actual.';
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Debe confirmar su nueva contraseña.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Por favor corrija los campos marcados en rojo.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar contraseña.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0141BC]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp border border-slate-200 max-h-[calc(100dvh-2rem)] flex flex-col">
        <div className="bg-[#0141BC] p-4 sm:p-6 text-white text-center border-b border-white/10 shrink-0">
          <div className="bg-white/15 w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-3 border border-white/20">
            <ShieldAlert className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          </div>
          <h2 className="text-base sm:text-xl font-bold">Cambio de Contraseña Obligatorio</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">Por tu seguridad, debes actualizar tu contraseña antes de continuar utilizando la plataforma.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0" noValidate>
          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold mb-4 border border-red-200 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña Actual (Temporal) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${fieldErrors.currentPassword ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.currentPassword) setFieldErrors(prev => ({ ...prev, currentPassword: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden ${
                    fieldErrors.currentPassword
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-slate-50 border border-slate-300 text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#1661E1] focus:border-[#1661E1]'
                  }`}
                  placeholder="La que recibiste por correo (ej. 123456)"
                />
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.currentPassword}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${fieldErrors.newPassword ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden ${
                    fieldErrors.newPassword
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-slate-50 border border-slate-300 text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#1661E1] focus:border-[#1661E1]'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {fieldErrors.newPassword && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.newPassword}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 h-4 w-4 ${fieldErrors.confirmPassword ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden ${
                    fieldErrors.confirmPassword
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-slate-50 border border-slate-300 text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#1661E1] focus:border-[#1661E1]'
                  }`}
                  placeholder="Repite la nueva contraseña"
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'Actualizando...' : (
              <>
                <Check className="w-4 h-4" />
                Actualizar y Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
