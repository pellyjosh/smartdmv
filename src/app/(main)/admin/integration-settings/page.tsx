"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Laptop, 
  Link as LinkIcon, 
  Globe, 
  Code, 
  Clock, 
  Calendar,
  Palette,
  Settings,
  Eye,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Info,
  Smartphone,
  Monitor,
  AlertTriangle
} from "lucide-react";
import { MarketplaceFeatureContainer } from "@/components/features/marketplace-feature-message";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Widget configuration interfaces
interface WidgetSettings {
  // Appearance
  theme: 'light' | 'dark' | 'auto' | 'custom';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: number;
  position: 'inline' | 'floating-right' | 'floating-left' | 'modal';
  
  // Availability
  availableDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  timeSlotDuration: number; // in minutes
  advanceBookingDays: number;
  
  // Appointment Types
  appointmentTypes: {
    id: string;
    name: string;
    duration: number;
    description: string;
    color: string;
    enabled: boolean;
  }[];
  
  // Required Fields
  requiredFields: {
    clientName: boolean;
    clientEmail: boolean;
    clientPhone: boolean;
    petName: boolean;
    petType: boolean;
    petBreed: boolean;
    petAge: boolean;
    reason: boolean;
    preferredDoctor: boolean;
  };
  
  // Text Customization
  customTexts: {
    headerTitle: string;
    headerSubtitle: string;
    buttonText: string;
    successMessage: string;
    errorMessage: string;
    footerText: string;
  };
  
  // Advanced Settings
  enableAutoConfirmation: boolean;
  sendEmailNotifications: boolean;
  enableCalendarSync: boolean;
  showAvailableSlots: boolean;
  allowCancellation: boolean;
  cancellationPolicy: string;
}

interface ApiSettings {
  apiKey: string;
  webhookUrl: string;
  allowedOrigins: string[];
  rateLimitPerHour: number;
  enableCors: boolean;
  permissions: {
    readAccess: boolean;
    writeAccess: boolean;
    clientAccess: boolean;
    practitionerAccess: boolean;
  };
}

const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  theme: 'light',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  fontFamily: 'system-ui',
  borderRadius: 8,
  position: 'inline',
  
  availableDays: [],
  workingHours: { start: '09:00', end: '17:00' },
  timeSlotDuration: 30,
  advanceBookingDays: 30,
  
  appointmentTypes: [],
  
  requiredFields: {
    clientName: true,
    clientEmail: true,
    clientPhone: true,
    petName: true,
    petType: true,
    petBreed: false,
    petAge: false,
    reason: true,
    preferredDoctor: false,
  },
  
  customTexts: {
    headerTitle: 'Book an Appointment',
    headerSubtitle: 'Schedule your pet\'s visit with our experienced veterinarians',
    buttonText: 'Schedule Appointment',
    successMessage: 'Your appointment request has been submitted successfully!',
    errorMessage: 'There was an error submitting your request. Please try again.',
    footerText: 'We\'ll contact you within 24 hours to confirm your appointment.',
  },
  
  enableAutoConfirmation: false,
  sendEmailNotifications: true,
  enableCalendarSync: true,
  showAvailableSlots: true,
  allowCancellation: true,
  cancellationPolicy: 'Appointments can be cancelled up to 24 hours in advance.',
};

const DEFAULT_API_SETTINGS: ApiSettings = {
  apiKey: '',
  webhookUrl: '',
  allowedOrigins: [],
  rateLimitPerHour: 100,
  enableCors: true,
  permissions: {
    readAccess: true,
    writeAccess: true,
    clientAccess: false,
    practitionerAccess: false,
  },
};

