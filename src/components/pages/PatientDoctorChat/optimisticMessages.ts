import type { ChatMessage } from '../../../types';

export type LocalDeliveryState = 'sending' | 'failed';

export type OptimisticChatMessage = ChatMessage & {
  localDeliveryState: LocalDeliveryState;
};

export function mergeChatMessages(
  confirmedMessages: ChatMessage[],
  optimisticMessages: OptimisticChatMessage[]
): ChatMessage[] {
  const messagesById = new Map<string, ChatMessage>();

  for (const message of confirmedMessages) {
    const previous = messagesById.get(message.id);
    messagesById.set(message.id, { ...message, fileUrl: message.fileUrl || previous?.fileUrl });
  }

  for (const message of optimisticMessages) {
    if (!messagesById.has(message.id)) {
      messagesById.set(message.id, message);
    } else if (message.fileUrl) {
      const confirmed = messagesById.get(message.id)!;
      messagesById.set(message.id, { ...confirmed, fileUrl: confirmed.fileUrl || message.fileUrl });
    }
  }

  return Array.from(messagesById.values()).sort(
    (first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
  );
}

export function reconcileOptimisticMessages(
  optimisticMessages: OptimisticChatMessage[],
  confirmedMessageIds: Set<string>,
  confirmedMediaIds: Set<string> = confirmedMessageIds
): OptimisticChatMessage[] {
  return optimisticMessages.filter((message) =>
    !confirmedMessageIds.has(message.id) || Boolean(message.fileUrl && !confirmedMediaIds.has(message.id))
  );
}
