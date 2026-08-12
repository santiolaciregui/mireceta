import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Building, RefreshCcw, AlertCircle } from 'lucide-react';
import { Tenant } from '../../../types';

export default function SuperadminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; subdomain?: string }>({});

  const [newName, setNewName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      const data = await res.json();
      if (res.ok) {
        setTenants(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al obtener tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: typeof fieldErrors = {};

    if (!newName.trim()) {
      errors.name = 'El nombre de la institución es obligatorio.';
    }

    const cleanSubdomain = newSubdomain.trim().toLowerCase();
    if (!cleanSubdomain) {
      errors.subdomain = 'El subdominio es obligatorio.';
    } else if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
      errors.subdomain = 'El subdominio solo puede contener letras minúsculas, números y guiones.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      const token = localStorage.getItem('mi-receta-jwt');
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName.trim(), subdomain: cleanSubdomain })
      });
      if (res.ok) {
        setNewName('');
        setNewSubdomain('');
        fetchTenants();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear tenant');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo Tenant
          </h2>
          <form onSubmit={handleCreateTenant} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Institución <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => {
                  setNewName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                }} 
                className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-all outline-hidden ${
                  fieldErrors.name
                    ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                    : 'border border-slate-200 focus:border-[#1661E1]'
                }`}
                placeholder="Ej. Clínica Modelo"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subdominio (único) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  value={newSubdomain} 
                  onChange={e => {
                    setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    if (fieldErrors.subdomain) setFieldErrors(prev => ({ ...prev, subdomain: undefined }));
                  }} 
                  className={`w-full rounded-l-lg px-3 py-2 text-xs font-mono transition-all outline-hidden ${
                    fieldErrors.subdomain
                      ? 'border-2 border-rose-400 bg-rose-50/40 text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                      : 'border border-slate-200 focus:border-[#1661E1]'
                  }`}
                  placeholder="clinicamodelo"
                />
                <span className="bg-slate-50 border-y border-r border-slate-200 text-slate-400 text-xs px-3 py-2 rounded-r-lg whitespace-nowrap">
                  .mireceta.com
                </span>
              </div>
              {fieldErrors.subdomain && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fieldErrors.subdomain}</span>
                </p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full bg-[#1661E1] hover:bg-[#0141BC] text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Crear Tenant
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Building className="h-4 w-4" /> Tenants Registrados
            </h2>
            <button onClick={fetchTenants} className="text-slate-400 hover:text-slate-600 p-1">
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-slate-50/50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Subdominio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t.subdomain || '-'}</td>
                  </tr>
                ))}
                {tenants.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No hay tenants creados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
