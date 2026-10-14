/** Normalize non-media WhatsApp events without discarding their diagnostic identity. */
export interface InboundWhatsAppMessage {
  id?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
  reaction?: { emoji?: string; message_id?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  errors?: Array<{ code?: number }>;
}

export function describeInboundWhatsAppMessage(
  message: InboundWhatsAppMessage,
  mediaLabel?: string,
  caption?: string
) {
  let text = message.text?.body || caption;
  let fallbackReason: string | undefined;

  if (!text && message.type === 'reaction') {
    const emoji = message.reaction?.emoji;
    if (typeof emoji === 'string') {
      text = emoji ? `Reaccionó con ${emoji}` : 'Retiró su reacción';
    } else {
      text = '[Reacción de WhatsApp sin emoji disponible]';
      fallbackReason = 'missing_reaction_emoji';
    }
  }
  if (!text && message.type === 'button') text = message.button?.text;
  if (!text && message.type === 'interactive') {
    text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
  }
  if (!text) {
    text = mediaLabel || `[Mensaje de WhatsApp no interpretado: ${message.type || 'tipo desconocido'}]`;
    if (!mediaLabel) fallbackReason = 'unsupported_or_missing_content';
  }

  // Keep only diagnostic fields, never the full webhook or attachment contents.
  const diagnostics = {
    messageId: message.id,
    type: message.type || 'unknown',
    providerTimestamp: message.timestamp,
    payloadFields: Object.keys(message),
    ...(message.type === 'reaction' ? {
      reaction: { emoji: message.reaction?.emoji, messageId: message.reaction?.message_id }
    } : {}),
    ...(fallbackReason ? { fallbackReason } : {}),
    errorCodes: Array.isArray(message.errors)
      ? message.errors.map(error => error?.code).filter(code => typeof code === 'number')
      : []
  };
  return { text, diagnostics };
}
