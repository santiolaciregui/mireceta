import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle } from 'lucide-react';
import Logo from './Logo';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'privacidad' | 'terminos' | 'arrepentimiento';
  onGoToRegister?: () => void;
}

export default function InformationalModal({ isOpen, onClose, title, type, onGoToRegister }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1C2435]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1C2435] text-white p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-[#295EF3] text-white p-2.5 rounded-xl shadow-sm">
              {type === 'privacidad' && <Lock className="h-5 w-5" />}
              {type === 'terminos' && <FileText className="h-5 w-5" />}
              {type === 'arrepentimiento' && <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{title}</h3>
              <p className="text-xs text-slate-300 font-medium">Mi Receta Online — Documento Oficial</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-[#1C2435] leading-relaxed font-medium">
          
          {type === 'privacidad' && (
            <>
              <div className="bg-[#295EF3]/5 border border-[#295EF3]/20 rounded-xl p-4 text-[#1C2435] flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#295EF3] shrink-0 mt-0.5" />
                <p className="text-xs">
                  Tus datos personales y de salud están strictly encriptados y protegidos bajo la <strong>Ley N° 25.326 de Protección de Datos Personales</strong> de la República Argentina y secreto médico profesional.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">1. Recolección de Datos Clínicos</h4>
                <p>
                  Recopilamos únicamente la información médica y personal indispensable para que nuestros profesionales de la salud evalúen tus solicitudes de renovación de medicamentos o pedidos de estudios médicos.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">2. Secreto Médico y Confidencialidad</h4>
                <p>
                  Toda la información médica suministrada es tratada bajo el deber de confidencialidad y secreto profesional legal estipulado en las normativas del ejercicio de la medicina.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">3. Seguridad Técnica</h4>
                <p>
                  Utilizamos protocolos de encriptación de grado bancario (SSL/TLS) para la transmisión de datos. No almacenamos datos sensibles de tarjetas ni medios de pago en nuestros servidores.
                </p>
              </section>
            </>
          )}

          {type === 'terminos' && (
            <>
              <div className="bg-[#316F80]/5 border border-[#316F80]/20 rounded-xl p-4 text-[#1C2435] flex items-start gap-3">
                <FileText className="h-5 w-5 text-[#316F80] shrink-0 mt-0.5" />
                <p className="text-xs">
                  Al solicitar una receta o consulta digital en nuestra plataforma, aceptás los presentes Términos y Condiciones del Servicio de Telemedicina Asincrónica.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">1. Alcance de la Plataforma</h4>
                <p>
                  Mi Receta Online es un conector tecnológico entre pacientes y médicos matriculados. La emisión de recetas u órdenes de estudio es un acto exclusivo del médico actuante bajo su criterio profesional.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">2. Emergencias y Urgencias</h4>
                <p>
                  <strong>NO ATENDEMOS URGENCIAS NI EMERGENCIAS MÉDICAS.</strong> Ante cualquier síntoma agudo o de gravedad, el usuario debe comunicarse inmediatamente al 107 (SAME) o dirigirse a la guardia médica más cercana.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">3. Prescripción y Firma Digital</h4>
                <p>
                  Todas las recetas emitidas cuentan con Firma Digital legalmente respaldada y código QR para su directa presentación en farmacias de la República Argentina.
                </p>
              </section>
            </>
          )}

          {type === 'arrepentimiento' && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs">
                  Conforme a las normativas vigentes de Defensa del Consumidor, podés solicitar el reembolso de tu consulta antes de que sea procesada por el profesional médico.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#1C2435]">Botón de Arrepentimiento</h4>
                <p>
                  Si realizaste el pago de una solicitud y la misma aún se encuentra en estado <strong>Pendiente de Revisión</strong> (sin ser evaluada ni emitida por el profesional), podés cancelar el servicio y solicitar el reintegro del 100% de tu dinero.
                </p>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-[#1C2435] text-sm">¿Cómo solicitar tu reembolso?</h5>
                <p className="text-xs text-slate-600">
                  Envianos un correo a <strong>mireceta.online.arg@gmail.com</strong> o escribinos vía WhatsApp indicando tu número de DNI y código de solicitud.
                </p>
              </section>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-[#1C2435] hover:bg-[#295EF3] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
