import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: 'pong' })
    This is a syntax error to force build fail
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}
