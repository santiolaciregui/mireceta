/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Stethoscope, 
  Clock, 
  ShieldCheck, 
  FileCheck2, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  Pill, 
  Scale, 
  MessageCircle, 
  User, 
  ArrowUp,
  ChevronRight,
  Facebook,
  Instagram,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import InformationalModal from './InformationalModal';
import Logo from './Logo';


interface LandingPageProps {
  onGoToLogin: (mode?: 'login' | 'register') => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'terminos' | 'privacidad' | 'arrepentimiento' | 'receta_invalida';
    title: string;
  }>({
    isOpen: false,
    type: 'terminos',
    title: ''
  });

  const openInfoModal = (type: 'terminos' | 'privacidad' | 'arrepentimiento' | 'receta_invalida', title: string) => {
    setModalState({
      isOpen: true,
      type,
      title
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavCuantoCuesta = () => {
    setOpenFaq(0);
    scrollToSection('faq');
  };

  const faqs = [
    {
      q: "¿Cuánto cuesta?",
      a: "Tiene un costo de $10.000 por cada receta, e incluye hasta dos medicamentos por receta. El costo de esta consulta digital asincrónica para renovación de receta se abonará al momento de solicitarla. Si el médico considera que tu consulta requiere atención presencial, te informaremos sin costo adicional. Si la receta no puede completarse, se te devolverá el dinero abonado."
    },
    {
      q: "¿Cuánto tarda en llegar mi receta?",
      a: "El tiempo estimado de revisión por nuestro cuerpo médico es de menos de 24 horas hábiles. En la mayoría de los casos, la recibís en cuestión de pocas horas."
    },
    {
      q: "¿Es legal?",
      a: "Sí, 100% legal. Cumplimos con la Ley de Telemedicina y Receta Electrónica. Todas las órdenes y prescripciones son emitidas y firmadas digitalmente por profesionales médicos matriculados."
    },
    {
      q: "¿Siempre me van a dar una receta?",
      a: "La emisión de la receta u orden médica queda siempre sujeta al criterio y evaluación del profesional médico actuante. Si no es posible realizar la receta, se te dará una explicación, sugerencia y se te reintegrará lo abonado. Para evitar rechazos incorporá todos los detalles del tratamiento."
    },
    {
      q: "¿Qué pasa si rechazan mi solicitud?",
      a: "En caso de que el profesional considere que no corresponde la prescripción sin una evaluación presencial previa, se te notificará la razón y no se te cobrará ningún arancel."
    },
    {
      q: "¿Qué medicamentos no se pueden solicitar?",
      a: "No se emiten recetas para medicamentos de uso restringido, controlado o que requieren seguimiento especializado, psicofármacos, opioides o trámites de excepción."
    },
    {
      q: "¿Puedo solicitar para un familiar?",
      a: "Sí, podés cargar familiares a tu cargo y realizar las solicitudes. Los menores de edad no pueden solicitar recetas, deben ser realizadas por un mayor a cargo."
    },
    {
      q: "¿Cómo recibo la receta?",
      a: "Recibirás la receta por correo electrónico, WhatsApp o en la farmacia con la plataforma de tu Obra Social. No tendrás inconvenientes con el formato para realizar la solicitud en tu farmacia."
    },
    {
      q: "¿Mis datos están protegidos?",
      a: "Totalmente. Tu información médica y personal está protegida y encriptada cumpliendo con la Ley de Protección de Datos Personales (Ley 25.326) y normas de secreto médico."
    },
    {
      q: "¿Necesito tener una App?",
      a: "No, no requerís descargar ninguna aplicación. Podés realizar todo el trámite directamente desde el navegador de tu celular o computadora."
    },
    {
      q: "¿Cómo es la modalidad?",
      a: "Mi Receta Online funciona bajo el modelo de consulta médica asincrónica, donde un médico matriculado evalúa tu caso de manera remota. Si corresponde, el profesional emitirá una receta u orden médica válida a través de plataformas habilitadas según la normativa vigente en Argentina. La emisión de una receta u orden médica depende exclusivamente del criterio del médico. Si el profesional considera que no corresponde, podrá solicitar más información, o recomendar una consulta presencial. Si es rechazada se te devolverá el total del dinero."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-[#1C2435] selection:bg-[#295EF3] selection:text-white relative">
      
      {/* Header / Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#1C2435]/10 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Brand Logo */}
            <div className="flex items-center cursor-pointer" onClick={scrollToTop}>
              <Logo variant="full" size="md" />
            </div>

            {/* Navigation links (Desktop) */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#1C2435]/80">
              <button onClick={scrollToTop} className="hover:text-[#295EF3] transition-colors border-b-2 border-[#295EF3] pb-1 text-[#295EF3] font-bold cursor-pointer">
                Inicio
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#295EF3] transition-colors cursor-pointer">
                Cómo funciona
              </button>
              <button onClick={handleNavCuantoCuesta} className="hover:text-[#295EF3] transition-colors cursor-pointer">
                Cuánto cuesta
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-[#295EF3] transition-colors cursor-pointer">
                Preguntas frecuentes
              </button>
              <button onClick={() => scrollToSection('contacto')} className="hover:text-[#295EF3] transition-colors cursor-pointer">
                Contacto
              </button>
            </nav>

            {/* User actions & Mobile menu toggle */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onGoToLogin('login')}
                className="bg-[#295EF3] hover:bg-[#1C2435] text-white text-base font-extrabold px-5 sm:px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <User className="h-4.5 w-4.5" />
                <span>Ingresar</span>
              </button>

              <button 
                onClick={() => onGoToLogin('register')}
                className="text-sm font-bold text-[#1C2435] hover:text-[#295EF3] px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#1C2435]/15 hover:border-[#295EF3] transition-all bg-slate-50 cursor-pointer hidden sm:inline-flex"
              >
                Registrarse
              </button>

              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[#1C2435] hover:bg-slate-100 transition-colors focus:outline-hidden"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#1C2435]/10 px-4 pt-2 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-2 text-base font-semibold text-[#1C2435]">
              <button 
                onClick={scrollToTop} 
                className="text-left px-3 py-2 rounded-lg text-[#295EF3] bg-[#295EF3]/10 font-bold"
              >
                Inicio
              </button>
              <button 
                onClick={() => scrollToSection('como-funciona')} 
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-[#295EF3] transition-colors"
              >
                Cómo funciona
              </button>
              <button 
                onClick={handleNavCuantoCuesta} 
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-[#295EF3] transition-colors"
              >
                Cuánto cuesta
              </button>
              <button 
                onClick={() => scrollToSection('faq')} 
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-[#295EF3] transition-colors"
              >
                Preguntas frecuentes
              </button>
              <button 
                onClick={() => scrollToSection('contacto')} 
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-[#295EF3] transition-colors"
              >
                Contacto
              </button>
            </nav>

            <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
              <button 
                onClick={() => { setMobileMenuOpen(false); onGoToLogin('login'); }}
                className="w-full bg-[#295EF3] hover:bg-[#1C2435] text-white text-base font-extrabold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="h-5 w-5" />
                <span>Ingresar</span>
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onGoToLogin('register'); }}
                className="w-full text-center text-sm font-bold text-[#1C2435] py-2.5 rounded-xl border border-[#1C2435]/15 bg-slate-50"
              >
                Registrarse
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main>
        
        {/* HERO SECTION */}
        <section className="relative bg-[#1C2435] text-white py-16 lg:py-24 overflow-hidden">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1920&auto=format&fit=crop')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1C2435] via-[#1C2435]/95 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Text & CTAs */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                
                <div className="inline-flex items-center gap-2 bg-[#316F80] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md border border-white/10">
                  <Pill className="h-4 w-4" />
                  Atención Médica Online
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white">
                    Solicitá tu medicación y realizamos la receta por tu obra social <span className="text-[#295EF3]">en 24 hs.</span>
                  </h1>
                  
                  <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    Un médico matriculado evaluará tu pedido y renovará tu receta para que la entregues en la farmacia, con un mínimo costo.
                  </p>
                </div>

                {/* Benefits List */}
                <div className="grid sm:grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-200 font-semibold bg-white/5 border border-white/10 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>Sin turnos ni esperas</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-200 font-semibold bg-white/5 border border-white/10 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>Médicos matriculados</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-200 font-semibold bg-white/5 border border-white/10 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>Entrega digital rápida</span>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => onGoToLogin('login')}
                    className="bg-[#295EF3] hover:bg-[#1C2435] text-white font-black px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-base group cursor-pointer border border-[#295EF3]"
                  >
                    <span>Solicitá tu Receta Online</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

              {/* Right Column: Hero Visual Graphic / Card with Vertical Steps */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 text-[#1C2435] shadow-2xl border border-white/20 relative">
                  
                  {/* Floating badge */}
                  <div className="absolute -top-3 -right-3 bg-[#316F80] text-white text-[11px] font-extrabold uppercase px-3.5 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Fácil y Rápido
                  </div>

                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-[#1C2435] flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#295EF3]" />
                      ¿Cómo funciona?
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Tu receta médica en 3 simples pasos
                    </p>
                  </div>

                  {/* Vertical Steps Cards */}
                  <div className="space-y-3">
                    
                    {/* Step 1 */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 hover:border-[#295EF3]/40 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-[#295EF3]/10 text-[#295EF3] flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-[#1C2435]">1. Completás el formulario</h4>
                          <span className="text-[10px] font-extrabold text-[#295EF3] bg-[#295EF3]/10 px-2 py-0.5 rounded-md shrink-0">Paso 1</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Ingresás tus datos y detallás o sacas una foto del medicamento que necesitás renovar de forma rápida y sencilla.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 hover:border-[#316F80]/40 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-[#316F80]/10 text-[#316F80] flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-[#1C2435]">2. Validación Médica</h4>
                          <span className="text-[10px] font-extrabold text-[#316F80] bg-[#316F80]/10 px-2 py-0.5 rounded-md shrink-0">Paso 2</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Un médico especialista  matriculado evalúa tu solicitud y verifica tus datos y genera la receta según tu obra social.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 hover:border-emerald-500/40 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                        <FileCheck2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-[#1C2435]">3. Recibís tu receta</h4>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">Paso 3</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Recibís por mail o whatsapp la receta médica electrónica valida y lista para presentar directamente en la farmacia.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Trust note */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#316F80]" />
                      100% Confidencial y Seguro
                    </span>
                    <span className="font-bold text-[#295EF3]">Ley 27.553</span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: Cómo Funciona */}
        <section id="como-funciona" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-[#1C2435] tracking-tight">
                ¿Cómo funciona?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg font-medium">
                <span className="font-bold text-[#1C2435]">Tres simples pasos</span> para obtener tu receta electrónica.
              </p>
            </div>

            {/* Steps Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Step Card 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-xs border border-slate-200 hover:border-[#295EF3] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-[#316F80]/10 text-[#316F80] flex items-center justify-center font-bold text-lg group-hover:bg-[#295EF3] group-hover:text-white transition-colors">
                      <Pill className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#295EF3] transition-colors">01</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C2435]">Completás el formulario</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Ingresás tus datos y detallás o sacas una foto del medicamento que necesitás renovar de forma rápida y sencilla.
                  </p>
                </div>
              </div>

              {/* Step Card 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-xs border border-slate-200 hover:border-[#295EF3] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-[#316F80]/10 text-[#316F80] flex items-center justify-center font-bold text-lg group-hover:bg-[#295EF3] group-hover:text-white transition-colors">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#295EF3] transition-colors">02</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C2435]">Validación Médica</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Un médico especialista  matriculado evalúa tu solicitud y verifica tus datos y genera la receta según tu obra social.
                  </p>
                </div>
              </div>

              {/* Step Card 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-xs border border-slate-200 hover:border-[#295EF3] transition-all relative flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-[#316F80]/10 text-[#316F80] flex items-center justify-center font-bold text-lg group-hover:bg-[#295EF3] group-hover:text-white transition-colors">
                      <FileCheck2 className="h-6 w-6" />
                    </div>
                    <span className="text-4xl font-black text-slate-300 group-hover:text-[#295EF3] transition-colors">03</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C2435]">Recibís tu receta</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Recibís por mail o whatsapp la receta médica electrónica valida y lista para presentar directamente en la farmacia.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: ¿Por qué Mi Receta Online? */}
        <section id="por-que" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-[#1C2435] tracking-tight">
                ¿Por qué Mi Receta Online?
              </h2>
            </div>

            {/* 3 Columns Benefits Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-[#316F80]/10 text-[#316F80] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C2435]">Ahorrá tiempo</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Olvidate de pedir turnos con semanas de anticipación para un simple trámite de receta.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-[#316F80]/10 text-[#316F80] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Scale className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C2435]">100% Legal</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Recetas firmadas digitalmente por profesionales con matrícula vigente, aptas para farmacias y obras sociales.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-[#316F80]/10 text-[#316F80] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C2435]">Privacidad Garantizada</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Tus datos de salud están encriptados y protegidos bajo normas de secreto médico.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* BANNER: Supervisión médica rigurosa */}
        <section className="bg-[#316F80] text-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Supervisión médica rigurosa
            </h2>
            <p className="text-slate-100 text-sm sm:text-base font-medium leading-relaxed">
              Nuestros médicos revisan cada solicitud individualmente. Si el profesional considera que necesitás una consulta presencial, te lo informaremos sin costo adicional.
            </p>
          </div>
        </section>

        {/* SECTION: Preguntas Frecuentes */}
        <section id="faq" className="bg-[#1C2435] text-white py-20 px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            
            <h2 className="text-3xl sm:text-4xl font-black text-center tracking-tight">
              Preguntas Frecuentes
            </h2>

            {/* Accordion 2 Columns Grid */}
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {/* Column 1 */}
              <div className="flex flex-col gap-4">
                {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div 
                      key={idx} 
                      className="bg-white/10 text-white rounded-xl overflow-hidden transition-all border border-white/10"
                    >
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full p-4 flex items-center justify-between font-bold text-sm text-left hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg font-black text-[#295EF3]">
                            {isOpen ? '−' : '+'}
                          </span>
                          {faq.q}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="p-4 pt-2 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed border-t border-white/10 bg-[#1C2435]">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Column 2 */}
              <div className="flex flex-col gap-4">
                {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, sliceIdx) => {
                  const idx = sliceIdx + Math.ceil(faqs.length / 2);
                  const isOpen = openFaq === idx;
                  return (
                    <div 
                      key={idx} 
                      className="bg-white/10 text-white rounded-xl overflow-hidden transition-all border border-white/10"
                    >
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full p-4 flex items-center justify-between font-bold text-sm text-left hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg font-black text-[#295EF3]">
                            {isOpen ? '−' : '+'}
                          </span>
                          {faq.q}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="p-4 pt-2 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed border-t border-white/10 bg-[#1C2435]">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer id="contacto" className="bg-[#1C2435] border-t border-white/10 text-white pt-16 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-10 text-sm">
            
            {/* Col 1: Logo */}
            <div className="space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2">
                <Logo variant="full" size="md" theme="dark" />
              </div>
            </div>

            {/* Col 2: Solicitud Online */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">Solicitud Online</h4>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li>
                  <button onClick={() => onGoToLogin('login')} className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors cursor-pointer">
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Renovar Medicación Crónica
                  </button>
                </li>

                <li>
                  <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors cursor-pointer">
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Cómo Funciona
                  </button>
                </li>
                <li>
                  <button onClick={handleNavCuantoCuesta} className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors cursor-pointer">
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Cuánto Cuesta
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Enlaces de Interés */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">Información</h4>
              <ul className="space-y-2 text-xs text-slate-300 font-medium">
                <li>
                  <button onClick={() => scrollToSection('faq')} className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors cursor-pointer">
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Preguntas Frecuentes
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('privacidad', 'Política de Privacidad')} 
                    className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                  >
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Política de Privacidad
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('terminos', 'Términos y Condiciones')} 
                    className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                  >
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => openInfoModal('arrepentimiento', 'Arrepentimiento de compra')} 
                    className="hover:text-[#295EF3] flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                  >
                    <ChevronRight className="h-3 w-3 text-[#295EF3]" /> Arrepentimiento de compra
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
                <p>
                  <a href="mailto:mireceta.online.arg@gmail.com" className="hover:text-[#295EF3] transition-colors">
                    mireceta.online.arg@gmail.com
                  </a>
                </p>
                <p>Tel.: +54 9 2926 111111</p>
              </div>
            </div>

            {/* Col 5: Seguinos */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">SEGUINOS</h4>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-[#295EF3] hover:text-white transition-colors" title="Facebook">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href="https://instagram.com/mireceta_online" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-[#295EF3] hover:text-white transition-colors" title="@mireceta_online">
                    <Instagram className="h-4 w-4" />
                  </a>
                </div>
                <a href="https://instagram.com/mireceta_online" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-[#295EF3] transition-colors font-medium">
                  <Instagram className="h-3.5 w-3.5 text-pink-400" />
                  <span>@mireceta_online</span>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Legal disclaimer bottom bar */}
        <div className="bg-slate-950 text-white text-[11px] py-4 px-4 text-center leading-relaxed font-medium border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="max-w-5xl text-left text-slate-400">
              Mi Receta Online es una plataforma tecnológica que facilita el contacto entre pacientes y médicos matriculados. No ejercemos la medicina ni emitimos recetas directamente; la prescripción es un acto médico exclusivo del profesional interviniente, sujeto a su evaluación y criterio. Servicio de telemedicina asincrónica: no reemplaza la consulta médica presencial ni es un servicio de emergencias. Ante una urgencia, llamá al 107 (SAME).
            </p>
            <span className="whitespace-nowrap text-slate-400">
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
          className="w-10 h-10 bg-[#1C2435] hover:bg-[#295EF3] text-white rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all cursor-pointer"
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
