"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Palette, Save, RefreshCw } from 'lucide-react';

const ThemeCustomizationPage = () => {
  const { toast } = useToast();
  const {
    appearance,
    setAppearance,
    variant,
    setVariant,
    radius,
    setRadius,
    primaryColor,
    setPrimaryColor,
  } = useTheme();

  const presetColors: Record<string, string> = {
    'Sky Blue': '#009eed',
    'Forest Green': '#16a34a',
    'Royal Purple': '#8b5cf6',
    'Sunset Orange': '#f97316',
    'Teal': '#06b6d4',
  };

  const [localTheme, setLocalTheme] = useState({
    primary: primaryColor,
    appearance,
    variant,
    radius,
  });

  // Update local theme when theme changes
  useEffect(() => {
    setLocalTheme({
      primary: primaryColor,
      appearance,
      variant,
      radius,
    });
  }, [primaryColor, appearance, variant, radius]);

  const handleSave = async () => {
    try {
      setPrimaryColor(localTheme.primary);
      setAppearance(localTheme.appearance);
      setVariant(localTheme.variant);
      setRadius(localTheme.radius);
      toast({
        title: "Theme saved successfully",
        description: "Your theme changes have been applied.",
      });
    } catch (error) {
      toast({
        title: "Error saving theme",
        description: "Failed to save theme changes.",
        variant: "destructive",
      });
    }
  };

  const handleReset = async () => {
    try {
      const defaultTheme = {
        primary: '#009eed',
        variant: 'professional' as const,
        appearance: 'system' as const,
        radius: 0.5,
      };
      setPrimaryColor(defaultTheme.primary);
      setVariant(defaultTheme.variant);
      setAppearance(defaultTheme.appearance);
      setRadius(defaultTheme.radius);
      setLocalTheme(defaultTheme);
      toast({
        title: "Theme reset",
        description: "Theme has been reset to default settings.",
      });
    } catch (error) {
      toast({
        title: "Error resetting theme",
        description: "Failed to reset theme.",
        variant: "destructive",
      });
    }
  };

  const handlePrimaryColorChange = (colorName: string) => {
    if (presetColors[colorName]) {
      const newTheme = {
        ...localTheme,
        primary: presetColors[colorName]
      };
      setLocalTheme(newTheme);
    }
  };

  const handleCustomColorChange = (color: string) => {
    const newTheme = {
      ...localTheme,
      primary: color
    };
    setLocalTheme(newTheme);
  };

  const handleAppearanceChange = (appearance: "light" | "dark" | "system") => {
    const newTheme = {
      ...localTheme,
      appearance
    };
    setLocalTheme(newTheme);
  };

  const handleVariantChange = (variant: "professional" | "tint" | "vibrant") => {
    const newTheme = {
      ...localTheme,
      variant
    };
    setLocalTheme(newTheme);
  };

  const handleRadiusChange = (radius: number) => {
    const newTheme = {
      ...localTheme,
      radius
    };
    setLocalTheme(newTheme);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Theme Customization
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize the appearance and behavior of your application theme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Color</CardTitle>
              <CardDescription>
                Choose your primary theme color. This affects buttons, links, and accents throughout the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Primary Color</Label>
                <div className="flex gap-2 mt-2">
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: localTheme.primary }}
                  />
                  <Input
                    type="color"
                    value={localTheme.primary}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-12 h-12 p-1 cursor-pointer"
                  />
                  <Input
                    value={localTheme.primary}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#009eed"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Appearance</CardTitle>
              <CardDescription>
                Choose how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appearance">Theme Mode</Label>
                <Select
                  value={localTheme.appearance}
                  onValueChange={(value: "light" | "dark" | "system") => handleAppearanceChange(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="dark">Dark Mode</SelectItem>
                    <SelectItem value="system">System Preference</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Choose light mode for bright backgrounds, dark mode for dark backgrounds,
                  or system to match your device preference.
                </p>
              </div>

              <div>
                <Label htmlFor="variant">Theme Variant</Label>
                <Select
                  value={localTheme.variant}
                  onValueChange={(value: "professional" | "tint" | "vibrant") => handleVariantChange(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="tint">Tint</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Professional uses subtle colors, tint adds slight background coloring,
                  vibrant uses more saturated colors.
                </p>
              </div>

              <div>
                <Label htmlFor="radius">Border Radius</Label>
                <Select
                  value={localTheme.radius?.toString() || '0.5'}
                  onValueChange={(value) => handleRadiusChange(parseFloat(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None (Sharp corners)</SelectItem>
                    <SelectItem value="0.25">Subtle (0.25rem)</SelectItem>
                    <SelectItem value="0.5">Medium (0.5rem)</SelectItem>
                    <SelectItem value="0.6">Default (0.6rem)</SelectItem>
                    <SelectItem value="0.75">Rounded (0.75rem)</SelectItem>
                    <SelectItem value="1">Very Rounded (1rem)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Controls how rounded the corners are throughout the interface.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Presets</CardTitle>
              <CardDescription>
                Quickly apply popular theme combinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Professional Light</CardTitle>
                    <CardDescription>Classic business theme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#ffffff" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#f8fafc" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#3b82f6" }} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const next = {
                          primary: presetColors["Sky Blue"],
                          variant: "professional" as const,
                          appearance: "light" as const,
                          radius: 0.6,
                        };
                        setPrimaryColor(next.primary);
                        setVariant(next.variant);
                        setAppearance(next.appearance);
                        setRadius(next.radius);
                        setLocalTheme(next);
                      }}
                    >
                      Apply Theme
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Dark Professional</CardTitle>
                    <CardDescription>Modern dark theme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#0f172a" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#1e293b" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#3b82f6" }} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const next = {
                          primary: presetColors["Sky Blue"],
                          variant: "professional" as const,
                          appearance: "dark" as const,
                          radius: 0.6,
                        };
                        setPrimaryColor(next.primary);
                        setVariant(next.variant);
                        setAppearance(next.appearance);
                        setRadius(next.radius);
                        setLocalTheme(next);
                      }}
                    >
                      Apply Theme
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Vibrant Ocean</CardTitle>
                    <CardDescription>Bright and energetic</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#ffffff" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#f0f9ff" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#06b6d4" }} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const next = {
                          primary: presetColors["Teal"],
                          variant: "vibrant" as const,
                          appearance: "light" as const,
                          radius: 0.75,
                        };
                        setPrimaryColor(next.primary);
                        setVariant(next.variant);
                        setAppearance(next.appearance);
                        setRadius(next.radius);
                        setLocalTheme(next);
                      }}
                    >
                      Apply Theme
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Forest Theme</CardTitle>
                    <CardDescription>Nature-inspired colors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#f0fdf4" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#dcfce7" }} />
                      <div className="flex-1 h-8 rounded" style={{ backgroundColor: "#16a34a" }} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const next = {
                          primary: presetColors["Forest Green"],
                          variant: "tint" as const,
                          appearance: "light" as const,
                          radius: 0.5,
                        };
                        setPrimaryColor(next.primary);
                        setVariant(next.variant);
                        setAppearance(next.appearance);
                        setRadius(next.radius);
                        setLocalTheme(next);
                      }}
                    >
                      Apply Theme
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Theme
        </Button>
      </div>
    </div>
  );
};

export default ThemeCustomizationPage;
