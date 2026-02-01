import { NextRequest, NextResponse } from 'next/server'
import {
  getEventbriteConfig,
  fetchEventbriteEvent,
} from '@/lib/eventbrite'

/**
 * GET /api/events/[id]
 * Fetch a single event by ID from Eventbrite API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const config = getEventbriteConfig()

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Eventbrite API not configured. Please set EVENTBRITE_API_TOKEN and EVENTBRITE_ORGANIZATION_ID environment variables.',
        },
        { status: 500 }
      )
    }

    const eventId = params.id

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ID is required',
        },
        { status: 400 }
      )
    }

    const event = await fetchEventbriteEvent(config, eventId)

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (error) {
    console.error('Error fetching Eventbrite event:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener el evento de Eventbrite',
      },
      { status: 500 }
    )
  }
}

