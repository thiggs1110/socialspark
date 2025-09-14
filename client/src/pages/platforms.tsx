import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter, 
  ChevronRight,
  Check,
  AlertCircle,
  Trash2,
  ExternalLink,
  Settings,
  Shield
} from "lucide-react";
import { SiPinterest } from "react-icons/si";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

type PlatformConnection = {
  id: string;
  platform: string;
  platformUserId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Platform = {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  features: string[];
  isAvailable: boolean;
};

const platforms: Platform[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    description: "Connect your Facebook page to automatically post and engage with your audience",
    features: ["Auto-posting", "Comment monitoring", "Page insights"],
    isAvailable: true
  },
  {
    id: "instagram", 
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    description: "Share visual content to your Instagram business account",
    features: ["Photo & video posts", "Stories", "Engagement tracking"],
    isAvailable: false // Connected through Facebook
  },
  {
    id: "linkedin",
    name: "LinkedIn", 
    icon: Linkedin,
    color: "bg-blue-700",
    description: "Professional content for your business LinkedIn profile",
    features: ["Professional posts", "Company updates", "Network growth"],
    isAvailable: true
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: Twitter,
    color: "bg-black",
    description: "Real-time updates and engagement on Twitter/X",
    features: ["Tweet posting", "Thread creation", "Mention monitoring"],
    isAvailable: true
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: SiPinterest,
    color: "bg-red-600",
    description: "Visual discovery and inspiration for your business",
    features: ["Pin creation", "Board management", "Idea pins"],
    isAvailable: true
  }
];

export default function Platforms() {
  const [location] = useLocation();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  
  // Get URL params for success/error messages
  const urlParams = new URLSearchParams(window.location.search);
  const successPlatform = urlParams.get('success') === 'connected' ? urlParams.get('platform') : null;
  const errorType = urlParams.get('error');
  const errorPlatform = urlParams.get('platform');
  const errorDetails = urlParams.get('details');

  const { data: connections = [], isLoading, error } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platform-connections'],
    meta: { errorMessage: "Failed to load platform connections" }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest('DELETE', `/api/platform-connections/${connectionId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-connections'] });
    }
  });

  const handleConnect = async (platformId: string) => {
    try {
      setConnectingPlatform(platformId);
      
      const response = await apiRequest('GET', `/api/oauth/${platformId}/authorize`);
      const data = await response.json();
      const { authUrl } = data;
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to disconnect this platform? You will need to reconnect it to continue posting.')) {
      disconnectMutation.mutate(connectionId);
    }
  };

  const getConnectionForPlatform = (platformId: string) => {
    return connections.find((conn: PlatformConnection) => conn.platform === platformId);
  };

  const getPlatformIcon = (platform: Platform, size = 20) => {
    const IconComponent = platform.icon;
    return <IconComponent size={size} className="text-white" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Platform Connections" 
            subtitle="Connect your social media accounts"
            showGenerateButton={false}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Platform Connections" 
          subtitle="Connect your social media accounts to automatically post and manage content"
          showGenerateButton={false}
        />
        <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Connections</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your social media accounts to automatically post and manage your content across all platforms.
            </p>
          </div>

          {/* Success Message */}
          {successPlatform && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20" data-testid="alert-success-connection">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200" data-testid="text-success-message">
                Successfully connected {successPlatform}! You can now post content to this platform.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errorType && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20" data-testid="alert-error-connection">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200" data-testid="text-error-message">
                Failed to connect {errorPlatform}: {errorDetails || 'Unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

          {/* Platform Cards */}
          <div className="space-y-4">
            {platforms.map((platform) => {
              const connection = getConnectionForPlatform(platform.id);
              const isConnected = !!connection;
              const isConnecting = connectingPlatform === platform.id;

              return (
                <Card key={platform.id} className="relative overflow-hidden" data-testid={`card-platform-${platform.id}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center`}>
                          {getPlatformIcon(platform, 24)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-xl">{platform.name}</CardTitle>
                            {isConnected && (
                              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-800 dark:bg-green-900/20" data-testid={`badge-connected-${platform.id}`}>
                                <Check className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                            {!platform.isAvailable && (
                              <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:bg-gray-800" data-testid={`badge-via-facebook-${platform.id}`}>
                                Via Facebook
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {platform.description}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isConnected ? (
                          <>
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDisconnect(connection.id)}
                              disabled={disconnectMutation.isPending}
                              data-testid={`button-disconnect-${platform.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Disconnect
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`button-settings-${platform.id}`}>
                              <Settings className="w-4 h-4 mr-1" />
                              Settings
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleConnect(platform.id)}
                            disabled={isConnecting || !platform.isAvailable}
                            data-testid={`button-connect-${platform.id}`}
                          >
                            {isConnecting ? (
                              <>
                                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Connecting...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Connect {platform.name}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                      {platform.features.map((feature, index) => (
                        <div key={feature} className="flex items-center space-x-1">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {isConnected && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" data-testid={`connection-info-${platform.id}`}>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span data-testid={`text-connected-as-${platform.id}`}>Connected as: {connection.platformUserId}</span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-500" data-testid={`text-connected-date-${platform.id}`}>
                            Connected {new Date(connection.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Help Section */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-200">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <p>• <strong>Facebook & Instagram:</strong> Make sure you have admin access to your business page</p>
                <p>• <strong>LinkedIn:</strong> Connect your personal profile, then we'll help you manage your company page</p>
                <p>• <strong>Twitter:</strong> Ensure you have posting permissions for your account</p>
                <p>• <strong>Pinterest:</strong> Convert to a business account for enhanced features</p>
              </div>
            </CardContent>
          </Card>
        </div>
        </main>
      </div>
    </div>
  );
}