// server/mailer.js
import nodemailer from "nodemailer";


export const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "systemadmingrc@gmail.com",     
    pass: "swpo jwwn tmii wukx",          
  },
});

// Fonction pour envoyer l’email
export const sendInvitationEmail = async (email, firstName, invitationLink) => {
  console.log("Sending email to:", email);
  const mailOptions = {
    from: '"Plateform" <tonemail@gmail.com>',
    to: email,
    subject: "Invitation to join our plateform",
    html: `
      <!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Account Activation</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F4F6F9;
      font-family: Arial, Helvetica, sans-serif;
    }

    .email-bg {
      background-color: #F4F6F9;
      width: 100%;
    }

    .email-outer {
      max-width: 600px;
      margin: 0 auto;
    }

    .email-header {
      background-color: #111827;
      border-radius: 12px 12px 0 0;
      padding: 32px 40px;
    }

    .header-title {
      font-size: 26px;
      font-weight: bold;
      color: #FFFFFF;
      margin: 0;
    }

    .email-body {
      background-color: #FFFFFF;
      padding: 36px 40px;
      border-left: 1px solid #E2E6EF;
      border-right: 1px solid #E2E6EF;
    }

    .body-text {
      font-size: 15px;
      line-height: 1.7;
      color: #1A1A2E;
      margin: 0 0 20px 0;
    }

    .notice-box {
      background-color: #F0F4FF;
      border-left: 3px solid #3B6FFF;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 28px;
    }

    .notice-text {
      font-size: 13px;
      color: #374151;
      margin: 0;
    }

    .cta-button {
      display: inline-block;
      background-color: #111827;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
      padding: 13px 30px;
      border-radius: 8px;
    }

    .divider {
      border: none;
      border-top: 1px solid #E2E6EF;
      margin: 28px 0;
    }

    .fine-print {
      font-size: 12px;
      color: #8A94A8;
      margin: 0 0 12px 0;
    }

    .email-footer {
      background-color: #F0F2F7;
      border: 1px solid #E2E6EF;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 20px 40px;
      font-size: 12px;
      color: #8A94A8;
    }
  </style>
</head>

<body>
  <table class="email-bg" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table class="email-outer" width="600" cellpadding="0" cellspacing="0">

          <!-- HEADER -->
          <tr>
            <td class="email-header">
              <h1 class="header-title">Activate your account</h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="email-body">

              <p class="body-text">Hello ${firstName},</p>

              <p class="body-text">
                You have been invited to join the GRC Platform. To get started, please activate your account by clicking the button below and setting your password.
              </p>

              <div class="notice-box">
                <p class="notice-text">
                  This activation link is valid for <strong>24 hours</strong>. After that, you will need to request a new invitation.
                </p>
              </div>

              <!-- BUTTON -->
              <p style="text-align:center;">
                <a href="${invitationLink}" class="cta-button">
                  Activate my account
                </a>
              </p>

              <p class="body-text">
                Once your account is activated, you will be able to securely access your workspace and start using the platform.
              </p>

              <p class="body-text">
                If you did not expect this invitation, you can safely ignore this email.
              </p>

              <p class="body-text">
                For any questions, visit 
                <a href="https://support.grcplatform.com" style="color:#3B6FFF;">
                  support.grcplatform.com
                </a>.
              </p>

              <p class="body-text">
                Welcome aboard,<br>
                <span style="color:#5A6478;">The GRC Platform Team</span>
              </p>

              <hr class="divider">

              <p class="fine-print">
                This invitation was sent because an account was created for you.
              </p>

              <p class="fine-print">
                This is an automated email. Please do not reply.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="email-footer">
              &copy; 2026 GRC Platform. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
};
export const sendResetLink = async (email, firstName, ResetLink) => {
  await transporter.sendMail({
    from: '" Platform  " <tonemail@gmail.com>',
    to: email,
    subject: "Reset password instructions",
    html: `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta content="telephone=no" name="format-detection">
  <title>Password Reset</title>

  <style>
    :root {
      color-scheme: light dark;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      background-color: #F4F6F9;
      font-family: Arial, Helvetica, sans-serif;
    }

    #preHeader {
      display: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
      color: transparent !important;
      font-size: 0 !important;
      line-height: 0 !important;
    }

    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
    }

    .email-bg {
      background-color: #F4F6F9;
      width: 100%;
    }

    .email-outer {
      max-width: 600px;
      margin: 0 auto;
    }

    .email-header {
      background-color: #111827;
      border-radius: 12px 12px 0 0;
      padding: 32px 40px 28px;
    }

    

    .header-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 26px;
      font-weight: bold;
      color: #FFFFFF;
      line-height: 1.35;
      margin: 0;
      padding: 0;
    }

    .email-body {
      background-color: #FFFFFF;
      padding: 36px 40px;
      border-left: 1px solid #E2E6EF;
      border-right: 1px solid #E2E6EF;
    }

    .body-text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #1A1A2E;
      margin: 0 0 20px 0;
    }

    .notice-box {
      background-color: #F0F4FF;
      border-left: 3px solid #3B6FFF;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin-bottom: 28px;
    }

    .notice-text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      margin: 0;
    }

    .cta-wrapper {
      margin: 8px 0 28px;
    }

    .cta-button {
      display: inline-block;
      background-color: #111827;
      color: #FFFFFF !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
      padding: 13px 30px;
      border-radius: 8px;
      letter-spacing: 0.01em;
    }

    .divider {
      border: none;
      border-top: 1px solid #E2E6EF;
      margin: 28px 0;
    }

    .fine-print {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #8A94A8;
      line-height: 1.7;
      margin: 0 0 12px 0;
    }

    .fine-print a {
      color: #5A6478;
      text-decoration: underline;
    }

    .email-footer {
      background-color: #F0F2F7;
      border: 1px solid #E2E6EF;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 20px 40px;
    }

    .footer-copy {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #8A94A8;
    }

    .footer-link {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #5A6478;
      text-decoration: none;
    }

    .footer-sep {
      color: #C5CAD8;
      padding: 0 8px;
      font-size: 12px;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body, .email-bg {
        background-color: #0D1117 !important;
      }
      .email-body {
        background-color: #161B27 !important;
        border-color: #2A3147 !important;
      }
      .body-text {
        color: #E8ECF4 !important;
      }
      .notice-box {
        background-color: #1A2340 !important;
      }
      .notice-text {
        color: #9AA3BC !important;
      }
      .divider {
        border-top-color: #2A3147 !important;
      }
      .fine-print {
        color: #5A6478 !important;
      }
      .fine-print a {
        color: #7A8AA8 !important;
      }
      .email-footer {
        background-color: #111622 !important;
        border-color: #2A3147 !important;
      }
      .footer-copy {
        color: #5A6478 !important;
      }
      .footer-link {
        color: #7A8AA8 !important;
      }
    }

    /* Mobile */
    @media screen and (max-width: 620px) {
      .email-outer { width: 100% !important; }
      .email-header,
      .email-body,
      .email-footer {
        padding-left: 24px !important;
        padding-right: 24px !important;
      }
      .header-title { font-size: 22px !important; }
      .cta-button {
        display: block !important;
        text-align: center !important;
        background-color: #111827;
      }
      .footer-links-cell {
        display: block !important;
        margin-top: 8px !important;
        text-align: left !important;
      }
    }
  </style>
