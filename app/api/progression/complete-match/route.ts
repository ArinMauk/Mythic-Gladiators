import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { MatchProgressionHandler } from "@/lib/progression/match-progression-handler"
import { LevelId } from "@/lib/progression/config"

export const dynamic = "force-dynamic"

const handler = new MatchProgressionHandler()

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to earn progression rewards" },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { matchId, characterId, arenaId, outcome } = body

    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid matchId" },
        { status: 400 }
      )
    }

    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid characterId" },
        { status: 400 }
      )
    }

    if (!arenaId || !["level-1", "level-2"].includes(arenaId)) {
      return NextResponse.json(
        { error: "Missing or invalid arenaId" },
        { status: 400 }
      )
    }

    if (!outcome || !["victory", "defeat"].includes(outcome)) {
      return NextResponse.json(
        { error: "Missing or invalid outcome" },
        { status: 400 }
      )
    }

    const result = handler.handleMatchCompletion(
      {
        matchId,
        characterId,
        arenaId: arenaId as LevelId,
        outcome,
      },
      user.id
    )

    return NextResponse.json({ progression: result })
  } catch (err: any) {
    console.error("Match completion error:", err)
    if (err.message && err.message.includes("Character not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err.message && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Failed to process match completion" },
      { status: 500 }
    )
  }
}
