import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChatMessage } from '../../../types';
import {
  mergeChatMessages,
  reconcileOptimisticMessages,
} from './optimisticMessages';
import type { OptimisticChatMessage } from './optimisticMessages';

const confirmedMessage: ChatMessage = {
  id: 'confirmed-1',
  sender: 'paciente',
  senderName: 'Paciente',
  text: 'Mensaje confirmado',
  timestamp: '2026-09-16T12:00:00.000Z',
};

const optimisticMessage: OptimisticChatMessage = {
  id: 'optimistic-1',
  sender: 'medico',
  senderName: 'Doctora',
  text: 'Mensaje en curso',
  timestamp: '2026-09-16T12:01:00.000Z',
  localDeliveryState: 'sending',
};

describe('optimistic chat messages', () => {
  it('keeps an outgoing image when its server summary arrives before media details', () => {
    const outgoing = { ...optimisticMessage, fileType: 'image' as const, fileUrl: 'data:image/jpeg;base64,AA==' };
    const summary = { ...confirmedMessage, id: outgoing.id, fileType: 'image' as const };
    const result = mergeChatMessages([summary], [outgoing]);
    assert.equal(result[0].fileUrl, outgoing.fileUrl);
    assert.equal((result[0] as Partial<OptimisticChatMessage>).localDeliveryState, undefined);
    assert.equal(reconcileOptimisticMessages([outgoing], new Set([outgoing.id]), new Set()).length, 1);
    assert.equal(reconcileOptimisticMessages([outgoing], new Set([outgoing.id]), new Set([outgoing.id])).length, 0);
  });

  it('does not overwrite media details with a duplicate order summary', () => {
    const detailed = { ...confirmedMessage, fileUrl: 'photo-url' };
    assert.equal(mergeChatMessages([detailed, confirmedMessage], [])[0].fileUrl, 'photo-url');
  });

  it('keeps an outgoing message visible while the server has not confirmed it', () => {
    const result = mergeChatMessages([confirmedMessage], [optimisticMessage]);

    assert.deepEqual(result.map((message) => message.id), ['confirmed-1', 'optimistic-1']);
    assert.equal((result[1] as OptimisticChatMessage).localDeliveryState, 'sending');
  });

  it('uses the server version once the same message id is confirmed', () => {
    const serverVersion: ChatMessage = {
      ...optimisticMessage,
      status: 'delivered',
    };
    delete (serverVersion as Partial<OptimisticChatMessage>).localDeliveryState;

    const result = mergeChatMessages([serverVersion], [optimisticMessage]);

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'delivered');
    assert.equal((result[0] as Partial<OptimisticChatMessage>).localDeliveryState, undefined);
  });

  it('removes only messages observed in a confirmed server snapshot', () => {
    const failedMessage: OptimisticChatMessage = {
      ...optimisticMessage,
      id: 'optimistic-2',
      localDeliveryState: 'failed',
    };

    const result = reconcileOptimisticMessages(
      [optimisticMessage, failedMessage],
      new Set([optimisticMessage.id])
    );

    assert.deepEqual(result, [failedMessage]);
  });
});
