import React, { useState } from 'react';
import { ProductItem } from '../../types';

interface AdminStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onAddProduct: (prod: ProductItem) => void;
  onDeleteProduct: (id: string) => void;
}

export const AdminStudioModal: React.FC<AdminStudioModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddProduct,
  onDeleteProduct
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(35000);
  const [stock, setStock] = useState(20);
  const [icon, setIcon] = useState('🎃');
  const [videoUrl, setVideoUrl] = useState('/videos/honey_demo.mp4');
  const [desc, setDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProd: ProductItem = {
      id: 'prod-' + Date.now(),
      name: {
        en: name,
        ko: name,
        ja: name,
        zh: name,
        es: name,
        fr: name
      },
      price: Number(price) || 30000,
      currency: 'KRW',
      stock: Number(stock) || 10,
      icon: icon || '🎁',
      videoUrl: videoUrl || '/videos/honey_demo.mp4',
      description: {
        en: desc || 'Newly registered demo item',
        ko: desc || '새로 등록된 데모 상품',
        ja: desc || '新規登録商品',
        zh: desc || '新注册商品',
        es: desc || 'Nuevo producto registrado',
        fr: desc || 'Nouveau produit enregistré'
      }
    };

    onAddProduct(newProd);
    setName('');
    setDesc('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-500/60 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-sm font-bold text-white">Kiroween Seller Studio (Admin)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
          >
            ✕ Close
          </button>
        </div>

        {/* Add Product Form */}
        <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
          <h3 className="text-xs font-bold text-purple-400">✨ Register Product & Video Mapping</h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-5">
              <label className="text-[11px] text-slate-400 block mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Spooky Organic Tea"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] text-slate-400 block mb-1">Price (KRW) *</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">Stock *</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-white"
              />
            </div>
            <div className="sm:col-span-10">
              <label className="text-[11px] text-slate-400 block mb-1">Video Asset Path *</label>
              <input
                type="text"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-amber-300 font-mono text-[11px]"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold py-2 rounded text-xs transition cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>
        </form>

        {/* Existing Products List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-400">Current Catalog ({products.length})</h3>
          <div className="divide-y divide-slate-800">
            {products.map(p => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{p.icon}</span>
                  <div className="truncate">
                    <p className="font-bold text-white truncate">{p.name.en}</p>
                    <p className="text-[11px] text-slate-400">KRW {p.price.toLocaleString()} · Stock: {p.stock}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteProduct(p.id)}
                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 transition cursor-pointer shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminStudioModal;
