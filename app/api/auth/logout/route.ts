import { NextRequest, NextResponse } from "next/server"
import { UserRepository } from "@/lib/db/repositories/user-repository"
import { getSessionTokenFromRequest, clearSessionCookie } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

const userRepo = new UserRepository()

export async function POST(req: NextRequest) {
  const token = getSessionTokenFromRequest(req)
  if (token) {
    userRepo.deleteSession(token)
  }

  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
