import { useRef, useEffect, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import SignaturePadModal from './SignaturePadModal'

export default function SignaturePad({ value, onChange, label = 'Signature', width = 400, height = 200, showClearButton = false }) {
  const sigPadRef = useRef(null)
  const canvasRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (sigPadRef.current) {
      if (value && sigPadRef.current.isEmpty()) {
        // Load existing signature if value exists and canvas is empty
        sigPadRef.current.fromDataURL(value)
      } else if (!value && !sigPadRef.current.isEmpty()) {
        // Clear canvas if value is removed
        sigPadRef.current.clear()
      }
    }
  }, [value])

  const handleClear = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (sigPadRef.current) {
      sigPadRef.current.clear()
      onChange('')
    }
  }

  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Export at high quality (full resolution)
      const dataURL = sigPadRef.current.toDataURL('image/png', 1.0)
      onChange(dataURL)
    } else {
      onChange('')
    }
  }

  const handlePadClick = () => {
    if (isMobile) {
      setShowModal(true)
    }
  }

  const handleModalSave = (signature) => {
    onChange(signature)
    setShowModal(false)
  }

  const handleModalClose = () => {
    setShowModal(false)
  }

  return (
    <>
      <div className="space-y-2 w-full">
        {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
        <div 
          className={`border-2 border-gray-300 rounded-md bg-white overflow-hidden w-full ${isMobile ? 'cursor-pointer' : ''}`}
          style={{ maxWidth: width, height }}
          onClick={handlePadClick}
        >
          {isMobile ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              {value ? (
                <img 
                  src={value} 
                  alt="Signature" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-sm text-gray-500">Tap to sign</p>
              )}
            </div>
          ) : (
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                width,
                height,
                className: 'signature-canvas',
                style: { 
                  display: 'block', 
                  width: '100%', 
                  height: '100%',
                  touchAction: 'none' // Prevent scrolling while drawing
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
          )}
        </div>
        {value && (
          <div className="flex gap-2">
            <span className="text-xs text-green-600 flex items-center">✓ Signed</span>
          </div>
        )}
      </div>
      
      {isMobile && (
        <SignaturePadModal
          isOpen={showModal}
          onClose={handleModalClose}
          onSave={handleModalSave}
          value={value}
          label={label}
        />
      )}
    </>
  )
}

