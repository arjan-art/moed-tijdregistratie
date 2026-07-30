/**
 * Dutch date/time formatting utilities
 * All functions use Europe/Amsterdam timezone
 */

export function formatDutchDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDutchTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDutchDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDutchDateOnly(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDutchDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDutchDateRange(startDate: string, endDate: string): string {
  const start = formatDutchDateShort(startDate)
  const end = formatDutchDateOnly(endDate)
  return `${start} – ${end}`
}

export function formatTimeDisplay(timeStr: string): string {
  return timeStr?.slice(0, 5) || ''
}

export function getDutchDayName(dayIndex: number): string {
  const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
  return days[dayIndex] || ''
}

export function getTodayAmsterdam(): string {
  return new Date().toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('-').reverse().join('-')
}

export function getCurrentTimestampAmsterdam(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  const utc = now.getTime() + offset
  const amsterdamOffset = 120 * 60000
  return new Date(utc + amsterdamOffset).toISOString()
}
