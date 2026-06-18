const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendWelcomeEmail(email, name) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn("[mailer] MAIL_USER ou MAIL_PASS non défini — email ignoré.");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"TZPrime" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Bienvenue sur TZPrime !",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1f2937;">Bonjour ${name} 👋</h2>
          <p style="color: #4b5563;">Votre compte <strong>TZPrime</strong> a été créé avec succès.</p>
          <p style="color: #4b5563;">Vous pouvez dès maintenant vous connecter et explorer nos formations et espaces de coworking.</p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login"
             style="display:inline-block; margin-top:16px; padding:12px 24px; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none; font-weight:bold;">
            Se connecter
          </a>
          <hr style="margin-top:32px; border:none; border-top:1px solid #e5e7eb;" />
          <p style="color:#9ca3af; font-size:12px;">— L'équipe TZPrime</p>
        </div>
      `,
    });
    console.log(`[mailer] ✅ Email de bienvenue envoyé à ${email}`);
  } catch (err) {
    console.error("[mailer] ❌ Échec d'envoi d'email :", err.message);
  }
}

module.exports = { sendWelcomeEmail };