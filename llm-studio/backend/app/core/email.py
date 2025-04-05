# app/core/email.py
import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_reset_code_email(email: str, code: str):
    """
    Send an email using Gmail's SMTP server with an 8-digit reset code.
    The email is styled using HTML and inline CSS for enhanced visuals.
    """
    subject = "Your Password Reset Code"
    
    # Plain-text version (fallback)
    plain_text = f"""\
Hello,

Your password reset code is: {code}

This code is valid for 10 minutes.

Regards,
LLM Studio Team
"""
    # HTML version with enhanced visuals
    html_content = f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset Code</title>
  <style>
    body {{
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
      margin: 0;
      padding: 0;
      color: #333;
    }}
    .container {{
      max-width: 600px;
      margin: 50px auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow: hidden;
    }}
    .header {{
      background-color: #4F5E99;
      color: #fff;
      padding: 20px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
    }}
    .content {{
      padding: 30px;
      text-align: center;
    }}
    .content p {{
      font-size: 16px;
      line-height: 1.5;
    }}
    .code {{
      display: inline-block;
      margin: 20px 0;
      padding: 10px 20px;
      font-size: 24px;
      letter-spacing: 4px;
      background-color: #e0e0e0;
      border-radius: 4px;
      font-weight: bold;
    }}
    .button {{
      display: inline-block;
      padding: 10px 20px;
      margin-top: 20px;
      background-color: #4F5E99;
      color: #fff;
      text-decoration: none;
      border-radius: 4px;
    }}
    .footer {{
      background-color: #f0f0f0;
      padding: 10px;
      text-align: center;
      font-size: 14px;
      color: #777;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LLM Studio Team</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your password reset code is:</p>
      <div class="code">{code}</div>
      <p>This code is valid for 10 minutes.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 LLM Studio Team. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""

    # Create the email message with alternative MIME parts (plain text and HTML)
    msg = MIMEMultipart("alternative")
    msg['From'] = settings.GOOGLE_MAIL_USER
    msg['To'] = email
    msg['Subject'] = subject

    part1 = MIMEText(plain_text, 'plain')
    part2 = MIMEText(html_content, 'html')
    msg.attach(part1)
    msg.attach(part2)
    
    # Create a secure SSL context and send the email
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(settings.GOOGLE_MAIL_USER, settings.GOOGLE_MAIL_APP_PASSWORD)
            server.sendmail(settings.GOOGLE_MAIL_USER, email, msg.as_string())
            logger.info(f"Email sent to {email} with reset code: {code}")
    except Exception as e:
        logger.error(f"Error sending email to {email} with reset code {code}: {e}")
