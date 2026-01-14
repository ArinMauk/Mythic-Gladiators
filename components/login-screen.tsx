"use client"

import type React from "react"

import { useState } from "react"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Swords } from "lucide-react"

interface LoginScreenProps {
  onNext: () => void
  onSignup: () => void
}

export function LoginScreen({ onNext, onSignup }: LoginScreenProps) {
  const { setUsername } = useGame()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter your email or username")
      return
    }
    if (!password.trim()) {
      setError("Please enter your password")
      return
    }
    setUsername(email.split("@")[0])
    onNext()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <Card className="w-full max-w-md relative z-10 border-primary/30 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Swords className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-wider text-foreground">Mythic Gladiators</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Enter the arena. Claim your glory.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Username or Email
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="warrior@mythic.gg"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                className="bg-input border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                className="bg-input border-border focus:border-primary"
              />
            </div>

            {error && <p className="text-destructive text-sm text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide"
            >
              Enter the Arena
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              New gladiator?{" "}
              <button type="button" onClick={onSignup} className="text-primary hover:underline">
                Create Account
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
