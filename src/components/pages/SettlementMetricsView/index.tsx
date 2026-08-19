/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MedicalOrder, SystemUser } from '../../../types';
import {
  TrendingUp,
  Coins,
  Calendar,
  Filter,
  Download,
  Printer,
  Users,
  UserCheck,
  Stethoscope,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  Building2,
  PieChart as PieChartIcon,
  HelpCircle,
  Sliders,
  X,
  Send,
  Check
} from 'lucide-react';

interface SettlementMetricsViewProps {
  orders: MedicalOrder[];
  users: SystemUser[];
  currentUser?: {
    id: string;
    username?: string;
    name: string;
    lastName: string;
    role: string;
    medicoId?: string;
    medicoName?: string;
  } | null;
}

type DatePreset = 'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';
type ActiveTab = 'overview' | 'collaborators' | 'doctors' | 'orders';

export default function SettlementMetricsView({
  orders,
  users = [],
  currentUser
}: SettlementMetricsViewProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  // Professional / Collaborator filter
  // Value can be: 'all', 'doctors_only', 'collaborators_only', 'patient_self', or a specific person name / ID
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  // Status and OS filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedObraSocial, setSelectedObraSocial] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settlement Tariff Settings
  const [collaboratorRate, setCollaboratorRate] = useState<number>(500); // ARS $500 per issued prescription
  const [doctorRate, setDoctorRate] = useState<number>(1500); // ARS $1500 per emitted prescription
  const [settlementBasis, setSettlementBasis] = useState<'emitted' | 'all'>('emitted'); // Basis: only completed prescriptions or all created
  const [showTariffSettings, setShowTariffSettings] = useState<boolean>(false);

  // Detail Modal for specific collaborator or doctor
  const [inspectingPerson, setInspectingPerson] = useState<{
    type: 'collaborator' | 'doctor';
    name: string;
    id?: string;
    rate: number;
  } | null>(null);

  // Quick Date Preset handler
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayPrev.toISOString().split('T')[0]);
      setEndDate(lastDayPrev.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(firstDayYear.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
    }
  };

  // Helper: extract doctor name from an order
  const getOrderDoctorName = (order: MedicalOrder): string => {
    if (order.issuedByDoctorName) return order.issuedByDoctorName;
    if (order.auditLog && order.auditLog.length > 0) {
      // Find audit entry where status was set to Emitida, Enviada, or Aprobada
      const emitEntry = order.auditLog.find(
        (log) =>
          log.action.includes('Emitida') ||
          log.action.includes('Receta adjuntada') ||
          log.action.includes('Aprobada')
      );
      if (emitEntry && emitEntry.user && !emitEntry.user.includes('Sistema') && !emitEntry.user.includes('Paciente')) {
        return emitEntry.user.replace(/\(.*\)/, '').trim();
      }
    }
    if (order.lastConsultationDoctor) return order.lastConsultationDoctor;
    return 'Sin médico asignado';
  };

  // Helper: extract collaborator name from an order
  const getOrderCollaboratorName = (order: MedicalOrder): string => {
    if (order.createdByOperatorName) return order.createdByOperatorName;
    if (order.auditLog && order.auditLog.length > 0) {
      const createEntry = order.auditLog.find((log) => log.action === 'Creada');
      if (createEntry && createEntry.user && !createEntry.user.includes('Paciente')) {
        return createEntry.user;
      }
    }
    return 'Paciente (Autogestión)';
  };

  // List of distinct doctors from users and orders
  const doctorsList = useMemo(() => {
    const fromUsers = users
      .filter((u) => u.role === 'medico' && u.status === 'Activo')
      .map((u) => `${u.name} ${u.lastName}`.trim());

    const fromOrders = orders
      .map((o) => getOrderDoctorName(o))
      .filter((name) => name && name !== 'Sin médico asignado');

    return Array.from(new Set([...fromUsers, ...fromOrders])).sort();
  }, [users, orders]);

  // List of distinct collaborators from users and orders
  const collaboratorsList = useMemo(() => {
    const fromUsers = users
      .filter((u) => u.role === 'colaborador' && u.status === 'Activo')
      .map((u) => `${u.name} ${u.lastName}`.trim());

    const fromOrders = orders
      .map((o) => getOrderCollaboratorName(o))
      .filter((name) => name && name !== 'Paciente (Autogestión)');

    return Array.from(new Set([...fromUsers, ...fromOrders])).sort();
  }, [users, orders]);

  // Unique Obras Sociales in orders
  const obrasSocialesList = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.obraSocial).filter(Boolean))).sort();
  }, [orders]);

  // 1. FILTER ORDERS BY DATE, PROFESSIONAL, STATUS, OBRA SOCIAL & SEARCH QUERY
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Date Filter
      if (startDate) {
        const orderDate = order.createdAt ? order.createdAt.split('T')[0] : '';
        if (orderDate && orderDate < startDate) return false;
      }
      if (endDate) {
        const orderDate = order.createdAt ? order.createdAt.split('T')[0] : '';
        if (orderDate && orderDate > endDate) return false;
      }

      // 2. Professional Filter
      const docName = getOrderDoctorName(order);
      const colabName = getOrderCollaboratorName(order);

      if (selectedProfessional === 'doctors_only') {
        if (docName === 'Sin médico asignado') return false;
      } else if (selectedProfessional === 'collaborators_only') {
        if (colabName === 'Paciente (Autogestión)') return false;
      } else if (selectedProfessional === 'patient_self') {
        if (colabName !== 'Paciente (Autogestión)') return false;
      } else if (selectedProfessional.startsWith('doc:')) {
        const targetDoc = selectedProfessional.replace('doc:', '');
        if (docName !== targetDoc) return false;
      } else if (selectedProfessional.startsWith('colab:')) {
        const targetColab = selectedProfessional.replace('colab:', '');
        if (colabName !== targetColab) return false;
      }

      // 3. Status Filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'emitidas' && order.status !== 'Emitida' && order.status !== 'Enviada') return false;
        if (selectedStatus === 'revision' && order.status !== 'En revisión' && order.status !== 'Aprobada' && order.status !== 'Solicita más información') return false;
        if (selectedStatus === 'pendientes' && order.status !== 'Pendiente') return false;
        if (selectedStatus === 'rechazadas' && order.status !== 'Rechazada') return false;
      }

      // 4. Obra Social Filter
      if (selectedObraSocial !== 'all' && order.obraSocial !== selectedObraSocial) {
        return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patientFull = `${order.patientName || ''} ${order.patientLastName || ''}`.toLowerCase();
        const dni = (order.patientDni || '').toLowerCase();
        const id = (order.id || '').toLowerCase();
        const med = (order.medicationText || '').toLowerCase();
        const os = (order.obraSocial || '').toLowerCase();
        const doc = docName.toLowerCase();
        const colab = colabName.toLowerCase();

        const matches =
          patientFull.includes(q) ||
          dni.includes(q) ||
          id.includes(q) ||
          med.includes(q) ||
          os.includes(q) ||
          doc.includes(q) ||
          colab.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, selectedProfessional, selectedStatus, selectedObraSocial, searchQuery]);

  // 2. AGGREGATED METRICS & KPIS
  const metrics = useMemo(() => {
    const totalGenerated = filteredOrders.length;
    const emittedCount = filteredOrders.filter((o) => o.status === 'Emitida' || o.status === 'Enviada').length;
    const inRevisionCount = filteredOrders.filter(
      (o) => o.status === 'En revisión' || o.status === 'Aprobada' || o.status === 'Solicita más información'
    ).length;
    const pendingCount = filteredOrders.filter((o) => o.status === 'Pendiente').length;
    const rejectedCount = filteredOrders.filter((o) => o.status === 'Rechazada').length;

    const effectivenessRate = totalGenerated > 0 ? Math.round((emittedCount / totalGenerated) * 100) : 0;

    // Financial calculations
    const approvedPayments = filteredOrders.filter((o) => o.paymentStatus === 'approved');
    const totalCollected = approvedPayments.reduce((acc, o) => {
      const amt = parseFloat(o.paymentAmount || '0') || 0;
      return acc + amt;
    }, 0);

    const exemptCount = filteredOrders.filter(
      (o) => o.paymentStatus === 'exempt' || o.obraSocial === 'PAMI (Inssjp)' || String(o.paymentAmount) === '0'
    ).length;

    // Settlement calculations
    // Collaborator payouts
    let totalCollaboratorPayout = 0;
    const collaboratorStatsMap: Record<
      string,
      {
        name: string;
        assignedDoctor?: string;
        totalCreated: number;
        emittedCount: number;
        inProcessCount: number;
        rejectedCount: number;
        payout: number;
      }
    > = {};

    collaboratorsList.forEach((colab) => {
      collaboratorStatsMap[colab] = {
        name: colab,
        totalCreated: 0,
        emittedCount: 0,
        inProcessCount: 0,
        rejectedCount: 0,
        payout: 0
      };
    });

    // Doctor payouts
    let totalDoctorPayout = 0;
    const doctorStatsMap: Record<
      string,
      {
        name: string;
        linkedCollaborators: string[];
        totalEmitted: number;
        inProcessCount: number;
        rejectedCount: number;
        totalCollected: number;
        payout: number;
      }
    > = {};

    doctorsList.forEach((doc) => {
      doctorStatsMap[doc] = {
        name: doc,
        linkedCollaborators: [],
        totalEmitted: 0,
        inProcessCount: 0,
        rejectedCount: 0,
        totalCollected: 0,
        payout: 0
      };
    });

    // Populate stats from filtered orders
    filteredOrders.forEach((order) => {
      const colabName = getOrderCollaboratorName(order);
      const docName = getOrderDoctorName(order);
      const isEmitted = order.status === 'Emitida' || order.status === 'Enviada';
      const isInProcess = order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información';
      const isRejected = order.status === 'Rechazada';
      const orderAmount = order.paymentStatus === 'approved' ? parseFloat(order.paymentAmount || '0') || 0 : 0;

      // Collaborator entry
      if (colabName !== 'Paciente (Autogestión)') {
        if (!collaboratorStatsMap[colabName]) {
          collaboratorStatsMap[colabName] = {
            name: colabName,
            totalCreated: 0,
            emittedCount: 0,
            inProcessCount: 0,
            rejectedCount: 0,
            payout: 0
          };
        }
        const cStat = collaboratorStatsMap[colabName];
        cStat.totalCreated += 1;
        if (isEmitted) cStat.emittedCount += 1;
        if (isInProcess) cStat.inProcessCount += 1;
        if (isRejected) cStat.rejectedCount += 1;
      }

      // Doctor entry
      if (docName !== 'Sin médico asignado') {
        if (!doctorStatsMap[docName]) {
          doctorStatsMap[docName] = {
            name: docName,
            linkedCollaborators: [],
            totalEmitted: 0,
            inProcessCount: 0,
            rejectedCount: 0,
            totalCollected: 0,
            payout: 0
          };
        }
        const dStat = doctorStatsMap[docName];
        if (isEmitted) dStat.totalEmitted += 1;
        if (isInProcess) dStat.inProcessCount += 1;
        if (isRejected) dStat.rejectedCount += 1;
        dStat.totalCollected += orderAmount;
        if (colabName !== 'Paciente (Autogestión)' && !dStat.linkedCollaborators.includes(colabName)) {
          dStat.linkedCollaborators.push(colabName);
        }
      }
    });

    // Compute payouts based on tariff configuration
    Object.values(collaboratorStatsMap).forEach((c) => {
      const units = settlementBasis === 'emitted' ? c.emittedCount : c.totalCreated;
      c.payout = units * collaboratorRate;
      totalCollaboratorPayout += c.payout;
    });

    Object.values(doctorStatsMap).forEach((d) => {
      d.payout = d.totalEmitted * doctorRate;
      totalDoctorPayout += d.payout;
    });

    // Obra social distribution
    const osCountMap: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const os = o.obraSocial || 'Particular';
      osCountMap[os] = (osCountMap[os] || 0) + 1;
    });
    const osDistribution = Object.entries(osCountMap)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (totalGenerated || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    // Medication breakdown
    const medicationCountMap: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      if (o.medicationItems && o.medicationItems.length > 0) {
        o.medicationItems.forEach((item) => {
          const medName = item.nombreComercial || item.droga || 'Sin especificar';
          medicationCountMap[medName] = (medicationCountMap[medName] || 0) + (item.cantidadCajas || 1);
        });
      } else if (o.medicationText) {
        const text = o.medicationText.split('\n')[0].substring(0, 40);
        medicationCountMap[text] = (medicationCountMap[text] || 0) + 1;
      }
    });
    const topMedications = Object.entries(medicationCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Delivery channels
    const whatsappCount = filteredOrders.filter((o) => o.deliveryMethod === 'whatsapp' || (!o.deliveryMethod && o.patientPhone)).length;
    const emailCount = filteredOrders.filter((o) => o.deliveryMethod === 'email').length;
    const bothCount = filteredOrders.filter((o) => o.deliveryMethod === 'both').length;

    return {
      totalGenerated,
      emittedCount,
      inRevisionCount,
      pendingCount,
      rejectedCount,
      effectivenessRate,
      totalCollected,
      approvedPaymentsCount: approvedPayments.length,
      exemptCount,
      totalCollaboratorPayout,
      totalDoctorPayout,
      totalSettlement: totalCollaboratorPayout + totalDoctorPayout,
      collaboratorStats: Object.values(collaboratorStatsMap).sort((a, b) => b.totalCreated - a.totalCreated),
      doctorStats: Object.values(doctorStatsMap).sort((a, b) => b.totalEmitted - a.totalEmitted),
      osDistribution,
      topMedications,
      deliveryChannels: {
        whatsapp: whatsappCount,
        email: emailCount,
        both: bothCount
      }
    };
  }, [filteredOrders, collaboratorsList, doctorsList, collaboratorRate, doctorRate, settlementBasis]);

  // Export filtered dataset to CSV
  const handleExportCsv = () => {
    const headers = [
      'ID Receta',
      'Fecha Creacion',
      'Paciente',
      'DNI',
      'Obra Social',
      'Medicamento',
      'Colaborador / Creador',
      'Medico Evaluador',
      'Estado Receta',
      'Estado de Pago',
      'Monto Abonado'
    ];

    const rows = filteredOrders.map((o) => [
      o.id,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-AR') : '',
      `"${o.patientName || ''} ${o.patientLastName || ''}"`,
      o.patientDni || '',
      `"${o.obraSocial || ''}"`,
      `"${(o.medicationText || '').replace(/"/g, '""')}"`,
      `"${getOrderCollaboratorName(o)}"`,
      `"${getOrderDoctorName(o)}"`,
      o.status,
      o.paymentStatus || 'pending',
      o.paymentAmount || '0'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `liquidaciones_recetas_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inspecting modal orders list
  const inspectingPersonOrders = useMemo(() => {
    if (!inspectingPerson) return [];
    return filteredOrders.filter((order) => {
      if (inspectingPerson.type === 'collaborator') {
        return getOrderCollaboratorName(order) === inspectingPerson.name;
      } else {
        return getOrderDoctorName(order) === inspectingPerson.name;
      }
    });
  }, [inspectingPerson, filteredOrders]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      {/* 1. TOP HEADER & GLOBAL ACTIONS */}
      <header className="px-4 sm:px-6 py-4 sm:py-5 bg-white border-b border-slate-200/80 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-xs shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Liquidaciones y Métricas
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'receta' : 'recetas'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Auditoría de recetas generadas, rendimiento por profesional y liquidación de honorarios.
              </p>
            </div>
          </div>
        </div>

        {/* Global actions: Settings, Export CSV & Print */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Tariff Settings Button */}
          <button
            onClick={() => setShowTariffSettings(!showTariffSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Configurar tarifas de liquidación"
          >
            <Sliders className="h-4 w-4 text-slate-500" />
            <span>Tarifas (${collaboratorRate}/${doctorRate})</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Liquidación</span>
          </button>
        </div>
      </header>

      {/* TARIFF SETTINGS COLLAPSIBLE POPOVER */}
      {showTariffSettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border-b border-blue-200 px-4 sm:px-6 py-4 animate-fadeIn">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
              <Coins className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <span>
                <strong>Configuración de Aranceles:</strong> Los importes se recalculan en tiempo real para todos los colaboradores y médicos.
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Tarifa Colaborador ($/receta):</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={collaboratorRate}
                  onChange={(e) => setCollaboratorRate(Math.max(0, Number(e.target.value)))}
                  className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Tarifa Médico ($/receta emitida):</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={doctorRate}
                  onChange={(e) => setDoctorRate(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Base Colaborador:</label>
                <select
                  value={settlementBasis}
                  onChange={(e) => setSettlementBasis(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="emitted">Solo Emitidas</option>
                  <option value="all">Todas las Creadas</option>
                </select>
              </div>

              <button
                onClick={() => setShowTariffSettings(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADVANCED FILTER BAR */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shrink-0 shadow-2xs space-y-3">
        {/* Row 1: Date presets & date picker */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="h-3.5 w-3.5" /> Período:
            </span>
            {[
              { id: 'today', label: 'Hoy' },
              { id: '7days', label: 'Últimos 7 días' },
              { id: 'this_month', label: 'Este Mes' },
              { id: 'last_month', label: 'Mes Anterior' },
              { id: 'this_year', label: 'Año Actual' },
              { id: 'all', label: 'Histórico' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as DatePreset)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span>Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Professional, Status, Obra Social and Text Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          {/* Professional Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Colaborador / Médico:
            </label>
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="all">Todos los profesionales y operadores</option>
              <optgroup label="Grupos">
                <option value="doctors_only">Solo Médicos</option>
                <option value="collaborators_only">Solo Colaboradores</option>
                <option value="patient_self">Autogestión Pacientes</option>
              </optgroup>
              {doctorsList.length > 0 && (
                <optgroup label="Médicos">
                  {doctorsList.map((doc) => (
                    <option key={`doc:${doc}`} value={`doc:${doc}`}>
                      Dr/a. {doc}
                    </option>
                  ))}
                </optgroup>
              )}
              {collaboratorsList.length > 0 && (
                <optgroup label="Colaboradores">
                  {collaboratorsList.map((colab) => (
                    <option key={`colab:${colab}`} value={`colab:${colab}`}>
                      {colab}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Estado de Receta:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="all">Todos los estados</option>
              <option value="emitidas">Emitidas / Enviadas</option>
              <option value="revision">En Revisión / Aprobadas</option>
              <option value="pendientes">Pendientes</option>
              <option value="rechazadas">Rechazadas</option>
            </select>
          </div>

          {/* Obra Social Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Obra Social / Cobertura:
            </label>
            <select
              value={selectedObraSocial}
              onChange={(e) => setSelectedObraSocial(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="all">Todas las coberturas</option>
              {obrasSocialesList.map((os) => (
                <option key={os} value={os}>
                  {os}
                </option>
              ))}
            </select>
          </div>

          {/* Live Search */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Búsqueda Rápida:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Paciente, DNI, ID, medicación..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center gap-1 shrink-0 overflow-x-auto">
        {[
          { id: 'overview', label: 'Resumen & Métricas', icon: Activity },
          {
            id: 'collaborators',
            label: 'Liquidación por Colaborador',
            icon: Users,
            badge: metrics.collaboratorStats.length
          },
          {
            id: 'doctors',
            label: 'Liquidación por Médico',
            icon: Stethoscope,
            badge: metrics.doctorStats.length
          },
          {
            id: 'orders',
            label: 'Detalle Auditable de Recetas',
            icon: FileText,
            badge: filteredOrders.length
          }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT VIEW */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI SUMMARY METRIC CARDS (Always visible for fast reference) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Generadas */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recetas Generadas</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{metrics.totalGenerated}</div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                <span className="text-emerald-600 font-bold">{metrics.emittedCount} emitidas</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{metrics.inRevisionCount + metrics.pendingCount} en trámite</span>
              </div>
            </div>
          </div>

          {/* Card 2: Recetas Emitidas & Efectividad */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Efectividad de Emisión</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{metrics.effectivenessRate}%</div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                <span className="text-emerald-600 font-bold">{metrics.emittedCount} finalizadas</span>
                {metrics.rejectedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 font-bold">{metrics.rejectedCount} rechazadas</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Total Honorarios a Liquidar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total a Liquidar</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                ${metrics.totalSettlement.toLocaleString('es-AR')}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                <span className="text-blue-700 font-bold">Médicos: ${metrics.totalDoctorPayout.toLocaleString('es-AR')}</span>
                <span>•</span>
                <span className="text-purple-700 font-bold">Colab: ${metrics.totalCollaboratorPayout.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Recaudación Total de Pacientes */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recaudación Aranceles</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                ${metrics.totalCollected.toLocaleString('es-AR')}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                <span className="text-emerald-700 font-bold">{metrics.approvedPaymentsCount} cobros MP</span>
                <span>•</span>
                <span className="text-slate-500 font-bold">{metrics.exemptCount} exentos</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & INSIGHTS                           */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Obras Sociales Breakdown */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" /> Distribución por Obra Social
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">{metrics.osDistribution.length} distintas</span>
                </div>

                <div className="space-y-3.5 pt-2">
                  {metrics.osDistribution.slice(0, 6).map((os) => (
                    <div key={os.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{os.name}</span>
                        <span className="text-slate-500 font-bold">
                          {os.count} ({os.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, os.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {metrics.osDistribution.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No hay datos en el período seleccionado.</p>
                  )}
                </div>
              </div>

              {/* Top Medications */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Medicamentos Frecuentes
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">Top prescriptos</span>
                </div>

                <div className="space-y-3 pt-2">
                  {metrics.topMedications.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{med.name}</span>
                      </div>
                      <span className="bg-white border border-slate-200 font-extrabold text-slate-700 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                        {med.count} {med.count === 1 ? 'u.' : 'u.'}
                      </span>
                    </div>
                  ))}
                  {metrics.topMedications.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No hay registros de medicación.</p>
                  )}
                </div>
              </div>

              {/* Delivery Channels & Performance */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-600" /> Canales de Entrega
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">Notificaciones</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        WA
                      </div>
                      <div>
                        <p className="font-bold text-emerald-950">WhatsApp Directo</p>
                        <p className="text-[11px] text-emerald-700">Enlace instantáneo</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-900">{metrics.deliveryChannels.whatsapp}</span>
                  </div>

                  <div className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        EM
                      </div>
                      <div>
                        <p className="font-bold text-blue-950">Correo Electrónico</p>
                        <p className="text-[11px] text-blue-700">PDF adjunto</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-blue-900">{metrics.deliveryChannels.email}</span>
                  </div>

                  <div className="p-3.5 bg-purple-50/50 border border-purple-200/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        2x
                      </div>
                      <div>
                        <p className="font-bold text-purple-950">Ambos Canales</p>
                        <p className="text-[11px] text-purple-700">Omnicanalidad</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-purple-900">{metrics.deliveryChannels.both}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick overview of top performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Collaborators Preview */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" /> Resumen Colaboradores
                  </h3>
                  <button
                    onClick={() => setActiveTab('collaborators')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    Ver todos ({metrics.collaboratorStats.length}) <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {metrics.collaboratorStats.slice(0, 4).map((c) => (
                    <div key={c.name} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.totalCreated} cargadas • <span className="text-emerald-600 font-bold">{c.emittedCount} emitidas</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">${c.payout.toLocaleString('es-AR')}</p>
                        <span className="text-[10px] text-slate-400 font-medium">A liquidar</span>
                      </div>
                    </div>
                  ))}
                  {metrics.collaboratorStats.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No hay datos de colaboradores en este período.</p>
                  )}
                </div>
              </div>

              {/* Top Doctors Preview */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-indigo-600" /> Resumen Médicos Auditores
                  </h3>
                  <button
                    onClick={() => setActiveTab('doctors')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    Ver todos ({metrics.doctorStats.length}) <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {metrics.doctorStats.slice(0, 4).map((d) => (
                    <div key={d.name} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Dr/a. {d.name}</p>
                        <p className="text-[11px] text-slate-500">
                          <span className="text-emerald-600 font-bold">{d.totalEmitted} recetas firmadas</span> • {d.inProcessCount} en revisión
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">${d.payout.toLocaleString('es-AR')}</p>
                        <span className="text-[10px] text-slate-400 font-medium">Honorarios</span>
                      </div>
                    </div>
                  ))}
                  {metrics.doctorStats.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No hay datos de médicos en este período.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: COLLABORATORS SETTLEMENT                      */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'collaborators' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" /> Liquidación de Honorarios por Colaborador
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tarifa aplicada: <strong>${collaboratorRate} ARS</strong> por receta{' '}
                    {settlementBasis === 'emitted' ? 'emitida/aprobada' : 'creada'}.
                  </p>
                </div>

                <div className="text-right bg-blue-50/70 border border-blue-200/60 rounded-xl px-4 py-2">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Total a Liquidar Colaboradores</span>
                  <span className="text-base font-black text-blue-900">
                    ${metrics.totalCollaboratorPayout.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4 rounded-l-xl">Colaborador</th>
                      <th className="py-3 px-3 text-center">Cargadas</th>
                      <th className="py-3 px-3 text-center">Emitidas</th>
                      <th className="py-3 px-3 text-center">En Trámite</th>
                      <th className="py-3 px-3 text-center">Rechazadas</th>
                      <th className="py-3 px-3 text-center">Efectividad</th>
                      <th className="py-3 px-3 text-right">Tarifa</th>
                      <th className="py-3 px-4 text-right">Total a Liquidar</th>
                      <th className="py-3 px-3 text-center rounded-r-xl">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {metrics.collaboratorStats.map((c) => {
                      const eff = c.totalCreated > 0 ? Math.round((c.emittedCount / c.totalCreated) * 100) : 0;
                      return (
                        <tr key={c.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <p className="text-[10px] text-slate-400">Operador / Secretaria</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-800">{c.totalCreated}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-600">{c.emittedCount}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600">{c.inProcessCount}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-rose-600">{c.rejectedCount}</td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {eff}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-500 font-mono">${collaboratorRate}</td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                            ${c.payout.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() =>
                                setInspectingPerson({
                                  type: 'collaborator',
                                  name: c.name,
                                  rate: collaboratorRate
                                })
                              }
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Ver Recetas
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {metrics.collaboratorStats.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                          No se encontraron colaboradores con actividad en el período seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: DOCTORS SETTLEMENT                            */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-indigo-600" /> Liquidación de Honorarios por Médico Auditor
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tarifa aplicada: <strong>${doctorRate} ARS</strong> por receta médica emitida / firmada.
                  </p>
                </div>

                <div className="text-right bg-indigo-50/70 border border-indigo-200/60 rounded-xl px-4 py-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total Honorarios Médicos</span>
                  <span className="text-base font-black text-indigo-900">
                    ${metrics.totalDoctorPayout.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4 rounded-l-xl">Médico / Profesional</th>
                      <th className="py-3 px-3 text-center">Emitidas / Firmadas</th>
                      <th className="py-3 px-3 text-center">En Revisión</th>
                      <th className="py-3 px-3 text-center">Rechazadas</th>
                      <th className="py-3 px-3 text-right">Recaudación Generada</th>
                      <th className="py-3 px-3 text-right">Arancel Médico</th>
                      <th className="py-3 px-4 text-right">Honorarios a Liquidar</th>
                      <th className="py-3 px-3 text-center rounded-r-xl">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {metrics.doctorStats.map((d) => (
                      <tr key={d.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                              {d.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">Dr/a. {d.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {d.linkedCollaborators.length > 0
                                  ? `Colaboradores: ${d.linkedCollaborators.join(', ')}`
                                  : 'Firma directa'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-emerald-600">{d.totalEmitted}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-amber-600">{d.inProcessCount}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-rose-600">{d.rejectedCount}</td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700 font-mono">
                          ${d.totalCollected.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-500 font-mono">${doctorRate}</td>
                        <td className="py-3.5 px-4 text-right font-black text-indigo-900 text-sm">
                          ${d.payout.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() =>
                              setInspectingPerson({
                                type: 'doctor',
                                name: d.name,
                                rate: doctorRate
                              })
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Ver Recetas
                          </button>
                        </td>
                      </tr>
                    ))}
                    {metrics.doctorStats.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No se encontraron médicos con actividad en el período seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: COMPLETE AUDITABLE ORDERS LIST                */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Listado Auditable de Recetas</h3>
                  <p className="text-xs text-slate-500">
                    Mostrando {filteredOrders.length} trámites correspondientes a los filtros actuales.
                  </p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 self-start sm:self-auto cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Exportar esta vista
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px] bg-slate-50/60">
                      <th className="py-3 px-3 rounded-l-xl">ID</th>
                      <th className="py-3 px-3">Fecha</th>
                      <th className="py-3 px-3">Paciente & DNI</th>
                      <th className="py-3 px-3">Obra Social</th>
                      <th className="py-3 px-3">Medicación</th>
                      <th className="py-3 px-3">Colaborador</th>
                      <th className="py-3 px-3">Médico</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-3 text-right rounded-r-xl">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOrders.map((o) => {
                      const doc = getOrderDoctorName(o);
                      const colab = getOrderCollaboratorName(o);
                      const isApproved = o.paymentStatus === 'approved';
                      const isExempt = o.paymentStatus === 'exempt' || o.obraSocial === 'PAMI (Inssjp)';

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-blue-600 text-[11px]">{o.id}</td>
                          <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-AR') : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">
                              {o.patientName} {o.patientLastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{o.patientDni}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-semibold">{o.obraSocial}</td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-600" title={o.medicationText}>
                            {o.medicationText || 'Ver adjuntos'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium text-[11px]">{colab}</td>
                          <td className="py-3 px-3 text-slate-600 font-medium text-[11px]">{doc}</td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === 'Emitida' || o.status === 'Enviada'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'En revisión' || o.status === 'Aprobada'
                                  ? 'bg-blue-100 text-blue-800'
                                  : o.status === 'Rechazada'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`text-[11px] font-bold ${
                                isApproved
                                  ? 'text-emerald-700'
                                  : isExempt
                                  ? 'text-slate-500'
                                  : 'text-amber-700'
                              }`}
                            >
                              ${o.paymentAmount || '0'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                          No se encontraron recetas con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. INDIVIDUAL PERSON INSPECTING DETAIL MODAL */}
      {inspectingPerson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                  {inspectingPerson.type === 'collaborator' ? (
                    <Users className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Stethoscope className="h-5 w-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    Detalle de Liquidación: {inspectingPerson.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300">
                    {inspectingPerson.type === 'collaborator' ? 'Colaborador / Operador' : 'Médico Auditor'} • Tarifa:${' '}
                    {inspectingPerson.rate} p/receta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingPerson(null)}
                className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 sm:gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <span>
                  Total Trámites: <strong>{inspectingPersonOrders.length}</strong>
                </span>
                <span>
                  Emitidas:{' '}
                  <strong className="text-emerald-700">
                    {inspectingPersonOrders.filter((o) => o.status === 'Emitida' || o.status === 'Enviada').length}
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-bold mr-2">Total a Liquidar:</span>
                <span className="text-base font-black text-slate-900">
                  $
                  {(
                    (settlementBasis === 'emitted' && inspectingPerson.type === 'collaborator'
                      ? inspectingPersonOrders.filter((o) => o.status === 'Emitida' || o.status === 'Enviada').length
                      : inspectingPersonOrders.length) * inspectingPerson.rate
                  ).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Order rows */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Obra Social</th>
                      <th className="py-2.5 px-3">Medicación</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inspectingPersonOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{order.id}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR') : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {order.patientName} {order.patientLastName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{order.obraSocial}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">{order.medicationText}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'Emitida' || order.status === 'Enviada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setInspectingPerson(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
