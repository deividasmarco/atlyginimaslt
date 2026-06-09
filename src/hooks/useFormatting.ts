// Formatting utilities used across the app

export function useFormatting() {
  function formatEur(amount: number, showSign = false): string {
    const formatted = Math.abs(amount).toLocaleString('lt-LT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = showSign ? (amount >= 0 ? '+' : '-') : '-';
    return showSign
      ? `${amount >= 0 ? '+' : '-'}${formatted} €`
      : `${formatted} €`;
  }

  function formatEurShort(amount: number): string {
    if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(1)}k €`;
    }
    return `${Math.round(amount)} €`;
  }

  function formatPct(rate: number): string {
    return `${(rate * 100).toFixed(1)} %`;
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('lt-LT', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  }

  function formatMonth(year: number, month: number): string {
    const MONTHS = [
      '', 'Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis',
      'Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis',
    ];
    return `${year} m. ${MONTHS[month]}`;
  }

  return { formatEur, formatEurShort, formatPct, formatDate, formatMonth };
}
