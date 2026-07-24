/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useMedicalOrders } from './hooks/useMedicalOrders';
import Navbar from './components/Navbar';
import PatientForm from './components/PatientForm';
import PatientStatus from './components/PatientStatus';
import DoctorDashboard from './components/DoctorDashboard';
import UserManagement from './components/UserManagement';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import PatientDoctorChat from './components/PatientDoctorChat';
import ForcePasswordChange from './components/ForcePasswordChange';
import SuperadminDashboard from './components/SuperadminDashboard';
import AuditLogView from './components/AuditLogView';
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

export default function App() {
  const {
    currentUser,
    isLoading: authLoading,
    login,
    logout,
    register,
    forgotPassword,
    orders,
    users,
    activeRole,
    currentPatientDni,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    createUser,
    updateUser,
    deleteUser,
    resetToBaseline,
    sendChatMessage,
  } = useMedicalOrders();

  // Sidebar Layout Navigation state
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');
  const [chatSelectedOrderId, setChatSelectedOrderId] = useState<string | null>(null);

  // Sub-tabs for Patient interface (Legacy compatibility)
  const [patientTab, setPatientTab] = useState<'request' | 'status'>('request');
  const [successSubmissionId, setSuccessSubmissionId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'login'|'register'>('login');
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [resolvingTenant, setResolvingTenant] = useState(true);

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
  const pendingOrdersCount = orders.filter((o) => o.status === 'Pendiente').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'Emitida' || o.status === 'Enviada').length;

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
    return (
      <div className="min-h-screen bg-mesh flex flex-col font-sans items-center justify-center">
        <div className="relative">
          <div className="h-14 w-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <Activity className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
        </div>
        <p className="mt-4 text-xs font-bold text-slate-800">Cargando plataforma...</p>
      </div>
    );
  }

  // 1. Loading active auth status on start
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-mesh flex flex-col font-sans items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="h-14 w-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <Activity className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">Conectando con base de datos...</p>
            <p className="text-[10px] text-slate-400 mt-1">Verificando firma de credenciales electrónicas</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Logged In -> Render Login Screen
  if (!currentUser) {
    return (
      <Login
        onLogin={login}
        isLoading={authLoading}
        onRegister={(data) => register({ ...data, tenantId: currentTenant?.id })}
        onForgotPassword={forgotPassword}
      />
    );
  }

  // 3. Logged In -> Sidebar-driven layout with role-based workspace views
  return (
    <div className="h-screen w-full bg-[var(--bg)] text-[var(--ink)] font-sans overflow-hidden grid lg:grid-cols-[260px_1fr] grid-cols-1">
      {currentUser.requirePasswordChange && (
        <ForcePasswordChange 
          token={localStorage.getItem('token') || ''} 
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
        inRevisionCount={orders.filter(o => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información').length}
        completedCount={orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length}
      />

      {/* Main Workspace Frame */}
      <div className="main-content flex flex-col h-full overflow-y-auto">
        <main className="flex-1 flex flex-col bg-[var(--white)]">
          
          <div className="animate-fadeIn flex-1 flex flex-col h-full">
            {/* 1. PACIENTE SUBVIEWS */}
            {activeRole === 'paciente' && (
              <>
                {activeSubcategory === 'solicitar' && (
                  <div className="space-y-6 pt-6 sm:pt-8 pb-10">
                    {/* Quick Greeting */}
                    <div className="text-center max-w-xl mx-auto space-y-1 mb-6 px-4">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        Renovación medicación crónica
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Cargá la información de tu medicación crónica de forma segura y ágil.
                      </p>
                    </div>

                    {/* Notification alert of successful submission */}
                    {successSubmissionId && (
                      <div className="mx-4 sm:mx-auto max-w-xl bg-emerald-600/90 text-white p-5 rounded-3xl shadow-lg border border-white/30 space-y-2 animate-scaleUp">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5.5 w-5.5 text-emerald-250 shrink-0" />
                          <h4 className="font-bold text-sm">¡Pedido cargado correctamente!</h4>
                        </div>
                        <p className="text-xs text-emerald-50 leading-relaxed font-medium">
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
                    />
                  </div>
                )}

                {activeSubcategory === 'pedidos' && (
                  <div className="space-y-6 pt-6 sm:pt-8 pb-10">
                    <div className="text-center max-w-xl mx-auto space-y-1 mb-6 px-4">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        Mis Trámites de Renovación
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Seguimiento continuo del estado de tus firmas médicas en tiempo real.
                      </p>
                    </div>

                    <div className="px-0 sm:px-8">
                      <PatientStatus
                        orders={orders}
                        onCancelOrder={deleteOrder}
                        recentDni={currentPatientDni}
                        onSetDni={() => {}} // locked to authenticated patient
                      />
                    </div>
                  </div>
                )}

                {activeSubcategory === 'chat' && (
                  <div className="space-y-4 pt-6 sm:pt-8 pb-10 flex flex-col h-full">
                    <div className="max-w-xl mx-auto space-y-1 text-center mb-4 px-4 shrink-0">
                      <h2 className="text-2xl font-black text-slate-850 tracking-tight">Soporte Médico Directo</h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">Chateá con los médicos auditores sobre tus recetas o enviá documentación de soporte.</p>
                    </div>
                    
                    <div className="flex-1 px-0 sm:px-8">
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
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="text-center space-y-1 mb-6">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Preguntas Frecuentes</h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">Instrucciones y soporte para el trámite de renovación municipal.</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6 text-slate-650 text-xs sm:text-sm">
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">1. ¿Qué validez tiene la receta digital emitida?</h3>
                        <p className="text-slate-550 font-medium leading-relaxed">
                          Tiene plena validez nacional bajo la Ley de Receta Digital. Las farmacias están autorizadas a aceptar el código y firma digital presentados en el PDF descargable.
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <h3 className="font-extrabold text-slate-900 text-sm">2. ¿Cuánto demora la auditoría del trámite?</h3>
                        <p className="text-slate-550 font-medium leading-relaxed">
                          La validación de la medicación crónica dura típicamente entre 12 y 24 horas hábiles. En caso de requerirse aclaraciones, el equipo médico se comunicará directamente con vos a través del chat integrado.
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <h3 className="font-extrabold text-slate-900 text-sm">3. ¿Qué documentación debo adjuntar?</h3>
                        <p className="text-slate-550 font-medium leading-relaxed">
                          Debés cargar una foto clara de la caja del medicamento (donde se vea la dosis y nombre) y el último comprobante de pago o receta anterior. Esto agiliza la firma del profesional médico.
                        </p>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 mt-4">
                        <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-black text-slate-850">Hospital Municipal de Coronel Suárez</p>
                          <p className="text-slate-500 font-medium mt-1">Atención presencial administrativa: Av. Casey 802 | Teléfono: (02926) 43-2000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. MEDICO / ADMIN / COLABORADOR SUBVIEWS */}
            {(activeRole === 'medico' || activeRole === 'colaborador' || activeRole === 'admin') && (
              <>
                {activeSubcategory === 'chat' ? (
                  <div className="space-y-4">
                    <div className="space-y-1 mb-4">
                      <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                        <span className="h-3.5 w-1.5 rounded-full bg-blue-600 block" />
                        Centro de Mensajería Clínica
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">Canal bidireccional directo para resolver dudas de renovación de recetas en tiempo real.</p>
                    </div>

                    <PatientDoctorChat
                      orders={orders}
                      currentUser={currentUser}
                      onSendMessage={sendChatMessage}
                      initialSelectedOrderId={chatSelectedOrderId}
                      onClearInitialOrderId={() => setChatSelectedOrderId(null)}
                    />
                  </div>
                ) : activeSubcategory === 'usuarios' && (activeRole === 'medico' || activeRole === 'admin') ? (
                  <div className="space-y-6">
                    <div className="space-y-1 mb-4">
                      <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                        <span className="h-3.5 w-1.5 rounded-full bg-blue-600 block" />
                        Gestión de Personal Sanitario
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">Administrá operadores autorizados, personal médico y credenciales de acceso al sistema.</p>
                    </div>

                    <UserManagement
                      users={users}
                      onAddUser={createUser}
                      onUpdateUser={updateUser}
                      onDeleteUser={deleteUser}
                    />
                  </div>
                ) : activeSubcategory === 'auditoria' && (activeRole === 'medico' || activeRole === 'admin') ? (
                  <AuditLogView orders={orders} currentUser={currentUser} />
                ) : (
                  /* Render DoctorDashboard with the selected subcategory passed as forcedSubview */
                  <DoctorDashboard
                    orders={orders}
                    onUpdateStatus={updateOrderStatus}
                    onCreateOrder={createOrder}
                    currentUser={currentUser}
                    forcedSubview={activeSubcategory as any}
                    onNavigateToChat={(orderId) => {
                      setActiveCategory('mensajeria');
                      setActiveSubcategory('chat');
                      setChatSelectedOrderId(orderId);
                    }}
                  />
                )}
              </>
            )}

            
            {/* 3. SUPERADMIN SUBVIEWS */}
            {activeRole === 'superadmin' && (
              <SuperadminDashboard />
            )}

          </div>

        </main>

        {/* Minimalist layout footer */}
        <footer className="border-t border-slate-200/60 py-6 text-slate-400 text-center text-[11px] font-semibold shrink-0 bg-white">
          <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Renovación medicación crónica © 2026</span>
            <span className="text-[10px] text-slate-400/80">
              Sistema de Salud Protegido por Firma Digital de la Provincia de Buenos Aires
            </span>
          </div>
        </footer>
      </div>

    </div>
  );
}
