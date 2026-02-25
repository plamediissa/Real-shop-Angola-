import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User as UserIcon, 
  MessageSquare, 
  PlusCircle, 
  MapPin, 
  Star, 
  CheckCircle, 
  Phone, 
  ArrowRight,
  Package,
  CreditCard,
  Truck,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Product, Message, Review } from './types';

// --- Components ---

const Navbar = ({ user, onLogout, onOpenAuth, onOpenPost }: { 
  user: User | null, 
  onLogout: () => void, 
  onOpenAuth: () => void,
  onOpenPost: () => void
}) => (
  <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100 px-4 py-3">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
          R
        </div>
        <span className="text-xl font-bold tracking-tight text-zinc-900 hidden sm:block">Real Shop Angola</span>
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Procurar tênis, iPhones, roupas..." 
            className="w-full bg-zinc-50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <button 
              onClick={onOpenPost}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Vender</span>
            </button>
            <button className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-full relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-100">
              <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 font-medium text-xs">
                {user.name[0]}
              </div>
              <button onClick={onLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Entrar
          </button>
        )}
      </div>
    </div>
  </nav>
);

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="bg-white rounded-2xl border border-zinc-100 overflow-hidden cursor-pointer group"
  >
    <div className="aspect-square relative overflow-hidden bg-zinc-100">
      <img 
        src={product.image_url || `https://picsum.photos/seed/${product.id}/400/400`} 
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        {product.category}
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-1 mb-1">
        <MapPin className="w-3 h-3 text-zinc-400" />
        <span className="text-[10px] text-zinc-500 uppercase font-medium">{product.location}</span>
      </div>
      <h3 className="font-semibold text-zinc-900 mb-1 line-clamp-1">{product.name}</h3>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-lg font-bold text-emerald-600">{product.price.toLocaleString('pt-AO')}</span>
        <span className="text-xs font-bold text-emerald-600">Kz</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center text-[8px] font-bold">
            {product.seller_name[0]}
          </div>
          <span className="text-xs text-zinc-600 font-medium">{product.seller_name}</span>
          {product.seller_verified === 1 && <CheckCircle className="w-3 h-3 text-blue-500" />}
        </div>
        <div className="flex items-center gap-0.5 text-amber-500">
          <Star className="w-3 h-3 fill-current" />
          <span className="text-[10px] font-bold">4.8</span>
        </div>
      </div>
    </div>
  </motion.div>
);

