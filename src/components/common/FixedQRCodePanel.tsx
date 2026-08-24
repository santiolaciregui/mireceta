/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Printer, 
  Sparkles,
  Info
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface FixedQRCodePanelProps {
  tenantId?: string;
  tenantName?: string;
}

export default function FixedQRCodePanel({ tenantId, tenantName }: FixedQRCodePanelProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'https://mireceta.online';
  
  // Canonical permanent URL for the QR code
  const canonicalPath = tenantId && tenantId !== 'TEN-0001' ? `/r/${tenantId}` : '/r/solicitud';
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const displayUrl = `https://mireceta.online${canonicalPath}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(displayUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadPNG = () => {
    const link = document.createElement('a');
    link.href = '/qr-oficial.png';
    link.download = `QR_Fijo_MiReceta_${tenantId || 'Oficial'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSVG = () => {
    const link = document.createElement('a');
    link.href = '/qr-oficial.svg';
    link.download = `QR_Fijo_MiReceta_${tenantId || 'Oficial'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1661E1] to-[#14BE99] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Código QR Fijo e Inmutable del Sistema
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Permalink Activo
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {tenantName ? `Canal de acceso directo para ${tenantName}` : 'Código oficial para afiches, mostradores e imprenta.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
        {/* QR Display Card */}
        <div className="flex flex-col items-center bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <div className="relative group bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <img 
              src="/qr-oficial.svg" 
              alt="Código QR Oficial Fijo"
              className="w-44 h-44 object-contain mx-auto transition-transform group-hover:scale-105 duration-200"
              onError={(e) => {
                // Fallback to SVG render via Google Chart API if local asset not served yet
                (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(canonicalUrl)}&color=1661E1`;
              }}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#14BE99]" /> Nunca caduca ni expira
          </span>
        </div>

        {/* Info & Action Column */}
        <div className="space-y-4">
          {/* Explanation Alert */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#1661E1]">
              <Sparkles className="w-4 h-4 text-[#1661E1]" />
              <span>¿Por qué este QR es permanente?</span>
            </div>
            <p className="leading-relaxed">
              Este código utiliza la ruta canónica fija <strong className="font-semibold text-slate-900">{canonicalPath}</strong>. 
              Podés imprimirlo en folletos, cartelería o soportes acrílicos. Aunque en el futuro cambies la estructura interna de la aplicación, 
              el QR impreso **seguirá funcionando siempre** sin necesidad de reimprimir nada.
            </p>
          </div>

          {/* Canonical Link Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              URL Canónica Codificada
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={displayUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-medium focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPNG}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#1661E1] text-white rounded-xl text-xs font-bold hover:bg-[#1250be] transition-colors shadow-md shadow-blue-500/15 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG (Alta Res.)</span>
            </button>

            <button
              onClick={handleDownloadSVG}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Descargar SVG (Imprenta)</span>
            </button>

            <a
              href={canonicalPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold text-[#1661E1] hover:underline"
            >
              <span>Probar en navegador</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
