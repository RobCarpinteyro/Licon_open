import React, { useState, useEffect } from 'react';
import RegistrationForm from './components/RegistrationForm';
import AdiAssistant from './components/AdiAssistant';
import EventMap from './components/EventMap';
import AdminScanner from './components/AdminScanner';
import { AppState, User, EVENT_INFO } from './types';
import { CheckCircle, Bell, Mail, Lock, Link as LinkIcon, Copy, LogOut, Key } from 'lucide-react';

// URL del Backend (Google Apps Script)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGxsM7VEj8_QYs5V0olvPuaijL1vL2j9xtygxRZuiNhsZv_U15zewgz4-3mdAevSM2/exec";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.CONFIRMED);
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'INVITADO-001',
    name: 'Invitado Especial',
    email: 'invitado@example.com',
    specialty: 'General'
  });
  const [notifications, setNotifications] = useState<string[]>([]);
  const [attendeeCount, setAttendeeCount] = useState<number>(0);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Initialization Logic: Check URL params for Routing
  useEffect(() => {
    const checkApiKey = async () => {
      let keyValid = true;
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        keyValid = await window.aistudio.hasSelectedApiKey();
      } else {
        // Check server config if AI Studio API is not available (e.g. in shared app)
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            if (!data.apiKey || data.apiKey === 'MY_GEMINI_API_KEY') {
              keyValid = false;
            }
          }
        } catch (e) {
          console.warn('Failed to check API key from server', e);
        }
      }
      setHasApiKey(keyValid);
    };
    checkApiKey();

    const params = new URLSearchParams(window.location.search);
    
    // 1. Admin Mode
    if (params.get('mode') === 'admin') {
      setAppState(AppState.ADMIN_LOGIN);
      return;
    }

    // 2. Re-entry Link (User returning with their ticket data)
    // Format: ?ticket=BASE64_ENCODED_JSON
    const ticketData = params.get('ticket');
    if (ticketData) {
      try {
        const decoded = JSON.parse(atob(ticketData));
        if (decoded && decoded.email && decoded.id) {
           setCurrentUser(decoded as User);
           setAppState(AppState.CONFIRMED);
           return;
        }
      } catch (e) {
        console.error("Invalid ticket link");
      }
    }

    // 3. Default: Fetch Capacity for registration
    fetchCapacity();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after triggering
      setHasApiKey(true);
    }
  };

  const fetchCapacity = async () => {
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getCount&t=${Date.now()}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.count !== undefined) {
         setAttendeeCount(data.count);
         if (data.count >= 65) setIsSoldOut(true);
      }
    } catch (e) {
      console.warn("Capacity check unavailable.");
    }
  };

  const handleRegister = async (user: User) => {
    try {
        if (!user.id) {
            throw new Error("Error interno: ID no generado");
        }

        // Estructura explícita para asegurar que el ID se envíe
        const payload = {
            action: 'register',
            id: user.id,
            name: user.name,
            email: user.email,
            specialty: user.specialty || ''
        };

        console.log("Enviando registro a Sheets:", payload);

        // Post to Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        
        const result = await response.json();
        
        if (!result.success) {
            let errorMsg = result.message;
             if (errorMsg && errorMsg.includes("Full Capacity")) {
                setIsSoldOut(true);
                errorMsg = "Lo sentimos, el cupo se ha agotado.";
            }
            addNotification("⚠️ " + (errorMsg || "Error al procesar registro"));
            return;
        }

        loginUser(user);
        addNotification(`✅ Registro Exitoso. Su ID es: ${user.id}`);

    } catch (error) {
        console.error("Registration failed:", error);
        addNotification("⚠️ Error de conexión. Intente nuevamente.");
    }
  };

  const handleLogin = async (email: string) => {
      try {
          const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getTicket&email=${encodeURIComponent(email)}&t=${Date.now()}`);
          if (!response.ok) throw new Error("Server Error");
          const result = await response.json();

          if (result.success && result.user) {
              loginUser(result.user);
              addNotification(`👋 Le damos la bienvenida de nuevo, ${result.user.name}`);
          } else {
              // Show specific backend message if available
              addNotification(`⚠️ ${result.message || "No encontramos un registro con ese email."}`);
          }
      } catch (e) {
          console.error(e);
          addNotification("⚠️ Error al buscar boleto. Verifique su conexión.");
      }
  };

  const loginUser = (user: User) => {
      setCurrentUser(user);
      setAppState(AppState.CONFIRMED);

      // Generate Re-entry Link Data
      const safeUserData = btoa(JSON.stringify(user));
      
      try {
         const newUrl = `?ticket=${safeUserData}`;
         window.history.pushState({}, '', newUrl);
      } catch (historyError) {
         console.warn("Environment blocked URL update", historyError);
      }
      
      // Removed notification about saving the link per request
  };

  const handleAdminLogin = (email: string, password: string) => {
    if (email.trim().toLowerCase() === 'carpinteyro@polarmultimedia.com' && password === 'Steel2703') {
      setAppState(AppState.ADMIN_SCANNER);
      addNotification("🔓 Sesión de Admin iniciada");
    } else {
      addNotification("⛔ Acceso Denegado: Credenciales incorrectas");
    }
  };

  const handleAdminScan = async (scannedId: string): Promise<any> => {
     try {
         // Send the ID (Control Code) to backend
         const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=checkin&id=${encodeURIComponent(scannedId)}&t=${Date.now()}`);
         if (!response.ok) throw new Error("Network response was not ok");
         return await response.json();
     } catch (e) {
         return { success: false, message: "Error de conexión con el servidor" };
     }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppState(AppState.REGISTERING);
    // Clean URL params without reloading
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
    addNotification("👋 Sesión cerrada correctamente");
  };

  const copyReEntryLink = () => {
    if (currentUser) {
        const safeUserData = btoa(JSON.stringify(currentUser));
        // Use href split to be safer in blob/iframe environments
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?ticket=${safeUserData}`;
        
        navigator.clipboard.writeText(url).then(() => {
            addNotification("📋 Enlace copiado al portapapeles");
        }).catch(() => {
            addNotification("⚠️ Copia manual: " + url.substring(0, 20) + "...");
        });
    }
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [...prev, msg]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 6000);
  };

  // --- RENDER VIEWS ---

  if (hasApiKey === false) {
    const canSelectKey = !!(window.aistudio && window.aistudio.openSelectKey);

    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-700 p-8 rounded-2xl text-center shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Key className="text-cyan-500 w-8 h-8" />
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mb-4 brand-font">Configuración Requerida</h2>
          <p className="text-slate-400 mb-8">
            Para utilizar el asistente virtual con voz en tiempo real, es necesario configurar una clave de API de Gemini válida.
          </p>
          
          {canSelectKey ? (
            <button 
              onClick={handleSelectApiKey}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-cyan-500/25"
            >
              Configurar API Key
            </button>
          ) : (
            <div className="bg-slate-800 p-4 rounded-lg text-left border border-slate-700">
              <p className="text-slate-300 text-sm mb-3 font-bold">¿Cómo solucionarlo?</p>
              <ol className="text-slate-400 text-sm list-decimal list-inside space-y-2">
                <li>Abre el proyecto en <strong>Google AI Studio</strong>.</li>
                <li>Ve al menú de <strong>Settings</strong> (Configuración).</li>
                <li>Agrega tu clave real en la variable <code>GEMINI_API_KEY</code>.</li>
                <li>Vuelve a compartir/desplegar la aplicación.</li>
              </ol>
            </div>
          )}

          <p className="text-slate-500 text-xs mt-6">
            Asegúrese de seleccionar un proyecto con facturación habilitada.
          </p>
        </div>
      </div>
    );
  }

  if (appState === AppState.ADMIN_LOGIN) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
         <div className="w-full max-w-sm bg-slate-900 border border-slate-700 p-8 rounded-2xl">
            <div className="flex justify-center mb-6">
               <Lock className="text-cyan-500 w-12 h-12" />
            </div>
            <h2 className="text-white text-xl font-bold text-center mb-6 brand-font">Acceso Administrativo</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAdminLogin(
                  formData.get('email') as string, 
                  formData.get('password') as string
              );
            }}>
               <input 
                  name="email"
                  type="email" 
                  placeholder="Correo de administrador"
                  className="w-full bg-black border border-slate-600 rounded-lg p-3 text-white mb-4 focus:border-cyan-500 outline-none"
                  autoFocus
               />
               <input 
                  name="password"
                  type="password" 
                  placeholder="Contraseña"
                  className="w-full bg-black border border-slate-600 rounded-lg p-3 text-white mb-6 focus:border-cyan-500 outline-none"
               />
               <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition">
                 Ingresar
               </button>
            </form>
            {/* Notification Toast for Login */}
            <div className="fixed top-4 right-4 space-y-2 pointer-events-none">
                {notifications.map((msg, idx) => (
                    <div key={idx} className="bg-slate-800 text-white p-3 rounded border-l-4 border-cyan-500 shadow-lg text-sm pointer-events-auto">
                    {msg}
                    </div>
                ))}
            </div>
         </div>
      </div>
    );
  }

  if (appState === AppState.ADMIN_SCANNER) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center">
              <AdminScanner onScan={handleAdminScan} />
          </div>
      );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f172a]">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <iframe 
          src="https://player.vimeo.com/video/1177118301?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1"
          className="absolute top-0 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 pointer-events-none"
          frameBorder="0"
          allow="autoplay; fullscreen"
        ></iframe>
      </div>
      
      <div className="relative z-10 min-h-screen w-full bg-slate-900/80 backdrop-blur-[2px] flex flex-col">
        
        {/* Navbar */}
        <header className="w-full h-16 px-4 flex justify-center items-center border-b border-white/10 bg-black sticky top-0 z-50">
          <img src="https://i.ibb.co/3mvTQ9S6/Logo-LICON-blanco-2025.png" alt="LICON" className="h-full object-contain py-2" />
        </header>

        <div className="w-full py-2 bg-black/40 border-b border-white/5 text-center backdrop-blur-sm">
            <p className="text-slate-300 text-xs font-medium tracking-wide">29 de abril - Tlalnepantla, Edomex</p>
        </div>

        {/* Notifications */}
        <div className="fixed top-24 right-4 z-50 space-y-2 pointer-events-none">
          {notifications.map((msg, idx) => (
            <div key={idx} className="bg-slate-800/90 text-white p-4 rounded-lg shadow-xl border-l-4 border-cyan-500 flex items-center gap-3 animate-slide-in pointer-events-auto max-w-sm backdrop-blur-md">
              <div className="bg-cyan-500/20 p-2 rounded-full"><Bell size={16} className="text-cyan-500" /></div>
              <p className="text-sm break-words">{msg}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-grow container mx-auto px-4 py-4 flex flex-col items-center">
          
          {appState === AppState.REGISTERING && (
            <div className="w-full flex flex-col items-center justify-center min-h-[60vh] fade-in">
              <div className="text-center mb-6 max-w-2xl">
                {attendeeCount > 0 && !isSoldOut && (
                    <p className="text-cyan-500/60 text-xs mt-2 font-mono">Lugares disponibles: {65 - attendeeCount} / 65</p>
                )}
              </div>
              <RegistrationForm 
                  onRegister={handleRegister} 
                  onLogin={handleLogin}
                  isSoldOut={isSoldOut} 
              />
            </div>
          )}

          {appState === AppState.CONFIRMED && currentUser && (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in-up pb-8">
              <section className="w-full">
                 <div className="mb-2 text-center flex flex-col items-center">
                    <h2 className="text-2xl font-serif text-white mb-1 brand-font flex flex-col items-center">
                      <span>Le damos la bienvenida,</span>
                      <span>{currentUser.name}</span>
                    </h2>
                    
                    <p className="text-slate-400 text-sm">Soy su asistente personal del evento.</p>
                 </div>
                 <AdiAssistant userName={currentUser.name} />
              </section>

              <section className="w-full bg-slate-800/40 rounded-3xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 flex flex-col justify-center space-y-4">
                    <h3 className="text-xl font-serif text-white brand-font border-b border-white/10 pb-3">Información del Evento</h3>
                    <ul className="space-y-3">
                      <li className="flex flex-col">
                        <span className="text-cyan-500 text-xs font-bold uppercase tracking-wider">Cita</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-white text-xl font-bold">{EVENT_INFO.time}</span>
                          <span className="text-slate-400 text-sm">{EVENT_INFO.date}</span>
                        </div>
                      </li>
                      <li className="flex flex-col">
                        <span className="text-cyan-500 text-xs font-bold uppercase tracking-wider">Lugar</span>
                        <span className="text-white text-lg leading-tight">{EVENT_INFO.location}</span>
                      </li>
                      <li className="flex flex-col">
                        <span className="text-cyan-500 text-xs font-bold uppercase tracking-wider">Dirección</span>
                        <span className="text-slate-300">{EVENT_INFO.address}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="h-64 md:h-auto min-h-[350px] bg-slate-900 p-1">
                     <EventMap />
                  </div>
                </div>
              </section>
            </div>
          )}

        </main>

        <footer className="w-full p-4 text-center text-slate-600 text-[10px] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-2">
          <p 
            onClick={() => setAppState(AppState.ADMIN_SCANNER)} 
            className="cursor-default select-none hover:text-slate-500 transition-colors"
          >
            © 2026 Inauguración CETRI - LICON.
          </p>
        </footer>
      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.8s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
        .animate-slide-in { animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; transform: translateX(100%); opacity: 0; }
        @keyframes slideIn { to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;