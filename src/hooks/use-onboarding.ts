import { useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  completed: boolean;
  required: boolean;
}

export function useOnboarding() {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 'practice-setup', title: 'Set up practice information', completed: false, required: true },
    { id: 'staff-accounts', title: 'Create staff accounts', completed: false, required: true },
    { id: 'services-setup', title: 'Configure services', completed: false, required: false },
    { id: 'payment-setup', title: 'Set up payment processing', completed: false, required: false },
  ]);
  
  const [isCompleted, setIsCompleted] = useState(false);
  
  useEffect(() => {
    const requiredSteps = steps.filter(step => step.required);
    const completedRequired = requiredSteps.filter(step => step.completed);
    setIsCompleted(completedRequired.length === requiredSteps.length);
  }, [steps]);
  
  const markStepCompleted = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };
  
  const markStepIncomplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: false } : step
    ));
  };
  
  const progress = (steps.filter(step => step.completed).length / steps.length) * 100;
  
  return {
    steps,
    isCompleted,
    progress,
    markStepCompleted,
    markStepIncomplete
  };
}
