import type { ChatMessage, MedicalOrder } from '../types';
import { formatWhatsAppPhone } from '../../server/utils/formatters';
import { compareActivityTimestampsDesc } from './activityOrdering';

export const CHAT_READ_KEY = 'chat_read_timestamps';
export const CHAT_READ_EVENT = 'chat-read-updated';
export const cleanChatDni = (dni?: string) => (dni || '').replace(/\D/g, '');

export function readChatTimestamps(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_READ_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function getUnreadMessageCount(messages: ChatMessage[], readAt: number | undefined, isPatient: boolean): number {
  const incoming = (message: ChatMessage) => isPatient ? message.sender !== 'paciente' : message.sender === 'paciente';
  const sorted = [...messages].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (readAt) return sorted.filter(message => incoming(message) && Date.parse(message.timestamp) > readAt).length;
  let count = 0;
  for (let i = sorted.length - 1; i >= 0 && incoming(sorted[i]); i--) count++;
  return count;
}

export function compareChatConversations(
  a: { messages: unknown[]; lastTimestamp: string; name?: string; lastName?: string },
  b: { messages: unknown[]; lastTimestamp: string; name?: string; lastName?: string },
): number {
  return Number(b.messages.length > 0) - Number(a.messages.length > 0)
    || compareActivityTimestampsDesc(a.lastTimestamp, b.lastTimestamp)
    || `${a.lastName || ''} ${a.name || ''}`.localeCompare(`${b.lastName || ''} ${b.name || ''}`, 'es-AR');
}

// Prefer the request's patient when a family shares a phone. A phone match
// takes precedence over a DNI whose current contact belongs to another number.
export function resolveChatTarget<T extends { cleanDni: string; phone: string }>(
  target: string, orders: MedicalOrder[], conversations: T[],
): T | undefined {
  const order = orders.find(item => item.id === target);
  const dni = cleanChatDni(order?.patientDni || target);
  const direct = conversations.find(item => item.cleanDni === dni);
  const phone = formatWhatsAppPhone(order?.patientPhone || order?.requestedByTitularPhone);
  if (!phone) return direct;
  const matches = conversations.filter(item => formatWhatsAppPhone(item.phone) === phone);
  return matches.find(item => item.cleanDni === dni)
    || matches.find(item => item.cleanDni === cleanChatDni(order?.requestedByTitularDni))
    || matches[0]
    || direct;
}

export function countUnreadConversations(
  conversations: Array<{ cleanDni?: string; patientDni?: string; messages?: ChatMessage[] }>,
  orders: MedicalOrder[], readAt: Record<string, number>, isPatient: boolean,
): number {
  const byDni = new Map<string, Map<string, ChatMessage>>();
  const add = (dni: string, messages: ChatMessage[] = []) => {
    if (!dni) return;
    const merged = byDni.get(dni) || new Map<string, ChatMessage>();
    for (const message of messages) {
      if (message) merged.set(message.id || `${message.timestamp}:${message.sender}:${message.text}`, message);
    }
    byDni.set(dni, merged);
  };
  for (const conversation of conversations) add(cleanChatDni(conversation.cleanDni || conversation.patientDni), conversation.messages);
  for (const order of orders) add(cleanChatDni(isPatient ? order.requestedByTitularDni || order.patientDni : order.patientDni), order.messages);
  return [...byDni].filter(([dni, messages]) => getUnreadMessageCount([...messages.values()], readAt[dni], isPatient) > 0).length;
}
