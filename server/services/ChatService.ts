import { OrderRepository } from '../repositories/OrderRepository.js';
import { PatientRepository } from '../repositories/PatientRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { NotificationService } from './NotificationService.js';
import { auditLogService } from './AuditLogService.js';

export interface ChatMessageDto {
  id?: string;
  sender?: 'paciente' | 'medico' | 'colaborador' | 'admin' | 'sistema';
  senderName?: string;
  senderRole?: string;
  senderId?: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'audio' | 'text' | 'pdf';
  audioDuration?: number;
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export class ChatService {
  private orderRepo: OrderRepository;
  private patientRepo: PatientRepository;
  private userRepo: UserRepository;
  private notificationService: NotificationService;

  constructor() {
    this.orderRepo = new OrderRepository();
    this.patientRepo = new PatientRepository();
    this.userRepo = new UserRepository();
    this.notificationService = new NotificationService();
  }

  private cleanDni(dni: string): string {
    return (dni || '').replace(/\D/g, '');
  }

  /**
   * Aggregates and returns unique patient conversations for doctors/admins.
   */
  async getConversations(currentUser: any) {
    const tenantId = currentUser?.tenantId || 'TEN-0001';
    const isPatient = currentUser?.role === 'paciente';

    if (isPatient) {
      const patientDniClean = this.cleanDni(currentUser.identifier);
      return [await this.getPatientChat(patientDniClean, currentUser)];
    }

    // Staff view: Fetch all orders and patients
    const orders = await this.orderRepo.findByTenant(tenantId);
    const patients = await this.patientRepo.findByTenant(tenantId);

    const patientMap = new Map<string, any>();

    // 1. Index registered patients
    for (const p of patients) {
      const clean = this.cleanDni(p.dni);
      if (!clean) continue;
      patientMap.set(clean, {
        patientDni: p.dni,
        cleanDni: clean,
        patientName: p.name,
        patientLastName: p.lastName,
        patientPhone: p.phone || '',
        patientEmail: p.email || '',
        obraSocial: p.obraSocial || '',
        obraSocialNumber: p.obraSocialNumber || '',
        ordersCount: 0,
        orders: [],
        latestOrderId: '',
        latestMedicationText: '',
        messages: Array.isArray(p.messages) ? [...p.messages] : [],
        lastPatientWhatsAppInteractionAt: p.lastPatientWhatsAppInteractionAt || ''
      });
    }

    // 2. Index & merge orders
    for (const o of orders) {
      const clean = this.cleanDni(o.patientDni);
      if (!clean) continue;

      let entry = patientMap.get(clean);
      if (!entry) {
        entry = {
          patientDni: o.patientDni,
          cleanDni: clean,
          patientName: o.patientName,
          patientLastName: o.patientLastName,
          patientPhone: o.patientPhone || '',
          patientEmail: o.patientEmail || '',
          obraSocial: o.obraSocial || '',
          obraSocialNumber: o.obraSocialNumber || '',
          ordersCount: 0,
          orders: [],
          latestOrderId: o.id,
          latestMedicationText: o.medicationText || '',
          messages: [],
          lastPatientWhatsAppInteractionAt: o.lastPatientWhatsAppInteractionAt || ''
        };
        patientMap.set(clean, entry);
      }

      entry.ordersCount++;
      entry.orders.push({
        id: o.id,
        status: o.status,
        medicationText: o.medicationText,
        createdAt: o.createdAt
      });

      if (!entry.patientPhone && o.patientPhone) entry.patientPhone = o.patientPhone;
      if (!entry.patientEmail && o.patientEmail) entry.patientEmail = o.patientEmail;
      if (!entry.obraSocial && o.obraSocial) entry.obraSocial = o.obraSocial;
      if (o.id && (!entry.latestOrderId || o.id > entry.latestOrderId)) {
        entry.latestOrderId = o.id;
        entry.latestMedicationText = o.medicationText || '';
      }

      if (Array.isArray(o.messages)) {
        entry.messages.push(...o.messages);
      }

      if (o.lastPatientWhatsAppInteractionAt) {
        if (!entry.lastPatientWhatsAppInteractionAt || o.lastPatientWhatsAppInteractionAt > entry.lastPatientWhatsAppInteractionAt) {
          entry.lastPatientWhatsAppInteractionAt = o.lastPatientWhatsAppInteractionAt;
        }
      }
    }

    // 3. Normalize messages per patient
    const conversations = Array.from(patientMap.values()).map((conv) => {
      const dedupedMessages = this.dedupeAndSortMessages(conv.messages);
      const lastMsg = dedupedMessages.length > 0 ? dedupedMessages[dedupedMessages.length - 1] : null;
      const isFromPatient = lastMsg?.sender === 'paciente';

      return {
        ...conv,
        messages: dedupedMessages,
        messagesCount: dedupedMessages.length,
        lastMessage: lastMsg,
        hasPatientReplied: isFromPatient,
        lastMessageAt: lastMsg?.timestamp || conv.lastPatientWhatsAppInteractionAt || conv.orders?.[0]?.createdAt || new Date().toISOString()
      };
    });

    // Sort by latest message/interaction descending
    conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return conversations;
  }

  /**
   * Retrieves unified chat history for a specific patient DNI.
   */
  async getPatientChat(dni: string, currentUser: any) {
    const cleanDni = this.cleanDni(dni);
    if (!cleanDni) throw new Error('DNI del paciente es requerido');

    if (currentUser?.role === 'paciente') {
      const userDniClean = this.cleanDni(currentUser.identifier);
      if (userDniClean !== cleanDni) {
        throw new Error('No tienes autorización para acceder a la conversación de otro paciente.');
      }
    }

    const tenantId = currentUser?.tenantId || 'TEN-0001';
    const patientDoc = await this.patientRepo.findByDni(cleanDni, tenantId);
    const orders = await this.orderRepo.findByTenant(tenantId);
    const patientOrders = orders.filter((o) => this.cleanDni(o.patientDni) === cleanDni);

    let allMessages: any[] = [];
    if (patientDoc && Array.isArray(patientDoc.messages)) {
      allMessages.push(...patientDoc.messages);
    }
    for (const o of patientOrders) {
      if (Array.isArray(o.messages)) {
        allMessages.push(...o.messages);
      }
    }

    const dedupedMessages = this.dedupeAndSortMessages(allMessages);
    const latestOrder = patientOrders[0];

    return {
      patientDni: dni,
      cleanDni,
      patientName: patientDoc?.name || latestOrder?.patientName || 'Paciente',
      patientLastName: patientDoc?.lastName || latestOrder?.patientLastName || '',
      patientPhone: patientDoc?.phone || latestOrder?.patientPhone || '',
      patientEmail: patientDoc?.email || latestOrder?.patientEmail || '',
      obraSocial: patientDoc?.obraSocial || latestOrder?.obraSocial || '',
      obraSocialNumber: patientDoc?.obraSocialNumber || latestOrder?.obraSocialNumber || '',
      ordersCount: patientOrders.length,
      latestOrderId: latestOrder?.id || '',
      latestMedicationText: latestOrder?.medicationText || '',
      orders: patientOrders.map(o => ({ id: o.id, status: o.status, medicationText: o.medicationText, createdAt: o.createdAt })),
      messages: dedupedMessages,
      lastPatientWhatsAppInteractionAt: patientDoc?.lastPatientWhatsAppInteractionAt || latestOrder?.lastPatientWhatsAppInteractionAt || ''
    };
  }

  /**
   * Sends a message to a patient, persisting it in the patient conversation and dispatching to WhatsApp.
   */
  async sendMessage(dniOrOrderId: string, messageData: ChatMessageDto, currentUser: any) {
    let cleanDni = this.cleanDni(dniOrOrderId);
    const tenantId = currentUser?.tenantId || 'TEN-0001';
    let targetOrder: any = null;

    // If identifier starts with REC- or not digits only, resolve order
    if (dniOrOrderId.toUpperCase().startsWith('REC-') || !cleanDni || cleanDni.length < 5) {
      targetOrder = await this.orderRepo.findById(dniOrOrderId);
      if (targetOrder) {
        cleanDni = this.cleanDni(targetOrder.patientDni);
      }
    }

    if (!cleanDni) {
      throw new Error('DNI o Pedido de paciente no válido');
    }

    if (currentUser.role === 'paciente') {
      const userDniClean = this.cleanDni(currentUser.identifier);
      if (userDniClean !== cleanDni) {
        throw new Error('Acceso no autorizado.');
      }
    }

    const newMessage: any = {
      id: messageData.id || `msg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      sender: currentUser.role === 'paciente' ? 'paciente' : (currentUser.role === 'medico' ? 'medico' : (currentUser.role === 'admin' ? 'admin' : 'colaborador')),
      senderName: `${currentUser.name || ''} ${currentUser.lastName || ''}`.trim() || (currentUser.role === 'paciente' ? 'Paciente' : 'Equipo Médico'),
      senderId: currentUser.id || currentUser.identifier,
      senderRole: currentUser.role,
      timestamp: messageData.timestamp || new Date().toISOString(),
      status: 'sent',
      ...(messageData.text ? { text: messageData.text } : {}),
      ...(messageData.fileUrl ? { fileUrl: messageData.fileUrl } : {}),
      ...(messageData.fileName ? { fileName: messageData.fileName } : {}),
      ...(messageData.fileType ? { fileType: messageData.fileType } : (messageData.fileUrl?.startsWith('data:audio') || messageData.fileUrl?.includes('AUDIO_NOTE') ? { fileType: 'audio' } : (messageData.fileUrl ? { fileType: 'image' } : {}))),
      ...(messageData.audioDuration ? { audioDuration: messageData.audioDuration } : {}),
      ...(messageData.replyTo ? { replyTo: messageData.replyTo } : {})
    };

    const nowIso = new Date().toISOString();

    // 1. Update/Create Patient document
    let patientDoc = await this.patientRepo.findByDni(cleanDni, tenantId);
    if (patientDoc) {
      const currentMessages = Array.isArray(patientDoc.messages) ? patientDoc.messages : [];
      patientDoc.messages = [...currentMessages, newMessage];
      if (currentUser.role === 'paciente') {
        patientDoc.lastPatientWhatsAppInteractionAt = nowIso;
      }
      await patientDoc.save();
    }

    // 2. Update all orders belonging to this patient
    const orders = await this.orderRepo.findByTenant(tenantId);
    const patientOrders = orders.filter((o) => this.cleanDni(o.patientDni) === cleanDni);

    for (const ord of patientOrders) {
      const currentMessages = Array.isArray(ord.messages) ? ord.messages : [];
      ord.messages = [...currentMessages, newMessage];
      if (currentUser.role === 'paciente') {
        ord.lastPatientWhatsAppInteractionAt = nowIso;
      }
      await this.orderRepo.update(ord.id, {
        messages: ord.messages,
        lastPatientWhatsAppInteractionAt: ord.lastPatientWhatsAppInteractionAt
      });
    }

    // 3. WhatsApp dispatch logic (if message sent by doctor/colaborador/admin to patient)
    if (currentUser.role !== 'paciente') {
      const recipientPhone = patientDoc?.phone || patientOrders[0]?.patientPhone || targetOrder?.patientPhone;
      const patientFullName = `${patientDoc?.name || patientOrders[0]?.patientName || 'Paciente'} ${patientDoc?.lastName || patientOrders[0]?.patientLastName || ''}`.trim();
      const orderRef = patientOrders[0]?.id || targetOrder?.id || 'REC';

      if (recipientPhone) {
        try {
          const isWithin24h = this.notificationService.isWithinWhatsApp24hWindow(patientDoc || patientOrders[0]);
          const messageText = messageData.text || (messageData.fileType === 'audio' ? 'Nota de voz adjunta' : 'Archivo adjunto enviado');

          if (isWithin24h) {
            await this.notificationService.sendNotification({
              tenantId,
              channel: 'whatsapp',
              to: recipientPhone,
              body: `[Consulta Dr. ${currentUser.name} - Mi Receta Online]\n${messageText}`
            });
          } else {
            const waConfig = await this.notificationService.getConfig(tenantId, 'whatsapp');
            const templateCode = (waConfig?.credentials?.doctorInquiryTemplateCode || waConfig?.credentials?.templateCode) as string | undefined;

            await this.notificationService.sendNotification({
              tenantId,
              channel: 'whatsapp',
              to: recipientPhone,
              templateCode: templateCode || undefined,
              variables: templateCode ? {
                patientName: patientFullName,
                doctorName: `${currentUser.name} ${currentUser.lastName}`,
                orderId: orderRef,
                messagePreview: messageText.substring(0, 60)
              } : undefined,
              body: `Hola ${patientFullName}, el Dr. ${currentUser.name} envió una consulta sobre su receta #${orderRef}: "${messageText.substring(0, 80)}...". Por favor responda a este WhatsApp para continuar la conversación directa.`
            });
          }
        } catch (waErr) {
          console.error('Error al despachar mensaje de WhatsApp al paciente:', waErr);
        }
      }

      await auditLogService.log({
        tenantId,
        currentUser,
        action: 'ORDER_CHAT_MESSAGE',
        entity: 'Patient',
        entityId: cleanDni,
        details: `Médico ${currentUser.name} ${currentUser.lastName} envió mensaje a paciente DNI ${cleanDni}: "${(newMessage.text || '').substring(0, 50)}"`
      });
    } else {
      await auditLogService.log({
        tenantId,
        currentUser,
        action: 'ORDER_CHAT_MESSAGE',
        entity: 'Patient',
        entityId: cleanDni,
        details: `Mensaje recibido de paciente DNI ${cleanDni}: "${(newMessage.text || '').substring(0, 50)}"`
      });
    }

    // Return unified chat state
    return this.getPatientChat(cleanDni, currentUser);
  }

  private dedupeAndSortMessages(messages: any[]): any[] {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const msg of messages) {
      if (!msg) continue;
      const key = msg.id || `${msg.timestamp}-${msg.sender}-${msg.text || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(msg);
      }
    }

    result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return result;
  }
}

export const chatService = new ChatService();
