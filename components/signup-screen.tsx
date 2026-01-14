"use client"

import type React from "react"

import { useState } from "react"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Swords, ArrowLeft } from "lucide-react"

interface SignupScreenProps {
    onNext: () => void
    onBack: () => void
}

export function SignupScreen({ onNext, onBack }: SignupScreenProps) {
    const { setUsername } = useGame()
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    })
    const [error, setError] = useState("")

    const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }))
        setError("")
    }

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.username.trim()) {
            setError("Please choose a username")
            return
        }
        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters")
            return
        }
        if (!formData.email.trim()) {
            setError("Please enter your email")
            return
        }
        if (!formData.email.includes("@")) {
            setError("Please enter a valid email")
            return
        }
        if (!formData.password.trim()) {
            setError("Please create a password")
            return
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setUsername(formData.username)
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
                        <CardTitle className="text-3xl font-bold tracking-wider text-foreground">Join the Battle</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            Create your gladiator account and enter the arena.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-foreground">
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="ShadowBlade"
                                value={formData.username}
                                onChange={handleChange("username")}
                                className="bg-input border-border focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="warrior@mythic.gg"
                                value={formData.email}
                                onChange={handleChange("email")}
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
                                value={formData.password}
                                onChange={handleChange("password")}
                                className="bg-input border-border focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-foreground">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange("confirmPassword")}
                                className="bg-input border-border focus:border-primary"
                            />
                        </div>

                        {error && <p className="text-destructive text-sm text-center">{error}</p>}

                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide"
                        >
                            Create Account
                        </Button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
