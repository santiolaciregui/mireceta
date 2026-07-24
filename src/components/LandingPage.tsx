import React from 'react';
import { 
  HeartPulse, 
  FileText, 
  MessageSquare, 
  ShieldCheck, 
  Stethoscope, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (mode: 'login' | 'register') => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans selection:bg-[var(--accent)] selection:text-white">
      
      {/* Navigation */}
      <nav className="border-b border-[var(--ink-faint)] bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--ink)] text-white p-2 flex items-center justify-center">
                <HeartPulse className="h-6 w-6" />
              </div>
              <span className="font-sans font-bold text-2xl tracking-tight text-[var(--ink)]">
                Recetas.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onGoToLogin('login')}
                className="hidden sm:inline-flex bg-transparent text-[var(--ink)] p-3 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-50 transition-colors"
              >
                Iniciar Sesión
              </button>
              <button 
                onClick={() => onGoToLogin('register')}
                className="bg-[var(--ink)] text-white px-5 py-3 border-none cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-800 transition-colors"
              >
                Portal Pacientes
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40 px-4">
          <div className="absolute inset-0 bg-mesh opacity-40 mix-blend-multiply pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-mono text-[0.65rem] uppercase tracking-wider font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Plataforma de Salud Activa
              </div>
              
              <h1 className="text-[3rem] lg:text-[4.5rem] tracking-[-0.04em] leading-[0.95] font-sans font-semibold text-[var(--ink)]">
                Consulta médica online,<br /> en minutos.
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Renová tu medicación crónica o gestioná tus estudios sin esperas ni traslados. Conectamos pacientes con profesionales de la salud de forma rápida y segura.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <button 
                  onClick={() => onGoToLogin('register')}
                  className="w-full sm:w-auto bg-[var(--ink)] text-white px-8 py-4 cursor-pointer font-mono uppercase text-[0.85rem] tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
                >
                  Solicitar Receta 
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => onGoToLogin('login')}
                  className="w-full sm:w-auto bg-white text-[var(--ink)] border border-[var(--ink-faint)] px-8 py-4 cursor-pointer font-mono uppercase text-[0.85rem] tracking-[0.1em] hover:bg-slate-50 transition-colors"
                >
                  Ingresar a mi cuenta
                </button>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <div className="relative aspect-square sm:aspect-video lg:aspect-square">
                {/* Abstract UI representation */}
                <div className="absolute inset-4 bg-white shadow-2xl rounded-3xl border border-slate-100 overflow-hidden flex flex-col">
                  <div className="h-12 border-b border-slate-100 flex items-center px-6 gap-3 bg-slate-50/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-200" />
                      <div className="w-3 h-3 rounded-full bg-slate-200" />
                      <div className="w-3 h-3 rounded-full bg-slate-200" />
                    </div>
                  </div>
                  <div className="flex-1 p-8 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-1/4 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-1/4 bg-slate-200 rounded" />
                        <div className="h-5 w-16 bg-emerald-100 rounded-full" />
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-5/6 bg-slate-100 rounded" />
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-1/4 bg-slate-200 rounded" />
                        <div className="h-5 w-16 bg-emerald-100 rounded-full" />
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-4/6 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
                
                {/* Decorative floating elements */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 shadow-xl border border-slate-100 rounded-2xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider font-bold text-slate-500">Estado</p>
                    <p className="font-sans font-bold text-slate-800 text-sm">Receta Firmada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white border-y border-[var(--ink-faint)] px-4">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.2em] font-bold text-blue-600">
                Eficiencia Médica
              </h2>
              <h3 className="text-3xl md:text-4xl font-sans font-bold text-[var(--ink)] tracking-tight">
                Lo que nos hace diferentes
              </h3>
              <p className="text-lg text-slate-600 font-medium">
                Simplificamos la gestión de recetas digitales y órdenes de estudio. Con perfiles dedicados, optimizamos la atención médica.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 border border-[var(--ink-faint)] bg-slate-50 hover:bg-blue-50/50 transition-colors group">
                <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center text-[var(--ink)] mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-bold font-sans text-slate-800 mb-3">Recetas Digitales</h4>
                <p className="text-slate-600 font-medium leading-relaxed">
                  Facilita la creación, firma criptográfica y seguimiento de recetas con validez en todas las farmacias.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 border border-[var(--ink-faint)] bg-slate-50 hover:bg-blue-50/50 transition-colors group">
                <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center text-[var(--ink)] mb-6 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-bold font-sans text-slate-800 mb-3">Órdenes de Estudio</h4>
                <p className="text-slate-600 font-medium leading-relaxed">
                  Solicita y gestiona órdenes de laboratorio y estudios por imágenes con total facilidad y rapidez.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 border border-[var(--ink-faint)] bg-slate-50 hover:bg-blue-50/50 transition-colors group">
                <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center text-[var(--ink)] mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-bold font-sans text-slate-800 mb-3">Comunicación Directa</h4>
                <p className="text-slate-600 font-medium leading-relaxed">
                  Canal de chat bidireccional entre el paciente y el personal auditor para resolver cualquier duda al instante.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits for Roles Section */}
        <section className="py-24 bg-[var(--bg)] px-4">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="max-w-3xl space-y-4">
              <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.2em] font-bold text-blue-600">
                Beneficios
              </h2>
              <h3 className="text-3xl md:text-4xl font-sans font-bold text-[var(--ink)] tracking-tight">
                Menos carga administrativa,<br/> más tiempo para los pacientes.
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-[var(--ink-faint)] p-10 flex flex-col">
                <div className="flex-1 space-y-6">
                  <div className="font-mono text-[0.65rem] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 w-fit px-2 py-1">
                    Para Clínicas y Consultorios
                  </div>
                  <h4 className="text-2xl font-bold font-sans text-slate-800">
                    Salas de espera menos congestionadas
                  </h4>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Nuestra plataforma te permite agilizar la emisión de recetas de manera digital, reduciendo tiempos administrativos y optimizando los flujos de trabajo en tu institución.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--ink)] text-white p-10 flex flex-col">
                <div className="flex-1 space-y-6">
                  <div className="font-mono text-[0.65rem] uppercase tracking-wider font-bold bg-white/10 text-white w-fit px-2 py-1">
                    Para Pacientes
                  </div>
                  <h4 className="text-2xl font-bold font-sans">
                    Tu Salud en tu bolsillo
                  </h4>
                  <p className="text-slate-300 text-lg leading-relaxed">
                    Evitá viajes innecesarios y largas esperas. Solicitá tu medicación crónica desde tu celular, recibí el PDF firmado y acercate directo a tu farmacia de confianza.
                  </p>
                </div>
                <div className="pt-8">
                  <button 
                    onClick={() => onGoToLogin('register')}
                    className="w-full sm:w-auto bg-white text-[var(--ink)] px-6 py-3 cursor-pointer font-mono uppercase text-[0.75rem] tracking-[0.1em] hover:bg-slate-100 transition-colors"
                  >
                    Crear mi cuenta gratis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--ink-faint)] py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--ink)] text-white p-1.5 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-[var(--ink)]">
              Recetas.
            </span>
          </div>
          
          <div className="text-sm font-medium text-slate-500 text-center md:text-right">
            <p>© 2026 Portal de Renovación de Medicación Crónica.</p>
            <p className="text-xs mt-1">Tecnología diseñada para acercar la salud a las personas.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
