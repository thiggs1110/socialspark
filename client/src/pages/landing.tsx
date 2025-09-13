import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Zap, 
  Globe, 
  Brain, 
  Calendar, 
  Camera, 
  MessageSquare, 
  BarChart, 
  CheckCircle 
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">PostPilot</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Your Social Media,
              <span className="gradient-bg bg-clip-text text-transparent"> Fully Automated</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              PostPilot creates, schedules, and publishes personalized content across all major platforms 
              — so small businesses can grow their presence without lifting a finger.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg"
                data-testid="button-get-started"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-border hover:bg-muted px-8 py-3 text-lg"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Dominate Social Media
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From content creation to engagement management, PostPilot handles every aspect of your social media presence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-content-generation">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI Content Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Smart AI creates engaging, on-brand content for all your platforms in seconds, not hours.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-image-creation">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Auto Image Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Beautiful, professional images generated automatically to complement every post.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-scheduling">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Posts automatically at optimal times for maximum engagement across all platforms.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-platforms">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Multi-Platform Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Facebook, Instagram, LinkedIn, Twitter, Pinterest, blogs, and email newsletters.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-inbox">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Unified Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage all comments, DMs, and mentions from one place with AI-suggested replies.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:shadow-lg transition-shadow" data-testid="card-analytics">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Smart Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track performance and let AI optimize your content strategy over time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to automated social media success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center" data-testid="step-connect">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Connect Your Accounts</h3>
              <p className="text-muted-foreground">
                Link your website, social accounts, and let our AI learn your brand voice.
              </p>
            </div>

            <div className="text-center" data-testid="step-generate">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Generate Content</h3>
              <p className="text-muted-foreground">
                Click one button to create weeks of personalized content across all platforms.
              </p>
            </div>

            <div className="text-center" data-testid="step-relax">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Sit Back & Relax</h3>
              <p className="text-muted-foreground">
                Watch your engagement grow while PostPilot handles everything automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6 bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Built for Business Owners Who Want Results
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3" data-testid="benefit-time">
                  <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Save 10+ Hours Per Week</h4>
                    <p className="text-muted-foreground">No more manual posting, content creation, or engagement management.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3" data-testid="benefit-growth">
                  <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Boost Engagement by 300%+</h4>
                    <p className="text-muted-foreground">Consistent, high-quality content that resonates with your audience.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3" data-testid="benefit-consistency">
                  <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Never Miss a Post Again</h4>
                    <p className="text-muted-foreground">Automated scheduling ensures your brand stays visible 24/7.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3" data-testid="benefit-voice">
                  <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Maintain Your Brand Voice</h4>
                    <p className="text-muted-foreground">AI learns and adapts to your unique style and preferences.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 border-border bg-card">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">PostPilot Dashboard</h4>
                      <p className="text-sm text-muted-foreground">Your social media command center</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">24</div>
                      <div className="text-sm text-muted-foreground">Posts This Week</div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">8.2%</div>
                      <div className="text-sm text-muted-foreground">Engagement Rate</div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">6</div>
                      <div className="text-sm text-muted-foreground">Active Platforms</div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">3</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Ready to Automate Your Social Media?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join hundreds of businesses that have transformed their social media presence with PostPilot.
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 text-lg"
              data-testid="button-start-trial"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Your Free Trial
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">PostPilot</span>
            </div>
            <div className="text-muted-foreground text-sm">
              © 2025 PostPilot. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
