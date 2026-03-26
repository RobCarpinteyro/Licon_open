import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Sparkles, Power, Activity, Volume2 } from 'lucide-react';
import { arrayBufferToBase64, float32To16BitPCM, decodeAudioData, base64ToUint8Array } from '../utils/audio';
import { EVENT_INFO } from '../types';

interface AdiAssistantProps {
  userName: string;
}

const AdiAssistant: React.FC<AdiAssistantProps> = ({ userName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const speakingTimeoutRef = useRef<number | null>(null);
  
  // API Refs
  const sessionRef = useRef<any>(null);

  // Dynamic System Instruction based on User Name and EVENT_INFO
  const getSystemInstruction = (name: string) => `
    [INSTRUCCIONES DE IDENTIDAD Y TONO]
    Eres el asistente virtual oficial de la inauguración del CETRI de LICON. Tu personalidad es institucional, tecnológica, precisa y visionaria. Representas la entrada de LICON a una nueva era. Hablas con seguridad sobre cómo la inteligencia artificial y la robótica transforman la salud. Nunca revelas tu nombre propio; te presentas únicamente como el asistente virtual inteligente del evento. Tu objetivo principal es resolver dudas, guiar al usuario y asegurar una experiencia perfecta. Siempre debes preguntar el nombre del usuario al inicio de la conversación para personalizar el trato.

    [CONTEXTO CORPORATIVO: ¿QUÉ ES LICON?]
    Laboratorios LICON es una empresa 100% mexicana con más de 35 años de liderazgo y experiencia en el diagnóstico clínico, banco de sangre y medicina transfusional. A lo largo de los años, LICON ha sido el puente entre la trayectoria científica y la innovación, representando y comercializando las líneas más prestigiosas a nivel mundial en áreas como:
    Inmunohematología y Hemovigilancia
    Hemostasia y Coagulación
    Inmunología y Hematología
    Electroforesis de Proteínas y control de Diabetes
    Sistemas de Control de Calidad de Tercera Opinión
    LICON integra tecnologías y marcas de vanguardia (como sistemas de microplacas, tecnología en gel, automatización en hemostasia y electroforesis capilar) para maximizar la eficiencia en los laboratorios de México y garantizar diagnósticos oportunos y precisos.

    [EL PROPÓSITO: ¿QUÉ ES EL CETRI Y POR QUÉ SE CREA?]
    El CETRI (Centro de Tecnología Robótica e Inteligencia Digital) es el nuevo ecosistema donde LICON centraliza sus capacidades tecnológicas.
    ¿Por qué nace?: Esta inauguración simboliza el paso definitivo de LICON hacia el futuro del diagnóstico clínico. Su propósito es demostrar cómo la robótica, la analítica avanzada y la inteligencia artificial se integran para optimizar procesos.
    La Visión: LICON consolida su posición no solo como distribuidor, sino como el aliado tecnológico estratégico para la modernización del sector salud en México, preparando a los laboratorios y bancos de sangre para los retos del mañana.

    [INFORMACIÓN LOGÍSTICA DEL EVENTO]
    Fecha: ${EVENT_INFO.date}.
    Horario: ${EVENT_INFO.time} | Cierre 6:00 PM.
    Sede: ${EVENT_INFO.address}.
    Modalidad: Presencial, exclusivo para 150 líderes del sector salud.
    Facilidades: Valet Parking disponible. El registro es digital. Debajo del chat, el usuario tiene mapas y guías en la interfaz de la app. El evento cuenta con mapping, hologramas e iluminación LED inmersiva.

    [REGLAS DE CONVERSACIÓN (CRÍTICAS)]
    - NUNCA des toda la información de golpe.
    - Sé extremadamente breve, profesional y directo.
    - Responde SOLO lo que el usuario pregunte.
    - Espera a que el usuario haga preguntas sobre el evento, el lugar, o la agenda antes de dar detalles.
    - Mantén tus respuestas en 1 o 2 oraciones como máximo.

    [MENSAJE DE INICIO / SALUDO PREDETERMINADO]
    Tu primera respuesta debe ser EXACTAMENTE esta, sin añadir nada más:
    "Saludos. Soy el asistente virtual inteligente de la inauguración del CETRI de LICON. Recuerde que si estamos hablando es porque usted es uno de nuestros invitados especiales. Para brindarle una atención personalizada, ¿podría indicarme su nombre?"
  `;

  const initializeAudio = async () => {
    try {
      setIsError(false);
      setErrorMessage('');
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let currentApiKey = '';
      
      // First try to get the key injected by AI Studio into the client environment
      try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
          currentApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
        }
      } catch (e) {
        console.warn('process.env not available in client', e);
      }

      // If client env key is invalid or missing, try fetching from server
      if (!currentApiKey || currentApiKey === 'MY_GEMINI_API_KEY') {
        try {
          const configRes = await fetch('/api/config');
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.apiKey && configData.apiKey !== 'MY_GEMINI_API_KEY') {
              currentApiKey = configData.apiKey;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch config', e);
        }
      }

      if (!currentApiKey || currentApiKey === 'MY_GEMINI_API_KEY') {
        throw new Error('API Key no válida o no encontrada. Por favor, verifica la configuración.');
      }

      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBytes = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                  speakingTimeoutRef.current = window.setTimeout(() => {
                    setIsSpeaking(false);
                  }, 250); 
                }
              });
              
              if (speakingTimeoutRef.current) {
                clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = null;
              }
              setIsSpeaking(true);

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            console.log('Gemini Live Connection Closed');
            setIsConnected(false);
            setIsSpeaking(false);
          },
          onerror: (e) => {
            console.error('Gemini Live Error', e);
            setIsError(true);
            setErrorMessage('Error de conexión con el servidor.');
            setIsConnected(false);
            setIsSpeaking(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(userName),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      const source = inputCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32To16BitPCM(inputData); 
        const base64Data = arrayBufferToBase64(pcm16);
        
        sessionPromise.then(session => {
           session.sendRealtimeInput({
             audio: {
               mimeType: 'audio/pcm;rate=16000',
               data: base64Data
             }
           });
        });
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Initialization failed", err);
      setIsError(true);
      setErrorMessage(err.message || 'Error al conectar con el asistente.');
    }
  };

  const disconnect = () => {
    scriptProcessorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    audioContextRef.current?.close();
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();

    setIsConnected(false);
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    return () => {
      disconnect();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center py-2">
        
        {/* Status Header Removed */}

        {/* Circular Avatar Container */}
        <div className="relative group">
            {/* Glow Effect */}
            <div className={`absolute -inset-1 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 ${isSpeaking ? 'animate-pulse opacity-60' : ''}`}></div>
            
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl border-[3px] border-slate-800 bg-black overflow-hidden shadow-2xl shadow-black/50 z-10">
                
                 {/* Video Layers */}
                 
                 {/* Listening Loop */}
                 <div className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${isSpeaking ? 'opacity-0' : 'opacity-100'}`}>
                    <div style={{padding: '100% 0 0 0', position: 'relative'}}>
                      <iframe 
                        src="https://player.vimeo.com/video/1177116977?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&background=1&autoplay=1&loop=1&muted=1" 
                        frameBorder="0" 
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                        referrerPolicy="strict-origin-when-cross-origin" 
                        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}} 
                        title="licon_listens"
                      ></iframe>
                    </div>
                 </div>

                 {/* Speaking Loop */}
                 <div className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
                    <div style={{padding: '100% 0 0 0', position: 'relative'}}>
                      <iframe 
                        src="https://player.vimeo.com/video/1177117379?badge=0&autopause=0&player_id=0&app_id=58479&background=1&autoplay=1&loop=1&muted=1" 
                        frameBorder="0" 
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                        referrerPolicy="strict-origin-when-cross-origin" 
                        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}} 
                        title="licon_speaks"
                      ></iframe>
                    </div>
                 </div>

                 {/* Initial Connect Overlay (Circular) */}
                 {!isConnected && (
                   <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-[2px] transition-all duration-500">
                      <button 
                        onClick={initializeAudio}
                        className="group flex flex-col items-center justify-center w-full h-full hover:bg-cyan-500/10 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform duration-300">
                          <Power className="w-8 h-8 text-slate-900" />
                        </div>
                        <span className="mt-3 text-cyan-100 font-bold text-xs tracking-widest uppercase">Iniciar</span>
                      </button>
                   </div>
                 )}
            </div>
        </div>

        {/* Controls Console (Bottom) */}
        <div className="mt-4 flex flex-col items-center space-y-2">
            
            {/* Active Status Text */}
            <div className="h-6 flex items-center justify-center">
               {isError ? (
                  <span className="text-xs text-red-500 font-mono tracking-widest">{errorMessage || 'ERROR DE CONEXIÓN'}</span>
               ) : isConnected ? (
                  <div className="flex items-center space-x-2 animate-fade-in-up">
                     <Activity className={`w-4 h-4 ${isSpeaking ? 'text-green-400' : 'text-slate-500'}`} />
                     <span className={`text-xs font-mono uppercase tracking-widest ${isSpeaking ? 'text-green-400' : 'text-slate-500'}`}>
                        {isSpeaking ? 'Respondiendo...' : 'Escuchando...'}
                     </span>
                  </div>
               ) : (
                  <span className="text-xs text-slate-600 font-mono tracking-widest">SISTEMA OFF-LINE</span>
               )}
            </div>

            {/* Buttons Row */}
            <div className={`flex items-center space-x-4 transition-all duration-500 ${isConnected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <button 
                  onClick={toggleMute}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-full border transition-all shadow-lg backdrop-blur-md ${isMuted ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-slate-800/80 border-slate-600 text-slate-200 hover:border-cyan-500/50 hover:text-cyan-400'}`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="text-xs font-bold uppercase">{isMuted ? 'Silenciado' : 'Micrófono'}</span>
                </button>
                
                <button 
                  onClick={disconnect}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/80 border border-slate-600 text-slate-400 hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition-all shadow-lg"
                  title="Apagar Sistema"
                >
                  <Power className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default AdiAssistant;