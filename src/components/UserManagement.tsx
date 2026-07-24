/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemUser, UserRole } from '../types';
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
  Hash
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

  // Error state
  const [errorMess, setErrorMess] = useState('');

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
    setErrorMess('');
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
    setErrorMess('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess('');

    if (!firstName.trim() || !lastName.trim() || !identifier.trim()) {
      setErrorMess('Por favor, completa los campos requeridos (*).');
      return;
    }

    if ((role === 'colaborador') && !medicoId) {
      setErrorMess('Por favor, asigne un médico al usuario.');
      return;
    }

    const userData: any = {
      name: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || 'sin-correo@suarez.gob.ar',
      role,
      identifier: identifier.trim(),
      status,
      ...( (role === 'colaborador') && medicoId 
            ? { medicoId, medicoName } 
            : {} )
    };

    if (editingUserId) {
      onUpdateUser(editingUserId, userData);
    } else {
      onAddUser(userData);
    }

    setShowModal(false);
  };

  const handleToggleStatus = (user: SystemUser) => {
    onUpdateUser(user.id, {
      status: user.status === 'Activo' ? 'Inactivo' : 'Activo'
    });
  };

  const handleDelete = (user: SystemUser) => {
    setUserToDelete(user);
  };

  // Filtered list
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.name} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-xs">
        
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
          <div className="bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 flex text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-955'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('paciente')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'paciente' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-955'
              }`}
            >
              Pacientes
            </button>
            <button
              onClick={() => setRoleFilter('medico')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'medico' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-955'
              }`}
            >
              Médicos
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-955'
              }`}
            >
              Admin
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer ml-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

      </div>

      {/* Users Count Status */}
      <div className="text-[11px] text-slate-500 font-medium px-1 flex items-center justify-between">
        <span>Mostrando {filteredUsers.length} de {users.length} usuarios registrados</span>
        <span className="text-slate-400">Toca el estado para activarlo o desactivarlo</span>
      </div>

      {/* Grid List - Table Pattern */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Usuario</th>
                <th className="py-4 px-6">Rol</th>
                <th className="py-4 px-6">Identificación</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6 text-center">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const initials = `${user.name.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
                  
                  // Role style config
                  let roleBadgeStyle = '';
                  let roleLabel = '';
                  let avatarBg = '';
                  
                  if (user.role === 'medico') {
                    roleBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    roleLabel = 'Médico';
                    avatarBg = 'bg-emerald-100 text-emerald-800';
                  } else if (user.role === 'admin') {
                    roleBadgeStyle = 'bg-purple-50 text-purple-700 border-purple-100';
                    roleLabel = 'Administrador';
                    avatarBg = 'bg-purple-100 text-purple-800';
                  } else {
                    roleBadgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
                    roleLabel = 'Paciente';
                    avatarBg = 'bg-blue-100 text-blue-800';
                  }

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
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
                        <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                          {roleLabel}
                        </span>
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

      {/* Modern, Simple Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/50 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-650 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
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
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Error Alert */}
              {errorMess && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMess}</span>
                </div>
              )}

              {/* Name and Last Name */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Juan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Pérez"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Rol del Usuario
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('paciente');
                      if (!editingUserId) setIdentifier('');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'paciente'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-50'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Paciente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('medico');
                      if (!editingUserId) setIdentifier('Mat. ');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'medico'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-50'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Médico
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin');
                      if (!editingUserId) setIdentifier('admin.');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-50'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Admin
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('colaborador');
                      if (!editingUserId) setIdentifier('colab.');
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                      role === 'colaborador'
                        ? 'bg-pink-50 text-pink-700 border-pink-300 ring-2 ring-pink-50'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Colab.
                  </button>
                </div>
              </div>

              {(role === 'colaborador') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Médico Asociado *
                  </label>
                  <select
                    value={medicoId}
                    onChange={(e) => {
                      const selected = users.find(u => u.id === e.target.value);
                      setMedicoId(e.target.value);
                      setMedicoName(selected ? `Dr. ${selected.lastName}` : '');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Seleccione un médico</option>
                    {users.filter(u => u.role === 'medico').map(med => (
                      <option key={med.id} value={med.id}>Dr. {med.lastName}, {med.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Identifier (DNI or Matricula) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {role === 'paciente' 
                    ? 'Documento (DNI) *' 
                    : role === 'medico' 
                      ? 'Nro de Matrícula (Mat.) *' 
                      : 'Identificador / Usuario *'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={role === 'paciente' ? 'Ej. 14.283.991' : role === 'medico' ? 'Ej. Mat. 44102' : 'Ej. admin.suarez'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
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
                        ? 'bg-emerald-500 text-white shadow-xs' 
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
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-650 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
              </div>

            </form>
          </div>
         </div>
      )}

      {/* Safe confirmation modal for user deletion */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-205 animate-scaleUp">
            
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-3">
              <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-700 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">¿Eliminar Usuario?</h3>
                <p className="text-[10px] text-slate-500 font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
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
            <div className="px-6 pb-6 pt-2 flex items-center gap-2">
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
