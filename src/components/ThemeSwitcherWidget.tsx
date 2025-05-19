
"use client";

import { Palette, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';

export function ThemeSwitcherWidget() {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  // Local state for color input to avoid updating global state on every char change
  const [localPrimaryColor, setLocalPrimaryColor] = useState(primaryColor);

  useEffect(() => {
    setLocalPrimaryColor(primaryColor);
  }, [primaryColor]);

  const handlePrimaryColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPrimaryColor(e.target.value);
  };

  const applyPrimaryColor = () => {
    // Basic validation for hex color
    if (/^#[0-9A-F]{6}$/i.test(localPrimaryColor) || /^#[0-9A-F]{3}$/i.test(localPrimaryColor)) {
      setPrimaryColor(localPrimaryColor);
    } else {
      // Reset to current global primary if input is invalid
      setLocalPrimaryColor(primaryColor); 
      alert("Invalid HEX color format. Please use #RRGGBB or #RGB.");
    }
  };
  
  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card hover:bg-muted"
          aria-label="Open theme switcher"
        >
          <Palette className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-4 mb-2" side="top" align="end">
        <div className="space-y-2">
          <Label htmlFor="primary-color-picker" className="text-sm font-medium">
            Primary Color
          </Label>
          <div className="flex items-center space-x-2">
            <Input
              id="primary-color-picker"
              type="color"
              value={localPrimaryColor}
              onChange={handlePrimaryColorChange}
              className="h-8 w-12 p-0 border-none rounded-sm cursor-pointer" 
              aria-label="Primary color picker"
            />
            <Input
              type="text"
              value={localPrimaryColor}
              onChange={handlePrimaryColorChange}
              onBlur={applyPrimaryColor} // Apply on blur or could be on enter
              className="h-8 flex-1 text-sm"
              placeholder="#009eed"
              aria-label="Primary color hex input"
            />
          </div>
           <Button onClick={applyPrimaryColor} size="sm" variant="outline" className="w-full mt-1">Apply Color</Button>
        </div>

        <div className="flex items-center justify-between space-y-0.5">
          <Label htmlFor="dark-mode-toggle" className="text-sm font-medium">
            Dark Mode
          </Label>
          <div className="flex items-center">
            <Sun className="h-4 w-4 mr-2 text-muted-foreground" />
            <Switch
              id="dark-mode-toggle"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
              aria-label="Toggle dark mode"
            />
            <Moon className="h-4 w-4 ml-2 text-muted-foreground" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
