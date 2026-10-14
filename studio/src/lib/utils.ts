import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function last4(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.slice(-4)
}

export function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:54321'
}
