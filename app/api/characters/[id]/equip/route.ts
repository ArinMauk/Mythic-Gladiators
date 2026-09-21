import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"
import { EquipmentService } from "@/lib/items/equipment-service"
import { EquipmentSlot } from "@/lib/items/types"

export const dynamic = "force-dynamic"

const VALID_SLOTS: EquipmentSlot[] = [
  "weapon",
  "head",
  "chest",
  "hands",
  "legs",
  "feet",
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const charRepo = new CharacterRepository()
  const character = charRepo.getCharacterById(id)

  if (!character || character.userId !== user.id) {
    return NextResponse.json({ error: "Character not found or not owned" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { slot, instanceId } = body

    if (!slot || !VALID_SLOTS.includes(slot)) {
      return NextResponse.json({ error: `Invalid equipment slot: ${slot}` }, { status: 400 })
    }

    if (!instanceId || typeof instanceId !== "string") {
      return NextResponse.json({ error: "Missing or invalid instanceId" }, { status: 400 })
    }

    const validation = EquipmentService.validateEquip({
      character,
      slot,
      instanceId,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const currentEquipment = { ...(character.equipment || {}) }
    currentEquipment[slot] = instanceId

    const updated = charRepo.updateEquipment(character.id, currentEquipment)

    return NextResponse.json({ character: updated })
  } catch (err: any) {
    console.error("Equip error:", err)
    return NextResponse.json({ error: "Failed to equip item" }, { status: 500 })
  }
}
