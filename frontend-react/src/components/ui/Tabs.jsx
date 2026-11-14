import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

export function Tabs({ value, onValueChange, defaultValue, items, className, size = 'md' }) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} defaultValue={defaultValue} className={cn('min-w-0 max-w-full', className)}>
      <TabsPrimitive.List
        className={cn(
          'inline-flex max-w-full items-center gap-1 overflow-x-auto scroll-thin rounded-xl border border-line bg-white p-1 shadow-card',
          size === 'sm' && 'p-0.5',
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 font-semibold text-muted transition',
              'hover:bg-sage-100 hover:text-ink',
              'data-[state=active]:bg-forest-500 data-[state=active]:text-white data-[state=active]:shadow-sm',
              size === 'sm' ? 'h-8 text-[12px]' : 'h-9 text-[13px]',
            )}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 text-[10.5px] font-bold tabular-nums',
                'bg-sage-200 text-muted',
              )}>
                {item.count}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}

export function TabsPanel({ value, children, className }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-5 outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  )
}
