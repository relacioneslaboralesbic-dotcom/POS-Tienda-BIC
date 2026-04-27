// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Package, History, Plus, Search, Trash2, 
  X, CheckCircle, LogOut, Edit2, ArrowLeft, Minus,
  User, Lock, ShoppingBag, List, Check, XCircle,
  Download, ImageIcon, LayoutDashboard, TrendingUp,
  BadgeInfo, Clock, UserCircle, ShieldCheck, FileDown, FileUp, Printer
} from 'lucide-react';

// --- INTEGRACIÓN FIREBASE SDK ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, collection, doc, setDoc, 
  updateDoc, query, orderBy, onSnapshot, writeBatch 
} from "firebase/firestore";

// Tus credenciales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCWpIzsF_Gg6nHIyJFjVCnNYeu3CDryoTk",
  authDomain: "pos-tienda-bic.firebaseapp.com",
  projectId: "pos-tienda-bic",
  storageBucket: "pos-tienda-bic.firebasestorage.app",
  messagingSenderId: "660770917707",
  appId: "1:660770917707:web:00fbc12cb81d1ca8b0acce",
  measurementId: "G-C2GD4355JL"
};

// Inicialización de servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Configuración Visual BIC ---
const COLORS = {
  bicOrange: '#F89332',
  bladeBlue: '#035AE5',
  expressPurple: '#A14EF9',
  flameRed: '#DB054B',
  accentYellow: '#FFCC00',
  accentGreen: '#64BF69',
  background: '#F3EDEC',
  white: '#FFFFFF',
  black: '#000000',
};

