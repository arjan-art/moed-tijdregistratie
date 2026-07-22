import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Download, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTimeEntries, getEmployees, deleteTimeEntry, exportToCSV } from '@/lib/db';

export function AdminTimeEntries() {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const employees = getEmployees();
  const allEntries = getTimeEntries();

  const filteredEntries = useMemo(() => {
    return allEntries
      .filter(e => selectedEmployees.length === 0 || selectedEmployees.includes(e.employeeId))
      .filter(e => !dateFrom || e.date >= dateFrom)
      .filter(e => !dateTo || e.date <= dateTo)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [allEntries, selectedEmployees, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pagedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleEmployeeToggle = (empId: string) => {
    setSelectedEmployees(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Weet u zeker dat u deze registratie wilt verwijderen?')) deleteTimeEntry(id);
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(filteredEntries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urenregistratie_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    clockIn: { label: 'Ingeklokt', color: 'text-emerald-600 bg-emerald-50' },
    clockOut: { label: 'Uitgeklokt', color: 'text-rose-600 bg-rose-50' },
    breakIn: { label: 'Pauze', color: 'text-accent bg-accent/10' },
    breakOut: { label: 'Pauze uit', color: 'text-teal bg-teal/10' },
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Urenregistratie</h1>
        <p className="text-gray-500">Bekijk en exporteer alle tijdregistraties</p>
      </motion.div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Medewerkers</label>
            <div className="flex flex-wrap gap-2">
              {employees.map(emp => (
                <button key={emp.id} onClick={() => handleEmployeeToggle(emp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedEmployees.includes(emp.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {emp.name}
                </button>
              ))}
              {selectedEmployees.length > 0 && (
                <button onClick={() => { setSelectedEmployees([]); setCurrentPage(1); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-all">Wis selectie</button>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Van</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tot</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
            </div>
            <button onClick={handleExportCSV} className="bg-teal hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ml-auto">
              <Download className="w-4 h-4" />Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Medewerker</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tijd</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Werkzone</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagedEntries.map((entry, idx) => {
                const cfg = typeLabels[entry.type] || typeLabels.clockIn;
                return (
                  <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">{entry.date}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{entry.employeeName}</td>
                    <td className="px-6 py-3"><span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-6 py-3 text-sm text-gray-600">{entry.time}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 hidden lg:table-cell">{entry.workZoneName}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleDelete(entry.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </motion.tr>
                );
              })}
              {pagedEntries.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Geen registraties gevonden</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{filteredEntries.length} resultaten</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-sm text-gray-700">Pagina {currentPage} van {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
