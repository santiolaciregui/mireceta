/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  FileText, 
  MessageSquare, 
  HelpCircle, 
  TrendingUp, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  Clock,
  Layers,
  Settings,
  XCircle,
  Bell,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Check
} from 'lucide-react';
import { UserRole } from '../types';
import Logo from './Logo';

interface SidebarProps {
  role: UserRole;
  userName: string;
  userLastName: string;
  activeCategory: string;
  activeSubcategory: string;
  onSelect: (category: string, subcategory: string) => void;
  onLogout: () => void;
  pendingCount: number;
  inRevisionCount: number;
  completedCount: number;
  rejectedCount?: number;
  chatCount?: number;
}

export default function Sidebar({
  role,
  userName,
  userLastName,
  activeCategory,
  activeSubcategory,
  onSelect,
  onLogout,
  pendingCount,
  inRevisionCount,
  completedCount,
  rejectedCount = 0,
  chatCount = 0,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Configuration subitems configuration definition
  const configMenuItems = [
    {
      id: 'reportes',
      label: 'Liquidaciones y Métricas',
      description: 'Honorarios médicos, tarifas por receta y métricas de operadores.',
      icon: TrendingUp,
      badge: 'Métricas',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones & Canales',
      description: 'WhatsApp API (Meta), servidor SMTP y plantillas dinámicas.',
      icon: Bell,
      badge: 'Canales',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      id: 'pagos',
      label: 'Pasarela de Pagos (MP)',
      description: 'Credenciales de Mercado Pago, tasas y recaudación.',
      icon: CreditCard,
      badge: 'Mercado Pago',
      iconBg: 'bg-[#295EF3]/20 text-[#295EF3]',
    },
  ];

  const isConfigActive = ['reportes', 'notificaciones', 'pagos'].includes(activeSubcategory);
  const [isConfigExpanded, setIsConfigExpanded] = useState(isConfigActive);
  const [showFlyout, setShowFlyout] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-expand if activeSubcategory belongs to configuration
  useEffect(() => {
    if (['reportes', 'notificaciones', 'pagos'].includes(activeSubcategory)) {
      setIsConfigExpanded(true);
    }
  }, [activeSubcategory]);

  // Click outside listener to dismiss the desktop flyout
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        flyoutRef.current && 
        !flyoutRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowFlyout(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfigExpanded(prev => !prev);
    setShowFlyout(prev => !prev);
  };

  const handleConfigSubItemClick = (subId: string) => {
    onSelect('admin_panel', subId);
    setShowFlyout(false);
    setIsOpen(false); // Close mobile drawer if on mobile
  };

  // Define categories and subcategories per role
  const getMenuStructure = () => {
    if (role === 'paciente') {
      return [
        {
          id: 'tramites',
          title: 'Mis Trámites',
          items: [
            { id: 'solicitar', label: 'Solicitar Receta', icon: PlusCircle },
            { id: 'pedidos', label: 'Mis Solicitudes', icon: FileText },
          ]
        },
        {
          id: 'mensajeria',
          title: 'Soporte Directo',
          items: [
            { id: 'chat', label: 'Chat de Consultas', icon: MessageSquare, count: chatCount, countColor: 'bg-emerald-500 text-white' },
          ]
        },
        {
          id: 'ayuda_cat',
          title: 'Instrucciones',
          items: [
            { id: 'ayuda', label: 'Preguntas Frecuentes', icon: HelpCircle },
          ]
        }
      ];
    } else if (role === 'admin' || role === 'superadmin') {
      return [
        {
          id: 'mensajeria',
          title: 'Centro de Mensajería',
          items: [
            { id: 'chat', label: 'Chat con Pacientes', icon: MessageSquare, count: chatCount, countColor: 'bg-emerald-500 text-white' },
          ]
        },
        {
          id: 'admin_panel',
          title: 'Sistema',
          items: [
            { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users },
            { id: 'auditoria', label: 'Historial de Cambios', icon: ShieldAlert },
          ]
        }
      ];
    } else if (role === 'medico' || role === 'colaborador') {
      return [
        {
          id: 'solicitudes',
          title: 'Bandeja de Pedidos',
          items: [
            { id: 'nueva', label: 'Cargar Nueva Solicitud', icon: PlusCircle },
            { id: 'pendientes', label: 'Pedidos Pendientes', icon: Clock, count: pendingCount, countColor: 'bg-amber-500 text-white' },
            { id: 'revision', label: 'En Revisión Médica', icon: Layers, count: inRevisionCount, countColor: 'bg-[#295EF3] text-white' },
            { id: 'completadas', label: 'Recetas Emitidas', icon: FileText, count: completedCount, countColor: 'bg-[#316F80] text-white' },
            { id: 'rechazadas', label: 'Solicitudes Rechazadas', icon: XCircle, count: rejectedCount, countColor: 'bg-rose-600 text-white' },
          ]
        },
        {
          id: 'mensajeria',
          title: 'Centro de Mensajería',
          items: [
            { id: 'chat', label: 'Chat con Pacientes', icon: MessageSquare, count: chatCount, countColor: 'bg-emerald-500 text-white' },
          ]
        }
      ];
    }
    return [];
  };

  const menu = getMenuStructure();

  const handleItemClick = (categoryId: string, subcategoryId: string) => {
    setShowFlyout(false);
    onSelect(categoryId, subcategoryId);
    setIsOpen(false); // Close mobile menu drawer
  };

  const SidebarContent = () => (
    <aside className="bg-[#1C2435] text-white flex flex-col justify-between h-full border-r border-white/10 shadow-lg relative">
      {/* Desktop Flyout Menu anchored to the right of the sidebar */}
      {showFlyout && (role === 'admin' || role === 'superadmin') && (
        <div 
          ref={flyoutRef}
          className="hidden lg:block absolute left-[calc(100%+12px)] top-20 z-50 w-80 bg-[#161D2B]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-4 animate-slideRight text-white"
        >
          {/* Flyout Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#295EF3]/20 border border-[#295EF3]/40 flex items-center justify-center text-[#295EF3]">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configuración</h3>
                <p className="text-[10px] text-slate-400 font-medium">Seleccioná un módulo para gestionar</p>
              </div>
            </div>
            <button 
              onClick={() => setShowFlyout(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Flyout Option Cards */}
          <div className="space-y-2">
            {configMenuItems.map((item) => {
              const isActive = activeSubcategory === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleConfigSubItemClick(item.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 border ${
                    isActive
                      ? 'bg-[#295EF3]/25 border-[#295EF3] text-white shadow-md'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${item.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold truncate">{item.label}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#295EF3] bg-white px-1.5 py-0.5 rounded-full">
                          <Check className="h-2.5 w-2.5" /> Activo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug font-normal line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Flyout Footer info */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>3 módulos de configuración</span>
            <span className="text-[#316F80] font-mono text-[9px]">v2.6 Admin</span>
          </div>
        </div>
      )}

      <div className="p-6 pb-4 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 pt-2">
          <Logo variant="full" size="md" theme="dark" />
        </div>
        
        {/* Mobile Close Button */}
        <button 
          className="lg:hidden absolute top-6 right-6 p-1.5 text-slate-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>

        <nav className="-mx-2">
          {menu.map((category) => (
            <div key={category.id} className="mb-3">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#316F80] px-3 py-1.5 block mt-4 mb-1 font-[700]">
                {category.title}
              </span>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive = activeSubcategory === item.id;
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(category.id, item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[0.85rem] font-[600] cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#295EF3]/20 border border-[#295EF3] text-white font-bold shadow-xs'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#295EF3]' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      
                      {/* Badge Counter */}
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-[700] ${item.countColor || 'bg-[#295EF3] text-white'}`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Configuración Dropdown & Right-Flyout Section for Admin & Superadmin */}
          {(role === 'admin' || role === 'superadmin') && (
            <div className="mb-3">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#316F80] px-3 py-1.5 block mt-4 mb-1 font-[700]">
                Ajustes
              </span>
              <div className="space-y-1">
                <button
                  ref={buttonRef}
                  onClick={handleToggleConfig}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[0.85rem] font-[600] cursor-pointer transition-all ${
                    isConfigActive
                      ? 'bg-[#295EF3]/20 border border-[#295EF3] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className={`h-4.5 w-4.5 transition-transform duration-300 ${isConfigActive ? 'text-[#295EF3]' : 'text-slate-400'} ${isConfigExpanded ? 'rotate-45' : ''}`} />
                    <span>Configuración</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold">
                      3
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isConfigExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Inline Collapsible Submenu */}
                {isConfigExpanded && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-[#295EF3]/30 space-y-1 animate-fadeIn">
                    {configMenuItems.map((item) => {
                      const isActive = activeSubcategory === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleConfigSubItemClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[0.8rem] font-[600] cursor-pointer transition-all ${
                            isActive
                              ? 'bg-[#295EF3] text-white font-bold shadow-xs'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-white ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
      </div>

      <div className="p-6 pt-4 border-t border-white/10 bg-[#161D2B]">
        <div className="flex items-center gap-3 mb-3.5">
          <div className="h-9 w-9 rounded-full bg-[#295EF3]/20 border border-[#295EF3]/40 text-[#295EF3] font-black text-xs flex items-center justify-center shrink-0">
            {userName.charAt(0)}{userLastName.charAt(0)}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[0.85rem] font-[700] text-white truncate">{userName} {userLastName}</p>
            <p className="text-[0.75rem] text-[#316F80] font-bold capitalize">{role}</p>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="w-full text-[0.8rem] text-slate-400 hover:text-rose-400 font-[600] flex items-center gap-2 cursor-pointer transition-colors pt-3 border-t border-white/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top navigation bar */}
      <div className="lg:hidden h-16 bg-[#1C2435] border-b border-[#1C2435]/20 px-4 flex items-center justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <button 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-6 w-6 text-white" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <Logo variant="full" size="sm" theme="dark" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[#295EF3]/20 border border-[#295EF3]/40 text-[#295EF3] text-[9px] font-extrabold uppercase rounded-md">
            {role}
          </span>
        </div>
      </div>

      {/* Desktop Sidebar: Always Visible */}
      <aside className="hidden lg:block w-64 h-screen shrink-0 sticky top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-[#1C2435]/60 backdrop-blur-xs flex animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          {/* Mobile Sidebar Content */}
          <div 
            className="w-72 h-full shadow-2xl animate-slideRight"
            onClick={(e) => e.stopPropagation()} // Prevent closing on clicking sidebar
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
