import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Pencil, Trash2, X, Star, AlertCircle } from 'lucide-react';
import { getWorkZones, addWorkZone, updateWorkZone, deleteWorkZone, setDefaultWorkZone, type WorkZone } from '@/lib/db';

export function AdminWorkZones() {
  const [zones, setZones] = useState<WorkZone[]>(getWorkZones());
  const [editing, setEditing] = useState<WorkZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', radius: 200, isDefault: false, lat: undefined as number | undefined, lng: undefined as number | undefined });
  const [error, setError] = useState('');

  const refresh = () => setZones(getWorkZones());

  const resetForm = () => {
    setForm({ name: '', address: '', radius: 200, isDefault: false, lat: undefined, lng: undefined });
    setEditing(null);
    setError('');
  };

  const handleAdd = () => { resetForm(); setShowForm(true); };
  const handleEdit = (zone: WorkZone) => {
    setEditing(zone);
    setForm({ name: zone.name, address: zone.address, radius: zone.radius, isDefault: zone.isDefault, lat: zone.lat, lng: zone.lng });
    setShowForm(true);
  };
  const handleDelete = (id: string) => {
    if (window.confirm('Weet u zeker dat u deze werkzone wilt verwijderen?')) { deleteWorkZone(id); refresh(); }
  };
  const handleSetDefault = (id: string) => { setDefaultWorkZone(id); refresh(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Naam is verplicht'); return; }
    if (!form.address.trim()) { setError('Adres is verplicht'); return; }
    if (form.radius < 10 || form.radius > 2000) { setError('Radius moet tussen 10 en 2000 meter zijn'); return; }

    if (editing) {
      updateWorkZone(editing.id, { name: form.name.trim(), address: form.address.trim(), radius: form.radius, isDefault: form.isDefault, lat: form.lat, lng: form.lng });
      if (form.isDefault) setDefaultWorkZone(editing.id);
    } else {
      const newZone = addWorkZone({ name: form.name.trim(), address: form.address.trim(), radius: form.radius, isDefault: zones.length === 0 ? true : form.isDefault, lat: form.lat, lng: form.lng });
      if (form.isDefault && newZone) setDefaultWorkZone(newZone.id);
    }
    refresh();
    setShowForm(false);
    resetForm();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-gray-900">Werkzones</h1>
          <p className="text-gray-500">Beheer werklocaties en GPS-radii</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleAdd} className="bg-primary hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-5 h-5" /><span className="hidden sm:inline">Zone toevoegen</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{editing ? 'Werkzone bewerken' : 'Nieuwe werkzone'}</h2>
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
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Hoofdkantoor Rotterdam" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres *</label>
                  <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Weena 100, 3012 CK Rotterdam" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Radius: {form.radius}m</label>
                  <input type="range" min={10} max={2000} step={10} value={form.radius} onChange={e => setForm({ ...form, radius: parseInt(e.target.value) })} className="w-full" />
                  <div className="flex justify-between text-xs text-gray-400"><span>10m</span><span>2000m</span></div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm text-gray-700">Standaard zone</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((zone, idx) => (
          <motion.div key={zone.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${zone.isDefault ? 'border-accent ring-1 ring-accent/20' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zone.isDefault ? 'bg-accent/10' : 'bg-primary/10'}`}>
                  <MapPin className={`w-5 h-5 ${zone.isDefault ? 'text-accent' : 'text-primary'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                  {zone.isDefault && <span className="inline-flex items-center gap-1 text-xs font-medium text-accent"><Star className="w-3 h-3" />Standaard</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(zone)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(zone.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{zone.address}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (zone.radius / 2000) * 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500 font-medium">{zone.radius}m</span>
            </div>
            {!zone.isDefault && (
              <button onClick={() => handleSetDefault(zone.id)} className="mt-3 w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-primary/20">Instellen als standaard</button>
            )}
          </motion.div>
        ))}
        {zones.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Geen werkzones gevonden</p>
          </div>
        )}
      </div>
    </div>
  );
}
