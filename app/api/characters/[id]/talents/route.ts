import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"

export const dynamic = "force-dynamic"

const charRepo = new CharacterRepository()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const character = charRepo.getCharacterById(id)
  if (!character || character.userId !== user.id) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { selectedTalents, unspentTalentPoints } = body

    if (!Array.isArray(selectedTalents)) {
      return NextResponse.json(
        { error: "selectedTalents must be an array of strings" },
        { status: 400 }
      )
    }

    if (typeof unspentTalentPoints !== "number" || unspentTalentPoints < 0) {
      return NextResponse.json(
        { error: "unspentTalentPoints must be a non-negative number" },
        { status: 400 }
      )
    }

    const updated = charRepo.updateTalents({
      id: character.id,
      selectedTalents,
      unspentTalentPoints,
    })

    return NextResponse.json({ character: updated })
  } catch (err: any) {
    console.error("Save talents error:", err)
    return NextResponse.json(
      { error: "Failed to save talents" },
      { status: 500 }
    )
  }
}
