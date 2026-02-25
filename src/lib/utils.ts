import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateNextTaskCode(lastTaskCode?: string | null): string {
  if (!lastTaskCode) {
    return 'T1-01';
  }

  const parts = lastTaskCode.match(/T(\d+)-(\d+)/);
  if (!parts) {
    return 'T1-01'; // Fallback if format is unexpected
  }

  let major = parseInt(parts[1], 10);
  let minor = parseInt(parts[2], 10);

  if (minor < 99) {
    minor++;
  } else {
    major++;
    minor = 1;
  }

  return `T${major}-${minor.toString().padStart(2, '0')}`;
}

export function formatLockTime(date: Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  return new Date(date).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
