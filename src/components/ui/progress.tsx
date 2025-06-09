import * as React from 'react'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ value = 0, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-3 w-full rounded-full bg-muted overflow-hidden ${className || ''}`}
      {...props}
    >
      <div
        className="absolute left-0 top-0 h-full bg-primary transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  )
})
Progress.displayName = 'Progress'

export { Progress } 