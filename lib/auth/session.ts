import { NextRequest, NextResponse } from "next/server"
import { UserRepository } from "@/lib/db/repositories/user-repository"
import { UserModel } from "@/lib/progression/types"

const SESSION_COOKIE_NAME = "mg_session"
const userRepo = new UserRepository()

export function getSessionTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (cookie) return cookie

  const authHeader = req.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  return null
}

export function getAuthenticatedUser(req: NextRequest): UserModel | null {
  const token = getSessionTokenFromRequest(req)
  if (!token) return null

  const session = userRepo.getSession(token)
  if (!session) return null

  return userRepo.getUserById(session.userId)
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
