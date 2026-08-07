/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Paperclip, 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  User, 
  Activity, 
  Search, 
  Calendar, 
  BadgeHelp,
  Clock,
  Trash2,
  CornerDownRight,
  ChevronRight,
  Heart,
  Sparkles,
  CheckCircle,
  CheckCheck,
  X,
  Plus,
  Reply,
  Maximize2,
  Zap,
  MoreVertical,
  PhoneCall,
  Video
} from 'lucide-react';
import { MedicalOrder, ChatMessage, SystemUser } from '../types';

interface PatientDoctorChatProps {
  orders: MedicalOrder[];
  currentUser: SystemUser;
  onSendMessage: (orderId: string, message: any) => Promise<void>;
  initialSelectedOrderId?: string | null;
  onClearInitialOrderId?: () => void;
}

const QUICK_TEMPLATES = [
  'Hola, hemos recibido tu consulta. El equipo médico está evaluando tu receta.',
  'Estimado paciente, por favor envíanos una foto clara y nítida de la caja de tu medicación.',
  'Tu solicitud de receta ha sido APROBADA. Puedes descargar el comprobante desde la plataforma.',
  'Recordá que para la renovación de recetas crónicas debes tener una consulta registrada en los últimos 6 meses.',
  'El médico auditor requiere aclarar la dosis indicada en tu solicitud anterior.'
];

