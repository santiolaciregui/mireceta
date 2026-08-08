import React, { useState, useMemo } from 'react';
import { MedicalOrder, AuditLogEntry } from '../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Calendar,
  Activity,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  UserCheck,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Building2,
  XCircle,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface AuditLogViewProps {
  orders: MedicalOrder[];
  currentUser?: any;
}

export interface EnrichedAuditEntry extends AuditLogEntry {
  orderId: string;
  orderStatus: string;
  patientFullName: string;
  patientDni: string;
  patientEmail?: string;
  patientPhone?: string;
  obraSocial?: string;
  diagnostic?: string;
  medicationSummary?: string;
}

export interface PatientAuditGroup {
  patientKey: string;
  patientFullName: string;
  patientName: string;
  patientLastName: string;
  patientDni: string;
  patientEmail?: string;
  patientPhone?: string;
  obraSocial?: string;
  obraSocialNumber?: string;
  latestStatus?: string;
  lastActivityTimestamp: string;
  orderIds: string[];
  logs: EnrichedAuditEntry[];
  stats: {
    totalEvents: number;
    doctorEvents: number;
    collaboratorEvents: number;
    adminEvents: number;
    patientEvents: number;
  };
}

export default function AuditLogView({ orders }: AuditLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'medicos' | 'colaboradores' | 'admin' | 'paciente'>('all');
  const [viewMode, setViewMode] = useState<'by_patient' | 'flat'>('by_patient');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'events'>('recent');
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});

  // Consolidate all audit log entries from all orders into a single list
  const allEnrichedLogs: EnrichedAuditEntry[] = useMemo(() => {
    const list: EnrichedAuditEntry[] = [];

    orders.forEach((order) => {
      const patientFullName = `${order.patientName || ''} ${order.patientLastName || ''}`.trim() || 'Paciente sin nombre';
      const medSummary = order.medicationItems && order.medicationItems.length > 0
        ? order.medicationItems.map((m) => m.nombreComercial).filter(Boolean).join(', ')
        : order.medicationText || undefined;

      if (order.auditLog && Array.isArray(order.auditLog) && order.auditLog.length > 0) {
        order.auditLog.forEach((log) => {
          list.push({
            ...log,
            orderId: order.id,
            orderStatus: order.status,
            patientFullName,
            patientDni: order.patientDni || 'S/DNI',
            patientEmail: order.patientEmail,
            patientPhone: order.patientPhone,
            obraSocial: order.obraSocial,
            diagnostic: order.diagnostic,
            medicationSummary: medSummary,
          });
        });
      } else {
        // Fallback: If an order has no audit entries yet, include its creation as baseline
        list.push({
          action: 'Creada',
          user: order.createdByOperatorName || 'Paciente (Autogestión)',
          timestamp: order.createdAt || new Date().toISOString(),
          notes: `Solicitud #${order.id} registrada en el sistema`,
          orderId: order.id,
          orderStatus: order.status,
          patientFullName,
          patientDni: order.patientDni || 'S/DNI',
          patientEmail: order.patientEmail,
          patientPhone: order.patientPhone,
          obraSocial: order.obraSocial,
          diagnostic: order.diagnostic,
          medicationSummary: medSummary,
        });
      }
    });

    // Sort by timestamp descending (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  // Group logs by patient
  const patientGroups: PatientAuditGroup[] = useMemo(() => {
    const groupMap = new Map<string, PatientAuditGroup>();

    orders.forEach((order) => {
      const patientFullName = `${order.patientName || ''} ${order.patientLastName || ''}`.trim() || 'Paciente sin nombre';
      const cleanDni = (order.patientDni || '').trim();
      const patientKey = cleanDni ? cleanDni.toLowerCase() : patientFullName.toLowerCase();

      if (!groupMap.has(patientKey)) {
        groupMap.set(patientKey, {
          patientKey,
          patientFullName,
          patientName: order.patientName || '',
          patientLastName: order.patientLastName || '',
          patientDni: order.patientDni || 'Sin DNI',
          patientEmail: order.patientEmail,
          patientPhone: order.patientPhone,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber,
          latestStatus: order.status,
          lastActivityTimestamp: order.createdAt || new Date().toISOString(),
          orderIds: [order.id],
          logs: [],
          stats: {
            totalEvents: 0,
            doctorEvents: 0,
            collaboratorEvents: 0,
            adminEvents: 0,
            patientEvents: 0,
          },
        });
      } else {
        const existing = groupMap.get(patientKey)!;
        if (!existing.orderIds.includes(order.id)) {
          existing.orderIds.push(order.id);
        }
        if (order.obraSocial && !existing.obraSocial) existing.obraSocial = order.obraSocial;
        if (order.obraSocialNumber && !existing.obraSocialNumber) existing.obraSocialNumber = order.obraSocialNumber;
        if (order.patientEmail && !existing.patientEmail) existing.patientEmail = order.patientEmail;
        if (order.patientPhone && !existing.patientPhone) existing.patientPhone = order.patientPhone;
      }
    });

    // Attach enriched logs to corresponding patient group
    allEnrichedLogs.forEach((log) => {
      const cleanDni = (log.patientDni || '').trim();
      const patientKey = cleanDni && cleanDni !== 'S/DNI' ? cleanDni.toLowerCase() : log.patientFullName.toLowerCase();

      let group = groupMap.get(patientKey);
      if (!group) {
        // Create on the fly if not already registered
        group = {
          patientKey,
          patientFullName: log.patientFullName,
          patientName: log.patientFullName,
          patientLastName: '',
          patientDni: log.patientDni,
          patientEmail: log.patientEmail,
          patientPhone: log.patientPhone,
          obraSocial: log.obraSocial,
          latestStatus: log.orderStatus,
          lastActivityTimestamp: log.timestamp,
          orderIds: [log.orderId],
          logs: [],
          stats: {
            totalEvents: 0,
            doctorEvents: 0,
            collaboratorEvents: 0,
            adminEvents: 0,
            patientEvents: 0,
          },
        };
        groupMap.set(patientKey, group);
      }

      group.logs.push(log);
      group.stats.totalEvents += 1;

      // Classify actor role for stats
      const userLower = (log.user || '').toLowerCase();
      if (userLower.includes('dr') || userLower.includes('médico') || userLower.includes('medico')) {
        group.stats.doctorEvents += 1;
      } else if (userLower.includes('colaborador') || userLower.includes('operador')) {
        group.stats.collaboratorEvents += 1;
      } else if (userLower.includes('admin') || userLower.includes('administrador')) {
        group.stats.adminEvents += 1;
      } else {
        group.stats.patientEvents += 1;
      }

      // Update latest activity timestamp
      if (new Date(log.timestamp).getTime() > new Date(group.lastActivityTimestamp).getTime()) {
        group.lastActivityTimestamp = log.timestamp;
      }
    });

    const groups = Array.from(groupMap.values());

    // Sort logs inside each group by timestamp descending
    groups.forEach((g) => {
      g.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    return groups;
  }, [orders, allEnrichedLogs]);

  // Overall KPI statistics
  const summaryStats = useMemo(() => {
    let totalDoctorEvents = 0;
    let totalCollaboratorEvents = 0;
    let totalAdminEvents = 0;
    let totalPatientEvents = 0;

    allEnrichedLogs.forEach((log) => {
      const u = (log.user || '').toLowerCase();
      if (u.includes('dr') || u.includes('médico') || u.includes('medico')) {
        totalDoctorEvents++;
      } else if (u.includes('colaborador') || u.includes('operador')) {
        totalCollaboratorEvents++;
      } else if (u.includes('admin') || u.includes('administrador')) {
        totalAdminEvents++;
      } else {
        totalPatientEvents++;
      }
    });

    return {
      totalPatients: patientGroups.length,
      totalLogs: allEnrichedLogs.length,
      totalDoctorEvents,
      totalCollaboratorEvents,
      totalAdminEvents,
      totalPatientEvents,
    };
  }, [patientGroups, allEnrichedLogs]);

  // Matches log against current role filter
  const matchesRoleFilter = (log: EnrichedAuditEntry) => {
    if (roleFilter === 'all') return true;
    const userLower = (log.user || '').toLowerCase();
    if (roleFilter === 'medicos') {
      return userLower.includes('dr') || userLower.includes('médico') || userLower.includes('medico');
    }
    if (roleFilter === 'colaboradores') {
      return userLower.includes('colaborador') || userLower.includes('operador');
    }
    if (roleFilter === 'admin') {
      return userLower.includes('admin') || userLower.includes('administrador');
    }
    if (roleFilter === 'paciente') {
      return userLower.includes('paciente') || userLower.includes('autogestión') || userLower.includes('autogestion');
    }
    return true;
  };

  // Matches log or group against search term
  const matchesSearch = (text: string) => {
    if (!searchTerm.trim()) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase().trim());
  };

  // Filtered Patient Groups
  const filteredPatientGroups = useMemo(() => {
    return patientGroups
      .map((group) => {
        // Filter this patient's logs based on search and role
        const filteredGroupLogs = group.logs.filter((log) => {
          const passesRole = matchesRoleFilter(log);
          if (!passesRole) return false;

          if (!searchTerm.trim()) return true;

          const query = searchTerm.toLowerCase();
          const matchPatientName = group.patientFullName.toLowerCase().includes(query);
          const matchPatientDni = group.patientDni.toLowerCase().includes(query);
          const matchUser = log.user.toLowerCase().includes(query);
          const matchAction = log.action.toLowerCase().includes(query);
          const matchOrderId = log.orderId.toLowerCase().includes(query);
          const matchNotes = (log.notes || '').toLowerCase().includes(query);
          const matchDiagnostic = (log.diagnostic || '').toLowerCase().includes(query);
          const matchObraSocial = (group.obraSocial || '').toLowerCase().includes(query);

          return (
            matchPatientName ||
            matchPatientDni ||
            matchUser ||
            matchAction ||
            matchOrderId ||
            matchNotes ||
            matchDiagnostic ||
            matchObraSocial
          );
        });

        return {
          ...group,
          filteredLogs: filteredGroupLogs,
        };
      })
      .filter((group) => group.filteredLogs.length > 0)
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.patientFullName.localeCompare(b.patientFullName, 'es', { sensitivity: 'base' });
        }
        if (sortBy === 'events') {
          return b.filteredLogs.length - a.filteredLogs.length;
        }
        // Default 'recent'
        return new Date(b.lastActivityTimestamp).getTime() - new Date(a.lastActivityTimestamp).getTime();
      });
  }, [patientGroups, searchTerm, roleFilter, sortBy]);

  // Filtered Flat Logs (for Global Chronological mode)
  const filteredFlatLogs = useMemo(() => {
    return allEnrichedLogs.filter((log) => {
      const passesRole = matchesRoleFilter(log);
      if (!passesRole) return false;

      if (!searchTerm.trim()) return true;

      const query = searchTerm.toLowerCase();
      return (
        log.user.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.orderId.toLowerCase().includes(query) ||
        log.patientFullName.toLowerCase().includes(query) ||
        log.patientDni.toLowerCase().includes(query) ||
        (log.notes && log.notes.toLowerCase().includes(query)) ||
        (log.diagnostic && log.diagnostic.toLowerCase().includes(query)) ||
        (log.obraSocial && log.obraSocial.toLowerCase().includes(query))
      );
    });
  }, [allEnrichedLogs, searchTerm, roleFilter]);

  // Accordion toggle helpers
  const togglePatientExpand = (patientKey: string) => {
    setExpandedPatients((prev) => ({
      ...prev,
      [patientKey]: prev[patientKey] === undefined ? false : !prev[patientKey],
    }));
  };

  const isPatientExpanded = (patientKey: string) => {
    // By default, if search is active or first few, we expand; otherwise default to expanded
    if (expandedPatients[patientKey] !== undefined) {
      return expandedPatients[patientKey];
    }
    return true; // default expanded for clear visual inspection
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredPatientGroups.forEach((g) => {
      next[g.patientKey] = true;
    });
    setExpandedPatients(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    filteredPatientGroups.forEach((g) => {
      next[g.patientKey] = false;
    });
    setExpandedPatients(next);
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' hs'
      );
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return formatDate(isoString).split(',')[0];
    } catch {
      return '';
    }
  };

  // Action badge styling
  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('emitida') || act.includes('aprobada') || act.includes('adjuntada')) {
      return 'bg-[#316F80]/15 text-[#316F80] border-[#316F80]/30';
    }
    if (act.includes('pago aprobado') || act.includes('pago confirmado')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('rechazada') || act.includes('inactiva') || act.includes('cancelada')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('revisión') || act.includes('revision') || act.includes('inició')) {
      return 'bg-[#295EF3]/15 text-[#295EF3] border-[#295EF3]/30';
    }
    if (act.includes('información') || act.includes('informacion')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (act.includes('enviada')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (act.includes('devolución') || act.includes('devolucion')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-[#1C2435] border-slate-200';
  };

  // Role icon and styling for user badge
  const getUserRoleBadge = (userName: string) => {
    const nameLower = userName.toLowerCase();

    if (nameLower.includes('dr') || nameLower.includes('médico') || nameLower.includes('medico')) {
      return {
        icon: <Stethoscope className="h-3 w-3 text-[#295EF3] shrink-0" />,
        label: 'Médico',
        badgeClass: 'bg-[#295EF3]/10 text-[#295EF3] border-[#295EF3]/20',
      };
    }
    if (nameLower.includes('colaborador') || nameLower.includes('operador')) {
      return {
        icon: <UserCheck className="h-3 w-3 text-[#316F80] shrink-0" />,
        label: 'Colaborador',
        badgeClass: 'bg-[#316F80]/10 text-[#316F80] border-[#316F80]/20',
      };
    }
    if (nameLower.includes('admin') || nameLower.includes('administrador')) {
      return {
        icon: <ShieldCheck className="h-3 w-3 text-white shrink-0" />,
        label: 'Admin',
        badgeClass: 'bg-[#1C2435] text-white border-transparent',
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
  };

  // Status badge styling for order status
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Emitida':
      case 'Enviada':
      case 'Aprobada':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'En revisión':
        return 'bg-[#295EF3]/10 text-[#295EF3] border-[#295EF3]/20';
      case 'Solicita más información':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Rechazada':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#295EF3]/10 flex items-center justify-center text-[#295EF3] shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pacientes con Registro</p>
            <p className="text-xl font-extrabold text-[#1C2435] mt-0.5">{summaryStats.totalPatients}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#316F80]/10 flex items-center justify-center text-[#316F80] shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eventos de Auditoría</p>
            <p className="text-xl font-extrabold text-[#1C2435] mt-0.5">{summaryStats.totalLogs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acciones Médicas</p>
            <p className="text-xl font-extrabold text-[#1C2435] mt-0.5">{summaryStats.totalDoctorEvents}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-[#1C2435] shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gestión Operativa</p>
            <p className="text-xl font-extrabold text-[#1C2435] mt-0.5">
              {summaryStats.totalCollaboratorEvents + summaryStats.totalAdminEvents}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por paciente, DNI, médico, acción o ID..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#1C2435] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#295EF3]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode & Expand/Collapse All Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {/* View Mode Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('by_patient')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'by_patient'
                    ? 'bg-white text-[#1C2435] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Por Paciente</span>
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-white text-[#1C2435] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Vista Cronológica</span>
              </button>
            </div>

            {/* Expand / Collapse All (Only in by_patient mode) */}
            {viewMode === 'by_patient' && filteredPatientGroups.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={expandAll}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Expandir todos los historiales"
                >
                  <ChevronDown className="h-3 w-3" />
                  <span>Expandir</span>
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Colapsar todos los historiales"
                >
                  <ChevronUp className="h-3 w-3" />
                  <span>Colapsar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Row: Roles & Sorting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Rol:
            </span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-[#1C2435] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos ({summaryStats.totalLogs})
            </button>
            <button
              onClick={() => setRoleFilter('medicos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                roleFilter === 'medicos'
                  ? 'bg-[#295EF3] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Stethoscope className="h-3 w-3" />
              Médicos ({summaryStats.totalDoctorEvents})
            </button>
            <button
              onClick={() => setRoleFilter('colaboradores')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                roleFilter === 'colaboradores'
                  ? 'bg-[#316F80] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserCheck className="h-3 w-3" />
              Colaboradores ({summaryStats.totalCollaboratorEvents})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                roleFilter === 'admin'
                  ? 'bg-[#1C2435] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Admins ({summaryStats.totalAdminEvents})
            </button>
            <button
              onClick={() => setRoleFilter('paciente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                roleFilter === 'paciente'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <User className="h-3 w-3" />
              Pacientes ({summaryStats.totalPatientEvents})
            </button>
          </div>

          {/* Sort selector (in by_patient mode) */}
          {viewMode === 'by_patient' && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
              <span className="text-[11px] font-bold text-slate-400">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-[#1C2435] focus:outline-none focus:ring-2 focus:ring-[#295EF3]"
              >
                <option value="recent">Actividad más reciente</option>
                <option value="name">Nombre de Paciente (A-Z)</option>
                <option value="events">Mayor cantidad de eventos</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Content: Grouped by Patient View */}
      {viewMode === 'by_patient' ? (
        filteredPatientGroups.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
            <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#1C2435]">No se encontraron pacientes con registros</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No hay eventos de auditoría que coincidan con los filtros o término de búsqueda aplicados.
            </p>
            {(searchTerm || roleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatientGroups.map((patient) => {
              const expanded = isPatientExpanded(patient.patientKey);
              const initials = patient.patientFullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'P';

              return (
                <div
                  key={patient.patientKey}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  {/* Patient Card Header (Clickable Accordion) */}
                  <div
                    onClick={() => togglePatientExpand(patient.patientKey)}
                    className="p-5 bg-white hover:bg-slate-50/60 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none transition-colors"
                  >
                    {/* Patient identity & meta */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Avatar with Initials */}
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#295EF3] to-[#316F80] text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {initials}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-extrabold text-[#1C2435]">
                            {patient.patientFullName}
                          </h2>
                          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                            DNI: {patient.patientDni}
                          </span>
                          {patient.obraSocial && (
                            <span className="text-[10px] font-bold text-[#316F80] bg-[#316F80]/10 px-2 py-0.5 rounded-full border border-[#316F80]/20 flex items-center gap-1">
                              <Building2 className="h-2.5 w-2.5" />
                              {patient.obraSocial} {patient.obraSocialNumber ? `(${patient.obraSocialNumber})` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-400" />
                            {patient.orderIds.length} {patient.orderIds.length === 1 ? 'solicitud' : 'solicitudes'} ({patient.orderIds.map(id => `#${id}`).join(', ')})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Activity className="h-3 w-3 text-[#295EF3]" />
                            <strong className="text-[#1C2435]">{patient.filteredLogs.length}</strong> {patient.filteredLogs.length === 1 ? 'evento' : 'eventos'}
                          </span>
                          {patient.latestStatus && (
                            <>
                              <span>•</span>
                              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getStatusBadge(patient.latestStatus)}`}>
                                {patient.latestStatus}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side stats & expand chevron */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última actividad</p>
                        <p className="text-xs font-bold text-[#1C2435] flex items-center md:justify-end gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-[#316F80]" />
                          <span>{formatRelativeTime(patient.lastActivityTimestamp)}</span>
                        </p>
                      </div>

                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-[#1C2435]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#1C2435]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content: Chronological Timeline for this patient */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-5 sm:p-6">
                      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {patient.filteredLogs.map((log, idx) => {
                          const userRole = getUserRoleBadge(log.user);

                          return (
                            <div key={idx} className="relative group">
                              {/* Timeline Node Bullet */}
                              <div className="absolute -left-[19px] sm:-left-[23px] top-1 h-3.5 w-3.5 rounded-full bg-white border-2 border-[#295EF3] ring-4 ring-slate-50 group-hover:scale-110 transition-transform" />

                              {/* Event Card */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2.5">
                                {/* Top row: Actor, Action badge, Order ID & Timestamp */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Actor User */}
                                    <span className="font-extrabold text-[#1C2435] flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                                      {userRole.icon}
                                      {log.user}
                                    </span>

                                    {/* Action badge */}
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                                        log.action
                                      )}`}
                                    >
                                      {log.action}
                                    </span>

                                    {/* Order ID Pill */}
                                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      Solicitud #{log.orderId}
                                    </span>
                                  </div>

                                  {/* Timestamp */}
                                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3 text-[#316F80]" />
                                    <span>{formatDate(log.timestamp)}</span>
                                  </div>
                                </div>

                                {/* Event Notes / Details */}
                                {log.notes && (
                                  <div className="bg-slate-50/80 rounded-xl p-3 border-l-2 border-[#295EF3] text-xs text-slate-700">
                                    <p className="italic font-medium leading-relaxed">
                                      "{log.notes}"
                                    </p>
                                  </div>
                                )}

                                {/* Context info (Diagnostic / Medication) if available */}
                                {(log.diagnostic || log.medicationSummary) && (
                                  <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                    {log.diagnostic && (
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                        Diagnóstico: <strong>{log.diagnostic}</strong>
                                      </span>
                                    )}
                                    {log.medicationSummary && (
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                        Medicamentos: <strong>{log.medicationSummary}</strong>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* 4. Global Flat Chronological View */
        filteredFlatLogs.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
            <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#1C2435]">No se encontraron eventos de auditoría</h3>
            <p className="text-xs text-slate-400">Intente modificar los filtros de búsqueda aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredFlatLogs.map((log, index) => {
                const userRole = getUserRoleBadge(log.user);

                return (
                  <div
                    key={index}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* User / Actor */}
                        <span className="font-extrabold text-[#1C2435] flex items-center gap-1.5">
                          {userRole.icon}
                          {log.user}
                        </span>

                        {/* Action badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>

                        {/* Order ID */}
                        <span className="text-[10px] font-mono text-[#1C2435]/70 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                          ID: #{log.orderId}
                        </span>
                      </div>

                      {/* Patient Details */}
                      <p className="text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>Paciente:</span>
                        <strong className="text-[#1C2435]">{log.patientFullName}</strong>
                        <span className="text-slate-400 font-mono text-[11px]">(DNI: {log.patientDni})</span>
                        {log.obraSocial && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {log.obraSocial}
                          </span>
                        )}
                      </p>

                      {/* Notes */}
                      {log.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-150 mt-1">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-left sm:text-right text-[11px] text-slate-400 font-semibold flex items-center gap-1 sm:justify-end">
                      <Clock className="h-3.5 w-3.5 text-[#316F80]" />
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
