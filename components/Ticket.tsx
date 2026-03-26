import React from 'react';
import QRCode from 'react-qr-code';
import { User, EVENT_INFO } from '../types';
import { Calendar, Clock, Award, Hash, CheckCircle2 } from 'lucide-react';

interface TicketProps {
  user: User;
}

const Ticket: React.FC<TicketProps> = ({ user }) => {
  // IMPORTANT: QR Code now contains ONLY the ID for the scanner to look up
  // We wrap it in a simple JSON to be robust, but you could just use `user.id` string
  const qrData = JSON.stringify({
    id: user.id
  });

  return (
    <div className="w-full max-w-sm mx-auto bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl relative shadow-amber-500/10 transition-all duration-500">
      
      {/* Visual Stamp for Already Checked In Users (Column F) */}
      {user.checkedIn && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-90">
            <div className="border-4 border-green-600 text-green-600 rounded-lg p-2 px-4 text-4xl font-black uppercase -rotate-12 bg-white/80 backdrop-blur-sm tracking-widest shadow-xl">
                ASISTIDO
            </div>
        </div>
      )}

      {/* Ticket Head */}
      <div className={`p-4 text-center relative overflow-hidden transition-colors ${user.checkedIn ? 'bg-slate-800' : 'bg-slate-900'}`}>
         <div className="absolute inset-0 bg-amber-500/10 pattern-grid-lg"></div>
         <h3 className="text-amber-500 tracking-[0.2em] text-[10px] font-bold uppercase mb-1">Invitación Personal</h3>
         <h2 className="text-xl text-white font-serif brand-font">D EXPERT TOUR</h2>
         <p className="text-slate-400 text-[10px] mt-1">Science & Art Immersion</p>
      </div>

      <div className="p-4 relative">
        {/* Perforated line decoration */}
        <div className="absolute top-0 left-0 w-full transform -translate-y-1/2 flex justify-between px-2">
           <div className={`w-6 h-6 rounded-full ${user.checkedIn ? 'bg-slate-800' : 'bg-slate-900'}`}></div>
           <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2 mt-3"></div>
           <div className={`w-6 h-6 rounded-full ${user.checkedIn ? 'bg-slate-800' : 'bg-slate-900'}`}></div>
        </div>

        <div className="text-center mt-2">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Asistente</p>
          <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
          
          <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full mt-1 border border-slate-200">
             <Hash size={10} className="text-amber-600" />
             <span className="text-amber-800 font-mono font-bold text-xs tracking-widest">{user.id}</span>
          </div>
        </div>

        <div className="my-4 flex justify-center relative">
          <div className={`p-3 bg-white border-2 rounded-xl shadow-inner group cursor-pointer ${user.checkedIn ? 'border-green-500/50 opacity-50 blur-[1px]' : 'border-slate-100'}`}>
            <QRCode 
              value={qrData} 
              size={140} 
              level="M" 
              fgColor="#0f172a"
            />
          </div>
          {user.checkedIn && (
              <div className="absolute bottom-[-10px] bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200 shadow-sm">
                  <CheckCircle2 size={12} /> Acceso Registrado
              </div>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-start space-x-2 text-slate-600">
             <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
             <div>
               <p className="font-bold text-slate-800">Fecha</p>
               <p>{EVENT_INFO.date}</p>
             </div>
          </div>
          <div className="flex items-start space-x-2 text-slate-600">
             <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
             <div>
               <p className="font-bold text-slate-800">Hora</p>
               <p>{EVENT_INFO.time}</p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-slate-100 p-3 text-center border-t border-slate-200">
         <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
           <Award className="w-3 h-3 text-amber-500" />
           {user.checkedIn ? 'Boleto ya utilizado' : 'Presente este código al llegar'}
         </p>
      </div>
    </div>
  );
};

export default Ticket;