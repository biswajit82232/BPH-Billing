import { useState, useEffect, useRef } from 'react'
import { safeReload } from '../utils/reloadGuard'

export function usePullToRefresh() {
  const [pullToRefresh, setPullToRefresh] = useState({ 
    isPulling: false, 
    startY: 0, 
    distance: 0, 
    isRefreshing: false 
  })
  const pullStartRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let currentDistance = 0
    let rafId = null
    
    const handleTouchStart = (e) => {
      if (window.innerWidth > 768) return
      const touch = e.touches[0]
      const startY = touch.clientY
      const scrollY = window.scrollY || document.documentElement.scrollTop
      
      if (startY > window.innerHeight / 3) return
      if (scrollY > 10) return
      
      pullStartRef.current = { startY, startScrollY: scrollY }
      currentDistance = 0
      setPullToRefresh({ isPulling: false, startY, distance: 0, isRefreshing: false })
    }

    const updatePullState = () => {
      if (!pullStartRef.current) return
      const distance = Math.min(currentDistance, 80)
      setPullToRefresh(prev => ({
        ...prev,
        isPulling: currentDistance > 5,
        distance: distance
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
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          updatePullState()
          if (currentDistance > 5 && currentDistance < 100) {
            rafId = requestAnimationFrame(updatePullState)
          }
        })
        
        if (currentDistance > 10) e.preventDefault()
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (!pullStartRef.current) return
      if (window.innerWidth > 768) return
      
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      
      if (currentDistance > 60) {
        setPullToRefresh(prev => ({ ...prev, isRefreshing: true, isPulling: false, distance: 70 }))
        safeReload(300)
      } else {
        const startDistance = currentDistance
        const startTime = performance.now()
        const duration = 300
        
        const animateReturn = (currentTime) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          
          const newDistance = startDistance * (1 - eased)
          setPullToRefresh(prev => ({ 
            ...prev, 
            isPulling: newDistance > 5, 
            distance: newDistance 
          }))
          
          if (progress < 1) {
            requestAnimationFrame(animateReturn)
          } else {
            setPullToRefresh(prev => ({ ...prev, isPulling: false, distance: 0 }))
          }
        }
        
        requestAnimationFrame(animateReturn)
      }
      
      currentDistance = 0
      pullStartRef.current = null
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return pullToRefresh
}

