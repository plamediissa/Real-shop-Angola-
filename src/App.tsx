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
  LogOut,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Product, Message, Review } from './types';
import { auth, db } from './firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut,
  ConfirmationResult
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  where, 
  doc, 
  getDoc, 
  setDoc,
  Timestamp,
  limit
} from "firebase/firestore";

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
                {user.name ? user.name[0] : '?'}
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
            {product.seller_name ? product.seller_name[0] : '?'}
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

const AuthModal = ({ onClose }: { onClose: () => void }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [step, setStep] = useState(1); // 1: Form, 2: OTP
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          }
        });
      } catch (err) {
        console.error("Recaptcha init error:", err);
      }
    }
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const handleStartRegistration = async () => {
    setError(null);
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (phone.length < 9) {
      setError("O número de telefone parece inválido.");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+244${phone.replace(/\s/g, '')}`;
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep(2);
    } catch (err: any) {
      console.error("SMS Error:", err);
      if (err.code === 'auth/invalid-phone-number') {
        setError("Número de telefone inválido. Use o formato +244XXXXXXXXX.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Muitas tentativas. Tente novamente mais tarde.");
      } else {
        setError("Erro ao enviar SMS. Verifique sua conexão e o número.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (code.length < 6) {
      setError("O código deve ter 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) throw new Error("Sessão expirada. Recomece o processo.");
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;

      // Save user profile to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        id: firebaseUser.uid,
        phone: firebaseUser.phoneNumber,
        name: name,
        password: password, // Note: For security, passwords should ideally be handled by Auth providers, but saving as requested
        role: role,
        verified: 1,
        created_at: Timestamp.now()
      });
      
      onClose();
    } catch (err: any) {
      console.error("Verify Error:", err);
      if (err.code === 'auth/invalid-verification-code') {
        setError("Código de verificação incorreto.");
      } else {
        setError("Erro ao confirmar código. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        <div id="recaptcha-container"></div>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Criar Conta</h2>
          <p className="text-zinc-500 mt-2 text-sm font-medium">Real Shop Angola — Sua rede de confiança</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Nome Completo</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Manuel dos Santos"
                      className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Telefone (+244)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9xx xxx xxx"
                      className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Tipo de Conta</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setRole('buyer')}
                      className={`py-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${role === 'buyer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                    >
                      Comprador
                    </button>
                    <button 
                      onClick={() => setRole('seller')}
                      className={`py-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${role === 'seller' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                    >
                      Vendedor
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStartRegistration}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4.5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Criar Conta <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
              
              <button 
                onClick={onClose} 
                className="w-full text-zinc-400 text-xs font-bold hover:text-zinc-600 transition-colors py-2"
              >
                Já tenho uma conta? Entrar
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <p className="text-sm text-zinc-500 font-medium">Enviamos um código SMS para</p>
                <p className="text-lg font-black text-zinc-900 tracking-tight">+244 {phone}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 text-center">Código de 6 Dígitos</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-[2rem] py-6 px-4 outline-none transition-all text-center text-4xl tracking-[0.4em] font-black placeholder:text-zinc-200"
                />
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleVerifyOtp}
                  disabled={code.length < 6 || loading}
                  className="w-full bg-emerald-600 text-white py-4.5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Confirmar Código"
                  )}
                </button>
                <button 
                  onClick={() => setStep(1)} 
                  disabled={loading}
                  className="w-full text-zinc-400 text-xs font-bold hover:text-zinc-600 transition-colors"
                >
                  Voltar e corrigir dados
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const PostModal = ({ user, onClose }: { user: User, onClose: () => void }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    location: 'Luanda',
    category: 'Eletrónicos',
    delivery_method: 'Entrega em mãos',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        ...form,
        seller_id: user.id,
        seller_name: user.name,
        seller_verified: user.verified || 0,
        price: parseFloat(form.price),
        created_at: Timestamp.now()
      });
      onClose();
    } catch (error) {
      console.error("Post Error:", error);
      alert("Erro ao publicar produto.");
    } finally {
      setLoading(false);
    }
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
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Foto do Produto</label>
              <div 
                onClick={() => document.getElementById('product-image')?.click()}
                className="aspect-square bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all overflow-hidden relative group"
              >
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <PlusCircle className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="text-xs text-zinc-400 font-medium">Clique para adicionar foto</span>
                  </>
                )}
              </div>
              <input 
                id="product-image"
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nome do Produto</label>
              <input 
                type="text" 
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
              <textarea 
                rows={4}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full bg-zinc-50 border-2 border-transparent focus:border-emerald-500 rounded-xl py-3 px-4 outline-none resize-none"
              />
            </div>
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
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold mt-8 hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar Agora"}
        </button>
      </motion.div>
    </div>
  );
};

const ProductDetail = ({ product, user, onClose }: { product: Product, user: User | null, onClose: () => void }) => {
  const [message, setMessage] = useState('');
  const [paymentRef, setPaymentRef] = useState<{ entity: string, reference: string } | null>(null);

  const generateReference = async () => {
    if (!user) return;
    // Mock reference generation for demo
    const reference = Math.floor(100000000 + Math.random() * 900000000).toString();
    const entity = "00123";
    
    await addDoc(collection(db, "orders"), {
      product_id: product.id,
      buyer_id: user.id,
      status: 'pending',
      payment_method: 'multicaixa',
      payment_reference: reference,
      created_at: Timestamp.now()
    });

    setPaymentRef({ entity, reference });
  };

  const handleSendMessage = async () => {
    if (!user || !message.trim()) return;
    await addDoc(collection(db, "messages"), {
      sender_id: user.id,
      sender_name: user.name,
      receiver_id: product.seller_id,
      product_id: product.id,
      content: message,
      created_at: Timestamp.now()
    });
    setMessage('');
    alert("Mensagem enviada!");
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
                  {product.seller_name ? product.seller_name[0] : '?'}
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
                onClick={handleSendMessage}
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("created_at", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const filteredProducts = category === 'Todos' 
    ? products 
    : products.filter(p => p.category === category);

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
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
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {showPost && user && <PostModal user={user} onClose={() => setShowPost(false)} />}
        {selectedProduct && (
          <ProductDetail 
            product={selectedProduct} 
            user={user} 
            onClose={() => setSelectedProduct(null)} 
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
