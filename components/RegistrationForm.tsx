import React, { useState } from 'react';
import { User } from '../types';
import { UserCheck, ArrowRight, Loader2, Ticket } from 'lucide-react';

interface RegistrationFormProps {
  onRegister: (user: User) => Promise<void>;
  onLogin: (email: string) => Promise<void>;
  isSoldOut: boolean;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, onLogin, isSoldOut }) => {
  // Default view is now 'login'
  const [view, setView] = useState<'register' | 'login'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to create simple unique ID (Client Side)
  const generateUniqueId = () => {
    // Format: DX-XXXX (4 random chars)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DX-${random}`;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && !isSoldOut) {
      setIsLoading(true);
      
      const newUser: User = {
        id: generateUniqueId(),
        name,
        email,
        specialty
      };

      try {
        await onRegister(newUser);
      } catch (error) {
        console.error("Registration error", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (email) {
          setIsLoading(true);
          try {
              await onLogin(email);
          } catch(error) {
              console.error(error);
          } finally {
              setIsLoading(false);
          }
      }
  };

  if (isSoldOut && view === 'register') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="w-full p-8 rounded-2xl glass-panel relative overflow-hidden text-center border-red-500/30 border mb-4">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <UserCheck size={120} className="text-red-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-400 brand-font">Cupo Agotado</h2>
            <p className="text-slate-300">
            Hemos alcanzado el límite de 60 asistentes.
            </p>
        </div>
        <button 
            onClick={() => setView('login')}
            className="w-full py-3 text-slate-400 hover:text-white text-sm hover:underline"
        >
            ¿Ya tiene boleto? Ingrese aquí
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-500">
      
      {/* Tabs / Toggle - Swapped Order */}
      <div className="flex p-1 bg-slate-800/50 rounded-xl mb-6 border border-slate-700/50 backdrop-blur-sm">
          <button 
             onClick={() => setView('login')}
             className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${view === 'login' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
              Ya tengo Boleto
          </button>
          <button 
             onClick={() => setView('register')}
             className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${view === 'register' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
              Registro
          </button>
      </div>

      <div className="p-8 rounded-2xl glass-panel relative overflow-hidden hover:shadow-2xl hover:shadow-blue-900/20 transition-all border border-white/5">
        
        {view === 'register' ? (
            <>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <UserCheck size={120} className="text-cyan-500" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2 text-white brand-font">Confirmar Asistencia</h2>
                <p className="text-slate-400 mb-6 text-sm">Regístrese para generar su código de acceso único.</p>
                
                <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-10">
                    <div>
                    <label className="block text-cyan-500 text-xs font-bold uppercase tracking-wider mb-1">Nombre Completo</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600 disabled:opacity-50"
                        placeholder="Dr. Nombre Apellido"
                        required
                        disabled={isLoading}
                    />
                    </div>
                    
                    <div>
                    <label className="block text-cyan-500 text-xs font-bold uppercase tracking-wider mb-1">Correo Electrónico</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600 disabled:opacity-50"
                        placeholder="correo@ejemplo.com"
                        required
                        disabled={isLoading}
                    />
                    </div>

                    <div>
                    <label className="block text-cyan-500 text-xs font-bold uppercase tracking-wider mb-1">Especialidad (Opcional)</label>
                    <input 
                        type="text" 
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600 disabled:opacity-50"
                        placeholder="Ginecología, Endocrinología..."
                        disabled={isLoading}
                    />
                    </div>

                    <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full font-bold py-4 rounded-lg shadow-lg transform transition flex items-center justify-center space-x-2 mt-4 
                        ${isLoading 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white hover:scale-[1.02]'}`}
                    >
                    {isLoading ? (
                        <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando ID...</span>
                        </>
                    ) : (
                        <>
                        <span>Confirmar asistencia</span>
                        <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                    </button>
                </form>
            </>
        ) : (
            <>
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Ticket size={120} className="text-slate-400" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2 text-white brand-font">Ingrese</h2>
                <p className="text-slate-400 mb-6 text-sm">Ingrese el correo con el que se registró.</p>

                <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-cyan-500 text-xs font-bold uppercase tracking-wider mb-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-slate-600 disabled:opacity-50"
                            placeholder="correo@ejemplo.com"
                            required
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full font-bold py-4 rounded-lg shadow-lg transform transition flex items-center justify-center space-x-2 mt-6
                        ${isLoading 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white hover:scale-[1.02] border border-slate-600'}`}
                    >
                    {isLoading ? (
                        <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Buscando...</span>
                        </>
                    ) : (
                        <>
                        <span>Ver mi Boleto</span>
                        <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
};

export default RegistrationForm;