import React, { useState, useMemo } from 'react';
import { MedicalOrder, AuditLogEntry } from '../../../types';
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
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Phone,
  Mail,
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

  // Selected Patient for Dedicated History View
  const [selectedPatientKey, setSelectedPatientKey] = useState<string | null>(null);
  const [patientDetailSearch, setPatientDetailSearch] = useState('');
  const [patientDetailRoleFilter, setPatientDetailRoleFilter] = useState<'all' | 'medicos' | 'colaboradores' | 'admin' | 'paciente'>('all');

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
  const matchesRoleFilter = (log: EnrichedAuditEntry, filter: string) => {
    if (filter === 'all') return true;
    const userLower = (log.user || '').toLowerCase();
    if (filter === 'medicos') {
      return userLower.includes('dr') || userLower.includes('médico') || userLower.includes('medico');
    }
    if (filter === 'colaboradores') {
      return userLower.includes('colaborador') || userLower.includes('operador');
    }
    if (filter === 'admin') {
      return userLower.includes('admin') || userLower.includes('administrador');
    }
    if (filter === 'paciente') {
      return userLower.includes('paciente') || userLower.includes('autogestión') || userLower.includes('autogestion');
    }
    return true;
  };

  // Filtered Patient Groups
  const filteredPatientGroups = useMemo(() => {
    return patientGroups
      .map((group) => {
        const filteredGroupLogs = group.logs.filter((log) => {
          const passesRole = matchesRoleFilter(log, roleFilter);
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
        return new Date(b.lastActivityTimestamp).getTime() - new Date(a.lastActivityTimestamp).getTime();
      });
  }, [patientGroups, searchTerm, roleFilter, sortBy]);

  // Filtered Flat Logs (for Global Chronological mode)
  const filteredFlatLogs = useMemo(() => {
    return allEnrichedLogs.filter((log) => {
      const passesRole = matchesRoleFilter(log, roleFilter);
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

  // Active selected patient group for Detail View
  const selectedPatientGroup = useMemo(() => {
    if (!selectedPatientKey) return null;
    return patientGroups.find((g) => g.patientKey === selectedPatientKey) || null;
  }, [selectedPatientKey, patientGroups]);

  // Filtered logs for the selected patient detail view
  const selectedPatientFilteredLogs = useMemo(() => {
    if (!selectedPatientGroup) return [];
    return selectedPatientGroup.logs.filter((log) => {
      const passesRole = matchesRoleFilter(log, patientDetailRoleFilter);
      if (!passesRole) return false;

      if (!patientDetailSearch.trim()) return true;

      const q = patientDetailSearch.toLowerCase();
      return (
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.orderId.toLowerCase().includes(q) ||
        (log.notes && log.notes.toLowerCase().includes(q)) ||
        (log.diagnostic && log.diagnostic.toLowerCase().includes(q))
      );
    });
  }, [selectedPatientGroup, patientDetailSearch, patientDetailRoleFilter]);

  // Medical orders belonging to the selected patient
  const selectedPatientOrders = useMemo(() => {
    if (!selectedPatientGroup) return [];
    return orders.filter((o) => {
      const cleanDni = (o.patientDni || '').trim().toLowerCase();
      const cleanName = `${o.patientName || ''} ${o.patientLastName || ''}`.trim().toLowerCase();
      return (
        (cleanDni && cleanDni === selectedPatientGroup.patientKey) ||
        cleanName === selectedPatientGroup.patientKey ||
        selectedPatientGroup.orderIds.includes(o.id)
      );
    });
  }, [orders, selectedPatientGroup]);

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
  };

  // Role icon and styling for user badge
  const getUserRoleBadge = (userName: string) => {
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
  };

  // Status badge styling for order status
  const getStatusBadge = (status?: string) => {
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
  };

  // RENDER DEDICATED PATIENT DETAIL VIEW SCREEN
  if (selectedPatientGroup) {
    const initials = selectedPatientGroup.patientFullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';

    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => {
              setSelectedPatientKey(null);
              setPatientDetailSearch('');
              setPatientDetailRoleFilter('all');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0141BC] font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <ArrowLeft className="h-4 w-4 text-[#0141BC]" />
            <span>Volver a la Auditoría de Pacientes</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Historial</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span>Pacientes</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[#0141BC] font-bold">{selectedPatientGroup.patientFullName}</span>
          </div>
        </div>

        {/* Patient Profile Card Banner */}
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/30 p-6 rounded-3xl border border-slate-250 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Identity */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0141BC] to-[#0F6C7D] text-white font-extrabold text-xl flex items-center justify-center shadow-md shrink-0">
                {initials}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#0141BC]">
                    {selectedPatientGroup.patientFullName}
                  </h1>
                  <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-200 px-3 py-1 rounded-full border border-slate-300">
                    DNI: {selectedPatientGroup.patientDni}
                  </span>
                  {selectedPatientGroup.obraSocial && (
                    <span className="text-xs font-bold text-[#0F6C7D] bg-[#0F6C7D]/10 px-3 py-1 rounded-full border border-[#0F6C7D]/30 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {selectedPatientGroup.obraSocial} {selectedPatientGroup.obraSocialNumber ? `(${selectedPatientGroup.obraSocialNumber})` : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap pt-0.5">
                  {selectedPatientGroup.patientEmail && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {selectedPatientGroup.patientEmail}
                    </span>
                  )}
                  {selectedPatientGroup.patientPhone && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedPatientGroup.patientPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shrink-0">
              <div className="text-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solicitudes</p>
                <p className="text-lg font-extrabold text-[#0141BC] mt-0.5">{selectedPatientGroup.orderIds.length}</p>
              </div>
              <div className="text-center px-2 border-x border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eventos</p>
                <p className="text-lg font-extrabold text-[#0F6C7D] mt-0.5">{selectedPatientGroup.logs.length}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última Act.</p>
                <p className="text-xs font-extrabold text-[#0141BC] mt-1.5 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 text-[#0F6C7D]" />
                  <span>{formatRelativeTime(selectedPatientGroup.lastActivityTimestamp)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Solicitudes Section */}
        {selectedPatientOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0141BC] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1661E1]" />
                <span>Solicitudes Registradas ({selectedPatientOrders.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {selectedPatientOrders.map((ord) => {
                const medList = ord.medicationItems && ord.medicationItems.length > 0
                  ? ord.medicationItems.map((m) => m.nombreComercial).join(', ')
                  : ord.medicationText || 'Trámite de renovación de receta';

                return (
                  <div
                    key={ord.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#0141BC] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        Solicitud #{ord.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadge(ord.status)}`}>
                        {ord.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">
                        {medList}
                      </p>
                      {ord.diagnostic && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Diagnóstico: <strong className="text-slate-700">{ord.diagnostic}</strong>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{formatDate(ord.createdAt)}</span>
                      {ord.obraSocial && (
                        <span className="font-semibold text-[#0F6C7D]">{ord.obraSocial}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Timeline Audit Events for this patient */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold text-[#0141BC] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#1661E1]" />
              <span>Historial Cronológico de Auditoría ({selectedPatientFilteredLogs.length} eventos)</span>
            </h2>

            {/* Local Search & Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={patientDetailSearch}
                  onChange={(e) => setPatientDetailSearch(e.target.value)}
                  placeholder="Buscar en eventos..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#0141BC] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
                />
                {patientDetailSearch && (
                  <button
                    onClick={() => setPatientDetailSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                )}
              </div>

              <select
                value={patientDetailRoleFilter}
                onChange={(e) => setPatientDetailRoleFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#0141BC] focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
              >
                <option value="all">Todos los Roles</option>
                <option value="medicos">Médicos</option>
                <option value="colaboradores">Colaboradores</option>
                <option value="admin">Administradores</option>
                <option value="paciente">Paciente / Autogestión</option>
              </select>
            </div>
          </div>

          {selectedPatientFilteredLogs.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
              <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No se encontraron eventos para este paciente con los filtros actuales.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-250">
                {selectedPatientFilteredLogs.map((log, idx) => {
                  const userRole = getUserRoleBadge(log.user);
                  const isLogEven = idx % 2 === 0;

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Node Bullet */}
                      <div className="absolute -left-[19px] sm:-left-[23px] top-1 h-3.5 w-3.5 rounded-full bg-white border-2 border-[#1661E1] ring-4 ring-slate-100 group-hover:scale-110 transition-transform" />

                      {/* Event Card */}
                      <div className={`p-4 rounded-2xl border shadow-xs transition-all space-y-2.5 ${
                        isLogEven 
                          ? 'bg-white border-slate-250 hover:border-slate-350' 
                          : 'bg-slate-50 border-slate-250 hover:border-slate-350'
                      }`}>
                        {/* Top row: Actor, Action badge, Order ID & Timestamp */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Actor User */}
                            <span className="font-extrabold text-[#0141BC] flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-250">
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
                            <span className="text-[10px] font-mono font-extrabold text-[#0141BC] bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                              Solicitud #{log.orderId}
                            </span>
                          </div>

                          {/* Timestamp */}
                          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3 text-[#0F6C7D]" />
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </div>

                        {/* Event Notes / Details */}
                        {log.notes && (
                          <div className="bg-slate-100/70 rounded-xl p-3 border-l-2 border-[#1661E1] text-xs text-slate-800">
                            <p className="italic font-medium leading-relaxed">
                              "{log.notes}"
                            </p>
                          </div>
                        )}

                        {/* Context info (Diagnostic / Medication) if available */}
                        {(log.diagnostic || log.medicationSummary) && (
                          <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-600 flex-wrap">
                            {log.diagnostic && (
                              <span className="bg-slate-200/60 px-2 py-0.5 rounded text-slate-700 border border-slate-300/60">
                                Diagnóstico: <strong>{log.diagnostic}</strong>
                              </span>
                            )}
                            {log.medicationSummary && (
                              <span className="bg-slate-200/60 px-2 py-0.5 rounded text-slate-700 border border-slate-300/60">
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
      </div>
    );
  }

  // MAIN PATIENTS AUDIT LIST VIEW
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#1661E1]/10 flex items-center justify-center text-[#1661E1] shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pacientes con Registro</p>
            <p className="text-xl font-extrabold text-[#0141BC] mt-0.5">{summaryStats.totalPatients}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#0F6C7D]/10 flex items-center justify-center text-[#0F6C7D] shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eventos de Auditoría</p>
            <p className="text-xl font-extrabold text-[#0141BC] mt-0.5">{summaryStats.totalLogs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#3066C6]/10 flex items-center justify-center text-[#3066C6] shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acciones Médicas</p>
            <p className="text-xl font-extrabold text-[#0141BC] mt-0.5">{summaryStats.totalDoctorEvents}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#0141BC]/10 flex items-center justify-center text-[#0141BC] shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gestión Operativa</p>
            <p className="text-xl font-extrabold text-[#0141BC] mt-0.5">
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
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#0141BC] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
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

          {/* View Mode */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('by_patient')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'by_patient'
                    ? 'bg-white text-[#0141BC] shadow-xs'
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
                    ? 'bg-white text-[#0141BC] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Vista Cronológica</span>
              </button>
            </div>
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
                  ? 'bg-[#0141BC] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todos ({summaryStats.totalLogs})
            </button>
            <button
              onClick={() => setRoleFilter('medicos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                roleFilter === 'medicos'
                  ? 'bg-[#1661E1] text-white shadow-xs'
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
                  ? 'bg-[#0F6C7D] text-white shadow-xs'
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
                  ? 'bg-[#0141BC] text-white shadow-xs'
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
                  ? 'bg-[#3066C6] text-white shadow-xs'
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-[#0141BC] focus:outline-none focus:ring-2 focus:ring-[#1661E1]"
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
            <h3 className="text-base font-extrabold text-[#0141BC]">No se encontraron pacientes con registros</h3>
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
            {filteredPatientGroups.map((patient, index) => {
              const isEven = index % 2 === 0;
              const initials = patient.patientFullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'P';

              return (
                <div
                  key={patient.patientKey}
                  onClick={() => setSelectedPatientKey(patient.patientKey)}
                  className={`rounded-3xl border shadow-xs overflow-hidden transition-all duration-200 cursor-pointer ${
                    isEven 
                      ? 'bg-white border-slate-250 hover:border-[#1661E1]/60 hover:shadow-md' 
                      : 'bg-slate-100/70 border-slate-300 hover:border-[#1661E1]/60 hover:shadow-md'
                  }`}
                >
                  {/* Patient Card Header */}
                  <div
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none transition-colors ${
                      isEven ? 'hover:bg-slate-50/90' : 'hover:bg-slate-100/90'
                    }`}
                  >
                    {/* Patient identity & meta */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Avatar with Initials */}
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#0141BC] to-[#0F6C7D] text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {initials}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-extrabold text-[#0141BC]">
                            {patient.patientFullName}
                          </h2>
                          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-200/80 px-2.5 py-0.5 rounded-full border border-slate-300">
                            DNI: {patient.patientDni}
                          </span>
                          {patient.obraSocial && (
                            <span className="text-[10px] font-bold text-[#0F6C7D] bg-[#0F6C7D]/10 px-2 py-0.5 rounded-full border border-[#0F6C7D]/25 flex items-center gap-1">
                              <Building2 className="h-2.5 w-2.5" />
                              {patient.obraSocial} {patient.obraSocialNumber ? `(${patient.obraSocialNumber})` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-medium flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            {patient.orderIds.length} {patient.orderIds.length === 1 ? 'solicitud' : 'solicitudes'}:
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {patient.orderIds.map((id) => (
                              <span key={id} className="font-mono text-[10px] font-extrabold text-[#0141BC] bg-slate-200/90 px-2 py-0.5 rounded-md border border-slate-300">
                                #{id}
                              </span>
                            ))}
                          </div>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <Activity className="h-3.5 w-3.5 text-[#1661E1]" />
                            <strong className="text-[#0141BC]">{patient.filteredLogs.length}</strong> {patient.filteredLogs.length === 1 ? 'evento' : 'eventos'}
                          </span>
                          {patient.latestStatus && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadge(patient.latestStatus)}`}>
                                {patient.latestStatus}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side stats & Navigate to Patient Detail Button */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Última actividad</p>
                        <p className="text-xs font-bold text-[#0141BC] flex items-center md:justify-end gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-[#0F6C7D]" />
                          <span>{formatRelativeTime(patient.lastActivityTimestamp)}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatientKey(patient.patientKey);
                        }}
                        className="px-3.5 py-2 bg-[#1661E1] hover:bg-[#0141BC] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-98 cursor-pointer shrink-0"
                      >
                        <span>Ver Historial</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
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
            <h3 className="text-base font-extrabold text-[#0141BC]">No se encontraron eventos de auditoría</h3>
            <p className="text-xs text-slate-400">Intente modificar los filtros de búsqueda aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-250 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-150">
              {filteredFlatLogs.map((log, index) => {
                const userRole = getUserRoleBadge(log.user);
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={index}
                    className={`p-4 hover:bg-blue-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isEven ? 'bg-white' : 'bg-slate-50/80'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* User / Actor */}
                        <span className="font-extrabold text-[#0141BC] flex items-center gap-1.5">
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
                        <span className="text-[10px] font-mono font-bold text-[#0141BC] bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                          ID: #{log.orderId}
                        </span>
                      </div>

                      {/* Patient Details */}
                      <p className="text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>Paciente:</span>
                        <strong className="text-[#0141BC]">{log.patientFullName}</strong>
                        <span className="text-slate-500 font-mono text-[11px]">(DNI: {log.patientDni})</span>
                        {log.obraSocial && (
                          <span className="text-[10px] bg-slate-200/70 px-2 py-0.5 rounded text-slate-700 border border-slate-300/60 font-semibold">
                            {log.obraSocial}
                          </span>
                        )}
                      </p>

                      {/* Notes */}
                      {log.notes && (
                        <p className="text-[11px] text-slate-700 italic bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 mt-1">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-left sm:text-right text-[11px] text-slate-500 font-semibold flex items-center gap-1 sm:justify-end">
                      <Clock className="h-3.5 w-3.5 text-[#0F6C7D]" />
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
