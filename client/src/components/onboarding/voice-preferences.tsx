import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

const brandVoiceSchema = z.object({
  tone: z.string().min(1, "Please select a tone"),
  voice: z.string().min(1, "Please select a voice style"),
  brandAdjectives: z.array(z.string()).min(1, "Please select at least one brand adjective"),
  useEmojis: z.boolean(),
  imageStyle: z.string().optional(),
  topicsToFocus: z.array(z.string()),
  topicsToAvoid: z.array(z.string()),
  customInstructions: z.string().optional(),
  contentMix: z.object({
    educational: z.number(),
    promotional: z.number(),
    community: z.number(),
    humorous: z.number(),
  }),
});

type BrandVoiceFormData = z.infer<typeof brandVoiceSchema>;

const toneOptions = [
  "Professional",
  "Friendly", 
  "Casual",
  "Expert",
  "Fun",
  "Inspiring",
  "Trustworthy",
  "Witty",
];

const voiceOptions = [
  { value: "first-person", label: "First Person (We, Us, Our)" },
  { value: "third-person", label: "Third Person (Business Name)" },
];

const brandAdjectiveOptions = [
  "Innovative", "Reliable", "Premium", "Affordable", "Sustainable", 
  "Customer-focused", "Expert", "Creative", "Professional", "Friendly",
  "Quality", "Fast", "Personalized", "Local", "Modern"
];

const topicSuggestions = [
  "Industry tips", "Behind the scenes", "Customer stories", "Product features",
  "Company culture", "Industry news", "How-to guides", "Success stories"
];

interface VoicePreferencesProps {
  onComplete: () => void;
  onBack: () => void;
  onError: (error: Error) => void;
}

