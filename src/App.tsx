// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Package, History, Plus, Search, Trash2, 
  Save, X, CheckCircle, LogOut, Edit2, ArrowLeft, Minus,
  User, Lock, Store, ShoppingBag, List, Check, XCircle,
  Download, Upload, ImageIcon, LayoutDashboard, TrendingUp,
  BadgeInfo, Clock, UserCircle, ShieldCheck, FileDown, FileUp, FileText, Printer
} from 'lucide-react';

// --- Paleta de Colores Corporativa ---
const COLORS = {
  bicOrange: '#F89332',
  bladeBlue: '#035AE5',
  background: '#F3EDEC',
  white: '#FFFFFF',
  black: '#000000',
};

const CATEGORIES = ['Todos', 'Stationery', 'Lighter', 'Shaver', 'Brushes'];

// --- Estilos Globales e Impresión (Tamaño Carta) ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
  * { font-family: 'Nunito', sans-serif; box-sizing: border-box; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  
  .ticket-wrapper { position: absolute; top: 0; left: 0; z-index: -100; pointer-events: none; }
  
  @media print {
    @page { size: letter; margin: 0; }
    body * { visibility: hidden; }
    .ticket-wrapper, .ticket-wrapper * { visibility: visible; }
    .ticket-wrapper { position: absolute; left: 0; top: 0; z-index: 9999; width: 215.9mm; }
    .no-print { display: none !important; }
  }
`;

// --- Componente de Código de Barras Mini (Para cada producto) ---
const ProductBarcode = ({ value, width = 1.2 }) => {
  if (!value) return <span className="text-xs text-gray-300">N/A</span>;
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-end gap-[1px] h-[25px]">
        {String(value).split('').concat(['X', 'Y', 'Z']).map((char, i) => {
          const weight = (char.charCodeAt(0) % 3) + 1;
          return <div key={i} className="bg-black" style={{ width: `${weight * width}px`, height: '100%' }}></div>;
        })}
      </div>
      <span className="text-[7px] font-mono font-bold mt-0.5">{value}</span>
    </div>
  );
};

// --- Componente de Código de Barras Grande (Para el Folio) ---
const OrderBarcode = ({ value }) => (
  <div className="flex flex-col items-center mt-4">
    <div className="flex h-10 items-end gap-[1.5px]">
      {String(value).split('').concat(Array(15).fill('X')).map((char, i) => {
        const weight = (char.charCodeAt(0) % 3) + 1;
        return <div key={i} className="bg-black h-full" style={{ width: `${weight}px` }}></div>;
      })}
    </div>
    <span className="text-[10px] font-mono font-bold tracking-[0.3em] mt-1 uppercase">{value}</span>
  </div>
);

// --- Logo Nativo BIC ---
const LogoBIC = ({ size = "normal", showText = true }) => (
  <div className="flex items-center gap-3">
    <div className="relative flex items-center justify-center">
      <div className={`bg-[#F89332] ${size === 'large' ? 'w-20 h-14' : 'w-10 h-7'} rounded-[50%] flex items-center justify-center border-2 border-black rotate-[-5deg]`}>
        <span className={`text-black font-black italic tracking-tighter transform scale-x-125 ${size === 'large' ? 'text-2xl' : 'text-xs'}`}>BIC</span>
      </div>
    </div>
    {showText && (
      <h1 className={`font-black text-black ${size === 'large' ? 'text-2xl' : 'text-lg'} tracking-tighter uppercase`}>
        Tiendita <span className="text-[#F89332]">BIC</span>
      </h1>
    )}
  </div>
);

const App = () => {
  // --- Estados Principales ---
  const [appMode, setAppMode] = useState('selection');
  const [adminView, setAdminView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [notification, setNotification] = useState(null);

  // --- Estados de Formulario ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [empNumber, setEmpNumber] = useState('');
  const [empName, setEmpName] = useState('');
  const [empShift, setEmpShift] = useState('Matutino');
  const [loginError, setLoginError] = useState('');

  // --- Estados de Gestión de Stock ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const API_URL = 'https://sheetdb.io/api/v1/a174kd16wc31r';

  // --- Carga Inicial desde SheetDB ---
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        const mappedData = data.map(p => ({
          ...p,
          id: p.id || p.codigo || Math.random().toString(36).substr(2, 9),
          code: p.codigo,     
          name: p.nombre,     
          price: parseFloat(p.precio) || 0, 
          stock: parseInt(p.stock) || 0,    
          category: p.categoria 
        }));
        setProducts(mappedData);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
  }, []);

  const notify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Manejo de Sesión ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setCurrentUser({ name: 'Administrador', role: 'admin' });
      setAppMode('admin');
      setAdminView('dashboard');
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleEmployeeLogin = (e) => {
    e.preventDefault();
    if (empNumber.trim() && empName.trim()) {
      setCurrentUser({ name: empName, number: empNumber, shift: empShift, role: 'employee' });
      setAppMode('employee');
      setLoginError('');
    } else {
      setLoginError('Por favor completa todos los campos');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAppMode('selection');
    setUsername('');
    setPassword('');
    setEmpNumber('');
    setEmpName('');
    setCart([]);
  };

  // --- Lógica de Compra ---
  const addToCart = (product) => {
    if (product.stock <= 0) return notify("Sin existencias", "error");
    const item = cart.find(x => x.id === product.id);
    if (item) {
      if (item.quantity >= product.stock) return notify("Límite de stock alcanzado", "error");
      setCart(cart.map(x => x.id === product.id ? {...x, quantity: x.quantity + 1} : x));
    } else {
      setCart([...cart, {...product, quantity: 1}]);
    }
  };

  const updateCartQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const prod = products.find(p => p.id === id);
        return {...item, quantity: Math.max(1, Math.min(item.quantity + delta, prod.stock))};
      }
      return item;
    }));
  };

  const handleEmployeeSubmit = () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const newOrder = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: new Date().toLocaleString(),
      items: [...cart],
      total: subtotal * 1.16,
      empName: currentUser.name,
      empNumber: currentUser.number,
      empShift: currentUser.shift,
      status: 'Pendiente'
    };
    setPendingOrders([newOrder, ...pendingOrders]);
    setCart([]);
    setSelectedOrderForTicket(newOrder);
    setShowSuccessModal(true);
  };

  // --- Lógica de Administración ---
  const handleApproveOrder = async (order) => {
    const saleRecord = { ...order, date: new Date().toLocaleString(), status: 'Aprobado' };
    setSales([saleRecord, ...sales]);
    setPendingOrders(pendingOrders.filter(o => o.id !== order.id));
    
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.id);
      if (prod) {
        const newStock = prod.stock - item.quantity;
        fetch(`${API_URL}/id/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock })
        });
        setProducts(prev => prev.map(p => p.id === item.id ? {...p, stock: newStock} : p));
      }
    }
    notify("Entrega autorizada");
    setSelectedOrderForTicket(saleRecord);
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
          link.download = `Comprobante_BIC_${order.id}.png`;
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

  // --- Gestión de Archivos Excel ---
  const downloadCSVTemplate = () => {
    const csv = "codigo,nombre,precio,stock,categoria\nBIC-001,Muestra,10.00,50,Stationery";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Plantilla_Inventario_BIC.csv";
    a.click();
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split('\n');
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 5) imported.push({ 
          id: Date.now() + i, 
          code: parts[0].trim(), 
          name: parts[1].trim(), 
          price: parseFloat(parts[2]) || 0, 
          stock: parseInt(parts[3]) || 0, 
          category: parts[4].trim() 
        });
      }
      setProducts([...imported, ...products]);
      notify("Carga masiva completada");
    };
    reader.readAsText(file);
  };

  const saveProduct = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProd = {
      id: editingProduct?.id || Date.now(),
      code: formData.get('code'),
      name: formData.get('name'),
      price: parseFloat(formData.get('price')),
      stock: parseInt(formData.get('stock')),
      category: formData.get('category'),
      image: imagePreview
    };
    setProducts(editingProduct ? products.map(p => p.id === editingProduct.id ? newProd : p) : [newProd, ...products]);
    setIsModalOpen(false);
    setEditingProduct(null);
    setImagePreview(null);
    notify("Guardado en sistema local");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- Filtros de Catálogo ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const n = (p.name || '').toLowerCase();
      const c = (p.code || '').toLowerCase();
      const t = searchTerm.toLowerCase();
      return (n.includes(t) || c.includes(t)) && (selectedCategory === 'Todos' || p.category === selectedCategory);
    });
  }, [products, searchTerm, selectedCategory]);

  // --- Plantilla del Vale de Entrega ---
  const DeliveryNote = ({ order }) => {
    const isApproved = order.status === 'Aprobado';
    return (
      <div id="printable-ticket" className="bg-white text-black p-10 flex flex-col border-[12px] border-double border-gray-100" style={{ width: '215.9mm', minHeight: '279.4mm' }}>
        <div className="flex justify-between items-start border-b-4 border-black pb-6">
          <LogoBIC size="large" />
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter">{isApproved ? 'Vale de Entrega' : 'Comprobante de Solicitud'}</h2>
            <p className="font-bold text-gray-50 uppercase tracking-tighter">Folio: <span className="text-black">#{order.id}</span></p>
            <p className="text-sm font-bold text-gray-400 mt-1">{order.date}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 my-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Información Solicitante</p>
            <p className="text-xl font-bold uppercase">{order.empName}</p>
            <p className="font-bold text-gray-600">ID: {order.empNumber} • Turno: {order.empShift}</p>
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
                  <td className="py-3 px-2"><ProductBarcode value={it.code} /></td>
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
            <p className="text-3xl font-black text-[#035AE5]">${order.total.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-10 text-center">
          <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400 tracking-widest">Firma de Recibido</div>
          <div className="border-t border-gray-300 pt-4 uppercase text-[10px] font-black text-gray-400 tracking-widest">{isApproved ? 'Autorización Almacén' : 'Estado: Pedido Pendiente'}</div>
        </div>
        <div className="mt-auto pt-8 flex flex-col items-center">
          <OrderBarcode value={order.id} />
          <p className="text-[8px] text-gray-300 font-bold mt-4 uppercase tracking-[0.3em]">Documento de Control Interno • BIC Saltillo</p>
        </div>
      </div>
    );
  };

  // --- Vistas de Pantalla ---

  if (appMode === 'selection') {
    return (
      <div className="h-screen bg-[#F3EDEC] flex items-center justify-center p-6">
        <style>{globalStyles}</style>
        <div className="bg-white p-12 rounded-[50px] shadow-2xl w-full max-w-md text-center border-b-[15px] border-[#F89332]">
          <div className="flex justify-center mb-10"><LogoBIC size="large" /></div>
          <h2 className="text-xl font-black mb-8 uppercase tracking-tighter text-gray-400 italic">Acceso al Sistema</h2>
          <div className="space-y-4">
            <button onClick={() => setAppMode('login_employee')} className="w-full p-6 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all">
               Empleado BIC <ArrowLeft className="rotate-180" />
            </button>
            <button onClick={() => setAppMode('login_admin')} className="w-full p-6 bg-[#F89332] text-black rounded-3xl font-black uppercase text-xs flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all">
               Administrador <ShieldCheck />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appMode.startsWith('login')) {
    return (
      <div className="h-screen bg-[#F3EDEC] flex items-center justify-center p-6">
        <style>{globalStyles}</style>
        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
          <button onClick={() => setAppMode('selection')} className="mb-8 text-gray-400 font-bold flex items-center gap-2 hover:text-black transition-colors"><ArrowLeft size={16}/> Volver</button>
          <LogoBIC size="normal" />
          <h2 className="text-xl font-black mt-6 mb-8 uppercase tracking-tighter">
            {appMode === 'login_admin' ? 'Identificación Admin' : 'Registro de Datos'}
          </h2>
          <form onSubmit={appMode === 'login_admin' ? handleAdminLogin : handleEmployeeLogin} className="space-y-4">
            {appMode === 'login_admin' ? (
              <>
                <input type="text" placeholder="Usuario" required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-black border-2 border-transparent focus:border-[#F89332] transition-all" />
                <input type="password" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-black border-2 border-transparent focus:border-[#F89332] transition-all" />
              </>
            ) : (
              <>
                <input type="text" placeholder="Número de Nómina" required value={empNumber} onChange={e => setEmpNumber(e.target.value)} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-black border-2 border-transparent focus:border-[#035AE5] transition-all" />
                <input type="text" placeholder="Nombre Completo" required value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-black border-2 border-transparent focus:border-[#035AE5] transition-all" />
                <select value={empShift} onChange={e => setEmpShift(e.target.value)} className="w-full p-4 bg-[#F3EDEC] rounded-2xl outline-none font-bold text-black border-2 border-transparent focus:border-[#035AE5] transition-all cursor-pointer appearance-none">
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Nocturno">Nocturno</option>
                </select>
              </>
            )}
            {loginError && <p className="text-red-500 text-xs font-bold text-center italic">{loginError}</p>}
            <button type="submit" className={`w-full p-5 mt-4 rounded-3xl font-black uppercase tracking-widest shadow-xl transition-all ${appMode === 'login_admin' ? 'bg-[#F89332] text-black' : 'bg-[#035AE5] text-white'}`}>Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F3EDEC]">
      <style>{globalStyles}</style>
      <div className="ticket-wrapper">{selectedOrderForTicket && <DeliveryNote order={selectedOrderForTicket} />}</div>
      
      {notification && <div className={`fixed top-6 right-6 z-[100] bg-white p-4 rounded-xl shadow-2xl border-l-8 ${notification.type === 'error' ? 'border-red-500' : 'border-blue-500'} font-black animate-in slide-in-from-right-10`}>{notification.message}</div>}

      {/* Modal de Pedido Enviado */}
      {showSuccessModal && selectedOrderForTicket && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 text-[#64BF69] rounded-full flex items-center justify-center mb-6 mx-auto font-black"><CheckCircle size={40} /></div>
            <h2 className="text-2xl font-black uppercase mb-2">¡PEDIDO ENVIADO!</h2>
            <p className="text-gray-500 font-bold mb-8 italic text-sm px-4">Guarda tu comprobante para cualquier aclaración posterior.</p>
            <div className="space-y-3">
              <button onClick={() => handleDownloadImage(selectedOrderForTicket)} className="w-full p-5 bg-[#035AE5] text-white rounded-3xl font-black uppercase text-xs flex justify-center gap-3 shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all">
                <Download size={18} /> DESCARGAR IMAGEN
              </button>
              <button onClick={() => {setShowSuccessModal(false); setSelectedOrderForTicket(null);}} className="w-full p-4 text-gray-400 font-black uppercase text-[10px] hover:text-black transition-all">CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Menú Lateral Administrador */}
      {appMode === 'admin' && (
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col no-print shadow-sm">
          <div className="p-8 border-b border-gray-50"><LogoBIC size="small" /></div>
          <nav className="flex-1 p-6 space-y-2">
            {[
              { id: 'dashboard', icon: <LayoutDashboard size={20}/>, label: 'Resumen' },
              { id: 'orders', icon: <List size={20}/>, label: 'Pedidos', badge: pendingOrders.length },
              { id: 'inventory', icon: <Package size={20}/>, label: 'Inventario' },
              { id: 'history', icon: <History size={20}/>, label: 'Historial' }
            ].map(item => (
              <button key={item.id} onClick={() => setAdminView(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black uppercase text-[10px] transition-all ${adminView === item.id ? 'bg-[#035AE5] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                {item.icon} {item.label} {item.badge > 0 && <span className="ml-auto bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">{item.badge}</span>}
              </button>
            ))}
          </nav>
          <button onClick={handleLogout} className="m-6 p-4 text-red-500 font-black uppercase text-[10px] flex items-center gap-3 hover:bg-red-50 rounded-2xl border border-red-100 transition-all"><LogOut size={18}/> Salir</button>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden no-print">
        {appMode === 'employee' && (
          <header className="bg-white border-b border-gray-50 p-6 flex justify-between items-center shadow-sm shrink-0 z-10">
            <LogoBIC size="small" />
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-black uppercase text-xs">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nómina: {currentUser.number} • {currentUser.shift}</p>
              </div>
              <button onClick={handleLogout} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"><LogOut size={18}/></button>
            </div>
          </header>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#F3EDEC]">
            
            {/* INICIO ADMIN */}
            {adminView === 'dashboard' && appMode === 'admin' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-tighter">Indicadores Clave</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><TrendingUp className="text-[#035AE5] mb-4" size={24} /><p className="text-sm font-bold text-gray-400">Total Despachado</p><h3 className="text-3xl font-black text-black">${sales.reduce((acc, s) => acc + s.total, 0).toFixed(2)}</h3></div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><Package className="text-[#F89332] mb-4" size={24} /><p className="text-sm font-bold text-gray-400">Items en Inventario</p><h3 className="text-3xl font-black text-black">{products.reduce((acc, p) => acc + p.stock, 0)}</h3></div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><List className="text-[#DB054B] mb-4" size={24} /><p className="text-sm font-bold text-gray-400">Vales por Aprobar</p><h3 className="text-3xl font-black text-black">{pendingOrders.length}</h3></div>
                </div>
              </div>
            ) : adminView === 'history' && appMode === 'admin' ? (
               <div className="max-w-4xl mx-auto space-y-4">
                  <h2 className="text-2xl font-black uppercase mb-8">Historial de Salidas</h2>
                  {sales.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm flex items-center justify-between group">
                      <div><p className="text-[10px] font-black text-gray-300 uppercase">Vale ID: {s.id}</p><h4 className="text-lg font-black uppercase text-black">{s.empName}</h4><p className="text-xs font-bold text-gray-400">{s.date}</p></div>
                      <div className="flex items-center gap-3"><p className="text-2xl font-black text-[#035AE5] mr-4">${s.total.toFixed(2)}</p><button onClick={() => handleDownloadImage(s)} className="p-3 bg-blue-50 text-[#035AE5] rounded-xl hover:bg-blue-100 transition-colors" title="Descargar Comprobante"><Download size={20}/></button></div>
                    </div>
                  ))}
               </div>
            ) : adminView === 'orders' && appMode === 'admin' ? (
               <div className="max-w-3xl mx-auto space-y-6">
                  <h2 className="text-2xl font-black uppercase mb-8">Solicitudes Recientes</h2>
                  {pendingOrders.map(order => (
                    <div key={order.id} className="bg-white p-8 rounded-[40px] border-4 border-dashed border-gray-100 flex flex-col gap-6 shadow-xl">
                      <div className="flex justify-between items-start"><div><h3 className="text-2xl font-black uppercase text-black">{order.empName}</h3><p className="font-bold text-[#035AE5] uppercase tracking-wide">ID: {order.empNumber}</p></div><p className="text-4xl font-black text-black">${order.total.toFixed(2)}</p></div>
                      <button onClick={() => handleApproveOrder(order)} className="w-full py-5 bg-[#035AE5] text-white rounded-[25px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl transition-all">Autorizar Salida</button>
                    </div>
                  ))}
               </div>
            ) : adminView === 'inventory' && appMode === 'admin' ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-black uppercase tracking-tight italic">Control de Stock</h2><div className="flex gap-2"><button onClick={downloadCSVTemplate} className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50"><FileDown size={18} /> Plantilla</button><label className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm cursor-pointer hover:bg-gray-50"><FileUp size={18} /> Importar<input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" /></label><button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="text-black px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm" style={{ backgroundColor: COLORS.bicOrange }}><Plus size={18} /> Nuevo</button></div></div>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-[#F3EDEC] text-gray-500 text-xs uppercase"><th className="p-4 font-bold">Código</th><th className="p-4 font-bold">Producto</th><th className="p-4 font-bold">Precio</th><th className="p-4 font-bold">Stock</th><th className="p-4 font-bold text-right">Acción</th></tr></thead><tbody className="divide-y divide-gray-50">{products.map(p => (<tr key={p.id} className="hover:bg-gray-50/50 transition-colors"><td className="p-4 font-bold text-gray-400 text-xs">{p.code}</td><td className="p-4 font-bold text-sm text-black">{p.name}</td><td className="p-4 font-bold text-[#035AE5]">${p.price.toFixed(2)}</td><td className="p-4"><span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{p.stock}</span></td><td className="p-4 text-right"><button onClick={() => {setEditingProduct(p); setIsModalOpen(true);}} className="p-2 text-gray-400 hover:text-blue-500 bg-white border border-gray-200 rounded-lg"><Edit2 size={16} /></button></td></tr>))}</tbody></table></div>
              </div>
            ) : (
              <div className="h-full">
                {/* CATÁLOGO EMPLEADO */}
                <div className="flex flex-col lg:flex-row gap-4 mb-10">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={24}/>
                    <input type="text" placeholder="¿Qué material buscas hoy?..." className="w-full pl-16 pr-8 py-5 rounded-[30px] bg-white border-none shadow-sm font-bold text-xl outline-none focus:ring-4 ring-blue-100 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar shrink-0">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-2xl font-black uppercase text-[10px] transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                  {isLoading ? (
                    <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase animate-pulse italic tracking-widest">Sincronizando Inventario...</div>
                  ) : filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addToCart(p)} className="bg-white p-5 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative">
                       <div className="aspect-square bg-gray-50 rounded-[30px] mb-4 flex items-center justify-center overflow-hidden p-6 border border-gray-50 relative">
                         {p.image ? <img src={p.image} className="w-full h-full object-contain" /> : <div className="text-3xl font-black text-gray-200 uppercase opacity-20 italic">BIC</div>}
                         {p.stock <= 5 && p.stock > 0 && <span className="absolute top-4 right-4 bg-[#F89332] text-black px-2 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm">Stock Crítico</span>}
                       </div>
                       <h4 className="font-black text-xs text-black line-clamp-2 uppercase h-10 mb-2 leading-tight tracking-tighter">{p.name}</h4>
                       <div className="flex justify-between items-center mt-auto pt-2">
                          <p className="text-xl font-black text-[#035AE5]">${p.price.toFixed(2)}</p>
                          <div className="bg-[#F89332] p-3 rounded-full text-white shadow-lg group-hover:rotate-90 transition-transform"><Plus size={18}/></div>
                       </div>
                       {p.stock <= 0 && <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-[40px] flex items-center justify-center font-black text-[#DB054B] uppercase text-sm tracking-widest border-2 border-[#DB054B]/10">Material Agotado</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CARRITO INTEGRADO A LA DERECHA */}
          {appMode === 'employee' && (
            <aside className="hidden md:flex w-[400px] bg-white border-l border-gray-100 flex-col shadow-[-15px_0_30px_rgba(0,0,0,0.02)] shrink-0">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-[#F3EDEC]">
                <h3 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter leading-none"><ShoppingBag size={24}/> Mi Carrito</h3>
                <span className="bg-[#035AE5] text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg uppercase">{cart.length} Artículos</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 font-black uppercase italic space-y-4 opacity-40">
                    <ShoppingCart size={48}/> <p className="text-sm tracking-widest">Bandeja Vacía</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col gap-4 shadow-sm group">
                    <div className="flex justify-between font-black text-sm uppercase tracking-tight">
                       <span className="flex-1 pr-6 leading-none text-black">{item.name}</span>
                       <button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[#035AE5] font-black text-xl">${(item.price * item.quantity).toFixed(2)}</span>
                       <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl">
                          <button onClick={() => updateCartQty(item.id, -1)} className="p-1 hover:text-[#035AE5] transition-colors"><Minus size={16}/></button>
                          <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} className="p-1 hover:text-[#035AE5] transition-colors"><Plus size={16}/></button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t border-gray-50 space-y-6">
                <div className="flex justify-between items-end">
                   <span className="text-gray-300 uppercase font-black text-[10px] tracking-widest mb-1">Total a Pagar</span>
                   <span className="text-4xl font-black text-[#035AE5] tracking-tighter leading-none">${(cart.reduce((s, i) => s + (i.price * i.quantity), 0) * 1.16).toFixed(2)}</span>
                </div>
                <button onClick={handleEmployeeSubmit} disabled={cart.length === 0} className="w-full p-6 bg-[#F89332] text-black font-black rounded-[30px] shadow-2xl hover:brightness-105 active:scale-95 transition-all uppercase tracking-widest text-lg disabled:opacity-30 disabled:grayscale">
                  PEDIDO
                </button>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* MODAL GESTIÓN DE STOCK */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-black uppercase tracking-tight">{editingProduct ? 'Modificar Registro' : 'Alta de Material'}</h2>
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
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Código</label><input name="code" defaultValue={editingProduct?.code} className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none font-bold text-black" /></div>
                <div className="space-y-1.5 col-span-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción</label><input name="name" defaultValue={editingProduct?.name} required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none font-bold text-black" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Precio</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none font-bold text-black" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Stock</label><input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none font-bold text-black" /></div>
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Categoría</label>
                  <select name="category" defaultValue={editingProduct?.category || 'Stationery'} className="w-full p-3.5 rounded-xl bg-white border border-gray-200 outline-none font-bold text-black">
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full text-black py-4 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest" style={{ backgroundColor: COLORS.bicOrange }}>
                  <Save size={18} className="inline mr-2" /> GUARDAR PRODUCTO
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
