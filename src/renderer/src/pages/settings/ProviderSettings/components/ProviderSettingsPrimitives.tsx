import { cn } from '@renderer/utils'
import type { ThemeMode } from '@shared/data/preference/preferenceTypes'
import type { ReactNode } from 'react'

export function ProviderSettingsContainer({
  theme,
  className,
  children
}: {
  theme?: ThemeMode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        theme === 'dark' ? 'bg-(--color-background)' : 'bg-(--color-background)',
        className
      )}>
      {children}
    </div>
  )
}

export function ProviderSettingsSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-4 select-none font-bold text-(--color-text-1) text-sm', className)}>{children}</div>
}

export function ProviderHelpText({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-(--color-text) text-[11px] opacity-40', className)}>{children}</div>
}

export function ProviderHelpTextRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-row items-center py-[5px]', className)}>{children}</div>
}

export function ProviderHelpLink({ children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn('mx-[5px] cursor-pointer text-(--color-primary) text-[11px] hover:underline', className)}
      {...props}>
      {children}
    </a>
  )
}
