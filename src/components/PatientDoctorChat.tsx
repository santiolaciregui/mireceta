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
  X,
  Plus
} from 'lucide-react';
import { MedicalOrder, ChatMessage, SystemUser } from '../types';

interface PatientDoctorChatProps {
  orders: MedicalOrder[];
  currentUser: SystemUser;
  onSendMessage: (orderId: string, message: any) => Promise<void>;
  initialSelectedOrderId?: string | null;
  onClearInitialOrderId?: () => void;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

  // File Upload State
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Playback progress tracking
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const playbackIntervals = useRef<Record<string, NodeJS.Timeout>>({});

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

  // Helper: Play simple synth alert chime (AudioContext)
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
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'record') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'play') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // AudioContext blocked or not supported
    }
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
      ...(inputText.trim() ? { text: inputText.trim() } : {}),
      ...(previewImage ? { 
        fileUrl: previewImage.url, 
        fileName: previewImage.name, 
        fileType: 'image' 
      } : {})
    };

    playSynthBeep('send');
    setInputText('');
    setPreviewImage(null);
    await onSendMessage(activeOrder.id, newMessage);
  };

  // Simulate audio message recording completion
  const handleSendAudioMessage = async () => {
    if (!activeOrder) return;
    setIsRecording(false);
    playSynthBeep('send');

    const duration = recordTime > 0 ? recordTime : 8; // default to 8 secs if too short
    const simulatedAudioUrl = `MOCK_AUDIO_NOTE_${Date.now()}_DURATION_${duration}`;

    const newMessage: ChatMessage = {
      id: `audio-${Date.now()}`,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : 'colaborador'),
      senderName: `${currentUser.name} ${currentUser.lastName}`,
      timestamp: new Date().toISOString(),
      text: `Mensaje de voz (${formatTime(duration)})`,
      fileUrl: simulatedAudioUrl,
      fileName: `Nota_de_voz_${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }).replace(':', '_')}.mp3`,
      fileType: 'audio'
    };

    await onSendMessage(activeOrder.id, newMessage);
  };

  // Handle Simulated Audio Playback with a moving slider progress bar
  const togglePlayAudio = (msgId: string, durationSecs: number) => {
    playSynthBeep('play');
    
    // If already playing this, stop it
    if (playingAudioId === msgId) {
      clearInterval(playbackIntervals.current[msgId]);
      delete playbackIntervals.current[msgId];
      setPlayingAudioId(null);
      return;
    }

    // Stop currently playing if other
    if (playingAudioId) {
      clearInterval(playbackIntervals.current[playingAudioId]);
      delete playbackIntervals.current[playingAudioId];
      setAudioProgress(prev => ({ ...prev, [playingAudioId]: 0 }));
    }

    setPlayingAudioId(msgId);
    setAudioProgress(prev => ({ ...prev, [msgId]: prev[msgId] || 0 }));

    const tickMs = 150;
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

  // Filter orders by query on doctor/operator side
  const filteredInbox = chatOrders.filter(o => {
    const term = searchQuery.toLowerCase();
    return (
      o.patientName.toLowerCase().includes(term) ||
      o.patientLastName.toLowerCase().includes(term) ||
      o.patientDni.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.medicationText.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 flex w-full h-full bg-white overflow-hidden animate-fadeIn">
      
      {/* LEFT PANEL: CONVERSATIONS (Only for doctor/operator to navigate multiple patients) */}
      {!isPatient && (
        <div className={`w-full md:w-80 border-r border-slate-150 flex flex-col shrink-0 bg-slate-50/50 ${selectedOrderId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-150">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-blue-600" />
              <span>Bandeja de Consultas</span>
              <span className="ml-auto px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-md">
                {chatOrders.length}
              </span>
            </h3>

            {/* Inbox Search bar */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente o receta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 text-slate-700"
              />
            </div>
          </div>

          {/* Conversations list scroll container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredInbox.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs font-bold">No se encontraron chats</p>
                <p className="text-[10px] mt-1">Modifique los términos de búsqueda</p>
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
                    className={`w-full text-left p-4 transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/75 border-l-4 border-blue-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-slate-850 text-xs truncate">
                        {order.patientName} {order.patientLastName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {order.id}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold truncate">
                      DNI: {order.patientDni} • {order.obraSocial}
                    </p>

                    {/* Last message snippet */}
                    <div className="mt-2 text-xs truncate w-full flex items-center gap-1.5 text-slate-500">
                      {lastMsg ? (
                        <>
                          <span className="font-extrabold text-[10px] text-slate-450 uppercase">
                            {lastMsg.sender === 'paciente' ? 'Paciente:' : 'Soporte:'}
                          </span>
                          <span className="truncate text-slate-600 font-medium">{lastMsg.text || 'Archivo adjunto'}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No hay mensajes todavía</span>
                      )}
                    </div>

                    {/* Order status badge */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        order.status === 'Pendiente' ? 'bg-amber-400' :
                        (order.status === 'En revisión' || order.status === 'Aprobada' || order.status === 'Solicita más información') ? 'bg-blue-400' :
                        order.status === 'Rechazada' ? 'bg-red-400' : 'bg-emerald-400'
                      }`} />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        {order.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RIGHT PANEL: ACTIVE CHAT THREAD */}
      <div 
        className={`flex-1 flex flex-col bg-slate-50/30 relative ${isDragOver ? 'bg-blue-50/20' : ''} ${!selectedOrderId && !isPatient ? 'hidden md:flex' : 'flex'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-blue-600/10 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 shadow-xl border border-blue-200 rounded-3xl p-6 flex flex-col items-center gap-3 text-center scale-105 transition-all">
              <ImageIcon className="h-10 w-10 text-blue-600 animate-bounce" />
              <div>
                <p className="font-extrabold text-sm text-slate-800">Soltá la imagen acá</p>
                <p className="text-[10px] text-slate-400 mt-1">Se cargará como archivo adjunto de forma segura</p>
              </div>
            </div>
          </div>
        )}

        {activeOrder ? (
          <>
            {/* Active chat header with contact/order summary */}
            <div className="px-6 py-4 border-b border-slate-150 bg-white flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-3">
                {!isPatient && (
                  <button 
                    onClick={() => setSelectedOrderId(null)}
                    className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 mr-1"
                    title="Volver"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="h-10 w-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {isPatient ? 'Equipo Médico de Mi Receta Online' : `${activeOrder.patientName} ${activeOrder.patientLastName}`}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {isPatient 
                      ? 'Consultorio y auditoría médica asincrónica activa' 
                      : `DNI: ${activeOrder.patientDni} • Obra Social: ${activeOrder.obraSocial}`}
                  </p>
                </div>
              </div>

              {/* Order quick context badge */}
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded-md font-mono">
                  Orden: {activeOrder.id}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeOrder.status === 'Pendiente' ? 'bg-amber-100 text-amber-700 border border-amber-200/50' :
                  (activeOrder.status === 'En revisión' || activeOrder.status === 'Aprobada' || activeOrder.status === 'Solicita más información') ? 'bg-blue-100 text-blue-700 border border-blue-200/50' :
                  activeOrder.status === 'Rechazada' ? 'bg-red-100 text-red-700 border border-red-200/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
                }`}>
                  {activeOrder.status}
                </span>
              </div>
            </div>

            {/* Quick Context Strip regarding active treatment */}
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-semibold gap-3">
              <span className="truncate">
                <strong>Medicación:</strong> {activeOrder.medicationText}
              </span>
              <span className="shrink-0 font-mono">
                Diag: {activeOrder.diagnostic || 'Tratamiento Crónico'}
              </span>
            </div>

            {/* Messages Thread list */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              
              {/* Informative baseline message */}
              <div className="text-center py-2">
                <span className="inline-block bg-slate-100 border border-slate-200/60 rounded-xl px-4 py-1.5 text-[10px] text-slate-500 font-bold tracking-wide">
                  Encriptación segura de grado clínico activa • {new Date(activeOrder.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>

              {/* Loop messages list */}
              {(!activeOrder.messages || activeOrder.messages.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-75">
                  <MessageSquare className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-700">Sin mensajes en este canal</p>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Escriba una pregunta, adjunte fotos complementarias de su remedio o grabe una nota de voz para solicitar apoyo médico.
                  </p>
                </div>
              ) : (
                activeOrder.messages.map((msg) => {
                  const isOwn = (isPatient && msg.sender === 'paciente') || 
                                (!isPatient && msg.sender !== 'paciente');
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[70%] ${
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* Sender name label (if not own) */}
                      {!isOwn && (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 ml-1.5">
                          {msg.senderName} ({msg.sender})
                        </span>
                      )}

                      {/* Message bubble container */}
                      <div className={`p-3.5 rounded-2xl shadow-xs border ${
                        isOwn 
                          ? 'bg-blue-600 border-blue-500 text-white rounded-br-none' 
                          : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                      }`}>
                        
                        {/* 1. TEXT CONTENT */}
                        {msg.text && (
                          <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        )}

                        {/* 2. IMAGE CONTENT */}
                        {msg.fileType === 'image' && msg.fileUrl && (
                          <div className={`mt-2 overflow-hidden rounded-xl border ${msg.text ? 'border-t border-slate-200/20 pt-2' : ''}`}>
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName} 
                              className="max-h-56 object-cover rounded-lg hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                              referrerPolicy="no-referrer"
                            />
                            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] opacity-75 font-mono">
                              <ImageIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{msg.fileName}</span>
                            </div>
                          </div>
                        )}

                        {/* 3. AUDIO VOICE MESSAGE CONTENT */}
                        {msg.fileType === 'audio' && msg.fileUrl && (
                          <div className="flex items-center gap-3 py-1.5 min-w-[200px]">
                            {/* Play Button */}
                            <button
                              onClick={() => {
                                // Extract mock duration from mock URL string if exists, e.g. MOCK_AUDIO_NOTE_123_DURATION_8
                                const match = msg.fileUrl?.match(/DURATION_(\d+)/);
                                const duration = match ? parseInt(match[1]) : 8;
                                togglePlayAudio(msg.id, duration);
                              }}
                              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isOwn 
                                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="h-4.5 w-4.5 fill-current" />
                              ) : (
                                <Play className="h-4.5 w-4.5 fill-current translate-x-0.5" />
                              )}
                            </button>

                            {/* Voice Wave and Slider Progress bar */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-end gap-0.5 h-6">
                                {/* Simulated static audio waves */}
                                {[4, 7, 2, 8, 5, 9, 3, 6, 4, 8, 2, 5, 9, 4, 7, 3].map((val, idx) => {
                                  // Animate wave lines if this exact audio note is playing
                                  const isPlaying = playingAudioId === msg.id;
                                  const randomFactor = isPlaying ? Math.sin((audioProgress[msg.id] || 0) + idx) * 3 : 0;
                                  const height = Math.max(2, Math.min(24, val * 2.5 + randomFactor));

                                  return (
                                    <span 
                                      key={idx} 
                                      className={`w-1 rounded-full ${
                                        isOwn ? 'bg-white/40' : 'bg-slate-300'
                                      }`}
                                      style={{ height: `${height}px` }}
                                    />
                                  );
                                })}
                              </div>

                              {/* Progress bar line */}
                              <div className={`h-1 w-full rounded-full relative ${
                                isOwn ? 'bg-white/20' : 'bg-slate-100'
                              }`}>
                                <div 
                                  className={`h-full rounded-full absolute left-0 top-0 transition-all duration-100 ${
                                    isOwn ? 'bg-white' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${audioProgress[msg.id] || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Volume speaker decoration */}
                            <Volume2 className={`h-4 w-4 shrink-0 opacity-40 hidden sm:block ${
                              isOwn ? 'text-white' : 'text-slate-500'
                            }`} />
                          </div>
                        )}

                      </div>

                      {/* Timestamp of delivery */}
                      <span className="text-[9px] font-bold text-slate-400 mt-1 mr-1">
                        {new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Drag drop guidelines or preview upload widget */}
            {previewImage && (
              <div className="px-6 py-3 border-t border-slate-150 bg-white flex items-center justify-between gap-4 animate-scaleUp">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 max-w-sm">
                  <img 
                    src={previewImage.url} 
                    alt="Preview" 
                    className="h-10 w-10 object-cover rounded-lg shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{previewImage.name}</p>
                    <p className="text-[9px] text-slate-400 font-semibold font-mono">Imagen lista para enviar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* MESSAGE INPUT CONSOLE */}
            <div className="p-4 border-t border-slate-150 bg-white z-10 shadow-lg">
              {isRecording ? (
                /* AUDIO RECORDING ACTIVE INTERFACE */
                <div className="flex items-center justify-between bg-red-50 border border-red-150 rounded-2xl py-3 px-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-red-600 animate-ping shrink-0" />
                    <span className="text-xs font-black text-red-700">GRABANDO MENSAJE DE VOZ</span>
                    <span className="font-mono text-xs font-black text-red-950 bg-red-100 px-2 py-0.5 rounded-md">
                      {formatTime(recordTime)}
                    </span>
                  </div>

                  {/* Audio Waves active visualizer */}
                  <div className="hidden md:flex items-center gap-1">
                    {[16, 24, 12, 32, 18, 10, 28, 20].map((h, i) => (
                      <span 
                        key={i} 
                        className="w-1 bg-red-500 rounded-full transition-all duration-150"
                        style={{ 
                          height: `${Math.max(4, Math.sin(recordTime * 2 + i) * h)}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playSynthBeep('error');
                        setIsRecording(false);
                      }}
                      className="px-3 py-1.5 hover:bg-red-100 rounded-xl text-xs font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSendAudioMessage}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <MicOff className="h-4 w-4" />
                      <span>Enviar Audio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD TEXT INPUT FORM */
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                  
                  {/* File attacher triggers hidden input */}
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
                    className="h-11 w-11 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 transition-all shrink-0 cursor-pointer"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  {/* Voice mic recorder trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      playSynthBeep('record');
                      setIsRecording(true);
                    }}
                    title="Grabar Mensaje de Voz"
                    className="h-11 w-11 hover:bg-red-50 rounded-xl flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-500/10 border border-red-200/50 hover:border-red-300 transition-all shrink-0 cursor-pointer"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  {/* Input text box */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escribí tu mensaje acá o soltá una foto..."
                      className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-250 hover:border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !previewImage}
                    className="h-11 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer font-bold text-xs"
                  >
                    <span>Enviar</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          /* UNSELECTED WELCOME SPLASH PAGE */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/20">
            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 animate-pulse">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm">Canal de Chat Clínico Directo</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Seleccione una de las solicitudes de los pacientes en la lista izquierda para abrir la consola de comunicación instantánea en tiempo real.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
