'use client'

import { Menu } from 'lucide-react'

interface HeaderProps {
    onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
    return (
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-30 px-4 flex items-center justify-between md:justify-end">
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4">
                {/* Actions or Notifications could go here */}
            </div>
        </header>
    )
}
