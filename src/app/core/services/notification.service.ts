import { Injectable, computed, signal } from '@angular/core';
import { supabase } from '../supabase.client';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  text: string;
  read: boolean;
  created_at: string;
  actor?: { name: string; avatar_url: string | null };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  async loadNotifications(userId: string): Promise<void> {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    this.notifications.set((data ?? []) as Notification[]);
  }

  async markAsRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  subscribeToRealtime(userId: string): void {
    supabase.channel('notif-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.' + userId
      }, (payload) => {
        this.notifications.update(list => [payload.new as Notification, ...list]);
      })
      .subscribe();
  }
}
