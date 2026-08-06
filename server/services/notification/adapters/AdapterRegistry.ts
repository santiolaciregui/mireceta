import { NotificationAdapter, NotificationChannel } from './NotificationAdapter.js';
import { EmailAdapter } from './EmailAdapter.js';
import { WhatsAppAdapter } from './WhatsAppAdapter.js';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<NotificationChannel, NotificationAdapter> = new Map();

  private constructor() {
    this.register(new EmailAdapter());
    this.register(new WhatsAppAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: NotificationAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  public getAdapter(channel: NotificationChannel): NotificationAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`No existe un adaptador registrado para el canal: ${channel}`);
    }
    return adapter;
  }

  public getSupportedChannels(): NotificationChannel[] {
    return Array.from(this.adapters.keys());
  }
}
