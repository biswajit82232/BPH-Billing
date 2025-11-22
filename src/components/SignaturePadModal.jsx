import { useRef, useEffect, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignaturePadModal({ isOpen, onClose, onSave, value, label = 'Signature' }) {
  const sigPadRef = useRef(null)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    if (isOpen && sigPadRef.current) {
      if (value && sigPadRef.current.isEmpty()) {
        sigPadRef.current.fromDataURL(value)
        setHasSignature(true)
      } else if (!value) {
        sigPadRef.current.clear()
        setHasSignature(false)
      }
    }
  }, [isOpen, value])

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (sigPadRef.current) {
      sigPadRef.current.clear()
      setHasSignature(false)
    }
  }

  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setHasSignature(true)
    } else {
      setHasSignature(false)
    }
  }

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Export at high quality (2x scale for retina/high DPI)
      const scale = window.devicePixelRatio || 2
      const dataURL = sigPadRef.current.toDataURL('image/png', 1.0)
      onSave(dataURL)
    } else {
      onSave('')
    }
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      
      // Calculate canvas size for fullscreen horizontal (landscape) with high DPI support
      const updateSize = () => {
        const headerHeight = 0 // No header anymore
        const footerHeight = 90 // Increased to account for safe area
        const padding = 16
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0
        const actualFooterHeight = footerHeight + safeAreaBottom
        
        // Use viewport height accounting for mobile browser chrome
        const viewportHeight = window.innerHeight || window.visualViewport?.height || window.innerHeight
        const viewportWidth = window.innerWidth || window.visualViewport?.width || window.innerWidth
        
        const availableWidth = viewportWidth - (padding * 2)
        const availableHeight = viewportHeight - headerHeight - actualFooterHeight - (padding * 2)
        
        // Store display size (for CSS) and actual canvas size (for high DPI)
        setCanvasSize({
          width: Math.max(availableWidth, 300),
          height: Math.max(availableHeight, 200)
        })
      }
      updateSize()
      window.addEventListener('resize', updateSize)
      window.addEventListener('orientationchange', updateSize)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('resize', updateSize)
        window.removeEventListener('orientationchange', updateSize)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-white flex flex-col signature-modal-container"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        height: '100vh',
        height: '100dvh', // Dynamic viewport height for mobile
        maxHeight: '100vh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Signature Canvas - Full Screen Horizontal */}
      <div 
        className="flex-1 flex items-center justify-center p-2 overflow-hidden" 
        style={{ 
          minHeight: 0, 
          flex: '1 1 auto',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <div className="w-full h-full border-2 border-gray-300 rounded-md bg-white" style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                width: canvasSize.width,
                height: canvasSize.height,
                className: 'signature-canvas',
                style: { 
                  display: 'block', 
                  width: '100%', 
                  height: '100%',
                  touchAction: 'none', // Prevent scrolling while drawing
                  maxWidth: '100%',
                  maxHeight: '100%'
                }
              }}
              onEnd={handleEnd}
              backgroundColor="white"
              penColor="#000000"
              velocityFilterWeight={0.8}
              minWidth={2}
              maxWidth={3.5}
              dotSize={2}
              throttle={8}
            />
          </div>
        )}
      </div>

      {/* Footer with buttons - Always visible at bottom */}
      <div 
        className="flex items-center justify-between gap-3 p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 signature-modal-footer" 
        style={{ 
          zIndex: 100,
          minHeight: '80px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          position: 'relative',
          width: '100%',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          onClick={handleClear}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleClear(e)
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-md active:bg-gray-300 transition-colors font-medium text-base touch-manipulation"
          style={{ 
            touchAction: 'manipulation', 
            WebkitTapHighlightColor: 'transparent', 
            zIndex: 101,
            minHeight: '44px',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleCancel}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCancel()
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-md active:bg-gray-200 transition-colors font-medium text-base touch-manipulation"
          style={{ 
            touchAction: 'manipulation', 
            WebkitTapHighlightColor: 'transparent', 
            zIndex: 101,
            minHeight: '44px',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          onTouchStart={(e) => {
            e.stopPropagation()
            if (hasSignature) {
              e.preventDefault()
            }
          }}
          onTouchEnd={(e) => {
            if (hasSignature) {
              e.preventDefault()
              e.stopPropagation()
              handleSave()
            }
          }}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!hasSignature}
          className={`flex-1 px-4 py-3 rounded-md transition-colors font-medium text-base touch-manipulation ${
            hasSignature
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          style={{ 
            touchAction: 'manipulation', 
            WebkitTapHighlightColor: 'transparent', 
            zIndex: 101,
            minHeight: '44px',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