export default function VoicePreferences({ onComplete, onBack, onError }: VoicePreferencesProps) {
  const form = useForm<BrandVoiceFormData>({
    resolver: zodResolver(brandVoiceSchema),
    defaultValues: {
      tone: "",
      voice: "",
      brandAdjectives: [],
      useEmojis: true,
      imageStyle: "professional",
      topicsToFocus: [],
      topicsToAvoid: [],
      customInstructions: "",
      contentMix: {
        educational: 40,
        promotional: 30,
        community: 20,
        humorous: 10,
      },
    },
  });

  const createBrandVoiceMutation = useMutation({
    mutationFn: async (data: BrandVoiceFormData) => {
      return await apiRequest("POST", "/api/brand-voice", data);
    },
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      onError(error);
    },
  });

  const handleAdjectiveToggle = (adjective: string) => {
    const current = form.getValues("brandAdjectives");
    if (current.includes(adjective)) {
      form.setValue("brandAdjectives", current.filter(a => a !== adjective));
    } else if (current.length < 5) {
      form.setValue("brandAdjectives", [...current, adjective]);
    }
  };

  const handleTopicToggle = (topic: string, field: "topicsToFocus" | "topicsToAvoid") => {
    const current = form.getValues(field);
    if (current.includes(topic)) {
      form.setValue(field, current.filter(t => t !== topic));
    } else {
      form.setValue(field, [...current, topic]);
    }
  };

  const onSubmit = (data: BrandVoiceFormData) => {
    createBrandVoiceMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Voice Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Brand Tone *
          </Label>
          <Select 
            value={form.watch("tone")} 
            onValueChange={(value) => form.setValue("tone", value)}
          >
            <SelectTrigger className="border-border focus:ring-ring" data-testid="select-tone">
              <SelectValue placeholder="Choose your brand tone" />
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((tone) => (
                <SelectItem key={tone} value={tone.toLowerCase()}>
                  {tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.tone && (
            <p className="text-sm text-destructive">{form.formState.errors.tone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Voice Style *
          </Label>
          <Select 
            value={form.watch("voice")} 
            onValueChange={(value) => form.setValue("voice", value)}
          >
            <SelectTrigger className="border-border focus:ring-ring" data-testid="select-voice">
              <SelectValue placeholder="Choose voice style" />
            </SelectTrigger>
            <SelectContent>
              {voiceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.voice && (
            <p className="text-sm text-destructive">{form.formState.errors.voice.message}</p>
          )}
        </div>
      </div>

      {/* Brand Adjectives */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          Brand Adjectives * (Select up to 5)
        </Label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {brandAdjectiveOptions.map((adjective) => {
            const isSelected = form.watch("brandAdjectives").includes(adjective);
            const isDisabled = !isSelected && form.watch("brandAdjectives").length >= 5;
            
            return (
              <Button
                key={adjective}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleAdjectiveToggle(adjective)}
                disabled={isDisabled}
                className={`text-xs ${
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border hover:bg-muted"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                data-testid={`adjective-${adjective.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {adjective}
              </Button>
            );
          })}
        </div>
        {form.formState.errors.brandAdjectives && (
          <p className="text-sm text-destructive">{form.formState.errors.brandAdjectives.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Selected: {form.watch("brandAdjectives").length}/5
        </p>
      </div>

      {/* Content Mix */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <Label className="text-sm font-medium text-foreground">
                Content Mix Preferences
              </Label>
            </div>
            
            {Object.entries(form.watch("contentMix")).map(([type, value]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm capitalize text-foreground">{type}</span>
                  <span className="text-sm text-muted-foreground">{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([newValue]) => {
                    const contentMix = form.getValues("contentMix");
                    form.setValue("contentMix", {
                      ...contentMix,
                      [type]: newValue
                    });
                  }}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid={`slider-${type}`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Total: {Object.values(form.watch("contentMix")).reduce((a, b) => a + b, 0)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label className="text-sm font-medium text-foreground">
            Topics to Focus On
          </Label>
          <div className="space-y-2">
            {topicSuggestions.slice(0, 4).map((topic) => (
              <div key={topic} className="flex items-center space-x-2">
                <Checkbox
                  id={`focus-${topic}`}
                  checked={form.watch("topicsToFocus").includes(topic)}
                  onCheckedChange={() => handleTopicToggle(topic, "topicsToFocus")}
                  data-testid={`focus-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <Label htmlFor={`focus-${topic}`} className="text-sm text-foreground cursor-pointer">
                  {topic}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-medium text-foreground">
            Topics to Avoid
          </Label>
          <div className="space-y-2">
            {topicSuggestions.slice(4).map((topic) => (
              <div key={topic} className="flex items-center space-x-2">
                <Checkbox
                  id={`avoid-${topic}`}
                  checked={form.watch("topicsToAvoid").includes(topic)}
                  onCheckedChange={() => handleTopicToggle(topic, "topicsToAvoid")}
                  data-testid={`avoid-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <Label htmlFor={`avoid-${topic}`} className="text-sm text-foreground cursor-pointer">
                  {topic}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emoji & Image Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="useEmojis"
            checked={form.watch("useEmojis")}
            onCheckedChange={(checked) => form.setValue("useEmojis", !!checked)}
            data-testid="checkbox-use-emojis"
          />
          <Label htmlFor="useEmojis" className="text-sm font-medium text-foreground cursor-pointer">
            Use emojis in posts
          </Label>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Image Style
          </Label>
          <Select 
            value={form.watch("imageStyle")} 
            onValueChange={(value) => form.setValue("imageStyle", value)}
          >
            <SelectTrigger className="border-border focus:ring-ring" data-testid="select-image-style">
              <SelectValue placeholder="Choose image style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="minimalist">Minimalist</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <Label htmlFor="customInstructions" className="text-sm font-medium text-foreground">
          Additional Instructions (Optional)
        </Label>
        <Textarea
          id="customInstructions"
          {...form.register("customInstructions")}
          rows={3}
          className="border-border focus:ring-ring resize-none"
          placeholder="Any specific guidelines, brand voice notes, or special instructions for content creation..."
          data-testid="input-custom-instructions"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex items-center px-6 py-2 border-border hover:bg-muted"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Button
          type="submit"
          disabled={createBrandVoiceMutation.isPending}
          className="px-8 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-complete-setup"
        >
          {createBrandVoiceMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing Setup...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </div>
    </form>
  );
}
