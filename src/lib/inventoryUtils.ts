export type ExpirationStatus = 'ok' | 'soon' | 'expired';

export function daysRemaining(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expirationDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function expirationStatus(days: number): ExpirationStatus {
  if (days <= 1) return 'expired';
  if (days <= 7) return 'soon';
  return 'ok';
}

export function statusColor(status: ExpirationStatus): { bg: string; fg: string } {
  switch (status) {
    case 'expired':
      return { bg: 'var(--danger-bg)', fg: 'var(--danger-fg)' };
    case 'soon':
      return { bg: 'var(--warning-bg)', fg: 'var(--warning-fg)' };
    default:
      return { bg: 'rgba(52, 199, 89, 0.15)', fg: '#248a3d' };
  }
}

export function formatDaysLabel(days: number): string {
  if (days < 0) return `Venció hace ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days}d`;
}