const AuthModal = ({ onClose, onLogin }: { onClose: () => void, onLogin: (u: User) => void }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [step, setStep] = useState(1); // 1: Phone, 2: Name/Role, 3: OTP

  const requestOtp = async () => {
    await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    setStep(2);
  };

  const handleAuth = async () => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, name, role })
    });
    if (res.ok) {
      const user = await res.json();
      onLogin(user);
      onClose();
    } else {
      alert("Código inválido");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Bem-vindo à Real Shop</h2>
          <p className="text-zinc-500 mt-2">A maior rede de confiança de Angola</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Número de Telefone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">+244</span>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9xx xxx xxx"
                  className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-16 pr-4 outline-none transition-all"
                />
              </div>
            </div>
            <button 
              onClick={requestOtp}
              disabled={!phone}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Receber Código <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Seu Nome Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Manuel"
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-4 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Eu quero...</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setRole('buyer')}
                  className={`py-3 rounded-xl border-2 font-medium transition-all ${role === 'buyer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-100 text-zinc-500'}`}
                >
                  Comprar
                </button>
                <button 
                  onClick={() => setRole('seller')}
                  className={`py-3 rounded-xl border-2 font-medium transition-all ${role === 'seller' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-100 text-zinc-500'}`}
                >
                  Vender
                </button>
              </div>
            </div>
            <button 
              onClick={() => setStep(3)}
              disabled={!name}
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
            >
              Próximo
            </button>
            <button onClick={() => setStep(1)} className="w-full text-zinc-400 text-sm font-medium">Voltar</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Código SMS</label>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="4 dígitos"
                maxLength={4}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-4 outline-none transition-all text-center text-2xl tracking-[1em] font-bold"
              />
            </div>
            <button 
              onClick={handleAuth}
              disabled={code.length < 4}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              Verificar e Entrar
            </button>
            <button onClick={() => setStep(2)} className="w-full text-zinc-400 text-sm font-medium">Voltar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const PostModal = ({ user, onClose, onPost }: { user: User, onClose: () => void, onPost: () => void }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    location: 'Luanda',
    category: 'Eletrónicos',
    delivery_method: 'Entrega em mãos'
  });

  const handleSubmit = async () => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, seller_id: user.id, price: parseFloat(form.price), image_url: '' })
    });
    onPost();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">O que você está vendendo?</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">Fechar</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nome do Produto</label>
              <input 
                type="text" 
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
              <textarea 
                rows={4}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Preço (Kz)</label>
              <input 
                type="number" 
                value={form.price}
                onChange={(e) => setForm({...form, price: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Localização</label>
                <select 
                  value={form.location}
                  onChange={(e) => setForm({...form, location: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
                >
                  <option>Luanda</option>
                  <option>Viana</option>
                  <option>Cazenga</option>
                  <option>Belas</option>
                  <option>Benguela</option>
                  <option>Huambo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Categoria</label>
                <select 
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
                >
                  <option>Eletrónicos</option>
                  <option>Vestuário</option>
                  <option>Calçado</option>
                  <option>Serviços</option>
                  <option>Outros</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Método de Entrega</label>
              <select 
                value={form.delivery_method}
                onChange={(e) => setForm({...form, delivery_method: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
              >
                <option>Entrega em mãos</option>
                <option>Envio por Moto</option>
                <option>Ponto de Recolha</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold mt-8 hover:bg-emerald-700 transition-all"
        >
          Publicar Agora
        </button>
      </motion.div>
    </div>
  );
};

const ProductDetail = ({ product, user, onClose, onSendMessage }: { product: Product, user: User | null, onClose: () => void, onSendMessage: (content: string) => void }) => {
  const [message, setMessage] = useState('');
  const [paymentRef, setPaymentRef] = useState<{ entity: string, reference: string } | null>(null);

  const generateReference = async () => {
    if (!user) return;
    const res = await fetch('/api/payments/generate-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, buyerId: user.id })
    });
    const data = await res.json();
    setPaymentRef(data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur p-4 border-b border-zinc-100 flex items-center justify-between z-10">
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full">
            <ArrowRight className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400"><ShoppingBag className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-8">
          <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-100 mb-8">
            <img 
              src={product.image_url || `https://picsum.photos/seed/${product.id}/800/800`} 
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="flex items-center gap-1 text-zinc-400 text-xs">
                  <MapPin className="w-3 h-3" /> {product.location}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-zinc-900">{product.name}</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-600">{product.price.toLocaleString('pt-AO')} <span className="text-sm">Kz</span></div>
              <div className="text-xs text-zinc-400 font-medium mt-1">Negociável</div>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-6 mb-8">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Informações do Vendedor</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-lg font-bold text-zinc-400">
                  {product.seller_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-900">{product.seller_name}</span>
                    {product.seller_verified === 1 && <CheckCircle className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span>4.8 (124 vendas)</span>
                  </div>
                </div>
              </div>
              <button className="bg-white border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-colors">
                Ver Perfil
              </button>
            </div>
          </div>

          {paymentRef ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 mb-8 text-center">
              <h3 className="text-emerald-800 font-bold mb-4">Pagamento via Multicaixa</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-white p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Entidade</div>
                  <div className="text-lg font-black text-zinc-900">{paymentRef.entity}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referência</div>
                  <div className="text-lg font-black text-zinc-900">{paymentRef.reference}</div>
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-4 font-medium">Após o pagamento, o vendedor será notificado automaticamente.</p>
            </div>
          ) : (
            user && user.id !== product.seller_id && (
              <button 
                onClick={generateReference}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold mb-8 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" /> Gerar Referência de Pagamento
              </button>
            )
          )}

          <div className="prose prose-zinc mb-8">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Descrição</h3>
            <p className="text-zinc-600 leading-relaxed">
              {product.description || "Este vendedor não forneceu uma descrição detalhada, mas você pode perguntar diretamente no chat."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Entrega</div>
                <div className="text-sm font-bold text-zinc-700">{product.delivery_method}</div>
              </div>
            </div>
            <div className="border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pagamento</div>
                <div className="text-sm font-bold text-zinc-700">Multicaixa / Cash</div>
              </div>
            </div>
          </div>

          {user && user.id !== product.seller_id && (
            <div className="sticky bottom-8 bg-white border border-zinc-100 rounded-3xl p-4 shadow-xl flex gap-3">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Perguntar sobre o produto..."
                className="flex-1 bg-zinc-50 rounded-2xl px-4 outline-none text-sm"
              />
              <button 
                onClick={() => {
                  onSendMessage(message);
                  setMessage('');
                }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Conversar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [category, setCategory] = useState('Todos');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (user) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          setMessages(prev => [...prev, data.message]);
          // Simple notification
          if (data.message.sender_id !== user.id) {
            alert(`Nova mensagem de ${data.message.sender_name}`);
          }
        }
      };

      setWs(socket);
      return () => socket.close();
    }
  }, [user]);

  const handleSendMessage = (content: string) => {
    if (ws && user && selectedProduct) {
      ws.send(JSON.stringify({
        type: 'chat',
        senderId: user.id,
        receiverId: selectedProduct.seller_id,
        productId: selectedProduct.id,
        content
      }));
    }
  };

  const filteredProducts = category === 'Todos' 
    ? products 
    : products.filter(p => p.category === category);

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Navbar 
        user={user} 
        onLogout={() => setUser(null)} 
        onOpenAuth={() => setShowAuth(true)}
        onOpenPost={() => setShowPost(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero / Categories */}
        <section className="mb-12">
          <div className="bg-zinc-900 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden mb-12">
            <div className="relative z-10 max-w-xl">
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                Compre com <span className="text-emerald-500">confiança</span> em Angola.
              </h1>
              <p className="text-zinc-400 text-lg mb-8">
                A plataforma que conecta vendedores verificados a compradores reais. Segurança no pagamento e entrega garantida.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2">
                  Começar a Comprar <ArrowRight className="w-5 h-5" />
                </button>
                <button className="bg-white/10 backdrop-blur text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all">
                  Como funciona?
                </button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-l from-emerald-500/50 to-transparent"></div>
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            {['Todos', 'Eletrónicos', 'Vestuário', 'Calçado', 'Serviços', 'Outros'].map((cat) => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${category === cat ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">Descobertas Recentes</h2>
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
              <span>Ordenar por:</span>
              <select className="bg-transparent text-zinc-900 outline-none cursor-pointer">
                <option>Mais recentes</option>
                <option>Menor preço</option>
                <option>Maior preço</option>
              </select>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={() => setSelectedProduct(product)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
              <Package className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-900">Nenhum produto encontrado</h3>
              <p className="text-zinc-400 mt-2">Tente mudar a categoria ou procurar por algo diferente.</p>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={setUser} />}
        {showPost && user && <PostModal user={user} onClose={() => setShowPost(false)} onPost={fetchProducts} />}
        {selectedProduct && (
          <ProductDetail 
            product={selectedProduct} 
            user={user} 
            onClose={() => setSelectedProduct(null)} 
            onSendMessage={handleSendMessage}
          />
        )}
      </AnimatePresence>

      {/* Trust Banner */}
      <footer className="bg-zinc-50 border-t border-zinc-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">Vendedores Verificados</h4>
              <p className="text-sm text-zinc-500 mt-1">Validamos a identidade de cada vendedor para garantir sua segurança.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">Pagamento Seguro</h4>
              <p className="text-sm text-zinc-500 mt-1">Use Multicaixa Express ou pague na entrega com total confiança.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">Sistema de Avaliação</h4>
              <p className="text-sm text-zinc-500 mt-1">Comentários reais de compradores reais para cada transação.</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-200 text-center text-zinc-400 text-sm">
          © 2024 Real Shop Angola. Feito para impulsionar a economia local.
        </div>
      </footer>
    </div>
  );
}
