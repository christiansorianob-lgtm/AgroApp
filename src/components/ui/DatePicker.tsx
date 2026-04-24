'use client'

import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

interface DatePickerProps {
    value?: string       // ISO string YYYY-MM-DD
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    className?: string
    disabled?: boolean
}

function parseLocalDate(iso: string): Date | null {
    if (!iso) return null
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
}

function toISO(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function formatDisplay(iso: string): string {
    const d = parseLocalDate(iso)
    if (!d) return ''
    return `${String(d.getDate()).padStart(2, '0')} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', className, disabled }: DatePickerProps) {
    const today = new Date()
    const initial = value ? parseLocalDate(value) : null

    const [open, setOpen] = useState(false)
    const [viewYear, setViewYear] = useState(initial?.getFullYear() ?? today.getFullYear())
    const [viewMonth, setViewMonth] = useState(initial?.getMonth() ?? today.getMonth())
    const [selected, setSelected] = useState<string>(value ?? '')

    // Sync external value changes
    useEffect(() => {
        if (value !== undefined) {
            setSelected(value)
            const d = parseLocalDate(value)
            if (d) {
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
            }
        }
    }, [value])

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

    const handleDayClick = (day: number) => {
        const iso = toISO(new Date(viewYear, viewMonth, day))
        setSelected(iso)
        onChange(iso)
        setOpen(false)
    }

    const isToday = (day: number) => {
        return today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear
    }

    const isSelected = (day: number) => {
        if (!selected) return false
        const s = parseLocalDate(selected)
        return s?.getDate() === day && s?.getMonth() === viewMonth && s?.getFullYear() === viewYear
    }

    // Year quick-selector range
    const years = Array.from({ length: 30 }, (_, i) => 2010 + i)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        !selected && 'text-muted-foreground',
                        className
                    )}
                >
                    <span>{selected ? formatDisplay(selected) : placeholder}</span>
                    <CalendarIcon className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                <div className="rounded-md overflow-hidden bg-popover border border-border">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1 rounded hover:bg-accent transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-2">
                            {/* Month Selector */}
                            <select
                                value={viewMonth}
                                onChange={e => setViewMonth(Number(e.target.value))}
                                className="text-sm font-semibold bg-transparent border-none focus:outline-none cursor-pointer hover:text-primary transition-colors"
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>

                            {/* Year Selector */}
                            <select
                                value={viewYear}
                                onChange={e => setViewYear(Number(e.target.value))}
                                className="text-sm font-semibold bg-transparent border-none focus:outline-none cursor-pointer hover:text-primary transition-colors"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1 rounded hover:bg-accent transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 px-2 pt-2">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
                        {/* Empty cells for first week offset */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}

                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    'h-8 w-8 rounded-md text-sm flex items-center justify-center transition-colors mx-auto',
                                    'hover:bg-primary hover:text-primary-foreground',
                                    isSelected(day) && 'bg-primary text-primary-foreground font-bold',
                                    isToday(day) && !isSelected(day) && 'border border-primary text-primary font-semibold',
                                    !isSelected(day) && !isToday(day) && 'hover:bg-accent'
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Footer: Today shortcut */}
                    <div className="border-t border-border px-3 py-2 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => {
                                const iso = toISO(today)
                                setSelected(iso)
                                setViewYear(today.getFullYear())
                                setViewMonth(today.getMonth())
                                onChange(iso)
                                setOpen(false)
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Hoy
                        </button>
                        {selected && (
                            <span className="text-xs text-muted-foreground">{formatDisplay(selected)}</span>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
