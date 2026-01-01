import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/mw-ping')) {
        return NextResponse.json({ message: 'middleware-pong' })
    }
}

export const config = {
    matcher: '/api/:path*',
}
