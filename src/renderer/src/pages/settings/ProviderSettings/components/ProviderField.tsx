import { cn } from '@renderer/utils'
import type { ReactNode } from 'react'

interface ProviderFieldProps {
  title: ReactNode
  action?: ReactNode
  help?: ReactNode
  children: ReactNode
  className?: string
}

export default function ProviderField({ title, action, help, children, className }: ProviderFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-(--color-text-1) text-sm">{title}</div>
        {action}
      </div>
      {children}
      {help}
    </div>
  )
}
