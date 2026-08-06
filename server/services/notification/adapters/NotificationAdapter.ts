export type NotificationChannel = 'email' | 'whatsapp';

export interface SendNotificationPayload {
  to: string; // Email address or Phone number with country code
  subject?: string;
  body: string;
  templateCode?: string;
  variables?: Record<string, string | number | boolean>;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  send(payload: SendNotificationPayload, config: Record<string, unknown>): Promise<SendNotificationResult>;
  testConnection(config: Record<string, unknown>): Promise<TestConnectionResult>;
}
