import { GameProvider } from "@/lib/game-context"
import { GameFlow } from "@/components/game-flow"

export default function Home() {
  return (
    <GameProvider>
      <GameFlow />
    </GameProvider>
  )
}
