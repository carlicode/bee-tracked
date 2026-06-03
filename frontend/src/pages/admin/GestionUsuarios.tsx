import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminUser, type CreateAdminUserInput } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const ROLES = ['Ecodelivery', 'Bee Zero', 'Operador', 'Admin'] as const;

export function GestionUsuarios() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateAdminUserInput>({
    nombre: '',
    usuario: '',
    password: '',
    rol: 'Ecodelivery',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminApi.getUsers();
      setUsers(list);
    } catch (err) {
      toast.show(adminApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createUser(form);
      toast.show('Usuario agregado', 'success');
      setForm({ nombre: '', usuario: '', password: '', rol: 'Ecodelivery' });
      await loadUsers();
    } catch (err) {
      toast.show(adminApi.parseError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple">
          ← Panel administración
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Gestión de usuarios</h1>
        <p className="text-gray-600 text-sm mt-1">
          Alta de usuarios en el sistema (archivo de credenciales).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-100">
          Usuarios registrados
        </h2>
        {loading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-700">Nombre</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Usuario</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.usuario}>
                    <td className="px-6 py-3 text-gray-900">{u.nombre}</td>
                    <td className="px-6 py-3 text-gray-700">{u.usuario}</td>
                    <td className="px-6 py-3 text-gray-700">{u.rol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="px-6 py-8 text-gray-500 text-sm">No hay usuarios.</p>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border-2 border-violet-100 p-6 space-y-4 shadow-sm max-w-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">Agregar usuario</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Usuario</label>
          <input
            type="text"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rol</label>
          <select
            value={form.rol}
            onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-beeadmin-purple text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </form>
    </div>
  );
}
