import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Modal({ open, onOpenChange, title, description, children, footer, className, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-forest-900/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[71] max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-line bg-white shadow-modal outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            sizes[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-[16px] font-bold text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-[12.5px] leading-5 text-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-sage-100 hover:text-ink">
              <X size={17} />
            </DialogPrimitive.Close>
          </div>
          <div className="px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Sheet({ open, onOpenChange, title, description, children, side = 'right', className }) {
  const sides = {
    right: 'right-0 top-0 h-full w-[min(420px,100vw)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
    left: 'left-0 top-0 h-full w-[min(380px,100vw)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
    bottom: 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-card border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-forest-900/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-[71] flex flex-col overflow-hidden border-line bg-white shadow-modal outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200',
            sides[side],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-[16px] font-bold text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-[12.5px] text-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-sage-100 hover:text-ink">
              <X size={17} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Dropdown({ trigger, items, align = 'end', className, label = 'Open menu' }) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild aria-label={label}>
        {trigger}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-[75] min-w-[210px] overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-modal',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            className,
          )}
        >
          {items.map((item, index) => {
            if (item.type === 'separator') {
              return <DropdownPrimitive.Separator key={`sep-${index}`} className="my-1.5 h-px bg-line" />
            }
            if (item.type === 'label') {
              return (
                <DropdownPrimitive.Label key={item.label} className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {item.label}
                </DropdownPrimitive.Label>
              )
            }
            return (
              <DropdownPrimitive.Item
                key={item.label}
                onSelect={item.onSelect}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none transition',
                  'focus:bg-sage-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  item.tone === 'danger' ? 'text-critical-600 focus:bg-critical-50' : 'text-ink-soft',
                )}
                asChild={Boolean(item.href)}
              >
                {item.href ? (
                  <a href={item.href}>
                    {item.icon && <item.icon size={15} className="shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="block">{item.label}</span>
                      {item.description && <span className="block text-[11px] text-muted">{item.description}</span>}
                    </span>
                  </a>
                ) : (
                  <>
                    {item.icon && <item.icon size={15} className="shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="block">{item.label}</span>
                      {item.description && <span className="block text-[11px] text-muted">{item.description}</span>}
                    </span>
                  </>
                )}
              </DropdownPrimitive.Item>
            )
          })}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}

export function Tooltip({ content, children, side = 'top' }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-[80] rounded-lg bg-forest-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lift data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
