"use client"

import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768 // Corresponds to md: in Tailwind

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Set the initial state
    handleResize()

    window.addEventListener("resize", handleResize)

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [breakpoint])

  return isMobile
}
