import { NextRequest, NextResponse } from "next/server"
import { UserRepository } from "@/lib/db/repositories/user-repository"
import { setSessionCookie } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

const userRepo = new UserRepository()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { usernameOrEmail, password } = body

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: "Please enter your username/email and password" },
        { status: 400 }
      )
    }

    const user = userRepo.authenticateUser(usernameOrEmail, password)
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username/email or password" },
        { status: 401 }
      )
    }

    const sessionToken = userRepo.createSession(user.id)
    const response = NextResponse.json({ user })
    setSessionCookie(response, sessionToken)

    return response
  } catch (err: any) {
    console.error("Login error:", err)
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    )
  }
}
