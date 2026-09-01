/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  pendingPaymentCount?: number;
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
  pendingPaymentCount = 0,
  inRevisionCount,
  completedCount,
  rejectedCount = 0,
  chatCount = 0,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Configuration subitems definition
  const configMenuItems = [
    {
      id: 'reportes',
      label: 'Liquidaciones y Métricas',
      icon: TrendingUp,
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones & Canales',
      icon: Bell,
    },
    {
      id: 'pagos',
      label: 'Pasarela de Pagos (MP)',
      icon: CreditCard,
    },
  ];

  const isConfigActive = ['reportes', 'notificaciones', 'pagos'].includes(activeSubcategory);
  const [isConfigExpanded, setIsConfigExpanded] = useState(isConfigActive);

  // Auto-expand dropdown if activeSubcategory belongs to configuration
  useEffect(() => {
    if (['reportes', 'notificaciones', 'pagos'].includes(activeSubcategory)) {
      setIsConfigExpanded(true);
    }
  }, [activeSubcategory]);

  const handleConfigSubItemClick = (subId: string) => {
    onSelect('admin_panel', subId);
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
          id: 'padron',
          title: 'Padrón de Pacientes',
          items: [
            { id: 'pacientes', label: 'Listado de Pacientes', icon: Users },
          ]
        },
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
      const baseMenu = [
        {
          id: 'solicitudes',
          title: 'Bandeja de Pedidos',
          items: [
            { id: 'nueva', label: 'Cargar Nueva Solicitud', icon: PlusCircle },
            { id: 'pendientes', label: 'Solicitudes Pendientes', icon: Clock, count: pendingCount, countColor: 'bg-amber-500 text-white' },
            { id: 'pago_pendiente', label: 'Solicitudes con Pago Pendiente', icon: CreditCard, count: pendingPaymentCount, countColor: 'bg-orange-500 text-white' },
            { id: 'revision', label: 'En Revisión Médica', icon: Layers, count: inRevisionCount, countColor: 'bg-[#1E6EFB] text-white' },
            { id: 'completadas', label: 'Recetas Emitidas', icon: FileText, count: completedCount, countColor: 'bg-[#14BE99] text-white' },
            { id: 'rechazadas', label: 'Solicitudes Rechazadas', icon: XCircle, count: rejectedCount, countColor: 'bg-rose-600 text-white' },
          ]
        },
        {
          id: 'padron',
          title: 'Padrón de Pacientes',
          items: [
            { id: 'pacientes', label: 'Listado de Pacientes', icon: Users },
          ]
        },
        {
          id: 'mensajeria',
          title: 'Centro de Mensajería',
          items: [
            { id: 'chat', label: 'Chat con Pacientes', icon: MessageSquare, count: chatCount, countColor: 'bg-[#14BE99] text-white' },
          ]
        }
      ];

      if (role === 'medico') {
        baseMenu.push({
          id: 'reportes_cat',
          title: 'Reportes',
          items: [
            { id: 'reportes', label: 'Liquidaciones y Métricas', icon: TrendingUp },
          ]
        });
      }

      return baseMenu;
    }
    return [];
  };

  const menu = getMenuStructure();

  const handleItemClick = (categoryId: string, subcategoryId: string) => {
    onSelect(categoryId, subcategoryId);
    setIsOpen(false); // Close mobile menu drawer
  };

  const SidebarContent = () => (
    <aside className="relative bg-[#0141BC] text-white flex flex-col justify-between h-full border-r border-white/10 shadow-lg overflow-hidden">
      <div className="px-3.5 py-5 pb-4 overflow-y-auto flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6 pt-1 px-1.5">
          <Logo variant="full" size="md" theme="dark" />
        </div>
        
        {/* Mobile Close Button */}
        <button 
          className="lg:hidden absolute top-5 right-5 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar menú lateral"
        >
          <X className="h-5 w-5" />
        </button>

        <nav className="space-y-3">
          {menu.map((category) => (
            <div key={category.id} className="mb-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#14BE99] px-2.5 py-1 block mt-3 mb-1 font-[700]">
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
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[0.82rem] font-[600] cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#1661E1] border border-[#1E6EFB] text-white font-bold shadow-xs'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      </div>
                      
                      {/* Badge Counter */}
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`text-[0.68rem] min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full font-[700] shrink-0 ml-auto shadow-xs ${item.countColor || 'bg-[#1E6EFB] text-white'}`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom section: Configuración collapsible above User Profile */}
      <div className="p-4 pt-3 border-t border-white/10 bg-[#081B4B] shrink-0">
        {/* Configuración Dropdown for Admin & Superadmin */}
        {(role === 'admin' || role === 'superadmin') && (
          <div className="mb-3">
            <button
              onClick={() => setIsConfigExpanded(prev => !prev)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[0.82rem] font-[600] cursor-pointer transition-all ${
                isConfigActive
                  ? 'bg-[#1661E1] border border-[#1E6EFB] text-white font-bold shadow-xs'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Settings className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ${isConfigActive ? 'text-white' : 'text-slate-300'} ${isConfigExpanded ? 'rotate-45' : ''}`} />
                <span className="whitespace-nowrap">Configuración</span>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/15 text-white font-bold">
                  3
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${isConfigExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Inline Collapsible Submenu */}
            {isConfigExpanded && (
              <div className="mt-1.5 ml-2 pl-2.5 border-l-2 border-[#1E6EFB]/40 space-y-1 animate-fadeIn">
                {configMenuItems.map((item) => {
                  const isActive = activeSubcategory === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleConfigSubItemClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[0.78rem] font-[600] cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#1661E1] text-white font-bold shadow-xs'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-white ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User Profile Info */}
        <div className="flex items-center gap-3 mb-3.5 pt-1">
          <div className="h-9 w-9 rounded-full bg-[#1661E1]/40 border border-[#1E6EFB]/60 text-white font-black text-xs flex items-center justify-center shrink-0">
            {userName.charAt(0)}{userLastName.charAt(0)}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[0.85rem] font-[700] text-white truncate">{userName} {userLastName}</p>
            <p className="text-[0.75rem] text-[#14BE99] font-bold capitalize">{role}</p>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="w-full text-[0.8rem] text-slate-300 hover:text-rose-400 font-[600] flex items-center gap-2 cursor-pointer transition-colors pt-3 border-t border-white/10"
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
      <div className="lg:hidden h-16 bg-[#0141BC] border-b border-[#0141BC]/20 px-4 flex items-center justify-between text-white shrink-0 shadow-md">
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
          <span className="px-2.5 py-1 bg-[#1661E1] border border-[#1E6EFB]/40 text-white text-[9px] font-extrabold uppercase rounded-md">
            {role}
          </span>
        </div>
      </div>

      {/* Desktop Sidebar: Always Visible */}
      <aside className="hidden lg:block w-full h-screen shrink-0 sticky top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-[#0141BC]/60 backdrop-blur-xs flex animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          {/* Mobile Sidebar Content */}
          <div 
            className="w-80 max-w-[88vw] h-full shadow-2xl animate-slideRight flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing on clicking sidebar
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
