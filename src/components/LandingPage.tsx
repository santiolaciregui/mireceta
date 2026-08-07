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
  CreditCard, 
  Pill, 
  Scale, 
  MessageCircle, 
  User, 
  ArrowUp,
  ChevronRight,
  Facebook,
  Instagram,
  Sparkles
} from 'lucide-react';
import InformationalModal from './InformationalModal';
import Logo from './Logo';

interface LandingPageProps {
  onGoToLogin: (mode?: 'login' | 'register') => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
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
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqs = [
    {
      q: "¿Cómo abono la consulta digital?",
      a: "El costo de la consulta digital para renovación de receta u orden de estudio se abonará una vez enviada la solicitud y confirmada por el sistema. Si el médico considera que tu consulta requiere atención presencial, te informaremos sin costo adicional."
    },
    {
      q: "¿Cómo recibo la receta u orden?",
      a: "Recibirás la receta u orden en formato PDF con firma digital válida y código QR directamente en tu WhatsApp o casilla de correo electrónico registrado."
    },
    {
      q: "¿Cuánto tarda en llegar mi receta u orden?",
      a: "El plazo promedio de procesamiento y firma médica es de 2 a 24 horas hábiles."
    },
    {
      q: "¿Qué tipo de consultas se pueden resolver con Mi Receta Online?",
      a: "Podés resolver la renovación de recetas de medicamentos crónicos de uso habitual y la emisión de órdenes de estudio de rutina o control (laboratorios, ecografías, radiografías, etc.)."
    },
    {
      q: "¿La receta o orden emitida es legal y válida en farmacias?",
      a: "Sí, 100% legal. Cumplimos con la Ley de Telemedicina y Receta Electrónica. Todas las órdenes y prescripciones son emitidas y firmadas digitalmente por profesionales médicos matriculados."
    },
    {
      q: "¿Puedo solicitar una orden de estudios médicos de rutina?",
      a: "Sí, podés solicitar la emisión de órdenes para estudios preventivos y de rutina habitual."
    },
    {
      q: "¿Siempre me van a dar una receta?",
      a: "La emisión de la receta u orden médica queda siempre sujeta al criterio y evaluación del profesional médico actuante."
    },
    {
      q: "¿Qué pasa si el médico considera que no corresponde la emisión?",
      a: "Si el médico determina que tu cuadro requiere evaluación presencial, la solicitud será cancelada y no se generará el cobro."
    },
    {
      q: "¿Qué medicamentos NO se prescriben a través de esta plataforma?",
      a: "No se prescriben psicofármacos de alto control restrictivo, estupefacientes, antibióticos sin diagnóstico comprobado ni medicamentos sujetos a venta bajo receta archivada de lista especial."
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

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#1C2435]/80">
              <button onClick={scrollToTop} className="hover:text-[#295EF3] transition-colors border-b-2 border-[#295EF3] pb-1 text-[#295EF3] font-bold">
                Inicio
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-[#295EF3] transition-colors">
                Cómo Funciona
              </button>
              <button onClick={() => scrollToSection('por-que')} className="hover:text-[#295EF3] transition-colors">
                Quiénes Somos
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-[#295EF3] transition-colors">
                Preguntas Frecuentes
              </button>
              <button onClick={() => scrollToSection('contacto')} className="hover:text-[#295EF3] transition-colors">
                Contacto
              </button>
            </nav>

            {/* User action */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onGoToLogin('login')}
                className="flex items-center gap-2 text-sm font-bold text-[#1C2435] hover:text-[#295EF3] px-4 py-2.5 rounded-xl border border-[#1C2435]/15 hover:border-[#295EF3] transition-all bg-slate-50"
              >
                <User className="h-4 w-4" />
                Ingresar
              </button>

              <button 
                onClick={() => onGoToLogin('register')}
                className="bg-[#295EF3] hover:bg-[#1C2435] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                Registrarse
              </button>
            </div>

          </div>
        </div>
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
                  Atención por profesionales matriculados
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                  Renová tu medicación <br />
                  o gestioná tus estudios <br />
                  <span className="text-[#295EF3]">sin esperas.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Consultas médicas digitales, seguras y rápidas. Atención por profesionales matriculados de la República Argentina.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 pt-2">
                  <button 
                    onClick={() => onGoToLogin('login')}
                    className="bg-[#295EF3] hover:bg-[#316F80] text-white font-bold text-base px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Renovar Medicación Crónica
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Fast Trust Indicators */}
                <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-300 max-w-lg mx-auto lg:mx-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>Sin traslados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>100% Digital</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#316F80] shrink-0" />
                    <span>Firma oficial</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Floating Interactive Mockup UI with Steps */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md bg-[#1C2435]/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                  
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#295EF3]/20 text-[#38bdf8] flex items-center justify-center font-bold border border-[#295EF3]/30">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white">¿Cómo funciona?</h4>
                        <p className="text-xs text-[#38bdf8] font-semibold">Tu receta en 3 simples pasos</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      100% Digital
                    </span>
                  </div>

                  {/* Steps Content Cards */}
                  <div className="mt-5 space-y-3">
                    
                    {/* Step 1 */}
                    <div className="bg-[#151C2C]/90 rounded-2xl p-3.5 border border-slate-700/70 hover:border-[#295EF3]/50 transition-all flex items-start gap-3 group">
                      <div className="w-9 h-9 rounded-xl bg-[#295EF3]/20 text-[#60a5fa] flex items-center justify-center shrink-0 border border-[#295EF3]/30 group-hover:scale-105 transition-transform mt-0.5">
                        <Pill className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h5 className="text-sm font-bold text-white group-hover:text-[#60a5fa] transition-colors">1. Completás el formulario</h5>
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md shrink-0">Paso 1</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Ingresás tus datos y detallás el medicamento o estudio de rutina que necesitás.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-[#151C2C]/90 rounded-2xl p-3.5 border border-slate-700/70 hover:border-[#38bdf8]/50 transition-all flex items-start gap-3 group">
                      <div className="w-9 h-9 rounded-xl bg-[#316F80]/20 text-[#38bdf8] flex items-center justify-center shrink-0 border border-[#316F80]/40 group-hover:scale-105 transition-transform mt-0.5">
                        <UserCheck className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h5 className="text-sm font-bold text-white group-hover:text-[#38bdf8] transition-colors">2. Validación Médica</h5>
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md shrink-0">Paso 2</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Un profesional de la salud matriculado evalúa tu solicitud y verifica tus antecedentes.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-[#151C2C]/90 rounded-2xl p-3.5 border border-slate-700/70 hover:border-emerald-500/50 transition-all flex items-start gap-3 group">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform mt-0.5">
                        <FileCheck2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h5 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">3. Recibís tu receta PDF</h5>
                          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md shrink-0">Paso 3</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Obtenés tu receta u orden digital en PDF firmada, lista para la farmacia.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Floating Badge overlay */}
                  <div className="absolute -bottom-5 -left-5 bg-white text-[#1C2435] p-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#316F80]/10 text-[#316F80] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#316F80]">Validez Nacional</p>
                      <p className="text-xs font-extrabold text-[#1C2435]">Apto Farmacias y Obras Sociales</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION: ¿Cómo funciona? */}
        <section id="como-funciona" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-[#1C2435] tracking-tight">
                ¿Cómo funciona?
              </h2>
              <p className="text-slate-600 text-base sm:text-lg font-semibold">
                <strong className="text-[#1C2435]">Tres simples pasos</strong> para obtener tu receta u orden médica
              </p>
            </div>

            {/* 3 Step Cards */}
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
                    Ingresás tus datos y detallás el medicamento o estudio de rutina que necesitás renovar de forma rápida y sencilla.
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
                    Un profesional de la salud matriculado evalúa tu solicitud y verifica tus antecedentes clínicos de manera individual.
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

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-[#316F80]/10 text-[#316F80] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Scale className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C2435]">100% Legal</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Recetas firmadas digitalmente por profesionales con matrícula vigente, aptas para farmacias y obras sociales.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:shadow-md transition-all space-y-4 text-center">
                <div className="w-16 h-16 bg-[#316F80]/10 text-[#316F80] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C2435]">Privacidad Garantizada</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Tus datos de salud están encriptados y protegidos bajo normas de secreto médico.
                </p>
              </div>

            </div>

            {/* Three light bar highlights */}
            <div className="bg-slate-100/70 rounded-2xl p-6 sm:p-8 grid md:grid-cols-3 gap-6 text-[#1C2435] font-semibold text-sm border border-slate-200">
              
              <div className="flex items-center justify-center gap-3">
                <UserCheck className="h-5 w-5 text-[#295EF3] shrink-0" />
                <span>Médicos con Matrícula Nacional vigente</span>
              </div>

              <div className="flex items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0">
                <CreditCard className="h-5 w-5 text-[#295EF3] shrink-0" />
                <span>Pago seguro a través de Mercado Pago</span>
              </div>

              <div className="flex items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0">
                <FileCheck2 className="h-5 w-5 text-[#295EF3] shrink-0" />
                <span>Firma digital válida por el médico emisor</span>
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
            <div className="grid md:grid-cols-2 gap-4">
              {faqs.map((faq, idx) => {
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
                <p>misrecetaonline@gmail.com</p>
                <p>Tel.: +54 9 2926 111111</p>
              </div>
            </div>

            {/* Col 5: Seguinos */}
            <div className="space-y-3">
              <h4 className="font-bold text-base text-white">SEGUINOS</h4>
              <div className="flex gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-[#295EF3] hover:text-white transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-[#295EF3] hover:text-white transition-colors">
                  <Instagram className="h-4 w-4" />
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
