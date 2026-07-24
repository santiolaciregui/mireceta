/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SystemUser } from '../types';
import { Activity, LogOut, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentUser: SystemUser | null;
  onLogout: () => void;
  pendingCount: number;
  completedCount: number;
  onReset: () => void;
}

export default function Navbar({
  currentUser,
  onLogout,
  pendingCount,
  completedCount,
  onReset,
}: NavbarProps) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-1.5">
                RecetaFácil
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 bg-blue-50/70 text-blue-700 font-bold rounded-full border border-blue-100">
                  Renovación medicación crónica
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold hidden sm:block">
                Portal de Renovación de Medicación Crónica
              </p>
            </div>
          </div>

          {/* User Badge and Logout */}
          {currentUser && (
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Quick database reset button for convenient testing */}
              <button
                onClick={() => {
                  if (window.confirm('¿Desea restaurar la base de datos a sus valores iniciales?')) {
                    onReset();
                  }
                }}
                title="Reiniciar base de datos a valores iniciales"
                className="p-2 sm:p-2.5 text-slate-450 hover:text-blue-600 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>

              {/* User Identity Info */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-extrabold text-slate-900 leading-tight">
                  {currentUser.name} {currentUser.lastName}
                </span>
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5 flex items-center justify-end gap-1">
                  {currentUser.role === 'admin' ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : currentUser.role === 'medico' ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ) : currentUser.role === 'colaborador' ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}{' '}
                  {currentUser.role === 'colaborador' ? 'COLABORADOR MÉD.' : currentUser.role.toUpperCase()}
                </span>
              </div>

              {/* Role badge for tiny mobile viewports */}
              <div className="md:hidden px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[8px] font-bold text-slate-500 block uppercase">
                  {currentUser.role === 'colaborador' ? currentUser.role : currentUser.role}
                </span>
              </div>

              {/* Secure Logout Button */}
              <button
                onClick={onLogout}
                className="py-2 px-3 sm:px-4 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                title="Cerrar Sesión de forma segura"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Top Session Breadcrumb Bar */}
      {currentUser && (
        <div className="bg-slate-50/80 border-t border-b border-slate-200/50 py-1.5 px-4 text-center">
          <p className="text-[10px] sm:text-xs text-slate-600 font-semibold flex items-center justify-center gap-1.5 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sesión activa como: <strong className="text-slate-900">{currentUser.name} ({currentUser.role === 'colaborador' ? 'COLABORADOR MÉDICO' : currentUser.role.toUpperCase()})</strong>
            {(currentUser.role === 'colaborador') && currentUser.medicoName && (
              <span> — Médico Asociado: <strong className="text-violet-700">{currentUser.medicoName}</strong></span>
            )}
            <span> — Identificador: </span>
            <span className="font-mono text-slate-700 bg-slate-200/50 px-1.5 py-0.5 rounded-md">{currentUser.identifier}</span>
          </p>
        </div>
      )}
    </header>
  );
}
