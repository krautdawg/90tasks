export function computeNextDueDate(rule: string, from: Date): Date {
  const next = new Date(from)
  const [type, value] = rule.split(':')

  if (type === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (type === 'weekly') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = days.indexOf(value.toLowerCase())
    if (targetDay !== -1) {
      next.setDate(next.getDate() + 1)
      while (next.getDay() !== targetDay) {
        next.setDate(next.getDate() + 1)
      }
    }
  } else if (type === 'monthly') {
    if (value.startsWith('day-')) {
      const day = parseInt(value.split('-')[1])
      next.setMonth(next.getMonth() + 1)
      next.setDate(day)
      // If we jumped too far (e.g. Feb 30), it would wrap to March. 
      // But requirement says 1-28 for simplicity, so it should be fine.
    } else {
      // e.g. "3rd-monday"
      const parts = value.split('-')
      if (parts.length === 2) {
        const occurrence = parts[0] // "1st", "2nd", "3rd", "4th"
        const dayName = parts[1].toLowerCase()
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const targetDay = days.indexOf(dayName)
        
        const n = parseInt(occurrence.replace(/\D/g, ''))
        
        // Move to first day of next month
        next.setMonth(next.getMonth() + 1)
        next.setDate(1)
        
        // Find first occurrence of targetDay
        let count = 0
        while (count < n) {
          if (next.getDay() === targetDay) {
            count++
            if (count === n) break
          }
          next.setDate(next.getDate() + 1)
        }
      }
    }
  }

  return next
}

export function formatRecurrenceRule(rule: string | null): string {
  if (!rule) return ''
  const [type, value] = rule.split(':')
  if (type === 'daily') return 'Daily'
  if (type === 'weekly') return `Every ${value.charAt(0).toUpperCase() + value.slice(1)}`
  if (type === 'monthly') {
    if (value.startsWith('day-')) {
      return `Every day ${value.split('-')[1]} of month`
    }
    const parts = value.split('-')
    return `Every ${parts[0]} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)} of month`
  }
  return rule
}
