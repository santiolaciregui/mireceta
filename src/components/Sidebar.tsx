/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Heart, 
  PlusCircle, 
  FileText, 
  MessageSquare, 
  HelpCircle, 
  TrendingUp, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Activity,
  ShieldAlert,
  Clock,
  User,
  Layers
} from 'lucide-react';
import { UserRole } from '../types';

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
            { id: 'revision', label: 'En Revisión Médica', icon: Layers, count: inRevisionCount, countColor: 'bg-blue-600 text-white' },
            { id: 'completadas', label: 'Recetas Emitidas', icon: FileText, count: completedCount, countColor: 'bg-emerald-600 text-white' },
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
              { id: 'auditoria', label: 'Historial de Cambios', icon: ShieldAlert }
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
    <aside className="bg-[var(--bg)] flex flex-col justify-between h-full">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-[var(--ink)] rounded-md shrink-0 flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span className="font-[800] text-[1.1rem] tracking-tight text-[var(--ink)]">RecetaFácil</span>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          className="lg:hidden absolute top-6 right-6 p-1.5 text-slate-400"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>

        <nav className="-mx-4">
          {menu.map((category) => (
            <div key={category.id} className="mb-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--ink-muted)] px-4 py-2 block mt-6 mb-1 font-[600]">
                {category.title}
              </span>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive = activeSubcategory === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(category.id, item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-[0.85rem] font-[500] cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[var(--ink-faint)] text-[var(--ink)]'
                          : 'text-[var(--ink-muted)] hover:bg-[var(--ink-faint)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <span>{item.label}</span>
                      
                      {/* Badge Counter */}
                      {item.count !== undefined && item.count > 0 && (
                        <span className="bg-[var(--ink)] text-[var(--white)] text-[0.65rem] px-1.5 py-0.5 rounded font-[700]">
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

      <div className="p-8 pt-4">
        <div className="flex flex-col gap-1 mb-4">
          <p className="text-[0.85rem] font-[600] text-[var(--ink)]">{userName} {userLastName}</p>
          <p className="text-[0.75rem] text-[var(--ink-muted)] capitalize">{role}</p>
        </div>
        <button 
          onClick={onLogout} 
          className="text-[0.8rem] text-[var(--ink-muted)] hover:text-[var(--ink)] font-[500] flex items-center gap-2 cursor-pointer transition-colors"
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
      <div className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <button 
            className="p-2 hover:bg-slate-800 rounded-xl"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-6 w-6 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 bg-blue-600 rounded-md shrink-0 flex items-center justify-center shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span className="font-extrabold text-sm tracking-tight">RecetaFácil</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[9px] font-extrabold uppercase rounded-md">
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
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-fadeIn"
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
