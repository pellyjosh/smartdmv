'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Brain, 
  Eye, 
  EyeOff, 
  Save, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Building2,
  Users,
  Zap
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import Breadcrumbs from '@/components/breadcrumbs';
import LoadingSpinner from '@/components/loading-spinner';

interface Practice {
  practiceId: string;
  practiceName: string;
  assignedAt: string;
}

interface AiConfig {
  id?: string;
  practiceId: string;
  geminiApiKey: string | null;
  isEnabled: boolean;
  maxTokens: string;
  temperature: string;
  hasApiKey?: boolean;
  configuredBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const AdministratorAiConfigPage: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [practices, setPractices] = useState<Practice[]>([]);
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    geminiApiKey: '',
    isEnabled: true,
    maxTokens: '1000',
    temperature: '0.7',
  });

  // Check if user has permission to configure AI for multiple practices
  const canConfigureMultiplePractices = user?.role === 'ADMINISTRATOR' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (user?.id && canConfigureMultiplePractices) {
      fetchData();
    } else if (user && !canConfigureMultiplePractices) {
      setIsLoading(false);
    }
  }, [user, canConfigureMultiplePractices]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Fetch accessible practices
      const practicesResponse = await fetch(`/api/administrator/practices?administratorId=${user.id}`);
      const practicesData = await practicesResponse.json();
      
      if (practicesResponse.ok) {
        setPractices(practicesData.practices || []);
        
        // Fetch AI configurations for all practices
        const configsResponse = await fetch(`/api/ai-config?administratorId=${user.id}`);
        const configsData = await configsResponse.json();
        
        if (configsResponse.ok) {
          setConfigs(configsData.configs || []);
        }
      } else {
        throw new Error(practicesData.error || 'Failed to fetch practices');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load practices and configurations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeSelection = (practiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedPractices(prev => [...prev, practiceId]);
    } else {
      setSelectedPractices(prev => prev.filter(id => id !== practiceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPractices(practices.map(p => p.practiceId));
    } else {
      setSelectedPractices([]);
    }
  };

  const handleApplyToAllToggle = (checked: boolean) => {
    setApplyToAll(checked);
    if (checked) {
      setSelectedPractices(practices.map(p => p.practiceId));
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User information not available',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.geminiApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Gemini API key is required',
        variant: 'destructive',
      });
      return;
    }

    const targetPractices = applyToAll ? practices.map(p => p.practiceId) : selectedPractices;

    if (targetPractices.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one practice or choose "Apply to All"',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        geminiApiKey: formData.geminiApiKey,
        isEnabled: formData.isEnabled,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        practiceIds: targetPractices,
        configuredBy: user.id,
        applyToAll: applyToAll,
      };

      const response = await fetch('/api/ai-config/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchData(); // Refresh the data
        setFormData(prev => ({ ...prev, geminiApiKey: '' })); // Clear API key for security
        setSelectedPractices([]);
        setApplyToAll(false);
        
        toast({
          title: 'Success',
          description: `AI configuration applied to ${data.successCount} practices`,
        });

        if (data.errorCount > 0) {
          toast({
            title: 'Partial Success',
            description: `${data.errorCount} practices had errors during configuration`,
            variant: 'destructive',
          });
        }
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save AI configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPracticeConfigStatus = (practiceId: string) => {
    const config = configs.find(c => c.practiceId === practiceId);
    return {
      hasConfig: !!config,
      hasApiKey: !!config?.hasApiKey,
      isEnabled: config?.isEnabled || false,
    };
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canConfigureMultiplePractices) {
    return (
      <div className="container py-10">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to configure AI settings for multiple practices. Only administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="AI Configuration Management"
        description="Configure Gemini AI settings for all practices under your administration"
        icon={<Settings className="w-8 h-8" />}
      />
      
      <Breadcrumbs
        items={[
          { label: 'Administration', href: '/administrator' },
          { label: 'AI Configuration', href: '/administrator/ai-config' }
        ]}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{practices.length}</p>
                  <p className="text-sm text-gray-600">Total Practices</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{configs.filter(c => c.hasApiKey).length}</p>
                  <p className="text-sm text-gray-600">Configured</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{configs.filter(c => c.isEnabled).length}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk AI Configuration</CardTitle>
            <CardDescription>
              Configure Gemini AI settings for multiple practices at once. Select practices or apply to all.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Field */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.geminiApiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  placeholder="Enter your Gemini API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                This API key will be applied to all selected practices
              </p>
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enabled">Enable AI Features</Label>
                  <p className="text-sm text-gray-600">Enable AI features for selected practices</p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: e.target.value }))}
                    min="100"
                    max="8000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                    min="0"
                    max="2"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Practice Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Apply Configuration To:</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="applyToAll"
                    checked={applyToAll}
                    onCheckedChange={handleApplyToAllToggle}
                  />
                  <Label htmlFor="applyToAll">Apply to All Practices</Label>
                </div>
              </div>

              {!applyToAll && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Select Practices:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAll(selectedPractices.length !== practices.length)}
                    >
                      {selectedPractices.length === practices.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                    {practices.map((practice) => {
                      const status = getPracticeConfigStatus(practice.practiceId);
                      return (
                        <div key={practice.practiceId} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedPractices.includes(practice.practiceId)}
                              onCheckedChange={(checked) => 
                                handlePracticeSelection(practice.practiceId, checked as boolean)
                              }
                            />
                            <div>
                              <span className="font-medium">{practice.practiceName}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {status.hasApiKey ? (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Configured
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Not Configured
                                  </Badge>
                                )}
                                {status.isEnabled && (
                                  <Badge variant="outline" className="text-xs">Active</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Apply Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Apply Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdministratorAiConfigPage;
