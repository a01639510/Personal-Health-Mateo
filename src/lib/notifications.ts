import { InventoryItem, updateItem } from './inventoryDb';
import { daysRemaining } from './inventoryUtils';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isNotificationSupported()) return null;
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

// Recorre el inventario y dispara una notificación por cada producto a <= 2 días de vencer
// (o ya vencido) que no haya sido notificado hoy. Solo funciona con la app/pestaña abierta
// o recién puesta en primer plano — no hay service worker ni push, así que no hay alertas
// garantizadas con la app completamente cerrada.
export async function checkAndNotifyExpiringItems(items: InventoryItem[]): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const days = daysRemaining(item.expirationDate);
    if (days > 2) continue;
    if (item.notifiedAt && item.notifiedAt.slice(0, 10) === todayStr) continue;

    const body = days < 0
      ? `${item.name} venció hace ${Math.abs(days)} día(s).`
      : days === 0
        ? `${item.name} vence hoy.`
        : `${item.name} vence en ${days} día(s).`;

    new Notification('Producto por vencer', { body, tag: item.id });

    await updateItem({ ...item, notifiedAt: new Date().toISOString() });
  }
}
