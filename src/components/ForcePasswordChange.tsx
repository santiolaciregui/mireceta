import React, { useState } from 'react';
import { Lock, ShieldAlert, Check } from 'lucide-react';

interface ForcePasswordChangeProps {
  onSuccess: () => void;
  token: string;
}

export default function ForcePasswordChange({ onSuccess, token }: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

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
      setError(err.message || 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1C2435]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
        <div className="bg-[#1C2435] p-6 text-white text-center border-b border-white/10">
          <div className="bg-[#295EF3]/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#295EF3]/30">
            <ShieldAlert className="w-8 h-8 text-[#295EF3]" />
          </div>
          <h2 className="text-xl font-bold">Cambio de Contraseña Obligatorio</h2>
          <p className="text-slate-300 text-sm mt-2">Por tu seguridad, debes actualizar tu contraseña antes de continuar utilizando la plataforma.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-100 flex items-center gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1C2435] mb-1">Contraseña Actual (Temporal)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#295EF3] focus:outline-none transition-all"
                  placeholder="La que recibiste por correo (ej. 123456)"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1C2435] mb-1">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#295EF3] focus:outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1C2435] mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#295EF3] focus:outline-none transition-all"
                  placeholder="Repite la nueva contraseña"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-[#295EF3] hover:bg-[#1C2435] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Actualizando...' : (
              <>
                <Check className="w-5 h-5" />
                Actualizar y Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
