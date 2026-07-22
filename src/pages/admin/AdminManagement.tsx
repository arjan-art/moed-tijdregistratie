import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Plus, Trash2, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getAdmins, addAdmin, deleteAdmin, getSession, type Admin } from '@/lib/db';

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>(getAdmins());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' as 'super' | 'admin' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const session = getSession();
  const isSuper = session?.role === 'super';
  const refresh = () => setAdmins(getAdmins());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Naam is verplicht'); return; }
    if (!form.email.trim()) { setError('E-mail is verplicht'); return; }
    if (!form.password || form.password.length < 4) { setError('Wachtwoord moet minimaal 4 tekens bevatten'); return; }
    const existing = getAdmins().find(a => a.email === form.email.trim());
    if (existing) { setError('Er bestaat al een beheerder met dit e-mailadres'); return; }

    addAdmin({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
    refresh();
    setShowForm(false);
    setForm({ name: '', email: '', password: '', role: 'admin' });
  };

  const handleDelete = (id: string) => {
    const target = admins.find(a => a.id === id);
    if (target?.role === 'super' && admins.filter(a => a.role === 'super').length <= 1) {
      alert('Er moet minimaal een superbeheerder actief blijven.'); return;
    }
    if (window.confirm('Weet u zeker dat u deze beheerder wilt verwijderen?')) { deleteAdmin(id); refresh(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-gray-900">Beheerders</h1>
          <p className="text-gray-500">Beheer admin accounts</p>
        </motion.div>
        {isSuper && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" /><span className="hidden sm:inline">Beheerder toevoegen</span>
          </motion.button>
        )}
      </div>

      {!isSuper && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-6 text-sm">
          <p>Alleen superbeheerders kunnen nieuwe beheerders toevoegen of verwijderen.</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Nieuwe beheerder</h2>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="john@moed.nl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord *</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Min. 4 tekens" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'super' | 'admin' })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="admin">Beheerder</option>
                    <option value="super">Superbeheerder</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" className="bg-primary hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Toevoegen</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">Annuleren</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Naam</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map((admin, idx) => (
                <motion.tr key={admin.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{admin.name.charAt(0)}</div>
                      <span className="font-medium text-gray-900">{admin.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${admin.role === 'super' ? 'bg-accent/10 text-accent-700' : 'bg-gray-100 text-gray-600'}`}>
                      {admin.role === 'super' ? 'Superbeheerder' : 'Beheerder'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(isSuper || admin.id === session?.id) && admins.length > 1 && (
                      <button onClick={() => handleDelete(admin.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </motion.tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Geen beheerders gevonden</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
