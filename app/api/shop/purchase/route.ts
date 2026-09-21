import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/session"
import { ShopService } from "@/lib/items/shop-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { characterId, shopId, itemId } = body

    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid characterId" },
        { status: 400 }
      )
    }

    if (!shopId || typeof shopId !== "string") {
      return NextResponse.json({ error: "Missing or invalid shopId" }, { status: 400 })
    }

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "Missing or invalid itemId" }, { status: 400 })
    }

    const result = ShopService.purchaseItem({
      characterId,
      userId: user.id,
      shopId,
      itemId,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Shop purchase error:", err)
    if (err.message && err.message.includes("Insufficient gold")) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err.message && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    if (err.message && err.message.includes("not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: err.message || "Failed to process shop purchase" },
      { status: 500 }
    )
  }
}
