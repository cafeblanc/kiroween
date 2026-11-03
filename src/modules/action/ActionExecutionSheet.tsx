import React, { useState, useEffect } from 'react';
import { ProductItem, ActionOrder, Language } from '../../types';
import { getUIStrings } from '../../i18n/translations';

interface ActionExecutionSheetProps {
  product: ProductItem | null;
  isOpen: boolean;
  lang?: Language;
  onClose: () => void;
  onSuccess: (order: ActionOrder) => void;
}

export const ActionExecutionSheet: React.FC<ActionExecutionSheetProps> = ({
  product,
  isOpen,
  lang = 'ko',
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal_wallet' | 'paypal_card'>('paypal_wallet');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const ui = getUIStrings(lang);

  // Reset quantity and show localized hint when opened
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setVoiceNotice(ui.checkoutVoiceTip);
      const timer = setTimeout(() => setVoiceNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, lang]);

  const totalAmount = (product?.price || 0) * quantity;
  const usdPrice = (totalAmount / 1350).toFixed(2);

  const handleExecute = () => {
    if (loading || !product) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newOrder: ActionOrder = {
        orderId: 'PAYPAL-' + Math.floor(100000 + Math.random() * 900000),
        productName: `${product.name[lang] || product.name.ko || product.name.en} (${quantity}${ui.unitCount})`,
        quantity,
        amount: totalAmount,
        currency: 'KRW',
        trackingNumber: 'PP-TRK-' + Date.now().toString().slice(-6),
        status: 'PayPal Verified & Dispatched',
        createdAt: new Date().toLocaleTimeString()
      };
      onSuccess(newOrder);
      onClose();
    }, 1200);
  };

  // Listen to Global Voice Commands for Button Names
  useEffect(() => {
    if (!isOpen) return;

    const handleVoiceAction = (e: any) => {
      const act = e.detail?.action;
      if (!act) return;

      if (act === 'increase') {
        setQuantity(q => {
          const next = q + 1;
          setVoiceNotice(`🗣️ ${ui.increaseBtn}: +1 (-> ${next}${ui.unitCount})`);
          return next;
        });
      } else if (act === 'decrease') {
        setQuantity(q => {
          const next = Math.max(1, q - 1);
          setVoiceNotice(`🗣️ ${ui.decreaseBtn}: -1 (-> ${next}${ui.unitCount})`);
          return next;
        });
      } else if (act === 'set_quantity' && typeof e.detail?.quantity === 'number') {
        const val = Math.max(1, e.detail.quantity);
        setQuantity(val);
        setVoiceNotice(`🗣️ ${val}${ui.unitCount}`);
      } else if (act === 'pay') {
        setVoiceNotice(`🗣️ ${ui.payBtn}...`);
        handleExecute();
      } else if (act === 'cancel') {
        setVoiceNotice(`🗣️ ${ui.cancelBtn}`);
        setTimeout(() => {
          onClose();
        }, 300);
      }
    };

    window.addEventListener('kiroween:checkout_action', handleVoiceAction);
    return () => {
      window.removeEventListener('kiroween:checkout_action', handleVoiceAction);
    };
  }, [isOpen, loading, totalAmount, quantity, product, lang]);

  // Early return ONLY after all hooks are executed (React Rules of Hooks)
  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative bg-slate-900/95 border-2 border-purple-400 rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-[0_0_50px_rgba(168,85,247,0.5)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto ring-1 ring-purple-500/30"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                {ui.checkoutTitle}
                <span className="text-[10px] bg-purple-600/60 text-purple-200 border border-purple-400/50 px-2 py-0.5 rounded-full font-bold">
                  {ui.checkoutSubtitle}
                </span>
              </h3>
              <p className="text-[10px] text-purple-300">{ui.checkoutVoiceTip}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 shadow"
          >
            <span>✕ {ui.cancelBtn}</span>
          </button>
        </div>

        {/* Real-time Voice Notice Banner */}
        {voiceNotice && (
          <div className="bg-purple-900/90 border border-purple-400 px-3 py-1.5 rounded-xl text-xs text-purple-100 flex items-center gap-1.5 shadow">
            <span className="text-sm animate-pulse">🎙️</span>
            <span className="font-semibold text-[11px]">{voiceNotice}</span>
          </div>
        )}

        {/* Product Box */}
        <div className="bg-slate-800/80 border border-purple-500/30 p-3 rounded-xl flex items-center gap-3 shadow-md">
          <span className="text-3xl p-1 bg-purple-900/40 rounded-lg border border-purple-500/40 shrink-0">
            {product.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white truncate">
                {product.name[lang] || product.name.ko || product.name.en}
              </p>
              <span className="text-[10px] text-emerald-300 font-bold shrink-0">
                {ui.inStock}: {product.stock}{ui.unitCount}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-amber-300 font-extrabold">
                {ui.unitPrice}: {product.currency} {product.price.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-300 font-mono">(${((product.price) / 1350).toFixed(2)} USD)</span>
            </div>
          </div>
        </div>

        {/* Quantity Stepper with Voice Commands */}
        <div className="bg-slate-800/80 border border-purple-500/30 p-3 rounded-xl flex flex-col gap-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-200 flex items-center gap-1">
              <span>📦 {ui.quantitySelect}</span>
              <span className="text-[9px] bg-purple-900/50 text-purple-200 px-1.5 py-0.2 rounded border border-purple-500/40 font-bold">
                {ui.voiceControllable}
              </span>
            </span>
            <span className="text-xs font-bold text-amber-300 font-mono">{quantity}{ui.unitCount}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Decrease button */}
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600 text-white py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow"
            >
              <span className="text-sm font-extrabold">➖ {ui.decreaseBtn}</span>
              <span className="text-[10px] text-amber-300 font-mono">"{ui.decreaseBtn}"</span>
            </button>

            {/* Display quantity */}
            <div className="px-4 py-1.5 bg-slate-900 border-2 border-purple-400 rounded-xl text-center shrink-0 min-w-[70px] shadow-inner">
              <span className="text-base font-extrabold text-amber-400 font-mono">{quantity}</span>
              <span className="text-[10px] text-slate-300 block">{ui.unitCount}</span>
            </div>

            {/* Increase button */}
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="flex-1 bg-purple-700/80 hover:bg-purple-600 border border-purple-400 text-white py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow"
            >
              <span className="text-sm font-extrabold">➕ {ui.increaseBtn}</span>
              <span className="text-[10px] text-amber-300 font-mono">"{ui.increaseBtn}"</span>
            </button>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-300 font-bold">{ui.paymentMethodTitle}:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal_wallet')}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer shadow-sm ${
                paymentMethod === 'paypal_wallet'
                  ? 'bg-blue-900/60 border-2 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-lg">🅿️</span>
              <div>
                <p className="text-xs font-bold text-blue-300">{ui.paypalWallet}</p>
                <p className="text-[9px] text-slate-400">One-click Instant</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('paypal_card')}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer shadow-sm ${
                paymentMethod === 'paypal_card'
                  ? 'bg-blue-900/60 border-2 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-lg">💳</span>
              <div>
                <p className="text-xs font-bold text-slate-200">{ui.paypalCard}</p>
                <p className="text-[9px] text-slate-400">Visa · Master · Amex</p>
              </div>
            </button>
          </div>
        </div>

        {/* Total Price Summary */}
        <div className="bg-slate-800/90 p-2.5 rounded-xl border border-purple-500/30 flex items-center justify-between shadow-md">
          <span className="text-xs text-slate-200 font-bold">
            {ui.totalAmount} ({quantity}{ui.unitCount}):
          </span>
          <div className="text-right">
            <span className="text-sm font-extrabold text-amber-400 font-mono">
              {product.currency} {totalAmount.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-300 font-mono ml-1.5">
              (${usdPrice} USD)
            </span>
          </div>
        </div>

        {/* Action Buttons: Cancel vs Pay */}
        <div className="grid grid-cols-12 gap-2 mt-1">
          {/* Cancel button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="col-span-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold py-3 rounded-xl text-xs border border-slate-600 transition flex flex-col items-center justify-center cursor-pointer shadow"
          >
            <span className="text-xs font-extrabold">✕ {ui.cancelBtn}</span>
            <span className="text-[10px] text-amber-300 font-mono">"{ui.cancelBtn}"</span>
          </button>

          {/* Pay button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleExecute}
            className="col-span-8 bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 active:scale-95 disabled:opacity-50 text-slate-950 font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow-xl transition flex flex-col items-center justify-center cursor-pointer"
          >
            {loading ? (
              <span className="text-slate-950 font-bold flex items-center gap-1.5">
                <span className="animate-spin">⏳</span>
                <span>{ui.processingPayment}</span>
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1 font-extrabold text-sm">
                  <span>🚀 {ui.payBtn}</span>
                  <span>({product.currency} {totalAmount.toLocaleString()})</span>
                </span>
                <span className="text-[10px] text-slate-950 font-bold">"{ui.payBtn}"</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionExecutionSheet;
