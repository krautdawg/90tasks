import { google } from 'googleapis'

function getCalendarClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('Google Calendar env vars not set, skipping calendar sync')
    return null
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function createCalendarEvent(title: string, dueDate: string, notes?: string) {
  const calendar = getCalendarClient()
  if (!calendar) return null

  try {
    // dueDate format: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
    const hasTime = dueDate.includes('T')

    const event: Record<string, unknown> = {
      summary: `Todo: ${title}`,
      description: notes || undefined,
    }

    if (hasTime) {
      event.start = { dateTime: dueDate, timeZone: 'Europe/Berlin' }
      event.end = { dateTime: dueDate, timeZone: 'Europe/Berlin' }
    } else {
      event.start = { date: dueDate }
      event.end = { date: dueDate }
    }

    const result = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: event,
    })

    console.log('Calendar event created:', result.data.id)
    return result.data.id
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return null
  }
}
