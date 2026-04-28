// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, Package, History, Plus, Search, Trash2, 
  X, CheckCircle, LogOut, Edit2, ArrowLeft, Minus,
  User, Lock, ShoppingBag, List, Check,
  Download, ImageIcon, LayoutDashboard, TrendingUp,
  BadgeInfo, Clock, UserCircle, ShieldCheck, FileDown, FileUp, Printer, AlertTriangle,
  Store, MapPin, CalendarClock, XCircle, Users
} from 'lucide-react';

// --- INTEGRACIÓN FIREBASE SDK ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, collection, doc, setDoc, 
  updateDoc, query, orderBy, onSnapshot, writeBatch, deleteDoc
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

const CATEGORIES = ['Todos', 'Vuelve a pedirlo', 'Stationery', 'Lighter', 'Shaver', 'Brushes'];

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

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
  * { font-family: 'Nunito', 'Avenir Next', sans-serif; }
  
  /* REGLA MAESTRA PARA USAR EL 100% DE LA PANTALLA */
  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    max-width: none !important;
  }

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
          <p className="font-black text-sm text-[#035AE5]">{order.pickupPlant || 'BIC PLANTA SALTILLO'}</p>
          <p className="text-sm text-gray-600 font-bold uppercase">Entrega: {order.pickupDate || 'Pendiente'} {order.pickupTime || ''}</p>
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
  // Navegación y Sesión
  const [appMode, setAppMode] = useState('selection'); 
  const [adminView, setAdminView] = useState('dashboard'); 
  const [currentUser, setCurrentUser] = useState(null);
  
  // Datos Firebase
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [appUsers, setAppUsers] = useState([]); 
  const [pickupSlots, setPickupSlots] = useState([]); 
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [notification, setNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);
  const [employeeCartView, setEmployeeCartView] = useState('cart'); 

  // Formularios
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', empNum: '', nss4: '', empShift: 'Matutino' });
  const [loginError, setLoginError] = useState('');

  // Estados Formulario Pickup
  const [pickupPlant, setPickupPlant] = useState('PLANTA 3A');
  const [selectedPickupSlot, setSelectedPickupSlot] = useState(null);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotPlant, setNewSlotPlant] = useState('PLANTA 3A');

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const resetUI = () => {
    setLoginForm({ user: '', pass: '', empNum: '', empName: '', empShift: 'Matutino' });
    setLoginError('');
    setCart([]);
    setSearchTerm('');
    setUserSearchTerm('');
    setSelectedCategory('Todos');
    setIsCartOpenMobile(false);
    setSelectedPickupSlot(null);
    setEmployeeCartView('cart');
  };

  // --- AUTENTICACIÓN ANÓNIMA SILENCIOSA ---
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

  // --- ESCUCHA EN TIEMPO REAL (FIREBASE) ---
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubInv = onSnapshot(collection(db, "inventory"), (snap) => {
      setProducts(snap.docs.map(d => d.data()));
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
      if (error.code === 'permission-denied') notify("Revisa las reglas de Firestore en la consola.", "error");
    });

    const qHist = query(collection(db, "history"), orderBy("date", "desc"));
    const unsubHist = onSnapshot(qHist, (snap) => {
      setAllOrders(snap.docs.map(d => d.data()));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setAppUsers(snap.docs.map(d => d.data()));
    });

    const unsubPickup = onSnapshot(collection(db, "pickup_slots"), (snap) => {
      setPickupSlots(snap.docs.map(d => d.data()));
    });

    return () => { unsubInv(); unsubHist(); unsubUsers(); unsubPickup(); };
  }, [isAuthReady, notify]);

  // Variables derivadas
  const pendingOrders = useMemo(() => allOrders.filter(o => o.status === 'Pendiente'), [allOrders]);
  const sales = useMemo(() => allOrders.filter(o => o.status === 'Aprobado'), [allOrders]);
  
  const myHistory = useMemo(() => {
    if (!currentUser) return [];
    return allOrders.filter(o => o.empNum === currentUser.number);
  }, [allOrders, currentUser]);

  const { canOrder, daysToWait } = useMemo(() => {
    if (currentUser?.isAdmin) return { canOrder: true, daysToWait: 0 };
    
    const lastValidOrder = myHistory.find(o => o.status === 'Pendiente' || o.status === 'Aprobado');
    if (!lastValidOrder) return { canOrder: true, daysToWait: 0 };

    const orderDate = new Date(lastValidOrder.date);
    const now = new Date();
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 14) {
      return { canOrder: false, daysToWait: 14 - diffDays };
    }
    return { canOrder: true, daysToWait: 0 };
  }, [myHistory, currentUser]);

  const previouslyBoughtIds = useMemo(() => {
    const ids = new Set();
    myHistory.forEach(order => {
      if (order.status === 'Aprobado' || order.status === 'Pendiente') {
        order.items.forEach(item => ids.add(item.id));
      }
    });
    return ids;
  }, [myHistory]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginForm.user === 'admin' && loginForm.pass === 'admin123') {
      setCurrentUser({ name: 'Administrador', role: 'admin', isAdmin: true });
      setAppMode('admin');
      setAdminView('dashboard');
      resetUI();
    } else {
      const adminMatch = appUsers.find(u => u.empNum === loginForm.user && String(u.nss4) === String(loginForm.pass) && u.isAdmin);
      if (adminMatch) {
        setCurrentUser({ name: adminMatch.name, number: adminMatch.empNum, role: 'admin', isAdmin: true });
        setAppMode('admin');
        setAdminView('dashboard');
        resetUI();
      } else {
        setLoginError('Usuario o contraseña incorrectos');
      }
    }
  };

  const handleEmployeeLogin = (e) => {
    e.preventDefault();
    const userMatch = appUsers.find(u => u.empNum === loginForm.empNum && String(u.nss4) === String(loginForm.nss4));
    
    if (userMatch) {
      setCurrentUser({ 
        name: userMatch.name, 
        number: userMatch.empNum, 
        shift: loginForm.empShift, 
        role: 'employee',
        isAdmin: userMatch.isAdmin || false 
      });
      setAppMode('employee');
      resetUI();
    } else {
      setLoginError('Número de nómina o NSS incorrecto. Contacta a Recursos Humanos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('selection');
    resetUI();
  };

  // --- ENTREGAS (PICKUP) ---
  const savePickupSlot = async (e) => {
    e.preventDefault();
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, "pickup_slots", id), {
        id, plant: newSlotPlant, date: newSlotDate, time: newSlotTime
      });
      setNewSlotDate('');
      setNewSlotTime('');
      notify("Horario de entrega agregado");
    } catch (err) { notify("Error al agregar horario", "error"); }
  };

  const deletePickupSlot = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este horario disponible?")) return;
    try {
      await deleteDoc(doc(db, "pickup_slots", id));
      notify("Horario eliminado correctamente");
    } catch (err) { notify("Error al eliminar horario", "error"); }
  };

  const availableSlots = useMemo(() => {
    return pickupSlots.filter(s => s.plant === pickupPlant);
  }, [pickupSlots, pickupPlant]);


  // --- USUARIOS ---
  const saveUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const empNum = fd.get('empNum').trim();
    const data = {
      empNum: empNum,
      name: fd.get('name').trim().toUpperCase(),
      nss4: fd.get('nss4').trim()
    };
    try {
      await setDoc(doc(db, "users", empNum), data);
      setIsUserModalOpen(false);
      notify("Usuario registrado correctamente");
    } catch (err) { notify("Error al registrar usuario", "error"); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      notify("Usuario eliminado");
    } catch (e) { notify("Error al eliminar", "error"); }
  };

  const toggleAdminRole = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.empNum), {
        isAdmin: !user.isAdmin
      });
      notify(`Privilegios de administrador ${user.isAdmin ? 'removidos' : 'otorgados'} para ${user.name}`);
    } catch (err) { 
      notify("Error al actualizar privilegios", "error"); 
    }
  };

  const filteredUsers = useMemo(() => appUsers.filter(u => 
    u.empNum.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase())
  ), [appUsers, userSearchTerm]);

  const handleUserCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    notify("Cargando usuarios...", "success");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = event.target.result.split('\n');
      const batch = writeBatch(db);
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 3) {
          const empNum = parts[0].trim();
          if (empNum) {
            batch.set(doc(db, "users", empNum), {
              empNum: empNum, 
              name: parts[1].trim().toUpperCase(), 
              nss4: parts[2].trim()
            });
            count++;
          }
        }
      }
      if (count > 0) {
        await batch.commit();
        notify(`Se cargaron ${count} usuarios exitosamente.`);
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const downloadUserCSVTemplate = () => {
    const csv = "nomina,nombre,nss_4_digitos\n10452,JUAN PEREZ,1234\n";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Usuarios_BIC.csv';
    a.click();
  };

  const downloadUserReport = () => {
    if (appUsers.length === 0) return notify("No hay usuarios registrados", "error");
    let csv = "Nomina,Nombre,NSS_4_Digitos\n";
    appUsers.forEach(u => csv += `"${u.empNum}","${u.name}","${u.nss4}"\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Reporte_Usuarios_BIC_${Date.now()}.csv`; a.click();
  };

  // --- CLOUDINARY ---
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

  const downloadCSVTemplate = () => {
    const csv = "codigo,nombre,precio,stock,categoria\nBIC-01,PLUMA AZUL,12.50,100,Stationery\n";
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
      } else {
        capture();
      }
    }, 500);
  };

  const downloadReport = () => {
    if (sales.length === 0) return notify("No hay ventas para exportar", "error");
    let csv = "ID Venta,Fecha,Empleado,Turno,Planta Pickup,Fecha/Hora Pickup,Total,Articulos\n";
    sales.forEach(sale => {
      const itemsStr = sale.items.map(i => `${i.quantity}x ${i.name}`).join(" + ");
      csv += `"${sale.id_vale}","${new Date(sale.date).toLocaleString()}","${sale.empName}","${sale.empShift}","${sale.pickupPlant || 'N/A'}","${sale.pickupDate || ''} ${sale.pickupTime || ''}","$${sale.total}","${itemsStr}"\n`;
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
      await updateDoc(doc(db, "history", order.id_vale), { status: 'Aprobado' });
      for (const item of order.items) {
        const pRef = doc(db, "inventory", item.id);
        const currentProd = products.find(p => p.id === item.id);
        if (currentProd) {
          await updateDoc(pRef, { stock: Math.max(0, currentProd.stock - item.quantity) });
        }
      }
      notify("Pedido autorizado correctamente.", "success");
    } catch (e) { 
      notify("Error conectando a Firebase.", "error"); 
    }
  };

  const handleRejectOrder = async (order) => {
    try {
      await updateDoc(doc(db, "history", order.id_vale), { status: 'Rechazado' });
      notify(`Pedido #${order.id_vale} rechazado.`, "error");
    } catch (e) {
      notify("Error al rechazar pedido", "error");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if(!window.confirm("¿Seguro que deseas cancelar este pedido? Podrás realizar uno nuevo inmediatamente.")) return;
    try {
      await updateDoc(doc(db, "history", orderId), { status: 'Cancelado' });
      notify("Pedido cancelado correctamente", "success");
    } catch (err) {
      notify("Error al cancelar pedido", "error");
    }
  };

  const handleEmployeeSubmit = async () => {
    if (cart.length === 0) return;
    if (!selectedPickupSlot) return notify("Selecciona un horario de entrega (Pickup) antes de continuar", "error");

    const totalAmount = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const order = {
      id_vale: Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: new Date().toISOString(),
      empName: currentUser.name,
      empNum: currentUser.number,
      empShift: currentUser.shift,
      pickupPlant: selectedPickupSlot.plant,
      pickupDate: selectedPickupSlot.date,
      pickupTime: selectedPickupSlot.time,
      items: [...cart],
      total: totalAmount,
      status: 'Pendiente'
    };
    
    try {
      await setDoc(doc(db, "history", order.id_vale), order);
      setSelectedOrderForTicket(order);
      setShowSuccessModal(true);
      setCart([]);
      setSelectedPickupSlot(null);
    } catch (error) {
      notify("Error al procesar el pedido.", "error");
    }
  };

  const getCategoryLimit = (category) => {
    if (category === 'Stationery' || category === 'Shaver') return 3;
    if (category === 'Brushes' || category === 'Lighter') return 2;
    return Infinity;
  };

  const addToCart = (product) => {
    if (!canOrder) return notify(`Debes esperar ${daysToWait} días para tu próximo pedido`, "error");
    if (product?.stock <= 0) return notify("Producto agotado", "error");
    
    const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (!currentUser?.isAdmin && currentTotal + product.price > 2000) {
      return notify("El pedido no puede superar los $2000 MXN", "error");
    }

    const existing = cart.find(item => item.id === product.id);

    if (!currentUser?.isAdmin) {
      const catLimit = getCategoryLimit(product.category);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= catLimit) {
        return notify(`Límite máximo de ${catLimit} artículos para la categoría ${product.category}`, "error");
      }
    }

    if (existing) {
      if (existing.quantity >= product.stock) return notify("Límite de stock alcanzado", "error");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else { setCart([...cart, { ...product, quantity: 1 }]); }
  };

  const updateQuantity = (id, delta) => {
    const product = products.find(p => p.id === id);
    const existing = cart.find(item => item.id === id);
    
    if (!product || !existing) return;

    if (delta > 0 && !currentUser?.isAdmin) {
      const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (currentTotal + product.price > 2000) {
        return notify("El pedido no puede superar los $2000 MXN", "error");
      }

      const catLimit = getCategoryLimit(product.category);
      if (existing.quantity >= catLimit) {
        return notify(`Límite máximo de ${catLimit} artículos para la categoría ${product.category}`, "error");
      }
    }

    setCart(cart.map(item => {
      if (item.id === id) {
        const maxStock = product?.stock || 0;
        let maxAllowed = maxStock;
        
        if (!currentUser?.isAdmin) {
          const catLimit = getCategoryLimit(product.category);
          maxAllowed = Math.min(maxStock, catLimit);
        }
        
        return { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, maxAllowed)) };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotal = total; 

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'Todos' || 
                       (selectedCategory === 'Vuelve a pedirlo' && previouslyBoughtIds.has(p.id)) || 
                       p.category === selectedCategory;
    return matchesSearch && matchesCat;
  }), [products, searchTerm, selectedCategory, previouslyBoughtIds]);


  // ==========================================
  // RENDER: PANTALLAS DE ACCESO (SELECCIÓN / LOGIN)
  // ==========================================
  if (appMode === 'selection' || appMode.startsWith('login')) {
    return (
      <div className="flex h-screen bg-[#F3EDEC]">
        <style>{globalStyles}</style>
        
        {notification && (
          <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-5 ${notification.type === 'error' ? 'bg-white border-l-4 border-l-[#DB054B]' : 'bg-white border-l-4 border-l-[#64BF69]'}`}>
            {notification.type === 'error' ? <XCircle color={COLORS.flameRed} size={20} /> : <CheckCircle color={COLORS.accentGreen} size={20} />}
            <span className="font-bold text-sm text-black">{notification.message}</span>
          </div>
        )}
        
        <div className="hidden lg:block lg:w-1/2 h-full relative bg-white border-r border-gray-200">
          <img src="Banner.webp" alt="Banner" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
          {appMode !== 'selection' && (
            <button onClick={() => { setAppMode('selection'); resetUI(); }} className="absolute top-8 left-8 p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold text-sm">
              <ArrowLeft size={18} /> Volver
            </button>
          )}

          <div className="bg-white p-10 lg:p-12 rounded-[40px] lg:rounded-[50px] shadow-2xl w-full max-w-md text-center border-b-[15px] border-[#F89332]">
            <div className="flex justify-center mb-8"><LogoBIC size="large" /></div>
            
            {appMode === 'selection' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-xl font-black mb-8 uppercase tracking-tighter text-gray-400 italic">Portal Tiendita BIC</h2>
                <button onClick={() => { setAppMode('login_employee'); resetUI(); }} className="w-full p-6 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all">
                  Empleado BIC <ArrowLeft className="rotate-180" />
                </button>
                <button onClick={() => { setAppMode('login_admin'); resetUI(); }} className="w-full p-6 bg-[#F89332] text-black rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all">
                  Administrador <ShieldCheck />
                </button>
              </div>
            )}

            {appMode === 'login_admin' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                <h2 className="text-2xl font-bold text-black text-center mb-6">Acceso Administrador</h2>
                {loginError && <div className="bg-[#DB054B]/10 text-[#DB054B] p-3 rounded-xl text-sm font-bold mb-6 text-center border border-[#DB054B]/20">{loginError}</div>}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Usuario</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="admin" required value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#F89332] focus:bg-white transition-all font-bold text-black" /></div></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contraseña</label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="password" placeholder="admin123" required value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#F89332] focus:bg-white transition-all font-bold text-black" /></div></div>
                  <button type="submit" className="w-full py-4 mt-6 rounded-xl font-bold text-black text-lg shadow-md hover:brightness-95 active:scale-[0.98] transition-all uppercase tracking-widest bg-[#F89332]">Entrar al Sistema</button>
                </form>
              </div>
            )}

            {appMode === 'login_employee' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                <h2 className="text-2xl font-bold text-black text-center mb-6">Registro de Datos</h2>
                {loginError && <div className="bg-[#DB054B]/10 text-[#DB054B] p-3 rounded-xl text-sm font-bold mb-6 text-center border border-[#DB054B]/20">{loginError}</div>}
                <form onSubmit={handleEmployeeLogin} className="space-y-4">
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Número de Nómina</label><div className="relative"><BadgeInfo className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Ej. 10452" required value={loginForm.empNum} onChange={e => setLoginForm({...loginForm, empNum: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black" /></div></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">NSS (Últimos 4 Dígitos)</label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="password" placeholder="Ej. 1234" maxLength="4" required value={loginForm.nss4} onChange={e => setLoginForm({...loginForm, nss4: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black" /></div></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Turno</label><div className="relative"><Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><select required value={loginForm.empShift} onChange={e => setLoginForm({...loginForm, empShift: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-[#F3EDEC] border border-transparent rounded-xl outline-none focus:border-[#035AE5] focus:bg-white transition-all font-bold text-black appearance-none cursor-pointer"><option value="Matutino">Matutino</option><option value="Vespertino">Vespertino</option><option value="Nocturno">Nocturno</option></select></div></div>
                  <button type="submit" className="w-full py-4 mt-6 rounded-xl font-bold text-white text-lg shadow-md hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest bg-[#035AE5]">Ingresar al Catálogo</button>
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
            <SidebarItem id="pickup" icon={<CalendarClock size={20}/>} label="Entregas" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="inventory" icon={<Package size={20}/>} label="Inventario" adminView={adminView} setAdminView={setAdminView} />
            <SidebarItem id="users" icon={<Users size={20}/>} label="Usuarios" adminView={adminView} setAdminView={setAdminView} />
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
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-6">Resumen del Día</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-100 text-[#035AE5]"><TrendingUp size={24} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Ventas Aprobadas</p>
                    <h3 className="text-3xl font-black text-black mt-1">${sales.reduce((acc, s) => acc + s.total, 0).toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-orange-100 text-[#F89332]"><Package size={24} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Items en Stock</p>
                    <h3 className="text-3xl font-black text-black mt-1">{products.reduce((acc, p) => acc + p.stock, 0)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-red-100 text-[#DB054B]"><List size={24} /></div>
                      {pendingOrders.length > 0 && <span className="flex w-3 h-3 bg-[#DB054B] rounded-full animate-pulse"></span>}
                    </div>
                    <p className="text-sm font-bold text-gray-400">Pendientes</p>
                    <h3 className="text-3xl font-black text-black mt-1">{pendingOrders.length}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-green-100 text-green-600"><Users size={24} /></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400">Usuarios</p>
                    <h3 className="text-3xl font-black text-black mt-1">{appUsers.length}</h3>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6">
                  <h3 className="font-bold text-black mb-4">Últimas Aprobaciones</h3>
                  {sales.length === 0 ? <p className="text-sm text-gray-400 font-bold">No hay actividad reciente.</p> : (
                    <div className="space-y-4">
                      {sales.slice(0,4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#F3EDEC] flex items-center justify-center text-black"><Check size={16} /></div><div><p className="text-sm font-bold text-black">Pedido de {s.empName}</p><p className="text-xs text-gray-400 font-bold">No. {s.empNum} • {s.empShift}</p></div></div>
                          <span className="font-bold text-[#035AE5]">${s.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            ) : adminView === 'pickup' && appMode === 'admin' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-black">Gestión de Entregas (Pickup)</h2></div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-black mb-4">Agregar Nuevo Horario de Entrega</h3>
                  <form onSubmit={savePickupSlot} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Planta</label><select required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black appearance-none cursor-pointer" value={newSlotPlant} onChange={e=>setNewSlotPlant(e.target.value)}><option value="PLANTA 3A">PLANTA 3A</option><option value="PLANTA 3B">PLANTA 3B</option></select></div>
                    <div className="flex-1 w-full space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fecha Disponible</label><input required type="text" placeholder="Ej. Hoy, Mañana, 15/May" className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black" value={newSlotDate} onChange={e=>setNewSlotDate(e.target.value)}/></div>
                    <div className="flex-1 w-full space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rango de Horario</label><input required type="text" placeholder="Ej. 5p.m. - 6p.m." className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black" value={newSlotTime} onChange={e=>setNewSlotTime(e.target.value)}/></div>
                    <button type="submit" className="w-full md:w-auto py-3.5 px-8 bg-[#035AE5] text-white rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all h-[50px]">Habilitar</button>
                  </form>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse"><thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-bold border-b border-gray-200">Planta</th><th className="p-4 font-bold border-b border-gray-200">Fecha</th><th className="p-4 font-bold border-b border-gray-200">Horario</th><th className="p-4 font-bold border-b border-gray-200 text-right">Acción</th></tr></thead><tbody className="divide-y divide-gray-50">{pickupSlots.map(slot => (<tr key={slot.id} className="hover:bg-gray-50/50 transition-colors"><td className="p-4 font-bold text-black">{slot.plant}</td><td className="p-4 font-bold text-gray-600">{slot.date}</td><td className="p-4 font-bold text-gray-600">{slot.time}</td><td className="p-4 text-right"><button onClick={()=>deletePickupSlot(slot.id)} className="p-2 text-gray-400 hover:text-[#DB054B] bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"><Trash2 size={16}/></button></td></tr>))}{pickupSlots.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold italic">No hay horarios de entrega registrados actualmente.</td></tr>)}</tbody></table>
                </div>
              </div>

            ) : adminView === 'users' && appMode === 'admin' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-black">Gestión de Usuarios</h2><div className="flex gap-2"><button onClick={downloadUserCSVTemplate} className="hidden lg:flex text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FileDown size={18} /> Plantilla</button><label className="text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all cursor-pointer"><FileUp size={18} /> Importar<input type="file" accept=".csv" onChange={handleUserCSVUpload} className="hidden" /></label><button onClick={downloadUserReport} className="hidden lg:flex text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><Download size={18} /> Reporte</button><button onClick={() => setIsUserModalOpen(true)} className="text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:brightness-95 transition-all bg-[#F89332]"><Plus size={18} strokeWidth={3} /> Nuevo</button></div></div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar usuario por número de nómina o nombre..." className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-[#F3EDEC] text-black focus:outline-none focus:ring-2 focus:ring-[#035AE5] focus:bg-white transition-all font-bold text-sm" value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} /></div></div>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"><table className="w-full text-left border-collapse"><thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-bold border-b border-gray-200">Nómina</th><th className="p-4 font-bold border-b border-gray-200">Nombre</th><th className="p-4 font-bold border-b border-gray-200 hidden sm:table-cell">NSS (4 Dig)</th><th className="p-4 font-bold border-b border-gray-200">Rol</th><th className="p-4 font-bold border-b border-gray-200 text-right">Acción</th></tr></thead><tbody className="divide-y divide-gray-50">{filteredUsers.map(u => (<tr key={u.empNum} className="hover:bg-gray-50/50 transition-colors"><td className="p-4 font-bold text-black">{u.empNum}</td><td className="p-4 text-sm font-bold uppercase">{u.name}</td><td className="p-4 text-sm font-bold text-gray-500 hidden sm:table-cell">{u.nss4}</td><td className="p-4"><span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${u.isAdmin ? 'bg-[#035AE5]/10 text-[#035AE5]' : 'bg-gray-100 text-gray-500'}`}>{u.isAdmin ? 'Admin' : 'Empleado'}</span></td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => toggleAdminRole(u)} className={`p-2 rounded-lg shadow-sm transition-colors border ${u.isAdmin ? 'bg-blue-50 border-blue-200 text-[#035AE5] hover:bg-blue-100' : 'bg-white border-gray-200 text-gray-400 hover:text-[#035AE5]'}`} title={u.isAdmin ? "Quitar Administrador" : "Hacer Administrador"}><ShieldCheck size={16}/></button><button onClick={()=>deleteUser(u.empNum)} className="p-2 text-gray-400 hover:text-[#DB054B] bg-white border border-gray-200 rounded-lg shadow-sm transition-colors" title="Eliminar Usuario"><Trash2 size={16}/></button></div></td></tr>))}{filteredUsers.length === 0 && (<tr><td colSpan="5" className="p-8 text-center text-gray-400 font-bold italic">No se encontraron usuarios.</td></tr>)}</tbody></table></div>
              </div>

            ) : adminView === 'inventory' && appMode === 'admin' ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-black">Inventario</h2><div className="flex gap-2"><button onClick={downloadCSVTemplate} className="hidden lg:flex text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"><FileDown size={18} /> Plantilla</button><label className="text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all cursor-pointer"><FileUp size={18} /> Importar<input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" /></label><button onClick={() => { setEditingProduct(null); setImagePreview(null); setIsModalOpen(true); }} className="text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:brightness-95 transition-all bg-[#F89332]"><Plus size={18} strokeWidth={3} /> Nuevo Producto</button></div></div>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"><table className="w-full text-left border-collapse"><thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-bold border-b border-gray-200 hidden lg:table-cell">Código</th><th className="p-4 font-bold border-b border-gray-200">Producto</th><th className="p-4 font-bold border-b border-gray-200 hidden sm:table-cell">Categoría</th><th className="p-4 font-bold border-b border-gray-200">Precio</th><th className="p-4 font-bold border-b border-gray-200 text-center">Stock</th><th className="p-4 font-bold border-b border-gray-200 text-right">Acción</th></tr></thead><tbody className="divide-y divide-gray-50">{products.map(p => (<tr key={p.id} className="hover:bg-gray-50/50 transition-colors"><td className="p-4 hidden lg:table-cell font-bold text-gray-400 text-xs">{p.code || '-'}</td><td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#F3EDEC] border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">{p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <Package size={16} className="text-gray-400"/>}</div><span className="font-bold text-sm text-black">{p.name}</span></div></td><td className="p-4 hidden sm:table-cell"><span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{p.category}</span></td><td className="p-4 font-bold text-[#035AE5]">${p.price.toFixed(2)}</td><td className="p-4 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.stock <= 5 ? 'bg-red-100 text-[#DB054B]' : 'bg-green-100 text-[#64BF69]'}`}>{p.stock}</span></td><td className="p-4 text-right"><button onClick={() => {setEditingProduct(p); setImagePreview(p.image || null); setIsModalOpen(true);}} className="p-2 text-gray-400 hover:text-[#035AE5] bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"><Edit2 size={16} /></button></td></tr>))}</tbody></table></div>
              </div>

            ) : adminView === 'orders' && appMode === 'admin' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-8 flex items-center gap-3">Pedidos Recibidos {pendingOrders.length > 0 && <span className="bg-[#DB054B] text-white text-sm px-3 py-1 rounded-full">{pendingOrders.length}</span>}</h2>
                {pendingOrders.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center"><div className="bg-[#F3EDEC] p-4 rounded-full text-gray-400 mb-4"><List size={32} /></div><p className="font-bold text-black text-lg">No hay pedidos pendientes</p><p className="text-sm font-bold text-gray-400 mt-1">Los pedidos de los Empleados aparecerán aquí.</p></div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {pendingOrders.map(order => (
                      <div key={order.id_vale} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#F3EDEC]"><div><span className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded tracking-widest uppercase">Orden #{order.id_vale}</span><h3 className="font-bold text-black mt-2">De: {order.empName}</h3><p className="text-xs font-bold text-gray-500 mt-0.5">ID: {order.empNum} • {order.empShift}</p><p className="text-xs font-bold text-[#F89332] mt-1.5 flex items-center gap-1.5"><MapPin size={12}/> Pickup: {order.pickupPlant} • {order.pickupDate} {order.pickupTime}</p></div><span className="text-2xl font-bold text-black">${order.total.toFixed(2)}</span></div>
                        <div className="p-5 flex-1 flex flex-col"><ul className="space-y-3 mb-6">{order.items.map((it, i) => (<li key={i} className="flex justify-between items-center text-sm font-bold"><span className="text-gray-600"><span className="text-black bg-gray-100 px-1.5 py-0.5 rounded mr-2">{it.quantity}x</span> {it.name}</span><span className="text-black">${(it.price * it.quantity).toFixed(2)}</span></li>))}</ul><div className="flex gap-3 mt-auto"><button onClick={() => handleRejectOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-[#DB054B] bg-white border-2 border-[#DB054B] hover:bg-[#DB054B]/5 transition-colors flex items-center justify-center gap-2"><X size={18} /> Rechazar</button><button onClick={() => handleApproveOrder(order)} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#035AE5] shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"><Check size={18} /> Aprobar Pedido</button></div></div>
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
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"><table className="w-full text-left border-collapse"><thead className="bg-[#F3EDEC] text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-bold border-b border-gray-200">Folio</th><th className="p-4 font-bold border-b border-gray-200">Fecha</th><th className="p-4 font-bold border-b border-gray-200">Empleado BIC</th><th className="p-4 font-bold border-b border-gray-200 text-right">Total / Acción</th></tr></thead><tbody className="divide-y divide-gray-50">{sales.map(sale => (<tr key={sale.id_vale} className="hover:bg-gray-50/50 transition-colors"><td className="p-4 font-bold text-black">#{sale.id_vale}</td><td className="p-4 text-sm font-bold text-gray-500">{new Date(sale.date).toLocaleString()}</td><td className="p-4"><p className="font-bold text-sm text-black">{sale.empName}</p><p className="text-[10px] font-bold text-gray-400">ID: {sale.empNum}</p></td><td className="p-4 text-right"><span className="font-bold text-[#035AE5] block">${sale.total.toFixed(2)}</span><div className="flex justify-end gap-2 mt-2"><button onClick={() => handleDownloadImage(sale)} className="p-2 bg-blue-50 text-[#035AE5] rounded-lg hover:bg-blue-100 transition-colors" title="Descargar Imagen"><Download size={14}/></button><button onClick={() => { setSelectedOrderForTicket(sale); setTimeout(() => window.print(), 500); }} className="p-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors" title="Imprimir"><Printer size={14}/></button></div></td></tr>))}</tbody></table></div>
                )}
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {!canOrder && (
                  <div className="bg-[#DB054B]/10 border border-[#DB054B]/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <AlertTriangle className="text-[#DB054B] shrink-0 mt-0.5" size={20} />
                    <div><h4 className="text-[#DB054B] font-bold text-sm">Límite de pedidos alcanzado</h4><p className="text-[#DB054B]/80 font-bold text-xs mt-1">Solo puedes realizar un pedido de insumos cada 14 días. Podrás realizar tu próximo pedido en <span className="font-black">{daysToWait} día(s)</span>. Si necesitas cancelar un pedido que sigue pendiente para volver a pedir, ve a la pestaña "Historial".</p></div>
                  </div>
                )}

                <div className="p-6 bg-white border border-gray-100 rounded-2xl flex flex-col gap-4 shadow-sm mb-6">
                  <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar productos por nombre..." className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-[#F3EDEC] text-black focus:outline-none focus:ring-2 focus:ring-[#035AE5] focus:bg-white transition-all font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">{CATEGORIES.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-[#035AE5] text-white border-[#035AE5] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{cat}</button>))}</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 mb-6">
                  <h3 className="font-bold text-lg text-black border-b border-gray-100 pb-3 flex items-center gap-2"><Store size={20} className="text-[#035AE5]"/> Selecciona tu Planta y Horario de Recolección</h3>
                  <div className="flex items-center gap-4 bg-[#F3EDEC]/50 p-4 rounded-xl border border-gray-100"><div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200"><MapPin className="text-[#035AE5]" size={24}/></div><div className="flex-1 flex flex-col"><select className="font-black text-lg bg-transparent outline-none cursor-pointer text-black appearance-none" value={pickupPlant} onChange={(e) => { setPickupPlant(e.target.value); setSelectedPickupSlot(null); }}><option value="PLANTA 3A">PLANTA 3A</option><option value="PLANTA 3B">PLANTA 3B</option></select><span className="text-xs font-bold text-gray-500 mt-0.5">Realiza el Pickup de tu pedido en esta planta</span></div></div>
                  <div>
                    <h4 className="text-sm font-bold text-black mb-3 px-1">Horarios Disponibles</h4>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                      {availableSlots.length > 0 ? availableSlots.map(slot => (<button key={slot.id} onClick={() => setSelectedPickupSlot(slot)} className={`shrink-0 border-2 p-3 rounded-xl flex flex-col items-center justify-center min-w-[120px] transition-all ${selectedPickupSlot?.id === slot.id ? 'border-[#035AE5] bg-blue-50 text-[#035AE5] shadow-md scale-105' : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}><span className="text-xs font-black uppercase mb-1">{slot.date}</span><span className="text-sm font-bold">{slot.time}</span></button>)) : (<div className="w-full py-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50"><p className="text-sm font-bold text-gray-400 italic">No hay horarios de entrega registrados para esta planta.</p></div>)}
                    </div>
                  </div>
                </div>
                
                <div className="pb-20 lg:pb-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => (
                      <div key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#035AE5] active:scale-[0.98] transition-all flex flex-col relative cursor-pointer">
                        <div className="w-full aspect-square rounded-xl bg-[#F3EDEC] mb-4 flex items-center justify-center overflow-hidden border border-gray-50 relative p-2">{product.image ? (<img src={product.image} className="w-full h-full object-contain" alt={product.name} />) : (<div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-200"><Package className="text-gray-400 opacity-50" size={32} /></div>)}{product.stock <= 5 && product.stock > 0 && (<span className="absolute top-2 right-2 bg-[#FFCC00] text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Poco Stock</span>)}</div>
                        <h3 className="font-bold text-sm text-black line-clamp-2 leading-tight h-10 mb-1">{product.name}</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">{product.category}</p>
                        <div className="mt-auto flex justify-between items-center"><p className="text-lg font-bold text-[#035AE5]">${product.price.toFixed(2)}</p><div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform bg-[#F89332]"><Plus size={16} strokeWidth={3} /></div></div>
                        {product.stock <= 0 && (<div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center backdrop-blur-[2px]"><span className="bg-[#DB054B] text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">Agotado</span></div>)}
                      </div>
                    ))}
                    {filteredProducts.length === 0 && selectedCategory === 'Vuelve a pedirlo' && (<div className="col-span-full py-10 text-center flex flex-col items-center justify-center text-gray-400"><History size={40} className="mb-4 opacity-50"/><p className="font-bold uppercase tracking-widest text-sm">No has comprado ningún producto aún</p></div>)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral Carrito */}
          {appMode === 'employee' && (
            <aside className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.03)] z-20">
              <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
                <div className="flex items-center justify-between"><h2 className="font-bold text-lg text-black">Mi Pedido</h2><span className="bg-[#F3EDEC] text-[#035AE5] px-2 py-1 rounded-md text-xs font-bold">{cart.reduce((a, b) => a + b.quantity, 0)} items</span></div>
                <div className="flex bg-gray-50 p-1 rounded-lg"><button onClick={() => setEmployeeCartView('cart')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${employeeCartView === 'cart' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>Carrito</button><button onClick={() => setEmployeeCartView('history')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${employeeCartView === 'history' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>Historial</button></div>
              </div>
              
              {employeeCartView === 'cart' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                    {cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><ShoppingBag size={48} opacity={0.2} /><p className="font-bold text-sm">Tu bandeja está vacía</p></div>) : cart.map(item => (<div key={item.id} className="flex flex-col gap-2 p-3 bg-[#F3EDEC] rounded-xl border border-transparent hover:border-gray-200 transition-colors"><div className="flex justify-between items-start"><h4 className="text-sm font-bold text-black leading-tight pr-2">{item.name}</h4><button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-gray-400 hover:text-[#DB054B]"><Trash2 size={14} /></button></div><div className="flex justify-between items-center mt-1"><div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1"><button onClick={() => updateQuantity(item.id, -1)} className="px-1 text-gray-500 hover:text-black"><Minus size={14} /></button><span className="font-bold text-sm w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="px-1 text-gray-500 hover:text-black"><Plus size={14} /></button></div><span className="font-bold text-[#035AE5]">${(item.price * item.quantity).toFixed(2)}</span></div></div>))}
                  </div>
                  <div className="p-5 bg-white border-t border-gray-100 space-y-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]"><div className="flex justify-between text-gray-500 text-sm font-bold"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between font-bold text-2xl text-black"><span>Total</span><span>${total.toFixed(2)}</span></div><button onClick={handleEmployeeSubmit} disabled={cart.length === 0 || !canOrder} className="w-full py-4 rounded-xl font-bold text-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95 active:scale-[0.98] bg-[#F89332]">ENVIAR PEDIDO</button></div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                  {myHistory.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><History size={48} opacity={0.2} /><p className="font-bold text-sm">No tienes pedidos anteriores</p></div>) : myHistory.map(order => (<div key={order.id_vale} className="p-4 bg-[#F3EDEC] rounded-xl border border-transparent flex flex-col gap-2"><div className="flex justify-between items-center border-b border-gray-200 pb-2"><span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded tracking-widest uppercase">#{order.id_vale}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.status === 'Aprobado' ? 'bg-[#64BF69]/20 text-[#64BF69]' : order.status === 'Rechazado' || order.status === 'Cancelado' ? 'bg-[#DB054B]/20 text-[#DB054B]' : 'bg-[#F89332]/20 text-[#F89332]'}`}>{order.status}</span></div><div className="text-xs font-bold text-gray-500">{new Date(order.date).toLocaleString()}</div><div className="text-xs font-bold text-black italic line-clamp-2">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div><div className="flex justify-between items-end mt-1"><span className="text-[10px] font-bold text-[#F89332] uppercase flex items-center gap-1"><MapPin size={10}/> {order.pickupPlant || 'Planta'}</span><span className="font-black text-[#035AE5]">${order.total.toFixed(2)}</span></div>{order.status === 'Pendiente' && (<button onClick={() => handleCancelOrder(order.id_vale)} className="mt-2 w-full py-2 border border-[#DB054B] text-[#DB054B] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors">Cancelar Pedido</button>)}</div>))}
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {/* NAVEGACIÓN MÓVIL */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 h-20 flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {appMode === 'admin' ? (
          [{ id:'dashboard', icon: <LayoutDashboard size={22}/>, label: 'Inicio' },{ id:'orders', icon: <List size={22}/>, label: 'Pedidos', badge: pendingOrders.length },{ id:'pickup', icon: <CalendarClock size={22}/>, label: 'Entregas' },{ id:'inventory', icon: <Package size={22}/>, label: 'Stock' },{ id:'users', icon: <Users size={22}/>, label: 'Usuarios' }].map(item => (<button key={item.id} onClick={() => setAdminView(item.id)} className={`flex flex-col items-center gap-1 w-1/5 transition-colors relative ${adminView === item.id ? 'text-[#035AE5]' : 'text-gray-400'}`}><div className={`p-1.5 rounded-lg ${adminView === item.id ? 'bg-blue-100' : ''}`}>{item.icon}</div>{item.badge > 0 && <span className="absolute top-0 right-4 w-2.5 h-2.5 bg-[#DB054B] rounded-full border-2 border-white"></span>}<span className="text-[9px] font-bold uppercase">{item.label}</span></button>))
        ) : appMode === 'employee' ? (
          <div className="w-full px-6 flex justify-end">{(cart.length > 0 || employeeCartView === 'history') && (<button onClick={() => setIsCartOpenMobile(true)} className="absolute -top-6 right-6 w-16 h-16 bg-[#F89332] text-black rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform border-4 border-white"><ShoppingBag size={24} />{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#DB054B] text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}</button>)}</div>
        ) : null}
      </nav>

      {/* Modal Carrito Móvil */}
      {isCartOpenMobile && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex flex-col justify-end">
          <div className="bg-white h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex flex-col p-4 border-b border-gray-100 gap-4">
              <div className="flex justify-between items-center"><h2 className="font-bold text-lg px-2">Tu Pedido</h2><button onClick={() => setIsCartOpenMobile(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button></div>
              <div className="flex bg-gray-50 p-1 rounded-lg"><button onClick={() => setEmployeeCartView('cart')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${employeeCartView === 'cart' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>Carrito</button><button onClick={() => setEmployeeCartView('history')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${employeeCartView === 'history' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>Historial</button></div>
            </div>
            {employeeCartView === 'cart' ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">{cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><ShoppingBag size={48} opacity={0.2} /><p className="font-bold text-sm">Tu bandeja está vacía</p></div>) : cart.map(item => (<div key={item.id} className="p-3 bg-[#F3EDEC] rounded-xl border border-transparent hover:border-gray-200 transition-colors flex flex-col gap-2"><div className="flex justify-between font-bold text-sm"><span className="flex-1 line-clamp-2 uppercase pr-2 leading-tight">{item.name}</span><button onClick={() => setCart(cart.filter(c=>c.id!==item.id))} className="text-gray-400 hover:text-[#DB054B]"><Trash2 size={14}/></button></div><div className="flex justify-between items-center"><div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1"><button onClick={() => updateQuantity(item.id, -1)} className="px-1 text-gray-500 hover:text-black"><Minus size={14}/></button><span className="font-bold text-sm w-6 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="px-1 text-gray-500 hover:text-black"><Plus size={14}/></button></div><span className="font-black text-[#035AE5]">${(item.price * item.quantity).toFixed(2)}</span></div></div>))}</div>
                <div className="p-5 border-t border-gray-100 space-y-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]"><div className="flex justify-between font-black text-2xl text-black"><span>Total</span><span>${total.toFixed(2)}</span></div><button onClick={handleEmployeeSubmit} disabled={cart.length === 0 || !canOrder} className="w-full py-4 bg-[#F89332] text-black font-bold rounded-xl shadow-md disabled:opacity-50 hover:brightness-95 active:scale-[0.98] transition-all uppercase tracking-widest">ENVIAR PEDIDO</button></div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">{myHistory.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3"><History size={48} opacity={0.2} /><p className="font-bold text-sm">No tienes pedidos anteriores</p></div>) : myHistory.map(order => (<div key={order.id_vale} className="p-4 bg-[#F3EDEC] rounded-xl border border-transparent flex flex-col gap-2"><div className="flex justify-between items-center border-b border-gray-200 pb-2"><span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded tracking-widest uppercase">#{order.id_vale}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.status === 'Aprobado' ? 'bg-[#64BF69]/20 text-[#64BF69]' : order.status === 'Rechazado' || order.status === 'Cancelado' ? 'bg-[#DB054B]/20 text-[#DB054B]' : 'bg-[#F89332]/20 text-[#F89332]'}`}>{order.status}</span></div><div className="text-xs font-bold text-gray-500">{new Date(order.date).toLocaleString()}</div><div className="text-xs font-bold text-black italic line-clamp-2">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div><div className="flex justify-between items-end mt-1"><span className="text-[10px] font-bold text-[#F89332] uppercase flex items-center gap-1"><MapPin size={10}/> {order.pickupPlant || 'Planta'}</span><span className="font-black text-[#035AE5]">${order.total.toFixed(2)}</span></div>{order.status === 'Pendiente' && (<button onClick={() => handleCancelOrder(order.id_vale)} className="mt-2 w-full py-2 border border-[#DB054B] text-[#DB054B] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors">Cancelar Pedido</button>)}</div>))}</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Éxito Empleado */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center border-b-[10px] border-green-500 animate-in zoom-in-95 duration-200"><div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner"><CheckCircle size={40} /></div><h2 className="text-2xl font-black uppercase tracking-tighter mb-2">¡Solicitud Enviada!</h2><p className="text-gray-500 font-bold mb-8 italic text-sm leading-relaxed px-2">Guarda tu comprobante digital. Te avisaremos cuando el material esté listo para entrega.</p><div className="space-y-3"><button onClick={() => handleDownloadImage(selectedOrderForTicket)} className="w-full p-5 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-center gap-3 shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all"><Download size={20} /> DESCARGAR COMPROBANTE</button><button onClick={() => {setShowSuccessModal(false); setSelectedOrderForTicket(null);}} className="w-full p-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-black">Cerrar Ventana</button></div></div>
        </div>
      )}

      {/* Modales Admin */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"><div className="flex justify-between items-center p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-black">Nuevo Usuario</h2><button onClick={() => setIsUserModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button></div><form onSubmit={saveUser} className="p-6 space-y-4"><div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Número de Nómina</label><input name="empNum" required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black transition-all" /></div><div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre Completo</label><input name="name" required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black transition-all uppercase" /></div><div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">NSS (Últimos 4 Dígitos)</label><input name="nss4" required maxLength="4" className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none focus:border-[#035AE5] font-bold text-black transition-all" /></div><button type="submit" className="w-full py-4 mt-2 rounded-xl font-bold text-black shadow-md hover:brightness-95 active:scale-[0.98] transition-all bg-[#F89332]">Registrar Empleado</button></form></div></div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm"><div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-b-[10px] border-[#F89332] animate-in slide-in-from-bottom-10 duration-300"><div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#F3EDEC]/30"><h2 className="text-xl font-black uppercase tracking-tighter">{editingProduct ? 'Modificar Registro' : 'Nuevo Material'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-black transition-colors"><X size={18}/></button></div><form onSubmit={saveProduct} className="p-8 overflow-y-auto space-y-8 hide-scrollbar"><div className="flex items-center gap-8"><div className="w-32 h-32 rounded-[30px] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">{imagePreview ? <img src={imagePreview} alt="Vista Previa" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-200" size={40} />}</div><div className="flex-1 space-y-4"><label className={`block w-full p-5 rounded-2xl border-2 border-dashed text-center font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-white hover:border-[#035AE5] hover:text-[#035AE5]'}`}>{isUploading ? 'Subiendo a Cloudinary...' : 'Cargar Foto Insumo'}<input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading}/></label><p className="text-[9px] text-gray-300 font-bold uppercase text-center tracking-widest">Sube la foto para guardarla de forma segura</p></div></div><div className="grid grid-cols-3 gap-6"><div className="col-span-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código BIC</label><input name="code" defaultValue={editingProduct?.code} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold uppercase focus:border-[#035AE5]" placeholder="EJ. BIC-01" /></div><div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Comercial</label><input name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold uppercase focus:border-[#035AE5]" placeholder="EJ. PLUMA AZUL" /></div></div><div className="grid grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Unitario ($)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-lg focus:border-[#035AE5]" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Existencia Actual</label><input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-lg focus:border-[#035AE5]" /></div></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría del Insumo</label><select name="category" defaultValue={editingProduct?.category || 'Stationery'} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer focus:border-[#035AE5]">{CATEGORIES.filter(c => c !== 'Todos' && c !== 'Vuelve a pedirlo').map(c => <option key={c} value={c}>{c}</option>)}</select></div><button type="submit" disabled={isUploading} className="w-full p-6 bg-[#F89332] text-black font-black rounded-3xl shadow-2xl mt-4 disabled:opacity-50 uppercase tracking-widest transition-all hover:brightness-95 active:scale-[0.98]">Guardar en Firestore</button></form></div></div>
      )}
    </div>
  );
};

export default App;
