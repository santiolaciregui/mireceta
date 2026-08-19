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
    <div className="fixed inset-0 z-50 bg-[#0141BC]/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[calc(100dvh-2rem)]">
        
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
        <div className="p-4 sm:p-8 flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 text-xs sm:text-sm text-[#0F172A] leading-relaxed font-medium">
          
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
                  Al utilizar <strong>Mireceta.online</strong>, aceptás los presentes Términos y Condiciones oficiales del Servicio de Telemedicina Asincrónica.
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
                <p>Mireceta.online opera en cumplimiento de la normativa vigente en la República Argentina, incluyendo pero no limitándose a:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs">
                  <li>Ley 27.553 y su Decreto Reglamentario 98/2023 (modificado por Decreto 345/2024): Recetas Electrónicas o Digitales y Plataformas de Teleasistencia en Salud.</li>
                  <li>Ley 26.529 (modificada por Ley 26.742) y su Decreto Reglamentario 1089/2012: Derechos del Paciente, Historia Clínica y Consentimiento Informado.</li>
                  <li>Ley 25.326 y su Decreto Reglamentario 1558/2001: Protección de Datos Personales.</li>
                  <li>Ley 24.240 (modificada por Ley 26.361): Defensa del Consumidor.</li>
                  <li>Ley 25.506: Firma Digital.</li>
                  <li>Resolución 581/2022 del Ministerio de Salud: Buenas Prácticas para la Teleconsulta.</li>
                  <li>Resolución 3316/2023 del Ministerio de Salud: Directrices de Organización y Funcionamiento para la Teleconsulta (incorporada al Programa Nacional de Garantía de Calidad de la Atención Médica).</li>
                  <li>Resolución 2214/2025 del Ministerio de Salud: Requisitos de la receta electrónica o digital.</li>
                  <li>Resolución 305/2023 del Ministerio de Salud: Inscripción de plataformas de receta electrónica/digital y teleasistencia (ReNaPDiS).</li>
                  <li>Artículos 58, 59 y concordantes del Código Civil y Comercial de la Nación.</li>
                  <li>Normativa complementaria provincial que resulte aplicable según la jurisdicción del profesional actuante.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">3. Alcance del Servicio y Limitaciones</h4>
                <p>
                  Mireceta.online facilita el acceso del Usuario a consultas médicas remotas de baja complejidad, en la modalidad de teleconsulta asincrónica (tiempo diferido, sin videollamada en tiempo real), conforme las definiciones de la Resolución 3316/2023 del Ministerio de Salud. El Usuario reconoce y acepta expresamente que:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs">
                  <li><strong>No es un servicio de emergencias:</strong> Ante riesgo de vida, emergencia o urgencia médica, el Usuario debe contactar inmediatamente al 107 (SAME), al 911, o concurrir al centro asistencial más cercano. Mireceta.online no atiende, gestiona ni intermedia en situaciones de urgencia ni emergencia médica bajo ninguna circunstancia.</li>
                  <li><strong>Criterio médico exclusivo:</strong> El profesional interviniente tiene plena autonomía clínica para evaluar cada caso. Si considera que el cuadro clínico no permite una atención remota segura o que requiere examen físico, podrá derivar al paciente a consulta presencial. En tal supuesto se realizará la devolución total del importe abonado.</li>
                  <li><strong>Limitaciones inherentes de la teleconsulta asincrónica:</strong> La modalidad asincrónica presenta limitaciones diagnósticas propias derivadas de la imposibilidad de realizar examen físico, auscultar al paciente o evaluar signos vitales en tiempo real. El Usuario comprende que esta modalidad no sustituye la consulta médica presencial y que la precisión del diagnóstico depende, entre otros factores, de la calidad y veracidad de la información proporcionada.</li>
                  <li><strong>Casos no atendidos:</strong> Mireceta.online no gestiona consultas que requieran examen físico, que presenten síntomas graves, de aparición reciente o súbita, o que impliquen situaciones de alta complejidad clínica, enfermedades de notificación obligatoria, o riesgo inminente para la salud del paciente o de terceros.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">4. Emisión de Recetas y Órdenes Médicas</h4>
                <p>
                  Mireceta.online no emite recetas médicas, certificados ni órdenes de estudio. La prescripción electrónica o digital es realizada de forma independiente y exclusiva por el profesional de la salud interviniente, utilizando plataformas de terceros debidamente inscriptas en el Registro Nacional de Plataformas Digitales Sanitarias (ReNaPDiS) del Ministerio de Salud de la Nación, conforme a la Ley 27.553, su Decreto Reglamentario 98/2023, la Resolución 305/2023 y la Resolución 2214/2025.
                </p>
                <p>
                  La prescripción deberá cumplir con los requisitos de contenido, identificación del profesional y del paciente, firma digital o electrónica, y trazabilidad establecidos por la normativa vigente. Mireceta.online no tiene control, injerencia ni responsabilidad sobre la disponibilidad, seguridad, funcionamiento o legalidad de los sistemas de prescripción de terceros que el profesional elija utilizar. La responsabilidad sobre la prescripción es exclusiva del profesional matriculado que la emite.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">5. Verificación de Profesionales</h4>
                <p>
                  Mireceta.online verifica la vigencia de la matrícula profesional de los médicos registrados en la Plataforma ante las autoridades sanitarias correspondientes (SISA/REFEPS), en concordancia con la Licencia Sanitaria Federal creada por el Decreto 98/2023. No obstante, la información volcada por los profesionales al registrarse tiene carácter de Declaración Jurada, siendo el profesional el único responsable de su veracidad y actualización.
                </p>
                <p>
                  Mireceta.online no es responsable por las decisiones clínicas, diagnósticos, omisiones, prescripciones o actos de mala praxis del profesional contactado a través de la Plataforma. El vínculo médico-paciente se establece directa y exclusivamente entre el Usuario y el profesional de la salud.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">6. Consentimiento Informado para Teleconsulta Asincrónica</h4>
                <p className="text-xs text-slate-500 italic">
                  (Ley 26.529, art. 5°, 6° y 7°; Ley 26.742; arts. 58 y 59 del Código Civil y Comercial de la Nación; Ley 27.553; Decreto 98/2023; Resolución 581/2022; Resolución 3316/2023)
                </p>
                <div className="space-y-2 text-xs">
                  <p><strong>6.1. Alcance y objeto del consentimiento:</strong> Al aceptar estos Términos, el Usuario otorga su Consentimiento Informado libre, voluntario y expreso para ser atendido mediante herramientas de TIC, en la modalidad de teleconsulta asincrónica. El consentimiento se extiende a la recopilación y transmisión de los datos personales y de salud estrictamente necesarios.</p>
                  <p><strong>6.2. Características de la modalidad asincrónica:</strong> El Usuario declara comprender y aceptar que la consulta se realiza en modalidad asincrónica sin videollamada en tiempo real; esta modalidad no permite examen físico; la precisión depende de la veracidad de los datos; y el profesional podrá solicitar más información o derivar a presencial.</p>
                  <p><strong>6.3. Riesgos informados:</strong> Fallas técnicas ajenas a Mireceta.online, limitaciones diagnósticas por ausencia de examen físico, posibles demoras por causas de fuerza mayor o alta demanda, y riesgo residual de transmisión electrónica.</p>
                  <p><strong>6.4. Alternativa presencial:</strong> El Usuario tiene siempre la posibilidad de optar por una consulta médica presencial. La teleconsulta complementa consultas de baja complejidad.</p>
                  <p><strong>6.5. Confidencialidad y tratamiento de datos:</strong> Tratamiento confidencial bajo Ley 25.326, Ley 26.529 y secreto profesional.</p>
                  <p><strong>6.6. Historia Clínica:</strong> Confeccionada y resguardada exclusivamente por el profesional en sus sistemas. Mireceta.online resguarda solo datos de intermediación.</p>
                  <p><strong>6.7. Menores de edad y capacidad restringida:</strong> Consentimiento otorgado por representantes legales o apoyos designados conforme arts. 26 y 639 del Código Civil y Comercial.</p>
                  <p><strong>6.8. Revocabilidad del consentimiento:</strong> El consentimiento es esencialmente revocable en cualquier momento sin penalidad alguna.</p>
                  <p><strong>6.9. Derecho a la información:</strong> Derecho a recibir información clara, precisa y adecuada sobre la atención.</p>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">7. Política de Pagos y Devoluciones</h4>
                <p>El costo del servicio es de $10.000 (pesos argentinos) por consulta, abonado al momento de la solicitud a través de los medios de pago habilitados.</p>
                <p><strong>Devolución por rechazo médico:</strong> Si el profesional determina que no corresponde emitir la receta, orden o documento solicitado, o que el caso requiere atención presencial, se realizará la devolución total del importe abonado.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">8. Prohibiciones y Uso Indebido</h4>
                <p>Queda estrictamente prohibido solicitar recetas para terceros sin representación legal acreditada, brindar datos falsos, intentar obtener medicamentos de uso restringido mediante fraude, suplantar identidad o autoprescribirse siendo profesional en contravención deontológica. El uso indebido será denunciado ante las autoridades competentes.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">9. Responsabilidad y Exención</h4>
                <p>Mireceta.online actúa exclusivamente como intermediario tecnológico (art. 40 Ley 24.240) y no responderá por decisiones clínicas del profesional, fallas en sistemas de terceros ReNaPDiS, ni consecuencias por datos falsos provistos por el usuario.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">10. Protección de Datos Personales</h4>
                <p className="text-xs text-slate-500 italic">(Ley 25.326; Decreto 1558/2001; Disposiciones AAIP)</p>
                <p>Los datos son utilizados exclusivamente para la intermediación, gestión de pagos y cumplimiento legal. El usuario puede ejercer sus derechos ARCO contactando a <strong>mirecata.online.arg@gmail.com</strong>.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">11. Propiedad Intelectual</h4>
                <p>Todo el contenido de la Plataforma es propiedad exclusiva de Mireceta.online bajo la Ley 11.723.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">12. Modificaciones de los Términos</h4>
                <p>Las modificaciones se notificarán con 15 días de antelación. El uso continuado implica su aceptación.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">13. Ley Aplicable y Jurisdicción</h4>
                <p>Leyes de la República Argentina y Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, sin perjuicio del fuero del consumidor.</p>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-base text-[#0141BC]">14. Datos de Contacto</h4>
                <p className="text-xs text-slate-700"><strong>Razón social:</strong> sein mariano daniel</p>
                <p className="text-xs text-slate-700"><strong>CUIT:</strong> 2024383726</p>
                <p className="text-xs text-slate-700"><strong>Domicilio legal:</strong> Brandsen 631 coronel Suarez, CP 7540</p>
                <p className="text-xs text-slate-700"><strong>Correo electrónico:</strong> mirecata.online.arg@gmail.com</p>
                <p className="text-[11px] text-slate-500 italic mt-2">
                  Mireceta.online es una plataforma tecnológica de intermediación. No ejercemos la medicina, no emitimos recetas ni somos responsables por las decisiones clínicas de los profesionales de la salud. La prescripción es un acto médico exclusivo del profesional interviniente, sujeto a su evaluación y criterio.
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
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-6 flex justify-end gap-3 shrink-0">
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
