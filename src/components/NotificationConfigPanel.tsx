import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Send,
  Check,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  History,
  Settings,
  Plus
} from 'lucide-react';

interface NotificationConfig {
  channel: 'email' | 'whatsapp';
  isEnabled: boolean;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

interface NotificationTemplate {
  _id?: string;
  code: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'all';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

interface NotificationLog {
  _id: string;
  recipient: string;
  channel: 'email' | 'whatsapp';
  templateCode?: string;
  subject?: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sentAt: string;
}

export default function NotificationConfigPanel() {
  const [activeTab, setActiveTab] = useState<'channels' | 'templates' | 'test' | 'logs'>('channels');
  
  // Channels Config State
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Mi Receta Digital');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [waEnabled, setWaEnabled] = useState(true);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waCountryCode, setWaCountryCode] = useState('54');
  const [waDoctorInquiryTemplateCode, setWaDoctorInquiryTemplateCode] = useState('');
  const [showWaToken, setShowWaToken] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<NotificationTemplate> | null>(null);

  // Test State
  const [testChannel, setTestChannel] = useState<'email' | 'whatsapp'>('email');
  const [testRecipient, setTestRecipient] = useState('');
  const [testTemplateCode, setTestTemplateCode] = useState('');
  const [testSubject, setTestSubject] = useState('Mensaje de prueba - Mi Receta');
  const [testBody, setTestBody] = useState('Hola {{patientName}}, este es un mensaje de prueba enviado desde Mi Receta.');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({
    patientName: 'Juan Pérez',
    doctorName: 'Dr. López',
    orderId: 'REC-1002',
    recipeUrl: 'https://mireceta.com/view/1002'
  });

  // Logs State
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // Feedback State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingStatus, setTestingStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Configs
      const configRes = await fetch('/api/notifications/configs', { headers: getAuthHeader() });
      if (configRes.ok) {
        const configs: NotificationConfig[] = await configRes.json();
        const emailConf = configs.find((c) => c.channel === 'email');
        if (emailConf) {
          setEmailEnabled(emailConf.isEnabled);
          setSmtpHost(emailConf.credentials.host || '');
          setSmtpPort(String(emailConf.credentials.port || 587));
          setSmtpUser(emailConf.credentials.user || '');
          setSmtpPass(emailConf.credentials.pass || '');
          setSmtpFromName(emailConf.credentials.fromName || 'Mi Receta Digital');
          setSmtpFromEmail(emailConf.credentials.fromEmail || '');
        }

        const waConf = configs.find((c) => c.channel === 'whatsapp');
        if (waConf) {
          setWaEnabled(waConf.isEnabled);
          setWaPhoneNumberId(waConf.credentials.phoneNumberId || '');
          setWaAccessToken(waConf.credentials.accessToken || '');
          setWaCountryCode(waConf.credentials.defaultCountryCode || '54');
          setWaDoctorInquiryTemplateCode(waConf.credentials.doctorInquiryTemplateCode || '');
        }
      }

      // 2. Fetch Templates
      const templatesRes = await fetch('/api/notifications/templates', { headers: getAuthHeader() });
      if (templatesRes.ok) {
        const tData = await templatesRes.json();
        setTemplates(tData);
      }

      // 3. Fetch Logs
      const logsRes = await fetch('/api/notifications/logs', { headers: getAuthHeader() });
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData);
      }
    } catch (err) {
      console.error('Error al cargar datos de notificaciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/configs/email', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({
          isEnabled: emailEnabled,
          credentials: {
            host: smtpHost.trim(),
            port: Number(smtpPort),
            user: smtpUser.trim(),
            pass: smtpPass,
            fromName: smtpFromName.trim(),
            fromEmail: smtpFromEmail.trim()
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar configuración de email');
      setFeedback({ type: 'success', message: 'Configuración SMTP guardada exitosamente en la base de datos.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/configs/whatsapp', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({
          isEnabled: waEnabled,
          credentials: {
            phoneNumberId: waPhoneNumberId.trim(),
            accessToken: waAccessToken.trim(),
            defaultCountryCode: waCountryCode.trim(),
            doctorInquiryTemplateCode: waDoctorInquiryTemplateCode.trim()
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar configuración de WhatsApp');
      setFeedback({ type: 'success', message: 'Configuración de WhatsApp guardada exitosamente en la base de datos.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (channel: 'email' | 'whatsapp') => {
    setTestingStatus(channel);
    setFeedback(null);
    try {
      const credentials = channel === 'email'
        ? { host: smtpHost, port: Number(smtpPort), user: smtpUser, pass: smtpPass }
        : { phoneNumberId: waPhoneNumberId, accessToken: waAccessToken };

      const res = await fetch(`/api/notifications/configs/${channel}/test`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ credentials })
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({ type: 'success', message: data.message || `Prueba de conexión ${channel.toUpperCase()} exitosa.` });
      } else {
        setFeedback({ type: 'error', message: data.error || data.message || `Fallo en la prueba de ${channel.toUpperCase()}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error durante la verificación' });
    } finally {
      setTestingStatus(null);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.code || !editingTemplate.body) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(editingTemplate)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar plantilla');
      
      setFeedback({ type: 'success', message: 'Plantilla guardada correctamente.' });
      setEditingTemplate(null);
      fetchInitialData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar plantilla' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) {
      setFeedback({ type: 'error', message: 'Por favor ingresa un destinatario (email o teléfono).' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          channel: testChannel,
          to: testRecipient,
          subject: testChannel === 'email' ? testSubject : undefined,
          body: testBody,
          templateCode: testTemplateCode || undefined,
          variables: testVariables
        })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Notificación enviada correctamente vía ${testChannel.toUpperCase()} (ID: ${data.messageId || 'OK'})` });
        fetchInitialData(); // Refresh logs
      } else {
        setFeedback({ type: 'error', message: `Error al enviar notificación: ${data.error || 'Desconocido'}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center text-xs text-slate-400 font-medium">
        Cargando módulo de notificaciones y adaptadores...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>

          <h2 className="text-base font-extrabold text-[#1C2435] mt-1">Gestión de Notificaciones (Email & WhatsApp)</h2>
          <p className="text-xs text-slate-500 font-medium">
            Configuración de adaptadores, variables dinámicas en base de datos y trazabilidad de envíos.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-slate-200/60 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'channels' ? 'bg-white text-[#295EF3] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Adaptadores</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'templates' ? 'bg-white text-[#295EF3] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Plantillas y Variables</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'test' ? 'bg-white text-[#295EF3] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Prueba de Envío</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-white text-[#295EF3] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Historial / Logs</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB CONTENT */}
      <div className="p-6">
        {/* 1. ADAPTADORES & CONFIGURACIÓN */}
        {activeTab === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EMAIL ADAPTER FORM */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-[#1C2435]">Adaptador Correo (SMTP)</h3>
                      <span className="text-[10px] text-slate-500 font-medium">Servidor de salida Nodemailer</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#295EF3]"></div>
                  </label>
                </div>

                <form id="email-form" onSubmit={handleSaveEmailConfig} className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Host SMTP</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-[#295EF3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Puerto</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-[#295EF3]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Usuario SMTP / Email</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="notificaciones@mireceta.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-[#295EF3]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Contraseña SMTP</label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-[#295EF3]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nombre Remitente</label>
                      <input
                        type="text"
                        value={smtpFromName}
                        onChange={(e) => setSmtpFromName(e.target.value)}
                        placeholder="Mi Receta Digital"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-[#295EF3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Remitente</label>
                      <input
                        type="text"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        placeholder="no-reply@mireceta.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-[#295EF3]"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  form="email-form"
                  disabled={isSaving}
                  className="flex-1 bg-[#295EF3] hover:bg-[#1C2435] text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestConnection('email')}
                  disabled={testingStatus === 'email'}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingStatus === 'email' ? 'animate-spin' : ''}`} />
                  <span>Probar SMTP</span>
                </button>
              </div>
            </div>

            {/* WHATSAPP ADAPTER FORM */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-[#1C2435]">Adaptador WhatsApp (Meta Cloud API)</h3>
                      <span className="text-[10px] text-slate-500 font-medium">API Oficial WhatsApp Business</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waEnabled}
                      onChange={(e) => setWaEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <form id="wa-form" onSubmit={handleSaveWaConfig} className="space-y-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Phone Number ID (Meta)</label>
                    <input
                      type="text"
                      value={waPhoneNumberId}
                      onChange={(e) => setWaPhoneNumberId(e.target.value)}
                      placeholder="10928374659201"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Permanent Access Token (Bearer)</label>
                    <div className="relative">
                      <input
                        type={showWaToken ? 'text' : 'password'}
                        value={waAccessToken}
                        onChange={(e) => setWaAccessToken(e.target.value)}
                        placeholder="EAABwz12345..."
                        className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showWaToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Código de País por Defecto</label>
                    <input
                      type="text"
                      value={waCountryCode}
                      onChange={(e) => setWaCountryCode(e.target.value)}
                      placeholder="54"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      Se agregará automáticamente si el número introducido no tiene código internacional.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Plantilla Meta fuera de 24hs (Utility Template Code)</label>
                    <input
                      type="text"
                      value={waDoctorInquiryTemplateCode}
                      onChange={(e) => setWaDoctorInquiryTemplateCode(e.target.value)}
                      placeholder="doctor_consultation_inquiry"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      Código de plantilla aprobada en Meta para iniciar conversación fuera de la ventana de 24hs.
                    </span>
                  </div>
                </form>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  form="wa-form"
                  disabled={isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestConnection('whatsapp')}
                  disabled={testingStatus === 'whatsapp'}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingStatus === 'whatsapp' ? 'animate-spin' : ''}`} />
                  <span>Probar Token</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PLANTILLAS Y VARIABLES */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-xs text-[#1C2435]">Plantillas del Sistema</h3>
                <p className="text-[11px] text-slate-500">
                  Variables disponibles para usar en el texto: <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[10px]">{`{{patientName}}`}</code>, <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[10px]">{`{{doctorName}}`}</code>, <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[10px]">{`{{orderId}}`}</code>, <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[10px]">{`{{recipeUrl}}`}</code>
                </p>
              </div>
              <button
                onClick={() => setEditingTemplate({ code: 'NUEVA_PLANTILLA', name: 'Nueva Plantilla', channel: 'all', body: 'Hola {{patientName}}...', variables: ['patientName'], isActive: true })}
                className="bg-[#295EF3] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-[#1C2435] transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nueva Plantilla</span>
              </button>
            </div>

            {/* Editing Form Modal / Inline */}
            {editingTemplate && (
              <form onSubmit={handleSaveTemplate} className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-2xl space-y-3">
                <h4 className="font-extrabold text-xs text-indigo-900">Editar Plantilla en Base de Datos</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Código Único</label>
                    <input
                      type="text"
                      value={editingTemplate.code || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, code: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Nombre</label>
                    <input
                      type="text"
                      value={editingTemplate.name || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Canal</label>
                    <select
                      value={editingTemplate.channel || 'all'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, channel: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="all">Email & WhatsApp</option>
                      <option value="email">Sólo Email</option>
                      <option value="whatsapp">Sólo WhatsApp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Asunto (Para Email)</label>
                  <input
                    type="text"
                    value={editingTemplate.subject || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    placeholder="Receta Médica #{{orderId}}"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Cuerpo del Mensaje (con variables {`{{...}}`})</label>
                  <textarea
                    rows={3}
                    value={editingTemplate.body || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Guardar Plantilla
                  </button>
                </div>
              </form>
            )}

            {/* Template List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.code} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-[#1C2435]">{tpl.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {tpl.code}
                    </span>
                  </div>
                  {tpl.subject && (
                    <p className="text-xs font-semibold text-slate-700">Asunto: {tpl.subject}</p>
                  )}
                  <p className="text-xs text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                    {tpl.body}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>Canal: <strong className="text-slate-700 uppercase">{tpl.channel}</strong></span>
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="text-[#295EF3] hover:underline font-bold cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. PRUEBA DE ENVÍO */}
        {activeTab === 'test' && (
          <form onSubmit={handleSendTestNotification} className="max-w-xl mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-extrabold text-xs text-[#1C2435]">Enviar Notificación de Prueba</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Canal de Envío</label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="email">Email (SMTP)</option>
                  <option value="whatsapp">WhatsApp (Cloud API)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Destinatario</label>
                <input
                  type="text"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder={testChannel === 'email' ? 'ejemplo@correo.com' : '+5491123456789'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>
            </div>

            {testChannel === 'email' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Asunto</label>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cuerpo del Mensaje</label>
              <textarea
                rows={3}
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                required
              />
            </div>

            {/* Test variables preview */}
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-900 block mb-1 uppercase">Valores de Variables de Prueba</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(testVariables).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 text-[11px]">
                    <span className="font-mono text-indigo-700">{`{{${k}}}`}:</span>
                    <input
                      type="text"
                      value={v}
                      onChange={(e) => setTestVariables({ ...testVariables, [k]: e.target.value })}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#295EF3] hover:bg-[#1C2435] text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>Ejecutar Envío de Prueba</span>
            </button>
          </form>
        )}

        {/* 4. HISTORIAL DE LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-xs text-[#1C2435]">Historial de Envíos (Audit Logs)</h3>
              <button
                onClick={fetchInitialData}
                className="text-xs text-[#295EF3] font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Actualizar Logs</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No hay registros de notificaciones enviadas aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Canal</th>
                      <th className="py-2 px-3">Destinatario</th>
                      <th className="py-2 px-3">Mensaje / Plantilla</th>
                      <th className="py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 uppercase font-bold text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full ${
                            log.channel === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">{log.recipient}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-600" title={log.body}>
                          {log.templateCode ? `[${log.templateCode}] ${log.body}` : log.body}
                        </td>
                        <td className="py-2.5 px-3">
                          {log.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <Check className="h-3 w-3" /> Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[11px]" title={log.error}>
                              <AlertCircle className="h-3 w-3" /> Fallido
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
