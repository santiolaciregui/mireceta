/**
 * File: ChatService.spec.ts
 * Task: US-006 / T-004
 * Date: 2026-09-16
 * Decisions: Mock repositories to verify server aggregation without a database connection.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { ChatService } from './ChatService.js';
import { Patient } from '../models/Patient.js';

test('orders a newer request without messages before a conversation with an older message', async () => {
  const service: any = new ChatService();
  service.patientRepo = {
    findByTenant: async () => [
      {
        dni: '11111111',
        name: 'Paciente',
        lastName: 'Con mensaje',
        tenantId: 'TEN-TEST',
        messages: [{
          id: 'MSG-OLD',
          sender: 'paciente',
          senderName: 'Paciente',
          text: 'Mensaje anterior',
          timestamp: '2026-09-11T18:21:00.000Z',
        }],
        createdAt: '2026-09-01T10:00:00.000Z',
      },
      {
        dni: '22222222',
        name: 'Paciente',
        lastName: 'Solicitud nueva',
        tenantId: 'TEN-TEST',
        messages: [],
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ],
  };
  service.orderRepo = {
    findByTenant: async () => [
      {
        id: 'REC-NEW',
        patientDni: '22222222',
        patientName: 'Paciente',
        patientLastName: 'Solicitud nueva',
        tenantId: 'TEN-TEST',
        medicationText: 'Medication',
        createdAt: '2026-09-16T16:04:00.000Z',
        messages: [],
      },
    ],
  };

  const conversations = await service.getConversations({
    role: 'colaborador',
    tenantId: 'TEN-TEST',
  });

  assert.deepEqual(conversations.map((conversation: any) => conversation.cleanDni), [
    '22222222',
    '11111111',
  ]);
  assert.equal(conversations[0].lastMessageAt, '2026-09-16T16:04:00.000Z');
  assert.equal(conversations[1].lastMessageAt, '2026-09-11T18:21:00.000Z');
});

test('serializes patient chat messages without Mongoose parent references or repeated attachments', async () => {
  const attachment = 'data:image/png;base64,' + 'A'.repeat(1024);
  const patient = new Patient({
    id: 'PAT-TEST',
    dni: '12345678',
    name: 'Paciente',
    tenantId: 'TEN-TEST',
    messages: Array.from({ length: 8 }, (_, index) => ({
      id: `MSG-${index}`,
      sender: index % 2 === 0 ? 'paciente' : 'medico',
      senderName: index % 2 === 0 ? 'Paciente' : 'Profesional',
      timestamp: `2026-10-08T10:00:0${index}.000Z`,
      fileUrl: attachment,
      replyTo: index === 1 ? { id: 'MSG-0', senderName: 'Profesional', text: 'Respuesta' } : undefined
    }))
  });
  const service: any = new ChatService();
  service.patientRepo = {
    findByDni: async () => patient,
    findSummaryByDni: async () => patient
  };
  service.orderRepo = {
    findByPatientDnis: async () => [],
    findSummariesByPatientDnis: async () => []
  };
  const user = { role: 'paciente', identifier: '12345678', tenantId: 'TEN-TEST', dependents: [] };

  const detail = await service.getConversations(user);
  const detailJson = JSON.stringify(detail);
  assert.equal(detail[0].messages.length, 8);
  assert.equal(detailJson.split(attachment).length - 1, 8);
  assert.equal(detailJson.includes('__parentArray'), false);
  assert.equal(detail[0].messages[1].senderName, 'mireceta.online');
  assert.equal(detail[0].messages[1].replyTo.senderName, 'mireceta.online');

  const summaries = await service.getConversations(user, true);
  const summaryJson = JSON.stringify(summaries);
  assert.equal(summaries[0].messages.length, 8);
  assert.equal(summaryJson.includes(attachment), false);
  assert.equal(summaryJson.includes('fileUrl'), false);
});
