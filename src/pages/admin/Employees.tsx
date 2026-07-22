import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getWorkZones, type Employee } from '@/lib/db';

export function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', pin: '', email: '', phone: '', workZoneId: '', active: true });
  const [error, setError] = useState('');

  const zones = getWorkZones();
  const refresh = () => setEmployees(getEmployees());

  const resetForm = () => {
    setForm({ name: '', pin: '', email: '', phone: '', workZoneId: zones[0]?.id || '', active: true });
    setEditing(null);
    setError('');
  };

  const handleAdd = () => { resetForm(); setShowForm(true); };

  const handleEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, pin: emp.pin, email: emp.email, phone: emp.phone || '', workZoneId: emp.workZoneId, active: emp.active });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Weet u zeker dat u deze werknemer wilt verwijderen?')) {
      deleteEmployee(id);
      refresh();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Naam is verplicht'); return; }
    if (!form.pin || form.pin.length !== 4) { setError('PIN moet 4 cijfers bevatten'); return; }
    if (!form.email.trim()) { setError('E-mail is verplicht'); return; }
    const dupPin = getEmployees().find(e => e.pin === form.pin && e.id !== editing?.id);
    if (dupPin) { setError('Deze PIN is al in gebruik'); return; }

    if (editing) {
      updateEmployee(editing.id, { name: form.name.trim(), pin: form.pin, email: form.email.trim(), phone: form.phone.trim(), workZoneId: form.workZoneId, active: form.active });
    } else {
      addEmployee({ name: form.name.trim(), pin: form.pin, email: form.email.trim(), phone: form.phone.trim(), workZoneId: form.workZoneId || zones[0]?.id || '', active: form.active });
    }
    refresh();
    setShowForm(false);
    resetForm();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-gray-900">Werknemers</h1>
          <p className="text-gray-500">Beheer medewerkers en hun werkzones</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleAdd} className="bg-primary hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Werknemer toevoegen</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{editing ? 'Werknemer bewerken' : 'Nieuwe werknemer'}</h2>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Jan de Vries" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN code (4 cijfers) *</label>
                  <input type="text" maxLength={4} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="jan@moed.nl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="0612345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Werkzone</label>
                  <select value={form.workZoneId} onChange={e => setForm({ ...form, workZoneId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {zones.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm text-gray-700">Actief</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" className="bg-primary hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">{editing ? 'Wijzigingen opslaan' : 'Toevoegen'}</button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">Annuleren</button>
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">PIN</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Werkzone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp, idx) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{emp.name.charAt(0)}</div>
                      <span className="font-medium text-gray-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{emp.pin}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">{zones.find(z => z.id === emp.workZoneId)?.name || 'Onbekend'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${emp.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{emp.active ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(emp)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Geen werknemers gevonden</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
