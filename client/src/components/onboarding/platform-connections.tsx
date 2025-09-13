import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ExternalLink, Check, Loader2 } from "lucide-react";

const platforms = [
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook page to post updates and engage with your community",
    color: "bg-blue-600",
    icon: "f",
    connected: false,
  },
  {
    id: "instagram", 
    name: "Instagram",
    description: "Share visual content and stories with your Instagram followers",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    icon: "📷",
    connected: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Build professional relationships and share business insights",
    color: "bg-blue-700",
    icon: "in",
    connected: false,
  },
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Share quick updates and engage in real-time conversations",
    color: "bg-black",
    icon: "𝕏",
    connected: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    description: "Showcase your products and ideas through visual pins",
    color: "bg-red-600",
    icon: "📌",
    connected: false,
  },
];

interface PlatformConnectionsProps {
  onComplete: () => void;
  onBack: () => void;
  onError: (error: Error) => void;
}

export default function PlatformConnections({ onComplete, onBack, onError }: PlatformConnectionsProps) {
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const connectPlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      // In a real implementation, this would initiate OAuth flow
      // For now, we'll simulate the connection
      return await apiRequest("POST", "/api/platform-connections", {
        platform: platformId,
        platformUserId: `mock_user_${platformId}`,
        accessToken: `mock_token_${platformId}`,
        isActive: true,
      });
    },
    onSuccess: (_, platformId) => {
      setConnectedPlatforms(prev => [...prev, platformId]);
      setConnectingPlatform(null);
    },
    onError: (error) => {
      setConnectingPlatform(null);
      onError(error);
    },
  });

  const handlePlatformConnect = (platformId: string) => {
    setConnectingPlatform(platformId);
    connectPlatformMutation.mutate(platformId);
  };

  const handlePlatformToggle = (platformId: string, enabled: boolean) => {
    if (enabled && !connectedPlatforms.includes(platformId)) {
      handlePlatformConnect(platformId);
    } else if (!enabled && connectedPlatforms.includes(platformId)) {
      setConnectedPlatforms(prev => prev.filter(id => id !== platformId));
    }
  };

  const handleContinue = () => {
    if (connectedPlatforms.length === 0) {
      onError(new Error("Please connect at least one social media platform to continue."));
      return;
    }
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          const isConnecting = connectingPlatform === platform.id;

          return (
            <Card 
              key={platform.id} 
              className={`border-border bg-card transition-all ${
                isConnected ? 'ring-2 ring-secondary' : ''
              }`}
              data-testid={`platform-card-${platform.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{platform.name}</h3>
                      {isConnected && (
                        <Badge variant="secondary" className="mt-1 bg-secondary/10 text-secondary">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={isConnected}
                    onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked)}
                    disabled={isConnecting}
                    data-testid={`switch-${platform.id}`}
                  />
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {platform.description}
                </p>

                {!isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlatformConnect(platform.id)}
                    disabled={isConnecting}
                    className="w-full"
                    data-testid={`button-connect-${platform.id}`}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect {platform.name}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection Summary */}
      {connectedPlatforms.length > 0 && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                {connectedPlatforms.length} platform{connectedPlatforms.length === 1 ? '' : 's'} connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You can add more platforms later in your settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center px-6 py-2 border-border hover:bg-muted"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={connectedPlatforms.length === 0}
          className="px-8 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          data-testid="button-continue"
        >
          Continue to Brand Voice
        </Button>
      </div>
    </div>
  );
}
