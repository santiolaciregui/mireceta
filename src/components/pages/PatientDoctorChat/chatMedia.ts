/** US-012 / T-002, 2026-10-15: Keep media details out of inbox polling. */
import type { ChatMessage } from '../../../types';

export function mergeChatMedia(summaries: ChatMessage[], details: ChatMessage[]): ChatMessage[] {
  const mediaById = new Map(details.map(message => [message.id, message.fileUrl]));
  return summaries.map(message => ({
    ...message,
    fileUrl: message.fileUrl || mediaById.get(message.id),
  }));
}
