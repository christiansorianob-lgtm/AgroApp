"use client"

import * as React from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export interface ComboboxOption {
    value: string
    label: string
}

interface ComboboxProps {
    options: ComboboxOption[]
    value: string
    onSelect: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string // Ignored in Select implementation
    emptyText?: string // Ignored in Select implementation
    disabled?: boolean
    className?: string
}

/**
 * Combobox Component
 * 
 * Originally designed as a searchable combobox.
 * REVERTED to a standard Select wrapper per user request due to selection issues.
 * Maintains API compatibility so no form refactoring is needed.
 */
export function Combobox({
    options,
    value,
    onSelect,
    placeholder = "Seleccionar...",
    disabled = false,
    className
}: ComboboxProps) {
    return (
        <Select
            value={value}
            onValueChange={onSelect}
            disabled={disabled}
        >
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
