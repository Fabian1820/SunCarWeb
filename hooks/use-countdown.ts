"use client"

import { useEffect, useState } from "react"

export interface CountdownValues {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  expired: boolean
}

export function useCountdown(targetISO: string): CountdownValues {
  const targetMs = new Date(targetISO).getTime()
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, targetMs - now)
  const seconds = Math.floor(diff / 1000) % 60
  const minutes = Math.floor(diff / (1000 * 60)) % 60
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  return { days, hours, minutes, seconds, totalMs: diff, expired: diff <= 0 }
}
