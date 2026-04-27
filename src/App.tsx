// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, Package, History, Plus, Search, Trash2, 
  Save, X, CheckCircle, LogOut, Edit2, ArrowLeft, Minus,
  User, Lock, Store, ShoppingBag, List, Check, XCircle,
  Download, Upload, ImageIcon, LayoutDashboard, TrendingUp,
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

// --- Paleta de Colores ---
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

// Estilos globales e impresión
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
  * { font-family: 'Avenir Next LT Pro', Arial, sans-serif; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .ticket-wrapper { position: absolute; top: 0; left: 0; z-index: -100; pointer-events: none; }
  
  @media print {
    @page { size: letter; margin: 0; }
    * { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      color-adjust: exact !important; 
    }
    body * { visibility: hidden; }
    .ticket-wrapper, .ticket-wrapper * { visibility: visible; }
    .ticket-wrapper { position: absolute; left: 0; top: 0; z-index: 9999; width: 215.9mm; }
    .no-print { display: none !important; }
  }
`;

// --- Componentes de Apoyo ---
const ProductBarcode = ({ value, width = 1.2 }) => {
  if (!value) return <span className="text-xs text-gray-300">N/A</span>;
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-end gap-[1px] h-[25px]">
        {String(value).split('').concat(['X', 'Y']).map((char, i) => {
          const weight = (char.charCodeAt(0) % 3) + 1;
          return <div key={i} className="bg-black" style={{ width: `${weight * width}px`, height: '100%' }}></div>;
        })}
      </div>
      <span className="text-[7px] font-mono font-bold mt-0.5">{value}</span>
    </div>
  );
};

const OrderBarcode = ({ value }) => (
  <div className="flex flex-col items-center mt-4">
    <div className="flex h-10 items-end gap-[1.5px]">
      {String(value).split('').concat(Array(10).fill('X')).map((char, i) => {
        const weight = (char.charCodeAt(0) % 3) + 1;
        return <div key={i} className="bg-black h-full" style={{ width: `${weight}px` }}></div>;
      })}
    </div>
    <span className="text-[10px] font-mono font-bold tracking-[0.3em] mt-1 uppercase">{value}</span>
  </div>
);

const LogoBIC = ({ size = "normal", showText = true }) => (
  <div className="flex items-center gap-3 z-20">
    <img 
      src="Logo.webp" 
      alt="Logo BIC" 
      className={`${size === 'large' ? 'h-24' : 'h-10'} object-contain drop-shadow-sm`}
      onError={(e) => {
        e.target.onerror = null; 
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    <div className="hidden relative items-center justify-center">
      <div className={`bg-[#F89332] ${size === 'large' ? 'w-24 h-16' : 'w-12 h-8'} rounded-[50%] flex items-center justify-center border-2 border-black rotate-[-5deg]`}>
        <span className={`text-black font-black italic tracking-tighter transform scale-x-125 ${size === 'large' ? 'text-3xl' : 'text-sm'}`}>BIC</span>
      </div>
    </div>
    {showText && (
      <div>
        <h1 className={`font-bold text-black ${size === 'large' ? 'text-4xl' : 'text-lg'}`}>Tiendita BIC</h1>
      </div>
    )}
  </div>
);

const SidebarItem = ({ icon, label, id, badge, adminView, setAdminView }) => {
  const isActive = adminView === id;
  return (
    <button 
      onClick={() => setAdminView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
        isActive 
          ? 'bg-blue-100 text-[#035AE5]' 
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

// Componente para el vale de entrega
const DeliveryNoteTemplate = ({ order }) => {
  if (!order) return null;
  return (
    <div id="printable-ticket" className="bg-white text-black p-10 flex flex-col border-[12px] border-double border-gray-100" style={{ width: '215.9mm', minHeight: '279.4mm' }}>
      <div className="flex justify-between items-start border-b-4 border-black pb-6">
        <LogoBIC size="large" />
        <div className="text-right">
          <h2 className="text-3xl font-black uppercase tracking-tighter">{order.status === 'Aprobado' ? 'Vale de Entrega' : 'Comprobante de Solicitud'}</h2>
          <p className="font-bold text-gray-500 uppercase tracking-tighter">Folio: <span className="text-black">#{order.id_vale}</span></p>
          <p className="text-sm font-bold text-gray-400 mt-1">{new Date(order.date).toLocaleString()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8 my-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Información Solicitante</p>
          <p className="text-xl font-bold uppercase">{order.empName}</p>
          <p className="font-bold text-gray-600">Turno: {order.empShift}</p>
        </div>
        <div className="text-right flex flex-col justify-end">
          <p className="font-bold">BIC PLANTA SALTILLO</p>
          <p className="text-sm text-gray-400 font-bold uppercase">Almacén de Insumos</p>
        </div>
      </div>
      <div className="flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-[10px] uppercase font-black text-gray-400">
              <th className="py-3 px-2">Código Barra</th>
              <th className="py-3 px-2">Descripción del Artículo</th>
              <th className="py-3 px-2 text-center">Cant.</th>
              <th className="py-3 px-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((it, i) => (
              <tr key={i} className="text-sm font-bold">
                <td className="py-3 px-2"><ProductBarcode value={it.code || 'N/A'} /></td>
                <td className="py-3 px-2 uppercase">{it.name}</td>
                <td className="py-3 px-2 text-center font-black text-lg">{it.quantity}</td>
                <td className="py-3 px-2 text-right font-black text-black">${(it.price * it.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 border-t-2 border-black pt-6 flex justify-end gap-12">
        <div className="text-right space-y-1">
          <p className="text-gray-400 text-[10px] font-black uppercase">Importe Total:</p>
          <p className="text-3xl font-black text-[#035AE5]">${order.total ? order.total.toFixed(2) : "0.00"}</p>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-10 text-center">
        <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400 tracking-widest">Firma Empleado</div>
        <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400 tracking-widest">{order.status === 'Aprobado' ? 'Autorización Almacén' : 'Estado: Pendiente'}</div>
      </div>
      <div className="mt-auto pt-8 flex flex-col items-center">
        <OrderBarcode value={order.id_vale} />
        <p className="text-[8px] text-gray-300 font-bold mt-4 uppercase tracking-[0.3em]">Documento de Control Interno • BIC Saltillo</p>
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
    setTimeout(() => setNotification(null), 3000);
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

  // --- HANDLERS ACCESO ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginForm.user === 'admin' && loginForm.pass === 'admin123') {
      setCurrentUser({ name: 'Administrador', role: 'admin' });
      setAppMode('admin');
      setAdminView('dashboard');
      resetUI();
    } else setLoginError('Usuario o contraseña incorrectos');
  };

  const handleEmployeeLogin = (e) => {
    e.preventDefault();
    if (loginForm.empNum && loginForm.empName) {
      setCurrentUser({ name: loginForm.empName, number: loginForm.empNum, shift: loginForm.empShift, role: 'employee' });
      setAppMode('employee');
      resetUI();
    } else setLoginError('Todos los campos son obligatorios');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('selection');
    resetUI();
  };

  // --- INTEGRACIÓN CLOUDINARY ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file); 

    setIsUploading(true);
    notify("Subiendo imagen a la nube...", "success");
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
        notify("Imagen optimizada y guardada", "success");
      } else {
        notify("Error procesando imagen", "error");
      }
    } catch (error) { 
      notify("Error en la conexión a la nube", "error"); 
    }
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
      notify("Se guardó el artículo en Firebase");
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
        notify(`Se importaron ${imported.length} productos a Firebase.`);
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const csv = "codigo,nombre,precio,stock,categoria\nBIC-EX01,Articulo de Ejemplo,15.50,100,Stationery\n";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Carga_Masiva.csv';
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
    if (sales.length === 0) return notify("No hay ventas para exportar", "error");
    let csv = "ID Venta,Fecha,Empleado,Turno,Total,Articulos\n";
    sales.forEach(sale => {
      const itemsStr = sale.items.map(i => `${i.quantity}x ${i.name}`).join(" + ");
      csv += `"${sale.id_vale}","${new Date(sale.date).toLocaleString()}","${sale.empName}","${sale.empShift}","$${sale.total}","${itemsStr}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_TienditaBIC_${Date.now()}.csv`;
    a.click();
    notify("Descargando reporte...");
  };

  const handleApproveOrder = async (order) => {
    try {
      // 1. Guardar en Historial Firebase
      await setDoc(doc(db, "history", order.id_vale), { ...order, status: 'Aprobado' });

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
      notify("Pedido autorizado y guardado en Firebase.", "success");
    } catch (e) { 
      console.error(e);
      notify("Error conectando a Firebase.", "error"); 
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
    if (product?.stock <= 0) return notify("Producto agotado", "error");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return notify("Límite de stock alcanzado", "error");
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
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const filteredProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Todos' || p.category === selectedCategory)
  ), [products, searchTerm, selectedCategory]);


  // ==========================================
  // RENDER: PANTALLAS DE ACCESO (SELECCIÓN / LOGIN)
  // ==========================================
  if (appMode === 'selection' || appMode.startsWith('login')) {
    return (
      <div className="flex h-screen bg-[#F3EDEC]">
        <style>{globalStyles}</style>
        
        {/* TOAST NOTIFICATIONS */}
        {notification && (
          <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-5 ${notification.type === 'error' ? 'bg-white border-l-4 border-l-[#DB054B]' : 'bg-white border-l-4 border-l-[#64BF69]'}`}>
            {notification.type === 'error' ? <XCircle color={COLORS.flameRed} size={20} /> : <CheckCircle color={COLORS.accentGreen} size={20} />}
            <span className="font-bold text-sm text-black">{notification.message}</span>
          </div>
        )}
        
        {/* Lado Izquierdo - Banner Limpio Clásico */}
        <div className="hidden lg:block lg:w-1/2 h-full relative bg-white border-r border-gray-200">
          <img 
            src="Banner.webp" 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Lado Derecho - Formulario de Interacción */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          
          {appMode !== 'selection' && (
            <button onClick={() => { setAppMode('selection'); resetUI(); }} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold text-sm">
              <ArrowLeft size={18} /> Volver
            </button>
          )}

          <div className="bg-white p-10 lg:p-12 rounded-[40px] lg:rounded-[50px] shadow-2xl w-full max-w-md text-center border-b-[15px] border-[#F89332]">
            <div className="flex justify-center mb-8"><LogoBIC size="large" /></div>
            
            {/* PANTALLA 1: SELECCIÓN DE PERFIL */}
            {appMode === 'selection' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-xl font-black mb-8 uppercase tracking-tighter text-gray-400 italic">Portal Tiendita BIC</h2>
                <button 
                  onClick={() => { setAppMode('login_employee'); resetUI(); }}
                  className="w-full p-6 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all"
                >
                  Empleado BIC <ArrowLeft className="rotate-180" />
                </button>
                <button 
                  onClick={() => { setAppMode('login_admin'); resetUI(); }}
                  className="w-full p-6 bg-[#F89332] text-black rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all"
                >
                  Administrador <ShieldCheck />
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

  // ==========================================
  // RENDER: APLICACIÓN PRINCIPAL
  // ==========================================
  return (
    <div className="flex h-screen bg-[#F3EDEC]">
      <style>{globalStyles}</style>
      
      {/* TOAST NOTIFICATIONS */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-5 ${notification.type === 'error' ? 'bg-white border-l-4 border-l-[#DB054B]' : 'bg-white border-l-4 border-l-[#64BF69]'}`}>
          {notification.type === 'error' ? <XCircle color={COLORS.flameRed} size={20} /> : <CheckCircle color={COLORS.accentGreen} size={20} />}
          <span className="font-bold text-sm text-black">{notification.message}</span>
        </div>
      )}

      <div className="ticket-wrapper"><DeliveryNoteTemplate order={selectedOrderForTicket} /></div>
      
      {/* BARRA LATERAL ADMINISTRADOR */}
      {appMode === 'admin' && (
        <aside className="hidden md:flex w-20 lg:w-64 bg-white border-r border-gray-200 flex-col z-30 shadow-[5px_0_20px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100 shrink-0">
            <div className="lg:hidden"><LogoBIC size="small" showText={false} /></div>
            <div className="hidden lg:block"><LogoBIC size="small" /></div>
          </div>
          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto hide-scrollbar">
            <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-2 mt-2">Gestión Integral</p>
            <SidebarItem id="dashboard" icon={<LayoutDashboard size={20}/>} label="Resumen" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="orders" icon={<List size={20}/>} label="Pedidos" badge={pendingOrders.length} adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="inventory" icon={<Package size={20}/>} label="Inventario" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="history" icon={<History size={20}/>} label="Historial" adminView={adminView} setAdminView={setAdminView} />
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
        
        {/* CABECERA (ADMIN MOBILE / EMPLEADO) */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 z-30">
          <LogoBIC size="small" showText={appMode === 'employee'} />
          {appMode === 'employee' ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-sm text-black">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No. {currentUser.number} • {currentUser.shift}</p>
              </div>
              <button onClick={handleLogout} className="text-sm font-bold text-[#DB054B] hover:bg-[#DB054B]/10 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg transition-colors">
                <span className="hidden sm:block">Salir</span> <LogOut size={16}/>
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="md:hidden w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold"><LogOut size={14}/></button>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar">
            
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#035AE5] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : adminView === 'dashboard' && appMode === 'admin' ? (
              
              /* VISTA ADMIN: DASHBOARD */
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-6">Resumen del Día</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-100 text-[#035AE5]"><TrendingUp size={24} /></div>
                      <span className="text-xs font-bold text-[#64BF69] bg-[#64BF69]/10 px-2 py-1 rounded-md">+12% hoy</span>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Ventas Aprobadas</p>
                    <h3 className="text-3xl font-black text-black mt-1">${sales.reduce((acc, s) => acc + s.total, 0).toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-orange-100 text-[#F89332]"><Package size={24} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Artículos en Stock</p>
                    <h3 className="text-3xl font-black text-black mt-1">{products.reduce((acc, p) => acc + p.stock, 0)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-red-100 text-[#DB054B]"><List size={24} /></div>
                      {pendingOrders.length > 0 && <span className="flex w-3 h-3 bg-[#DB054B] rounded-full animate-pulse"></span>}
                    </div>
                    <p className="text-sm font-bold text-gray-400">Pedidos Pendientes</p>
                    <h3 className="text-3xl font-black text-black mt-1">{pendingOrders.length}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6">
                  <h3 className="font-bold text-black mb-4">Últimas Aprobaciones</h3>
                  {sales.length === 0 ? (
                    <p className="text-sm text-gray-400 font-bold">No hay actividad reciente.</p>
                  ) : (
                    <div className="space-y-4">
                      {sales.slice(0,4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F3EDEC] flex items-center justify-center text-black"><Check size={16} /></div>
                            <div>
                              <p className="text-sm font-bold text-black">Pedido de {s.empName}</p>
                              <p className="text-xs text-gray-400 font-bold">No. {s.empNum} • {s.empShift}</p>
                            </div>
                          </div>
                          <span className="font-bold text-[#035AE5]">${s.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : adminView === 'inventory' && appMode === 'admin' ? (
              
              /* VISTA ADMIN: INVENTARIO */
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-black">Inventario</h2>
                  <div className="flex gap-2">
                    <button onClick={downloadCSVTemplate} className="hidden lg:flex text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm items-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                      <FileDown size={18} /> Plantilla
                    </button>
                    <label className="text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all cursor-pointer">
                      <FileUp size={18} /> Importar
                      <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                    </label>
                    <button onClick={() => { setEditingProduct(null); setImagePreview(null); setIsModalOpen(true); }} className="text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:brightness-95 transition-all bg-[#F89332]">
                      <Plus size={18} strokeWidth={3} /> Nuevo Producto
                    </button>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold border-b border-gray-200 hidden lg:table-cell">Código</th>
                        <th className="p-4 font-bold border-b border-gray-200">Producto</th>
                        <th className="p-4 font-bold border-b border-gray-200 hidden sm:table-cell">Categoría</th>
                        <th className="p-4 font-bold border-b border-gray-200">Precio</th>
                        <th className="p-4 font-bold border-b border-gray-200 text-center">Stock</th>
                        <th className="p-4 font-bold border-b border-gray-200 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 hidden lg:table-cell font-bold text-gray-400 text-xs">{p.code || '-'}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#F3EDEC] border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <Package size={16} className="text-gray-400"/>}
                              </div>
                              <span className="font-bold text-sm text-black">{p.name}</span>
                            </div>
                          </td>
                          <td className="p-4 hidden sm:table-cell"><span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{p.category}</span></td>
                          <td className="p-4 font-bold text-[#035AE5]">${p.price.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.stock <= 5 ? 'bg-red-100 text-[#DB054B]' : 'bg-green-100 text-[#64BF69]'}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => {setEditingProduct(p); setImagePreview(p.image || null); setIsModalOpen(true);}} className="p-2 text-gray-400 hover:text-[#035AE5] bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"><Edit2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : adminView === 'orders' && appMode === 'admin' ? (

              /* VISTA ADMIN: PEDIDOS */
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-8 flex items-center gap-3">
                  Pedidos Recibidos 
                  {pendingOrders.length > 0 && <span className="bg-[#DB054B] text-white text-sm px-3 py-1 rounded-full">{pendingOrders.length}</span>}
                </h2>
                
                {pendingOrders.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-[#F3EDEC] p-4 rounded-full text-gray-400 mb-4"><List size={32} /></div>
                    <p className="font-bold text-black text-lg">No hay pedidos pendientes</p>
                    <p className="text-sm font-bold text-gray-400 mt-1">Los pedidos de los Empleados aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {pendingOrders.map(order => (
                      <div key={order.id_vale} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#F3EDEC]">
                          <div>
                            <span className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded tracking-widest uppercase">Orden #{order.id_vale}</span>
                            <h3 className="font-bold text-black mt-2">De: {order.empName}</h3>
                            <p className="text-xs font-bold text-gray-500 mt-0.5">ID: {order.empNum} • {order.empShift}</p>
                          </div>
                          <span className="text-2xl font-bold text-black">${order.total.toFixed(2)}</span>
                        </div>
                        <div className="p-5 flex-1">
                           <ul className="space-y-3 mb-6">
                            {order.items.map((it, i) => (
                              <li key={i} className="flex justify-between items-center text-sm font-bold">
                                <span className="text-gray-600"><span className="text-black bg-gray-100 px-1.5 py-0.5 rounded mr-2">{it.quantity}x</span> {it.name}</span>
                                <span className="text-black">${(it.price * it.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                           </ul>
                           <div className="flex gap-3 mt-auto">
                             <button onClick={() => handleRejectOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-[#DB054B] bg-white border-2 border-[#DB054B] hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                               <X size={18} /> Rechazar
                             </button>
                             <button onClick={() => handleApproveOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#035AE5] shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2">
                               <Check size={18} /> Aprobar Pedido
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : adminView === 'history' && appMode === 'admin' ? (
              
              /* VISTA ADMIN: HISTORIAL */
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-black">Historial Aprobado</h2>
                  <button onClick={downloadReport} className="bg-white border border-gray-200 text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all">
                    <Download size={18} /> Exportar CSV
                  </button>
                </div>
                
                {sales.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-[#F3EDEC] p-4 rounded-full text-gray-400 mb-4"><History size={32} /></div>
                    <p className="font-bold text-black text-lg">Aún no hay aprobaciones</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider">
                          <th className="p-4 font-bold border-b border-gray-200">Folio</th>
                          <th className="p-4 font-bold border-b border-gray-200">Fecha</th>
                          <th className="p-4 font-bold border-b border-gray-200">Empleado BIC</th>
                          <th className="p-4 font-bold border-b border-gray-200 text-right">Total / Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sales.map(sale => (
                          <tr key={sale.id_vale} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-bold text-black">#{sale.id_vale}</td>
                            <td className="p-4 text-sm font-bold text-gray-500">{new Date(sale.date).toLocaleString()}</td>
                            <td className="p-4">
                              <p className="font-bold text-sm text-black">{sale.empName}</p>
                              <p className="text-[10px] font-bold text-gray-400">ID: {sale.empNum}</p>
                            </td>
                            <td className="p-4 text-right">
                               <span className="font-bold text-[#035AE5] block">${sale.total.toFixed(2)}</span>
                               <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => handleDownloadImage(sale)} className="p-2 bg-blue-50 text-[#035AE5] rounded-lg hover:bg-blue-100 transition-colors" title="Descargar Imagen"><Download size={14}/></button>
                                  <button onClick={() => { setSelectedOrderForTicket(sale); setTimeout(() => window.print(), 500); }} className="p-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors" title="Imprimir"><Printer size={14}/></button>
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

              /* VISTA EMPLEADO: CATÁLOGO DE PRODUCTOS */
              <div className="h-full flex flex-col">
                <div className="p-6 bg-white border border-gray-100 rounded-2xl flex flex-col gap-4 shadow-sm mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" placeholder="Buscar productos por nombre..."
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-[#F3EDEC] text-black focus:outline-none focus:ring-2 focus:ring-[#035AE5] focus:bg-white transition-all font-bold text-sm"
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat} onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
                          selectedCategory === cat 
                            ? 'bg-[#035AE5] text-white border-[#035AE5] shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto hide-scrollbar pb-20 lg:pb-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                      <div 
                        key={product.id} onClick={() => addToCart(product)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#035AE5] active:scale-[0.98] transition-all flex flex-col relative cursor-pointer"
                      >
                        <div className="w-full aspect-square rounded-xl bg-[#F3EDEC] mb-4 flex items-center justify-center overflow-hidden border border-gray-50 relative p-2">
                            {product.image ? (
                              <img src={product.image} className="w-full h-full object-contain" alt={product.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-200">
                                <Package className="text-gray-400 opacity-50" size={32} />
                              </div>
                            )}
                            {product.stock <= 5 && product.stock > 0 && (
                               <span className="absolute top-2 right-2 bg-[#FFCC00] text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Poco Stock</span>
                            )}
                        </div>
                        <h3 className="font-bold text-sm text-black line-clamp-2 leading-tight h-10 mb-1">{product.name}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">{product.category}</p>
                        <div className="mt-auto flex justify-between items-center">
                          <p className="text-lg font-bold text-[#035AE5]">${product.price.toFixed(2)}</p>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform bg-[#F89332]">
                            <Plus size={16} strokeWidth={3} />
                          </div>
                        </div>
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
                            <span className="bg-[#DB054B] text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">Agotado</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PANEL LATERAL: CARRITO CLIENTE (DESKTOP) */}
          {appMode === 'employee' && (
            <aside className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.03)] z-20">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-lg text-black">Mi Pedido</h2>
                <span className="bg-[#F3EDEC] text-[#035AE5] px-2 py-1 rounded-md text-xs font-bold">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                    <ShoppingBag size={48} opacity={0.2} />
                    <p className="font-bold text-sm">Tu bandeja está vacía</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex flex-col gap-2 p-3 bg-[#F3EDEC] rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-black leading-tight pr-2">{item.name}</h4>
                        <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-400 hover:text-[#DB054B]"><Trash2 size={14} /></button>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="px-1 text-gray-500 hover:text-black"><Minus size={14} /></button>
                          <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="px-1 text-gray-500 hover:text-black"><Plus size={14} /></button>
                        </div>
                        <span className="font-bold text-[#035AE5]">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-5 bg-white border-t border-gray-100 space-y-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between text-gray-500 text-sm font-bold"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-2xl text-black"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <button 
                  onClick={handleEmployeeSubmit} disabled={cart.length === 0}
                  className="w-full py-4 rounded-xl font-bold text-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.98] bg-[#F89332]"
                >
                  ENVIAR PEDIDO
                </button>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* NAVEGACIÓN INFERIOR (MÓVIL ADMIN) */}
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

      {/* MODAL CARRITO MÓVIL */}
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

      {/* MODAL ÉXITO EMPLEADO */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 text-[#64BF69] rounded-full flex items-center justify-center mb-6 mx-auto font-black"><CheckCircle size={40} /></div>
            <h2 className="text-2xl font-black uppercase mb-2">¡PEDIDO ENVIADO!</h2>
            <p className="text-gray-500 font-bold mb-8 italic text-sm px-4">Guarda tu comprobante para aclaraciones en almacén.</p>
            <div className="space-y-3">
              <button onClick={() => handleDownloadImage(selectedOrderForTicket)} className="w-full p-5 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-center gap-3 shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all"><Download size={18} /> DESCARGAR IMAGEN</button>
              <button onClick={() => {setShowSuccessModal(false); setSelectedOrderForTicket(null);}} className="w-full p-4 text-gray-400 font-black uppercase text-[10px] hover:text-black transition-all">CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN INVENTARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-black">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => { setIsModalOpen(false); setImagePreview(null); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={saveProduct} className="p-6 overflow-y-auto flex-1 space-y-6 hide-scrollbar">
              
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#F3EDEC] flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                  {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /> : <ImageIcon className="text-gray-300" size={28} />}
                </div>
                <div className="flex-1">
                  <label className="text-black bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full hover:bg-gray-50 transition-colors">
                    <Upload size={16} /> Subir Imagen
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold px-1 uppercase tracking-wide">La foto se subirá segura a Cloudinary.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Código / SKU</label>
                  <input name="code" defaultValue={editingProduct?.code} className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] focus:ring-1 focus:ring-[#035AE5] font-bold text-black transition-all" placeholder="Ej. BIC-123" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre del artículo</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] focus:ring-1 focus:ring-[#035AE5] font-bold text-black transition-all" placeholder="Ej. Cuaderno Profesional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Precio de Venta</label>
                  <div className="relative">
                     <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                     <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] focus:ring-1 focus:ring-[#035AE5] font-bold text-black transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Stock Inicial</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] focus:ring-1 focus:ring-[#035AE5] font-bold text-black transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Categoría</label>
                  <select name="category" defaultValue={editingProduct?.category || 'Stationery'} className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] focus:ring-1 focus:ring-[#035AE5] font-bold text-black transition-all appearance-none cursor-pointer">
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              
              <div className="pt-4">
                <button type="submit" disabled={isUploading} className="w-full text-black py-4 rounded-xl font-bold shadow-md hover:brightness-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-[#F89332]">
                  <Save size={18} /> {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
