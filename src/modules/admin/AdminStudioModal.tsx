import React, { useState } from 'react';
import { ProductItem, Language } from '../../types';

interface AdminStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onAddProduct: (prod: ProductItem) => void;
  onUpdateProduct: (prod: ProductItem) => void;
  onDeleteProduct: (id: string) => void;
  lang?: Language;
}

export const AdminStudioModal: React.FC<AdminStudioModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  lang = 'ko'
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(35000);
  const [stock, setStock] = useState(20);
  const [icon, setIcon] = useState('🎁');
  const [videoUrl, setVideoUrl] = useState('/videos/honey_demo.mp4');
  const [desc, setDesc] = useState('');

  // Editing product state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);
  const [editIcon, setEditIcon] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!isOpen) return null;

  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);

  const handleStartEdit = (prod: ProductItem) => {
    setEditingId(prod.id);
    setEditName(prod.name[lang] || prod.name.ko || prod.name.en);
    setEditPrice(prod.price);
    setEditStock(prod.stock);
    setEditIcon(prod.icon);
    setEditDesc(prod.description[lang] || prod.description.ko || prod.description.en || '');
  };

  const handleSaveEdit = (targetProd: ProductItem) => {
    if (!editName.trim()) return;

    const updated: ProductItem = {
      ...targetProd,
      name: {
        ...targetProd.name,
        [lang]: editName,
        ko: lang === 'ko' ? editName : targetProd.name.ko,
        en: lang === 'en' ? editName : targetProd.name.en
      },
      price: Number(editPrice) || targetProd.price,
      stock: Math.max(0, Number(editStock) || 0),
      icon: editIcon || targetProd.icon,
      description: {
        ...targetProd.description,
        [lang]: editDesc,
        ko: lang === 'ko' ? editDesc : targetProd.description.ko,
        en: lang === 'en' ? editDesc : targetProd.description.en
      }
    };

    onUpdateProduct(updated);
    setEditingId(null);
  };

  const handleQuickRestock = (prod: ProductItem, addQty: number) => {
    const updated: ProductItem = {
      ...prod,
      stock: (prod.stock || 0) + addQty
    };
    onUpdateProduct(updated);
  };

  const handleSubmitNew = (e: React.FormEvent) => {
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
      },
      timelineMarkers: []
    };

    onAddProduct(newProd);
    setName('');
    setDesc('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border-2 border-purple-500/70 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Kiroween Seller Studio (Admin)
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                실시간 상품 등록 · 수정 · 재고 보충(입고) 및 카탈로그 관리
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕ 닫기
          </button>
        </div>

        {/* Dashboard Metrics Banner */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-purple-500/30 p-2.5 rounded-xl shrink-0 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">총 등록 상품</span>
            <span className="text-sm font-extrabold text-purple-300 font-mono">{products.length}종</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] text-slate-400 block">총 잔여 재고</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">{totalStock}개</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">결제 연동 상태</span>
            <span className="text-sm font-extrabold text-blue-400">PayPal Active</span>
          </div>
        </div>

        {/* Register New Product Form */}
        <form onSubmit={handleSubmitNew} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2.5 shrink-0">
          <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
            <span>✨</span>
            <span>신규 라이브 상품 등록 (New Product)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-5">
              <label className="text-[10px] text-slate-400 block mb-0.5">상품명 *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 제주 유채꿀 세트"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:border-purple-400 outline-none"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] text-slate-400 block mb-0.5">판매가 (KRW) *</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-amber-300 font-bold text-xs focus:border-purple-400 outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 block mb-0.5">초기 재고 *</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-emerald-300 font-bold text-xs focus:border-purple-400 outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 block mb-0.5">아이콘</label>
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-white text-xs"
              />
            </div>
            <div className="sm:col-span-10">
              <label className="text-[10px] text-slate-400 block mb-0.5">동영상 비디오 에셋 경로</label>
              <input
                type="text"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-300 font-mono text-[11px]"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md"
              >
                + 상품 추가
              </button>
            </div>
          </div>
        </form>

        {/* Existing Products Catalog List with Edit & Restock */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300 px-1">
            <span>📦 등록된 카탈로그 목록 ({products.length}개)</span>
            <span className="text-[11px] text-slate-500 font-normal">재고를 클릭하여 즉시 보충하거나 정보를 수정할 수 있습니다</span>
          </div>

          <div className="divide-y divide-slate-800/80 bg-slate-950/60 border border-slate-800 rounded-xl px-3">
            {products.map(p => {
              const isEditing = editingId === p.id;

              if (isEditing) {
                return (
                  <div key={p.id} className="py-3 flex flex-col gap-2 bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/40 my-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">✏️ 상품 정보 수정</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded transition cursor-pointer"
                        >
                          💾 저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2 py-1 rounded transition cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block">상품명</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-400 block">가격 (KRW)</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={e => setEditPrice(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-amber-300 font-bold text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block">재고 수량</label>
                        <input
                          type="number"
                          value={editStock}
                          onChange={e => setEditStock(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-emerald-300 font-bold text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block">아이콘</label>
                        <input
                          type="text"
                          value={editIcon}
                          onChange={e => setEditIcon(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl p-1 bg-slate-900 rounded-lg border border-slate-800 shrink-0">{p.icon}</span>
                    <div className="truncate">
                      <p className="font-bold text-white truncate text-xs">
                        {p.name[lang] || p.name.ko || p.name.en}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-amber-300 font-mono font-bold">
                          {p.currency} {p.price.toLocaleString()}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className={`text-[11px] font-mono font-semibold ${p.stock <= 3 ? 'text-red-400' : 'text-emerald-400'}`}>
                          재고: {p.stock}개 {p.stock === 0 && '(품절)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Quick Restock & Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(p, 10)}
                      className="bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                      title="재고 10개 즉시 보충"
                    >
                      +10 입고
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(p)}
                      className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-[11px] font-semibold px-2 py-1 rounded transition cursor-pointer"
                    >
                      ✏️ 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(p.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[11px] px-2 py-1 rounded transition cursor-pointer"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStudioModal;
