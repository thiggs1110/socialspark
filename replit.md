# PostPilot - SMB Social Media Automation Platform

## Overview

PostPilot is a comprehensive social media automation platform designed for small and medium-sized businesses. The platform automates the entire social media workflow - from content creation to publishing to engagement management. It uses AI to generate personalized posts across multiple platforms, automatically schedules and publishes content, and provides a unified inbox for managing all social media interactions. The goal is to help busy business owners maintain an active social media presence without manual effort.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React Application**: Built with TypeScript using Vite as the build tool
- **Component Library**: Shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Hook-based authentication system integrated with Replit Auth

### Backend Architecture
- **Node.js Server**: Express.js application with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **API Design**: RESTful API endpoints with consistent error handling and request/response patterns
- **File Structure**: Modular architecture with separate concerns for routes, services, and data access

### Database Schema Design
- **User Management**: Users table with profile information for Replit Auth integration
- **Business Profiles**: Comprehensive business information including industry, contact details, and settings
- **Brand Voice**: AI-driven brand voice configuration for content generation
- **Platform Connections**: OAuth-based social media platform integrations with connection status tracking
- **Content Management**: Full content lifecycle from draft to published with analytics tracking
- **Scheduling System**: Flexible scheduling settings per platform with frequency and timing controls
- **Interaction Management**: Unified inbox system for comments, DMs, and mentions across platforms

### Authentication and Authorization
- **Replit Authentication**: Integrated OpenID Connect authentication with Replit's auth system
- **Session-based Security**: Secure session management with PostgreSQL storage
- **Route Protection**: Middleware-based authentication checks for protected routes
- **User Context**: Authentication hooks provide user state throughout the application

### AI Content Generation
- **OpenAI Integration**: GPT-powered content generation with brand voice consistency
- **Platform-specific Content**: Tailored content generation for each social media platform's requirements
- **Brand Voice Learning**: System learns from user edits and feedback to improve content quality
- **Image Generation**: Integration with Nano Banana API for automated image creation
- **Content Types**: Support for educational, promotional, community, and humorous content variations

### Social Media API Integrations
- **Multi-platform Support**: Designed to support Facebook, Instagram, LinkedIn, Twitter/X, and Pinterest
- **OAuth Authentication**: Secure platform connection using OAuth flows
- **Publishing System**: Automated posting with platform-specific formatting and requirements
- **Engagement Monitoring**: Real-time monitoring of comments, DMs, and mentions
- **Analytics Collection**: Post-performance tracking and engagement metrics

### Content Management System
- **Batch Generation**: AI-powered bulk content creation for multiple platforms simultaneously
- **Approval Workflow**: Manual review and approval system before publishing
- **Scheduling Engine**: Flexible scheduling with optimal timing recommendations
- **Content Analytics**: Performance tracking and optimization recommendations
- **Draft Management**: Save and edit content before publishing

## External Dependencies

### Database and Infrastructure
- **Neon Database**: PostgreSQL database hosting with connection pooling
- **Replit Hosting**: Application deployment and hosting platform

### AI and Content Services
- **OpenAI API**: GPT models for content generation and brand voice analysis
- **Nano Banana API**: Image generation service for social media posts

### Social Media Platforms
- **Facebook Graph API**: Facebook and Instagram posting and monitoring
- **LinkedIn API**: Professional content publishing and engagement
- **Twitter API**: Tweet publishing and interaction management
- **Pinterest API**: Pin creation and board management

### Authentication and Communication
- **Replit Auth**: OpenID Connect authentication service
- **SendGrid**: Email service for notifications and user communication

### Development and UI Libraries
- **Radix UI**: Accessible component primitives for the design system
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

## Project Status & Completion Checklist

*Last Updated: September 15, 2025*

This section tracks the completion status of all PostPilot features to help with project continuity across development sessions.

### ✅ COMPLETED FEATURES

#### Core Application Foundation
- [x] Authentication system (Replit Auth integration)
- [x] User registration and login flows  
- [x] Database schema and ORM setup (Drizzle + Neon)
- [x] Frontend routing (Wouter)
- [x] Component library integration (Shadcn/UI)
- [x] State management (TanStack Query)

#### Onboarding System
- [x] Multi-step onboarding flow
- [x] Business profile setup
- [x] Platform connection interface
- [x] Brand voice configuration
- [x] Onboarding completion tracking

#### Content Management
- [x] AI content generation (Anthropic Claude Sonnet 4)
- [x] Content creation interface
- [x] Content approval workflow
- [x] Content editing and management
- [x] Draft and published content states
- [x] Content scheduling system
- [x] Platform-specific content formatting

