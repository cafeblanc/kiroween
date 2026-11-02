import React, { useState, useEffect } from 'react';
import { StreamPlayer } from './modules/stream/StreamPlayer';
import { AgentChat } from './modules/agent/AgentChat';
import { ActionExecutionSheet } from './modules/action/ActionExecutionSheet';
import { AdminStudioModal } from './modules/admin/AdminStudioModal';
import { PayPalReceiptModal } from './modules/action/PayPalReceiptModal';
import { VoiceLabApp } from './modules/voice';
import { ProductItem, ActionOrder, Language } from './types';

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-honey',
    name: {
      en: 'Organic Acacia Honey (500g)',
      ko: '양평 친환경 아카시아 벌꿀 (500g)',
      ja: '有機栽培アカシア蜂蜜 (500g)',
      zh: '有机洋槐蜂蜜 (500g)',
      es: 'Miel Orgánica de Acacia (500g)',
      fr: 'Miel d Acacia Biologique (500g)'
    },
    price: 32000,
    currency: 'KRW',
    stock: 24,
    icon: '🍯',
    videoUrl: '/videos/honey_demo.mp4',
    description: {
      en: '100% Pure natural organic honey harvested from Yangpyeong mountains.',
      ko: '맑은 물 양평 청정 자연에서 채밀한 100% 순수 천연 아카시아 벌꿀입니다.',
      ja: '楊平の清らかな自然の中で採取された100%純粋な天然アカシア蜂蜜です。',
      zh: '采自杨平纯净山野的100%纯天然洋槐蜂蜜。',
      es: 'Miel de acacia 100% pura y natural recolectada en las montañas vírgenes.',
      fr: 'Miel d acacia 100% pur et naturel récolté dans la nature préservée.'
    },
    timelineMarkers: [
      {
        timeSeconds: 0,
        icon: '🍯',
        label: {
          en: 'Product Intro: 100% Pure Acacia Honey (500g)',
          ko: '라이브 소개: 100% 순수 아카시아 벌꿀 (500g)',
          ja: '商品紹介：100％純粋アカシア蜂蜜（500g）',
          zh: '商品介绍：100%纯天然洋槐蜂蜜 (500g)',
          es: 'Presentación: Miel Pura de Acacia (500g)',
          fr: 'Présentation: Miel Pur d Acacia (500g)'
        }
      },
      {
        timeSeconds: 7,
        icon: '🏔️',
        label: {
          en: 'Pure Harvest: Sourced from Pristine Nature',
          ko: '원산지 확인: 청정 양평 산지 직송 무첨가 생꿀',
          ja: '原産地確認：楊平の清浄な山地直送',
          zh: '产地认证：杨平清净高山直采无添加',
          es: 'Cosecha de Origen: Montañas Vírgenes Sin Aditivos',
          fr: 'Origine Certifiée: Récolte Sauvage Pure'
        }
      },
      {
        timeSeconds: 16,
        icon: '📜',
        label: {
          en: 'Certified Lab Analysis: 1+ Premium Grade Quality',
          ko: '품질 검증: 한국양봉협회 1+ 최고등급 공인 인증',
          ja: '品質認証：韓国養蜂協会 1+最高等級認定',
          zh: '权威检测：1+特级蜂产质检认证',
          es: 'Certificación Oficial: Grado 1+ Premium',
          fr: 'Analyse en Laboratoire: Qualité 1+ Supérieure'
        }
      },
      {
        timeSeconds: 28,
        icon: '⚡',
        label: {
          en: 'Instant In-Stream Purchase via PayPal Active',
          ko: '실시간 주문: 페이팔 원클릭 즉시 결제 활성',
          ja: '即時注文：PayPalワンクリック決済利用可能',
          zh: '即刻下单：支持PayPal一键极速结账',
          es: 'Compra Instantánea: PayPal Express Activo',
          fr: 'Paiement Immédiat: PayPal Express Disponible'
        }
      }
    ]
  },
  {
    id: 'prod-tea',
    name: {
      en: 'Handmade Traditional Herbal Tea Set',
      ko: '핸드메이드 전통차 선물 세트',
      ja: 'ハンドメイド伝統茶ギフトセット',
      zh: '手工传统茶礼盒',
      es: 'Set de Té Herbal Tradicional Hecho a Mano',
      fr: 'Coffret de Thé Traditionnel Fait Main'
    },
    price: 48000,
    currency: 'KRW',
    stock: 15,
    icon: '🍵',
    videoUrl: '/videos/tea_demo.mp4',
    description: {
      en: 'Handmade traditional herbal tea set crafted with carefully selected ingredients.',
      ko: '엄선된 전통 원료를 정성껏 덖아 만든 수제 전통차 선물 세트입니다.',
      ja: '厳選された伝統原料を丁寧に焙煎して作った手作り伝統茶ギフトセットです。',
      zh: '精选传统原料精心烘焙的手工传统茶礼盒。',
      es: 'Set de té tradicional hecho a mano con ingredientes seleccionados.',
      fr: 'Coffret de thé traditionnel fait main préparé avec soin.'
    },
    timelineMarkers: [
      {
        timeSeconds: 0,
        icon: '🍵',
        label: {
          en: 'Artisanal Herbal Tea Presentation',
          ko: '장인 수제 전통차 기획 선물 세트',
          ja: '職人手作り伝統茶ギフトセット',
          zh: '手工传统养生茶礼盒呈现',
          es: 'Presentación del Set de Té Artesanal',
          fr: 'Coffret de Thé Artisanal'
        }
      },
      {
        timeSeconds: 12,
        icon: '🌿',
        label: {
          en: 'Traditional Roasting: 9-times Steamed & Sun-dried',
          ko: '구증구포 전통 덖음 기법 & 은은한 풍미',
          ja: '九蒸九曝の伝統焙煎法と深い風味',
          zh: '古法九蒸九晒慢焙工艺',
          es: 'Tostado Tradicional Artesano',
          fr: 'Torréfaction Traditionnelle Délicate'
        }
      },
      {
        timeSeconds: 24,
        icon: '⚡',
        label: {
          en: 'Gift Box Wrapping & PayPal Express Available',
          ko: '고급 비단 보자기 포장 & 페이팔 즉시 결제',
          ja: '高級ギフト包装 ＆ PayPal即時決済',
          zh: '附赠精美丝绸礼袋 ＆ 支持PayPal',
          es: 'Envoltorio de Regalo y Pago PayPal',
          fr: 'Emballage Cadeau & Paiement PayPal'
        }
      }
    ]
  }
];

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'main' | 'voicelab'>('main');
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [activeProduct, setActiveProduct] = useState<ProductItem | null>(INITIAL_PRODUCTS[0]);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<ActionOrder | null>(null);
  const [successToast, setSuccessToast] = useState<ActionOrder | null>(null);
  const [lang, setLang] = useState<Language>('en');

  // Global listener for voice checkout events across all views
  useEffect(() => {
    const handleGlobalCheckout = (e: any) => {
      const prod = e.detail?.product || activeProduct;
      if (prod) {
        setActiveProduct(prod);
      }
      setIsActionOpen(true);
    };
    window.addEventListener('kiroween:open_checkout', handleGlobalCheckout);
    return () => {
      window.removeEventListener('kiroween:open_checkout', handleGlobalCheckout);
    };
  }, [activeProduct]);

  const handleActionSuccess = (order: ActionOrder) => {
    setLatestOrder(order);
    setSuccessToast(order);
    // Dismiss success toast after exactly 2 seconds as requested
    setTimeout(() => {
      setSuccessToast(null);
    }, 2000);

    setIsReceiptOpen(true);
    if (activeProduct) {
      setProducts(prev =>
        prev.map(p => (p.id === activeProduct.id ? { ...p, stock: Math.max(0, p.stock - 1) } : p))
      );
    }
  };

  const handleAddProduct = (newProd: ProductItem) => {
    setProducts(prev => [newProd, ...prev]);
    setActiveProduct(newProd);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (activeProduct?.id === id) {
      setActiveProduct(products.find(p => p.id !== id) || null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎃</span>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Kiroween Agentic Video Stream
            </h1>
            <p className="text-[10px] text-slate-400">Spec-driven Multimodal Execution Architecture</p>
          </div>

          {/* View Switcher: Live Stream vs Dedicated Voice Module Lab */}
          <div className="ml-2 sm:ml-4 flex bg-slate-950 border border-purple-500/30 rounded-lg p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentView === 'main'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📺</span>
              <span className="hidden sm:inline">Live Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('voicelab')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentView === 'voicelab'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              <span>🎙️</span>
              <span>Voice Lab (음성 독립 테스트)</span>
            </button>
          </div>
        </div>

        {/* Product Switcher, Admin Button & Language Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Admin Studio</span>
          </button>

          <div className="flex bg-slate-950 border border-slate-700 rounded-lg p-0.5">
            {products.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProduct(p)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeProduct?.id === p.id ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{p.icon}</span>
                <span className="hidden sm:inline">{p.name[lang] || p.name.en}</span>
              </button>
            ))}
          </div>

          <select
            value={lang}
            onChange={e => setLang(e.target.value as Language)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value="en">English (EN)</option>
            <option value="ko">한국어 (KO)</option>
            <option value="ja">日本語 (JA)</option>
            <option value="zh">中文 (ZH)</option>
            <option value="es">Español (ES)</option>
            <option value="fr">Français (FR)</option>
          </select>
        </div>
      </header>

      {/* Main Workspace: Modular Split View vs Standalone Voice Lab */}
      {currentView === 'voicelab' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <VoiceLabApp
            onBackToMain={() => setCurrentView('main')}
            activeProduct={activeProduct}
            products={products}
          />
        </div>
      ) : (
        <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1.5 sm:gap-3 p-1.5 sm:p-3 overflow-hidden">
          {/* Left: Stream Player Module (모바일에서 비디오를 최대 크기로 키워 액션 바가 채팅창 바로 위에 밀착 배치: h-[76%]) */}
          <section className="h-[76%] sm:h-[73%] md:h-full md:col-span-7 flex flex-col min-h-0">
            <StreamPlayer
              product={activeProduct}
              onSelectAction={() => setIsActionOpen(true)}
              lang={lang}
            />
          </section>

          {/* Right: Agentic Chat Module (하단 채팅창) */}
          <section className="flex-1 min-h-0 md:h-full md:col-span-5 flex flex-col">
            <AgentChat
              lang={lang}
              activeProduct={activeProduct}
              onTriggerAction={prod => {
                setActiveProduct(prod);
                setIsActionOpen(true);
              }}
            />
          </section>
        </main>
      )}

      {/* Action Execution Modal */}
      <ActionExecutionSheet
        product={activeProduct}
        isOpen={isActionOpen}
        onClose={() => setIsActionOpen(false)}
        onSuccess={handleActionSuccess}
      />

      {/* Admin Studio Modal */}
      <AdminStudioModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Official PayPal Order Receipt & Logistics Tracking Modal */}
      <PayPalReceiptModal
        order={latestOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        lang={lang}
      />

      {/* Success Toast (Automatically disappears in 2 seconds) */}
      {successToast && (
        <div className="fixed top-14 right-4 bg-emerald-600 border border-emerald-400 text-white p-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-xs font-bold">Action Completed Successfully!</p>
            <p className="text-[11px] opacity-90">ID: {successToast.orderId} · Tracking: {successToast.trackingNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