export default function IntegrationSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(DEFAULT_API_SETTINGS);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [practiceData, setPracticeData] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [appConfig, setAppConfig] = useState<{ baseUrl: string; environment: string } | null>(null);
  
  // Load app configuration
  useQuery({
    queryKey: ['/api/app-config'],
    queryFn: async () => {
      const response = await fetch('/api/app-config');
      if (!response.ok) throw new Error('Failed to load app config');
      const config = await response.json();
      setAppConfig(config);
      return config;
    },
  });
  
  // Load saved settings on component mount
  useQuery({
    queryKey: ['/api/integration-settings'],
    queryFn: async () => {
      const response = await fetch('/api/integration-settings');
      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      
      if (data.widgetSettings) setWidgetSettings(data.widgetSettings);
      if (data.apiSettings) {
        // Merge with defaults to ensure all fields exist
        setApiSettings(prev => ({
          ...prev,
          ...data.apiSettings,
          allowedOrigins: data.apiSettings.allowedOrigins || [],
          permissions: data.apiSettings.permissions || prev.permissions
        }));
      }
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
      if (data.isVerified) setIsVerified(data.isVerified);
      
      return data;
    },
    retry: false,
  });

  // Load practice-specific data for widget configuration
  useQuery({
    queryKey: ['/api/integration-settings/practice-data'],
    queryFn: async () => {
      const response = await fetch('/api/integration-settings/practice-data');
      if (!response.ok) throw new Error('Failed to load practice data');
      const data = await response.json();
      setPracticeData(data);
      
      // Update widget settings with practice-specific defaults if no existing appointment types
      if ((widgetSettings.appointmentTypes || []).length === 0 && data.appointmentTypes) {
        setWidgetSettings(prev => ({
          ...prev,
          appointmentTypes: data.appointmentTypes,
          availableDays: data.defaultSettings.availableDays,
          workingHours: data.defaultSettings.workingHours,
          customTexts: {
            ...prev.customTexts,
            headerTitle: `Book an Appointment at ${data.practice.name}`,
            headerSubtitle: `Schedule your pet's visit with ${data.practice.name}`,
          }
        }));
      }
      
      return data;
    },
    retry: false,
  });
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integration-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetSettings,
          apiSettings,
          websiteUrl,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Your integration settings have been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-settings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Generate API key mutation
  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integration-settings/generate-api-key', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate API key');
      return response.json();
    },
    onSuccess: (data) => {
      setApiSettings(prev => ({ 
        ...prev, 
        apiKey: data.apiKey,
        lastGenerated: new Date().toISOString()
      }));
      toast({
        title: 'API Key Generated',
        description: 'A new API key has been generated successfully.',
      });
      // Refresh the integration settings to get updated data
      queryClient.invalidateQueries({ queryKey: ['/api/integration-settings'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate API key. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Verify website mutation
  const verifyWebsiteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integration-settings/verify-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      });
      if (!response.ok) throw new Error('Failed to verify website');
      return response.json();
    },
    onSuccess: (data) => {
      setIsVerified(data.verified);
      toast({
        title: data.verified ? 'Website Verified' : 'Verification Failed',
        description: data.message,
        variant: data.verified ? 'default' : 'destructive',
      });
    },
  });
  
  // Helper functions
  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(item);
      setTimeout(() => setCopiedItem(null), 2000);
      toast({
        title: 'Copied to clipboard',
        description: `${item} copied successfully`,
      });
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };
  
  // Helper function to get consistent base URL
  const getBaseUrl = () => {
    return appConfig?.baseUrl || 
           (process.env.NODE_ENV === 'production' 
             ? 'https://your-domain.com' 
             : 'http://localhost:9002');
  };
  
  const generateEmbedCode = () => {
    const practiceId = practiceData?.practice?.id || 'YOUR_PRACTICE_ID';
    const apiKey = apiSettings.apiKey || 'YOUR_API_KEY';
    const baseUrl = getBaseUrl();
    
    // Minimal configuration - everything else will be fetched dynamically
    const config = {
      practiceId: practiceId,
      apiKey: apiKey,
      baseUrl: baseUrl
      // All other settings (theme, colors, text, etc.) will be fetched from API
    };
    
    return `<!-- SmartDVM Appointment Widget -->
<script>
  window.smartDVMConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="${baseUrl}/widget/booking-widget.js" async></script>
<div id="smartdvm-booking-widget"></div>`;
  };

  // Widget Preview Component
  const WidgetPreview = ({ previewDevice = 'desktop' }: { previewDevice?: 'desktop' | 'mobile' }) => {
    const appointmentTypes = (widgetSettings.appointmentTypes || []).filter(type => type.enabled);
    
    // Business hours and availability configuration
    const businessConfig = {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday, 1 = Monday, etc.)
      workingHours: {
        start: '09:00',
        end: '17:00',
        timeSlots: [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
          '15:00', '15:30', '16:00', '16:30'
        ]
      },
      // This will be populated from API with real booking data
      bookedSlots: [] as string[],
      maxMonthsAhead: 3 // Allow booking up to 3 months ahead
    };

    // Load real availability data
    const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
    
    useEffect(() => {
      const loadAvailability = async () => {
        try {
          // Include past month to show historical bookings correctly
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 month ago
          const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 months ahead
          
          const response = await fetch(`/api/widget/availability?practiceId=${practiceData?.practice?.id}&startDate=${startDate}&endDate=${endDate}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              businessConfig.bookedSlots = data.bookedSlots || [];
              console.log('Preview loaded availability data:', data.bookedSlots.length, 'booked slots');
              console.log('Preview booked slots:', data.bookedSlots);
              setAvailabilityLoaded(true);
            }
          }
        } catch (error) {
          console.warn('Error loading availability data in preview:', error);
          setAvailabilityLoaded(true); // Continue with empty slots
        }
      };

      if (practiceData?.practice?.id) {
        loadAvailability();
      }
    }, [practiceData?.practice?.id]);

    // Calendar state
    const [calendarState, setCalendarState] = useState({
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear()
    });

    // Helper functions for date/time management
    const isWorkingDay = (date: string) => {
      const dayOfWeek = new Date(date).getDay();
      return businessConfig.workingDays.includes(dayOfWeek);
    };

    const isAvailableDate = (date: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
      
      return selectedDate >= today && 
             selectedDate <= maxDate && 
             isWorkingDay(date);
    };

    const isAvailableTime = (date: string, time: string) => {
      if (!date || !time) return false;
      
      const dateTime = `${date}T${time}`;
      const selectedDateTime = new Date(dateTime);
      const now = new Date();
      
      // Check if it's in the future
      if (selectedDateTime <= now) return false;
      
      // Check if it's a working day
      if (!isWorkingDay(date)) return false;
      
      // Check if time is within business hours
      if (!businessConfig.workingHours.timeSlots.includes(time)) return false;
      
      // Check if slot is not booked
      const slotKey = `${date}_${time}`;
      return !businessConfig.bookedSlots.includes(slotKey);
    };

    const hasAvailableSlots = (date: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      
      // If date is in the past, it's closed (not fully booked)
      if (selectedDate < today) return false;
      
      // If it's not a working day, it's closed
      if (!isWorkingDay(date)) return false;
      
      // If it's beyond our booking window, it's closed
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
      if (selectedDate > maxDate) return false;
      
      // Check if any time slot is available for this date
      return businessConfig.workingHours.timeSlots.some(time => 
        isAvailableTime(date, time)
      );
    };

    const generateCalendarMonth = (month: number, year: number) => {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
      
      const days = [];
      const current = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Generate 6 weeks (42 days) to fill calendar grid
      for (let i = 0; i < 42; i++) {
        const dateString = current.toISOString().split('T')[0];
        const isCurrentMonth = current.getMonth() === month;
        const isToday = current.toDateString() === new Date().toDateString();
        const currentDateObj = new Date(current);
        currentDateObj.setHours(0, 0, 0, 0);
        
        let dayStatus = 'unavailable'; // Default for non-working days or past dates
        
        if (isCurrentMonth) {
          if (currentDateObj < today) {
            // Past dates are closed
            dayStatus = 'unavailable';
          } else if (!isWorkingDay(dateString)) {
            // Weekends are closed
            dayStatus = 'unavailable';
          } else if (hasAvailableSlots(dateString)) {
            // Working day with available slots
            dayStatus = 'available';
          } else {
            // Working day but fully booked
            dayStatus = 'working-no-slots';
          }
        }
        
        days.push({
          date: dateString,
          dayNumber: current.getDate(),
          isCurrentMonth,
          isToday,
          isAvailable: dayStatus === 'available',
          isWorkingDay: isWorkingDay(dateString) && currentDateObj >= today,
          status: dayStatus
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    };

    const getMonthName = (month: number, year: number) => {
      return new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + businessConfig.maxMonthsAhead);
      
      setCalendarState(prev => {
        if (direction === 'prev') {
          if (prev.currentYear > today.getFullYear() || 
             (prev.currentYear === today.getFullYear() && prev.currentMonth > today.getMonth())) {
            let newMonth = prev.currentMonth - 1;
            let newYear = prev.currentYear;
            if (newMonth < 0) {
              newMonth = 11;
              newYear--;
            }
            return { currentMonth: newMonth, currentYear: newYear };
          }
        } else if (direction === 'next') {
          if (prev.currentYear < maxDate.getFullYear() || 
             (prev.currentYear === maxDate.getFullYear() && prev.currentMonth < maxDate.getMonth())) {
            let newMonth = prev.currentMonth + 1;
            let newYear = prev.currentYear;
            if (newMonth > 11) {
              newMonth = 0;
              newYear++;
            }
            return { currentMonth: newMonth, currentYear: newYear };
          }
        }
        return prev;
      });
    };
    
    // Interactive preview state
    const [previewState, setPreviewState] = useState({
      selectedType: '',
      selectedDate: '',
      selectedTime: '',
      dropdownOpen: false,
      searchTerm: '',
      formData: {
        name: '',
        email: '',
        phone: '',
        petName: '',
        petType: '',
        petBreed: '',
        petAge: '',
        reason: ''
      }
    });
    
    // Filter appointment types based on search
    const filteredTypes = appointmentTypes.filter(type =>
      type.name.toLowerCase().includes(previewState.searchTerm.toLowerCase()) ||
      type.description.toLowerCase().includes(previewState.searchTerm.toLowerCase())
    );
    
    const selectedTypeData = appointmentTypes.find(t => t.id === previewState.selectedType);
    
    if (appointmentTypes.length === 0) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointment Types</h3>
          <p className="text-gray-500 mb-4">Add at least one appointment type to see the widget preview.</p>
          <Button variant="outline" size="sm" onClick={() => {
            // Focus on appointment types tab
            const tab = document.querySelector('[value="appointment-types"]') as HTMLElement;
            tab?.click();
          }}>
            Add Appointment Types
          </Button>
        </div>
      );
    }

    const handleTypeSelect = (typeId: string) => {
      setPreviewState(prev => ({
        ...prev,
        selectedType: typeId,
        dropdownOpen: false,
        searchTerm: ''
      }));
    };

    const handleDateSelect = (date: string) => {
      if (isAvailableDate(date)) {
        setPreviewState(prev => ({ 
          ...prev, 
          selectedDate: date,
          selectedTime: '' // Reset time when date changes
        }));
      }
    };

    const handleTimeSelect = (time: string) => {
      if (isAvailableTime(previewState.selectedDate, time)) {
        setPreviewState(prev => ({ ...prev, selectedTime: time }));
      }
    };

    const handleFormChange = (field: string, value: string) => {
      setPreviewState(prev => ({
        ...prev,
        formData: { ...prev.formData, [field]: value }
      }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      toast({
        title: "Preview Mode",
        description: "This is a preview. The form won't actually submit.",
        duration: 3000
      });
    };

    return (
      <div 
        className={`border rounded-lg bg-white shadow-sm relative ${
          previewDevice === 'mobile' ? 'max-w-sm mx-auto' : 'w-full max-w-2xl'
        }`}
        style={{
          fontFamily: widgetSettings.fontFamily,
          borderRadius: `${widgetSettings.borderRadius}px`,
          backgroundColor: widgetSettings.theme === 'dark' ? '#1a202c' : '#ffffff',
          color: widgetSettings.theme === 'dark' ? '#ffffff' : '#1a202c',
          minHeight: '600px', // Ensure minimum height to show all content
          height: 'auto' // Let content determine height
        }}
        onClick={(e) => {
          // Close dropdown when clicking outside
          const target = e.target as HTMLElement;
          if (!target.closest('.dropdown-container')) {
            setPreviewState(prev => ({ ...prev, dropdownOpen: false }));
          }
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 
              className="text-2xl font-bold mb-2"
              style={{ color: widgetSettings.primaryColor }}
            >
              {widgetSettings.customTexts.headerTitle}
            </h2>
            <p className="text-gray-600">
              {widgetSettings.customTexts.headerSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Appointment Types - Interactive Searchable Dropdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Select Service</h3>
              <div className="relative dropdown-container">
                <button
                  type="button"
                  className="w-full p-3 border rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors text-left"
                  style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewState(prev => ({ ...prev, dropdownOpen: !prev.dropdownOpen }));
                  }}
                >
                  <div className="flex-1">
                    {selectedTypeData ? (
                      <>
                        <div className="font-medium text-gray-900">
                          {selectedTypeData.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedTypeData.description} • {selectedTypeData.duration}min
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500">Select a service...</div>
                    )}
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      previewState.dropdownOpen ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Interactive Dropdown */}
                {previewState.dropdownOpen && (
                  <div 
                    className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-auto"
                    style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                  >
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          className="w-full pl-10 pr-4 py-2 border rounded-md text-sm placeholder-gray-500 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none"
                          placeholder="Search services..."
                          value={previewState.searchTerm}
                          onChange={(e) => setPreviewState(prev => ({ ...prev, searchTerm: e.target.value }))}
                          style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {/* Options */}
                    <div className="py-1">
                      {filteredTypes.length > 0 ? (
                        filteredTypes.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            className={`w-full px-4 py-3 cursor-pointer transition-colors text-left ${
                              previewState.selectedType === type.id 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleTypeSelect(type.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{type.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium" style={{ color: type.color }}>
                                  {type.duration}min
                                </span>
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: type.color }}
                                />
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No services found matching "{previewState.searchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Date/Time Selection */}
            {previewState.selectedType && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Select Date & Time</h3>
                
                {/* Calendar Widget */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <label className="block text-sm font-medium text-gray-700 mb-2 px-4 pt-4">Preferred Date *</label>
                  
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                      </svg>
                    </button>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {getMonthName(calendarState.currentMonth, calendarState.currentYear)}
                    </h4>
                    <button
                      type="button"
                      onClick={() => navigateMonth('next')}
                      className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Calendar Days Header */}
                  <div className="grid grid-cols-7 bg-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7">
                    {generateCalendarMonth(calendarState.currentMonth, calendarState.currentYear).map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`relative p-3 text-center border-r border-b border-gray-200 last:border-r-0 min-h-[48px] transition-all ${
                          !day.isCurrentMonth
                            ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                            : day.status === 'available'
                            ? previewState.selectedDate === day.date
                              ? 'bg-blue-500 text-white font-semibold'
                              : 'bg-white text-green-600 hover:bg-green-50 hover:scale-105'
                            : day.status === 'working-no-slots'
                            ? 'bg-yellow-50 text-yellow-600'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        } ${day.isToday ? 'font-bold' : ''}`}
                        style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                        onClick={() => day.isAvailable && day.isCurrentMonth && handleDateSelect(day.date)}
                        disabled={!day.isAvailable || !day.isCurrentMonth}
                        title={
                          !day.isCurrentMonth ? '' :
                          day.status === 'available' ? `Available: ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : 
                          day.status === 'working-no-slots' ? 'Fully booked' : 'Closed'
                        }
                      >
                        {day.dayNumber}
                        {day.isToday && (
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        )}
                        {day.isCurrentMonth && (
                          <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                            day.status === 'available' ? 'bg-green-400' : day.status === 'working-no-slots' ? 'bg-yellow-400' : 'bg-gray-300'
                          }`}></div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Calendar Legend */}
                  <div className="flex justify-center gap-4 p-3 bg-gray-50 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span>Fully Booked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span>Closed</span>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Preferred Time *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {businessConfig.workingHours.timeSlots.map((time) => {
                      const isAvailable = isAvailableTime(previewState.selectedDate, time);
                      const isSelected = previewState.selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          className={`p-3 text-center border-2 rounded transition-all ${
                            isAvailable 
                              ? isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                          style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                          onClick={() => isAvailable && handleTimeSelect(time)}
                          disabled={!isAvailable}
                          title={isAvailable ? time : 'Not available'}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                  {!previewState.selectedDate && (
                    <p className="text-sm text-gray-500 text-center">Please select a date first</p>
                  )}
                  <p className="text-sm text-gray-500 text-center">Business Hours: 9:00 AM - 5:00 PM • Monday - Friday</p>
                </div>
              </div>
            )}

            {/* Always show date/time section when no service selected */}
            {!previewState.selectedType && (
              <div className="space-y-4 opacity-60">
                <h3 className="font-semibold text-lg text-gray-400">Select Date & Time</h3>
                
                {/* Disabled Calendar */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <label className="block text-sm font-medium text-gray-400 mb-2 px-4 pt-4">Preferred Date *</label>
                  
                  {/* Disabled Calendar Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                    <button type="button" disabled className="p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                      </svg>
                    </button>
                    <h4 className="text-lg font-semibold text-gray-400">
                      {getMonthName(calendarState.currentMonth, calendarState.currentYear)}
                    </h4>
                    <button type="button" disabled className="p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed">
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Disabled Calendar Days Header */}
                  <div className="grid grid-cols-7 bg-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-semibold text-gray-400 border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Disabled Calendar Days */}
                  <div className="grid grid-cols-7">
                    {generateCalendarMonth(calendarState.currentMonth, calendarState.currentYear).slice(0, 14).map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        className="p-3 text-center border-r border-b border-gray-200 last:border-r-0 min-h-[48px] bg-gray-50 text-gray-400 cursor-not-allowed"
                        disabled
                      >
                        {day.dayNumber}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disabled Time Slots */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-400">Preferred Time *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {businessConfig.workingHours.timeSlots.slice(0, 8).map((time, index) => (
                      <button
                        key={index}
                        type="button"
                        className="p-3 text-center border-2 border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 rounded"
                        style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                        disabled
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    Select a service first to choose date and time
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Form - Always visible but conditional functionality */}
            <div className={`space-y-3 ${
              !previewState.selectedDate || !previewState.selectedTime 
                ? 'opacity-60' 
                : ''
            }`}>
              <h3 className={`font-semibold text-lg ${
                !previewState.selectedDate || !previewState.selectedTime 
                  ? 'text-gray-400' 
                  : ''
              }`}>
                Your Information
              </h3>
              <div className="grid gap-3">
                {/* Name and Email Row */}
                <div className="grid grid-cols-2 gap-3">
                  {widgetSettings.requiredFields.clientName && (
                    <input
                      className={`p-3 border rounded transition-colors ${
                        previewState.selectedDate && previewState.selectedTime
                          ? 'bg-white focus:border-blue-500 outline-none'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      }`}
                      placeholder="Your Name *"
                      value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.name : ''}
                      onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('name', e.target.value)}
                      style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                      disabled={!previewState.selectedDate || !previewState.selectedTime}
                    />
                  )}
                  {widgetSettings.requiredFields.clientEmail && (
                    <input
                      className={`p-3 border rounded transition-colors ${
                        previewState.selectedDate && previewState.selectedTime
                          ? 'bg-white focus:border-blue-500 outline-none'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      } ${!widgetSettings.requiredFields.clientName ? 'col-span-2' : ''}`}
                      placeholder="Email *"
                      type="email"
                      value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.email : ''}
                      onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('email', e.target.value)}
                      style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                      disabled={!previewState.selectedDate || !previewState.selectedTime}
                    />
                  )}
                </div>
                
                {/* Phone Number */}
                {widgetSettings.requiredFields.clientPhone && (
                  <input
                    className={`p-3 border rounded transition-colors ${
                      previewState.selectedDate && previewState.selectedTime
                        ? 'bg-white focus:border-blue-500 outline-none'
                        : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                    }`}
                    placeholder="Phone Number *"
                    value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.phone : ''}
                    onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('phone', e.target.value)}
                    style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                    disabled={!previewState.selectedDate || !previewState.selectedTime}
                  />
                )}
                
                {/* Pet Information Row */}
                <div className="grid grid-cols-2 gap-3">
                  {widgetSettings.requiredFields.petName && (
                    <input
                      className={`p-3 border rounded transition-colors ${
                        previewState.selectedDate && previewState.selectedTime
                          ? 'bg-white focus:border-blue-500 outline-none'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      }`}
                      placeholder="Pet's Name *"
                      value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.petName : ''}
                      onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('petName', e.target.value)}
                      style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                      disabled={!previewState.selectedDate || !previewState.selectedTime}
                    />
                  )}
                  {widgetSettings.requiredFields.petType && (
                    <select
                      className={`p-3 border rounded transition-colors ${
                        previewState.selectedDate && previewState.selectedTime
                          ? 'bg-white focus:border-blue-500 outline-none'
                          : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      } ${!widgetSettings.requiredFields.petName ? 'col-span-2' : ''}`}
                      value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.petType : ''}
                      onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('petType', e.target.value)}
                      style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                      disabled={!previewState.selectedDate || !previewState.selectedTime}
                    >
                      <option value="">Pet Type *</option>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="bird">Bird</option>
                      <option value="rabbit">Rabbit</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                </div>
                
                {/* Optional Fields */}
                {(widgetSettings.requiredFields.petBreed || widgetSettings.requiredFields.petAge) && (
                  <div className="grid grid-cols-2 gap-3">
                    {widgetSettings.requiredFields.petBreed && (
                      <input
                        className={`p-3 border rounded transition-colors ${
                          previewState.selectedDate && previewState.selectedTime
                            ? 'bg-white focus:border-blue-500 outline-none'
                            : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                        }`}
                        placeholder="Pet Breed"
                        value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.petBreed || '' : ''}
                        onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('petBreed', e.target.value)}
                        style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                        disabled={!previewState.selectedDate || !previewState.selectedTime}
                      />
                    )}
                    {widgetSettings.requiredFields.petAge && (
                      <input
                        className={`p-3 border rounded transition-colors ${
                          previewState.selectedDate && previewState.selectedTime
                            ? 'bg-white focus:border-blue-500 outline-none'
                            : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                        } ${!widgetSettings.requiredFields.petBreed ? 'col-span-2' : ''}`}
                        placeholder="Pet Age"
                        value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.petAge || '' : ''}
                        onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('petAge', e.target.value)}
                        style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                        disabled={!previewState.selectedDate || !previewState.selectedTime}
                      />
                    )}
                  </div>
                )}
                
                {/* Reason/Notes */}
                {widgetSettings.requiredFields.reason && (
                  <textarea
                    className={`p-3 border rounded transition-colors ${
                      previewState.selectedDate && previewState.selectedTime
                        ? 'bg-white focus:border-blue-500 outline-none'
                        : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                    }`}
                    placeholder="Reason for visit *"
                    rows={3}
                    value={previewState.selectedDate && previewState.selectedTime ? previewState.formData.reason || '' : ''}
                    onChange={(e) => (previewState.selectedDate && previewState.selectedTime) && handleFormChange('reason', e.target.value)}
                    style={{ borderRadius: `${widgetSettings.borderRadius}px` }}
                    disabled={!previewState.selectedDate || !previewState.selectedTime}
                  />
                )}
              </div>
              
              <button
                type="submit"
                className={`w-full p-3 text-white font-semibold rounded transition-all ${
                  (!previewState.selectedDate || !previewState.selectedTime || !previewState.formData.name || !previewState.formData.email)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: widgetSettings.primaryColor,
                  borderRadius: `${widgetSettings.borderRadius}px`
                }}
                disabled={!previewState.selectedDate || !previewState.selectedTime || !previewState.formData.name || !previewState.formData.email}
              >
                {widgetSettings.customTexts.buttonText}
              </button>
              
              {(!previewState.selectedDate || !previewState.selectedTime) && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Complete the steps above to enable this form
                </p>
              )}
            </div>
          </form>
          
          {/* Preview Mode Indicator */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              Preview Mode
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // Simple Text Editor-like Embed Code Display
  const EmbedCodeDisplay = () => {
    const embedCode = generateEmbedCode();
    const codeLines = embedCode.split('\n');

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Embed Code</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(embedCode, 'Embed code')}
            className="flex items-center gap-2"
          >
            {copiedItem === 'Embed code' ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        {/* Code Editor */}
        <div className="relative">
          <div className="bg-black rounded-lg border border-gray-300 overflow-hidden">
            {/* Editor Header */}
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-300 text-sm ml-2">booking-widget-embed.html</span>
              </div>
            </div>

            {/* Code Content */}
            <div className="bg-black text-green-400 p-4 font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
              <div className="flex">
                {/* Line Numbers */}
                <div className="text-gray-500 pr-4 select-none">
                  {codeLines.map((_, index) => (
                    <div key={index} className="leading-6 text-right">
                      {(index + 1).toString().padStart(2, ' ')}
                    </div>
                  ))}
                </div>
                
                {/* Code */}
                <div className="flex-1">
                  <pre className="leading-6 whitespace-pre-wrap text-green-400">
                    {embedCode}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">How to use this code:</h4>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            <li>Copy the embed code above</li>
            <li>Paste it into your website's HTML where you want the booking widget</li>
            <li>The widget will automatically load with your settings</li>
          </ol>
        </div>
      </div>
    );
  };
  
  const updateWidgetSetting = (path: string, value: any) => {
    setWidgetSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };
  
  const addAppointmentType = () => {
    const newType = {
      id: `type-${Date.now()}`,
      name: 'New Appointment Type',
      duration: 30,
      description: '',
      color: '#3b82f6',
      enabled: true,
    };
    
    setWidgetSettings(prev => ({
      ...prev,
      appointmentTypes: [...(prev.appointmentTypes || []), newType],
    }));
  };
  
  const removeAppointmentType = (id: string) => {
    setWidgetSettings(prev => ({
      ...prev,
      appointmentTypes: (prev.appointmentTypes || []).filter(type => type.id !== id),
    }));
  };
  
  const updateAppointmentType = (id: string, field: string, value: any) => {
    setWidgetSettings(prev => ({
      ...prev,
      appointmentTypes: (prev.appointmentTypes || []).map(type =>
        type.id === id ? { ...type, [field]: value } : type
      ),
    }));
  };
  return (
    <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Website Integration</h1>
          <Button 
            onClick={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending}
            className="gap-2"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
        
        <MarketplaceFeatureContainer
          featureId="WEBSITE_APPOINTMENT_INTEGRATION"
          featureName="Website Integration"
          description="Connect your practice's website with SmartDVM to allow clients to schedule appointments online. This add-on provides website widgets, embed codes, and APIs for seamless integration with your clinic's online presence."
          addOnId="6"
        >
          <Tabs defaultValue="configuration" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="widget-design">Widget Design</TabsTrigger>
              <TabsTrigger value="appointment-types">Appointment Types</TabsTrigger>
              <TabsTrigger value="embed-code">Embed Code</TabsTrigger>
              <TabsTrigger value="api-settings">API Settings</TabsTrigger>
            </TabsList>

            {/* Configuration Tab */}
            <TabsContent value="configuration" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Website Connection</CardTitle>
                  <CardDescription>
                    Connect your practice website to enable online appointment scheduling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="website-url">Your Website URL</Label>
                    <div className="flex space-x-2">
                      <div className="relative w-full">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website-url"
                          placeholder="https://your-veterinary-practice.com"
                          className="pl-9"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => verifyWebsiteMutation.mutate()}
                        disabled={verifyWebsiteMutation.isPending || !websiteUrl}
                      >
                        {verifyWebsiteMutation.isPending ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                    {isVerified && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        Website verified successfully
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      We'll verify your website ownership before enabling integration features
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Confirmation</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically confirm appointment requests from your website
                        </p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableAutoConfirmation}
                        onCheckedChange={(checked) => updateWidgetSetting('enableAutoConfirmation', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send email notifications for new appointments
                        </p>
                      </div>
                      <Switch 
                        checked={widgetSettings.sendEmailNotifications}
                        onCheckedChange={(checked) => updateWidgetSetting('sendEmailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Calendar Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Sync appointments with your practice calendar
                        </p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableCalendarSync}
                        onCheckedChange={(checked) => updateWidgetSetting('enableCalendarSync', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Availability Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability Settings
                  </CardTitle>
                  <CardDescription>
                    Configure when clients can book appointments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Available Days</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <div key={day} className="flex flex-col items-center">
                            <span className="text-xs mb-1 capitalize">{day.slice(0, 3)}</span>
                            <Switch
                              checked={widgetSettings.availableDays.includes(day)}
                              onCheckedChange={(checked) => {
                                const newDays = checked
                                  ? [...widgetSettings.availableDays, day]
                                  : widgetSettings.availableDays.filter(d => d !== day);
                                updateWidgetSetting('availableDays', newDays);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={widgetSettings.workingHours.start}
                            onChange={(e) => updateWidgetSetting('workingHours.start', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={widgetSettings.workingHours.end}
                            onChange={(e) => updateWidgetSetting('workingHours.end', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Time Slot Duration (minutes)</Label>
                        <Select 
                          value={widgetSettings.timeSlotDuration.toString()}
                          onValueChange={(value) => updateWidgetSetting('timeSlotDuration', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Advance Booking (days)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={widgetSettings.advanceBookingDays}
                          onChange={(e) => updateWidgetSetting('advanceBookingDays', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Widget Design Tab */}
            <TabsContent value="widget-design" className="space-y-6 pt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column - Live Preview */}
                <div className="lg:sticky lg:top-6 lg:h-fit">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Live Preview
                        <div className="ml-auto flex gap-2">
                          <Button
                            variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewDevice('desktop')}
                            className="flex items-center gap-2"
                          >
                            <Monitor className="h-4 w-4" />
                            Desktop
                          </Button>
                          <Button
                            variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewDevice('mobile')}
                            className="flex items-center gap-2"
                          >
                            <Smartphone className="h-4 w-4" />
                            Mobile
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Preview how your booking widget will appear on your website
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 min-h-[600px]">
                      <WidgetPreview previewDevice={previewDevice} />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Widget Appearance Settings */}
                <div className="space-y-6">
                  <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Widget Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize the look and feel of your appointment widget. Changes are reflected in the live preview above.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select 
                          value={widgetSettings.theme}
                          onValueChange={(value) => updateWidgetSetting('theme', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto (System)</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={widgetSettings.primaryColor}
                              onChange={(e) => updateWidgetSetting('primaryColor', e.target.value)}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={widgetSettings.primaryColor}
                              onChange={(e) => updateWidgetSetting('primaryColor', e.target.value)}
                              placeholder="#2563eb"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={widgetSettings.secondaryColor}
                              onChange={(e) => updateWidgetSetting('secondaryColor', e.target.value)}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={widgetSettings.secondaryColor}
                              onChange={(e) => updateWidgetSetting('secondaryColor', e.target.value)}
                              placeholder="#64748b"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Font Family</Label>
                        <Select 
                          value={widgetSettings.fontFamily}
                          onValueChange={(value) => updateWidgetSetting('fontFamily', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system-ui">System UI</SelectItem>
                            <SelectItem value="Inter">Inter</SelectItem>
                            <SelectItem value="Roboto">Roboto</SelectItem>
                            <SelectItem value="Open Sans">Open Sans</SelectItem>
                            <SelectItem value="Lato">Lato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Border Radius (px)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="32"
                          value={widgetSettings.borderRadius}
                          onChange={(e) => updateWidgetSetting('borderRadius', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    {/* Widget Preview */}
                    <div className="space-y-2">
                      <Label>Widget Preview</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div 
                          className="bg-white rounded-lg p-4 shadow-sm border"
                          style={{
                            borderRadius: `${widgetSettings.borderRadius}px`,
                            fontFamily: widgetSettings.fontFamily,
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <h3 
                                className="text-lg font-semibold"
                                style={{ color: widgetSettings.primaryColor }}
                              >
                                {widgetSettings.customTexts.headerTitle}
                              </h3>
                              <p 
                                className="text-sm"
                                style={{ color: widgetSettings.secondaryColor }}
                              >
                                {widgetSettings.customTexts.headerSubtitle}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="h-8 bg-gray-100 rounded" />
                              <div className="h-8 bg-gray-100 rounded" />
                              <div className="h-8 bg-gray-100 rounded" />
                            </div>
                            
                            <button
                              className="w-full py-2 px-4 rounded text-white text-sm font-medium"
                              style={{ 
                                backgroundColor: widgetSettings.primaryColor,
                                borderRadius: `${widgetSettings.borderRadius}px`,
                              }}
                            >
                              {widgetSettings.customTexts.buttonText}
                            </button>
                            
                            <p 
                              className="text-xs text-center"
                              style={{ color: widgetSettings.secondaryColor }}
                            >
                              {widgetSettings.customTexts.footerText}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Text Customization */}
              <Card>
                <CardHeader>
                  <CardTitle>Text Customization</CardTitle>
                  <CardDescription>
                    Customize the text displayed in your widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Header Title</Label>
                      <Input
                        value={widgetSettings.customTexts.headerTitle}
                        onChange={(e) => updateWidgetSetting('customTexts.headerTitle', e.target.value)}
                        placeholder="Book an Appointment"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Header Subtitle</Label>
                      <Input
                        value={widgetSettings.customTexts.headerSubtitle}
                        onChange={(e) => updateWidgetSetting('customTexts.headerSubtitle', e.target.value)}
                        placeholder="Schedule your pet's visit"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Button Text</Label>
                      <Input
                        value={widgetSettings.customTexts.buttonText}
                        onChange={(e) => updateWidgetSetting('customTexts.buttonText', e.target.value)}
                        placeholder="Schedule Appointment"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Footer Text</Label>
                      <Input
                        value={widgetSettings.customTexts.footerText}
                        onChange={(e) => updateWidgetSetting('customTexts.footerText', e.target.value)}
                        placeholder="We'll contact you within 24 hours"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Success Message</Label>
                    <Textarea
                      value={widgetSettings.customTexts.successMessage}
                      onChange={(e) => updateWidgetSetting('customTexts.successMessage', e.target.value)}
                      placeholder="Your appointment request has been submitted successfully!"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Error Message</Label>
                    <Textarea
                      value={widgetSettings.customTexts.errorMessage}
                      onChange={(e) => updateWidgetSetting('customTexts.errorMessage', e.target.value)}
                      placeholder="There was an error submitting your request. Please try again."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Required Fields Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Required Fields</CardTitle>
                  <CardDescription>
                    Configure which fields are required in your booking form
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(widgetSettings.requiredFields).map(([field, isRequired]) => (
                      <div key={field} className="flex items-center justify-between">
                        <Label className="text-sm font-normal capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <Switch
                          checked={isRequired}
                          onCheckedChange={(checked) => updateWidgetSetting(`requiredFields.${field}`, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
                </div>
              </div>
            </TabsContent>
            
            {/* Appointment Types Tab */}
            <TabsContent value="appointment-types" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Appointment Types</CardTitle>
                      <CardDescription>
                        Configure the types of appointments clients can book
                      </CardDescription>
                    </div>
                    <Button onClick={addAppointmentType} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Type
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(widgetSettings.appointmentTypes || []).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointment Types Yet</h3>
                      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                        Start by adding appointment types that clients can book. You can customize the name, duration, and description for each type.
                      </p>
                      <Button onClick={addAppointmentType} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Your First Appointment Type
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(widgetSettings.appointmentTypes || []).map((type, index) => (
                      <div key={type.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={type.name}
                              onChange={(e) => updateAppointmentType(type.id, 'name', e.target.value)}
                              placeholder="Appointment type name"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Duration (min)</Label>
                            <Input
                              type="number"
                              min="5"
                              max="480"
                              value={type.duration}
                              onChange={(e) => updateAppointmentType(type.id, 'duration', parseInt(e.target.value))}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={type.color}
                                onChange={(e) => updateAppointmentType(type.id, 'color', e.target.value)}
                                className="w-12 h-10 p-1 border rounded"
                              />
                              <Input
                                value={type.color}
                                onChange={(e) => updateAppointmentType(type.id, 'color', e.target.value)}
                                placeholder="#3b82f6"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={type.enabled}
                                onCheckedChange={(checked) => updateAppointmentType(type.id, 'enabled', checked)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAppointmentType(type.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={type.description}
                            onChange={(e) => updateAppointmentType(type.id, 'description', e.target.value)}
                            placeholder="Description of this appointment type"
                            rows={2}
                          />
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <Badge 
                            variant={type.enabled ? "default" : "secondary"}
                            style={{ backgroundColor: type.enabled ? type.color : undefined }}
                          >
                            {type.name} ({type.duration}min)
                          </Badge>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Embed Code Tab */}
            <TabsContent value="embed-code" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Embed Code
                  </CardTitle>
                  <CardDescription>
                    Copy and paste this code into your website to add the appointment widget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Make sure to save your widget settings before using the embed code. The code will reflect your current configuration.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    <EmbedCodeDisplay />
                    
                    <div className="space-y-2">
                      <Label>Direct Widget URL</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${getBaseUrl()}/widget/booking?practice=${practiceData?.practice?.id || 'YOUR_PRACTICE_ID'}`}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `${getBaseUrl()}/widget/booking?practice=${practiceData?.practice?.id || 'YOUR_PRACTICE_ID'}`,
                            'Widget URL'
                          )}
                        >
                          {copiedItem === 'Widget URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>WordPress Shortcode</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value="[smartdvm_booking]"
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard('[smartdvm_booking]', 'WordPress shortcode')}
                        >
                          {copiedItem === 'WordPress shortcode' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Installation Instructions</h4>
                    <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                      <li>Copy the HTML embed code above</li>
                      <li>Paste it into your website where you want the booking widget to appear</li>
                      <li>The widget will automatically load with your configured settings</li>
                      <li>Test the widget to ensure it's working correctly</li>
                    </ol>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full sm:w-auto gap-2">
                    <Eye className="h-4 w-4" />
                    Preview Widget
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* API Settings Tab */}
            <TabsContent value="api-settings" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    API Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure API access for custom website integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border p-4 rounded-md space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">API Key</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateApiKeyMutation.mutate()}
                        disabled={generateApiKeyMutation.isPending}
                      >
                        {generateApiKeyMutation.isPending ? 'Generating...' : 'Generate New Key'}
                      </Button>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-md flex justify-between items-center">
                      <code className="text-xs font-mono">
                        {showApiKey ? apiSettings.apiKey || 'No API key generated' : '••••••••••••••••••••••••••••••'}
                      </code>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? 'Hide' : 'Show'}
                        </Button>
                        {apiSettings.apiKey && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(apiSettings.apiKey, 'API key')}
                          >
                            {copiedItem === 'API key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This key provides access to your practice data. Keep it secure and never share it publicly.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Webhook URL (Optional)</Label>
                      <Input
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        placeholder="https://your-website.com/webhook/smartdvm"
                      />
                      <p className="text-sm text-muted-foreground">
                        Receive real-time notifications when appointments are booked
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Rate Limit (requests per hour)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="10000"
                        value={apiSettings.rateLimitPerHour}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, rateLimitPerHour: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">API Access Control</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Read Access</p>
                          <p className="text-sm text-muted-foreground">View practice information and appointments</p>
                        </div>
                        <Switch 
                          checked={apiSettings.permissions.readAccess}
                          onCheckedChange={(checked) => setApiSettings(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, readAccess: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Write Access</p>
                          <p className="text-sm text-muted-foreground">Create and modify appointments</p>
                        </div>
                        <Switch 
                          checked={apiSettings.permissions.writeAccess}
                          onCheckedChange={(checked) => setApiSettings(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, writeAccess: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Client Access</p>
                          <p className="text-sm text-muted-foreground">Access client information</p>
                        </div>
                        <Switch 
                          checked={apiSettings.permissions.clientAccess}
                          onCheckedChange={(checked) => setApiSettings(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, clientAccess: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Practitioner Access</p>
                          <p className="text-sm text-muted-foreground">Access veterinarian schedules and information</p>
                        </div>
                        <Switch 
                          checked={apiSettings.permissions.practitionerAccess}
                          onCheckedChange={(checked) => setApiSettings(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, practitionerAccess: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>CORS Settings</Label>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Enable CORS</span>
                      <Switch 
                        checked={apiSettings.enableCors}
                        onCheckedChange={(checked) => setApiSettings(prev => ({ ...prev, enableCors: checked }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Enter allowed origins (one per line)&#10;https://your-website.com&#10;https://www.your-website.com"
                      value={(apiSettings.allowedOrigins || []).join('\n')}
                      onChange={(e) => setApiSettings(prev => ({ 
                        ...prev, 
                        allowedOrigins: e.target.value.split('\n').filter(origin => origin.trim()) 
                      }))}
                      rows={3}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full sm:w-auto">
                    Save API Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </MarketplaceFeatureContainer>
      </main>
    </div>
  );
}
