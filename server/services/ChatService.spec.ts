/**
 * File: ChatService.spec.ts
 * Task: US-006 / T-004
 * Date: 2026-09-16
 * Decisions: Mock repositories to verify server aggregation without a database connection.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { ChatService } from './ChatService.js';

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
