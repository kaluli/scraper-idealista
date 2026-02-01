/**
 * Eventbrite API utility functions
 * Handles fetching events from Eventbrite API
 */

export interface EventbriteEvent {
  id: string
  name: {
    text: string
    html: string
  }
  description: {
    text: string
    html: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  url: string
  venue_id: string | null
  online_event: boolean
  status: string
  currency: string
  ticket_availability: {
    has_available_tickets: boolean
    minimum_ticket_price: {
      currency: string
      value: number
      display: string
    } | null
    maximum_ticket_price: {
      currency: string
      value: number
      display: string
    } | null
  }
  logo?: {
    url: string
  }
  venue?: {
    name: string
    address: {
      address_1: string
      city: string
      region: string
      postal_code: string
      country: string
    }
  }
}

export interface EventbriteResponse {
  events: EventbriteEvent[]
  pagination: {
    object_count: number
    page_number: number
    page_size: number
    page_count: number
    has_more_items: boolean
  }
}

export interface EventbriteConfig {
  apiToken: string
  organizationId: string
  apiDomain?: string
}

/**
 * Get Eventbrite configuration from environment variables
 */
export function getEventbriteConfig(): EventbriteConfig | null {
  const apiToken = process.env.EVENTBRITE_API_TOKEN
  const organizationId = process.env.EVENTBRITE_ORGANIZATION_ID
  const apiDomain = process.env.EVENTBRITE_API_DOMAIN || 'www.eventbriteapi.com'

  if (!apiToken || !organizationId) {
    return null
  }

  return {
    apiToken,
    organizationId,
    apiDomain,
  }
}

/**
 * Fetch events from Eventbrite API
 */
export async function fetchEventbriteEvents(
  config: EventbriteConfig,
  options: {
    status?: string
    orderBy?: string
    pageSize?: number
    page?: number
  } = {}
): Promise<EventbriteResponse> {
  const {
    status = 'live',
    orderBy = 'start_asc',
    pageSize = 50,
    page = 1,
  } = options

  const baseUrl = `https://${config.apiDomain}/v3/organizations/${config.organizationId}/events/`
  const params = new URLSearchParams({
    status,
    order_by: orderBy,
    page_size: pageSize.toString(),
    page: page.toString(),
    expand: 'venue,ticket_availability',
  })

  const url = `${baseUrl}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Eventbrite API error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  return response.json()
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventbriteEvent(
  config: EventbriteConfig,
  eventId: string
): Promise<EventbriteEvent> {
  const baseUrl = `https://${config.apiDomain}/v3/events/${eventId}/`
  const params = new URLSearchParams({
    expand: 'venue,ticket_availability',
  })

  const url = `${baseUrl}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Eventbrite API error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  return response.json()
}

/**
 * Format event date for display
 */
export function formatEventDate(event: EventbriteEvent): string {
  const date = new Date(event.start.local)
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Get event price range
 */
export function getEventPriceRange(event: EventbriteEvent): string {
  const { minimum_ticket_price, maximum_ticket_price } =
    event.ticket_availability

  if (!minimum_ticket_price) {
    return 'Precio no disponible'
  }

  if (!maximum_ticket_price || minimum_ticket_price.value === maximum_ticket_price.value) {
    return minimum_ticket_price.display
  }

  return `${minimum_ticket_price.display} - ${maximum_ticket_price.display}`
}

