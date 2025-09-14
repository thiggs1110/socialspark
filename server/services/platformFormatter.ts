import { Content } from "@shared/schema";

// Platform-specific constraints and requirements
export const PLATFORM_CONSTRAINTS = {
  facebook: {
    maxTextLength: 63206,
    maxHashtags: 30,
    imageRequired: false,
    videoSupported: true,
    linkPreviews: true,
    supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
    optimalImageSize: { width: 1200, height: 630 },
    hashtagPlacement: 'inline' // hashtags within text
  },
  instagram: {
    maxTextLength: 2200,
    maxHashtags: 30,
    imageRequired: true,
    videoSupported: true,
    linkPreviews: false,
    supportedFormats: ['jpg', 'png', 'mp4', 'mov'],
    optimalImageSize: { width: 1080, height: 1080 },
    hashtagPlacement: 'end' // hashtags at end or in comments
  },
  linkedin: {
    maxTextLength: 3000,
    maxHashtags: 5,
    imageRequired: false,
    videoSupported: true,
    linkPreviews: true,
    supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
    optimalImageSize: { width: 1200, height: 627 },
    hashtagPlacement: 'inline'
  },
  twitter: {
    maxTextLength: 280,
    maxHashtags: 10,
    imageRequired: false,
    videoSupported: true,
    linkPreviews: true,
    supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
    optimalImageSize: { width: 1200, height: 675 },
    hashtagPlacement: 'inline'
  },
  pinterest: {
    maxTextLength: 500,
    maxHashtags: 20,
    imageRequired: true,
    videoSupported: true,
    linkPreviews: false,
    supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
    optimalImageSize: { width: 1000, height: 1500 },
    hashtagPlacement: 'end'
  }
} as const;

export type PlatformConstraints = typeof PLATFORM_CONSTRAINTS;
export type PlatformName = keyof PlatformConstraints;

export interface FormattedContent {
  text: string;
  hashtags: string[];
  imageUrl?: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  metadata: {
    characterCount: number;
    hashtagCount: number;
    platform: string;
  };
}

