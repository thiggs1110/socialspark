import { useState } from "react";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building, Globe, Phone, MapPin } from "lucide-react";

const businessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  googleBusinessUrl: z.string().url("Please enter a valid Google Business URL").optional().or(z.literal("")),
  description: z.string().min(10, "Please provide at least 10 characters").max(500, "Description must be under 500 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

const industries = [
  "Restaurant & Food Service",
  "Retail & E-commerce", 
  "Professional Services",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Real Estate",
  "Education & Training",
  "Technology",
  "Manufacturing",
  "Other",
];

interface BusinessSetupProps {
  onComplete: () => void;
  onError: (error: Error) => void;
}

export default function BusinessSetup({ onComplete, onError }: BusinessSetupProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      googleBusinessUrl: "",
      description: "",
      address: "",
      phone: "",
    },
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: BusinessFormData) => {
      return await apiRequest("POST", "/api/business", data);
    },
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      onError(error);
    },
  });

  const analyzeWebsiteMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      return await apiRequest("POST", "/api/analyze-website", { websiteUrl });
    },
    onSuccess: (data: any) => {
      if (data.suggestedDescription) {
        form.setValue("description", data.suggestedDescription);
      }
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error("Website analysis failed:", error);
      setIsAnalyzing(false);
    },
  });

  const handleWebsiteAnalysis = () => {
    const website = form.getValues("website");
    if (website && website.trim()) {
      setIsAnalyzing(true);
      analyzeWebsiteMutation.mutate(website.trim());
    }
  };

  const onSubmit = (data: BusinessFormData) => {
    createBusinessMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Business Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Business Name *
          </Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="name"
              {...form.register("name")}
              className="pl-10 border-border focus:ring-ring"
              placeholder="Your business name"
              data-testid="input-business-name"
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry" className="text-sm font-medium text-foreground">
            Industry *
          </Label>
          <Select 
            value={form.watch("industry")} 
            onValueChange={(value) => form.setValue("industry", value)}
          >
            <SelectTrigger className="border-border focus:ring-ring" data-testid="select-industry">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.industry && (
            <p className="text-sm text-destructive">{form.formState.errors.industry.message}</p>
          )}
        </div>
      </div>

      {/* Website & Google Business */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium text-foreground">
            Website URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="website"
              {...form.register("website")}
              className="pl-10 border-border focus:ring-ring"
              placeholder="https://yourwebsite.com"
              data-testid="input-website"
            />
          </div>
          {form.watch("website") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWebsiteAnalysis}
              disabled={isAnalyzing}
              className="mt-2"
              data-testid="button-analyze-website"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Website"
              )}
            </Button>
          )}
          {form.formState.errors.website && (
            <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="googleBusinessUrl" className="text-sm font-medium text-foreground">
            Google Business Profile URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="googleBusinessUrl"
              {...form.register("googleBusinessUrl")}
              className="pl-10 border-border focus:ring-ring"
              placeholder="https://google.com/business/..."
              data-testid="input-google-business"
            />
          </div>
          {form.formState.errors.googleBusinessUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.googleBusinessUrl.message}</p>
          )}
        </div>
      </div>

      {/* Business Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-foreground">
          Business Description *
        </Label>
        <Textarea
          id="description"
          {...form.register("description")}
          rows={4}
          className="border-border focus:ring-ring resize-none"
          placeholder="Tell us about your business, what you do, and what makes you unique..."
          data-testid="input-description"
        />
        <div className="flex justify-between items-center">
          <div>
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {form.watch("description")?.length || 0}/500
          </span>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-foreground">
            Business Address (Optional)
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="address"
              {...form.register("address")}
              className="pl-10 border-border focus:ring-ring"
              placeholder="123 Main St, City, State"
              data-testid="input-address"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone Number (Optional)
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              {...form.register("phone")}
              className="pl-10 border-border focus:ring-ring"
              placeholder="(555) 123-4567"
              data-testid="input-phone"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={createBusinessMutation.isPending}
          className="px-8 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-continue"
        >
          {createBusinessMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue to Platform Connections"
          )}
        </Button>
      </div>
    </form>
  );
}
