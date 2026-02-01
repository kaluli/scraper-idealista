import { NextRequest, NextResponse } from 'next/server'
import {
  getEventbriteConfig,
  fetchEventbriteEvents,
  EventbriteEvent,
} from '@/lib/eventbrite'

/**
 * GET /api/events
 * Fetch events from Eventbrite API
 * Query params:
 *   - status: 'live', 'draft', 'started', 'ended', 'completed', 'canceled' (default: 'live')
 *   - orderBy: 'start_asc', 'start_desc', 'created_asc', 'created_desc' (default: 'start_asc')
 *   - pageSize: number (default: 50)
 *   - page: number (default: 1)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'live'
    const orderBy = searchParams.get('orderBy') || 'start_asc'
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const response = await fetchEventbriteEvents(config, {
      status,
      orderBy,
      pageSize,
      page,
    })

    return NextResponse.json({
      success: true,
      data: response.events,
      pagination: response.pagination,
    })
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al obtener eventos de Eventbrite',
      },
      { status: 500 }
    )
  }
}

