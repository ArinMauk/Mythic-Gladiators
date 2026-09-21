import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"
import { GameClass } from "@/lib/progression/types"

export const dynamic = "force-dynamic"

const charRepo = new CharacterRepository()

const VALID_CLASSES: GameClass[] = [
  "warrior",
  "priest",
  "hunter",
  "rogue",
  "mage",
  "warlock",
  "paladin",
  "shaman",
]

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const characters = charRepo.getCharactersByUserId(user.id)
  return NextResponse.json({ characters })
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, class: charClass } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Character name must be at least 2 characters" },
        { status: 400 }
      )
    }

    if (!charClass || !VALID_CLASSES.includes(charClass)) {
      return NextResponse.json(
        { error: "Invalid character class" },
        { status: 400 }
      )
    }

    const character = charRepo.createCharacter({
      userId: user.id,
      name: name.trim(),
      class: charClass,
    })

    return NextResponse.json({ character }, { status: 201 })
  } catch (err: any) {
    console.error("Create character error:", err)
    return NextResponse.json(
      { error: "Failed to create character" },
      { status: 500 }
    )
  }
}
