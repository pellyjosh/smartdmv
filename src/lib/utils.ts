import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToHslParts(hex: string): string | null {
  if (!hex) return null;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else {
    return null; // Invalid hex format
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; // Default h, s to 0 for achromatic colors
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);

  return `${H} ${S}% ${L}%`;
}

export function getPetAvatarColors(name: string) {
  // Define a set of vibrant color combinations (bg + text)
  const colorPairs = [
    { bg: "bg-blue-100", text: "text-blue-800" },
    { bg: "bg-green-100", text: "text-green-800" },
    { bg: "bg-purple-100", text: "text-purple-800" },
    { bg: "bg-pink-100", text: "text-pink-800" },
    { bg: "bg-indigo-100", text: "text-indigo-800" },
    { bg: "bg-yellow-100", text: "text-yellow-800" },
    { bg: "bg-orange-100", text: "text-orange-800" },
    { bg: "bg-teal-100", text: "text-teal-800" },
    { bg: "bg-cyan-100", text: "text-cyan-800" },
    { bg: "bg-rose-100", text: "text-rose-800" },
  ]

  // Calculate a consistent index based on the name
  let hashCode = 0
  for (let i = 0; i < name.length; i++) {
    hashCode = (hashCode << 5) - hashCode + name.charCodeAt(i)
    hashCode = hashCode & hashCode // Convert to 32bit integer
  }

  // Use absolute value and modulo to get an index
  const index = Math.abs(hashCode) % colorPairs.length
  
  return colorPairs[index]
}

/**
 * Format a date in a user-friendly way
 * @param date The date to format
 * @returns Formatted date string (e.g., "May 6, 2025")
 */
export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
