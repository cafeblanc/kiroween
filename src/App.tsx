import React, { useState, useEffect } from 'react';
import { StreamPlayer } from './modules/stream/StreamPlayer';
import { AgentChat } from './modules/agent/AgentChat';
import { ActionExecutionSheet } from './modules/action/ActionExecutionSheet';
import { AdminStudioModal } from './modules/admin/AdminStudioModal';
import { PayPalReceiptModal } from './modules/action/PayPalReceiptModal';
import { VoiceLabApp, executeVoiceButtonCommand, setCheckoutModalState } from './modules/voice';
import { ProductItem, ActionOrder, Language } from './types';
import { getUIStrings } from './i18n/translations';
import { ErrorBoundary } from './ErrorBoundary';

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
  const [lang, setLang] = useState<Language>('ko');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Sync checkout modal open state with voice button controller
  useEffect(() => {
    setCheckoutModalState(isActionOpen);
  }, [isActionOpen]);

  // Native Web Speech recognition fallback for instant zero-latency button command execution
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition: any = null;
    let isStoppedManually = false;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      const langMap: Record<Language, string> = {
        ko: 'ko-KR',
        en: 'en-US',
        ja: 'ja-JP',
        zh: 'zh-CN',
        es: 'es-ES',
        fr: 'fr-FR'
      };
      recognition.lang = langMap[lang] || 'ko-KR';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0]) {
            const transcript = (res[0].transcript || '').trim();
            if (transcript) {
              executeVoiceButtonCommand(transcript);
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isStoppedManually = true;
          console.log('[NativeSpeechRecognition] Mic permission not granted, stopping loop.');
          return;
        }
        if (e.error !== 'no-speech') {
          console.log('[NativeSpeechRecognition] Notice:', e.error);
        }
      };

      recognition.onend = () => {
        if (!isStoppedManually) {
          setTimeout(() => {
            if (!isStoppedManually) {
              try {
                recognition.start();
              } catch (_) {}
            }
          }, 1000);
        }
      };

      recognition.start();
    } catch (e) {
      console.log('[NativeSpeechRecognition] Init notice:', e);
    }

    return () => {
      isStoppedManually = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
    };
  }, [lang]);

  // Global listener for voice button commands across all views
  useEffect(() => {
    const handleGlobalCheckout = (e: any) => {
      const prod = e.detail?.product || activeProduct;
      if (prod) {
        setActiveProduct(prod);
      }
      setIsActionOpen(true);
      setVoiceNotice(`${ui.voiceToastPrefix}"${ui.checkoutBtn}"`);
    };

    const handleSwitchView = (e: any) => {
      const targetView = e.detail?.view;
      if (targetView === 'main' || targetView === 'voicelab') {
        setCurrentView(targetView);
        setVoiceNotice(`${ui.voiceToastPrefix}"${targetView === 'main' ? ui.liveTab : ui.voiceLabTab}"`);
      }
    };

    const handleOpenAdmin = () => {
      setIsAdminOpen(true);
      setVoiceNotice(`${ui.voiceToastPrefix}"${ui.adminBtn}"`);
    };

    const handleSelectProduct = (e: any) => {
      const pid = e.detail?.productId;
      const found = products.find(p => p.id === pid);
      if (found) {
        setActiveProduct(found);
        setVoiceNotice(`${ui.voiceToastPrefix}"${found.id === 'prod-honey' ? ui.honeyShort : ui.teaShort}"`);
      }
    };

    const handleCloseModal = () => {
      setIsActionOpen(false);
      setIsAdminOpen(false);
      setIsReceiptOpen(false);
    };

    const handleVoiceToast = (e: any) => {
      const btn = e.detail?.detail?.buttonName || e.detail?.eventName;
      if (btn) {
        setVoiceNotice(`${ui.voiceToastPrefix}"${btn}"`);
      }
    };

    window.addEventListener('kiroween:open_checkout', handleGlobalCheckout);
    window.addEventListener('kiroween:switch_view', handleSwitchView);
    window.addEventListener('kiroween:open_admin', handleOpenAdmin);
    window.addEventListener('kiroween:select_product', handleSelectProduct);
    window.addEventListener('kiroween:close_modal', handleCloseModal);
    window.addEventListener('kiroween:voice_button_toast', handleVoiceToast);

    return () => {
      window.removeEventListener('kiroween:open_checkout', handleGlobalCheckout);
      window.removeEventListener('kiroween:switch_view', handleSwitchView);
      window.removeEventListener('kiroween:open_admin', handleOpenAdmin);
      window.removeEventListener('kiroween:select_product', handleSelectProduct);
      window.removeEventListener('kiroween:close_modal', handleCloseModal);
      window.removeEventListener('kiroween:voice_button_toast', handleVoiceToast);
    };
  }, [activeProduct, products, lang]);

  // Auto-dismiss voice feedback toast after 2 seconds
  useEffect(() => {
    if (voiceNotice) {
      const timer = setTimeout(() => setVoiceNotice(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [voiceNotice]);

  const handleActionSuccess = (order: ActionOrder) => {
    setLatestOrder(order);
    setSuccessToast(order);
    // Dismiss success toast after exactly 2 seconds as requested
    setTimeout(() => {
      setSuccessToast(null);
    }, 2000);

    setIsReceiptOpen(true);
    if (activeProduct) {
      const deductQty = order.quantity || 1;
      const updatedStock = Math.max(0, activeProduct.stock - deductQty);
      setActiveProduct(prev => (prev ? { ...prev, stock: updatedStock } : null));
      setProducts(prev =>
        prev.map(p => (p.id === activeProduct.id ? { ...p, stock: updatedStock } : p))
      );
    }
  };

  const handleAddProduct = (newProd: ProductItem) => {
    setProducts(prev => [newProd, ...prev]);
    setActiveProduct(newProd);
  };

  const handleUpdateProduct = (updatedProd: ProductItem) => {
    setProducts(prev => prev.map(p => (p.id === updatedProd.id ? updatedProd : p)));
    if (activeProduct?.id === updatedProd.id) {
      setActiveProduct(updatedProd);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (activeProduct?.id === id) {
      setActiveProduct(products.find(p => p.id !== id) || null);
    }
  };

  const ui = getUIStrings(lang);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎃</span>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              {ui.appTitle}
            </h1>
            <p className="text-[10px] text-slate-400">{ui.appSubtitle}</p>
          </div>

          {/* View Switcher: Live Stream vs Dedicated Voice Module Lab */}
          <div className="ml-2 sm:ml-4 flex bg-slate-950 border border-purple-500/30 rounded-lg p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                currentView === 'main'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={ui.liveTabTip}
            >
              <span>📺</span>
              <span>{ui.liveTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('voicelab')}
              className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                currentView === 'voicelab'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-white'
              }`}
              title={ui.voiceLabTabTip}
            >
              <span>🎙️</span>
              <span>{ui.voiceLabTab}</span>
            </button>
          </div>
        </div>

        {/* Product Switcher, Admin Button & Language Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/40 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
            title={ui.adminBtnTip}
          >
            <span>⚙️</span>
            <span>{ui.adminBtn}</span>
          </button>

          <div className="flex bg-slate-950 border border-slate-700 rounded-lg p-0.5">
            {products.map(p => {
              const shortName = p.id === 'prod-honey' ? ui.honeyShort : ui.teaShort;
              const tip = p.id === 'prod-honey' ? ui.honeyTip : ui.teaTip;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProduct(p)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    activeProduct?.id === p.id ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title={tip}
                >
                  <span>{p.icon}</span>
                  <span>{shortName}</span>
                </button>
              );
            })}
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
          <ErrorBoundary compact fallbackTitle="음성 대화 랩 모듈 오류">
            <VoiceLabApp
              onBackToMain={() => setCurrentView('main')}
              activeProduct={activeProduct}
              products={products}
              lang={lang}
            />
          </ErrorBoundary>
        </div>
      ) : (
        <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-1.5 sm:gap-3 p-1.5 sm:p-3 overflow-hidden">
          {/* Left: Stream Player Module (모바일에서 비디오를 최대 크기로 키워 액션 바가 채팅창 바로 위에 밀착 배치: h-[76%]) */}
          <section className="h-[76%] sm:h-[73%] md:h-full md:col-span-7 flex flex-col min-h-0">
            <ErrorBoundary compact fallbackTitle="비디오 플레이어 모듈 오류">
              <StreamPlayer
                product={activeProduct}
                onSelectAction={() => setIsActionOpen(true)}
                lang={lang}
              />
            </ErrorBoundary>
          </section>

          {/* Right: Agentic Chat Module (하단 채팅창) */}
          <section className="flex-1 min-h-0 md:h-full md:col-span-5 flex flex-col">
            <ErrorBoundary compact fallbackTitle="AI 쇼호스트 채팅 모듈 오류">
              <AgentChat
                lang={lang}
                activeProduct={activeProduct}
                onTriggerAction={prod => {
                  setActiveProduct(prod);
                  setIsActionOpen(true);
                }}
              />
            </ErrorBoundary>
          </section>
        </main>
      )}

      {/* Action Execution Modal (Main Live View) */}
      {currentView === 'main' && (
        <ActionExecutionSheet
          product={activeProduct}
          isOpen={isActionOpen}
          lang={lang}
          onClose={() => setIsActionOpen(false)}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Admin Studio Modal */}
      <AdminStudioModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        lang={lang}
      />

      {/* Official PayPal Order Receipt & Logistics Tracking Modal */}
      <PayPalReceiptModal
        order={latestOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        lang={lang}
      />

      {/* Voice Button Click Feedback Toast */}
      {voiceNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 bg-purple-950/95 border border-purple-400 text-purple-200 px-4 py-2 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top duration-150 backdrop-blur">
          <span className="text-base animate-pulse">🎙️</span>
          <span className="text-xs font-bold text-white">{voiceNotice}</span>
        </div>
      )}

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
