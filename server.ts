import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("realshop.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'buyer',
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS otps (
    phone TEXT PRIMARY KEY,
    code TEXT,
    expires_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER,
    name TEXT,
    description TEXT,
    price REAL,
    location TEXT,
    category TEXT,
    image_url TEXT,
    delivery_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    buyer_id INTEGER,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    product_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(express.json());

  // WebSocket Connection Handling
  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws) => {
    let currentUserId: number | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "auth") {
          currentUserId = message.userId;
          clients.set(currentUserId!, ws);
        } else if (message.type === "chat") {
          const { receiverId, content, productId, senderId } = message;
          
          // Save to DB
          const info = db.prepare(`
            INSERT INTO messages (sender_id, receiver_id, product_id, content)
            VALUES (?, ?, ?, ?)
          `).run(senderId, receiverId, productId, content);

          const savedMsg = {
            id: info.lastInsertRowid,
            sender_id: senderId,
            receiver_id: receiverId,
            product_id: productId,
            content,
            created_at: new Date().toISOString()
          };

          // Send to receiver if online
          const receiverWs = clients.get(receiverId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({ type: "chat", message: savedMsg }));
          }
          
          // Echo back to sender
          ws.send(JSON.stringify({ type: "chat", message: savedMsg }));
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentUserId) clients.delete(currentUserId);
    });
  });

  // --- Auth & SMS API ---
  app.post("/api/auth/request-otp", (req, res) => {
    const { phone } = req.body;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

    db.prepare("INSERT OR REPLACE INTO otps (phone, code, expires_at) VALUES (?, ?, ?)").run(phone, code, expiresAt);
    
    console.log(`[SMS MOCK] Enviando código ${code} para +244 ${phone}`);
    res.json({ success: true, message: "Código enviado" });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { phone, code, name, role } = req.body;
    const otp = db.prepare("SELECT * FROM otps WHERE phone = ? AND code = ?").get(phone, code);

    if (!otp) return res.status(400).json({ error: "Código inválido" });

    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    if (!user) {
      const info = db.prepare("INSERT INTO users (phone, name, role, verified) VALUES (?, ?, ?, 1)").run(phone, name, role || 'buyer');
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    } else {
      db.prepare("UPDATE users SET verified = 1 WHERE id = ?").run(user.id);
    }

    res.json(user);
  });

  // --- Products API ---
  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, u.name as seller_name, u.verified as seller_verified 
      FROM products p 
      JOIN users u ON p.seller_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { seller_id, name, description, price, location, category, image_url, delivery_method } = req.body;
    const info = db.prepare(`
      INSERT INTO products (seller_id, name, description, price, location, category, image_url, delivery_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(seller_id, name, description, price, location, category, image_url, delivery_method);
    res.json({ id: info.lastInsertRowid });
  });

  // --- Payments (Multicaixa Reference) ---
  app.post("/api/payments/generate-reference", (req, res) => {
    const { productId, buyerId } = req.body;
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
    
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });

    // Mock reference generation
    const reference = Math.floor(100000000 + Math.random() * 900000000).toString();
    const entity = "00123"; // Mock entity

    const info = db.prepare(`
      INSERT INTO orders (product_id, buyer_id, status, payment_method, payment_reference)
      VALUES (?, ?, 'pending', 'multicaixa', ?)
    `).run(productId, buyerId, reference);

    res.json({ 
      orderId: info.lastInsertRowid,
      entity,
      reference,
      amount: product.price
    });
  });

  // --- Messages API (Initial Load) ---
  app.get("/api/messages/:userId", (req, res) => {
    const { userId } = req.params;
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at ASC
    `).all(userId, userId);
    res.json(messages);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
