import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for each shortcut
      Object.entries(shortcuts).forEach(([key, callback]) => {
        const parts = key.toLowerCase().split('+')
        const needsCtrl = parts.includes('ctrl') || parts.includes('cmd')
        const needsAlt = parts.includes('alt')
        const needsShift = parts.includes('shift')
        const mainKey = parts[parts.length - 1]

        const ctrlPressed = event.ctrlKey || event.metaKey
        const altPressed = event.altKey
        const shiftPressed = event.shiftKey
        const keyPressed = event.key.toLowerCase()

        if (
          (needsCtrl === ctrlPressed) &&
          (needsAlt === altPressed) &&
          (needsShift === shiftPressed) &&
          (keyPressed === mainKey)
        ) {
          event.preventDefault()
          callback(event)
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