export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class PlatformFormatter {
  
  /**
   * Format content for a specific platform
   */
  static formatForPlatform(content: Content, platform: PlatformName): FormattedContent {
    const constraints = PLATFORM_CONSTRAINTS[platform];
    const result: FormattedContent = {
      text: content.content,
      hashtags: content.hashtags || [],
      imageUrl: content.imageUrl || undefined,
      isValid: true,
      warnings: [],
      errors: [],
      metadata: {
        characterCount: 0,
        hashtagCount: 0,
        platform
      }
    };

    // Format hashtags properly for the platform
    const formattedHashtags = this.formatHashtags(content.hashtags || [], platform);
    
    // Format text based on platform requirements
    let formattedText = this.formatText(content.content, formattedHashtags, constraints);
    
    // Validate and truncate if necessary
    const validation = this.validateContent(formattedText, formattedHashtags, constraints);
    
    if (!validation.isValid) {
      // Attempt to fix issues automatically
      const fixed = this.autoFixContent(formattedText, formattedHashtags, constraints);
      formattedText = fixed.text;
      result.hashtags = fixed.hashtags;
      result.warnings.push(...fixed.warnings);
    } else {
      result.hashtags = formattedHashtags;
    }

    result.text = formattedText;
    result.metadata.characterCount = this.getCharacterCount(formattedText);
    result.metadata.hashtagCount = result.hashtags.length;
    
    // Final validation
    const finalValidation = this.validateContent(result.text, result.hashtags, constraints);
    result.isValid = finalValidation.isValid;
    result.errors = finalValidation.errors;
    result.warnings.push(...finalValidation.warnings);

    return result;
  }

  /**
   * Format hashtags for a specific platform
   */
  private static formatHashtags(hashtags: string[], platform: PlatformName): string[] {
    const constraints = PLATFORM_CONSTRAINTS[platform];
    
    return hashtags
      .slice(0, constraints.maxHashtags) // Limit to max allowed
      .map(tag => {
        // Ensure hashtag starts with #
        const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
        // Remove spaces and special characters (except underscores)
        return cleanTag.replace(/[^a-zA-Z0-9_#]/g, '');
      })
      .filter(tag => tag.length > 1); // Remove empty or single-character hashtags
  }

  /**
   * Format text content based on platform requirements
   */
  private static formatText(text: string, hashtags: string[], constraints: PlatformConstraints[PlatformName]): string {
    let formattedText = text.trim();

    // Handle hashtag placement
    if (constraints.hashtagPlacement === 'end' && hashtags.length > 0) {
      // Remove hashtags from text if they're at the end
      const hashtagPattern = /#\w+/g;
      formattedText = formattedText.replace(hashtagPattern, '').trim();
      
      // Add hashtags at the end
      formattedText += '\n\n' + hashtags.join(' ');
    } else if (constraints.hashtagPlacement === 'inline') {
      // Keep hashtags inline with text
      // Ensure hashtags in text are properly formatted
      formattedText = formattedText.replace(/#(\w+)/g, (match, word) => `#${word}`);
    }

    return formattedText;
  }

  /**
   * Validate content against platform constraints
   */
  private static validateContent(text: string, hashtags: string[], constraints: PlatformConstraints[PlatformName]): ContentValidationResult {
    const result: ContentValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    const characterCount = this.getCharacterCount(text);

    // Check text length
    if (characterCount > constraints.maxTextLength) {
      result.isValid = false;
      result.errors.push(`Text exceeds maximum length of ${constraints.maxTextLength} characters (current: ${characterCount})`);
    } else if (characterCount > constraints.maxTextLength * 0.9) {
      result.warnings.push(`Text is approaching maximum length limit (${characterCount}/${constraints.maxTextLength})`);
    }

    // Check hashtag count
    if (hashtags.length > constraints.maxHashtags) {
      result.isValid = false;
      result.errors.push(`Too many hashtags. Maximum allowed: ${constraints.maxHashtags} (current: ${hashtags.length})`);
    }

    // Platform-specific validations
    switch (constraints) {
      case PLATFORM_CONSTRAINTS.instagram:
      case PLATFORM_CONSTRAINTS.pinterest:
        if (!constraints.imageRequired) {
          result.warnings.push('Image is recommended for better engagement on this platform');
        }
        break;
      
      case PLATFORM_CONSTRAINTS.twitter:
        // Check for mentions and links that count against character limit
        const mentionCount = (text.match(/@\w+/g) || []).length;
        const linkCount = (text.match(/https?:\/\/\S+/g) || []).length;
        
        if (mentionCount > 10) {
          result.warnings.push('Too many mentions may reduce visibility');
        }
        
        if (linkCount > 1) {
          result.warnings.push('Multiple links may impact engagement');
        }
        break;
      
      case PLATFORM_CONSTRAINTS.linkedin:
        // Check for professional tone
        const professionalWords = ['insight', 'strategy', 'growth', 'innovation', 'leadership', 'professional'];
        const hasBusinessLanguage = professionalWords.some(word => 
          text.toLowerCase().includes(word)
        );
        
        if (!hasBusinessLanguage) {
          result.suggestions.push('Consider adding professional terminology for better LinkedIn engagement');
        }
        break;
    }

    return result;
  }

  /**
   * Automatically fix common content issues
   */
  private static autoFixContent(text: string, hashtags: string[], constraints: PlatformConstraints[PlatformName]): { text: string; hashtags: string[]; warnings: string[] } {
    const warnings: string[] = [];
    let fixedText = text;
    let fixedHashtags = [...hashtags];

    // Fix text length
    if (this.getCharacterCount(fixedText) > constraints.maxTextLength) {
      const maxLength = constraints.maxTextLength - 10; // Leave some buffer
      fixedText = this.truncateText(fixedText, maxLength);
      warnings.push(`Text was automatically truncated to fit ${constraints.maxTextLength} character limit`);
    }

    // Fix hashtag count
    if (fixedHashtags.length > constraints.maxHashtags) {
      fixedHashtags = fixedHashtags.slice(0, constraints.maxHashtags);
      warnings.push(`Hashtags were reduced to ${constraints.maxHashtags} to meet platform requirements`);
    }

    return { text: fixedText, hashtags: fixedHashtags, warnings };
  }

  /**
   * Smart text truncation that preserves words and hashtags
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Try to truncate at word boundaries
    const words = text.split(' ');
    let truncated = '';
    
    for (const word of words) {
      if ((truncated + ' ' + word).length <= maxLength - 3) { // -3 for "..."
        truncated += (truncated ? ' ' : '') + word;
      } else {
        break;
      }
    }

    return truncated + '...';
  }

  /**
   * Get accurate character count (some platforms count emojis differently)
   */
  private static getCharacterCount(text: string): number {
    // For most platforms, we use simple character count
    // Twitter and some others have more complex counting rules
    return text.length;
  }

  /**
   * Get platform-specific content requirements
   */
  static getPlatformRequirements(platform: PlatformName) {
    return PLATFORM_CONSTRAINTS[platform];
  }

  /**
   * Check if content needs formatting for a platform
   */
  static needsFormatting(content: Content, platform: PlatformName): boolean {
    const constraints = PLATFORM_CONSTRAINTS[platform];
    const characterCount = content.content.length;
    const hashtagCount = (content.hashtags || []).length;

    return (
      characterCount > constraints.maxTextLength ||
      hashtagCount > constraints.maxHashtags ||
      (constraints.imageRequired && !content.imageUrl)
    );
  }

  /**
   * Generate platform-specific preview
   */
  static generatePreview(content: Content, platform: PlatformName): FormattedContent {
    return this.formatForPlatform(content, platform);
  }

  /**
   * Validate content for multiple platforms
   */
  static validateForAllPlatforms(content: Content, platforms: PlatformName[]): Record<PlatformName, ContentValidationResult> {
    const results = {} as Record<PlatformName, ContentValidationResult>;
    
    for (const platform of platforms) {
      const constraints = PLATFORM_CONSTRAINTS[platform];
      results[platform] = this.validateContent(
        content.content,
        content.hashtags || [],
        constraints
      );
    }

    return results;
  }

  /**
   * Get optimization suggestions for better platform performance
   */
  static getOptimizationSuggestions(content: Content, platform: PlatformName): string[] {
    const suggestions: string[] = [];
    const constraints = PLATFORM_CONSTRAINTS[platform];
    const formatted = this.formatForPlatform(content, platform);

    // Character count optimization
    const charCount = formatted.metadata.characterCount;
    const maxChars = constraints.maxTextLength;
    
    if (charCount < maxChars * 0.5) {
      suggestions.push('Consider expanding the content to better utilize the character limit');
    }

    // Hashtag optimization
    const hashtagCount = formatted.metadata.hashtagCount;
    if (hashtagCount < constraints.maxHashtags * 0.7) {
      suggestions.push(`Consider adding more relevant hashtags (${hashtagCount}/${constraints.maxHashtags} used)`);
    }

    // Platform-specific suggestions
    switch (platform) {
      case 'instagram':
        if (!content.imageUrl) {
          suggestions.push('Add a high-quality image for better Instagram engagement');
        }
        if (hashtagCount < 5) {
          suggestions.push('Instagram posts perform better with 5-10 relevant hashtags');
        }
        break;
        
      case 'twitter':
        if (charCount > 240) {
          suggestions.push('Consider keeping tweets under 240 characters for better engagement');
        }
        if (!content.content.includes('?') && !content.content.includes('!')) {
          suggestions.push('Questions and exclamations often drive engagement on Twitter');
        }
        break;
        
      case 'linkedin':
        if (charCount < 150) {
          suggestions.push('LinkedIn posts with 150+ characters typically perform better');
        }
        if (!content.content.toLowerCase().includes('thoughts')) {
          suggestions.push('Asking for thoughts or opinions encourages LinkedIn engagement');
        }
        break;
        
      case 'facebook':
        if (charCount > 500) {
          suggestions.push('Shorter Facebook posts (under 500 characters) often see better engagement');
        }
        break;
        
      case 'pinterest':
        if (!content.imageUrl) {
          suggestions.push('Pinterest requires high-quality, vertical images for optimal performance');
        }
        if (!content.content.toLowerCase().includes('diy') && !content.content.toLowerCase().includes('tip')) {
          suggestions.push('Pinterest users engage well with DIY, tips, and how-to content');
        }
        break;
    }

    return suggestions;
  }
}

// Export types and constraints for use in other modules
export { PLATFORM_CONSTRAINTS as PlatformConstraints };