// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, Package, History, Plus, Search, Trash2, 
  X, CheckCircle, LogOut, Edit2, ArrowLeft, Minus,
  User, Lock, ShoppingBag, List, Check,
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

// Tus credenciales de Firebase (Proyecto: pos-tienda-bic)
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

const CATEGORIES = ['Todos', 'Stationery', 'Lighter', 'Shaver', 'Brushes'];

// Estilos globales e impresión
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

const SidebarItem = ({ icon, label, id, badge, adminView, setAdminView }) => {
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

// Componente para el vale de entrega (se usa para generar la imagen de descarga e impresión)
const DeliveryNoteTemplate = ({ order }) => {
  if (!order) return null;
  return (
    <div id="printable-ticket" className="bg-white text-black p-10 flex flex-col border-[12px] border-double border-gray-100" style={{ width: '215.9mm', minHeight: '279.4mm' }}>
      <div className="flex justify-between items-start border-b-4 border-black pb-6">
        <LogoBIC size="large" />
        <div className="text-right">
          <h2 className="text-3xl font-black uppercase">{order.status === 'Aprobado' ? 'Vale de Entrega' : 'Comprobante de Solicitud'}</h2>
          <p className="font-bold text-gray-500 uppercase">Folio: <span className="text-black">#{order.id_vale}</span></p>
          <p className="text-sm font-bold text-gray-400 mt-1">{new Date(order.date).toLocaleString()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8 my-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Solicitante</p>
          <p className="text-xl font-bold uppercase">{order.empName}</p>
          <p className="font-bold text-gray-600 italic">ID: {order.empNum} • Turno: {order.empShift}</p>
        </div>
        <div className="text-right flex flex-col justify-end text-sm font-bold uppercase text-gray-400 italic">BIC SALTILLO • ALMACÉN DE INSUMOS</div>
      </div>
      <div className="flex-1">
        <table className="w-full text-left">
          <thead><tr className="border-b-2 border-black text-[10px] uppercase font-black text-gray-400"><th className="py-3 px-2">SKU / Barra</th><th className="py-3 px-2">Descripción</th><th className="py-3 px-2 text-center">Cant.</th><th className="py-3 px-2 text-right">Subtotal</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((it, i) => (
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
          <p className="text-4xl font-black text-[#035AE5]">${order.total.toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-10 text-center">
        <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400">Firma Recibido (Empleado)</div>
        <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400">Sello y Firma Almacén</div>
      </div>
      <div className="mt-auto pt-8 flex flex-col items-center">
        <OrderBarcode value={order.id_vale} />
        <p className="text-[8px] text-gray-300 font-bold mt-4 tracking-[0.3em]">CONTROL INTERNO BIC • GENERADO DESDE NUBE</p>
      </div>
    </div>
  );
};

const App = () => {
  // Navegación
  const [appMode, setAppMode] = useState('selection'); 
  const [adminView, setAdminView] = useState('dashboard'); 
  const [currentUser, setCurrentUser] = useState(null);
  
  // Datos
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // UI
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

  // Formularios
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', empNum: '', empName: '', empShift: 'Matutino' });
  const [loginError, setLoginError] = useState('');

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const resetUI = useCallback(() => {
    setLoginForm({ user: '', pass: '', empNum: '', empName: '', empShift: 'Matutino' });
    setLoginError('');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory('Todos');
    setIsCartOpenMobile(false);
  }, []);

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Error Auth:", error);
          setIsAuthReady(true); 
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ESCUCHA FIREBASE ---
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubInv = onSnapshot(collection(db, "inventory"), (snap) => {
      setProducts(snap.docs.map(d => d.data()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error Firestore:", error);
      setIsLoading(false);
      if (error.code === 'permission-denied') notify("Revisa las reglas de Firestore en la consola de Firebase.", "error");
    });

    const qHist = query(collection(db, "history"), orderBy("date", "desc"));
    const unsubHist = onSnapshot(qHist, (snap) => {
      setSales(snap.docs.map(d => d.data()));
    }, (error) => console.error("Error Historial:", error));

    return () => { unsubInv(); unsubHist(); };
  }, [isAuthReady, notify]);

  // --- HANDLERS ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginForm.user === 'admin' && loginForm.pass === 'admin123') {
      setCurrentUser({ name: 'Administrador', role: 'admin' });
      setAppMode('admin');
      setAdminView('dashboard');
      resetUI();
    } else setLoginError('Credenciales incorrectas para Administrador');
  };

  const handleEmployeeLogin = (e) => {
    e.preventDefault();
    if (loginForm.empNum && loginForm.empName) {
      setCurrentUser({ name: loginForm.empName, number: loginForm.empNum, shift: loginForm.empShift, role: 'employee' });
      setAppMode('employee');
      resetUI();
    } else setLoginError('Por favor, ingresa número de nómina y nombre');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('selection');
    resetUI();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    notify("Subiendo a Cloudinary...", "success");
    try {
      const cloudName = 'dvrluet68';
      const apiKey = '454519176479577';
      const apiSecret = 'O5Jui-cALz43axjlFOkAL4FJ4HU';
      const timestamp = Math.round(Date.now() / 1000);
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
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setImagePreview(data.secure_url);
        notify("Imagen optimizada y guardada");
      }
    } catch (error) { notify("Fallo al subir imagen", "error"); }
    finally { setIsUploading(false); }
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
      notify("Inventario sincronizado con Firebase");
    } catch (err) { notify("Error al guardar datos", "error"); }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    notify("Importando inventario...", "success");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 5) {
          imported.push({
            id: Date.now().toString() + i, 
            code: parts[0].trim(), name: parts[1].trim(),
            price: parseFloat(parts[2]) || 0, stock: parseInt(parts[3]) || 0,
            category: parts[4].trim(), image: ''
          });
        }
      }
      if (imported.length > 0) {
        const batch = writeBatch(db);
        imported.forEach(p => batch.set(doc(db, "inventory", p.id), p));
        await batch.commit();
        notify(`Se agregaron ${imported.length} artículos al sistema`);
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const csv = "codigo,nombre,precio,stock,categoria\nBIC-01,PLUMA AZUL CRISTAL,12.50,100,Stationery\n";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Inventario_BIC.csv';
    a.click();
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
      } else { capture(); }
    }, 500);
  };

  const downloadReport = () => {
    if (sales.length === 0) return notify("No hay historial para exportar", "error");
    let csv = "Folio,Fecha,Empleado,Turno,Total,Articulos\n";
    sales.forEach(sale => {
      const itemsStr = sale.items.map(i => `${i.quantity}x ${i.name}`).join(" + ");
      csv += `"${sale.id_vale}","${new Date(sale.date).toLocaleString()}","${sale.empName}","${sale.empShift}","$${sale.total}","${itemsStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_General_Tiendita_${Date.now()}.csv`;
    a.click();
  };

  const handleApproveOrder = async (order) => {
    try {
      notify("Procesando aprobación...", "success");
      await setDoc(doc(db, "history", order.id_vale), { ...order, status: 'Aprobado' });
      for (const item of order.items) {
        const pRef = doc(db, "inventory", item.id);
        const prod = products.find(p => p.id === item.id);
        if (prod) await updateDoc(pRef, { stock: Math.max(0, prod.stock - item.quantity) });
      }
      setPendingOrders(pendingOrders.filter(o => o.id_vale !== order.id_vale));
      notify("Pedido autorizado correctamente");
    } catch (e) { notify("Error en base de datos", "error"); }
  };

  const handleRejectOrder = (order) => {
    setPendingOrders(pendingOrders.filter(o => o.id_vale !== order.id_vale));
    notify(`Pedido #${order.id_vale} cancelado.`, "error");
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
    if (product?.stock <= 0) return notify("Material agotado", "error");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return notify("Existencias máximas", "error");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else { setCart([...cart, { ...product, quantity: 1 }]); }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const maxStock = product?.stock || 0;
        return { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, maxStock)) };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal * 1.16;

  const filteredProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Todos' || p.category === selectedCategory)
  ), [products, searchTerm, selectedCategory]);

  // ==========================================
  // RENDER: PANTALLAS DE ACCESO
  // ==========================================
  if (appMode === 'selection' || appMode.startsWith('login')) {
    return (
      <div className="flex h-screen bg-[#F3EDEC]">
        <style>{globalStyles}</style>
        {notification && <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-2xl border-l-4 ${notification.type === 'error' ? 'bg-white border-red-500' : 'bg-white border-green-500'} font-bold`}>{notification.message}</div>}
        <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 relative overflow-hidden bg-[#035AE5]">
          <div className="relative z-10 w-full max-w-xl">
            <img src="Banner.webp" alt="Banner Planta Saltillo" className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden bg-white/10 backdrop-blur-md p-12 rounded-3xl border border-white/20 text-center text-white">
              <h1 className="text-4xl font-bold mb-4 uppercase">Planta Saltillo</h1>
              <p className="text-lg opacity-80">Gestión Inteligente de Insumos</p>
            </div>
          </div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full mix-blend-overlay opacity-20 bg-[#F89332]"></div>
        </div>
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white z-20 relative">
          {appMode !== 'selection' && <button onClick={() => setAppMode('selection')} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-black flex items-center gap-2 font-bold text-sm transition-all"><ArrowLeft size={18} /> Volver</button>}
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-10"><LogoBIC size="large" /></div>
            {appMode === 'selection' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <button onClick={() => { setAppMode('login_employee'); resetUI(); }} className="w-full bg-white border-2 border-gray-200 p-5 rounded-3xl flex items-center gap-5 hover:border-[#035AE5] hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[#035AE5] bg-[#F3EDEC] group-hover:bg-[#035AE5] group-hover:text-white"><ShoppingBag size={28} /></div>
                  <div className="text-left"><h3 className="text-lg font-black text-black uppercase">Soy Empleado BIC</h3><p className="text-sm font-bold text-gray-500">Solicitar Insumos</p></div>
                </button>
                <button onClick={() => { setAppMode('login_admin'); resetUI(); }} className="w-full bg-[#F89332] p-5 rounded-3xl flex items-center gap-5 shadow-lg hover:brightness-105 transition-all group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-black/10 group-hover:bg-black/20"><ShieldCheck size={28} /></div>
                  <div className="text-left"><h3 className="text-lg font-black text-black uppercase">Administrador</h3><p className="text-sm font-bold text-black/60">Gestionar Planta</p></div>
                </button>
              </div>
            ) : (
              <form onSubmit={appMode === 'login_admin' ? handleAdminLogin : handleEmployeeLogin} className="space-y-4 animate-in slide-in-from-bottom-5 duration-300">
                <h2 className="text-2xl font-black text-black text-center mb-6 uppercase tracking-tighter">{appMode === 'login_admin' ? 'Identificación Admin' : 'Registro de Solicitante'}</h2>
                {loginError && <div className="bg-red-50 text-red-500 p-3 rounded-2xl text-center border border-red-100 font-bold text-sm italic animate-pulse">{loginError}</div>}
                <div className="space-y-4">
                  {appMode === 'login_admin' ? (
                    <>
                      <input type="text" placeholder="Usuario" className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-lg focus:ring-4 ring-orange-100 transition-all" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} />
                      <input type="password" placeholder="Contraseña" className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-lg focus:ring-4 ring-orange-100 transition-all" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
                    </>
                  ) : (
                    <>
                      <input type="text" placeholder="No. Nómina (Ej. 10452)" className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-lg focus:ring-4 ring-blue-100 transition-all uppercase" value={loginForm.empNum} onChange={e => setLoginForm({...loginForm, empNum: e.target.value})} />
                      <input type="text" placeholder="Nombre Completo" className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-lg focus:ring-4 ring-blue-100 transition-all uppercase" value={loginForm.empName} onChange={e => setLoginForm({...loginForm, empName: e.target.value})} />
                      <select className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-lg appearance-none cursor-pointer" value={loginForm.empShift} onChange={e => setLoginForm({...loginForm, empShift: e.target.value})}>
                        <option>Matutino</option><option>Vespertino</option><option>Nocturno</option>
                      </select>
                    </>
                  )}
                </div>
                <button type="submit" className={`w-full py-5 rounded-3xl font-black text-lg mt-6 shadow-2xl active:scale-95 transition-all uppercase tracking-widest ${appMode === 'login_admin' ? 'bg-[#F89332] text-black' : 'bg-[#035AE5] text-white'}`}>Acceder al Sistema</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F3EDEC]">
      <style>{globalStyles}</style>
      <div className="ticket-wrapper"><DeliveryNoteTemplate order={selectedOrderForTicket} /></div>
      
      {appMode === 'admin' && (
        <aside className="hidden md:flex w-72 bg-white border-r border-gray-100 flex-col z-30 shadow-xl">
          <div className="p-8 border-b border-gray-50"><LogoBIC size="normal" /></div>
          <nav className="flex-1 p-6 space-y-3">
            <SidebarItem id="dashboard" icon={<LayoutDashboard />} label="Dashboard" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="orders" icon={<List />} label="Solicitudes" badge={pendingOrders.length} adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="inventory" icon={<Package />} label="Almacén Insumos" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="history" icon={<History />} label="Historial Vales" adminView={adminView} setAdminView={setAdminView} />
          </nav>
          <div className="p-6 border-t border-gray-50">
            <button onClick={handleLogout} className="w-full p-4 text-[#DB054B] font-black uppercase text-xs flex items-center justify-center gap-3 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"><LogOut size={18}/> Cerrar Sesión</button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white border-b border-gray-100 px-6 flex items-center justify-between z-30 shadow-sm">
          <LogoBIC size="small" showText={appMode === 'employee'} />
          {appMode === 'employee' && (
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block"><p className="font-black text-sm uppercase">{currentUser.name}</p><p className="text-[9px] text-gray-400 font-black tracking-widest italic uppercase">Nómina: {currentUser.number} • {currentUser.shift}</p></div>
              <button onClick={handleLogout} className="p-3 bg-[#F3EDEC] rounded-2xl text-gray-500 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
            </div>
          )}
          {appMode === 'admin' && <div className="md:hidden"><button onClick={handleLogout} className="p-3 text-red-500"><LogOut/></button></div>}
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar">
          {isLoading ? <div className="h-full flex flex-col items-center justify-center space-y-4"><div className="w-12 h-12 border-4 border-[#035AE5] border-t-transparent rounded-full animate-spin"></div><p className="font-black text-xs uppercase text-gray-400 tracking-widest animate-pulse">Sincronizando con la nube...</p></div> :
          adminView === 'dashboard' && appMode === 'admin' ? (
            <div className="space-y-10">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Resumen Planta</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50"><TrendingUp className="text-[#035AE5] mb-4" size={32}/><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Movimiento Firebase</p><h3 className="text-4xl font-black">${sales.reduce((a,s)=>a+s.total,0).toFixed(2)}</h3></div>
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50"><Package className="text-[#F89332] mb-4" size={32}/><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Insumos Catalogados</p><h3 className="text-4xl font-black">{products.length}</h3></div>
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50"><History className="text-[#DB054B] mb-4" size={32}/><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Vales Autorizados</p><h3 className="text-4xl font-black">{sales.length}</h3></div>
              </div>
            </div>
          ) : adminView === 'inventory' && appMode === 'admin' ? (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4"><h2 className="text-3xl font-black uppercase tracking-tighter">Almacén de Insumos</h2>
                <div className="flex gap-2">
                  <button onClick={downloadCSVTemplate} className="p-3 border rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-gray-50 transition-all"><FileDown size={14}/> Plantilla</button>
                  <label className="p-3 border rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all"><FileUp size={14}/> Importar <input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload}/></label>
                  <button onClick={()=>{setEditingProduct(null); setImagePreview(null); setIsModalOpen(true)}} className="p-3 px-6 bg-[#F89332] rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><Plus size={14}/> Nuevo Ingreso</button>
                </div>
              </div>
              <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[9px] uppercase font-black text-gray-400 tracking-widest"><tr><th className="p-6">Material / SKU</th><th className="p-6 text-center">Existencia</th><th className="p-6">P. Unitario</th><th className="p-6 text-right">Acción</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 font-bold">
                    {products.map(p => (
                      <tr key={p.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                        <td className="p-6 flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shadow-inner shrink-0">{p.image && <img src={p.image} className="w-full h-full object-contain p-1" alt={p.name}/>}</div><div><p className="uppercase text-black">{p.name}</p><p className="text-[9px] text-gray-300 font-mono tracking-widest">{p.code}</p></div></td>
                        <td className="p-6 text-center"><span className={`p-2 px-4 rounded-xl text-[10px] font-black uppercase ${p.stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{p.stock} pzas</span></td>
                        <td className="p-6 text-[#035AE5] text-lg font-black">${p.price.toFixed(2)}</td>
                        <td className="p-6 text-right"><button onClick={()=>{setEditingProduct(p); setImagePreview(p.image); setIsModalOpen(true)}} className="p-3 bg-white border border-gray-100 text-gray-300 hover:text-[#035AE5] rounded-xl shadow-sm hover:scale-110 transition-all"><Edit2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminView === 'orders' && appMode === 'admin' ? (
            <div className="space-y-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Pedidos Pendientes</h2>
              {pendingOrders.map(order => (
                <div key={order.id_vale} className="bg-white rounded-[40px] border border-gray-100 p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 shadow-sm hover:shadow-xl transition-all">
                  <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Vale ID: #{order.id_vale}</p><h4 className="font-black text-2xl uppercase tracking-tighter">{order.empName}</h4><p className="text-xs font-bold text-gray-500 italic uppercase">{order.items.map(it => `${it.quantity}x ${it.name}`).join(' | ')}</p></div>
                  <div className="flex items-center gap-8">
                    <p className="text-3xl font-black text-[#035AE5] tracking-tighter">${order.total.toFixed(2)}</p>
                    <div className="flex gap-3">
                      <button onClick={()=>handleRejectOrder(order)} className="p-4 text-red-500 bg-red-50 rounded-3xl hover:bg-red-100 transition-colors shadow-sm"><X size={24}/></button>
                      <button onClick={()=>handleApproveOrder(order)} className="p-4 text-white bg-[#035AE5] rounded-3xl shadow-xl hover:scale-110 transition-all"><Check size={24}/></button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && <div className="text-center py-24 opacity-20"><List size={80} className="mx-auto"/><p className="font-black uppercase mt-6 tracking-[0.3em]">Cero pendientes</p></div>}
            </div>
          ) : adminView === 'history' && appMode === 'admin' ? (
             <div className="space-y-8">
                <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black uppercase tracking-tighter">Historial General</h2><button onClick={downloadReport} className="p-3 px-6 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"><Download size={14}/> Exportar CSV</button></div>
                {sales.map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-50 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                    <div><div className="flex items-center gap-3 mb-2"><span className="p-1 px-2 bg-gray-100 rounded-lg text-[9px] font-black uppercase tracking-widest">#{s.id_vale}</span><span className="text-[10px] text-gray-300 font-bold uppercase">{new Date(s.date).toLocaleString()}</span></div><h4 className="font-black text-xl uppercase text-black">{s.empName}</h4></div>
                    <div className="flex items-center gap-6"><p className="text-2xl font-black text-[#035AE5] tracking-tighter">${s.total.toFixed(2)}</p><button onClick={()=>handleDownloadImage(s)} className="p-4 bg-blue-50 text-[#035AE5] rounded-[24px] group-hover:scale-110 transition-all shadow-sm"><Printer size={24}/></button></div>
                  </div>
                ))}
             </div>
          ) : (
            <div className="h-full">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 mb-10 flex flex-col gap-6">
                <div className="relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={24}/><input type="text" placeholder="¿Qué insumo necesitas hoy?..." className="w-full pl-16 pr-6 py-5 bg-[#F3EDEC] rounded-[30px] font-black text-xl outline-none focus:ring-4 ring-blue-50 transition-all" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {CATEGORIES.map(cat => <button key={cat} onClick={()=>setSelectedCategory(cat)} className={`p-4 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${selectedCategory === cat ? 'bg-black text-white shadow-2xl scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>{cat}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-8 pb-32">
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={()=>addToCart(p)} className="bg-white p-5 rounded-[50px] border border-gray-50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative flex flex-col group overflow-hidden">
                    <div className="aspect-square bg-gray-50 rounded-[40px] mb-6 overflow-hidden flex items-center justify-center p-6 relative shadow-inner">
                      {p.image ? <img src={p.image} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" alt={p.name}/> : <Package className="opacity-10" size={60}/>}
                      {p.stock <= 5 && p.stock > 0 && <span className="absolute top-6 right-6 bg-[#FFCC00] text-black px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-lg border-2 border-white">Poco Stock</span>}
                      {p.stock <= 0 && <div className="absolute inset-0 bg-white/80 backdrop-blur-[3px] flex items-center justify-center font-black text-[#DB054B] uppercase tracking-[0.2em] text-sm border-4 border-red-50">Agotado</div>}
                    </div>
                    <h4 className="font-black text-xs h-10 line-clamp-2 uppercase leading-tight mb-4 tracking-tighter px-2">{p.name}</h4>
                    <div className="mt-auto flex justify-between items-center px-2"><p className="text-2xl font-black text-[#035AE5] tracking-tighter leading-none">${p.price.toFixed(2)}</p><div className="p-3 bg-[#F89332] rounded-full text-white shadow-xl group-hover:rotate-90 transition-transform"><Plus size={18} strokeWidth={3}/></div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral Carrito Cliente (Desktop) */}
        {appMode === 'employee' && (
          <aside className="hidden lg:flex w-[420px] bg-white border-l border-gray-100 flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.02)] z-20">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-[#F3EDEC]/50"><h3 className="font-black text-2xl flex items-center gap-3 tracking-tighter uppercase"><ShoppingBag size={28}/> Mi Bandeja</h3><span className="bg-[#035AE5] text-white px-4 py-2 rounded-full text-[10px] font-black shadow-lg uppercase">{cart.length} Insumos</span></div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 hide-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="p-6 bg-white rounded-[35px] border border-gray-50 flex flex-col gap-4 shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex justify-between font-black text-xs uppercase pr-6 leading-relaxed"><span>{item.name}</span><button onClick={()=>setCart(cart.filter(c=>c.id!==item.id))} className="text-gray-200 hover:text-[#DB054B] transition-colors"><Trash2 size={18}/></button></div>
                  <div className="flex justify-between items-center"><span className="font-black text-2xl text-[#035AE5] tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span><div className="flex items-center gap-6 bg-[#F3EDEC] p-2 rounded-2xl border border-gray-100"><button onClick={()=>updateQuantity(item.id,-1)} className="text-gray-400 hover:text-black transition-colors"><Minus size={16}/></button><span className="font-black text-xl w-6 text-center">{item.quantity}</span><button onClick={()=>updateQuantity(item.id,1)} className="text-gray-400 hover:text-black transition-colors"><Plus size={16}/></button></div></div>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center py-24 opacity-10 italic"><ShoppingCart size={60} className="mx-auto"/><p className="font-black uppercase mt-6 text-xs tracking-[0.5em]">Bandeja Vacía</p></div>}
            </div>
            <div className="p-10 border-t border-gray-100 space-y-8 shadow-inner">
              <div className="flex justify-between items-end"><p className="text-[11px] text-gray-300 font-black uppercase tracking-[0.3em]">Total (Inc. IVA)</p><h3 className="text-5xl font-black text-[#035AE5] tracking-tighter leading-none">${total.toFixed(2)}</h3></div>
              <button onClick={handleEmployeeSubmit} disabled={cart.length === 0} className="w-full p-6 bg-[#F89332] text-black font-black rounded-[30px] shadow-2xl disabled:opacity-30 uppercase tracking-[0.2em] text-lg transition-all hover:brightness-105 active:scale-95">ENVIAR PEDIDO</button>
            </div>
          </aside>
        )}
      </main>

      {/* Navegación y Modales Móviles */}
      {isCartOpenMobile && <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end backdrop-blur-sm"><div className="bg-white h-[85vh] rounded-t-[50px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300"><div className="p-6 border-b flex justify-between items-center"><h2 className="font-black text-xl px-4 tracking-tighter uppercase">TU PEDIDO</h2><button onClick={()=>setIsCartOpenMobile(false)} className="p-3 bg-gray-100 rounded-full"><X size={20}/></button></div><div className="flex-1 overflow-y-auto hide-scrollbar"><div className="p-8 space-y-4">{cart.map(item => (<div key={item.id} className="p-5 bg-gray-50 rounded-[35px] flex flex-col gap-3"><div className="flex justify-between font-black text-xs uppercase pr-4"><span>{item.name}</span><button onClick={()=>setCart(cart.filter(c=>c.id!==item.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div><div className="flex justify-between items-center"><span className="font-black text-2xl text-[#035AE5] tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span><div className="flex items-center gap-6 bg-white p-2 rounded-2xl border"><button onClick={()=>updateQuantity(item.id,-1)} className="text-gray-400"><Minus size={16}/></button><span className="font-black text-lg w-6 text-center">{item.quantity}</span><button onClick={()=>updateQuantity(item.id,1)} className="text-gray-400"><Plus size={16}/></button></div></div></div>))}</div></div><div className="p-10 border-t border-gray-100 space-y-6 shadow-inner"><div className="flex justify-between items-end"><p className="text-xs text-gray-400 font-black uppercase tracking-widest">Total Estimado</p><h3 className="text-4xl font-black text-[#035AE5] tracking-tighter leading-none">${total.toFixed(2)}</h3></div><button onClick={handleEmployeeSubmit} disabled={cart.length === 0} className="w-full p-6 bg-[#F89332] text-black font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em]">ENVIAR PEDIDO</button></div></div></div>}
      
      {showSuccessModal && <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white p-12 rounded-[60px] shadow-2xl max-w-md w-full text-center border-b-[20px] border-green-500 animate-in zoom-in-95 duration-200"><div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-8 mx-auto shadow-inner animate-bounce"><CheckCircle size={48} /></div><h2 className="text-3xl font-black uppercase tracking-tighter mb-4">¡Solicitud Enviada!</h2><p className="text-gray-500 font-bold mb-10 italic text-sm leading-relaxed px-2 uppercase tracking-wide">Descarga tu vale y preséntalo en almacén cuando te avisemos que está listo.</p><div className="space-y-4"><button onClick={()=>handleDownloadImage(selectedOrderForTicket)} className="w-full p-6 bg-[#035AE5] text-white rounded-[30px] font-black text-sm flex items-center justify-center gap-4 shadow-xl shadow-blue-500/30 hover:scale-105 transition-all uppercase tracking-widest"><Download size={22} /> Descargar Vale</button><button onClick={()=>{setShowSuccessModal(false); setSelectedOrderForTicket(null);}} className="w-full p-4 text-gray-300 font-black uppercase text-[10px] tracking-[0.4em] hover:text-black">Cerrar Ventana</button></div></div></div>}
      
      {isModalOpen && <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white w-full max-w-xl rounded-[60px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-b-[15px] border-[#F89332] animate-in slide-in-from-bottom-10 duration-300"><div className="flex justify-between items-center p-10 border-b border-gray-50 bg-[#F3EDEC]/40"><h2 className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? 'Modificar Registro' : 'Alta de Material'}</h2><button onClick={()=>setIsModalOpen(false)} className="p-3 bg-white rounded-full text-gray-300 hover:text-black shadow-sm transition-colors"><X size={20}/></button></div><form onSubmit={saveProduct} className="p-10 overflow-y-auto space-y-8 hide-scrollbar">
        <div className="flex items-center gap-8"><div className="w-32 h-32 rounded-[40px] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">{imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300" size={40} />}</div><div className="flex-1 space-y-4"><label className={`block w-full p-5 rounded-2xl border-2 border-dashed text-center font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'bg-gray-100 animate-pulse' : 'bg-white hover:border-[#035AE5] hover:text-[#035AE5]'}`}>{isUploading ? 'Subiendo a Cloudinary...' : 'Cargar Foto Insumo'}<input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading}/></label><p className="text-[9px] text-gray-300 font-black uppercase text-center tracking-widest">Formatos: JPG, PNG, WEBP</p></div></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código BIC</label><input name="code" defaultValue={editingProduct?.code} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black uppercase tracking-widest text-sm" placeholder="EJ. BIC-01"/></div>
          <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Comercial</label><input name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black uppercase text-sm" placeholder="EJ. PLUMA AZUL CRISTAL"/></div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unitario ($)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-xl" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Existencia Planta</label><input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black text-xl" /></div>
        </div>
        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría del Insumo</label><select name="category" defaultValue={editingProduct?.category || 'Stationery'} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-black uppercase tracking-widest appearance-none cursor-pointer">{CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <button type="submit" disabled={isUploading} className="w-full p-6 bg-[#F89332] text-black font-black rounded-[30px] shadow-2xl mt-4 disabled:opacity-50 uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">Sincronizar Material</button>
      </form></div></div>}
      
      {appMode === 'employee' && cart.length > 0 && <button onClick={()=>setIsCartOpenMobile(true)} className="lg:hidden fixed bottom-10 right-6 w-20 h-20 bg-[#F89332] text-black rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white animate-bounce"><ShoppingBag size={28}/><span className="absolute --top-1 -right-1 bg-[#DB054B] text-white text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white">{cart.reduce((a, b) => a + b.quantity, 0)}</span></button>}
    </div>
  );
};

export default App;
