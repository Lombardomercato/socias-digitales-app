import { NextResponse } from 'next/server'

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  )

  return NextResponse.json({ configured }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
