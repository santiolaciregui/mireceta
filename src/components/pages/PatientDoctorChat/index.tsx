/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Paperclip, 
  Play, 
  Pause, 
  Search, 
  CheckCheck,
  X, 
  Reply, 
  Maximize2, 
  Zap,
  PhoneCall,
  ExternalLink,
  ArrowLeft,
  ChevronLeft,
  FileText,
  Download
} from 'lucide-react';
import { MedicalOrder, ChatMessage, SystemUser } from '../../../types';

interface PatientDoctorChatProps {
  orders: MedicalOrder[];
  currentUser: SystemUser;
  onSendMessage: (patientDniOrOrderId: string, message: any) => Promise<void>;
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
  const cleanDni = (dni: string) => (dni || '').replace(/\D/g, '');

  const [serverConversations, setServerConversations] = useState<any[]>([]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setServerConversations(data);
        }
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Group orders and messages by unique Patient DNI
  const patientConversations = useMemo(() => {
    const map = new Map<string, {
      dni: string;
      cleanDni: string;
      name: string;
      lastName: string;
      phone: string;
      email: string;
      obraSocial: string;
      ordersCount: number;
      latestOrderId: string;
      latestOrderMedication: string;
      orders: MedicalOrder[];
      messages: ChatMessage[];
      lastMessage: ChatMessage | null;
      lastTimestamp: string;
      hasPatientReplied: boolean;
      // Real patient fields (may differ from titular when isForDependent = true)
      actualPatientName: string;
      actualPatientLastName: string;
      actualPatientDni: string;
      isForDependent: boolean;
      dependentRelationship: string;
    }>();

    // 1. Seed with server conversations (which contain unified Patient & WhatsApp inbound history)
    for (const sc of serverConversations) {
      const clean = sc.cleanDni || cleanDni(sc.patientDni || sc.dni);
      if (!clean) continue;

      map.set(clean, {
        dni: sc.patientDni || sc.dni || clean,
        cleanDni: clean,
        name: sc.patientName || sc.name || 'Paciente',
        lastName: sc.patientLastName || sc.lastName || '',
        phone: sc.patientPhone || sc.phone || '',
        email: sc.patientEmail || sc.email || '',
        obraSocial: sc.obraSocial || '',
        ordersCount: sc.ordersCount || (sc.orders ? sc.orders.length : 0),
        latestOrderId: sc.latestOrderId || '',
        latestOrderMedication: sc.latestMedicationText || '',
        orders: Array.isArray(sc.orders) ? sc.orders : [],
        messages: Array.isArray(sc.messages) ? [...sc.messages] : [],
        lastMessage: null,
        lastTimestamp: sc.lastMessageAt || sc.lastPatientWhatsAppInteractionAt || new Date().toISOString(),
        hasPatientReplied: Boolean(sc.hasPatientReplied),
        actualPatientName: sc.patientName || sc.name || '',
        actualPatientLastName: sc.patientLastName || sc.lastName || '',
        actualPatientDni: sc.patientDni || sc.dni || clean,
        isForDependent: false,
        dependentRelationship: ''
      });
    }

    // 2. Merge candidate orders based on role
    const sourceOrders = isPatient 
      ? orders.filter(o => {
          const ordDni = cleanDni(o.patientDni);
          const titularDni = cleanDni(currentUser.identifier);
          const depDnis = (currentUser.dependents || []).map((d: any) => cleanDni(d.dni || d.identifier)).filter(Boolean);
          const requestedBy = cleanDni(o.requestedByTitularDni);
          return ordDni === titularDni || depDnis.includes(ordDni) || requestedBy === titularDni;
        })
      : orders;

    for (const ord of sourceOrders) {
      const clean = cleanDni(ord.requestedByTitularDni || ord.patientDni);
      if (!clean) continue;

      let conv = map.get(clean);
      if (!conv) {
        // The conversation is grouped by the titular's DNI for WhatsApp threading.
        // We keep both titular contact data AND the real patient data for display.
        const isForDep = Boolean(ord.isForDependent && ord.requestedByTitularName);
        conv = {
          dni: ord.requestedByTitularDni || ord.patientDni,
          cleanDni: clean,
          // Titular name/contact — used for avatar initials and WhatsApp link
          name: ord.requestedByTitularName || ord.patientName,
          lastName: ord.requestedByTitularName ? '' : ord.patientLastName,
          phone: ord.requestedByTitularPhone || ord.patientPhone || '',
          email: ord.requestedByTitularEmail || ord.patientEmail || '',
          obraSocial: ord.obraSocial || '',
          ordersCount: 0,
          latestOrderId: ord.id,
          latestOrderMedication: ord.medicationText || '',
          orders: [],
          messages: [],
          lastMessage: null,
          lastTimestamp: ord.createdAt || new Date().toISOString(),
          hasPatientReplied: false,
          // Real patient data — used in the "Paciente:" banner
          actualPatientName: ord.patientName || '',
          actualPatientLastName: ord.patientLastName || '',
          actualPatientDni: ord.patientDni || '',
          isForDependent: isForDep,
          dependentRelationship: ord.dependentRelationship || ''
        };
        map.set(clean, conv);
      }

      if (!conv.orders.some(o => o.id === ord.id)) {
        conv.ordersCount++;
        conv.orders.push(ord);
      }
      if (!conv.phone && ord.patientPhone) conv.phone = ord.patientPhone;
      if (!conv.email && ord.patientEmail) conv.email = ord.patientEmail;
      if (!conv.obraSocial && ord.obraSocial) conv.obraSocial = ord.obraSocial;

      if (ord.id && (!conv.latestOrderId || ord.id > conv.latestOrderId)) {
        conv.latestOrderId = ord.id;
        conv.latestOrderMedication = ord.medicationText || '';
      }

      if (Array.isArray(ord.messages)) {
        conv.messages.push(...ord.messages);
      }
    }

    // 3. Deduplicate and sort messages per patient
    const result = Array.from(map.values()).map(conv => {
      const seen = new Set<string>();
      const deduped: ChatMessage[] = [];

      for (const m of conv.messages) {
        if (!m) continue;
        const key = m.id || `${m.timestamp}-${m.sender}-${m.text || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(m);
        }
      }

      deduped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastMsg = deduped.length > 0 ? deduped[deduped.length - 1] : null;

      return {
        ...conv,
        messages: deduped,
        lastMessage: lastMsg,
        lastTimestamp: lastMsg?.timestamp || conv.lastTimestamp,
        hasPatientReplied: lastMsg?.sender === 'paciente'
      };
    });

    // Sort conversations with most recent activity on top
    result.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
    return result;
  }, [orders, serverConversations, isPatient, currentUser.identifier]);

  const [selectedPatientDni, setSelectedPatientDni] = useState<string | null>(null);
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

  // Active selected conversation
  const activeConversation = isPatient 
    ? (patientConversations.length > 0 ? patientConversations[0] : null)
    : (patientConversations.find(p => p.cleanDni === selectedPatientDni) || null);

  // Sync initial selection from external trigger (e.g. DoctorDashboard "Chatear con Paciente")
  useEffect(() => {
    if (initialSelectedOrderId) {
      const matchOrder = orders.find(o => o.id === initialSelectedOrderId);
      if (matchOrder) {
        const orderCleanDni = cleanDni(matchOrder.requestedByTitularDni || matchOrder.patientDni);
        setSelectedPatientDni(orderCleanDni);
      }
      if (onClearInitialOrderId) {
        onClearInitialOrderId();
      }
    }
  }, [initialSelectedOrderId, orders, onClearInitialOrderId]);

  // Preselect first conversation ONLY once on initial large screen render if no selection
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!isPatient && !hasAutoSelectedRef.current && !selectedPatientDni && patientConversations.length > 0) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setSelectedPatientDni(patientConversations[0].cleanDni);
      }
      hasAutoSelectedRef.current = true;
    }
  }, [patientConversations, selectedPatientDni, isPatient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, selectedPatientDni]);

  // Audio recording timer
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

  const playSynthBeep = (type: 'send' | 'record') => {
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
      // AudioContext optional
    }
  };

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
      console.warn('Mic issue, using audio note simulator:', err);
      setIsRecording(true);
    }
  };

  const stopAndSendAudioRecording = async () => {
    if (!activeConversation) return;
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
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    } else {
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
    if (!activeConversation) return;
    const messageId = `audio-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : 'colaborador'),
      senderName: `${currentUser.name} ${currentUser.lastName}`.trim() || (currentUser.role === 'paciente' ? 'Paciente' : 'Equipo Médico'),
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
    await onSendMessage(activeConversation.cleanDni, newMessage);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation) return;
    if (!inputText.trim() && !previewImage) return;

    const messageId = `msg-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : 'colaborador'),
      senderName: `${currentUser.name} ${currentUser.lastName}`.trim() || (currentUser.role === 'paciente' ? 'Paciente' : 'Equipo Médico'),
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
    await onSendMessage(activeConversation.cleanDni, newMessage);
  };

  const togglePlayAudio = (msgId: string, url: string, durationSecs: number = 8) => {
    if (playingAudioId === msgId) {
      if (audioElementsRef.current[msgId]) {
        audioElementsRef.current[msgId].pause();
      }
      clearInterval(playbackIntervals.current[msgId]);
      delete playbackIntervals.current[msgId];
      setPlayingAudioId(null);
      return;
    }

    if (playingAudioId) {
      if (audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      clearInterval(playbackIntervals.current[playingAudioId]);
      delete playbackIntervals.current[playingAudioId];
      setAudioProgress(prev => ({ ...prev, [playingAudioId]: 0 }));
    }

    setPlayingAudioId(msgId);

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

  // Filter conversations list by patient search
  const filteredConversations = patientConversations.filter(p => {
    const term = inboxSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.dni.includes(term) ||
      p.phone.includes(term) ||
      p.latestOrderId.toLowerCase().includes(term) ||
      p.latestOrderMedication.toLowerCase().includes(term)
    );
  });

  // Filter messages in active conversation by search query
  const displayedMessages = (activeConversation?.messages || []).filter(msg => {
    if (!chatSearchQuery.trim()) return true;
    const term = chatSearchQuery.toLowerCase();
    return (
      (msg.text && msg.text.toLowerCase().includes(term)) ||
      (msg.senderName && msg.senderName.toLowerCase().includes(term)) ||
      (msg.fileName && msg.fileName.toLowerCase().includes(term))
    );
  });

  const formatWaPhoneLink = (phone: string) => {
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) clean = clean.substring(1);
    if (!clean.startsWith('54')) clean = `549${clean}`;
    else if (!clean.startsWith('549')) clean = `549${clean.substring(2)}`;
    return clean;
  };

  return (
    <div className="flex-1 min-h-0 flex w-full h-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-800 animate-fadeIn selection:bg-[#00a884] selection:text-white">
      
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

      {/* LEFT PANEL: PATIENT CONVERSATIONS LIST */}
      {!isPatient && (
        <div className={`w-full lg:w-80 xl:w-96 border-r border-slate-250 flex flex-col shrink-0 bg-white h-full overflow-hidden ${selectedPatientDni ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Header Bar */}
          <div className="px-3.5 py-3 bg-[#075E54] text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/30 shadow-inner shrink-0">
                <MessageSquare className="h-4 w-4 fill-current text-emerald-300" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm tracking-tight text-white truncate">
                WhatsApp con Pacientes
              </h3>
            </div>
            <div className="flex items-center shrink-0">
              <span className="px-2 py-0.5 bg-emerald-700/60 rounded-full text-[10px] font-bold font-mono text-emerald-100 border border-emerald-500/30 whitespace-nowrap">
                {patientConversations.length} {patientConversations.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>
          </div>

          {/* Search bar container */}
          <div className="p-2.5 bg-[#f6f6f6] border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente, DNI, teléfono..."
                value={inboxSearchQuery}
                onChange={(e) => setInboxSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-slate-400 text-slate-800 shadow-xs"
              />
            </div>
          </div>

          {/* Conversations scrollable inbox */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No se encontraron pacientes</p>
                <p className="text-[11px] mt-0.5">Modifique los términos de búsqueda</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedPatientDni === conv.cleanDni;
                const lastMsg = conv.lastMessage;

                return (
                  <button
                    key={conv.cleanDni}
                    onClick={() => setSelectedPatientDni(conv.cleanDni)}
                    className={`w-full text-left p-3 sm:p-3.5 transition-colors flex items-start gap-3 cursor-pointer border-l-4 ${
                      isSelected 
                        ? 'bg-[#f0f2f5] border-[#00a884]' 
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-teal-100 text-[#075E54] flex items-center justify-center font-bold text-xs sm:text-sm border border-teal-200 shadow-xs">
                        {conv.name.charAt(0)}{conv.lastName.charAt(0)}
                      </div>
                      {conv.hasPatientReplied && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                      )}
                    </div>

                    {/* Patient summary snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {conv.name} {conv.lastName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        DNI: {conv.dni} {conv.phone ? `• Cel: ${conv.phone}` : ''} • {conv.obraSocial || 'Particular'}
                      </p>

                      {/* Show actual patient name if request is for a dependent */}
                      {conv.isForDependent && conv.actualPatientName && (
                        <p className="text-[10px] text-violet-700 font-semibold truncate mt-0.5 flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                          Paciente: {conv.actualPatientName} {conv.actualPatientLastName}
                          {conv.dependentRelationship && <span className="text-violet-500 font-normal">({conv.dependentRelationship})</span>}
                        </p>
                      )}

                      <div className="mt-1 text-xs truncate flex items-center gap-1 text-slate-600">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === 'medico' || lastMsg.sender === 'colaborador' ? (
                              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] shrink-0" />
                            ) : null}
                            <span className={`truncate ${conv.hasPatientReplied ? 'font-bold text-slate-900' : 'text-slate-600 font-normal'}`}>
                              {lastMsg.text || (lastMsg.fileType === 'image' ? '📷 Foto adjunta' : '🎙️ Nota de voz')}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {conv.ordersCount > 0 ? `${conv.ordersCount} trámite(s) (${conv.latestOrderId})` : 'Conversación iniciada'}
                          </span>
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

      {/* RIGHT PANEL: UNIFIED PATIENT CHAT CANVAS */}
      <div 
        className={`flex-1 min-w-0 flex flex-col h-full bg-[#efeae2] relative overflow-hidden ${isDragOver ? 'ring-4 ring-[#00a884] ring-inset' : ''} ${!selectedPatientDni && !isPatient ? 'hidden lg:flex' : 'flex'}`}
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
          <div className="absolute inset-0 z-30 bg-[#00a884]/20 backdrop-blur-xs flex items-center justify-center pointer-events-none p-4">
            <div className="bg-white shadow-2xl border-2 border-[#00a884] rounded-2xl p-6 flex flex-col items-center gap-3 text-center scale-105 transition-all max-w-sm">
              <ImageIcon className="h-12 w-12 text-[#00a884] animate-bounce" />
              <div>
                <p className="font-bold text-base text-slate-800">Soltá tu imagen acá</p>
                <p className="text-xs text-slate-500 mt-1">Se adjuntará directamente al mensaje de WhatsApp</p>
              </div>
            </div>
          </div>
        )}

        {activeConversation ? (
          <>
            {/* WHATSAPP TOP HEADER BAR */}
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#f0f2f5] border-b border-slate-250 flex items-center justify-between gap-2 z-10 shadow-xs shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {!isPatient && (
                  <button 
                    onClick={() => setSelectedPatientDni(null)}
                    className="lg:hidden px-2 py-1 bg-white hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center gap-1 shrink-0 border border-slate-250 cursor-pointer shadow-xs transition-colors"
                    title="Volver a la lista de pacientes"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden xs:inline">Pacientes</span>
                  </button>
                )}

                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#075E54] text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs">
                  {isPatient ? 'MR' : `${activeConversation.name.charAt(0)}${activeConversation.lastName.charAt(0)}`}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                    {isPatient ? 'Consultorio Médico - Mi Receta Online' : `${activeConversation.name} ${activeConversation.lastName}`}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 sm:gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span className="truncate">
                      {isPatient 
                        ? 'Atención Médica Directa y WhatsApp Oficial' 
                        : `DNI: ${activeConversation.dni} • ${activeConversation.obraSocial || 'Particular'} ${activeConversation.phone ? `• Cel: ${activeConversation.phone}` : ''}`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {!isPatient && activeConversation.phone && (
                  <a
                    href={`https://wa.me/${formatWaPhoneLink(activeConversation.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1EBE5D] text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
                    title="Abrir chat en WhatsApp Web"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">WhatsApp Web</span>
                    <ExternalLink className="h-3 w-3 opacity-70 hidden sm:inline" />
                  </a>
                )}

                <button
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${showChatSearch ? 'bg-slate-300 text-slate-900' : 'hover:bg-slate-200 text-slate-600'}`}
                  title="Buscar en el chat"
                >
                  <Search className="h-4 w-4" />
                </button>

                {!isPatient && (
                  <button
                    onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${showQuickTemplates ? 'bg-[#00a884] text-white' : 'hover:bg-slate-200 text-[#075E54]'}`}
                    title="Plantillas médicas rápidas"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="hidden md:inline">Plantillas</span>
                  </button>
                )}

                {!isPatient && (
                  <div className="hidden sm:inline-flex bg-white/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-200 text-[10px] font-bold font-mono text-[#075E54] whitespace-nowrap">
                    {activeConversation.ordersCount} {activeConversation.ordersCount === 1 ? 'trámite' : 'trámites'}
                  </div>
                )}
              </div>
            </div>

            {/* IN-CHAT SEARCH BAR (TOGGLEABLE) */}
            {showChatSearch && (
              <div className="bg-white px-3 sm:px-4 py-2 border-b border-slate-200 flex items-center gap-2 animate-fadeIn z-10 shadow-xs shrink-0">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar texto en esta conversación..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 text-xs py-1 px-2 focus:outline-none text-slate-800"
                  autoFocus
                />
                {chatSearchQuery && (
                  <button onClick={() => setChatSearchQuery('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* QUICK RESPONSE TEMPLATES DROPDOWN */}
            {showQuickTemplates && (
              <div className="bg-white border-b border-slate-200 p-2.5 sm:p-3 z-10 shadow-md animate-fadeIn max-h-48 overflow-y-auto shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-[#075E54] uppercase tracking-wider flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Respuestas Médicas Rápidas</span>
                  </p>
                  <button 
                    onClick={() => setShowQuickTemplates(false)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(tmpl);
                        setShowQuickTemplates(false);
                      }}
                      className="text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg p-2 text-xs text-slate-700 hover:text-[#075E54] transition-all cursor-pointer truncate"
                      title={tmpl}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PATIENT ORDERS & TREATMENTS BANNER (Visible only to medical staff / admin / colab) */}
            {!isPatient && (
              <div className="bg-white/90 backdrop-blur-xs border-b border-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 font-medium min-w-0 shrink-0">
                <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
                  <div className="truncate">
                    <strong className="text-slate-800">Paciente:</strong>{' '}
                    {activeConversation.actualPatientName || activeConversation.name}{' '}
                    {activeConversation.actualPatientLastName || activeConversation.lastName}{' '}
                    <span className="text-slate-500 font-mono">(DNI: {activeConversation.actualPatientDni || activeConversation.dni})</span>
                    {activeConversation.latestOrderMedication ? <span className="hidden md:inline text-slate-500">{` • Última medicación: ${activeConversation.latestOrderMedication}`}</span> : ''}
                  </div>
                  {activeConversation.isForDependent && (
                    <div className="truncate text-[10px] text-slate-500">
                      Solicitado por el titular:{' '}
                      <span className="font-semibold text-slate-700">{activeConversation.name} {activeConversation.lastName}</span>
                      {activeConversation.dependentRelationship && (
                        <span className="ml-1 text-violet-600 font-medium">({activeConversation.dependentRelationship})</span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 bg-emerald-100 text-emerald-800 font-mono">
                  {activeConversation.latestOrderId || 'Paciente Registrado'}
                </span>
              </div>
            )}

            {/* MESSAGES SCROLL CANVAS */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-3">
              
              {/* WhatsApp Encryption baseline notice */}
              <div className="text-center my-2">
                <div className="inline-block bg-[#ffeebd] border border-[#f5d98b] text-[#544415] rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] max-w-md shadow-xs text-center font-medium leading-tight">
                  🔒 Los mensajes están protegidos con cifrado de grado clínico. WhatsApp Cloud API conectada.
                </div>
              </div>

              {/* Loop Messages */}
              {displayedMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-semibold">No se encontraron mensajes en esta conversación</p>
                  <p className="text-[11px] mt-1">Escriba a continuación para iniciar la comunicación directa.</p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isOwn = (isPatient && msg.sender === 'paciente') || 
                                (!isPatient && msg.sender !== 'paciente');

                  return (
                    <div 
                      key={msg.id} 
                      className={`group relative flex flex-col max-w-[88%] sm:max-w-[75%] md:max-w-[70%] ${
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* Sender name label for incoming */}
                      {!isOwn && (
                        <span className="text-[10px] font-bold text-[#075E54] mb-0.5 ml-1">
                          {msg.senderName} ({msg.sender})
                        </span>
                      )}

                      {/* Message Bubble Container */}
                      <div className={`relative p-2.5 sm:p-3 rounded-lg shadow-xs text-slate-800 text-xs sm:text-sm leading-relaxed max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] ${
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

                        {/* QUOTED MESSAGE PREVIEW */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/5 border-l-4 border-[#00a884] rounded text-xs font-medium text-slate-700 max-w-full overflow-hidden">
                            <p className="font-bold text-[#075E54] text-[10px] truncate">{msg.replyTo.senderName}</p>
                            <p className="truncate text-slate-600 text-[11px]">{msg.replyTo.text}</p>
                          </div>
                        )}
                        
                        {/* 1. TEXT CONTENT */}
                        {msg.text && (
                          <div className="whitespace-pre-wrap font-normal text-slate-800 pr-4 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                            {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, idx) => {
                              if (part.match(/^https?:\/\//)) {
                                return (
                                  <a
                                    key={idx}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline font-semibold break-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {part}
                                  </a>
                                );
                              }
                              return <span key={idx}>{part}</span>;
                            })}
                          </div>
                        )}

                        {/* 2. PDF ATTACHMENT CARD */}
                        {msg.fileType === 'pdf' && msg.fileUrl && (
                          <div className="mt-2.5 p-3 bg-white/95 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3 max-w-full">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{msg.fileName || 'Receta_Digital.pdf'}</p>
                                <span className="text-[10px] text-slate-500 font-mono">Receta Oficial (PDF)</span>
                              </div>
                            </div>
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={msg.fileName || 'receta.pdf'}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#00a884] hover:bg-[#075E54] text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>PDF</span>
                            </a>
                          </div>
                        )}

                        {/* 3. IMAGE ATTACHMENT */}
                        {msg.fileType === 'image' && msg.fileUrl && (
                          <div className="mt-1.5 overflow-hidden rounded-lg cursor-pointer group/img relative max-w-full">
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName || 'Adjunto'} 
                              onClick={() => setLightboxImage({ url: msg.fileUrl!, title: msg.fileName || 'Imagen' })}
                              className="max-h-48 sm:max-h-64 w-auto max-w-full object-contain rounded-lg hover:brightness-95 transition-all"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="h-6 w-6" />
                            </div>
                          </div>
                        )}

                        {/* 3. AUDIO VOICE NOTE CONTENT */}
                        {msg.fileType === 'audio' && msg.fileUrl && (
                          <div className="flex items-center gap-2 sm:gap-3 py-1 w-full max-w-[260px] min-w-0">
                            {/* Play Button */}
                            <button
                              onClick={() => togglePlayAudio(msg.id, msg.fileUrl!, msg.audioDuration || 8)}
                              className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isOwn 
                                  ? 'bg-[#00a884] text-white hover:bg-[#075E54]' 
                                  : 'bg-[#075E54] text-white hover:bg-[#00a884]'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                              ) : (
                                <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current translate-x-0.5" />
                              )}
                            </button>

                            {/* Voice Wave and Slider Progress bar */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-end gap-0.5 h-5 sm:h-6">
                                {[4, 7, 3, 9, 5, 8, 2, 6, 4, 8, 3, 6, 9, 4].map((val, idx) => {
                                  const isPlaying = playingAudioId === msg.id;
                                  const height = isPlaying 
                                    ? Math.max(3, Math.min(20, val * 2 + Math.sin((audioProgress[msg.id] || 0) + idx) * 3))
                                    : val * 2;

                                  return (
                                    <span 
                                      key={idx} 
                                      className={`w-1 rounded-full transition-all shrink-0 ${
                                        isOwn ? 'bg-[#00a884]' : 'bg-slate-400'
                                      }`}
                                      style={{ height: `${height}px` }}
                                    />
                                  );
                                })}
                              </div>

                              {/* Progress bar line */}
                              <div className="h-1 w-full rounded-full bg-slate-200 relative overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-[#00a884] absolute left-0 top-0 transition-all duration-100"
                                  style={{ width: `${audioProgress[msg.id] || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TIMESTAMP & STATUS INDICATOR */}
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
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between animate-fadeIn z-10 shrink-0">
                <div className="border-l-4 border-[#00a884] pl-2.5 min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-[#075E54] truncate">Respondiendo a {replyingTo.senderName}</p>
                  <p className="text-xs text-slate-600 truncate">{replyingTo.text || replyingTo.fileName}</p>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* PREVIEW UPLOADED IMAGE BANNER */}
            {previewImage && (
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 animate-scaleUp z-10 shrink-0">
                <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 sm:p-2 rounded-lg border border-slate-200 max-w-xs min-w-0 flex-1">
                  <img 
                    src={previewImage.url} 
                    alt="Preview" 
                    className="h-9 w-9 sm:h-10 sm:w-10 object-cover rounded shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{previewImage.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Imagen lista para enviar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* WHATSAPP MESSAGE INPUT CONSOLE */}
            <div className="p-2 sm:p-3 bg-[#f0f2f5] border-t border-slate-250 z-10 shadow-lg shrink-0">
              {isRecording ? (
                /* AUDIO RECORDING ACTIVE BAR */
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-xl py-2 px-3 sm:py-2.5 sm:px-4 animate-pulse">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-600 animate-ping shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold text-red-700 truncate">GRABANDO AUDIO</span>
                    <span className="font-mono text-[11px] sm:text-xs font-bold text-red-950 bg-red-100 px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                      {formatTime(recordTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={cancelAudioRecording}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 hover:bg-red-100 rounded-lg text-[11px] sm:text-xs font-bold text-red-600 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={stopAndSendAudioRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                      <span>Enviar Audio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD TEXT & MEDIA INPUT FORM */
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2.5">
                  
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
                    className="p-2 sm:p-2.5 hover:bg-slate-200 rounded-full text-slate-600 transition-colors shrink-0 cursor-pointer"
                  >
                    <Paperclip className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </button>

                  {/* Voice mic recorder trigger */}
                  <button
                    type="button"
                    onClick={startRecording}
                    title="Grabar Mensaje de Voz"
                    className="p-2 sm:p-2.5 hover:bg-slate-200 rounded-full text-slate-600 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                  >
                    <Mic className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </button>

                  {/* Input text box */}
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Escribí un mensaje de WhatsApp..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#00a884] text-slate-800 placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !previewImage}
                    className="h-9 w-9 sm:h-10 sm:w-10 bg-[#00a884] hover:bg-[#075E54] disabled:opacity-50 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-[#f0f2f5]">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#075E54] mb-3 sm:mb-4 shadow-xs">
              <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">WhatsApp Web con Pacientes</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Seleccione un paciente de la lista izquierda para iniciar o continuar la atención médica directa por WhatsApp.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
