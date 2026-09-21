import { NextResponse } from "next/server"
import { ShopService } from "@/lib/items/shop-service"

export const dynamic = "force-dynamic"

export async function GET() {
  const shops = ShopService.getAllShops()
  return NextResponse.json({ shops })
}
