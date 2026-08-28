/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useMedicalOrders } from './hooks/useMedicalOrders';
import Navbar from './components/Navbar';
import PatientForm from './components/pages/PatientForm';
import PatientStatus from './components/pages/PatientStatus';
import DoctorDashboard from './components/pages/DoctorDashboard';
import UserManagement from './components/pages/UserManagement';
import LandingPage from './components/pages/LandingPage';
import Login from './components/pages/Login';
import Sidebar from './components/Sidebar';
import Logo from './components/Logo';
import PatientDoctorChat from './components/pages/PatientDoctorChat';
import ForcePasswordChange from './components/pages/ForcePasswordChange';
import SuperadminDashboard from './components/pages/SuperadminDashboard';
import AuditLogView from './components/pages/AuditLogView';
import PaymentConfigPanel from './components/pages/PaymentConfigPanel';
import NotificationConfigPanel from './components/pages/NotificationConfigPanel';
import SettlementMetricsView from './components/pages/SettlementMetricsView';
import LoadingSpinner from './components/common/LoadingSpinner';
import ResetPassword from './components/pages/ResetPassword';

import { 
  PlusCircle, 
  Search, 
  Activity, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Heart,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

const patientFaqs = [
  {
    q: "¿Cómo es la modalidad?",
    a: "Mi Receta Online funciona bajo el modelo de consulta médica asincrónica, donde un médico matriculado evalúa tu caso de manera remota. Si corresponde, el profesional emitirá una receta u orden médica válida a través de plataformas habilitadas según la normativa vigente en Argentina. La emisión de una receta u orden médica depende exclusivamente del criterio del médico. Si el profesional considera que no corresponde, podrá solicitar más información o recomendar una consulta presencial. Si es rechazada se te devolverá el total del dinero."
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Tiene un costo administrativo de $10.000 por cada receta, e incluye hasta dos medicamentos por receta. El costo de esta consulta digital asincrónica para renovación de receta se abonará al momento de solicitarla. Si el médico considera que tu consulta requiere atención presencial, te informaremos sin costo adicional. Si la receta no puede completarse, se te devolverá el dinero abonado."
  },
  {
    q: "¿Cuánto tarda en llegar mi receta?",
    a: "El tiempo estimado de revisión por nuestro cuerpo médico es de menos de 24 horas hábiles. En la mayoría de los casos, la recibís en cuestión de pocas horas. Podrás ver su estado y descargarla directamente desde la sección 'Mis Trámites de Renovación'."
  },
  {
    q: "¿Es legal y qué validez tiene?",
    a: "Sí, es 100% legal. Cumplimos con la Ley de Telemedicina y la Ley de Receta Digital (Ley 27.553). Todas las órdenes y prescripciones son emitidas y firmadas digitalmente por profesionales médicos matriculados. Las farmacias están autorizadas a aceptar el código y firma digital presentados en el PDF descargable."
  },
  {
    q: "¿Qué documentación debo adjuntar?",
    a: "Debés cargar una foto clara de la caja del medicamento (donde se vea la dosis y nombre) y/o el último comprobante de pago o receta anterior. Esto agiliza la firma del profesional médico."
  },
  {
    q: "¿Siempre me van a dar una receta?",
    a: "La emisión de la receta u orden médica queda siempre sujeta al criterio y evaluación del profesional médico actuante. Si no es posible realizar la receta, se te dará una explicación, sugerencia y se te reintegrará lo abonado. Para evitar rechazos, incorporá todos los detalles del tratamiento."
  },
  {
    q: "¿Qué pasa si rechazan mi solicitud?",
    a: "En caso de que el profesional considere que no corresponde la prescripción sin una evaluación presencial previa, se te notificará la razón a través del chat de la solicitud y no se te cobrará ningún arancel (se te devolverá el dinero)."
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
    a: "Una vez emitida, podrás descargar el PDF firmado digitalmente desde tu sección 'Mis Trámites de Renovación'. También la recibirás por correo electrónico o WhatsApp, lista para presentar en tu farmacia habitual."
  },
  {
    q: "¿Mis datos están protegidos?",
    a: "Totalmente. Tu información médica y personal está protegida y encriptada cumpliendo con la Ley de Protección de Datos Personales (Ley 25.326) y normas de secreto médico."
  },
  {
    q: "¿Necesito tener una App?",
    a: "No, no requerís descargar ninguna aplicación. Podés realizar todo el trámite directamente desde el navegador de tu celular o computadora ingresando a tu panel de usuario."
  }
];

export default function App() {
  const {
    currentUser,
    isLoading: authLoading,
    isSessionChecking,
    login,
    logout,
    register,
    forgotPassword,
    sendForgotPasswordLink,
    resetPassword,
    orders,
    users,
    activeRole,
    currentPatientDni,
    createOrder,
    updateOrderStatus,
    sendRecipeLink,
    deleteOrder,
    createUser,
    updateUser,
    deleteUser,
    resetToBaseline,
    sendChatMessage,
    addDependent,
    updateDependent,
    removeDependent,
  } = useMedicalOrders();

  // Sidebar Layout Navigation state
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');

  // Footer scroll-reveal: show footer only after user has scrolled down in any scrollable container
  const [hasScrolled, setHasScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as Element;
      if (target && target.scrollTop > 40) {
        setHasScrolled(true);
      } else if (target && target.scrollTop === 0) {
        setHasScrolled(false);
      }
    };
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);
  const [chatSelectedOrderId, setChatSelectedOrderId] = useState<string | null>(null);

  // Sub-tabs for Patient interface (Legacy compatibility)
  const [patientTab, setPatientTab] = useState<'request' | 'status'>('request');
  const [successSubmissionId, setSuccessSubmissionId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'login'|'register'>('login');
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [resolvingTenant, setResolvingTenant] = useState(true);
  const [openPatientFaq, setOpenPatientFaq] = useState<number | null>(null);

  // Detect password reset token in URL (?token=...)
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || null;
  });

  const handleResetPasswordSuccess = () => {
    // Clear token from URL and redirect to login
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(null);
    setShowLogin(true);
  };

  const handleResetPasswordBack = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(null);
  };

  React.useEffect(() => {
    const subdomain = window.location.hostname.split('.')[0] || 'localhost';
    
    // Check if it's superadmin login route
    if (window.location.search.includes('admin=true')) {
      // Superadmin doesn't need a tenant to login
      setResolvingTenant(false);
      return;
    }

    fetch(`/api/tenant/resolve?subdomain=${subdomain}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setCurrentTenant(data);
        } else {
          // Fallback to default for development if not found
          setCurrentTenant({ id: 'TEN-0001', name: 'Tenant por defecto', subdomain: 'localhost' });
        }
      })
      .catch(() => {
        setCurrentTenant({ id: 'TEN-0001', name: 'Tenant por defecto', subdomain: 'localhost' });
      })
      .finally(() => setResolvingTenant(false));
  }, []);

  // Sync default category and subcategory on role switch
  React.useEffect(() => {
    if (activeRole === 'paciente') {
      setActiveCategory('tramites');
      setActiveSubcategory('solicitar');
    } else if (activeRole === 'medico' || activeRole === 'colaborador') {
      setActiveCategory('solicitudes');
      setActiveSubcategory('pendientes');
    } else if (activeRole === 'admin') {
      setActiveCategory('admin_panel');
      setActiveSubcategory('usuarios');
    }
  }, [activeRole]);

  // Quick stats for the navbar
  const pendingOrdersCount = orders.filter((o) => o.status === 'Pendiente' && o.paymentStatus !== 'pending').length;
  const pendingPaymentOrdersCount = orders.filter((o) => o.paymentStatus === 'pending').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'Emitida' || o.status === 'Enviada').length;
  const chatCount = React.useMemo(() => {
    const patientLastMessages = new Map<string, { sender: string; timestamp: number }>();
    
    orders.forEach((o) => {
      if (!o.messages || o.messages.length === 0) return;
      
      const cleanDni = (o.requestedByTitularDni || o.patientDni || '').replace(/\D/g, '');
      if (!cleanDni) return;
      
      o.messages.forEach(m => {
        if (!m) return;
        const ts = new Date(m.timestamp).getTime();
        const current = patientLastMessages.get(cleanDni);
        if (!current || ts > current.timestamp) {
          patientLastMessages.set(cleanDni, { sender: m.sender, timestamp: ts });
        }
      });
    });

    let count = 0;
    patientLastMessages.forEach((lastMsg) => {
      if (activeRole === 'paciente') {
        if (lastMsg.sender !== 'paciente') count++;
      } else {
        if (lastMsg.sender === 'paciente') count++;
      }
    });
    
    return count;
  }, [orders, activeRole]);

  const handleOrderSubmitted = (orderId: string) => {
    setSuccessSubmissionId(orderId);
    // Automatically transition to status lookup tab
    setActiveCategory('tramites');
    setActiveSubcategory('pedidos');
    // Scroll to top of window to let them see the status checklist
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Clear notification after 15 seconds
    setTimeout(() => {
      setSuccessSubmissionId(null);
    }, 15000);
  };

  // --- RENDERING ROUTER ---

  // 0. Resolving tenant
  if (resolvingTenant) {
    return <LoadingSpinner message="Cargando..." />;
  }

  // 0.5 Password reset token in URL — show reset page regardless of auth state
  if (resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onSuccess={handleResetPasswordSuccess}
        onBack={handleResetPasswordBack}
      />
    );
  }

  // 1. Loading active auth status on start
  if (isSessionChecking && !currentUser) {
    return (
      <LoadingSpinner
        message="Conectando con base de datos..."
        subMessage="Verificando firma de credenciales electrónicas"
      />
    );
  }

  // 2. Not Logged In -> Render Landing Page or Login Screen
  if (!currentUser) {
    if (!showLogin && !window.location.search.includes('login=true') && !window.location.search.includes('admin=true')) {
      return (
        <LandingPage
          onGoToLogin={(mode) => {
            setLoginMode(mode);
            setShowLogin(true);
          }}
        />
      );
    }
    return (
      <Login
        onLogin={login}
        isLoading={authLoading}
        onRegister={(data) => register({ ...data, tenantId: currentTenant?.id })}
        onForgotPassword={forgotPassword}
        onSendForgotPasswordLink={sendForgotPasswordLink}
        onResetPassword={resetPassword}
        onBack={() => setShowLogin(false)}
        initialMode={loginMode}
      />
    );
  }

  // 3. Logged In -> Sidebar-driven layout with role-based workspace views
  return (
    <div className="h-screen h-[100dvh] w-full bg-[var(--bg)] text-[var(--ink)] font-sans overflow-hidden flex flex-col lg:grid lg:grid-cols-[260px_1fr]">
      {currentUser.requirePasswordChange && (currentUser.role === 'medico' || currentUser.role === 'colaborador') && (
        <ForcePasswordChange 
          token={localStorage.getItem('mi-receta-jwt') || localStorage.getItem('token') || ''} 
          onSuccess={() => {
            // Force a reload or update the current user state to remove the flag
            window.location.reload();
          }} 
        />
      )}
      
      {/* Sidebar Navigation */}
      <Sidebar
        role={activeRole}
        userName={currentUser.name}
        userLastName={currentUser.lastName}
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        onSelect={(cat, sub) => {
          setActiveCategory(cat);
          setActiveSubcategory(sub);
        }}
        onLogout={logout}
        pendingCount={pendingOrdersCount}
        pendingPaymentCount={pendingPaymentOrdersCount}
        inRevisionCount={orders.filter(o => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length}
        completedCount={orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length}
        rejectedCount={orders.filter(o => o.status === 'Rechazada').length}
        chatCount={chatCount}
      />

      {/* Main Workspace Frame */}
      <div className="main-content flex flex-col flex-1 h-full min-h-0 overflow-hidden">
        <main className="flex-1 flex flex-col bg-[var(--white)] min-h-0 overflow-hidden">
          
          <div className="animate-fadeIn flex-1 flex flex-col h-full min-h-0 overflow-hidden">
            {/* 1. PACIENTE SUBVIEWS */}
            {activeRole === 'paciente' && (
              <>
                {activeSubcategory === 'solicitar' && (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Logo className="h-8 sm:h-9" />
                        </div>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Solicita tu medicación de forma ágil y segura.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                      {/* Notification alert of successful submission */}
                      {successSubmissionId && (
                        <div className="max-w-6xl mx-auto bg-[#14BE99] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg border border-white/30 space-y-2 animate-scaleUp">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white shrink-0" />
                            <h4 className="font-bold text-xs sm:text-sm">¡Pedido cargado correctamente!</h4>
                          </div>
                          <p className="text-xs text-white/90 leading-relaxed font-medium">
                            Tu solicitud ha sido guardada. Podés verificar el estado en tiempo real en la categoría <strong>"Mis Solicitudes"</strong>. El personal de salud lo auditará a la brevedad.
                          </p>
                        </div>
                      )}

                      <PatientForm
                        onSubmitOrder={createOrder}
                        onSuccess={handleOrderSubmitted}
                        recentDni={currentPatientDni}
                        onSetDni={() => {}} // readonly for authenticated session
                        initialName={currentUser.name}
                        initialLastName={currentUser.lastName}
                        orders={orders}
                        currentUser={currentUser}
                        currentTenant={currentTenant}
                        onUpdateTitular={(updates) => updateUser(currentUser.id, updates)}
                        onAddDependent={addDependent}
                        onUpdateDependent={updateDependent}
                        onRemoveDependent={removeDependent}
                      />
                    </div>
                  </div>
                )}

                {activeSubcategory === 'pedidos' && (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Mis Trámites de Renovación</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Seguimiento continuo del estado de tus firmas médicas en tiempo real.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
                      <PatientStatus
                        orders={orders}
                        onCancelOrder={deleteOrder}
                        currentUser={currentUser}
                        onNavigateToChat={(orderId) => {
                          setActiveCategory('mensajeria');
                          setActiveSubcategory('chat');
                          setChatSelectedOrderId(orderId);
                        }}
                        onNavigateToNew={() => {
                          setActiveCategory('tramites');
                          setActiveSubcategory('solicitar');
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeSubcategory === 'chat' && (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-3 sm:px-8 sm:py-4 bg-white border-b border-[var(--ink-faint)] flex justify-between items-center shrink-0">
                      <div className="space-y-0.5">
                        <h1 className="text-lg sm:text-[1.35rem] font-[700] tracking-[-0.03em]">Soporte Médico Directo</h1>
                        <p className="text-[11px] sm:text-[0.8rem] text-[var(--ink-muted)]">Chateá con los médicos auditores sobre tus recetas o enviá documentación de soporte.</p>
                      </div>
                    </header>

                    <div className="flex-1 flex overflow-hidden">
                      <PatientDoctorChat
                        orders={orders}
                        currentUser={currentUser}
                        onSendMessage={sendChatMessage}
                        initialSelectedOrderId={chatSelectedOrderId}
                        onClearInitialOrderId={() => setChatSelectedOrderId(null)}
                      />
                    </div>
                  </div>
                )}

                {activeSubcategory === 'ayuda' && (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Preguntas Frecuentes</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Respuestas a tus dudas sobre el servicio de recetas digitales y renovación de medicación.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="max-w-2xl mx-auto space-y-3">
                        {patientFaqs.map((faq, idx) => {
                          const isOpen = openPatientFaq === idx;
                          return (
                            <div 
                              key={idx} 
                              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
                            >
                              <button
                                onClick={() => setOpenPatientFaq(isOpen ? null : idx)}
                                className="w-full p-4 sm:p-5 flex items-center justify-between font-bold text-slate-800 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <span className="flex items-center gap-2.5">
                                  <HelpCircle className="h-4.5 w-4.5 text-[#1661E1] shrink-0" />
                                  <span className="font-extrabold text-slate-900">{faq.q}</span>
                                </span>
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                              </button>

                              {isOpen && (
                                <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-650 font-medium leading-relaxed border-t border-slate-150/60 bg-slate-50/50">
                                  <p className="mt-3 text-slate-600 leading-relaxed font-medium">
                                    {faq.a}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. MEDICO / ADMIN / COLABORADOR / SUPERADMIN SUBVIEWS */}
            {(activeRole === 'medico' || activeRole === 'colaborador' || activeRole === 'admin' || activeRole === 'superadmin') && (
              <>
                {activeSubcategory === 'chat' ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <div className="flex-1 flex overflow-hidden">
                      <PatientDoctorChat
                        orders={orders}
                        currentUser={currentUser}
                        onSendMessage={sendChatMessage}
                        initialSelectedOrderId={chatSelectedOrderId}
                        onClearInitialOrderId={() => setChatSelectedOrderId(null)}
                      />
                    </div>
                  </div>
                ) : activeSubcategory === 'reportes' && activeRole !== 'colaborador' ? (
                  <SettlementMetricsView
                    orders={orders}
                    users={users}
                    currentUser={currentUser}
                  />
                ) : activeSubcategory === 'usuarios' && (activeRole === 'admin' || activeRole === 'superadmin') ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Gestión de Personal Sanitario</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Administrá operadores autorizados, personal médico y credenciales de acceso al sistema.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <UserManagement
                        users={users}
                        onAddUser={createUser}
                        onUpdateUser={updateUser}
                        onDeleteUser={deleteUser}
                      />
                    </div>
                  </div>
                ) : activeSubcategory === 'auditoria' && (activeRole === 'admin' || activeRole === 'superadmin') ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Historial de Cambios y Auditoría</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Registro cronológico completo de las acciones ejecutadas por administradores, médicos y colaboradores sobre las solicitudes.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <AuditLogView orders={orders} currentUser={currentUser} />
                    </div>
                  </div>
                ) : activeSubcategory === 'pagos' && (activeRole === 'admin' || activeRole === 'superadmin') ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Configuración de Pasarela de Pagos</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Administración de credenciales de Mercado Pago y recaudación de tasas.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="max-w-4xl mx-auto w-full">
                        <PaymentConfigPanel />
                      </div>
                    </div>
                  </div>
                ) : activeSubcategory === 'notificaciones' && (activeRole === 'admin' || activeRole === 'superadmin') ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Canales y Plantillas de Notificación</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Gestión modular de Email (SMTP), WhatsApp (Meta Business API), variables dinámicas e historial.</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="max-w-5xl mx-auto w-full">
                        <NotificationConfigPanel />
                      </div>
                    </div>
                  </div>
                ) : activeRole === 'superadmin' && activeCategory === 'superadmin_panel' ? (
                  <div className="flex flex-col flex-1 h-full overflow-hidden bg-white">
                    <header className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-[var(--ink-faint)] flex justify-between items-end shrink-0">
                      <div className="space-y-1">
                        <h1 className="text-xl sm:text-[1.5rem] font-[700] tracking-[-0.03em]">Panel de Superadmin</h1>
                        <p className="text-xs sm:text-[0.85rem] text-[var(--ink-muted)] mt-0.5 sm:mt-1">Gestión global de Tenants (Instituciones / Clínicas).</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <SuperadminDashboard />
                    </div>
                  </div>
                ) : (
                  /* Render DoctorDashboard with the selected subcategory passed as forcedSubview */
                  <DoctorDashboard
                    orders={orders}
                    users={users}
                    onUpdateStatus={updateOrderStatus}
                    onSendRecipeLink={sendRecipeLink}
                    onCreateOrder={createOrder}
                    currentUser={currentUser}
                    forcedSubview={activeSubcategory as any}
                    onNavigateToChat={(orderId) => {
                      setActiveCategory('mensajeria');
                      setActiveSubcategory('chat');
                      setChatSelectedOrderId(orderId);
                    }}
                    onNavigateToSubview={(subview) => {
                      setActiveCategory('solicitudes');
                      setActiveSubcategory(subview);
                    }}
                  />
                )}
              </>
            )}

          </div>

        </main>

        {/* Minimalist layout footer - only shown when not in full-screen chat view, and only after user scrolls */}
        {activeSubcategory !== 'chat' && (
          <footer
            className="border-t border-slate-200/60 py-3 sm:py-6 text-slate-400 text-center text-[10px] sm:text-[11px] font-semibold shrink-0 bg-white transition-all duration-300"
            style={{
              opacity: hasScrolled ? 1 : 0,
              transform: hasScrolled ? 'translateY(0)' : 'translateY(100%)',
              pointerEvents: hasScrolled ? 'auto' : 'none',
            }}
          >
            <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
              <span>Mi Receta Online © 2026</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400/80">
                Sistema de Salud Protegido por Firma Digital de la Provincia de Buenos Aires
              </span>
            </div>
          </footer>
        )}
      </div>

    </div>
  );
}
