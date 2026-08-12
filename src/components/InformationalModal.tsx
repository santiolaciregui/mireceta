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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0141BC]/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0141BC] text-white p-4 sm:p-6 flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 text-white p-2 sm:p-2.5 rounded-xl shadow-sm border border-white/20">
              {type === 'privacidad' && <Lock className="h-4 w-4 sm:h-5 sm:w-5" />}
              {type === 'terminos' && <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
              {type === 'arrepentimiento' && <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold tracking-tight">{title}</h3>
              <p className="text-[11px] sm:text-xs text-blue-100 font-medium">Mi Receta Online — Documento Oficial</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors font-bold text-lg cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-4 sm:space-y-6 text-xs sm:text-sm text-[#0F172A] leading-relaxed font-medium">
          
          {type === 'privacidad' && (
            <>
              <div className="bg-[#1661E1]/5 border border-[#1661E1]/20 rounded-xl p-4 text-[#0141BC] flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#1661E1] shrink-0 mt-0.5" />
                <p className="text-xs">
                  Tus datos personales y de salud están strictly encriptados y protegidos bajo la <strong>Ley N° 25.326 de Protección de Datos Personales</strong> de la República Argentina y secreto médico profesional.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">1. Recolección de Datos Clínicos</h4>
                <p>
                  Recopilamos únicamente la información médica y personal indispensable para que nuestros profesionales de la salud evalúen tus solicitudes de renovación de medicamentos o pedidos de estudios médicos.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">2. Secreto Médico y Confidencialidad</h4>
                <p>
                  Toda la información médica suministrada es tratada bajo el deber de confidencialidad y secreto profesional legal estipulado en las normativas del ejercicio de la medicina.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">3. Seguridad Técnica</h4>
                <p>
                  Utilizamos protocolos de encriptación de grado bancario (SSL/TLS) para la transmisión de datos. No almacenamos datos sensibles de tarjetas ni medios de pago en nuestros servidores.
                </p>
              </section>
            </>
          )}

          {type === 'terminos' && (
            <>
              <div className="bg-[#0F6C7D]/5 border border-[#0F6C7D]/20 rounded-xl p-4 text-[#0141BC] flex items-start gap-3">
                <FileText className="h-5 w-5 text-[#0F6C7D] shrink-0 mt-0.5" />
                <p className="text-xs">
                  Al solicitar un servicio en nuestra plataforma, aceptás los presentes Términos y Condiciones oficiales de Mireceta.online.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">1. Naturaleza de la Plataforma y Aceptación</h4>
                <p>
                  Mireceta.online (en adelante, la «Plataforma») es una plataforma tecnológica de intermediación cuyo objeto exclusivo es facilitar el contacto entre pacientes (en adelante, el «Usuario») y profesionales de la salud independientes debidamente matriculados. Mireceta.online no es un prestador de servicios de salud: no ejerce la medicina, no emite recetas, no realiza diagnósticos ni brinda tratamientos de ninguna índole.
                </p>
                <p>
                  El servicio de Mireceta.online se limita exclusivamente a conectar al Usuario con profesionales de la salud matriculados, quienes actúan de forma autónoma e independiente en el marco de la relación médico-paciente.
                </p>
                <p>
                  El acceso y uso de la Plataforma implican la aceptación plena e incondicional de estos Términos y Condiciones, incluyendo el Consentimiento Informado contenido en la Sección 6. El Usuario declara ser mayor de 18 años o, en caso de ser menor, que accede a la Plataforma a través de su representante legal. Toda la información brindada por el Usuario posee carácter de Declaración Jurada.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">2. Marco Normativo</h4>
                <p>
                  El servicio opera conforme a las normativas de Telemedicina, Firma Digital (Ley 25.506) y Protección de Datos Personales (Ley 25.326) aplicables en la República Argentina.
                </p>
              </section>
            </>
          )}

          {type === 'arrepentimiento' && (
            <>
              <div className="bg-[#14BE99]/10 border border-[#14BE99]/30 rounded-xl p-4 text-[#0141BC] flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-[#14BE99] shrink-0 mt-0.5" />
                <p className="text-xs">
                  Conforme a las normativas vigentes de Defensa del Consumidor, podés solicitar el reembolso de tu consulta antes de que sea procesada por el profesional médico.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">Botón de Arrepentimiento</h4>
                <p>
                  Si realizaste el pago de una solicitud y la misma aún se encuentra en estado <strong>Pendiente de Revisión</strong> (sin ser evaluada ni emitida por el profesional), podés cancelar el servicio y solicitar el reintegro del 100% de tu dinero.
                </p>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-[#0141BC] text-sm">¿Cómo solicitar tu reembolso?</h5>
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
            className="bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
