import { Button } from "@/components/ui/button";
import { FileBarChart, Zap } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  showGenerateButton?: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export default function Header({ 
  title, 
  subtitle, 
  showGenerateButton = true,
  onGenerate,
  isGenerating = false
}: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">{title}</h1>
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            className="flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-border"
            data-testid="button-export-report"
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          {showGenerateButton && (
            <Button 
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
              data-testid="button-generate-content"
            >
              <Zap className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Content"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
