import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export type MultiSelectOption = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  className?: string
  groupHeading?: string
  maxDisplayItems?: number
  displayBadges?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyMessage = "No items found.",
  searchPlaceholder = "Search items...",
  className = "",
  groupHeading = "Items",
  maxDisplayItems = 3,
  displayBadges = true
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  // Create mapping for easier lookup
  const optionsMap = options.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})

  const displayValues = () => {
    if (selected.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }

    if (!displayBadges) {
      if (selected.length === 1) {
        return optionsMap[selected[0]] || selected[0]
      }
      return `${selected.length} items selected`
    }

    // When badges are enabled
    const display = selected.slice(0, maxDisplayItems).map(value => (
      <Badge key={value} variant="secondary" className="mr-1 mb-1">
        {optionsMap[value] || value}
        <button
          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={() => handleUnselect(value)}
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
      </Badge>
    ))

    if (selected.length > maxDisplayItems) {
      display.push(
        <Badge key="more" variant="secondary" className="mr-1 mb-1">
          +{selected.length - maxDisplayItems} more
        </Badge>
      )
    }

    return <div className="flex flex-wrap">{display}</div>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${selected.length > 0 ? "h-auto min-h-10" : ""} ${className}`}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap items-center truncate">
            {displayValues()}
          </div>
          <div className="opacity-50">▼</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup heading={groupHeading}>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(selected.filter((item) => item !== option.value))
                      } else {
                        onChange([...selected, option.value])
                      }
                    }}
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}