</head>
<body>

  <!-- Preheader invisible -->
  <div id="preHeader">
    Reset your password — This link expires in 4 hours.
    &nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;
  </div>

  <!-- Outer background table -->
  <table class="email-bg" cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation">
    <tr>
      <td valign="top" align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table class="email-outer" cellpadding="0" cellspacing="0" border="0" width="600" role="presentation">

          <!-- ── HEADER ── -->
          <tr>
  <td class="email-header">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      
      <!-- Title -->
      <tr>
        <td width="100%">
          <h1 class="header-title">Reset your password</h1>
        </td>
      </tr>

    </table>
  </td>
</tr>

          <!-- ── BODY ── -->
          <tr>
            <td class="email-body">

              <p class="body-text">Hello ${firstName},</p>

              <p class="body-text">We received a request to reset the password associated with your account. If you made this request, click the button below to set a new password.</p>

              <!-- Notice box -->
              <div class="notice-box">
                <p class="notice-text">This link is valid for <strong>4 hours</strong> from the time this email was sent. After that, the request will expire and you will need to submit a new one.</p>
              </div>

              <!-- CTA -->
              <div class="cta-wrapper">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                  href="${ResetLink}"
                  style="height:42px; v-text-anchor:middle; width:260px;"
                  arcsize="19%"
                  stroke="f"
                  fillcolor="#111827">
                  <w:anchorlock/>
                  <center style="color:#FFFFFF; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold;">
                    Reset my password
                  </center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${ResetLink}" class="cta-button">
                  Reset my password
                </a>
                <!--<![endif]-->
              </div>

              <p class="body-text">If you didn't make this request, you can safely ignore this email. Your password will remain unchanged.</p>

              <p class="body-text">For any questions, our support team is available at <a href="https://support.grcplatform.com" style="color:#3B6FFF; text-decoration:none;">support.grcplatform.com</a>.</p>

              <p class="body-text" style="margin-bottom:0;">
                Sincerely,<br>
                <span style="color:#5A6478;">The GRC Platform Team</span>
              </p>

              <hr class="divider">

              <p class="fine-print">Link not working? Check that this email is not in your Spam or Junk folder, then try again. If the problem persists, contact our <a href="https://support.grcplatform.com">customer support</a>.</p>
              <p class="fine-print">If you received this email without having an account on our platform, you can ignore and delete it without further action.</p>
              <p class="fine-print" style="margin-bottom:0;">This is an automated message. Please do not reply directly to it. For assistance, visit <a href="https://support.grcplatform.com">support.grcplatform.com</a>.</p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td class="email-footer">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td class="footer-copy" valign="middle">
                    &copy; 2026 GRC Platform. All rights reserved.
                  </td>
                  <td class="footer-links-cell" align="right" valign="middle">
                    <a href="https://support.grcplatform.com" class="footer-link">Support</a>
                    <span class="footer-sep">|</span>
                    <a href="https://grcplatform.com/privacy" class="footer-link">Privacy Policy</a>
                    <span class="footer-sep">|</span>
                    <a href="https://grcplatform.com/unsubscribe" class="footer-link">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End container -->

      </tr>
    </tr>
  </table>

</body>
</html>
    `,
  });
};
export default sendResetLink