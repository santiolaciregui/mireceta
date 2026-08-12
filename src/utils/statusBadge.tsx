/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Stethoscope, UserCheck, ShieldCheck, Sparkles, User } from 'lucide-react';

/**
 * Retorna clases CSS de Tailwind para el badge de estado de una orden.
 * Se usa en DoctorDashboard, PatientStatus y AuditLogView.
 */
export function getStatusBadge(status?: string): string {
  switch (status) {
    case 'Emitida':
    case 'Enviada':
    case 'Aprobada':
      return 'bg-[#14BE99]/10 text-[#0F6C7D] border-[#14BE99]/30';
    case 'En revisión':
      return 'bg-[#1661E1]/10 text-[#1661E1] border-[#1661E1]/20';
    case 'Solicita más información':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Rechazada':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Retorna clases CSS para el badge de color de una acción de auditoría.
 */
export function getActionBadgeColor(action: string): string {
  const act = action.toLowerCase();
  if (act.includes('emitida') || act.includes('aprobada') || act.includes('adjuntada')) {
    return 'bg-[#0F6C7D]/15 text-[#0F6C7D] border-[#0F6C7D]/30';
  }
  if (act.includes('pago aprobado') || act.includes('pago confirmado')) {
    return 'bg-[#14BE99]/10 text-[#14BE99] border-[#14BE99]/30';
  }
  if (act.includes('rechazada') || act.includes('inactiva') || act.includes('cancelada')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (act.includes('revisión') || act.includes('revision') || act.includes('inició')) {
    return 'bg-[#1661E1]/15 text-[#1661E1] border-[#1661E1]/30';
  }
  if (act.includes('información') || act.includes('informacion')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (act.includes('enviada')) {
    return 'bg-[#3066C6]/15 text-[#3066C6] border-[#3066C6]/30';
  }
  if (act.includes('devolución') || act.includes('devolucion')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-slate-100 text-[#0141BC] border-slate-200';
}

interface RoleBadge {
  icon: React.ReactNode;
  label: string;
  badgeClass: string;
}

/**
 * Retorna icono, label y clases CSS para el badge de rol del actor de auditoría.
 * Se usa en AuditLogView.
 */
export function getUserRoleBadge(userName: string): RoleBadge {
  const nameLower = userName.toLowerCase();

  if (nameLower.includes('dr') || nameLower.includes('médico') || nameLower.includes('medico')) {
    return {
      icon: <Stethoscope className="h-3 w-3 text-[#1661E1] shrink-0" />,
      label: 'Médico',
      badgeClass: 'bg-[#1661E1]/10 text-[#1661E1] border-[#1661E1]/20',
    };
  }
  if (nameLower.includes('colaborador') || nameLower.includes('operador')) {
    return {
      icon: <UserCheck className="h-3 w-3 text-[#0F6C7D] shrink-0" />,
      label: 'Colaborador',
      badgeClass: 'bg-[#0F6C7D]/10 text-[#0F6C7D] border-[#0F6C7D]/20',
    };
  }
  if (nameLower.includes('admin') || nameLower.includes('administrador')) {
    return {
      icon: <ShieldCheck className="h-3 w-3 text-white shrink-0" />,
      label: 'Admin',
      badgeClass: 'bg-[#0141BC] text-white border-transparent',
    };
  }
  if (nameLower.includes('sistema') || nameLower.includes('mercado pago')) {
    return {
      icon: <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />,
      label: 'Sistema',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return {
    icon: <User className="h-3 w-3 text-slate-500 shrink-0" />,
    label: 'Paciente',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}
