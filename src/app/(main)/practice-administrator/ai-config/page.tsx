'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Brain, Eye, EyeOff, Save, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/page-header';
import Breadcrumbs from '@/components/breadcrumbs';
import LoadingSpinner from '@/components/loading-spinner';

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

const AiConfigPage: React.FC = () => {
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    geminiApiKey: '',
    isEnabled: true,
    maxTokens: '1000',
    temperature: '0.7',
  });

  // Check if user has permission to configure AI
  const canConfigureAI = user?.role === 'PRACTICE_ADMINISTRATOR' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (userPracticeId && canConfigureAI) {
      fetchConfig();
    } else if (user && !canConfigureAI) {
      setIsLoading(false);
    }
  }, [userPracticeId, user, canConfigureAI]);

  const fetchConfig = async () => {
    if (!userPracticeId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai-config?practiceId=${userPracticeId}`);
      const data = await response.json();
      
      if (response.ok) {
        setHasExistingConfig(data.hasConfig);
        if (data.config) {
          setConfig(data.config);
          setFormData({
            geminiApiKey: '', // Don't populate the API key for security
            isEnabled: data.config.isEnabled,
            maxTokens: data.config.maxTokens || '1000',
            temperature: data.config.temperature || '0.7',
          });
        }
      } else {
        throw new Error(data.error || 'Failed to fetch AI configuration');
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userPracticeId || !user?.id) {
      toast({
        title: 'Error',
        description: 'Missing practice or user information',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.geminiApiKey.trim() && !hasExistingConfig) {
      toast({
        title: 'Error',
        description: 'Gemini API key is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        practiceId: userPracticeId,
        configuredBy: user.id,
        isEnabled: formData.isEnabled,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        ...(formData.geminiApiKey.trim() && { geminiApiKey: formData.geminiApiKey }),
      };

      const response = await fetch('/api/ai-config', {
        method: hasExistingConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setConfig(data.config);
        setHasExistingConfig(true);
        if (formData.geminiApiKey.trim()) {
          setFormData(prev => ({ ...prev, geminiApiKey: '' })); // Clear the API key field for security
        }
        toast({
          title: 'Success',
          description: 'AI configuration saved successfully',
        });
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

  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canConfigureAI) {
    return (
      <div className="container py-10">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to configure AI settings. Only practice administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="AI Configuration"
        description="Configure Gemini AI settings for your practice"
        icon={<Settings className="w-8 h-8" />}
      />
      
      <Breadcrumbs
        items={[
          { label: 'Practice Administration', href: '/practice-administrator' },
          { label: 'AI Configuration', href: '/practice-administrator/ai-config' }
        ]}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>AI Status</CardTitle>
                <CardDescription>Current AI configuration status for your practice</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {config?.hasApiKey ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
                <span className="font-medium">
                  {config?.hasApiKey ? 'API Key Configured' : 'No API Key'}
                </span>
              </div>
              <Badge variant={config?.isEnabled ? 'default' : 'secondary'}>
                {config?.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Gemini API Configuration</CardTitle>
            <CardDescription>
              Configure your Google Gemini API key and settings. Your API key will be encrypted and stored securely.
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
                  placeholder={hasExistingConfig ? 'Enter new API key to update' : 'Enter your Gemini API key'}
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
                Get your API key from the{' '}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>

            <Separator />

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled">Enable AI Features</Label>
                <p className="text-sm text-gray-600">
                  Enable or disable AI-powered features for your practice
                </p>
              </div>
              <Switch
                id="enabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
              />
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Advanced Settings</h4>
              
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
                  <p className="text-xs text-gray-600">Maximum number of tokens in AI responses (100-8000)</p>
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
                  <p className="text-xs text-gray-600">Controls randomness in responses (0.0-2.0)</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {hasExistingConfig ? 'Update Configuration' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>Security:</strong> Your API key is encrypted before storage and never displayed in plain text.</p>
              <p><strong>Usage:</strong> AI features will use your configured API key for all practice users.</p>
              <p><strong>Billing:</strong> API usage charges will be billed to your Google Cloud account.</p>
              <p><strong>Privacy:</strong> Patient data processed by AI follows your practice's privacy policies.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiConfigPage;
