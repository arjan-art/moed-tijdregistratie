import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserCircle, ShieldCheck, Timer } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 rounded-3xl bg-brand-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Timer className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-3">
            MOED
          </h1>
          <p className="text-xl text-muted-foreground font-light">
            Tijdregistratie Systeem
          </p>
          <div className="w-24 h-1 bg-brand-400 rounded-full mx-auto mt-6" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg"
        >
          <button
            onClick={() => navigate('/portal')}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-brand-300 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
              <UserCircle className="w-8 h-8 text-brand-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-1">Medewerker Portaal</h2>
              <p className="text-sm text-muted-foreground">In- en uitklokken met PIN</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/login')}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg hover:border-brand-300 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
              <ShieldCheck className="w-8 h-8 text-brand-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-1">Admin Login</h2>
              <p className="text-sm text-muted-foreground">Beheer en instellingen</p>
            </div>
          </button>
        </motion.div>
      </div>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} Viento Circulair BV. Alle rechten voorbehouden.</p>
      </footer>
    </div>
  )
}