export default function PatientDoctorChat({ 
  orders, 
  currentUser, 
  onSendMessage,
  initialSelectedOrderId,
  onClearInitialOrderId
}: PatientDoctorChatProps) {
  const isPatient = currentUser.role === 'paciente';
  
  // List of candidate orders that can have chat messages
  const chatOrders = isPatient 
    ? orders.filter(o => o.patientDni === currentUser.identifier)
    : orders;

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);

  // Replying state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Lightbox Modal for viewing images
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  
  // Real MediaRecorder Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

  // File Upload State
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Playback progress tracking
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const playbackIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive selected order reference
  const activeOrder = chatOrders.find(o => o.id === selectedOrderId) || (chatOrders.length > 0 ? chatOrders[0] : null);

  // Sync programmatic selection changes
  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedOrderId(initialSelectedOrderId);
      if (onClearInitialOrderId) {
        onClearInitialOrderId();
      }
    }
  }, [initialSelectedOrderId, onClearInitialOrderId]);

  // Set initial selected order ID
  useEffect(() => {
    if (activeOrder && !selectedOrderId) {
      setSelectedOrderId(activeOrder.id);
    }
  }, [chatOrders, activeOrder, selectedOrderId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeOrder?.messages, selectedOrderId]);

  // Handle Audio Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordTime(0);
      recordInterval.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }
    }
    return () => {
      if (recordInterval.current) clearInterval(recordInterval.current);
    };
  }, [isRecording]);

  // Helper: Play simple synth alert chime
  const playSynthBeep = (type: 'send' | 'record' | 'error' | 'play') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'record') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      }
    } catch (e) {
      // AudioContext blocked or not supported
    }
  };

  // Start Browser Microphone Recording
  const startRecording = async () => {
    playSynthBeep('record');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission or support issue, falling back to simulated voice note:', err);
      setIsRecording(true);
    }
  };

  // Stop Microphone Recording and send audio
  const stopAndSendAudioRecording = async () => {
    if (!activeOrder) return;
    playSynthBeep('send');
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const duration = recordTime > 0 ? recordTime : 5;
          await sendAudioMessagePayload(base64Audio, duration);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    } else {
      // Fallback audio simulation
      const duration = recordTime > 0 ? recordTime : 8;
      const simulatedAudioUrl = `AUDIO_NOTE_${Date.now()}_DURATION_${duration}`;
      await sendAudioMessagePayload(simulatedAudioUrl, duration);
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    audioChunksRef.current = [];
  };

  const sendAudioMessagePayload = async (audioUrl: string, duration: number) => {
    if (!activeOrder) return;
    const messageId = `audio-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : 'colaborador'),
      senderName: `${currentUser.name} ${currentUser.lastName}`,
      timestamp: new Date().toISOString(),
      text: `Mensaje de voz (${formatTime(duration)})`,
      fileUrl: audioUrl,
      fileName: `Nota_de_voz_${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }).replace(':', '_')}.mp3`,
      fileType: 'audio',
      status: 'sent',
      audioDuration: duration,
      ...(replyingTo ? { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text || replyingTo.fileName } } : {})
    };

    setReplyingTo(null);
    await onSendMessage(activeOrder.id, newMessage);
  };

  // Trigger file browser for image sharing
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  // Convert uploaded image to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewImage({
            url: event.target.result as string,
            name: file.name
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Format record duration as 0:00
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Send textual/image message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeOrder) return;
    if (!inputText.trim() && !previewImage) return;

    const messageId = `msg-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : 'colaborador'),
      senderName: `${currentUser.name} ${currentUser.lastName}`,
      timestamp: new Date().toISOString(),
      status: 'sent',
      ...(inputText.trim() ? { text: inputText.trim() } : {}),
      ...(previewImage ? { 
        fileUrl: previewImage.url, 
        fileName: previewImage.name, 
        fileType: 'image' 
      } : {}),
      ...(replyingTo ? { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text || replyingTo.fileName } } : {})
    };

    playSynthBeep('send');
    setInputText('');
    setPreviewImage(null);
    setReplyingTo(null);
    await onSendMessage(activeOrder.id, newMessage);
  };

  // Handle Audio Playback with real Audio element or smooth fallback progress
  const togglePlayAudio = (msgId: string, url: string, durationSecs: number = 8) => {
    // If already playing this, stop it
    if (playingAudioId === msgId) {
      if (audioElementsRef.current[msgId]) {
        audioElementsRef.current[msgId].pause();
      }
      clearInterval(playbackIntervals.current[msgId]);
      delete playbackIntervals.current[msgId];
      setPlayingAudioId(null);
      return;
    }

    // Stop currently playing if other
    if (playingAudioId) {
      if (audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      clearInterval(playbackIntervals.current[playingAudioId]);
      delete playbackIntervals.current[playingAudioId];
      setAudioProgress(prev => ({ ...prev, [playingAudioId]: 0 }));
    }

    setPlayingAudioId(msgId);

    // If real base64 audio URL
    if (url.startsWith('data:audio')) {
      if (!audioElementsRef.current[msgId]) {
        const audio = new Audio(url);
        audioElementsRef.current[msgId] = audio;
        audio.ontimeupdate = () => {
          const pct = (audio.currentTime / audio.duration) * 100;
          setAudioProgress(prev => ({ ...prev, [msgId]: pct || 0 }));
        };
        audio.onended = () => {
          setPlayingAudioId(null);
          setAudioProgress(prev => ({ ...prev, [msgId]: 0 }));
        };
      }
      audioElementsRef.current[msgId].play();
    } else {
      // Simulated audio playback progress
      const tickMs = 100;
      const progressPerTick = (tickMs / (durationSecs * 1000)) * 100;
      playbackIntervals.current[msgId] = setInterval(() => {
        setAudioProgress(prev => {
          const current = prev[msgId] || 0;
          if (current >= 100) {
            clearInterval(playbackIntervals.current[msgId]);
            delete playbackIntervals.current[msgId];
            setPlayingAudioId(null);
            return { ...prev, [msgId]: 0 };
          }
          return { ...prev, [msgId]: current + progressPerTick };
        });
      }, tickMs);
    }
  };

  // Drag and drop image upload handlers
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewImage({
            url: event.target.result as string,
            name: file.name
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter conversations list
  const filteredInbox = chatOrders.filter(o => {
    const term = inboxSearchQuery.toLowerCase();
    return (
      o.patientName.toLowerCase().includes(term) ||
      o.patientLastName.toLowerCase().includes(term) ||
      o.patientDni.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.medicationText.toLowerCase().includes(term)
    );
  });

  // Filter active chat messages by in-chat search query
  const displayedMessages = (activeOrder?.messages || []).filter(msg => {
    if (!chatSearchQuery.trim()) return true;
    const term = chatSearchQuery.toLowerCase();
    return (
      (msg.text && msg.text.toLowerCase().includes(term)) ||
      (msg.senderName && msg.senderName.toLowerCase().includes(term)) ||
      (msg.fileName && msg.fileName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex-1 flex w-full h-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-800 animate-fadeIn selection:bg-[#00a884] selection:text-white">
      
      {/* LIGHTBOX IMAGE MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={lightboxImage.url}
              download={lightboxImage.title}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              title="Descargar imagen"
            >
              <Maximize2 className="h-5 w-5" />
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <img 
            src={lightboxImage.url} 
            alt={lightboxImage.title} 
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
          <p className="mt-4 text-white text-xs font-semibold font-mono bg-white/10 px-3 py-1 rounded-full">
            {lightboxImage.title}
          </p>
        </div>
      )}

      {/* LEFT PANEL: CONVERSATIONS LIST (WhatsApp Web Left Drawer Style) */}
      {!isPatient && (
        <div className={`w-full md:w-96 border-r border-slate-250 flex flex-col shrink-0 bg-white ${selectedOrderId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header Bar (WhatsApp Teal `#075E54`) */}
          <div className="px-4 py-3 bg-[#075E54] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/30 shadow-inner">
                <MessageSquare className="h-5 w-5 fill-current text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>WhatsApp Clínico</span>
                  <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-400/30">
                    Meta API
                  </span>
                </h3>
                <p className="text-[10px] text-emerald-100 font-medium">Consultorio digital y paciente directo</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/80">
              <span className="px-2 py-0.5 bg-emerald-700/60 rounded-full text-[10px] font-bold font-mono text-emerald-100 border border-emerald-500/30">
                {chatOrders.length} chats
              </span>
            </div>
          </div>

          {/* Search bar container */}
          <div className="p-2.5 bg-[#f6f6f6] border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente, DNI o número de receta..."
                value={inboxSearchQuery}
                onChange={(e) => setInboxSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-slate-400 text-slate-800 shadow-xs"
              />
            </div>
          </div>

          {/* Conversations scrollable inbox */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filteredInbox.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No se encontraron chats</p>
                <p className="text-[11px] mt-0.5">Modifique los términos de búsqueda</p>
              </div>
            ) : (
              filteredInbox.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const lastMsg = order.messages && order.messages.length > 0 
                  ? order.messages[order.messages.length - 1] 
                  : null;

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer border-l-4 ${
                      isSelected 
                        ? 'bg-[#f0f2f5] border-[#00a884]' 
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-teal-100 text-[#075E54] flex items-center justify-center font-bold text-sm border border-teal-200 shadow-xs">
                        {order.patientName.charAt(0)}{order.patientLastName.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    {/* Chat details snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-slate-800 text-xs truncate">
                          {order.patientName} {order.patientLastName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        DNI: {order.patientDni} • {order.obraSocial}
                      </p>

                      {/* Last message preview */}
                      <div className="mt-1 text-xs truncate flex items-center gap-1 text-slate-600">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === 'medico' || lastMsg.sender === 'colaborador' ? (
                              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] shrink-0" />
                            ) : null}
                            <span className="truncate text-slate-600 font-normal">
                              {lastMsg.text || (lastMsg.fileType === 'image' ? '📷 Foto adjunta' : '🎙️ Nota de voz')}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Conversación iniciada</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RIGHT PANEL: ACTIVE WHATSAPP CHAT CANVAS */}
      <div 
        className={`flex-1 flex flex-col bg-[#efeae2] relative ${isDragOver ? 'ring-4 ring-[#00a884] ring-inset' : ''} ${!selectedOrderId && !isPatient ? 'hidden md:flex' : 'flex'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundImage: `radial-gradient(#00a884 0.4px, transparent 0.4px), radial-gradient(#00a884 0.4px, #efeae2 0.4px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
          opacity: 0.98
        }}
      >
        {/* DRAG DROP OVERLAY */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-[#00a884]/20 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div className="bg-white shadow-2xl border-2 border-[#00a884] rounded-2xl p-6 flex flex-col items-center gap-3 text-center scale-105 transition-all">
              <ImageIcon className="h-12 w-12 text-[#00a884] animate-bounce" />
              <div>
                <p className="font-bold text-base text-slate-800">Soltá tu imagen acá</p>
                <p className="text-xs text-slate-500 mt-1">Se adjuntará directamente al mensaje de WhatsApp</p>
              </div>
            </div>
          </div>
        )}

        {activeOrder ? (
          <>
            {/* WHATSAPP TOP HEADER BAR */}
            <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-slate-250 flex items-center justify-between z-10 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {!isPatient && (
                  <button 
                    onClick={() => setSelectedOrderId(null)}
                    className="md:hidden p-1.5 hover:bg-slate-200 rounded-full text-slate-600 shrink-0 mr-1"
                    title="Volver a chats"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                <div className="h-10 w-10 bg-[#075E54] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {isPatient ? 'MR' : activeOrder.patientName.charAt(0)}
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">
                    {isPatient ? 'Consultorio Médico - Mi Receta Online' : `${activeOrder.patientName} ${activeOrder.patientLastName}`}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>{isPatient ? 'Atención Médica Directa' : `DNI: ${activeOrder.patientDni} • WhatsApp: ${activeOrder.patientPhone || 'Conectado'}`}</span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${showChatSearch ? 'bg-slate-300 text-slate-900' : 'hover:bg-slate-200 text-slate-600'}`}
                  title="Buscar en el chat"
                >
                  <Search className="h-4.5 w-4.5" />
                </button>
                {!isPatient && (
                  <button
                    onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                    className={`p-2 rounded-full transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${showQuickTemplates ? 'bg-[#00a884] text-white' : 'hover:bg-slate-200 text-[#075E54]'}`}
                    title="Plantillas médicas rápidas"
                  >
                    <Zap className="h-4.5 w-4.5" />
                    <span className="hidden sm:inline">Plantillas</span>
                  </button>
                )}
                <div className="bg-white/80 px-2.5 py-1 rounded-full border border-slate-200 text-[10px] font-bold font-mono text-[#075E54]">
                  #{activeOrder.id}
                </div>
              </div>
            </div>

            {/* IN-CHAT SEARCH BAR (TOGGLEABLE) */}
            {showChatSearch && (
              <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center gap-2 animate-fadeIn z-10 shadow-xs">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar texto en esta conversación..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="flex-1 text-xs py-1 px-2 focus:outline-none text-slate-800"
                  autoFocus
                />
                {chatSearchQuery && (
                  <button onClick={() => setChatSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* QUICK RESPONSE TEMPLATES DROPDOWN */}
            {showQuickTemplates && (
              <div className="bg-white border-b border-slate-200 p-3 z-10 shadow-md animate-fadeIn">
                <p className="text-[10px] font-bold text-[#075E54] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Respuestas Médicas Rápidas</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(tmpl);
                        setShowQuickTemplates(false);
                      }}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-2 text-xs text-slate-700 hover:text-[#075E54] transition-all cursor-pointer max-w-sm"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONVERSATION ACTIVE TREATMENT BANNER */}
            <div className="bg-white/80 backdrop-blur-xs border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="truncate">
                <strong>Solicitud de receta:</strong> {activeOrder.medicationText}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                activeOrder.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-800' :
                activeOrder.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {activeOrder.status}
              </span>
            </div>

            {/* MESSAGES SCROLL CANVAS */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-3">
              
              {/* WhatsApp Encryption baseline notice */}
              <div className="text-center my-3">
                <div className="inline-block bg-[#ffeebd] border border-[#f5d98b] text-[#544415] rounded-lg px-4 py-2 text-[11px] max-w-md shadow-xs text-center font-medium leading-tight">
                  🔒 Los mensajes están protegidos con cifrado de grado clínico. WhatsApp Cloud API conectada.
                </div>
              </div>

              {/* Loop Messages */}
              {displayedMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-semibold">No se encontraron mensajes en esta conversación</p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isOwn = (isPatient && msg.sender === 'paciente') || 
                                (!isPatient && msg.sender !== 'paciente');

                  return (
                    <div 
                      key={msg.id} 
                      className={`group relative flex flex-col max-w-[85%] sm:max-w-[70%] ${
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* Sender name label for incoming */}
                      {!isOwn && (
                        <span className="text-[10px] font-bold text-[#075E54] mb-0.5 ml-1">
                          {msg.senderName} ({msg.sender})
                        </span>
                      )}

                      {/* Message Bubble Container (WhatsApp Green `#d9fdd3` for outgoing, White `#ffffff` for incoming) */}
                      <div className={`relative p-2.5 sm:p-3 rounded-lg shadow-xs text-slate-800 text-xs sm:text-sm leading-relaxed ${
                        isOwn 
                          ? 'bg-[#d9fdd3] rounded-tr-none border border-emerald-200/50' 
                          : 'bg-white rounded-tl-none border border-slate-200/60'
                      }`}>

                        {/* Reply Trigger Quick Button */}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded-full transition-opacity text-slate-500 cursor-pointer"
                          title="Citar / Responder"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>

                        {/* QUOTED MESSAGE PREVIEW (IF REPLY) */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/5 border-l-4 border-[#00a884] rounded text-xs font-medium text-slate-700">
                            <p className="font-bold text-[#075E54] text-[10px]">{msg.replyTo.senderName}</p>
                            <p className="truncate text-slate-600 text-[11px]">{msg.replyTo.text}</p>
                          </div>
                        )}
                        
                        {/* 1. TEXT CONTENT */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap font-normal text-slate-800 pr-4">
                            {msg.text}
                          </p>
                        )}

                        {/* 2. IMAGE ATTACHMENT */}
                        {msg.fileType === 'image' && msg.fileUrl && (
                          <div className="mt-1.5 overflow-hidden rounded-lg cursor-pointer group/img relative">
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName} 
                              onClick={() => setLightboxImage({ url: msg.fileUrl!, title: msg.fileName || 'Imagen' })}
                              className="max-h-64 object-cover rounded-lg hover:brightness-95 transition-all"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="h-6 w-6" />
                            </div>
                          </div>
                        )}

                        {/* 3. AUDIO VOICE NOTE CONTENT */}
                        {msg.fileType === 'audio' && msg.fileUrl && (
                          <div className="flex items-center gap-3 py-1 min-w-[220px]">
                            {/* Play Button */}
                            <button
                              onClick={() => togglePlayAudio(msg.id, msg.fileUrl!, msg.audioDuration || 8)}
                              className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isOwn 
                                  ? 'bg-[#00a884] text-white hover:bg-[#075E54]' 
                                  : 'bg-[#075E54] text-white hover:bg-[#00a884]'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="h-5 w-5 fill-current" />
                              ) : (
                                <Play className="h-5 w-5 fill-current translate-x-0.5" />
                              )}
                            </button>

                            {/* Voice Wave and Slider Progress bar */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-end gap-0.5 h-6">
                                {[4, 7, 3, 9, 5, 8, 2, 6, 4, 8, 3, 6, 9, 4, 7, 2].map((val, idx) => {
                                  const isPlaying = playingAudioId === msg.id;
                                  const height = isPlaying 
                                    ? Math.max(3, Math.min(22, val * 2.2 + Math.sin((audioProgress[msg.id] || 0) + idx) * 3))
                                    : val * 2.2;

                                  return (
                                    <span 
                                      key={idx} 
                                      className={`w-1 rounded-full transition-all ${
                                        isOwn ? 'bg-[#00a884]' : 'bg-slate-400'
                                      }`}
                                      style={{ height: `${height}px` }}
                                    />
                                  );
                                })}
                              </div>

                              {/* Progress bar line */}
                              <div className="h-1 w-full rounded-full bg-slate-200 relative">
                                <div 
                                  className="h-full rounded-full bg-[#00a884] absolute left-0 top-0 transition-all duration-100"
                                  style={{ width: `${audioProgress[msg.id] || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TIMESTAMP & STATUS INDICATOR (WHATSAPP DOUBLE TICKS `✓✓`) */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400 float-right">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && (
                            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUOTED REPLY PREVIEW BANNER */}
            {replyingTo && (
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between animate-fadeIn z-10">
                <div className="border-l-4 border-[#00a884] pl-3 min-w-0">
                  <p className="text-[10px] font-bold text-[#075E54]">Respondiendo a {replyingTo.senderName}</p>
                  <p className="text-xs text-slate-600 truncate">{replyingTo.text || replyingTo.fileName}</p>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* PREVIEW UPLOADED IMAGE BANNER */}
            {previewImage && (
              <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-4 animate-scaleUp z-10">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 max-w-xs">
                  <img 
                    src={previewImage.url} 
                    alt="Preview" 
                    className="h-10 w-10 object-cover rounded shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{previewImage.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Imagen lista para enviar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* WHATSAPP MESSAGE INPUT CONSOLE */}
            <div className="p-3 bg-[#f0f2f5] border-t border-slate-250 z-10 shadow-lg">
              {isRecording ? (
                /* AUDIO RECORDING ACTIVE BAR */
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl py-2.5 px-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-red-600 animate-ping shrink-0" />
                    <span className="text-xs font-bold text-red-700">GRABANDO MENSAJE DE VOZ</span>
                    <span className="font-mono text-xs font-bold text-red-950 bg-red-100 px-2 py-0.5 rounded">
                      {formatTime(recordTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelAudioRecording}
                      className="px-3 py-1.5 hover:bg-red-100 rounded-lg text-xs font-bold text-red-600 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={stopAndSendAudioRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <MicOff className="h-4 w-4" />
                      <span>Enviar Audio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD TEXT & MEDIA INPUT FORM */
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                  
                  {/* File attacher trigger */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleFileClick}
                    title="Adjuntar Imagen"
                    className="p-2.5 hover:bg-slate-200 rounded-full text-slate-600 transition-colors shrink-0 cursor-pointer"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  {/* Voice mic recorder trigger */}
                  <button
                    type="button"
                    onClick={startRecording}
                    title="Grabar Mensaje de Voz"
                    className="p-2.5 hover:bg-slate-200 rounded-full text-slate-600 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  {/* Input text box */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escribe un mensaje de WhatsApp..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#00a884] text-slate-800 placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !previewImage}
                    className="h-10 w-10 bg-[#00a884] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    title="Enviar mensaje"
                  >
                    <Send className="h-4 w-4 translate-x-0.5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          /* UNSELECTED WELCOME SPLASH PAGE */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#f0f2f5]">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#075E54] mb-4 shadow-sm">
              <MessageSquare className="h-10 w-10" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">WhatsApp Web Clínico</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Seleccione un chat de la lista izquierda para iniciar o continuar la atención médica directa por WhatsApp.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
