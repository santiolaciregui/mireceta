/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemUser, UserRole } from '../../../types';
import { 
  Users, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  User, 
  Mail, 
  Shield, 
  Search,
  CheckCircle2,
  XCircle,
  Hash,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

interface UserManagementProps {
  users: SystemUser[];
  onAddUser: (user: Omit<SystemUser, 'id'>) => Promise<string> | string;
  onUpdateUser: (userId: string, updates: Partial<SystemUser>) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserManagement({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  
  // Create / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Safe confirmation state
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('paciente');
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>('Activo');
  const [medicoId, setMedicoId] = useState('');
  const [medicoName, setMedicoName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Error state and loading state
  const [errorMess, setErrorMess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    identifier?: string;
    password?: string;
    medicoId?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setEditingUserId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('paciente');
    setIdentifier('');
    setStatus('Activo');
    setMedicoId('');
    setMedicoName('');
    setPassword('');
    setShowPassword(false);
    setErrorMess('');
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUserId(user.id);
    setFirstName(user.name);
    setLastName(user.lastName);
    setEmail(user.email);
    setRole(user.role);
    setIdentifier(user.identifier);
    setStatus(user.status);
    setMedicoId(user.medicoId || '');
    setMedicoName(user.medicoName || '');
    setPassword('');
    setShowPassword(false);
    setErrorMess('');
    setFieldErrors({});
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess('');
    const errors: typeof fieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'El nombre es obligatorio.';
    }

    if (!lastName.trim()) {
      errors.lastName = 'El apellido es obligatorio.';
    }

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      errors.identifier = role === 'paciente' ? 'El DNI es obligatorio.' : role === 'medico' ? 'La matrícula es obligatoria.' : 'El identificador es obligatorio.';
    } else if (role === 'paciente' && (cleanIdentifier.length < 6 || cleanIdentifier.length > 10)) {
      errors.identifier = 'El DNI debe contener entre 6 y 10 dígitos.';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Ingrese un correo electrónico válido o déjelo en blanco.';
    }

    if (!editingUserId && !password.trim()) {
      errors.password = 'Defina la contraseña inicial del nuevo usuario.';
    } else if (password.trim() && password.trim().length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (role === 'colaborador' && !medicoId) {
      errors.medicoId = 'Debe seleccionar el médico responsable asociado.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMess('Por favor corrija los campos marcados en rojo.');
      return;
    }

    setFieldErrors({});

    const userData: any = {
      name: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
      identifier: identifier.trim(),
      status,
      ...(password.trim() ? { password: password.trim() } : {}),
      ...( (role === 'colaborador') && medicoId 
            ? { medicoId, medicoName } 
            : {} )
    };

    setIsSaving(true);
    try {
      if (editingUserId) {
        await onUpdateUser(editingUserId, userData);
      } else {
        await onAddUser(userData);
      }
      setShowModal(false);
    } catch (err: any) {
      setErrorMess(err.message || 'Error al guardar el usuario en el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (user: SystemUser) => {
    onUpdateUser(user.id, {
      status: user.status === 'Activo' ? 'Inactivo' : 'Activo'
    });
  };

  const handleDelete = (user: SystemUser) => {
    setUserToDelete(user);
  };

  // Filtered and alphabetically sorted list (A-Z by name)
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = 
        `${user.name} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      const nameA = `${a.name} ${a.lastName}`.trim();
      const nameB = `${b.name} ${b.lastName}`.trim();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

  return (
    <div className="space-y-6">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 transition-shadow"
          />
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-200/70 p-0.5 rounded-xl border border-slate-300/50 flex text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-950 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('paciente')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'paciente' ? 'bg-white text-[#1661E1] shadow-xs font-bold' : 'text-slate-600 hover:text-[#0141BC]'
              }`}
            >
              Pacientes
            </button>
            <button
              onClick={() => setRoleFilter('medico')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'medico' ? 'bg-white text-[#0F6C7D] shadow-xs font-bold' : 'text-slate-600 hover:text-[#0141BC]'
              }`}
            >
              Médicos
            </button>
            <button
              onClick={() => setRoleFilter('colaborador')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'colaborador' ? 'bg-white text-[#0F6C7D] shadow-xs font-bold' : 'text-slate-600 hover:text-[#0141BC]'
              }`}
            >
              Colaboradores
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white text-[#0141BC] shadow-xs font-bold' : 'text-slate-600 hover:text-[#0141BC]'
              }`}
            >
              Admin
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="bg-[#1661E1] hover:bg-[#0141BC] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer ml-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

      </div>

      {/* Users Count Status */}
      <div className="text-[11px] text-slate-500 font-medium px-1 flex items-center justify-between">
        <span>Mostrando {filteredUsers.length} de {users.length} usuarios registrados (ordenados A-Z)</span>
        <span className="text-slate-400">Toca el estado para activarlo o desactivarlo</span>
      </div>

      {/* Grid List - Table Pattern */}
      <div className="bg-white rounded-2xl border border-slate-250 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                <th className="py-4 px-6">
                  <div className="flex items-center gap-1.5">
                    <span>Usuario</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded tracking-tight normal-case">
                      A-Z
                    </span>
                  </div>
                </th>
                <th className="py-4 px-6">Rol</th>
                <th className="py-4 px-6">Identificación</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6 text-center">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const isEven = index % 2 === 0;
                  const initials = `${user.name.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
                  
                  // Role style config
                  let roleBadgeStyle = '';
                  let roleLabel = '';
                  let avatarBg = '';
                  
                  if (user.role === 'medico') {
                    roleBadgeStyle = 'bg-[#0F6C7D]/10 text-[#0F6C7D] border-[#0F6C7D]/20';
                    roleLabel = 'Médico';
                    avatarBg = 'bg-[#0F6C7D]/15 text-[#0F6C7D]';
                  } else if (user.role === 'admin' || user.role === 'superadmin') {
                    roleBadgeStyle = 'bg-[#0141BC]/10 text-[#0141BC] border-[#0141BC]/20';
                    roleLabel = 'Administrador';
                    avatarBg = 'bg-[#0141BC]/15 text-[#0141BC]';
                  } else if (user.role === 'colaborador' || user.role === 'operador') {
                    roleBadgeStyle = 'bg-[#0F6C7D]/15 text-[#0F6C7D] border-[#0F6C7D]/30';
                    roleLabel = 'Colaborador';
                    avatarBg = 'bg-[#0F6C7D]/20 text-[#0F6C7D]';
                  } else {
                    roleBadgeStyle = 'bg-[#1661E1]/10 text-[#1661E1] border-[#1661E1]/20';
                    roleLabel = 'Paciente';
                    avatarBg = 'bg-[#1661E1]/15 text-[#1661E1]';
                  }

                  return (
                    <tr key={user.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/80'} hover:bg-blue-50/50 transition-colors border-b border-slate-100`}>
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${avatarBg}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {user.name} {user.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                            {roleLabel}
                          </span>
                          {user.role === 'colaborador' && user.medicoName && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {user.medicoName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* DNI or Enrollment */}
                      <td className="py-4 px-6 font-mono text-xs text-slate-600 font-semibold">
                        {user.identifier}
                      </td>

                      {/* Email info */}
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                        {user.email}
                      </td>

                      {/* Active/Inactive Switcher action */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            user.status === 'Activo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-450'}`} />
                          <span>{user.status}</span>
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-550 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar usuario"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-red-550 hover:text-red-750 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/50 animate-scaleUp max-h-[calc(100dvh-2rem)] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-650 px-4 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  {editingUserId ? 'Editar Usuario' : 'Agregar Usuario'}
                </h3>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Completa las credenciales del sistema
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0" noValidate>
              
              {/* Error Alert */}
              {errorMess && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-fadeIn">
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMess}</span>
                </div>
              )}

              {/* Name and Last Name */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: undefined }));
                    }}
                    placeholder="Nombre"
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all outline-hidden ${
                      fieldErrors.firstName
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.firstName}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: undefined }));
                    }}
                    placeholder="Apellido"
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all outline-hidden ${
                      fieldErrors.lastName
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.lastName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="correo@ejemplo.com"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all outline-hidden ${
                    fieldErrors.email
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rol del Usuario
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('paciente');
                      if (!editingUserId) setIdentifier('');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition ${
                      role === 'paciente'
                        ? 'bg-[#1661E1]/10 text-[#1661E1] border-[#1661E1]/40 ring-2 ring-[#1661E1]/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Paciente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('medico');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'medico'
                        ? 'bg-[#0F6C7D]/15 text-[#0F6C7D] border-[#0F6C7D]/40 ring-2 ring-[#0F6C7D]/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Médico
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'bg-[#0141BC]/10 text-[#0141BC] border-[#0141BC]/40 ring-2 ring-[#0141BC]/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Admin
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('colaborador');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'colaborador'
                        ? 'bg-[#0F6C7D]/15 text-[#0F6C7D] border-[#0F6C7D]/40 ring-2 ring-[#0F6C7D]/10'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Colab.
                  </button>
                </div>
              </div>

              {(role === 'colaborador') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Médico Asociado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={medicoId}
                    onChange={(e) => {
                      const selected = users.find(u => u.id === e.target.value);
                      setMedicoId(e.target.value);
                      setMedicoName(selected ? `Dr. ${selected.lastName}` : '');
                      if (fieldErrors.medicoId) setFieldErrors(prev => ({ ...prev, medicoId: undefined }));
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium cursor-pointer outline-hidden ${
                      fieldErrors.medicoId
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-[#1661E1]'
                    }`}
                  >
                    <option value="">Seleccione un médico</option>
                    {users.filter(u => u.role === 'medico').map(med => (
                      <option key={med.id} value={med.id}>Dr. {med.lastName}, {med.name}</option>
                    ))}
                  </select>
                  {fieldErrors.medicoId && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fieldErrors.medicoId}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Identifier (DNI or Matricula) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {role === 'paciente' 
                    ? 'Documento (DNI) *' 
                    : role === 'medico' 
                      ? 'Nro de Matrícula *' 
                      : 'Identificador / Usuario *'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier) setFieldErrors(prev => ({ ...prev, identifier: undefined }));
                  }}
                  placeholder={role === 'paciente' ? 'Número de DNI' : role === 'medico' ? 'Número de matrícula' : 'Nombre de usuario'}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all outline-hidden ${
                    fieldErrors.identifier
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-[#1661E1]'
                  }`}
                />
                {fieldErrors.identifier && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.identifier}</span>
                  </p>
                )}
              </div>

              {/* Password definition for Admin */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUserId 
                    ? 'Nueva Contraseña (Opcional - dejar vacío para conservar)' 
                    : 'Contraseña Inicial (Asignada por Administrador) *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder={editingUserId ? 'Dejar vacío para conservar' : 'Mínimo 6 caracteres'}
                    className={`w-full pl-3 pr-9 py-2 rounded-lg text-xs font-mono transition-all outline-hidden ${
                      fieldErrors.password
                        ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'bg-slate-50 border border-slate-300 focus:ring-1 focus:ring-[#1661E1]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
                {!editingUserId && (role === 'medico' || role === 'colaborador') && !fieldErrors.password && (
                  <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                    Al acceder por primera vez, el profesional o colaborador deberá cambiar obligatoriamente esta contraseña.
                  </span>
                )}
              </div>

              {/* Status toggler */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-600">Estado de la Cuenta</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('Activo')}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                      status === 'Activo' 
                        ? 'bg-[#14BE99] text-white shadow-xs' 
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Inactivo')}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                      status === 'Inactivo' 
                        ? 'bg-slate-400 text-white shadow-xs' 
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}
                  >
                    Inactivo
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-650 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#1661E1] hover:bg-[#0141BC] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Safe confirmation modal for user deletion */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-205 animate-scaleUp max-h-[calc(100dvh-2rem)] flex flex-col">
            
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-700 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">¿Eliminar Usuario?</h3>
                <p className="text-[10px] text-slate-500 font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                ¿Estás seguro que deseas eliminar permanentemente de las bases de datos a:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <p className="font-bold text-slate-800">
                  {userToDelete.name} {userToDelete.lastName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{userToDelete.role.toUpperCase()} — {userToDelete.identifier}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-650 rounded-xl transition-all cursor-pointer"
              >
                No, mantener
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
