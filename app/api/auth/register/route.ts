import { NextRequest, NextResponse } from "next/server"
import { UserRepository } from "@/lib/db/repositories/user-repository"
import { setSessionCookie } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

const userRepo = new UserRepository()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, email, password } = body

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      )
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    let user
    try {
      user = userRepo.createUser(username, email, password)
    } catch (err: any) {
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json(
          { error: "Username or email is already in use" },
          { status: 409 }
        )
      }
      throw err
    }

    const sessionToken = userRepo.createSession(user.id)
    const response = NextResponse.json({ user })
    setSessionCookie(response, sessionToken)

    return response
  } catch (err: any) {
    console.error("Registration error:", err)
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    )
  }
}
