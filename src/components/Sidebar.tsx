/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  XCircle
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
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

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
            { id: 'chat', label: 'Chat de Consultas', icon: MessageSquare },
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
    } else if (role === 'medico' || role === 'colaborador' || role === 'admin') {
      const isMedic = role === 'medico';
      const isAdmin = role === 'admin';
      return [
        {
          id: 'solicitudes',
          title: 'Bandeja de Pedidos',
          items: [
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
            { id: 'chat', label: 'Chat con Pacientes', icon: MessageSquare },
          ]
        },
        ...(role !== 'colaborador' ? [{
          id: 'admin_panel',
          title: isAdmin ? 'Sistema' : 'Administración',
          items: [
            ...(!isAdmin ? [{ id: 'reportes', label: 'Liquidaciones y Métricas', icon: TrendingUp }] : []),
            ...(isMedic || isAdmin ? [
              { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users },
              { id: 'auditoria', label: 'Historial de Cambios', icon: ShieldAlert },
              { id: 'pagos', label: 'Configuración Pasarela (MP)', icon: Settings }
            ] : []),
          ]
        }] : [])
      ];
    }
    return [];
  };

  const menu = getMenuStructure();

  const handleItemClick = (categoryId: string, subcategoryId: string) => {
    onSelect(categoryId, subcategoryId);
    setIsOpen(false); // Close mobile menu drawer
  };

  const SidebarContent = () => (
    <aside className="bg-white flex flex-col justify-between h-full border-r border-[#1C2435]/10 shadow-xs">
      <div className="p-6 pb-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 pt-2">
          <Logo variant="full" size="md" />
        </div>
        
        {/* Mobile Close Button */}
        <button 
          className="lg:hidden absolute top-6 right-6 p-1.5 text-slate-400 hover:text-[#1C2435]"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>

        <nav className="-mx-2">
          {menu.map((category) => (
            <div key={category.id} className="mb-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#316F80] px-3 py-2 block mt-4 mb-1 font-[700]">
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
                          ? 'bg-[#295EF3]/10 text-[#295EF3] font-bold border-l-4 border-[#295EF3] shadow-2xs'
                          : 'text-[#1C2435]/70 hover:bg-[#1C2435]/5 hover:text-[#1C2435]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-[#295EF3]' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      
                      {/* Badge Counter */}
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-[700] ${item.countColor || 'bg-[#1C2435] text-white'}`}>
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

      <div className="p-6 pt-4 border-t border-[#1C2435]/10 bg-slate-50/50">
        {(role === 'admin' || role === 'superadmin' || role === 'medico') && (
          <button 
            onClick={() => handleItemClick('admin_panel', 'pagos')} 
            className={`w-full text-[0.8rem] font-[600] flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-4 cursor-pointer transition-all ${
              activeSubcategory === 'pagos' 
                ? 'bg-[#295EF3]/10 text-[#295EF3] font-bold shadow-2xs' 
                : 'text-[#1C2435]/70 hover:bg-[#1C2435]/5 hover:text-[#1C2435]'
            }`}
          >
            <Settings className="h-4.5 w-4.5 text-[#316F80]" />
            <span>Configuración MP</span>
          </button>
        )}
        <div className="flex flex-col gap-0.5 mb-4">
          <p className="text-[0.85rem] font-[700] text-[#1C2435]">{userName} {userLastName}</p>
          <p className="text-[0.75rem] text-[#316F80] font-semibold capitalize">{role}</p>
        </div>
        <button 
          onClick={onLogout} 
          className="w-full text-[0.8rem] text-slate-500 hover:text-red-600 font-[600] flex items-center gap-2 cursor-pointer transition-colors pt-2 border-t border-slate-200/60"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
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
      <aside className="hidden lg:block w-64 h-screen shrink-0 sticky top-0">
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
