import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { getCompany, updateCompany, resetAllData, type Company } from '@/lib/db';

export function AdminSettings() {
  const [company, setCompanyState] = useState<Company>(getCompany());
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleChange = (field: keyof Company, value: string) => {
    setCompanyState(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateCompany(company);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetAllData();
    setCompanyState(getCompany());
    setShowResetConfirm(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); window.location.reload(); }, 1500);
  };

  const fields: { key: keyof Company; label: string; type: string; required?: boolean }[] = [
    { key: 'name', label: 'Bedrijfsnaam', type: 'text', required: true },
    { key: 'address', label: 'Adres', type: 'text' },
    { key: 'postalCode', label: 'Postcode', type: 'text' },
    { key: 'city', label: 'Plaats', type: 'text' },
    { key: 'country', label: 'Land', type: 'text' },
    { key: 'phone', label: 'Telefoon', type: 'tel' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'kvk', label: 'KvK nummer', type: 'text' },
    { key: 'btw', label: 'BTW nummer', type: 'text' },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
        <p className="text-gray-500">Beheer bedrijfsgegevens en systeeminstellingen</p>
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />Wijzigingen succesvol opgeslagen!
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Bedrijfsgegevens</h2>
            <p className="text-sm text-gray-500">Deze gegevens worden gebruikt in rapportages</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
              <input type={field.type} value={company[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={handleSave} className="bg-primary hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors">
            <Save className="w-4 h-4" />Opslaan
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-rose-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Demo data reset</h2>
            <p className="text-sm text-gray-500">Reset alle data naar de oorspronkelijke demo staat</p>
          </div>
        </div>
        {!showResetConfirm ? (
          <button onClick={() => setShowResetConfirm(true)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors border border-rose-200">
            <RotateCcw className="w-4 h-4" />Reset demo data
          </button>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <p className="text-rose-700 text-sm mb-4 font-medium">
              Waarschuwing: Dit zal alle werknemers, registraties en instellingen resetten naar de standaard demo data. Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button onClick={handleReset} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Ja, reset alles</button>
              <button onClick={() => setShowResetConfirm(false)} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">Annuleren</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
