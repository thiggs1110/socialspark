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