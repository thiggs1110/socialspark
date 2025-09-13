import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import BusinessSetup from "@/components/onboarding/business-setup";
import PlatformConnections from "@/components/onboarding/platform-connections";
import VoicePreferences from "@/components/onboarding/voice-preferences";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Onboarding() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { id: 1, title: "Business Setup", description: "Tell us about your business" },
    { id: 2, title: "Connect Platforms", description: "Link your social media accounts" },
    { id: 3, title: "Brand Voice", description: "Define your unique voice and style" },
  ];

  const progress = (completedSteps.length / steps.length) * 100;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    
    // Move to next step if not the last one
    if (stepId < steps.length) {
      setCurrentStep(stepId + 1);
    } else {
      // All steps completed, redirect to dashboard
      setLocation("/");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessSetup
            onComplete={() => handleStepComplete(1)}
            onError={(error: Error) => {
              if (isUnauthorizedError(error)) {
                toast({
                  title: "Unauthorized",
                  description: "You are logged out. Logging in again...",
                  variant: "destructive",
                });
                setTimeout(() => {
                  window.location.href = "/api/login";
                }, 500);
                return;
              }
              toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
              });
            }}
          />
        );
      case 2:
        return (
          <PlatformConnections
            onComplete={() => handleStepComplete(2)}
            onBack={handlePreviousStep}
            onError={(error: Error) => {
              if (isUnauthorizedError(error)) {
                toast({
                  title: "Unauthorized",
                  description: "You are logged out. Logging in again...",
                  variant: "destructive",
                });
                setTimeout(() => {
                  window.location.href = "/api/login";
                }, 500);
                return;
              }
              toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
              });
            }}
          />
        );
      case 3:
        return (
          <VoicePreferences
            onComplete={() => handleStepComplete(3)}
            onBack={handlePreviousStep}
            onError={(error: Error) => {
              if (isUnauthorizedError(error)) {
                toast({
                  title: "Unauthorized",
                  description: "You are logged out. Logging in again...",
                  variant: "destructive",
                });
                setTimeout(() => {
                  window.location.href = "/api/login";
                }, 500);
                return;
              }
              toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">PostPilot</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-foreground">Welcome to PostPilot!</h1>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-4" data-testid="progress-onboarding" />
            
            {/* Step indicators */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      completedSteps.includes(step.id)
                        ? "bg-secondary border-secondary text-white"
                        : currentStep === step.id
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className={`text-sm font-medium ${
                      currentStep === step.id ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {steps.find(s => s.id === currentStep)?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
