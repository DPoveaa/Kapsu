import { ReactNode, useImperativeHandle, forwardRef, CSSProperties } from 'react'
import { useDragScroll } from '../hooks/useDragScroll'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HorizontalScrollContainerProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  showArrows?: boolean
}

export const HorizontalScrollContainer = forwardRef<HTMLDivElement, HorizontalScrollContainerProps>(
  ({ children, className = '', style, showArrows = true }, ref) => {
    const {
      ref: internalRef,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onClickCapture,
      scroll,
      canScrollLeft,
      canScrollRight,
      isDragging
    } = useDragScroll()

    // Forward the internal ref to the parent ref
    useImperativeHandle(ref, () => internalRef.current as HTMLDivElement)

    return (
      <div className="relative group/scroll w-full">
        {/* Left Navigation Arrow */}
        {showArrows && canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg opacity-0 group-hover/scroll:opacity-100 hover:bg-white dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-300 hidden md:flex hover:scale-110 active:scale-95 cursor-pointer items-center justify-center -translate-x-1/2"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={internalRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
          style={style}
          className={`overflow-x-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
        >
          {children}
        </div>

        {/* Right Navigation Arrow */}
        {showArrows && canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg opacity-0 group-hover/scroll:opacity-100 hover:bg-white dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-300 hidden md:flex hover:scale-110 active:scale-95 cursor-pointer items-center justify-center translate-x-1/2"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    )
  }
)

HorizontalScrollContainer.displayName = 'HorizontalScrollContainer'