const CATEGORIES = ['Todos', 'Stationery', 'Lighter', 'Shaver', 'Brushes'];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
  * { font-family: 'Nunito', 'Avenir Next', sans-serif; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .ticket-wrapper { position: absolute; top: 0; left: 0; z-index: -100; pointer-events: none; }
  @media print {
    @page { size: letter; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body * { visibility: hidden; }
    .ticket-wrapper, .ticket-wrapper * { visibility: visible; }
    .ticket-wrapper { position: absolute; left: 0; top: 0; z-index: 9999; width: 215.9mm; }
    .no-print { display: none !important; }
  }
`;

// --- Componentes de Apoyo ---
const ProductBarcode = ({ value }) => {
  if (!value) return <span className="text-[10px] text-gray-300">SIN SKU</span>;
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-end gap-[1px] h-[20px]">
        {String(value).split('').map((char, i) => (
          <div key={i} className="bg-black" style={{ width: '1.5px', height: `${(char.charCodeAt(0) % 8) + 12}px` }}></div>
        ))}
      </div>
      <span className="text-[8px] font-mono font-bold mt-0.5 uppercase">{value}</span>
    </div>
  );
};

const OrderBarcode = ({ value }) => (
  <div className="flex flex-col items-center mt-4">
    <div className="flex h-12 items-end gap-[1.5px]">
      {String(value).split('').concat(['X','Y','Z']).map((char, i) => (
        <div key={i} className="bg-black h-full" style={{ width: '2px' }}></div>
      ))}
    </div>
    <span className="text-[10px] font-mono font-bold tracking-[0.4em] mt-1 uppercase italic">{value}</span>
  </div>
);

const LogoBIC = ({ size = "normal", showText = true }) => (
  <div className="flex items-center gap-3">
    <img 
      src="Logo.webp" 
      alt="Logo BIC" 
      className={size === 'large' ? 'h-24' : 'h-10'} 
      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
    />
    <div className="hidden relative items-center justify-center">
      <div className={`bg-[#F89332] ${size === 'large' ? 'w-24 h-16' : 'w-12 h-8'} rounded-[50%] flex items-center justify-center border-2 border-black rotate-[-5deg]`}>
        <span className={`text-black font-black italic transform scale-x-125 ${size === 'large' ? 'text-3xl' : 'text-sm'}`}>BIC</span>
      </div>
    </div>
    {showText && <h1 className={`font-black text-black ${size === 'large' ? 'text-4xl' : 'text-lg'} uppercase tracking-tighter`}>Tiendita BIC</h1>}
  </div>
);

const App = () => {
  // Navegación y Sesión
  const [appMode, setAppMode] = useState('selection'); 
  const [adminView, setAdminView] = useState('dashboard'); 
  const [currentUser, setCurrentUser] = useState(null);
  
  // Datos Firebase
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [notification, setNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);

  // Login States
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', empNum: '', empName: '', empShift: 'Matutino' });
  const [loginError, setLoginError] = useState('');

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- AUTENTICACIÓN ANÓNIMA SILENCIOSA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Error de autenticación segura:", error);
          // Si falla, permitimos intentar leer por si las reglas son públicas
          setIsAuthReady(true); 
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // --- ESCUCHA EN TIEMPO REAL (FIREBASE) ---
  useEffect(() => {
    if (!isAuthReady) return;

    // Escuchar Inventario
    const unsubInv = onSnapshot(collection(db, "inventory"), (snap) => {
      setProducts(snap.docs.map(d => d.data()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error Firestore (Inventario):", error);
      setIsLoading(false);
      if (error.code === 'permission-denied') {
        notify("Atención: Permisos de Firestore denegados. Actualiza tus Reglas de Base de Datos.", "error");
      }
    });

    // Escuchar Historial
    const qHist = query(collection(db, "history"), orderBy("date", "desc"));
    const unsubHist = onSnapshot(qHist, (snap) => {
      setSales(snap.docs.map(d => d.data()));
    }, (error) => {
      console.error("Error Firestore (Historial):", error);
    });

    return () => { unsubInv(); unsubHist(); };
  }, [isAuthReady]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginForm.user === 'admin' && loginForm.pass === 'admin123') {
      setCurrentUser({ name: 'Administrador', role: 'admin' });
      setAppMode('admin');
      setAdminView('dashboard');
      setLoginError('');
    } else setLoginError('Acceso denegado: Credenciales incorrectas');
  };

  const handleEmployeeLogin = (e) => {
    e.preventDefault();
    if (loginForm.empNum && loginForm.empName) {
      setCurrentUser({ name: loginForm.empName, number: loginForm.empNum, shift: loginForm.empShift, role: 'employee' });
      setAppMode('employee');
      setLoginError('');
    } else setLoginError('Por favor, ingresa tus datos completos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('selection');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory('Todos');
    setIsCartOpenMobile(false);
    setLoginError('');
  };

  // --- INTEGRACIÓN CON CLOUDINARY PARA FOTOS ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file); 

    setIsUploading(true);
    notify("Subiendo imagen a Cloudinary...", "success");

    try {
      const cloudName = 'dvrluet68';
      const apiKey = '454519176479577';
      const apiSecret = 'O5Jui-cALz43axjlFOkAL4FJ4HU';
      const timestamp = Math.round((new Date).getTime() / 1000);

      const str = `timestamp=${timestamp}${apiSecret}`;
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        setImagePreview(data.secure_url);
        notify("Imagen lista y guardada", "success");
      } else {
        notify("Error procesando imagen", "error");
      }
    } catch (error) {
      console.error(error);
      notify("Error en la conexión a la nube de imágenes", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (isUploading) return notify("Espera a que suba la imagen", "error");
    const fd = new FormData(e.target);
    const productId = editingProduct?.id || Date.now().toString();
    
    const data = {
      id: productId,
      code: fd.get('code').toUpperCase(),
      name: fd.get('name'),
      price: parseFloat(fd.get('price')),
      stock: parseInt(fd.get('stock')),
      category: fd.get('category'),
      image: imagePreview || editingProduct?.image || ''
    };

    try {
      await setDoc(doc(db, "inventory", productId), data);
      setIsModalOpen(false);
      setEditingProduct(null);
      setImagePreview(null);
      notify("Producto guardado exitosamente");
    } catch (err) { 
      console.error(err);
      notify("Error al guardar en Firestore. Permisos denegados.", "error"); 
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    notify("Importando inventario...", "success");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const importedProducts = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 5) {
          importedProducts.push({
            id: Date.now().toString() + i, 
            code: parts[0].trim(), 
            name: parts[1].trim(),
            price: parseFloat(parts[2]) || 0, 
            stock: parseInt(parts[3]) || 0,
            category: parts[4].trim(), 
            image: ''
          });
        }
      }
      
      if (importedProducts.length > 0) {
        try {
          const batch = writeBatch(db);
          importedProducts.forEach(p => {
            const docRef = doc(db, "inventory", p.id);
            batch.set(docRef, p);
          });
          await batch.commit();
          notify(`Se importaron ${importedProducts.length} productos a Firebase.`);
        } catch (error) {
          console.error(error);
          notify("Error guardando en la base de datos", "error");
        }
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const handleDownloadImage = (order) => {
    setSelectedOrderForTicket(order);
    notify("Generando imagen...", "success");
    setTimeout(() => {
      const element = document.getElementById('printable-ticket');
      if (!element) return;
      const capture = () => {
        window.html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
          const link = document.createElement('a');
          link.download = `Vale_BIC_${order.id_vale || order.id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      };
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = capture;
        document.body.appendChild(script);
      } else {
        capture();
      }
    }, 500);
  };

  const downloadReport = () => {
    if (sales.length === 0) {
      notify("No hay ventas para exportar", "error");
      return;
    }
    let csv = "Folio,Fecha,Empleado,Turno,Total,Articulos\n";
    sales.forEach(sale => {
      const itemsStr = sale.items.map(i => `${i.quantity}x ${i.name}`).join(" + ");
      csv += `"${sale.id_vale}","${new Date(sale.date).toLocaleString()}","${sale.empName}","${sale.empShift}","$${sale.total}","${itemsStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_TienditaBIC_${new Date().getTime()}.csv`;
    a.click();
    notify("Descargando reporte...");
  };

  const handleApproveOrder = async (order) => {
    try {
      notify("Procesando aprobación...", "success");
      // 1. Guardar en Historial Firebase
      const historyRef = doc(db, "history", order.id_vale);
      await setDoc(historyRef, { ...order, status: 'Aprobado' });

      // 2. Descontar Stock en Firebase
      for (const item of order.items) {
        const pRef = doc(db, "inventory", item.id);
        const currentProd = products.find(p => p.id === item.id);
        if (currentProd) {
          await updateDoc(pRef, { stock: Math.max(0, currentProd.stock - item.quantity) });
        }
      }
      
      // Eliminar de pendientes
      setPendingOrders(pendingOrders.filter(o => o.id_vale !== order.id_vale));
      notify("Pedido autorizado y descontado del inventario", "success");
    } catch (e) { 
      console.error(e);
      notify("Fallo en la conexión. Revisa permisos Firestore.", "error"); 
    }
  };

  const handleRejectOrder = (order) => {
    setPendingOrders(pendingOrders.filter(o => o.id_vale !== order.id_vale));
    notify(`Pedido #${order.id_vale} rechazado.`, "error");
  };

  const handleEmployeeSubmit = () => {
    if (cart.length === 0) return;
    const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const order = {
      id_vale: Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: new Date().toISOString(),
      empName: currentUser.name,
      empNum: currentUser.number,
      empShift: currentUser.shift,
      items: [...cart],
      total: sub * 1.16,
      status: 'Pendiente'
    };
    
    setPendingOrders([order, ...pendingOrders]);
    setSelectedOrderForTicket(order);
    setShowSuccessModal(true);
    setCart([]);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return notify("Sin existencias", "error");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return notify("Límite de stock", "error");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = Math.max(1, Math.min(item.quantity + delta, product.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal * 1.16;

  const filteredProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Todos' || p.category === selectedCategory)
  ), [products, searchTerm, selectedCategory]);

  // --- Componente UI Compartido: SidebarItem ---
  const SidebarItem = ({ icon, label, id, badge }) => {
    const isActive = adminView === id;
    return (
      <button 
        onClick={() => setAdminView(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
          isActive 
            ? 'bg-[#035AE5]/10 text-[#035AE5]' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-black'
        }`}
      >
        <span className={isActive ? 'text-[#035AE5]' : ''}>{icon}</span>
        <span className="hidden lg:block flex-1 text-left">{label}</span>
        {badge > 0 && (
          <span className="bg-[#DB054B] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>
        )}
      </button>
    );
  };


  // ==========================================
  // RENDER: PANTALLAS DE ACCESO (SELECCIÓN / LOGIN)
  // ==========================================
  if (appMode === 'selection' || appMode.startsWith('login')) {
    return (
      <div className="flex h-screen bg-[#F3EDEC]">
        <style>{globalStyles}</style>
        {notification && <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-2xl border-l-4 ${notification.type === 'error' ? 'bg-white border-red-500' : 'bg-white border-green-500'} font-bold`}>{notification.message}</div>}
        
        {/* Lado Izquierdo - Diseño visual estilo SaaS */}
        <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 relative overflow-hidden bg-[#035AE5]">
          <div className="relative z-10 w-full max-w-xl">
            {/* Imagen del Banner (Carga Banner.webp por defecto) */}
            <img 
              src="Banner.webp" 
              alt="Banner Publicitario" 
              className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl transition-all duration-500 hover:scale-[1.02]"
              onError={(e) => {
                // Fallback en caso de que no cargue la imagen local
                e.target.onerror = null; 
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback visual (oculto por defecto, se muestra si no hay imagen) */}
            <div className="hidden bg-white/10 backdrop-blur-md p-12 rounded-3xl border border-white/20 text-center text-white shadow-xl">
              <h1 className="text-4xl font-bold mb-4 leading-tight">Espacio para Banner</h1>
              <p className="text-base opacity-80">Sube una imagen llamada <strong>Banner.webp</strong> o <strong>Banner.png</strong> al proyecto para que se muestre aquí automáticamente.</p>
            </div>
          </div>
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full mix-blend-overlay opacity-20 bg-[#F89332]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-overlay opacity-20 bg-[#A14EF9]"></div>
        </div>

        {/* Lado Derecho - Formulario de Interacción */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-20 relative">
          
          {appMode !== 'selection' && (
            <button onClick={() => setAppMode('selection')} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold text-sm">
              <ArrowLeft size={18} /> Volver
            </button>
          )}

          <div className="w-full max-w-md">
            <div className="flex justify-center mb-10"><LogoBIC size="large" /></div>
            
            {/* PANTALLA 1: SELECCIÓN DE PERFIL */}
            {appMode === 'selection' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-black text-center mb-8">Selecciona tu Perfil</h2>
                
                <button 
                  onClick={() => { setAppMode('login_employee'); resetUI(); }}
                  className="w-full bg-white border-2 border-gray-200 p-5 rounded-2xl flex items-center gap-5 hover:border-[#035AE5] hover:shadow-lg transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#035AE5] group-hover:text-white text-[#035AE5] bg-[#F3EDEC]"><ShoppingBag size={24} /></div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-black">Empleado BIC</h3>
                    <p className="text-sm font-bold text-gray-500">Acceso al Catálogo (Cliente)</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setAppMode('login_admin'); resetUI(); }}
                  className="w-full border-2 border-transparent p-5 rounded-2xl flex items-center gap-5 shadow-md hover:shadow-xl transition-all bg-[#F89332]"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-black/10 backdrop-blur-sm"><ShieldCheck size={24} /></div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-black">Administrador</h3>
                    <p className="text-sm font-bold text-black/70">Gestión de negocio</p>
                  </div>
                </button>
              </div>
            )}

            {/* PANTALLA 2: LOGIN ADMINISTRADOR */}
            {appMode === 'login_admin' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                <h2 className="text-2xl font-bold text-black text-center mb-6">Acceso Administrador</h2>
                {loginError && <div className="bg-[#DB054B]/10 text-[#DB054B] p-3 rounded-xl text-sm font-bold mb-6 text-center border border-[#DB054B]/20">{loginError}</div>}
                
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" placeholder="admin" required value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#F89332] focus:bg-white transition-all font-bold text-black"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="password" placeholder="admin123" required value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#F89332] focus:bg-white transition-all font-bold text-black"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 mt-6 rounded-xl font-bold text-black text-lg shadow-md hover:brightness-95 active:scale-[0.98] transition-all uppercase tracking-widest bg-[#F89332]">
                    Entrar al Sistema
                  </button>
                </form>
              </div>
            )}

            {/* PANTALLA 3: LOGIN EMPLEADO */}
            {appMode === 'login_employee' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                <h2 className="text-2xl font-bold text-black text-center mb-6">Registro de Datos</h2>
                {loginError && <div className="bg-[#DB054B]/10 text-[#DB054B] p-3 rounded-xl text-sm font-bold mb-6 text-center border border-[#DB054B]/20">{loginError}</div>}
                
                <form onSubmit={handleEmployeeLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Número de Empleado</label>
                    <div className="relative">
                      <BadgeInfo className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" placeholder="Ej. 10452" required value={loginForm.empNum} onChange={e => setLoginForm({...loginForm, empNum: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre Completo</label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" placeholder="Ej. Juan Pérez" required value={loginForm.empName} onChange={e => setLoginForm({...loginForm, empName: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Turno</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <select 
                        required value={loginForm.empShift} onChange={e => setLoginForm({...loginForm, empShift: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black appearance-none cursor-pointer"
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Nocturno">Nocturno</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 mt-6 rounded-xl font-bold text-white text-lg shadow-md hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest bg-[#035AE5]">
                    Ingresar al Catálogo
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F3EDEC]">
      <style>{globalStyles}</style>
      
      {/* Plantilla Impresión Oculta */}
      <div className="ticket-wrapper">{selectedOrderForTicket && (
        <div id="printable-ticket" className="bg-white text-black p-10 flex flex-col border-[12px] border-double border-gray-100" style={{ width: '215.9mm', minHeight: '279.4mm' }}>
          <div className="flex justify-between items-start border-b-4 border-black pb-6">
            <LogoBIC size="large" />
            <div className="text-right">
              <h2 className="text-3xl font-black uppercase">{selectedOrderForTicket.status === 'Aprobado' ? 'Vale de Entrega' : 'Comprobante de Solicitud'}</h2>
              <p className="font-bold text-gray-500 uppercase">Folio: <span className="text-black">#{selectedOrderForTicket.id_vale}</span></p>
              <p className="text-sm font-bold text-gray-400 mt-1">{new Date(selectedOrderForTicket.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 my-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Solicitante</p>
              <p className="text-xl font-bold uppercase">{selectedOrderForTicket.empName}</p>
              <p className="font-bold text-gray-600 italic">ID: {selectedOrderForTicket.empNum} • Turno: {selectedOrderForTicket.empShift}</p>
            </div>
            <div className="text-right flex flex-col justify-end text-sm font-bold uppercase text-gray-400">BIC SALTILLO • CONTROL DE INSUMOS</div>
          </div>
          <div className="flex-1">
            <table className="w-full text-left">
              <thead><tr className="border-b-2 border-black text-[10px] uppercase font-black text-gray-400"><th className="py-3 px-2">Código Barra</th><th className="py-3 px-2">Descripción</th><th className="py-3 px-2 text-center">Cant.</th><th className="py-3 px-2 text-right">Subtotal</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {selectedOrderForTicket.items.map((it, i) => (
                  <tr key={i} className="text-sm font-bold">
                    <td className="py-4 px-2"><ProductBarcode value={it.code} /></td>
                    <td className="py-4 px-2 uppercase">{it.name}</td>
                    <td className="py-4 px-2 text-center font-black text-lg">{it.quantity}</td>
                    <td className="py-4 px-2 text-right font-black">${(it.price * it.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 border-t-2 border-black pt-6 flex justify-end">
            <div className="text-right">
              <p className="text-gray-400 text-[10px] font-black uppercase">Importe Total:</p>
              <p className="text-4xl font-black text-[#035AE5]">${selectedOrderForTicket.total.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-10 text-center">
            <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400">Firma Recibido</div>
            <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400">Autorización Almacén</div>
          </div>
          <div className="mt-auto pt-8 flex flex-col items-center">
            <OrderBarcode value={selectedOrderForTicket.id_vale} />
            <p className="text-[8px] text-gray-300 font-bold mt-4 tracking-[0.3em]">DOCUMENTO DE CONTROL INTERNO • FIREBASE CLOUD POS</p>
          </div>
        </div>
      )}</div>

      {/* Sidebar Admin */}
      {appMode === 'admin' && (
        <aside className="hidden md:flex w-20 lg:w-64 bg-white border-r border-gray-200 flex-col z-30 shadow-[5px_0_20px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100 shrink-0">
            <div className="lg:hidden"><LogoBIC size="small" showText={false} /></div>
            <div className="hidden lg:block"><LogoBIC size="small" /></div>
          </div>
          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto hide-scrollbar">
            <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-2 mt-2">Gestión Integral</p>
            <SidebarItem id="dashboard" icon={<LayoutDashboard size={20}/>} label="Resumen" />
            <SidebarItem id="orders" icon={<List size={20}/>} label="Pedidos" badge={pendingOrders.length} />
            <SidebarItem id="inventory" icon={<Package size={20}/>} label="Inventario" />
            <SidebarItem id="history" icon={<History size={20}/>} label="Historial" />
          </nav>
          <div className="p-4 border-t border-gray-100">
            <div className="hidden lg:block px-4 pb-4">
               <p className="text-xs font-bold text-black">Administrador</p>
               <p className="text-[10px] font-bold text-gray-400 uppercase">Sesión Activa</p>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm">
              <LogOut size={20}/> <span className="hidden lg:block">Salir</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Empleado o Admin Mobile */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 z-30">
          <LogoBIC size="small" showText={appMode === 'employee'} />
          {appMode === 'employee' ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-sm text-black">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {currentUser.number} • {currentUser.shift}</p>
              </div>
              <button onClick={handleLogout} className="w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-red-50 text-red-500 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                <LogOut size={16}/> <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="md:hidden w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold"><LogOut size={14}/></button>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#035AE5] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm animate-pulse">Conectando a Firebase...</p>
              </div>
            ) : adminView === 'dashboard' && appMode === 'admin' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-6">Resumen del Día</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-100 text-[#035AE5]"><TrendingUp size={24} /></div>
                      <span className="text-xs font-bold text-[#64BF69] bg-green-50 px-2 py-1 rounded-md">+12% hoy</span>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Ventas Firebase</p>
                    <h3 className="text-3xl font-black text-black mt-1">${sales.reduce((a,s)=>a+s.total,0).toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-orange-100 text-[#F89332]"><Package size={24} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Items en Stock</p>
                    <h3 className="text-3xl font-black text-black mt-1">{products.reduce((a,p)=>a+p.stock,0)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-red-100 text-[#DB054B]"><History size={24} /></div>
                      {pendingOrders.length > 0 && <span className="flex w-3 h-3 bg-[#DB054B] rounded-full animate-pulse"></span>}
                    </div>
                    <p className="text-sm font-bold text-gray-400">Vales Emitidos</p>
                    <h3 className="text-3xl font-black text-black mt-1">{sales.length}</h3>
                  </div>
                </div>
              </div>
            ) : adminView === 'inventory' && appMode === 'admin' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-black">Inventario en la Nube</h2>
                  <div className="flex gap-2">
                    <button onClick={downloadCSVTemplate} className="hidden lg:flex text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FileDown size={18} /> Plantilla</button>
                    <label className="text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all cursor-pointer"><FileUp size={18} /> Importar<input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" /></label>
                    <button onClick={() => { setEditingProduct(null); setImagePreview(null); setIsModalOpen(true); }} className="bg-[#F89332] p-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 text-black shadow-sm"><Plus size={16}/> Nuevo</button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 hidden lg:table-cell">Código</th><th className="p-4">Material</th><th className="p-4 hidden sm:table-cell">Categoría</th><th className="p-4">Precio</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Edición</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map(p => (
                        <tr key={p.id} className="text-sm font-bold hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 hidden lg:table-cell text-gray-400 text-xs">{p.code || '-'}</td>
                          <td className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">{p.image && <img src={p.image} className="w-full h-full object-contain p-1" alt={p.name}/>}</div><span className="uppercase text-black text-sm">{p.name}</span></td>
                          <td className="p-4 hidden sm:table-cell"><span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-md text-xs">{p.category}</span></td>
                          <td className="p-4 text-[#035AE5] font-black">${p.price.toFixed(2)}</td>
                          <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{p.stock}</span></td>
                          <td className="p-4 text-right"><button onClick={() => { setEditingProduct(p); setImagePreview(p.image); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-[#035AE5] bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"><Edit2 size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : adminView === 'orders' && appMode === 'admin' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-8 flex items-center gap-3">Pedidos Recibidos {pendingOrders.length > 0 && <span className="bg-[#DB054B] text-white text-sm px-3 py-1 rounded-full">{pendingOrders.length}</span>}</h2>
                {pendingOrders.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-[#F3EDEC] p-4 rounded-full text-gray-400 mb-4"><List size={32} /></div>
                    <p className="font-bold text-black text-lg">No hay pedidos pendientes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {pendingOrders.map(order => (
                      <div key={order.id_vale} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#F3EDEC]">
                          <div>
                            <span className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded tracking-widest uppercase">Orden #{order.id_vale}</span>
                            <h3 className="font-bold text-black mt-2 uppercase">{order.empName}</h3>
                            <p className="text-xs font-bold text-gray-500 mt-0.5">ID: {order.empNum} • {order.empShift}</p>
                          </div>
                          <span className="text-2xl font-black text-black">${order.total.toFixed(2)}</span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                           <ul className="space-y-3 mb-6">
                            {order.items.map((it, i) => (
                              <li key={i} className="flex justify-between items-center text-sm font-bold uppercase">
                                <span className="text-gray-600"><span className="text-[#035AE5] bg-blue-50 px-1.5 py-0.5 rounded mr-2">{it.quantity}x</span> {it.name}</span>
                                <span className="text-black">${(it.price * it.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                           </ul>
                           <div className="flex gap-3 mt-auto">
                             <button onClick={() => handleRejectOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-[#DB054B] bg-white border-2 border-[#DB054B] hover:bg-red-50 transition-colors flex items-center justify-center gap-2">Rechazar</button>
                             <button onClick={() => handleApproveOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#035AE5] shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"><Check size={18} /> Autorizar</button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : adminView === 'history' && appMode === 'admin' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-black">Historial Aprobado</h2><button onClick={downloadReport} className="bg-white border border-gray-200 text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><Download size={18} /> Exportar CSV</button></div>
                {sales.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center"><div className="bg-[#F3EDEC] p-4 rounded-full text-gray-400 mb-4"><History size={32} /></div><p className="font-bold text-black text-lg">Aún no hay aprobaciones</p></div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4">Folio</th><th className="p-4">Fecha</th><th className="p-4">Empleado BIC</th><th className="p-4 text-right">Acción</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {sales.map((s, i) => (
                          <tr key={i} className="text-sm font-bold hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 text-black">#{s.id_vale}</td>
                            <td className="p-4 text-gray-500">{new Date(s.date).toLocaleString()}</td>
                            <td className="p-4"><p className="text-black uppercase">{s.empName}</p><p className="text-[10px] text-gray-400">ID: {s.empNum}</p></td>
                            <td className="p-4 text-right">
                              <span className="font-black text-[#035AE5] block">${s.total.toFixed(2)}</span>
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => handleDownloadImage(s)} className="p-2 bg-blue-50 text-[#035AE5] rounded-lg hover:bg-blue-100 transition-colors"><Download size={14}/></button>
                                <button onClick={() => { setSelectedOrderForTicket(s); setTimeout(() => window.print(), 500); }} className="p-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"><Printer size={14}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Buscar material..." className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-[#F3EDEC] text-black focus:outline-none focus:ring-2 focus:ring-[#035AE5] focus:bg-white transition-all font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-[#035AE5] text-white border-[#035AE5] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto hide-scrollbar pb-20 lg:pb-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(p => (
                      <div key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#035AE5] active:scale-[0.98] transition-all cursor-pointer relative flex flex-col">
                        <div className="w-full aspect-square rounded-xl bg-[#F3EDEC] mb-4 flex items-center justify-center overflow-hidden border border-gray-50 relative p-2">
                          {p.image ? <img src={p.image} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-200"><Package className="text-gray-400" size={32} /></div>}
                          {p.stock <= 5 && p.stock > 0 && <span className="absolute top-2 right-2 bg-[#FFCC00] text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Poco Stock</span>}
                        </div>
                        <h4 className="font-bold text-sm h-10 line-clamp-2 uppercase leading-tight mb-1">{p.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">{p.category}</p>
                        <div className="mt-auto flex justify-between items-center">
                          <p className="text-lg font-black text-[#035AE5]">${p.price.toFixed(2)}</p>
                          <div className="w-8 h-8 rounded-full bg-[#F89332] flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform"><Plus size={16} strokeWidth={3}/></div>
                        </div>
                        {p.stock <= 0 && <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-2xl flex items-center justify-center font-black text-white"><span className="bg-[#DB054B] px-3 py-1.5 rounded-lg text-xs uppercase shadow-md">Agotado</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral Carrito (Desktop) */}
          {appMode === 'employee' && (
            <aside className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.03)] z-20">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-lg text-black">Mi Pedido</h2>
                <span className="bg-[#F3EDEC] text-[#035AE5] px-2 py-1 rounded-md text-xs font-bold">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><ShoppingBag size={48} opacity={0.2} /><p className="font-bold text-sm">Tu bandeja está vacía</p></div>
                ) : cart.map(item => (
                  <div key={item.id} className="p-3 bg-[#F3EDEC] rounded-xl border border-transparent hover:border-gray-200 transition-colors flex flex-col gap-2">
                    <div className="flex justify-between font-bold text-sm"><span className="flex-1 line-clamp-2 uppercase pr-2 leading-tight">{item.name}</span><button onClick={() => setCart(cart.filter(c=>c.id!==item.id))} className="text-gray-400 hover:text-[#DB054B]"><Trash2 size={14}/></button></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1"><button onClick={() => updateQuantity(item.id, -1)} className="px-1 text-gray-500 hover:text-black"><Minus size={14}/></button><span className="font-bold text-sm w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="px-1 text-gray-500 hover:text-black"><Plus size={14}/></button></div><span className="font-black text-[#035AE5]">${(item.price * item.quantity).toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-gray-100 space-y-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between text-gray-500 text-sm font-bold"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-black text-2xl text-black"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button onClick={handleEmployeeSubmit} disabled={cart.length === 0} className="w-full py-4 bg-[#F89332] text-black font-bold rounded-xl shadow-md disabled:opacity-50 hover:brightness-95 active:scale-[0.98] transition-all uppercase tracking-widest">ENVIAR PEDIDO</button>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Navegación Móvil */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 h-20 flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {appMode === 'admin' ? (
          [
            { id:'dashboard', icon: <LayoutDashboard size={22}/>, label: 'Inicio' },
            { id:'orders', icon: <List size={22}/>, label: 'Pedidos', badge: pendingOrders.length },
            { id:'inventory', icon: <Package size={22}/>, label: 'Stock' },
            { id:'history', icon: <History size={22}/>, label: 'Historial' }
          ].map(item => (
            <button key={item.id} onClick={() => setAdminView(item.id)} className={`flex flex-col items-center gap-1 w-1/4 transition-colors relative ${adminView === item.id ? 'text-[#035AE5]' : 'text-gray-400'}`}>
              <div className={`p-1.5 rounded-lg ${adminView === item.id ? 'bg-blue-100' : ''}`}>{item.icon}</div>
              {item.badge > 0 && <span className="absolute top-0 right-4 w-2.5 h-2.5 bg-[#DB054B] rounded-full border-2 border-white"></span>}
              <span className="text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))
        ) : appMode === 'employee' ? (
          <div className="w-full px-6 flex justify-end">
            {cart.length > 0 && (
              <button onClick={() => setIsCartOpenMobile(true)} className="absolute -top-6 right-6 w-16 h-16 bg-[#F89332] text-black rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform border-4 border-white">
                <ShoppingBag size={24} />
                <span className="absolute -top-1 -right-1 bg-[#DB054B] text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              </button>
            )}
          </div>
        ) : null}
      </nav>

      {/* Modal Carrito Móvil */}
      {isCartOpenMobile && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex flex-col justify-end">
          <div className="bg-white h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="font-bold text-lg px-2">Tu Pedido</h2>
              <button onClick={() => setIsCartOpenMobile(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><ShoppingBag size={48} opacity={0.2} /><p className="font-bold text-sm">Tu bandeja está vacía</p></div>
                ) : cart.map(item => (
                  <div key={item.id} className="p-3 bg-[#F3EDEC] rounded-xl border border-transparent hover:border-gray-200 transition-colors flex flex-col gap-2">
                    <div className="flex justify-between font-bold text-sm"><span className="flex-1 line-clamp-2 uppercase pr-2 leading-tight">{item.name}</span><button onClick={() => setCart(cart.filter(c=>c.id!==item.id))} className="text-gray-400 hover:text-[#DB054B]"><Trash2 size={14}/></button></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1"><button onClick={() => updateQuantity(item.id, -1)} className="px-1 text-gray-500 hover:text-black"><Minus size={14}/></button><span className="font-bold text-sm w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="px-1 text-gray-500 hover:text-black"><Plus size={14}/></button></div><span className="font-black text-[#035AE5]">${(item.price * item.quantity).toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-gray-100 space-y-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between font-black text-2xl text-black"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button onClick={handleEmployeeSubmit} disabled={cart.length === 0} className="w-full py-4 bg-[#F89332] text-black font-bold rounded-xl shadow-md disabled:opacity-50 hover:brightness-95 active:scale-[0.98] transition-all uppercase tracking-widest">ENVIAR PEDIDO</button>
              </div>
          </div>
        </div>
      )}

      {/* Modal Éxito Empleado */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center border-b-[10px] border-green-500 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner"><CheckCircle size={40} /></div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">¡Solicitud Enviada!</h2>
            <p className="text-gray-500 font-bold mb-8 italic text-sm leading-relaxed px-2">Guarda tu comprobante digital. Te avisaremos cuando el material esté listo para entrega.</p>
            <div className="space-y-3">
              <button onClick={() => handleDownloadImage(selectedOrderForTicket)} className="w-full p-5 bg-[#035AE5] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] transition-all"><Download size={20} /> DESCARGAR COMPROBANTE</button>
              <button onClick={() => {setShowSuccessModal(false); setSelectedOrderForTicket(null);}} className="w-full p-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-black">Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin Inventario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-b-[10px] border-[#F89332] animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#F3EDEC]/30"><h2 className="text-xl font-black uppercase tracking-tighter">{editingProduct ? 'Modificar Registro' : 'Nuevo Material'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-black transition-colors"><X size={18}/></button></div>
            <form onSubmit={saveProduct} className="p-6 overflow-y-auto space-y-6 hide-scrollbar">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-[#F3EDEC] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">{imagePreview ? <img src={imagePreview} className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300" size={32} />}</div>
                <div className="flex-1 space-y-2">
                  <label className={`block w-full p-4 rounded-xl border-2 border-dashed text-center font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-white hover:border-[#035AE5] hover:text-[#035AE5]'}`}>{isUploading ? 'Subiendo...' : 'Cargar Foto de Cloudinary'}<input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading}/></label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código BIC</label><input name="code" defaultValue={editingProduct?.code} className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none font-bold uppercase focus:border-[#035AE5]" placeholder="EJ. BIC-01" /></div>
                <div className="col-span-2 space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Comercial</label><input name="name" defaultValue={editingProduct?.name} required className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none font-bold uppercase focus:border-[#035AE5]" placeholder="EJ. PLUMA AZUL" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unitario ($)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none font-bold text-lg focus:border-[#035AE5]" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Existencia Actual</label><input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none font-bold text-lg focus:border-[#035AE5]" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría del Insumo</label><select name="category" defaultValue={editingProduct?.category || 'Stationery'} className="w-full p-3.5 bg-white border border-gray-200 rounded-xl outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer focus:border-[#035AE5]">{CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <button type="submit" disabled={isUploading} className="w-full p-5 bg-[#F89332] text-black font-black rounded-xl shadow-lg mt-4 disabled:opacity-50 uppercase tracking-widest transition-all hover:brightness-95 active:scale-[0.98]">Guardar en Firestore</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
