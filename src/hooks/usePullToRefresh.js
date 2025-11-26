import { useState, useEffect, useRef, useCallback } from 'react'

const initialState = {
  isPulling: false,
  startY: 0,
  distance: 0,
  isRefreshing: false,
}

export function usePullToRefresh({ onRefresh, enabled = true, threshold = 60 } = {}) {
  const [state, setState] = useState(initialState)
  const pullStartRef = useRef(null)
  const rafIdRef = useRef(null)
  const refreshPromiseRef = useRef(null)
  const callbackRef = useRef(onRefresh)

  useEffect(() => {
    callbackRef.current = onRefresh
  }, [onRefresh])

  const cleanupRaf = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const finishRefresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRefreshing: false,
      isPulling: false,
      distance: 0,
    }))
  }, [])

  const triggerRefresh = useCallback(() => {
    if (refreshPromiseRef.current) return

    setState((prev) => ({ ...prev, isRefreshing: true, isPulling: false }))

    const result = callbackRef.current ? callbackRef.current() : null
    refreshPromiseRef.current = Promise.resolve(result)
      .catch((error) => {
        console.warn('Pull to refresh error:', error)
      })
      .finally(() => {
        refreshPromiseRef.current = null
        finishRefresh()
      })
  }, [finishRefresh])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    let currentDistance = 0

    const handleTouchStart = (e) => {
      if (window.innerWidth > 768) return
      const touch = e.touches[0]
      const startY = touch.clientY
      const scrollY = window.scrollY || document.documentElement.scrollTop

      if (startY > window.innerHeight / 3) return
      if (scrollY > 10) return

      pullStartRef.current = { startY, startScrollY: scrollY }
      currentDistance = 0
      setState({ isPulling: false, startY, distance: 0, isRefreshing: false })
    }

    const updatePullState = () => {
      if (!pullStartRef.current) return
      const distance = Math.min(currentDistance, 80)
      setState((prev) => ({
        ...prev,
        isPulling: currentDistance > 5,
        distance,
      }))
    }

    const handleTouchMove = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return

      const touch = e.touches[0]
      const currentY = touch.clientY
      const newDistance = Math.max(0, currentY - pullStartRef.current.startY)

      currentDistance = currentDistance + (newDistance - currentDistance) * 0.3

      if (currentDistance > 0 && currentDistance < 100) {
        cleanupRaf()
        rafIdRef.current = requestAnimationFrame(() => {
          updatePullState()
          if (currentDistance > 5 && currentDistance < 100) {
            rafIdRef.current = requestAnimationFrame(updatePullState)
          }
        })

        if (currentDistance > 10) e.preventDefault()
      } else {
        cleanupRaf()
      }
    }

    const animateReturn = (startDistance) => {
      const startTime = performance.now()
      const duration = 300

      const step = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const newDistance = startDistance * (1 - eased)

        setState((prev) => ({
          ...prev,
          isPulling: newDistance > 5,
          distance: newDistance,
        }))

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(step)
        } else {
          finishRefresh()
        }
      }

      rafIdRef.current = requestAnimationFrame(step)
    }

    const handleTouchEnd = () => {
      if (!pullStartRef.current) return
      cleanupRaf()

      if (currentDistance > threshold) {
        triggerRefresh()
      } else if (currentDistance > 0) {
        animateReturn(currentDistance)
      } else {
        finishRefresh()
      }

      currentDistance = 0
      pullStartRef.current = null
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      cleanupRaf()
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [cleanupRaf, enabled, finishRefresh, threshold, triggerRefresh])

  return state
}

