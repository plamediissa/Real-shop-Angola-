import express from "express";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";

dotenv.config();

const app = express();
const PORT = 3000;
const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT,
    role TEXT,
    verified INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    seller_id TEXT,
    seller_name TEXT,
    seller_verified INTEGER,
    name TEXT,
    description TEXT,
    price REAL,
    location TEXT,
    category TEXT,
    image_url TEXT,
    delivery_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    sender_name TEXT,
    receiver_id TEXT,
    product_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    buyer_id TEXT,
    status TEXT,
    payment_method TEXT,
    payment_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json());

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "MG56cd03c0af9701f57285756aecee3842";

const otpStore = new Map<string, { code: string, expires: number }>();

// Auth Endpoints
app.post("/api/auth/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Número de telefone é obrigatório" });

  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phone, { code, expires: Date.now() + 600000 });

    if (process.env.TWILIO_ACCOUNT_SID) {
      await twilioClient.messages.create({
        body: `Seu código de verificação Real Shop é: ${code}`,
        to: phone,
        messagingServiceSid: verifyServiceSid.startsWith('MG') ? verifyServiceSid : undefined,
        from: !verifyServiceSid.startsWith('MG') ? verifyServiceSid : undefined
      });
    } else {
      console.log(`[DEV MODE] SMS para ${phone}: ${code}`);
    }

    res.json({ status: 'sent' });
  } catch (error: any) {
    console.error("Twilio Send Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone, code, name, password, role } = req.body;
  
  const storedData = otpStore.get(phone);
  if (!storedData || storedData.code !== code) {
    return res.status(400).json({ error: "Código incorreto ou expirado" });
  }

  const userId = `user_${Date.now()}`;
  const user = {
    id: userId,
    name,
    phone,
    password,
    role,
    verified: 1
  };

  try {
    db.prepare("INSERT INTO users (id, name, phone, password, role, verified) VALUES (?, ?, ?, ?, ?, ?)")
      .run(user.id, user.name, user.phone, user.password, user.role, user.verified);
    
    otpStore.delete(phone);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { phone, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE phone = ? AND password = ?").get(phone, password);
  
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: "Telefone ou senha incorretos" });
  }
});

// Products Endpoints
app.get("/api/products", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const product = {
    id: `prod_${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO products (id, seller_id, seller_name, seller_verified, name, description, price, location, category, image_url, delivery_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    product.id, product.seller_id, product.seller_name, product.seller_verified,
    product.name, product.description, product.price, product.location,
    product.category, product.image_url, product.delivery_method, product.created_at
  );

  res.json(product);
});

// Messages Endpoints
app.get("/api/messages/:userId", (req, res) => {
  const messages = db.prepare("SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at ASC")
    .all(req.params.userId, req.params.userId);
  res.json(messages);
});

app.post("/api/messages", (req, res) => {
  const msg = {
    id: `msg_${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };

  db.prepare("INSERT INTO messages (id, sender_id, sender_name, receiver_id, product_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(msg.id, msg.sender_id, msg.sender_name, msg.receiver_id, msg.product_id, msg.content, msg.created_at);

  res.json(msg);
});

// Orders Endpoints
app.post("/api/orders", (req, res) => {
  const order = {
    id: `order_${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO orders (id, product_id, buyer_id, status, payment_method, payment_reference, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(order.id, order.product_id, order.buyer_id, order.status, order.payment_method, order.payment_reference, order.created_at);

  res.json(order);
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
