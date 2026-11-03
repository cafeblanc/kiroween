import React, { useState } from 'react';
import { VoiceLabApp } from './modules/voice';
import { ProductItem, Language } from './types';
import { getUIStrings } from './i18n/translations';

const TEST_PRODUCTS: ProductItem[] = [
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
    timelineMarkers: []
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
    timelineMarkers: []
  }
];

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ko');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(TEST_PRODUCTS[0]);
  const ui = getUIStrings(lang);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Standalone Header */}
      <header className="px-4 py-2.5 border-b border-emerald-500/30 bg-slate-900/90 backdrop-blur flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">🎙️</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Kiroween Standalone Voice Chat Test Lab
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                Port 5180 • Isolated
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              완전 독립형 자연어 음성 채팅 & 14개 전문 분야 지식 라우터 & OpenAI Realtime 테스트 앱
            </p>
          </div>
        </div>

        {/* Product Selector & Language Selector */}
        <div className="flex items-center gap-2.5">
          {/* Product Switching */}
          <div className="flex bg-slate-950 border border-emerald-500/30 rounded-lg p-0.5">
            {TEST_PRODUCTS.map(p => {
              const shortName = p.id === 'prod-honey' ? ui.honeyShort : ui.teaShort;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    selectedProduct.id === p.id
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">🌐</span>
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Language)}
              className="bg-slate-900 border border-emerald-500/40 text-xs text-emerald-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-semibold cursor-pointer"
            >
              <option value="ko">한국어 (KO)</option>
              <option value="en">English (EN)</option>
              <option value="ja">日本語 (JA)</option>
              <option value="zh">中文 (ZH)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Standalone Voice Lab View */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <VoiceLabApp
          activeProduct={selectedProduct}
          products={TEST_PRODUCTS}
          lang={lang}
        />
      </main>
    </div>
  );
};
