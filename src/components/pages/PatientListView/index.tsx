/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MedicalOrder, SystemUser } from '../../../types';
import PatientDetailModal, { PatientRecord } from './PatientDetailModal';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  FileText, 
  Clock, 
  CheckCircle2, 
  Shield, 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  Eye,
  PlusCircle,
  Sparkles,
  Check,
  RotateCcw,
  SlidersHorizontal,
  X,
  UserCheck
} from 'lucide-react';

interface PatientListViewProps {
  orders: MedicalOrder[];
  users: SystemUser[];
  currentUser?: {
    id: string;
    role: string;
    name: string;
    lastName: string;
  };
  onSelectOrder?: (orderId: string) => void;
  onNavigateToChat?: (orderIdOrDni: string) => void;
  onCreateOrderForPatient?: (patientDni: string) => void;
}

export default function PatientListView({
  orders,
  users,
  currentUser,
  onSelectOrder,
  onNavigateToChat,
  onCreateOrderForPatient,
}: PatientListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObraSocialFilter, setSelectedObraSocialFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'Activo' | 'Inactivo'>('all');
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<'all' | 'with_pending' | 'with_completed' | 'no_orders'>('all');
  
  // Sorting state
  type SortField = 'name' | 'dni' | 'obraSocial' | 'orders_count' | 'latest_order';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('latest_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'latest_order' || field === 'orders_count' ? 'desc' : 'asc');
    }
  };

  // Selected patient for modal view
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Unify and aggregate patients list from both `users` and `orders`
  const patientsMap = useMemo(() => {
    const map = new Map<string, PatientRecord>();

    // 1. Add all registered users who are patients (or titular users)
    users.forEach(u => {
      if (u.role === 'paciente' || !u.role) {
        const cleanDni = (u.identifier || '').replace(/\D/g, '');
        if (!cleanDni) return;

        map.set(cleanDni, {
          id: u.id,
          dni: u.identifier || cleanDni,
          name: u.name,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          birthDate: u.birthDate,
          city: u.city,
          province: u.province,
          obraSocial: u.obraSocial,
          obraSocialNumber: u.obraSocialNumber,
          status: u.status || 'Activo',
          dependents: u.dependents || [],
          orders: [],
        });
      }
    });

    // 2. Aggregate orders and create patient entries if they were submitted by guest/operator
    orders.forEach(order => {
      const cleanOrderDni = (order.patientDni || '').replace(/\D/g, '');
      const cleanTitularDni = (order.requestedByTitularDni || '').replace(/\D/g, '');
      
      // Determine primary titular DNI for this order
      const primaryDni = (order.isForDependent && cleanTitularDni) ? cleanTitularDni : cleanOrderDni;
      if (!primaryDni) return;

      let patient = map.get(primaryDni);
      if (!patient) {
        // If not registered as user, create patient record
        const isDep = order.isForDependent && cleanTitularDni;
        patient = {
          id: `PAT-${primaryDni}`,
          dni: isDep ? (order.requestedByTitularDni || primaryDni) : order.patientDni,
          name: isDep ? (order.requestedByTitularName?.split(' ')[0] || order.patientName) : order.patientName,
          lastName: isDep ? (order.requestedByTitularName?.split(' ').slice(1).join(' ') || order.patientLastName) : order.patientLastName,
          email: isDep ? order.requestedByTitularEmail : order.patientEmail,
          phone: isDep ? order.requestedByTitularPhone : order.patientPhone,
          birthDate: isDep ? undefined : order.patientBirthDate,
          city: order.patientCity,
          province: order.patientProvince,
          obraSocial: order.obraSocial,
          obraSocialNumber: order.obraSocialNumber,
          status: 'Activo',
          dependents: [],
          orders: [],
        };
        map.set(primaryDni, patient);
      } else {
        // Complement empty fields from orders if missing on user profile
        if (!patient.phone && (order.requestedByTitularPhone || order.patientPhone)) {
          patient.phone = order.requestedByTitularPhone || order.patientPhone;
        }
        if (!patient.email && (order.requestedByTitularEmail || order.patientEmail)) {
          patient.email = order.requestedByTitularEmail || order.patientEmail;
        }
        if (!patient.obraSocial && order.obraSocial) patient.obraSocial = order.obraSocial;
        if (!patient.obraSocialNumber && order.obraSocialNumber) patient.obraSocialNumber = order.obraSocialNumber;
        if (!patient.birthDate && !order.isForDependent && order.patientBirthDate) patient.birthDate = order.patientBirthDate;
        if (!patient.city && order.patientCity) patient.city = order.patientCity;
        if (!patient.province && order.patientProvince) patient.province = order.patientProvince;
      }

      // If order is for a dependent, also make sure the dependent exists in patient.dependents
      if (order.isForDependent && cleanOrderDni && cleanOrderDni !== primaryDni) {
        const depExists = patient.dependents?.some(d => (d.dni || '').replace(/\D/g, '') === cleanOrderDni);
        if (!depExists) {
          patient.dependents = patient.dependents || [];
          patient.dependents.push({
            id: `DEP-${cleanOrderDni}`,
            dni: order.patientDni,
            name: order.patientName,
            lastName: order.patientLastName,
            birthDate: order.patientBirthDate,
            relationship: order.dependentRelationship || 'Familiar a cargo',
            obraSocial: order.obraSocial,
            obraSocialNumber: order.obraSocialNumber,
            phone: order.patientPhone,
            email: order.patientEmail,
            city: order.patientCity,
            province: order.patientProvince,
          });
        }
      }

      // Add order to patient's orders list if not already present
      if (!patient.orders.some(o => o.id === order.id)) {
        patient.orders.push(order);
      }
    });

    // Sort each patient's orders chronologically (newest first)
    map.forEach(patient => {
      patient.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return map;
  }, [users, orders]);

  const allPatients = useMemo(() => Array.from(patientsMap.values()), [patientsMap]);

  // Extract unique Obra Social list for filter dropdown
  const uniqueObrasSociales = useMemo(() => {
    const set = new Set<string>();
    allPatients.forEach(p => {
      if (p.obraSocial && p.obraSocial.trim()) {
        set.add(p.obraSocial.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [allPatients]);

  // Summary Metrics calculations
  const totalPatientsCount = allPatients.length;
  const patientsWithPendingOrders = allPatients.filter(p => 
    p.orders.some(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Solicita más información')
  ).length;
  const totalCompletedOrdersAcrossPatients = orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;
  const patientsWithDependentsCount = allPatients.filter(p => p.dependents && p.dependents.length > 0).length;

  // Filtered and Sorted Patients
  const processedPatients = useMemo(() => {
    return allPatients
      .filter(p => {
        // Search term match
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const fullName = `${p.name} ${p.lastName}`.toLowerCase();
          const reverseFullName = `${p.lastName} ${p.name}`.toLowerCase();
          const cleanDni = p.dni.replace(/\D/g, '');
          const matchName = fullName.includes(q) || reverseFullName.includes(q);
          const matchDni = p.dni.toLowerCase().includes(q) || cleanDni.includes(q);
          const matchOs = (p.obraSocial || '').toLowerCase().includes(q) || (p.obraSocialNumber || '').toLowerCase().includes(q);
          const matchPhone = (p.phone || '').toLowerCase().includes(q);
          const matchEmail = (p.email || '').toLowerCase().includes(q);

          if (!matchName && !matchDni && !matchOs && !matchPhone && !matchEmail) {
            return false;
          }
        }

        // Obra Social filter
        if (selectedObraSocialFilter !== 'all') {
          if ((p.obraSocial || '').trim() !== selectedObraSocialFilter) {
            return false;
          }
        }

        // Status filter
        if (selectedStatusFilter !== 'all') {
          if (p.status !== selectedStatusFilter) {
            return false;
          }
        }

        // Activity filter
        if (selectedActivityFilter === 'with_pending') {
          const hasPending = p.orders.some(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Solicita más información');
          if (!hasPending) return false;
        } else if (selectedActivityFilter === 'with_completed') {
          const hasCompleted = p.orders.some(o => o.status === 'Emitida' || o.status === 'Enviada');
          if (!hasCompleted) return false;
        } else if (selectedActivityFilter === 'no_orders') {
          if (p.orders.length > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          const nameA = `${a.lastName} ${a.name}`.trim();
          const nameB = `${b.lastName} ${b.name}`.trim();
          const cmp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
          return sortDirection === 'asc' ? cmp : -cmp;
        }
        if (sortField === 'dni') {
          const dniA = parseInt(a.dni.replace(/\D/g, ''), 10) || 0;
          const dniB = parseInt(b.dni.replace(/\D/g, ''), 10) || 0;
          return sortDirection === 'asc' ? dniA - dniB : dniB - dniA;
        }
        if (sortField === 'obraSocial') {
          const osA = a.obraSocial || 'ZZZ';
          const osB = b.obraSocial || 'ZZZ';
          const cmp = osA.localeCompare(osB, 'es', { sensitivity: 'base' });
          return sortDirection === 'asc' ? cmp : -cmp;
        }
        if (sortField === 'orders_count') {
          const diff = a.orders.length - b.orders.length;
          return sortDirection === 'asc' ? diff : -diff;
        }
        if (sortField === 'latest_order') {
          const latestTimeA = a.orders[0] ? new Date(a.orders[0].createdAt).getTime() : 0;
          const latestTimeB = b.orders[0] ? new Date(b.orders[0].createdAt).getTime() : 0;
          if (latestTimeA !== latestTimeB) {
            return sortDirection === 'asc' ? latestTimeA - latestTimeB : latestTimeB - latestTimeA;
          }
          return `${a.lastName} ${a.name}`.localeCompare(`${b.lastName} ${b.name}`, 'es');
        }
        return 0;
      });
  }, [allPatients, searchTerm, selectedObraSocialFilter, selectedStatusFilter, selectedActivityFilter, sortField, sortDirection]);

  const handleOpenPatientDetail = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const formatBirthDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
    } catch {}
    return dateStr;
  };

  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const birth = new Date(dateStr);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 && age < 125 ? age : null;
    } catch {
      return null;
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover/col:opacity-100 group-hover/col:text-slate-600 transition-all ml-1 shrink-0" />
      );
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#1661E1] ml-1 shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#1661E1] ml-1 shrink-0" />
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50">
      
      {/* Header */}
      <header className="px-4 py-4 sm:px-8 sm:py-5 bg-white border-b border-slate-200 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-[#1661E1] rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-[1.45rem] font-[800] tracking-[-0.03em] text-slate-900">
                Padrón y Listado de Pacientes
              </h1>
            </div>
            <p className="text-xs sm:text-[0.82rem] text-slate-500 mt-1">
              Consulta de historias clínicas activas, datos de contacto, coberturas y trazabilidad de solicitudes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {allPatients.length} pacientes registrados
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pacientes</span>
              <Users className="h-4 w-4 text-[#1661E1]" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{totalPatientsCount}</p>
            <p className="text-[10px] text-slate-400 font-medium">Padrón total en el sistema</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Con Pedidos Activos</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600">{patientsWithPendingOrders}</p>
            <p className="text-[10px] text-slate-400 font-medium">En revisión o pendientes</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#14BE99]">Recetas Emitidas</span>
              <CheckCircle2 className="h-4 w-4 text-[#14BE99]" />
            </div>
            <p className="text-2xl font-extrabold text-[#14BE99]">{totalCompletedOrdersAcrossPatients}</p>
            <p className="text-[10px] text-slate-400 font-medium">Firmadas e integradas</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Con Adherentes</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-purple-700">{patientsWithDependentsCount}</p>
            <p className="text-[10px] text-slate-400 font-medium">Familiares a cargo declarados</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por DNI, Nombre, Apellido, Obra Social, Teléfono o Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-[#1661E1] focus:bg-white focus:outline-none placeholder:text-slate-400 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            
            {/* Obra Social Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Cobertura:</span>
              <select
                value={selectedObraSocialFilter}
                onChange={(e) => setSelectedObraSocialFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Todas las Obras Sociales</option>
                {uniqueObrasSociales.map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))}
              </select>
            </div>

            {/* Activity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Trámites:</span>
              <select
                value={selectedActivityFilter}
                onChange={(e) => setSelectedActivityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Todos</option>
                <option value="with_pending">Con solicitudes pendientes</option>
                <option value="with_completed">Con recetas emitidas</option>
                <option value="no_orders">Sin solicitudes</option>
              </select>
            </div>

            {/* Reset Filters button if any filter applied */}
            {(searchTerm || selectedObraSocialFilter !== 'all' || selectedStatusFilter !== 'all' || selectedActivityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedObraSocialFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedActivityFilter('all');
                }}
                className="text-[11px] font-bold text-[#1661E1] hover:underline px-2 py-1 flex items-center gap-1 ml-auto cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restablecer filtros</span>
              </button>
            )}

          </div>

        </div>

        {/* Results Counter Status */}
        <div className="text-[11px] text-slate-500 font-semibold px-1 flex items-center justify-between">
          <span>Mostrando <strong>{processedPatients.length}</strong> de <strong>{allPatients.length}</strong> pacientes</span>
          <span className="text-slate-400 hidden sm:inline">Hacé clic en cualquier paciente para ver su ficha o en los encabezados para ordenar</span>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-2xl border border-slate-250 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-5 cursor-pointer select-none hover:bg-slate-200/70 transition-colors group/col"
                    title="Ordenar por Paciente (Apellido y Nombre)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'name' ? 'text-[#1661E1]' : ''}>Paciente</span>
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dni')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-200/70 transition-colors group/col"
                    title="Ordenar por DNI"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'dni' ? 'text-[#1661E1]' : ''}>DNI / Nacimiento</span>
                      {renderSortIndicator('dni')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('obraSocial')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-200/70 transition-colors group/col"
                    title="Ordenar por Cobertura Médica"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'obraSocial' ? 'text-[#1661E1]' : ''}>Cobertura Médica</span>
                      {renderSortIndicator('obraSocial')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th
                    onClick={() => handleSort('orders_count')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:bg-slate-200/70 transition-colors group/col"
                    title="Ordenar por Cantidad de Solicitudes"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={sortField === 'orders_count' ? 'text-[#1661E1]' : ''}>Solicitudes</span>
                      {renderSortIndicator('orders_count')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('latest_order')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-200/70 transition-colors group/col"
                    title="Ordenar por Fecha de Última Actividad"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={sortField === 'latest_order' ? 'text-[#1661E1]' : ''}>Última Actividad</span>
                      {renderSortIndicator('latest_order')}
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {processedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-medium">
                      No se encontraron pacientes que coincidan con la búsqueda o filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  processedPatients.map((patient, index) => {
                    const isEven = index % 2 === 0;
                    const initials = `${patient.name.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
                    const age = calculateAge(patient.birthDate);
                    const latestOrder = patient.orders[0];
                    const pendingOrders = patient.orders.filter(o => o.status === 'Pendiente' || o.status === 'En revisión' || o.status === 'Solicita más información').length;
                    const completedOrders = patient.orders.filter(o => o.status === 'Emitida' || o.status === 'Enviada').length;

                    return (
                      <tr 
                        key={patient.id || patient.dni}
                        onClick={() => handleOpenPatientDetail(patient)}
                        className={`${isEven ? 'bg-white' : 'bg-slate-50/70'} hover:bg-blue-50/60 transition-colors border-b border-slate-100 cursor-pointer group`}
                      >
                        {/* 1. Name and Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs bg-[#1661E1]/15 text-[#1661E1] group-hover:bg-[#1661E1] group-hover:text-white transition-colors">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-[#1661E1] transition-colors leading-tight">
                                {patient.lastName}, {patient.name}
                              </p>
                              {patient.dependents && patient.dependents.length > 0 && (
                                <div className="mt-0.5">
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200" title={`${patient.dependents.length} familiares a cargo`}>
                                    +{patient.dependents.length} adherentes
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. DNI and Age */}
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          <div className="font-mono font-bold text-slate-800 text-xs">
                            {patient.dni}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatBirthDate(patient.birthDate)} {age !== null ? `(${age} años)` : ''}
                          </div>
                        </td>

                        {/* 3. Health Insurance */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 truncate max-w-[170px]" title={patient.obraSocial}>
                            {patient.obraSocial || 'Particular'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[170px]" title={patient.obraSocialNumber}>
                            {patient.obraSocialNumber ? `Af: ${patient.obraSocialNumber}` : 'Sin número'}
                          </div>
                        </td>

                        {/* 4. Contact */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800">{patient.phone || '—'}</span>
                            {patient.phone && (
                              <a
                                href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Abrir WhatsApp Web"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={patient.email}>
                            {patient.email || '—'}
                          </div>
                        </td>

                        {/* 5. Orders Count & Badges */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs">
                              {patient.orders.length}
                            </span>
                            {pendingOrders > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={`${pendingOrders} órdenes pendientes/en revisión`}>
                                {pendingOrders} pend.
                              </span>
                            )}
                            {completedOrders > 0 && (
                              <span className="text-[10px] font-bold text-[#14BE99] bg-[#14BE99]/10 px-1.5 py-0.5 rounded border border-[#14BE99]/30" title={`${completedOrders} recetas emitidas`}>
                                {completedOrders} emit.
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Last Activity */}
                        <td className="py-3.5 px-4 text-slate-500">
                          {latestOrder ? (
                            <div>
                              <div className="font-bold text-slate-800 text-[11px]">
                                {new Date(latestOrder.createdAt).toLocaleDateString('es-AR')}
                              </div>
                              <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ${
                                latestOrder.status === 'Emitida' || latestOrder.status === 'Enviada'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : latestOrder.status === 'Rechazada'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                              }`}>
                                {latestOrder.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin actividad</span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPatientDetail(patient);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-[#1661E1] text-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer group-hover:bg-[#1661E1] group-hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Ver Ficha</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Patient Detail Modal with full requests list */}
      <PatientDetailModal
        patient={selectedPatient}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPatient(null);
        }}
        onSelectOrder={onSelectOrder}
        onNavigateToChat={onNavigateToChat}
      />

    </div>
  );
}
