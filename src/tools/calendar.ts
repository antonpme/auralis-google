import { google } from 'googleapis';
import { auth } from '../auth.js';

export async function listCalendarEvents(params: {
  account?: string;
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}) {
  const client = await auth.getClient(params.account);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const now = new Date();
  const response = await calendar.events.list({
    calendarId: params.calendarId || 'primary',
    timeMin: params.timeMin || now.toISOString(),
    timeMax: params.timeMax,
    maxResults: params.maxResults || 50,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map(a => ({ email: a.email, status: a.responseStatus })),
    htmlLink: event.htmlLink,
    status: event.status,
  }));
}

export async function createCalendarEvent(params: {
  account?: string;
  calendarId?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: string[];
  timezone?: string;
}) {
  const client = await auth.getClient(params.account);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const event: any = {
    summary: params.summary,
    description: params.description,
    location: params.location,
    start: {
      dateTime: params.start,
      timeZone: params.timezone || 'Europe/Rome',
    },
    end: {
      dateTime: params.end,
      timeZone: params.timezone || 'Europe/Rome',
    },
  };

  if (params.attendees?.length) {
    event.attendees = params.attendees.map(email => ({ email }));
  }

  const response = await calendar.events.insert({
    calendarId: params.calendarId || 'primary',
    requestBody: event,
    sendUpdates: params.attendees?.length ? 'all' : 'none',
  });

  return {
    id: response.data.id,
    htmlLink: response.data.htmlLink,
    created: true,
  };
}

export async function updateCalendarEvent(params: {
  account?: string;
  calendarId?: string;
  eventId: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  timezone?: string;
}) {
  const client = await auth.getClient(params.account);
  const calendar = google.calendar({ version: 'v3', auth: client });

  // Get existing event
  const existing = await calendar.events.get({
    calendarId: params.calendarId || 'primary',
    eventId: params.eventId,
  });

  const update: any = {
    summary: params.summary ?? existing.data.summary,
    description: params.description ?? existing.data.description,
    location: params.location ?? existing.data.location,
    start: existing.data.start,
    end: existing.data.end,
  };

  if (params.start) {
    update.start = {
      dateTime: params.start,
      timeZone: params.timezone || 'Europe/Rome',
    };
  }

  if (params.end) {
    update.end = {
      dateTime: params.end,
      timeZone: params.timezone || 'Europe/Rome',
    };
  }

  const response = await calendar.events.update({
    calendarId: params.calendarId || 'primary',
    eventId: params.eventId,
    requestBody: update,
  });

  return {
    id: response.data.id,
    htmlLink: response.data.htmlLink,
    updated: true,
  };
}

export async function deleteCalendarEvent(params: {
  account?: string;
  calendarId?: string;
  eventId: string;
}) {
  const client = await auth.getClient(params.account);
  const calendar = google.calendar({ version: 'v3', auth: client });

  await calendar.events.delete({
    calendarId: params.calendarId || 'primary',
    eventId: params.eventId,
  });

  return { deleted: true };
}

export async function listCalendars(params: { account?: string }) {
  const client = await auth.getClient(params.account);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const response = await calendar.calendarList.list();

  return (response.data.items || []).map(cal => ({
    id: cal.id,
    summary: cal.summary,
    description: cal.description,
    primary: cal.primary,
    timeZone: cal.timeZone,
  }));
}
