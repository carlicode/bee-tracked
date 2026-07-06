import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminUser, type CreateAdminUserInput } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const ROLES = ['Ecodelivery', 'Bee Zero', 'Operador', 'Admin'] as const;

const PROD_APP_URL = 'https://d19ls0k7de9u6w.cloudfront.net/';

type CreatedUserInvite = {
  nombre: string;
  usuario: string;
  password: string;
};

function firstName(nombre: string): string {
  const part = nombre.trim().split(/\s+/)[0] || nombre.trim();
  if (!part) return nombre.trim();
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function appAccessUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/`;
  }
  return PROD_APP_URL;
}

/** Texto con formato WhatsApp (*negrita*) para copiar y pegar */
function buildInviteCopyText({ nombre, usuario, password }: CreatedUserInvite): string {
  const name = firstName(nombre);
  const url = appAccessUrl();
  return `Hola ${name} 👋🐝

Te comparto el acceso a la *nueva app de registro de turnos* de la empresa: *BeeTracked* 🎉

📱 *Link de acceso:*
${url}

🔑 *Tus datos de ingreso:*
• Usuario: *${usuario}*
• Contraseña: *${password}*`;
}

function IconEye({ off }: { off?: boolean }) {
  if (off) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function GestionUsuarios() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [invite, setInvite] = useState<CreatedUserInvite | null>(null);
  const [inviteCopyText, setInviteCopyText] = useState('');
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
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

  const searchLower = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesRol = filterRol === '' || u.rol === filterRol;
    const matchesSearch =
      searchLower === '' ||
      u.nombre.toLowerCase().includes(searchLower) ||
      u.usuario.toLowerCase().includes(searchLower);
    return matchesRol && matchesSearch;
  });

  const handleToggleUser = async (user: AdminUser) => {
    const nextEnabled = !user.enabled;
    const actionLabel = nextEnabled ? 'activar' : 'desactivar';
    setTogglingUser(user.usuario);
    try {
      await adminApi.toggleUser(user.usuario, nextEnabled);
      toast.show(
        nextEnabled ? `Usuario ${user.nombre} activado` : `Usuario ${user.nombre} desactivado`,
        'success'
      );
      await loadUsers();
    } catch (err) {
      toast.show(adminApi.parseError(err) || `No se pudo ${actionLabel} el usuario`, 'error');
    } finally {
      setTogglingUser(null);
    }
  };

  const copyInvite = async () => {
    if (!inviteCopyText) return;
    try {
      await navigator.clipboard.writeText(inviteCopyText);
      toast.show('Mensaje copiado — listo para WhatsApp', 'success');
    } catch {
      toast.show('No se pudo copiar. Selecciona el texto manualmente.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created: CreatedUserInvite = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim(),
        password: form.password,
      };
      await adminApi.createUser(form);
      setInvite(created);
      setInviteCopyText(buildInviteCopyText(created));
      toast.show('Usuario agregado', 'success');
      setForm({ nombre: '', usuario: '', password: '', rol: 'Ecodelivery' });
      setShowPassword(false);
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
          Usuarios con acceso a la app (AWS Cognito). Al agregar uno nuevo puede iniciar sesión de inmediato.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Usuarios registrados</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o usuario…"
              className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="sm:w-48 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
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
                  <th className="px-6 py-3 font-medium text-gray-700">Estado</th>
                  <th className="px-6 py-3 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const inactive = u.enabled === false;
                  return (
                    <tr key={u.usuario} className={inactive ? 'bg-gray-50/80' : undefined}>
                      <td className={`px-6 py-3 ${inactive ? 'text-gray-400' : 'text-gray-900'}`}>
                        {u.nombre}
                      </td>
                      <td className={`px-6 py-3 ${inactive ? 'text-gray-400' : 'text-gray-700'}`}>
                        {u.usuario}
                      </td>
                      <td className={`px-6 py-3 ${inactive ? 'text-gray-400' : 'text-gray-700'}`}>
                        {u.rol}
                      </td>
                      <td className="px-6 py-3">
                        {inactive ? (
                          <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            Inactivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          type="button"
                          onClick={() => void handleToggleUser(u)}
                          disabled={togglingUser === u.usuario}
                          className={
                            inactive
                              ? 'px-3 py-1.5 rounded-lg border-2 border-emerald-600 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-50'
                              : 'px-3 py-1.5 rounded-lg border-2 border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50'
                          }
                        >
                          {togglingUser === u.usuario
                            ? 'Guardando…'
                            : inactive
                              ? 'Activar'
                              : 'Desactivar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="px-6 py-8 text-gray-500 text-sm">No hay usuarios.</p>
            )}
            {users.length > 0 && filteredUsers.length === 0 && (
              <p className="px-6 py-8 text-gray-500 text-sm">
                No hay usuarios que coincidan con la búsqueda o el filtro.
              </p>
            )}
          </div>
        )}
      </div>

      {invite && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 space-y-4 max-w-xl shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Usuario creado</h2>
              <p className="text-sm text-emerald-700 mt-1">
                Copia el mensaje y envíalo por WhatsApp a {firstName(invite.nombre)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setInvite(null); setInviteCopyText(''); }}
              className="text-emerald-700 hover:text-emerald-900 text-sm shrink-0"
            >
              Cerrar
            </button>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            <p>Hola {firstName(invite.nombre)} 👋🐝</p>
            <p className="mt-3">
              Te comparto el acceso a la <strong>nueva app de registro de turnos</strong> de la empresa:{' '}
              <strong>BeeTracked</strong> 🎉
            </p>
            <p className="mt-3">📱 <strong>Link de acceso:</strong></p>
            <p className="text-beeadmin-purple break-all">{appAccessUrl()}</p>
            <p className="mt-3">🔑 <strong>Tus datos de ingreso:</strong></p>
            <p>• Usuario: <strong>{invite.usuario}</strong></p>
            <p>• Contraseña: <strong>{invite.password}</strong></p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-emerald-800">
              Al copiar se incluyen asteriscos (*texto*) para negrita en WhatsApp.
            </p>
            <textarea
              readOnly
              value={inviteCopyText}
              rows={12}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-mono text-gray-700 resize-none"
            />
            <button
              type="button"
              onClick={() => void copyInvite()}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
            >
              Copiar mensaje para WhatsApp
            </button>
          </div>
        </div>
      )}

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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 pr-11"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <IconEye off={showPassword} />
            </button>
          </div>
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
