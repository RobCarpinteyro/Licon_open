import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CheckCircle, XCircle, Loader2, Camera, User, LogOut } from 'lucide-react';

interface AdminScannerProps {
  onScan: (id: string) => Promise<{ success: boolean; message: string; guestName?: string; alreadyCheckedIn?: boolean }>;
}

const AdminScanner: React.FC<AdminScannerProps> = ({ onScan }) => {
  const [scanResult, setScanResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string; guest?: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<string>('');
  
  const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const handleLogout = () => {
     window.location.href = window.location.origin; // Hard reload to clear admin state simply
  };

  useEffect(() => {
    if (!document.getElementById("reader")) return;

    if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(console.error);
    }

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    };

    const onScanSuccess = async (decodedText: string) => {
      // Prevent double scan of same code rapidly
      if (decodedText === lastScanned && scanResult?.status === 'loading') return;
      if (isScanningRef.current) return;
      
      try {
        isScanningRef.current = true;
        setLastScanned(decodedText);
        
        if (scannerInstanceRef.current) {
            scannerInstanceRef.current.pause();
        }

        let scannedId = decodedText;
        
        // Try to parse JSON from QR
        try {
            const data = JSON.parse(decodedText);
            if (data.id) {
                scannedId = data.id;
            }
        } catch (e) {
            // Assume raw ID if not JSON
        }

        setScanResult({ status: 'loading' });
        
        // Call Backend
        const result = await onScan(scannedId);

        setScanResult({
          status: result.success ? 'success' : 'error',
          message: result.message,
          guest: result.guestName
        });

      } catch (error) {
        setScanResult({ status: 'error', message: 'Error de lectura o conexión' });
      } finally {
        isScanningRef.current = false;
        setTimeout(() => {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.resume();
            }
        }, 3000); // 3 second cooldown
      }
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);
    scannerInstanceRef.current = scanner;
    scanner.render(onScanSuccess, () => {});

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-black/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Camera className="text-cyan-500 w-5 h-5" />
                <h2 className="text-white font-bold brand-font">SCANNER</h2>
            </div>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <LogOut size={12} /> Salir
            </button>
        </div>

        <div className="p-4 bg-black">
             <div id="reader" className="w-full overflow-hidden rounded-lg border-2 border-slate-800"></div>
        </div>

        <div className="p-6 bg-slate-900 min-h-[150px]">
            {scanResult ? (
                <div className={`text-center animate-fade-in-up ${scanResult.status === 'loading' ? 'opacity-100' : ''}`}>
                    
                    {scanResult.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-2" />
                            <p className="text-cyan-500 font-mono text-sm">Verificando ID...</p>
                        </div>
                    )}

                    {scanResult.status === 'success' && (
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{scanResult.guest || 'Invitado'}</h3>
                            <p className="text-green-400 font-bold uppercase tracking-widest text-sm">ACCESO AUTORIZADO</p>
                            <p className="text-slate-500 text-xs mt-2">{scanResult.message}</p>
                        </div>
                    )}

                    {scanResult.status === 'error' && (
                        <div className="flex flex-col items-center justify-center">
                             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">ACCESO DENEGADO</h3>
                            <p className="text-red-400 text-sm">{scanResult.message}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 h-full py-4">
                    <User className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Escanea el código QR del invitado</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminScanner;