/**
 * File: AudioRejection.spec.ts
 * Date: 2026-09-17
 * Decisions: Verify automatic audio rejection message generation and persistence for WhatsApp inbound webhooks and web chat.
 */

import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import {
  NotificationService,
  DEFAULT_AUDIO_REJECTION_MESSAGE,
  AUDIO_NOT_SUPPORTED_TEMPLATE_CODE
} from '../NotificationService.js';
import { ChatService } from '../ChatService.js';
import { auditLogService } from '../AuditLogService.js';

const originalAuditLog = auditLogService.log;
beforeEach(() => {
  auditLogService.log = async () => undefined;
});
afterEach(() => {
  auditLogService.log = originalAuditLog;
});

test('NotificationService.getAudioRejectionMessage returns default message with patient name', async () => {
  const service = new NotificationService() as any;
  service.templateRepo = {
    findByTenantAndCode: async () => null
  };
  service.configRepo = {
    findByTenantAndChannel: async () => null
  };

  const msg = await service.getAudioRejectionMessage('TEN-0001', 'Juan Pérez');
  assert.equal(
    msg,
    'Hola Juan Pérez, por el momento no podemos procesar mensajes ni notas de audio. Por favor, enviá tu consulta por escrito como texto para que podamos ayudarte.'
  );

  const defaultMsg = await service.getAudioRejectionMessage('TEN-0001');
  assert.equal(defaultMsg, DEFAULT_AUDIO_REJECTION_MESSAGE);
});

test('NotificationService.getAudioRejectionMessage uses custom template when available', async () => {
  const service = new NotificationService() as any;
  service.templateRepo = {
    findByTenantAndCode: async (_tenant: string, code: string) => {
      if (code === AUDIO_NOT_SUPPORTED_TEMPLATE_CODE) {
        return {
          isActive: true,
          body: 'Estimado/a {{patientName}}, no escuchamos audios. Por favor escribinos por texto.'
        };
      }
      return null;
    }
  };
  service.configRepo = {
    findByTenantAndChannel: async () => null
  };

  const msg = await service.getAudioRejectionMessage('TEN-0001', 'María');
  assert.equal(msg, 'Estimado/a María, no escuchamos audios. Por favor escribinos por texto.');
});

test('NotificationService.processInboundWhatsAppPayload replies with rejection message when receiving audio', async () => {
  const service = new NotificationService() as any;

  const mockPatient = {
    id: 'PAT-0001',
    dni: '5491112345678',
    name: 'Carlos Gomez',
    phone: '5491112345678',
    tenantId: 'TEN-0001',
    messages: [] as any[],
    lastPatientWhatsAppInteractionAt: '',
    save: async () => {}
  };

  const mockOrder = {
    id: 'REC-100',
    patientDni: '5491112345678',
    patientPhone: '5491112345678',
    messages: [] as any[],
    lastPatientWhatsAppInteractionAt: ''
  };

  service.patientRepo = {
    findByPhone: async () => [mockPatient]
  };

  const updatedOrders: any[] = [];
  service.orderRepo = {
    findByPatientPhone: async () => [mockOrder],
    update: async (id: string, data: any) => {
      updatedOrders.push({ id, ...data });
    }
  };

  const sentNotifications: any[] = [];
  service.sendNotification = async (payload: any) => {
    sentNotifications.push(payload);
    return { success: true };
  };

  service.templateRepo = {
    findByTenantAndCode: async () => null
  };
  service.configRepo = {
    findByTenantAndChannel: async () => null
  };

  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: '5491112345678', profile: { name: 'Carlos Gomez' } }],
              messages: [
                {
                  from: '5491112345678',
                  id: 'wamid.HBgLM...',
                  type: 'audio',
                  audio: { id: 'media-audio-123', mime_type: 'audio/ogg; codecs=opus' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  // Mock download media to prevent external fetch
  service.downloadInboundWhatsAppMedia = async () => null;

  const result = await service.processInboundWhatsAppPayload(webhookPayload);
  assert.equal(result.success, true);
  assert.equal(result.processedMessages, 1);

  // Check that WhatsApp response was dispatched
  assert.equal(sentNotifications.length, 1);
  assert.equal(sentNotifications[0].channel, 'whatsapp');
  assert.equal(sentNotifications[0].to, '5491112345678');
  assert.match(sentNotifications[0].body, /no podemos procesar mensajes ni notas de audio/i);

  // Check that both the patient message and the system reply were persisted
  assert.equal(mockPatient.messages.length, 2);
  assert.equal(mockPatient.messages[0].sender, 'paciente');
  assert.equal(mockPatient.messages[0].fileType, 'audio');
  assert.equal(mockPatient.messages[1].sender, 'sistema');
  assert.match(mockPatient.messages[1].text, /no podemos procesar mensajes ni notas de audio/i);

  // Check that order messages were updated with both messages
  assert.equal(mockOrder.messages.length, 2);
  assert.equal(mockOrder.messages[1].sender, 'sistema');
});

test('NotificationService.processInboundWhatsAppPayload does NOT send audio rejection for text message', async () => {
  const service = new NotificationService() as any;

  const mockPatient = {
    id: 'PAT-0002',
    dni: '5491199999999',
    name: 'Ana Martinez',
    phone: '5491199999999',
    tenantId: 'TEN-0001',
    messages: [] as any[],
    lastPatientWhatsAppInteractionAt: '',
    save: async () => {}
  };

  service.patientRepo = {
    findByPhone: async () => [mockPatient]
  };

  service.orderRepo = {
    findByPatientPhone: async () => [],
    update: async () => {}
  };

  const sentNotifications: any[] = [];
  service.sendNotification = async (payload: any) => {
    sentNotifications.push(payload);
    return { success: true };
  };

  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: '5491199999999', profile: { name: 'Ana Martinez' } }],
              messages: [
                {
                  from: '5491199999999',
                  id: 'wamid.text123',
                  type: 'text',
                  text: { body: 'Hola, necesito renovar mi receta' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const result = await service.processInboundWhatsAppPayload(webhookPayload);
  assert.equal(result.success, true);
  assert.equal(result.processedMessages, 1);

  // No rejection notification sent
  assert.equal(sentNotifications.length, 0);
  assert.equal(mockPatient.messages.length, 1);
  assert.equal(mockPatient.messages[0].sender, 'paciente');
  assert.equal(mockPatient.messages[0].text, 'Hola, necesito renovar mi receta');
});

test('ChatService.sendMessage responds with system rejection when a patient sends audio in web chat', async () => {
  const chatService = new ChatService() as any;
  chatService.notificationService = {
    getAudioRejectionMessage: async (_t: string, name?: string) =>
      `Hola ${name || ''}, por el momento no podemos procesar mensajes ni notas de audio. Por favor, enviá tu consulta por escrito como texto para que podamos ayudarte.`,
    sendDoctorInquiryWhatsApp: async () => ({ success: true })
  };

  const mockPatientDoc = {
    dni: '12345678',
    name: 'Laura',
    lastName: 'Fernandez',
    tenantId: 'TEN-0001',
    messages: [] as any[],
    lastPatientWhatsAppInteractionAt: '',
    save: async () => {}
  };

  const mockOrder = {
    id: 'REC-200',
    patientDni: '12345678',
    messages: [] as any[],
    lastPatientWhatsAppInteractionAt: ''
  };

  chatService.patientRepo = {
    findByDni: async () => mockPatientDoc
  };

  chatService.orderRepo = {
    findByTenant: async () => [mockOrder],
    update: async (id: string, data: any) => {
      Object.assign(mockOrder, data);
    }
  };

  // Mock getPatientChat to return the latest state
  chatService.getPatientChat = async () => ({
    patientDni: '12345678',
    messages: mockPatientDoc.messages
  });

  const currentUser = {
    id: 'USR-PAT-1',
    identifier: '12345678',
    role: 'paciente',
    name: 'Laura',
    lastName: 'Fernandez',
    tenantId: 'TEN-0001'
  };

  const audioMessagePayload = {
    fileType: 'audio' as const,
    fileUrl: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USA==',
    fileName: 'Nota_de_voz.mp3',
    audioDuration: 5
  };

  const result = await chatService.sendMessage('12345678', audioMessagePayload, currentUser);

  // Both patient audio message and system reply should be stored in patient doc
  assert.equal(mockPatientDoc.messages.length, 2);
  assert.equal(mockPatientDoc.messages[0].sender, 'paciente');
  assert.equal(mockPatientDoc.messages[0].fileType, 'audio');

  assert.equal(mockPatientDoc.messages[1].sender, 'sistema');
  assert.match(mockPatientDoc.messages[1].text, /no podemos procesar mensajes ni notas de audio/i);

  // Result messages should contain both
  assert.equal(result.messages.length, 2);
  assert.equal(mockOrder.messages.length, 2);
});

test('ChatService.sendMessage does NOT auto-reply when staff (medico) sends audio', async () => {
  const chatService = new ChatService() as any;
  chatService.notificationService = {
    getAudioRejectionMessage: async (_t: string, name?: string) =>
      `Hola ${name || ''}, por el momento no podemos procesar mensajes ni notas de audio. Por favor, enviá tu consulta por escrito como texto para que podamos ayudarte.`,
    sendDoctorInquiryWhatsApp: async () => ({ success: true })
  };

  const mockPatientDoc = {
    dni: '12345678',
    name: 'Laura',
    phone: '5491112345678',
    messages: [] as any[],
    save: async () => {}
  };

  chatService.patientRepo = {
    findByDni: async () => mockPatientDoc
  };

  chatService.orderRepo = {
    findByTenant: async () => [],
    update: async () => {}
  };

  chatService.getPatientChat = async () => ({
    messages: mockPatientDoc.messages
  });

  const doctorUser = {
    id: 'USR-DOC-1',
    identifier: 'DOC-123',
    role: 'medico',
    name: 'Dr. Martin',
    lastName: 'Perez',
    tenantId: 'TEN-0001'
  };

  const audioMessagePayload = {
    fileType: 'audio' as const,
    fileUrl: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USA==',
    fileName: 'Indicaciones.mp3'
  };

  await chatService.sendMessage('12345678', audioMessagePayload, doctorUser);

  // Only the doctor's audio message is in messages (no system auto-rejection)
  assert.equal(mockPatientDoc.messages.length, 1);
  assert.equal(mockPatientDoc.messages[0].sender, 'medico');
});

test('NotificationService.processInboundWhatsAppPayload creates new patient with parsed name and lastName when not registered', async () => {
  const service = new NotificationService() as any;

  let createdPatientData: any = null;
  service.patientRepo = {
    findByPhone: async () => [],
    findByTenant: async () => [],
    create: async (data: any) => {
      createdPatientData = data;
      return { ...data, save: async () => {} };
    }
  };

  service.orderRepo = {
    findByPatientPhone: async () => []
  };

  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: '5492926414331', profile: { name: 'Santi Olaciregui' } }],
              messages: [
                {
                  from: '5492926414331',
                  id: 'wamid.HBgLMS...',
                  type: 'text',
                  text: { body: 'hola' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const result = await service.processInboundWhatsAppPayload(webhookPayload);
  assert.equal(result.success, true);
  assert.equal(result.processedMessages, 1);

  assert.ok(createdPatientData);
  assert.equal(createdPatientData.dni, '5492926414331');
  assert.equal(createdPatientData.name, 'Santi');
  assert.equal(createdPatientData.lastName, 'Olaciregui');
  assert.equal(createdPatientData.phone, '5492926414331');
  assert.equal(createdPatientData.messages.length, 1);
  assert.equal(createdPatientData.messages[0].text, 'hola');
  assert.equal(createdPatientData.messages[0].sender, 'paciente');
  assert.ok(createdPatientData.lastPatientWhatsAppInteractionAt);
});

test('NotificationService.processInboundWhatsAppPayload handles single name profile without error', async () => {
  const service = new NotificationService() as any;

  let createdPatientData: any = null;
  service.patientRepo = {
    findByPhone: async () => [],
    findByTenant: async () => [],
    create: async (data: any) => {
      createdPatientData = data;
      return { ...data, save: async () => {} };
    }
  };

  service.orderRepo = {
    findByPatientPhone: async () => []
  };

  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: '5491100001111', profile: { name: 'Florencia' } }],
              messages: [
                {
                  from: '5491100001111',
                  id: 'wamid.HBgLMS2...',
                  type: 'text',
                  text: { body: 'buenas tardes' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const result = await service.processInboundWhatsAppPayload(webhookPayload);
  assert.equal(result.success, true);
  assert.equal(result.processedMessages, 1);

  assert.ok(createdPatientData);
  assert.equal(createdPatientData.name, 'Florencia');
  assert.equal(createdPatientData.lastName, '');
  assert.equal(createdPatientData.messages.length, 1);
  assert.equal(createdPatientData.messages[0].text, 'buenas tardes');
});
