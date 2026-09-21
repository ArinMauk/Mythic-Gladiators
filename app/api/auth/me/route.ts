import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user })
}
