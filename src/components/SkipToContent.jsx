/**
 * Skip to Content Link - Accessibility Enhancement
 * Allows keyboard users to skip navigation and go directly to main content
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only skip-to-content focus:not-sr-only"
      onClick={(e) => {
        e.preventDefault()
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          mainContent.focus()
          mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Make it focusable temporarily
          if (!mainContent.hasAttribute('tabindex')) {
            mainContent.setAttribute('tabindex', '-1')
            mainContent.addEventListener('blur', () => {
              mainContent.removeAttribute('tabindex')
            }, { once: true })
          }
        }
      }}
    >
      Skip to main content
    </a>
  )
}

