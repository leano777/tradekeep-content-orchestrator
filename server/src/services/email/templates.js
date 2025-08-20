// Email templates for TradeKeep

const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }
    .pillar-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin: 5px;
    }
    .internal-os { background: #dbeafe; color: #1e40af; }
    .psychology { background: #dcfce7; color: #166534; }
    .discipline { background: #fef3c7; color: #92400e; }
    .systems { background: #fce7f3; color: #9f1239; }
  </style>
`;

const newsletterTemplate = (data) => {
  const { title, content, pillar, ctaText, ctaUrl, subscriberName } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="header">
        <h1>TradeKeep</h1>
        <p>Master Your Trading Psychology</p>
      </div>
      
      <div class="content">
        <p>Hey ${subscriberName || 'Trader'},</p>
        
        <h2>${title}</h2>
        
        ${pillar ? `<span class="pillar-badge ${pillar}">${getPillarName(pillar)}</span>` : ''}
        
        <div style="margin: 20px 0;">
          ${content}
        </div>
        
        ${ctaUrl ? `
          <div style="text-align: center;">
            <a href="${ctaUrl}" class="button">${ctaText || 'Read More'}</a>
          </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p>You're receiving this because you subscribed to TradeKeep insights.</p>
        <p>
          <a href="{{unsubscribe_link}}" style="color: #6b7280;">Unsubscribe</a> | 
          <a href="https://tradekeep.com" style="color: #6b7280;">Visit TradeKeep</a>
        </p>
        <p>© ${new Date().getFullYear()} TradeKeep. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

const welcomeTemplate = (data) => {
  const { subscriberName } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TradeKeep</title>
      ${baseStyles}
    </head>
    <body>
      <div class="header">
        <h1>Welcome to TradeKeep!</h1>
        <p>Your Journey to Trading Mastery Begins</p>
      </div>
      
      <div class="content">
        <p>Hey ${subscriberName || 'Trader'},</p>
        
        <p>Welcome to the TradeKeep community! We're excited to have you on board.</p>
        
        <p>At TradeKeep, we believe that successful trading isn't just about strategy—it's about mastering your psychology, building discipline, and creating systems that work.</p>
        
        <h3>Our Four Core Pillars:</h3>
        
        <div style="margin: 20px 0;">
          <div style="margin: 15px 0;">
            <span class="pillar-badge internal-os">Internal Operating System</span>
            <p>Your trading results are outputs of your internal processes. We'll help you upgrade your beliefs, habits, and decision-making frameworks.</p>
          </div>
          
          <div style="margin: 15px 0;">
            <span class="pillar-badge psychology">Psychology Over Strategy</span>
            <p>The best strategy fails without the right psychology. Master your emotions before mastering the markets.</p>
          </div>
          
          <div style="margin: 15px 0;">
            <span class="pillar-badge discipline">Discipline Over Dopamine</span>
            <p>Sustainable success comes from discipline, not the dopamine hit of impulsive trades.</p>
          </div>
          
          <div style="margin: 15px 0;">
            <span class="pillar-badge systems">Systems vs Reactive Trading</span>
            <p>Follow proven systems instead of reacting to market emotions.</p>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="https://tradekeep.com/dashboard" class="button">Get Started</a>
        </div>
        
        <p>Expect weekly insights, practical tips, and mindset strategies that will transform your trading.</p>
        
        <p>Here's to your trading success!</p>
        
        <p><strong>The TradeKeep Team</strong></p>
      </div>
      
      <div class="footer">
        <p>You're receiving this because you just subscribed to TradeKeep.</p>
        <p>
          <a href="{{unsubscribe_link}}" style="color: #6b7280;">Unsubscribe</a> | 
          <a href="https://tradekeep.com" style="color: #6b7280;">Visit TradeKeep</a>
        </p>
        <p>© ${new Date().getFullYear()} TradeKeep. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

const campaignTemplate = (data) => {
  const { title, content, subscriberName } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="header">
        <h1>TradeKeep</h1>
      </div>
      
      <div class="content">
        ${subscriberName ? `<p>Hey ${subscriberName},</p>` : ''}
        
        ${content}
      </div>
      
      <div class="footer">
        <p>
          <a href="{{unsubscribe_link}}" style="color: #6b7280;">Unsubscribe</a> | 
          <a href="https://tradekeep.com" style="color: #6b7280;">Visit TradeKeep</a>
        </p>
        <p>© ${new Date().getFullYear()} TradeKeep. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

const getPillarName = (pillar) => {
  const pillarNames = {
    'internal-os': 'Internal Operating System',
    'psychology': 'Psychology Over Strategy',
    'discipline': 'Discipline Over Dopamine',
    'systems': 'Systems vs Reactive Trading'
  };
  return pillarNames[pillar] || pillar;
};

module.exports = {
  newsletterTemplate,
  welcomeTemplate,
  campaignTemplate,
  getPillarName
};