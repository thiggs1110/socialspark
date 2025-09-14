import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = 'noreply@postpilot.app'; // Replace with your verified sender
const COMPANY_NAME = 'PostPilot';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('[email-service] SendGrid API key not configured - email notifications disabled');
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function createTrialExpirationReminderTemplate(firstName: string, expirationDate: Date): EmailTemplate {
  const formattedDate = expirationDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `⏰ Your ${COMPANY_NAME} trial expires tomorrow`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">⚡ ${COMPANY_NAME}</h1>
      </div>
      
      <h2 style="color: #1f2937;">Hi ${firstName}!</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Your free trial of ${COMPANY_NAME} is expiring tomorrow (${formattedDate}). We hope you've enjoyed automating your social media with AI-powered content creation!
      </p>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #92400e;">
          Don't lose access to your automated social media management!
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        To continue using ${COMPANY_NAME} and keep your social media automation running:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/subscription" 
           style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Upgrade to Paid Plan
        </a>
      </div>
      
      <h3 style="color: #1f2937;">What you'll keep with a paid plan:</h3>
      <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
        <li>✨ Unlimited AI-generated social media posts</li>
        <li>📅 Automated posting to all your platforms</li>
        <li>📊 Advanced analytics and insights</li>
        <li>💬 Unified inbox for all interactions</li>
        <li>🎨 Custom brand voice and style</li>
      </ul>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Questions? Just reply to this email - we're here to help!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Thanks for trying ${COMPANY_NAME}!<br>
        The ${COMPANY_NAME} Team
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>© 2024 ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;
  
  const text = `
Hi ${firstName}!

Your free trial of ${COMPANY_NAME} is expiring tomorrow (${formattedDate}). We hope you've enjoyed automating your social media with AI-powered content creation!

Don't lose access to your automated social media management!

To continue using ${COMPANY_NAME}, visit: ${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/subscription

What you'll keep with a paid plan:
• Unlimited AI-generated social media posts
• Automated posting to all your platforms
• Advanced analytics and insights
• Unified inbox for all interactions
• Custom brand voice and style

Questions? Just reply to this email - we're here to help!

Thanks for trying ${COMPANY_NAME}!
The ${COMPANY_NAME} Team
  `;

  return { subject, html, text };
}

function createTrialExpiredTemplate(firstName: string): EmailTemplate {
  const subject = `Your ${COMPANY_NAME} trial has expired`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">⚡ ${COMPANY_NAME}</h1>
      </div>
      
      <h2 style="color: #1f2937;">Hi ${firstName},</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Your free trial of ${COMPANY_NAME} has expired. We hope you enjoyed experiencing the power of automated social media management!
      </p>
      
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">
          Your account is now in limited access mode.
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Don't worry - all your data is safe! Upgrade to a paid plan to restore full access to:
      </p>
      
      <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
        <li>✨ AI-powered content generation</li>
        <li>📅 Automated posting schedule</li>
        <li>📊 Analytics and performance insights</li>
        <li>💬 Social media inbox management</li>
        <li>🎨 Brand voice customization</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/subscription" 
           style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Upgrade Now
        </a>
      </div>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">💰 Special Offer</h3>
        <p style="color: #374151; margin-bottom: 0;">
          Upgrade within 48 hours and get your first month at 20% off! 
          Use code <strong>COMEBACK20</strong> at checkout.
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Need help or have questions? Just reply to this email - our team is standing by!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #374151;">
        Best regards,<br>
        The ${COMPANY_NAME} Team
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>© 2024 ${COMPANY_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;
  
  const text = `
Hi ${firstName},

Your free trial of ${COMPANY_NAME} has expired. We hope you enjoyed experiencing the power of automated social media management!

Your account is now in limited access mode.

Don't worry - all your data is safe! Upgrade to a paid plan to restore full access to:
• AI-powered content generation
• Automated posting schedule
• Analytics and performance insights
• Social media inbox management
• Brand voice customization

SPECIAL OFFER: Upgrade within 48 hours and get your first month at 20% off! Use code COMEBACK20 at checkout.

Upgrade now: ${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/subscription

Need help or have questions? Just reply to this email - our team is standing by!

Best regards,
The ${COMPANY_NAME} Team
  `;

  return { subject, html, text };
}

export async function sendTrialExpirationReminder(
  email: string,
  firstName: string,
  expirationDate: Date
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`[email-service] Would send trial expiration reminder to ${email} (SendGrid not configured)`);
    return false;
  }

  try {
    const template = createTrialExpirationReminderTemplate(firstName, expirationDate);
    
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    await sgMail.send(msg);
    console.log(`[email-service] Trial expiration reminder sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[email-service] Failed to send trial expiration reminder to ${email}:`, error);
    return false;
  }
}

export async function sendTrialExpiredNotification(
  email: string,
  firstName: string
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`[email-service] Would send trial expired notification to ${email} (SendGrid not configured)`);
    return false;
  }

  try {
    const template = createTrialExpiredTemplate(firstName);
    
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    await sgMail.send(msg);
    console.log(`[email-service] Trial expired notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[email-service] Failed to send trial expired notification to ${email}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  trialEndsAt: Date
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`[email-service] Would send welcome email to ${email} (SendGrid not configured)`);
    return false;
  }

  const trialDays = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  try {
    const subject = `Welcome to ${COMPANY_NAME} - Your trial is active! 🎉`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">⚡ ${COMPANY_NAME}</h1>
        </div>
        
        <h2 style="color: #1f2937;">Welcome, ${firstName}! 🎉</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Thank you for starting your ${COMPANY_NAME} journey! Your ${trialDays}-day free trial is now active.
        </p>
        
        <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #166534;">
            🚀 Your trial expires on ${trialEndsAt.toLocaleDateString()}
          </p>
        </div>
        
        <h3 style="color: #1f2937;">Here's what you can do right now:</h3>
        <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
          <li>🏢 Set up your business profile</li>
          <li>🎨 Configure your brand voice</li>
          <li>📱 Connect your social media accounts</li>
          <li>✨ Generate your first AI-powered posts</li>
          <li>📅 Schedule content for the week</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/onboarding" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Get Started Now
          </a>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Need help getting started? Reply to this email or check out our getting started guide.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Happy posting!<br>
          The ${COMPANY_NAME} Team
        </p>
      </div>
    `;
    
    const text = `
Welcome, ${firstName}!

Thank you for starting your ${COMPANY_NAME} journey! Your ${trialDays}-day free trial is now active.

Your trial expires on ${trialEndsAt.toLocaleDateString()}

Here's what you can do right now:
• Set up your business profile
• Configure your brand voice
• Connect your social media accounts
• Generate your first AI-powered posts
• Schedule content for the week

Get started: ${process.env.REPLIT_DEV_DOMAIN || 'https://your-app.replit.app'}/onboarding

Need help getting started? Reply to this email!

Happy posting!
The ${COMPANY_NAME} Team
    `;

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    console.log(`[email-service] Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[email-service] Failed to send welcome email to ${email}:`, error);
    return false;
  }
}