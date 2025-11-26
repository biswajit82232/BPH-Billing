import { useEffect, useRef } from 'react'

/**
 * Focus trap hook for modals - traps keyboard focus within the modal
 * @param {boolean} isActive - Whether the focus trap should be active
 * @param {React.RefObject} containerRef - Ref to the container element
 */
export function useFocusTrap(isActive, containerRef) {
  const previousActiveElement = useRef(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // Store the previously focused element to restore later
    previousActiveElement.current = document.activeElement

    const container = containerRef.current

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(container.querySelectorAll(focusableSelectors)).filter(
        (el) => {
          // Filter out elements that are not visible
          const style = window.getComputedStyle(el)
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          )
        }
      )
    }

    // Focus first element when modal opens
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        focusableElements[0]?.focus()
      }, 100)
    }

    // Handle Tab key to cycle through focusable elements
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // If only one element, prevent tabbing
      if (focusableElements.length === 1) {
        event.preventDefault()
        firstElement.focus()
        return
      }

      // If Shift+Tab on first element, move to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      // If Tab on last element, move to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
        return
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Cleanup: restore focus when modal closes
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to previous element
      if (previousActiveElement.current && document.contains(previousActiveElement.current)) {
        // Small delay to ensure modal is fully closed
        setTimeout(() => {
          previousActiveElement.current?.focus()
        }, 100)
      }
    }
  }, [isActive, containerRef])
}

