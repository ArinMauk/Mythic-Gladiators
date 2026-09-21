import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"

export const dynamic = "force-dynamic"

const charRepo = new CharacterRepository()

export async function GET(
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

  return NextResponse.json({ character })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const success = charRepo.deleteCharacter(id, user.id)
  if (!success) {
    return NextResponse.json({ error: "Character not found or not owned" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
