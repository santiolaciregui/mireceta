import React, { useState, useMemo } from 'react';
import { MedicalOrder, AuditLogEntry } from '../types';
import { ShieldAlert, Search, Filter, Clock, User } from 'lucide-react';

interface AuditLogViewProps {
  orders: MedicalOrder[];
  currentUser?: any;
}

interface FlatAuditEntry extends AuditLogEntry {
  orderId: string;
  patientName: string;
  patientDni: string;
}

export default function AuditLogView({ orders, currentUser }: AuditLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'medicos' | 'colaboradores' | 'admin'>('all');

  // Consolidate all audit log entries from all orders into a single list
  const allLogs: FlatAuditEntry[] = useMemo(() => {
    const list: FlatAuditEntry[] = [];
    orders.forEach((order) => {
      if (order.auditLog && Array.isArray(order.auditLog)) {
        order.auditLog.forEach((log) => {
          list.push({
            ...log,
            orderId: order.id,
            patientName: `${order.patientName} ${order.patientLastName}`,
            patientDni: order.patientDni,
          });
        });
      }
    });

    // Sort by timestamp descending (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  // Filter logs based on search query and role filter
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchSearch =
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (roleFilter === 'medicos') {
        return log.user.toLowerCase().includes('dr') || log.user.toLowerCase().includes('médico') || log.user.toLowerCase().includes('medico');
      }
      if (roleFilter === 'colaboradores') {
        return log.user.toLowerCase().includes('colaborador') || log.user.toLowerCase().includes('operador');
      }
      if (roleFilter === 'admin') {
        return log.user.toLowerCase().includes('admin') || log.user.toLowerCase().includes('administrador');
      }

      return true;
    });
  }, [allLogs, searchTerm, roleFilter]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' hs';
    } catch {
      return isoString;
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('emitida') || act.includes('aprobada')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('rechazada') || act.includes('inactiva')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('revisión') || act.includes('revision')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('información') || act.includes('informacion')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario, acción o ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({allLogs.length})
            </button>
            <button
              onClick={() => setRoleFilter('medicos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === 'medicos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Médicos
            </button>
            <button
              onClick={() => setRoleFilter('colaboradores')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === 'colaboradores'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Colaboradores
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === 'admin'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Administradores
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No se encontraron eventos de auditoría</p>
          <p className="text-xs text-slate-400">Intente modificar los filtros de búsqueda aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log, index) => (
              <div key={index} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      {log.user}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      ID: {log.orderId}
                    </span>
                  </div>

                  <p className="text-slate-600 font-medium">
                    Paciente: <strong className="text-slate-800">{log.patientName}</strong> (DNI: {log.patientDni})
                  </p>

                  {log.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50/90 p-2 rounded-xl border border-slate-150 mt-1">
                      "{log.notes}"
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right sm:text-right text-[11px] text-slate-400 font-semibold flex items-center gap-1 sm:justify-end">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDate(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
