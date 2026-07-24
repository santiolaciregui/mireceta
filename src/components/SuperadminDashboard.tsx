import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Building, RefreshCcw } from 'lucide-react';
import { Tenant } from '../types';

export default function SuperadminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const token = localStorage.getItem('mi-receta-jwt');
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, subdomain: newSubdomain })
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
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Superadmin</h1>
          <p className="text-sm text-slate-500">Gestión global de Tenants (Instituciones/Clínicas)</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo Tenant
          </h2>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de la Institución</label>
              <input 
                required 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Ej. Clínica Modelo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Subdominio (único)</label>
              <div className="flex items-center">
                <input 
                  required 
                  type="text" 
                  value={newSubdomain} 
                  onChange={e => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                  className="w-full border border-slate-200 rounded-l-lg px-3 py-2 text-sm"
                  placeholder="clinicamodelo"
                />
                <span className="bg-slate-50 border-y border-r border-slate-200 text-slate-400 text-xs px-3 py-2 rounded-r-lg whitespace-nowrap">
                  .mireceta.com
                </span>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-purple-600 text-white font-semibold text-sm py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
            <table className="w-full text-left text-sm">
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
