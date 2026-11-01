import React, { useState } from 'react';
import { ProductItem, ActionOrder } from '../../types';

interface ActionExecutionSheetProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: ActionOrder) => void;
}

export const ActionExecutionSheet: React.FC<ActionExecutionSheetProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  const handleExecute = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newOrder: ActionOrder = {
        orderId: 'KIRO-' + Math.floor(100000 + Math.random() * 900000),
        productName: product.name.en,
        amount: product.price,
        currency: product.currency,
        trackingNumber: 'TRK-' + Date.now().toString().slice(-6),
        status: 'Confirmed & Dispatched',
        createdAt: new Date().toLocaleTimeString()
      };
      onSuccess(newOrder);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-900 border border-purple-500/50 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-sm font-bold text-white">Autonomous Action Execution</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
          >
            ✕ Close
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <span className="text-3xl">{product.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{product.name.en}</p>
            <p className="text-xs text-amber-400 font-extrabold">{product.currency} {product.price.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time stock: {product.stock} units</p>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-1 text-[11px] text-slate-300">
          <p className="font-semibold text-purple-400">🛡️ Agent Verification & Security</p>
          <p className="text-slate-400">Target Pipeline: PayPal Sandbox Gateway / Instant Fulfillment</p>
          <p className="text-slate-400">Destination: Seoul, South Korea (Direct Dispatch)</p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleExecute}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>⏳ Executing In-Stream Transaction...</span>
          ) : (
            <span>🚀 Execute In-Stream Order with PayPal</span>
          )}
        </button>
      </div>
    </div>
  );
};
export default ActionExecutionSheet;
