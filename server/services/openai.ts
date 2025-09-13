import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface ContentGenerationRequest {
  businessName: string;
  businessDescription: string;
  industry: string;
  platform: string;
  contentType: string;
  brandVoice: {
    tone: string;
    voice: string;
    brandAdjectives: string[];
    useEmojis: boolean;
  };
  specialInstructions?: string;
  recentContent?: string[];
}

export interface GeneratedContent {
  title?: string;
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export async function generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
  const prompt = `
You are an expert social media content creator. Generate engaging ${request.contentType} content for ${request.platform} for a business called "${request.businessName}".

Business Details:
- Name: ${request.businessName}
- Industry: ${request.industry}
- Description: ${request.businessDescription}

Brand Voice Guidelines:
- Tone: ${request.brandVoice.tone}
- Voice: ${request.brandVoice.voice}
- Brand Adjectives: ${request.brandVoice.brandAdjectives.join(", ")}
- Use Emojis: ${request.brandVoice.useEmojis ? "Yes" : "No"}

${request.specialInstructions ? `Special Instructions: ${request.specialInstructions}` : ""}

Platform: ${request.platform}
Content Type: ${request.contentType}

Please generate content that:
1. Matches the brand voice and tone perfectly
2. Is optimized for ${request.platform}
3. Includes relevant hashtags (3-7 hashtags)
4. Is engaging and authentic
5. Follows ${request.contentType} content best practices

Also provide an image generation prompt that would create a compelling visual to accompany this content.

Respond in JSON format with the following structure:
{
  "title": "Optional title for the post",
  "content": "The main post content",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "Detailed prompt for image generation"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      title: result.title,
      content: result.content,
      hashtags: result.hashtags || [],
      imagePrompt: result.imagePrompt || "",
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content: " + (error as Error).message);
  }
}

export async function generateReplyToInteraction(
  interaction: string,
  businessName: string,
  brandVoice: { tone: string; voice: string; brandAdjectives: string[] }
): Promise<string> {
  const prompt = `
You are a social media manager for "${businessName}". Someone has interacted with your social media content. 

Interaction: "${interaction}"

Brand Voice:
- Tone: ${brandVoice.tone}
- Voice: ${brandVoice.voice}
- Brand Adjectives: ${brandVoice.brandAdjectives.join(", ")}

Generate a friendly, professional reply that:
1. Acknowledges the interaction
2. Matches the brand voice
3. Is appropriate for social media
4. Encourages further engagement if appropriate
5. Is brief but meaningful

Respond only with the reply text, no additional formatting or quotes.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content?.trim() || "Thank you for your comment!";
  } catch (error) {
    console.error("Error generating reply:", error);
    throw new Error("Failed to generate reply: " + (error as Error).message);
  }
}

export async function analyzeWebsiteForBrandVoice(websiteContent: string): Promise<{
  suggestedTone: string;
  suggestedAdjectives: string[];
  suggestedDescription: string;
}> {
  const prompt = `
Analyze the following website content and suggest brand voice characteristics:

Content: "${websiteContent}"

Based on this content, suggest:
1. An appropriate tone (professional, friendly, casual, expert, fun, etc.)
2. 3-5 brand adjectives that describe this business
3. A brief business description for social media purposes

Respond in JSON format:
{
  "suggestedTone": "tone here",
  "suggestedAdjectives": ["adj1", "adj2", "adj3"],
  "suggestedDescription": "brief description"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      suggestedTone: result.suggestedTone || "professional",
      suggestedAdjectives: result.suggestedAdjectives || ["quality", "reliable", "customer-focused"],
      suggestedDescription: result.suggestedDescription || "",
    };
  } catch (error) {
    console.error("Error analyzing website:", error);
    throw new Error("Failed to analyze website: " + (error as Error).message);
  }
}
