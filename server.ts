import express from "express";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "MG56cd03c0af9701f57285756aecee3842";

// Armazenamento temporário para códigos gerados via Messaging Service (MG)
const otpStore = new Map<string, { code: string, expires: number }>();

// API routes
app.post("/api/auth/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Número de telefone é obrigatório" });

  try {
    if (verifyServiceSid.startsWith('VA')) {
      // Usar a API Verify do Twilio (Recomendado)
      const verification = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: phone, channel: "sms" });
      res.json({ status: verification.status });
    } else {
      // Usar a API de Mensagens comum (Para SIDs que começam com MG ou números)
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      otpStore.set(phone, { code, expires: Date.now() + 600000 }); // Expira em 10 min

      const message = await twilioClient.messages.create({
        body: `Seu código de verificação Real Shop é: ${code}`,
        to: phone,
        messagingServiceSid: verifyServiceSid.startsWith('MG') ? verifyServiceSid : undefined,
        from: !verifyServiceSid.startsWith('MG') ? verifyServiceSid : undefined
      });

      res.json({ status: 'sent', messageSid: message.sid });
    }
  } catch (error: any) {
    console.error("Twilio Send Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: "Telefone e código são obrigatórios" });

  try {
    if (verifyServiceSid.startsWith('VA')) {
      // Verificar via API Verify
      const verificationCheck = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code });

      if (verificationCheck.status === "approved") {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Código inválido" });
      }
    } else {
      // Verificar via armazenamento interno (para MG)
      const storedData = otpStore.get(phone);
      
      if (!storedData) {
        return res.status(400).json({ error: "Código expirado ou não solicitado" });
      }

      if (Date.now() > storedData.expires) {
        otpStore.delete(phone);
        return res.status(400).json({ error: "Código expirado" });
      }

      if (storedData.code === code) {
        otpStore.delete(phone);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Código incorreto" });
      }
    }
  } catch (error: any) {
    console.error("Twilio Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
