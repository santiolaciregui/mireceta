import React, { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle, Save, Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function PaymentConfigPanel() {
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [pricePerPrescription, setPricePerPrescription] = useState('10000');
  const [fieldErrors, setFieldErrors] = useState<{ mpAccessToken?: string }>({});
  
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/tenants/payment-config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setMpAccessToken(data.mpAccessToken || '');
          setMpPublicKey(data.mpPublicKey || '');
          setMpEnabled(Boolean(data.mpEnabled));
          if (data.pricePerPrescription) {
            setPricePerPrescription(data.pricePerPrescription.toString());
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    if (mpEnabled && !mpAccessToken.trim()) {
      setFieldErrors({ mpAccessToken: 'El Access Token es obligatorio cuando los pagos por Mercado Pago están habilitados.' });
      setMessage({ type: 'error', text: 'Por favor complete el campo de Access Token obligatorio.' });
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/tenants/payment-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}`
        },
        body: JSON.stringify({
          mpAccessToken: mpAccessToken.trim(),
          mpPublicKey: mpPublicKey.trim(),
          mpEnabled,
          pricePerPrescription: Number(pricePerPrescription)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración');
      }

      setMessage({ type: 'success', text: 'Configuración guardada correctamente en la base de datos.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar cambios' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center text-xs text-slate-400">
        Cargando configuración de pagos...
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#1661E1]/10 border border-[#1661E1]/20 text-[#1661E1] rounded-2xl flex items-center justify-center font-bold">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#0141BC]">Configuración Pasarela de Pago y Aranceles</h3>
            <p className="text-xs text-slate-500 font-medium">Precios base y credenciales de Mercado Pago</p>
          </div>
        </div>

        <a
          href="https://www.mercadopago.com.ar/developers/panel/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#1661E1] hover:text-[#0141BC] font-bold flex items-center gap-1 hover:underline"
        >
          <span>Obtener Credenciales Oficiales</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' ? 'bg-[#14BE99]/10 text-[#0F6C7D] border border-[#14BE99]/30' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="h-4 w-4 shrink-0 text-[#14BE99]" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4" noValidate>
        {/* Precio base por receta */}
        <div>
          <label className="block text-xs font-bold text-[#0141BC] uppercase tracking-wider mb-1">
            Precio Base por Receta (cada 2 medicamentos)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              min="0"
              value={pricePerPrescription}
              onChange={(e) => setPricePerPrescription(e.target.value)}
              placeholder="10000"
              className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            Este será el precio base que se cobrará por cada receta. Una receta puede contener hasta 2 medicamentos.
          </span>
        </div>

        {/* Toggle Enable */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="font-bold text-xs text-[#0141BC] block">Habilitar Cobro Online por Mercado Pago</span>
            <span className="text-[11px] text-slate-500 font-medium">Permitir a los pacientes pagar la tasa de arancel mediante Checkout Pro</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mpEnabled}
              onChange={(e) => {
                setMpEnabled(e.target.checked);
                if (fieldErrors.mpAccessToken) setFieldErrors({});
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1661E1]"></div>
          </label>
        </div>

        {/* Access Token */}
        <div>
          <label className="block text-xs font-bold text-[#0141BC] uppercase tracking-wider mb-1">
            Mercado Pago Access Token {mpEnabled ? <span className="text-red-500">*</span> : '(Opcional)'}
          </label>
          <div className="relative">
            <input
              type={showAccessToken ? 'text' : 'password'}
              value={mpAccessToken}
              onChange={(e) => {
                setMpAccessToken(e.target.value);
                if (fieldErrors.mpAccessToken) setFieldErrors({});
              }}
              placeholder="APP_USR-xxxxxx-xxxxxx-xxxxxx..."
              className={`w-full pl-3 pr-10 py-2.5 rounded-xl text-xs font-mono transition-all outline-hidden ${
                fieldErrors.mpAccessToken
                  ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                  : 'bg-slate-50 border border-slate-300 text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#1661E1]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowAccessToken(!showAccessToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.mpAccessToken ? (
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fieldErrors.mpAccessToken}</span>
            </p>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">
              Token secreto para la creación segura de preferencias de pago (Production o Test).
            </span>
          )}
        </div>

        {/* Public Key */}
        <div>
          <label className="block text-xs font-bold text-[#0141BC] uppercase tracking-wider mb-1">
            Mercado Pago Public Key (Opcional)
          </label>
          <input
            type="text"
            value={mpPublicKey}
            onChange={(e) => setMpPublicKey(e.target.value)}
            placeholder="APP_USR-xxxxxx-xxxxxx..."
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            Clave pública util para identificadores de checkout frontal.
          </span>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#1661E1] hover:bg-[#0141BC] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Guardando...' : 'Guardar Configuración'}</span>
        </button>
      </form>
    </div>
  );
}