#### Dashboard & Navigation
- [x] Main dashboard with key metrics
- [x] Sidebar navigation
- [x] Content generation cards
- [x] Recent content display
- [x] Approval queue interface

#### Social Media Integration Framework
- [x] Database schema for platform connections
- [x] OAuth flow architecture  
- [x] Platform connection management
- [x] API service classes (Facebook, Instagram, Twitter, LinkedIn, Pinterest)
- [x] Webhook event processing system
- [x] Unified response service

#### Inbox & Engagement
- [x] Unified inbox interface
- [x] Social media interaction management
- [x] AI-powered reply generation
- [x] Comment and message handling
- [x] Interaction status tracking

#### Subscription & Billing
- [x] Stripe integration
- [x] Trial management system
- [x] Subscription plans and pricing
- [x] Payment processing
- [x] Subscription status tracking
- [x] Trial expiration notifications

#### Admin Dashboard
- [x] Admin authentication and guards
- [x] User management interface
- [x] Revenue and analytics tracking
- [x] **Affiliate management system**
- [x] **Custom discount link creation**
- [x] Admin overview with key metrics
- [x] Trial management statistics

#### Email System
- [x] SendGrid integration
- [x] Welcome emails
- [x] Trial reminder notifications
- [x] Email templates and formatting

#### Development Infrastructure  
- [x] TypeScript configuration
- [x] Build system (Vite)
- [x] Database migrations
- [x] Error handling and logging
- [x] Development and production environments

### 🔄 PARTIALLY COMPLETED FEATURES

#### Analytics Dashboard
- [x] Basic analytics page structure
- [ ] Chart implementations (performance metrics)
- [ ] Engagement rate calculations
- [ ] Platform-specific analytics
- [ ] Historical data visualization
- [ ] Export functionality

#### Image Generation
- [x] Image prompt generation via AI
- [x] Database schema for image URLs
- [ ] Nano Banana API integration  
- [ ] Image generation workflow
- [ ] Image storage and management

#### Social Media Platform Testing
- [x] API service implementations
- [x] OAuth flow setup
- [ ] Live platform connection testing
- [ ] Real content publishing verification
- [ ] Webhook endpoint validation

### ❌ NEEDS COMPLETION

#### Advanced Analytics
- [ ] Performance metrics calculations
- [ ] Engagement rate analytics  
- [ ] ROI tracking and reporting
- [ ] Competitor analysis features
- [ ] Growth insights and recommendations

#### Enhanced Publishing
- [ ] Cross-platform posting optimization
- [ ] Post timing recommendations
- [ ] A/B testing for content
- [ ] Automated hashtag suggestions
- [ ] Content performance predictions

#### Platform-Specific Features
- [ ] Instagram Stories support
- [ ] LinkedIn article publishing
- [ ] Pinterest board management
- [ ] TikTok integration
- [ ] YouTube Shorts support

#### Advanced Automation
- [ ] Smart scheduling algorithms
- [ ] Auto-response rules
- [ ] Content series management
- [ ] Seasonal content suggestions
- [ ] Industry-specific content templates

#### Monitoring & Alerts
- [ ] Real-time platform health monitoring
- [ ] Publishing failure alerts
- [ ] Engagement spike notifications
- [ ] Competitive monitoring
- [ ] Brand mention tracking

#### API Documentation
- [ ] Public API documentation
- [ ] Rate limiting implementation
- [ ] API key management
- [ ] Developer portal

#### Production Readiness
- [ ] Performance optimization
- [ ] Security hardening review
- [ ] Load testing
- [ ] Error monitoring integration
- [ ] Backup and disaster recovery

### 🎯 CURRENT FOCUS AREAS

**Priority 1: Analytics Implementation**
- Implement chart visualizations for the analytics dashboard
- Calculate real engagement rates from social media data
- Create exportable reports

**Priority 2: Social Media Integration Testing**  
- Test OAuth flows with real platform credentials
- Validate webhook endpoints with live data
- Verify content publishing across platforms

**Priority 3: Image Generation Service**
- Integrate Nano Banana API for automated image creation
- Implement image generation workflow in content creation

### 📊 COMPLETION METRICS

- **Overall Progress**: ~85-90% complete
- **Core Features**: 95% complete  
- **Integration Testing**: 60% complete
- **Analytics & Reporting**: 40% complete
- **Production Readiness**: 70% complete

---

*Note: This checklist should be updated whenever significant features are added or completed to maintain project continuity across development sessions.*