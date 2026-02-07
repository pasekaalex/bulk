import { useRef, forwardRef, useImperativeHandle, type ReactNode } from 'react'

interface ThreeCanvasProps {
  children?: ReactNode
  className?: string
}

export const ThreeCanvas = forwardRef<HTMLDivElement, ThreeCanvasProps>(
  function ThreeCanvas({ children, className = '' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => containerRef.current!)

    return (
      <div className={`relative w-full h-screen overflow-hidden bg-black ${className}`}>
        <div ref={containerRef} className="absolute inset-0" />
        {children}
      </div>
    )
  },
)
