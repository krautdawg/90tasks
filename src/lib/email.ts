import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'postal.ki-katapult.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendMagicLinkEmail(to: string, magicLink: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 40px 20px;">
      <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0 0 8px;">90Tasks</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">Your personal task manager</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          Click the button below to sign in. This link expires in 15 minutes.
        </p>
        
        <a href="${magicLink}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;">
          Sign in to 90Tasks →
        </a>
        
        <p style="color: #94a3b8; font-size: 13px; margin: 32px 0 0; line-height: 1.5;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"90Tasks" <tasks@ki-katapult.de>',
    to,
    subject: 'Sign in to 90Tasks',
    html,
  })
}
