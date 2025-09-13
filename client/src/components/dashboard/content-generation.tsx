import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  BookOpen,
  ShoppingBag,
  Zap,
  Loader2
} from "lucide-react";

const contentTypes = [
  { id: "educational", label: "Educational", icon: BookOpen, color: "bg-primary" },
  { id: "promotional", label: "Promotional", icon: ShoppingBag, color: "bg-accent" },
];

const platforms = [
  { id: "facebook", label: "Facebook", frequency: "3 posts/week" },
  { id: "instagram", label: "Instagram", frequency: "Daily posts" },
  { id: "linkedin", label: "LinkedIn", frequency: "2 posts/week" },
  { id: "twitter", label: "Twitter", frequency: "5 posts/week" },
  { id: "pinterest", label: "Pinterest", frequency: "3 posts/week" },
];

export default function ContentGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContentType, setSelectedContentType] = useState("educational");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram", "linkedin"]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const generateContentMutation = useMutation({
    mutationFn: async (data: {
      platforms: string[];
      contentTypes: string[];
      specialInstructions?: string;
      quantity: number;
    }) => {
      return await apiRequest("POST", "/api/content/generate", data);
    },
    onSuccess: () => {
      toast({
        title: "Content Generated!",
        description: "Your content has been generated and is ready for approval.",
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
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
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContentTypeSelect = (type: string) => {
    setSelectedContentType(type);
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleGenerate = () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No Platforms Selected",
        description: "Please select at least one platform to generate content for.",
        variant: "destructive",
      });
      return;
    }

    generateContentMutation.mutate({
      platforms: selectedPlatforms,
      contentTypes: [selectedContentType],
      specialInstructions: specialInstructions.trim() || undefined,
      quantity: 1,
    });
  };

  return (
    <Card className="border-border bg-card" data-testid="content-generation-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">AI Content Generation</CardTitle>
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            Beta
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Type Selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Content Focus
          </label>
          <div className="grid grid-cols-2 gap-3">
            {contentTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedContentType === type.id ? "default" : "outline"}
                className={`flex items-center justify-center p-3 h-auto ${
                  selectedContentType === type.id 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => handleContentTypeSelect(type.id)}
                data-testid={`content-type-${type.id}`}
              >
                <type.icon className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Target Platforms
          </label>
          <div className="space-y-2">
            {platforms.map((platform) => (
              <div key={platform.id} className="flex items-center space-x-3">
                <Checkbox
                  id={platform.id}
                  checked={selectedPlatforms.includes(platform.id)}
                  onCheckedChange={() => handlePlatformToggle(platform.id)}
                  className="rounded border-border"
                  data-testid={`platform-${platform.id}`}
                />
                <label 
                  htmlFor={platform.id} 
                  className="text-sm text-foreground cursor-pointer flex-1"
                >
                  {platform.label}
                </label>
                <span className="text-xs text-muted-foreground">
                  ({platform.frequency})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label 
            htmlFor="instructions" 
            className="text-sm font-medium text-foreground mb-2 block"
          >
            Special Instructions (Optional)
          </label>
          <Textarea
            id="instructions"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
            placeholder="Any upcoming promotions, events, or specific topics to focus on..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            data-testid="input-special-instructions"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generateContentMutation.isPending}
          className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-generate-content"
        >
          {generateContentMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Weekly Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
