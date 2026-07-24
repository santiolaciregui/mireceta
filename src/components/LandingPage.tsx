import React, { useState } from 'react';
import { 
  Pill, 
  UserCheck, 
  Clock, 
  Scale, 
  ShieldCheck, 
  CreditCard, 
  FileCheck2, 
  Plus, 
  Minus, 
  ChevronRight, 
  MessageCircle, 
  ArrowUp,
  User,
  Facebook,
  Instagram,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  HeartPulse
} from 'lucide-react';

import InformationalModal from './InformationalModal';

interface LandingPageProps {
  onGoToLogin: (mode: 'login' | 'register') => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'privacidad' | 'terminos' | 'arrepentimiento';
  }>({
    isOpen: false,
    title: '',
    type: 'privacidad'
  });

  const openInfoModal = (type: 'privacidad' | 'terminos' | 'arrepentimiento', title: string) => {
    setModalState({
      isOpen: true,
      title,
      type
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: "¿Cuánto cuesta?",
      a: "El costo de la consulta digital para renovación de receta u orden de estudio se abonará una vez enviada la solicitud y confirmada por el sistema. Si el médico considera que tu consulta requiere atención presencial, te informaremos sin costo adicional."
    },
    {
      q: "¿Cómo recibo la receta u orden?",
      a: "Recibirás la receta u orden en formato PDF con firma digital válida y código QR directamente en tu WhatsApp o casilla de correo electrónico registrado."
    },
    {
      q: "¿Cuánto tarda en llegar mi receta u orden?",
      a: "El tiempo estimado de revisión por nuestro cuerpo médico es de menos de 24 horas hábiles. En la mayoría de los casos, la recibís en cuestión de pocas horas."
    },
    {
      q: "¿Qué tipo de consultas se pueden resolver con Mi Receta Online?",
      a: "Podés resolver la renovación de recetas de medicamentos crónicos de uso habitual y la emisión de órdenes de estudio de rutina o control (laboratorios, ecografías, radiografías, etc.)."
    },
    {
      q: "¿Es legal?",
      a: "Sí, 100% legal. Cumplimos con la Ley de Telemedicina y Receta Electrónica. Todas las órdenes y prescripciones son emitidas y firmadas digitalmente por profesionales médicos matriculados."
    },
    {
      q: "¿Qué casos no atendemos?",
      a: "No atendemos urgencias ni emergencias médicas. Ante un caso grave o síntoma agudo, por favor llamá al 107 (SAME) o concurrí a la guardia médica más cercana."
    },
    {
      q: "¿Siempre me van a dar una receta?",
      a: "La emisión de la receta u orden médica queda siempre sujeta al criterio y evaluación del profesional médico actuante."
    },
    {
      q: "¿Mis datos están protegidos?",
      a: "Totalmente. Tu información médica y personal está protegida y encriptada cumpliendo con la Ley de Protección de Datos Personales (Ley 25.326) y normas de secreto médico."
    },
    {
      q: "¿Qué pasa si rechazan mi solicitud?",
      a: "En caso de que el profesional considere que no corresponde la prescripción sin una evaluación presencial previa, se te notificará la razón y no se te cobrará ningún arancel."
    },
    {
      q: "¿Necesito tener una App?",
      a: "No, no requerís descargar ninguna aplicación. Podés realizar todo el trámite directamente desde el navegador de tu celular o computadora."
    },
    {
      q: "¿Qué medicamentos no se pueden solicitar?",
      a: "No se prescriben psicofármacos de alto control restrictivo, estupefacientes, antibióticos sin diagnóstico comprobado ni medicamentos sujetos a venta bajo receta archivada de lista especial."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#2997C6] selection:text-white relative">
      
      {/* Header / Navbar estilo MedFlow */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={scrollToTop}>
              <div className="bg-[#2997C6] text-white p-2 rounded-lg flex items-center justify-center shadow-md">
                <Pill className="h-6 w-6" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 uppercase">
                Mi Receta<span className="text-[#2997C6]">Online</span>
              </span>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-700">
              <button onClick={scrollToTop} className="hover:text-[#2997C6] transition-colors border-b-2 border-[#2997C6] pb-1 text-[#2997C6] font-bold">
                Inicio
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#2997C6] transition-colors">
                Cómo Funciona
              </button>
              <button onClick={() => scrollToSection('por-que')} className="hover:text-[#2997C6] transition-colors">
                Quiénes Somos
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-[#2997C6] transition-colors">
                Preguntas Frecuentes
              </button>
              <button onClick={() => scrollToSection('contacto')} className="hover:text-[#2997C6] transition-colors">
                Contacto
              </button>
            </nav>

            {/* User action */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onGoToLogin('login')}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#2997C6] px-4 py-2.5 rounded-lg border border-slate-200 hover:border-[#2997C6] transition-all bg-slate-50"
              >
                <User className="h-4 w-4" />
                Ingresar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>

        {/* HERO SECTION (Formato en 2 columnas con la paleta de colores MedFlow) */}
        <section className="relative bg-slate-900 text-white py-16 lg:py-24 overflow-hidden">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1920&auto=format&fit=crop')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Text & CTAs */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                
                <div className="inline-flex items-center gap-2 bg-[#2997C6] text-white px-3.5 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wider shadow-md">
                  <Pill className="h-4 w-4" />
                  Atención por profesionales matriculados
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                  Renová tu medicación <br />
                  o gestioná tus estudios <br />
                  <span className="text-[#2997C6]">sin esperas.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Consultas médicas digitales, seguras y rápidas. Atención por profesionales matriculados.
                </p>

                {/* Action Buttons (Azul MedFlow y Negro) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 pt-2">
                  <button 
                    onClick={() => onGoToLogin('login')}
                    className="bg-[#2997C6] hover:bg-[#1F85B3] text-white font-bold text-base px-7 py-4 rounded-md transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Renovar Medicación Crónica
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => onGoToLogin('login')}
                    className="bg-black hover:bg-slate-900 text-white font-bold text-base px-7 py-4 rounded-md transition-all border border-slate-700 text-center cursor-pointer"
                  >
                    Solicitar orden de estudio
                  </button>
                </div>

                {/* Fast Trust Indicators */}
                <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-300 max-w-lg mx-auto lg:mx-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2997C6] shrink-0" />
                    <span>Sin traslados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2997C6] shrink-0" />
                    <span>100% Digital</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2997C6] shrink-0" />
                    <span>Firma oficial</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Floating Interactive Mockup UI */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                  
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2997C6]/20 text-[#2997C6] flex items-center justify-center font-bold">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Dra. María González</h4>
                        <p className="text-xs text-[#2997C6] font-medium">Médica Auditora M.N. 142.890</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                      En línea
                    </span>
                  </div>

                  {/* Mockup Content Card */}
                  <div className="mt-5 space-y-3">
                    <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700/70 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Solicitud #REC-2026-89</span>
                        <span className="text-[#2997C6] font-bold">Validada</span>
                      </div>
                      <p className="text-sm font-bold text-white">Losartán 50mg — 30 comprimidos</p>
                      <p className="text-xs text-slate-400">Tratamiento crónico renovado por 3 meses</p>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700/70 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Orden de Estudio</span>
                        <span className="text-emerald-400 font-bold">PDF Generado</span>
                      </div>
                      <p className="text-sm font-bold text-white">Amoxicilina 500mg — 10 cápsulas</p>
                      <p className="text-xs text-slate-400">Incluye Hemograma, Perfil Lipídico y Glucemia</p>
                    </div>
                  </div>

                  {/* Floating Badge overlay */}
                  <div className="absolute -bottom-5 -left-5 bg-white text-slate-900 p-4 rounded-xl shadow-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2997C6] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validez Nacional</p>
                      <p className="text-xs font-extrabold text-slate-900">Apto Farmacias y Obras Sociales</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: ¿Cómo funciona? (Fondo claro #EBF1F5 con badges estilizados) */}
        <section id="como-funciona" className="py-20 bg-[#EBF1F5] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                ¿Cómo funciona?
              </h2>
              <p className="text-slate-700 text-base sm:text-lg font-semibold">
                <strong className="text-slate-900">Tres simples pasos</strong> para obtener tu receta u orden médica
              </p>
            </div>

            {/* 3 Step Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Step Card 1 */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200/80 hover:border-[#2997C6] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#2997C6] flex items-center justify-center font-bold text-lg group-hover:bg-[#2997C6] group-hover:text-white transition-colors">
                      <Pill className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#2997C6] transition-colors">01</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Completás el formulario</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Ingresás tus datos y detallás el medicamento o estudio de rutina que necesitás renovar de forma rápida y sencilla.
                  </p>
                </div>
              </div>

              {/* Step Card 2 */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200/80 hover:border-[#2997C6] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#2997C6] flex items-center justify-center font-bold text-lg group-hover:bg-[#2997C6] group-hover:text-white transition-colors">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#2997C6] transition-colors">02</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Validación Médica</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Un profesional de la salud matriculado evalúa tu solicitud y verifica tus antecedentes clínicos de manera individual.
                  </p>
                </div>
              </div>

              {/* Step Card 3 */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200/80 hover:border-[#2997C6] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#2997C6] flex items-center justify-center font-bold text-lg group-hover:bg-[#2997C6] group-hover:text-white transition-colors">
                      <FileCheck2 className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#2997C6] transition-colors">03</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Recibís tu receta</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Obtenés la receta u orden médica digital firmada en formato PDF lista para presentar directamente en la farmacia.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: ¿Por qué Mi Receta Online? */}
        <section id="por-que" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                ¿Por qué Mi Receta Online?
              </h2>
            </div>

            {/* 3 Columns Benefits Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              
              <div className="bg-slate-50 rounded-xl p-8 border border-slate-200/70 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-blue-50 text-[#2997C6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ahorrá tiempo</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Olvidate de pedir turnos con semanas de anticipación para un simple trámite.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-8 border border-slate-200/70 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-blue-50 text-[#2997C6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Scale className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">100% Legal</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Recetas firmadas digitalmente por profesionales con matrícula vigente, aptas para farmacias y obras sociales.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-8 border border-slate-200/70 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-blue-50 text-[#2997C6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Privacidad Garantizada</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Tus datos de salud están encriptados y protegidos bajo normas de secreto médico.
                </p>
              </div>

            </div>

            {/* Three light bar highlights estilo MedFlow */}
            <div className="bg-[#EBF1F5] rounded-xl p-6 sm:p-8 grid md:grid-cols-3 gap-6 text-slate-700 font-semibold text-sm">
              
              <div className="flex items-center justify-center gap-3">
                <UserCheck className="h-5 w-5 text-[#2997C6] shrink-0" />
                <span>Médicos con Matrícula Nacional vigente</span>
              </div>

              <div className="flex items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0">
                <CreditCard className="h-5 w-5 text-[#2997C6] shrink-0" />
                <span>Pago seguro a través de Mercado Pago</span>
              </div>

              <div className="flex items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0">
                <FileCheck2 className="h-5 w-5 text-[#2997C6] shrink-0" />
                <span>Firma digital válida por el médico emisor</span>
              </div>

            </div>

          </div>
        </section>

        {/* BANNER: Supervisión médica rigurosa (Azul MedFlow) */}
        <section className="bg-[#2997C6] text-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Supervisión médica rigurosa
            </h2>
            <p className="text-blue-50 text-sm sm:text-base font-medium leading-relaxed">
              Nuestros médicos revisan cada solicitud individualmente. Si el profesional considera que necesitás una consulta presencial, te lo informaremos sin costo adicional.
            </p>
          </div>
        </section>

        {/* SECTION: Preguntas Frecuentes (Fondo Oscuro #374652 MedFlow) */}
        <section id="faq" className="bg-[#374652] text-white py-20 px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            
            <h2 className="text-3xl sm:text-4xl font-black text-center tracking-tight">
              Preguntas Frecuentes
            </h2>

            {/* Accordion 2 Columns Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className="bg-[#EBF1F5] text-slate-900 rounded-md overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 flex items-center justify-between font-bold text-sm text-left hover:bg-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[#2997C6]">
                          {isOpen ? '−' : '+'}
                        </span>
                        {faq.q}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-0 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed border-t border-slate-200/60 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER estilo MedFlow */}
      <footer id="contacto" className="bg-black text-white pt-16 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-10 text-sm">
            
            {/* Col 1: Logo */}
            <div className="space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="bg-[#2997C6] text-white p-1.5 rounded flex items-center justify-center">
                  <Pill className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white uppercase">
                  Mi Receta<span className="text-[#2997C6]">Online</span>
                </span>
              </div>
            </div>

            {/* Col 2: Solicitud Online */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">Solicitud Online</h4>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li>
                  <button onClick={() => onGoToLogin('login')} className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors">
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Renovar Medicación Crónica
                  </button>
                </li>
                <li>
                  <button onClick={() => onGoToLogin('login')} className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors">
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Solicitar Orden de Estudio
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors">
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Cómo Funciona
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Enlaces de Interés */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">Información</h4>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li>
                  <button onClick={() => scrollToSection('faq')} className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors">
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Preguntas Frecuentes
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('privacidad', 'Política de Privacidad')} 
                    className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors text-left"
                  >
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Política de Privacidad
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('terminos', 'Términos y Condiciones')} 
                    className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors text-left"
                  >
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('arrepentimiento', 'Arrepentimiento de compra')} 
                    className="hover:text-[#2997C6] flex items-center gap-1.5 transition-colors text-left"
                  >
                    <ChevronRight className="h-3 w-3 text-[#2997C6]" /> Arrepentimiento de compra
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Contacto */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">Contacto</h4>
              <p className="text-xs text-slate-300 font-medium">
                Por cualquier duda podés comunicarte con nosotros
              </p>
              <div className="text-xs text-slate-300 space-y-1 font-medium">
                <p>misrecetaonline@gmail.com</p>
                <p>Tel.: +54 9 2926 111111</p>
              </div>
            </div>

            {/* Col 5: Seguinos */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">SEGUINOS</h4>
              <div className="flex gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-[#2997C6] hover:text-white transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-[#2997C6] hover:text-white transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Legal disclaimer bottom bar (Azul MedFlow) */}
        <div className="bg-[#2997C6] text-white text-[11px] py-4 px-4 text-center leading-relaxed font-medium">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="max-w-5xl text-left">
              Mi Receta Online es una plataforma tecnológica que facilita el contacto entre pacientes y médicos matriculados. No ejercemos la medicina ni emitimos recetas directamente; la prescripción es un acto médico exclusivo del profesional interviniente, sujeto a su evaluación y criterio. Servicio de telemedicina asincrónica: no reemplaza la consulta médica presencial ni es un servicio de emergencias. Ante una urgencia, llamá al 107 (SAME).
            </p>
            <span className="whitespace-nowrap opacity-90">
              MiReceta© 2026 — Datos personales protegidos por Ley 25.326.
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons: WhatsApp & Scroll to top */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={scrollToTop}
          title="Volver arriba"
          className="w-10 h-10 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all"
        >
          <ArrowUp className="h-5 w-5" />
        </button>

        <a
          href="https://wa.me/5491161341741"
          target="_blank"
          rel="noopener noreferrer"
          title="Contacto vía WhatsApp"
          className="w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105"
        >
          <MessageCircle className="h-8 w-8 fill-current" />
        </a>
      </div>

      {/* Informational Modal */}
      <InformationalModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        type={modalState.type}
        onGoToRegister={() => {
          closeModal();
          onGoToLogin('register');
        }}
      />

    </div>
  );
}
