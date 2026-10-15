import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChatMessage, MedicalOrder } from '../types';
import { compareChatConversations, countUnreadConversations, getUnreadMessageCount, resolveChatTarget } from './chatInbox';

const message = (id: string, sender = 'paciente', timestamp = '2026-10-14T20:00:00Z') => ({ id, sender, timestamp, text: id } as ChatMessage);
const order = (values: Partial<MedicalOrder>) => ({ id: 'REC-2536', patientDni: '13970145', patientPhone: '2926412748', ...values } as MedicalOrder);

describe('chat inbox', () => {
  it('places initiated conversations last, preserving newest activity within each group', () => {
    const items = [
      { name: 'Empty new', messages: [], lastTimestamp: '2026-10-14T23:00:00Z' },
      { name: 'Older chat', messages: [message('1')], lastTimestamp: '2026-10-13T20:00:00Z' },
      { name: 'Recent chat', messages: [message('2')], lastTimestamp: '2026-10-14T20:00:00Z' },
      { name: 'Empty old', messages: [], lastTimestamp: '2026-10-12T20:00:00Z' },
    ];
    assert.deepEqual(items.sort(compareChatConversations).map(item => item.name), ['Recent chat', 'Older chat', 'Empty new', 'Empty old']);
  });

  it('counts patient-only history without requests and deduplicates request messages', () => {
    const incoming = message('in');
    assert.equal(countUnreadConversations([
      { cleanDni: '111', messages: [incoming, incoming] },
      { cleanDni: '222', messages: [message('other')] },
      { cleanDni: '333', messages: [] },
    ], [order({ patientDni: '111', messages: [incoming] })], {}, false), 2);
  });

  it('clears the badge after reading and restores it only for a newer incoming message', () => {
    const readAt = Date.parse('2026-10-14T20:01:00Z');
    const conversation = { cleanDni: '111', messages: [message('old')] };
    assert.equal(countUnreadConversations([conversation], [], { '111': readAt }, false), 0);
    conversation.messages.push(message('new', 'paciente', '2026-10-14T20:02:00Z'));
    assert.equal(countUnreadConversations([conversation], [], { '111': readAt }, false), 1);
  });

  it('uses the correct incoming direction and timestamps for patient accounts', () => {
    assert.equal(getUnreadMessageCount([message('out')], undefined, true), 0);
    assert.equal(getUnreadMessageCount([message('in', 'medico')], undefined, true), 1);
    assert.equal(getUnreadMessageCount([message('in', 'medico')], Date.parse('2026-10-14T21:00:00Z'), true), 0);
  });

  it('preserves the trailing incoming-message fallback for previously unread chats', () => {
    assert.equal(getUnreadMessageCount([message('1'), message('2', 'medico', '2026-10-14T20:01:00Z')], undefined, false), 0);
    assert.equal(getUnreadMessageCount([message('1', 'medico'), message('2', 'paciente', '2026-10-14T20:01:00Z')], undefined, false), 1);
  });

  it('matches local and international phones without selecting the first family member', () => {
    const maria = { cleanDni: '36698433', phone: '+54 9 2926 412748' };
    const jose = { cleanDni: '13970145', phone: '02926 412748' };
    assert.equal(resolveChatTarget('REC-2536', [order({})], [maria, jose]), jose);
  });

  it('selects the associated phone when the patient DNI points at a different contact', () => {
    const stale = { cleanDni: '13970145', phone: '2926000000' };
    const correct = { cleanDni: '5492926412748', phone: '+54 9 2926 412748' };
    assert.equal(resolveChatTarget('REC-2536', [order({})], [stale, correct]), correct);
  });

  it('keeps dependent requests under the actual patient when their phone matches', () => {
    const titular = { cleanDni: '10000000', phone: '2926412748' };
    const dependent = { cleanDni: '13970145', phone: '2926412748' };
    assert.equal(resolveChatTarget('REC-2536', [order({ requestedByTitularDni: titular.cleanDni, isForDependent: true })], [titular, dependent]), dependent);
  });

  it('accepts a direct formatted DNI and leaves unresolved targets pending', () => {
    const conversation = { cleanDni: '13970145', phone: '' };
    assert.equal(resolveChatTarget('13.970.145', [], [conversation]), conversation);
    assert.equal(resolveChatTarget('REC-2536', [], [conversation]), undefined);
    assert.equal(resolveChatTarget('REC-2536', [order({ patientPhone: '' })], [conversation]), conversation);
  });
});
