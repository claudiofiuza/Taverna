import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MENU_ITEMS, MenuItem, RECIPES, ALL_INGREDIENTS } from './constants';
import { Coins, Trash2, Plus, Minus, Receipt, Copy, Check, Package, Calculator, Info, Camera, Loader2, Sparkles, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface OrderState {
  [key: string]: number;
}

interface StockState {
  [key: string]: number;
}

interface PurchaseItem {
  qty: number;
  price: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'stock' | 'purchases'>('calculator');
  const [order, setOrder] = useState<OrderState>({});
  const [stock, setStock] = useState<StockState>({});
  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<{[key: string]: PurchaseItem}>({});
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateQuantity = (id: string, delta: number) => {
    setOrder(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const updateStock = (name: string, value: number) => {
    setStock(prev => {
      if (value <= 0) {
        const { [name]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [name]: value };
    });
  };

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsScanning(true);
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const prompt = `Analise este print do inventário do Conan RP. 
      Extraia os nomes dos ingredientes e suas quantidades.
      Retorne APENAS um objeto JSON onde a chave é o nome do ingrediente e o valor é a quantidade (número).
      Tente mapear os nomes para estes ingredientes conhecidos se possível: ${ALL_INGREDIENTS.join(', ')}.
      Se o nome for muito diferente, use o nome que aparece na imagem.
      Exemplo de retorno: {"Mel": 50, "Trigo": 20}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              }
            ]
          }
        ]
      });

      const text = result.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        setStock(prev => {
          const newStock = { ...prev };
          Object.entries(extractedData).forEach(([name, qty]) => {
            const numQty = Number(qty);
            if (!isNaN(numQty)) {
              newStock[name] = (newStock[name] || 0) + numQty;
            }
          });
          return newStock;
        });
      }
    } catch (error) {
      console.error("Erro ao escanear imagem:", error);
      alert("Houve um erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
            // Switch to stock tab if an image is pasted
            setActiveTab('stock');
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImage]);

  const clearOrder = () => setOrder({});
  const clearStock = () => setStock({});

  const totalBronze = useMemo(() => {
    return Object.entries(order).reduce((acc, [id, qty]) => {
      const item = MENU_ITEMS.find(i => i.id === id);
      const price = item ? item.priceBz : 0;
      return acc + (Number(price) * Number(qty));
    }, 0);
  }, [order]);

  const currency = useMemo(() => {
    const gold = Math.floor(totalBronze / 10000);
    const remainingAfterGold = totalBronze % 10000;
    const silver = Math.floor(remainingAfterGold / 100);
    const bronze = remainingAfterGold % 100;
    return { gold, silver, bronze };
  }, [totalBronze]);

  const productionCapacity = useMemo(() => {
    return RECIPES.map(recipe => {
      const item = MENU_ITEMS.find(i => i.id === recipe.menuItemId);
      let maxCanMake = Infinity;

      recipe.ingredients.forEach(ing => {
        const currentStock = stock[ing.name] || 0;
        const canMakeWithThis = Math.floor(currentStock / ing.amount);
        maxCanMake = Math.min(maxCanMake, canMakeWithThis);
      });

      return {
        ...recipe,
        itemName: item?.name || 'Item Desconhecido',
        canMake: maxCanMake === Infinity ? 0 : maxCanMake
      };
    }).sort((a, b) => b.canMake - a.canMake);
  }, [stock]);

  const totalPurchaseBronze = useMemo(() => {
    return Object.values(purchaseItems).reduce((acc: number, curr: PurchaseItem) => acc + (curr.qty * curr.price), 0);
  }, [purchaseItems]);

  const purchaseCurrency = useMemo(() => {
    const gold = Math.floor(totalPurchaseBronze / 10000);
    const remainingAfterGold = totalPurchaseBronze % 10000;
    const silver = Math.floor(remainingAfterGold / 100);
    const bronze = remainingAfterGold % 100;
    return { gold, silver, bronze };
  }, [totalPurchaseBronze]);

  const sendToDiscord = async () => {
    const webhookUrl = 'https://discord.com/api/webhooks/1486473047543386158/9eiT-ngiXNgdC_mctUWx2egMMi31FSm_niq667UtyCBSVwMp7sOeM8DovZflBAPWs_Ll';
    
    const items = Object.entries(purchaseItems)
      .filter(([_, data]) => (data as PurchaseItem).qty > 0)
      .map(([name, data]) => {
        const item = data as PurchaseItem;
        return {
          name: `📦 ${name}`,
          value: `**Qtd:** ${item.qty} | **Preço:** ${item.price}bz\n**Subtotal:** ${item.qty * item.price}bz`,
          inline: true
        };
      });

    if (items.length === 0) {
      alert("Adicione pelo menos um item para registrar a compra.");
      return;
    }

    setIsSending(true);

    const totalStr = `${purchaseCurrency.gold > 0 ? `${purchaseCurrency.gold} Ouro, ` : ''}${purchaseCurrency.silver > 0 ? `${purchaseCurrency.silver} Prata, ` : ''}${purchaseCurrency.bronze} Bronze`;

    const embed = {
      title: "📜 Registro de Compra - Taverna Lobo Branco",
      description: `O taverneiro realizou uma nova aquisição de suprimentos para o estoque.`,
      color: 0xf59e0b, // Amber 500
      thumbnail: {
        url: "https://i.imgur.com/8Y8X8X8.png" // Placeholder for tavern logo if available
      },
      fields: [
        { name: "👤 Comprador", value: buyerName || "Taverneiro", inline: true },
        { name: "🤝 Vendedor", value: sellerName || "Vendedor Ambulante", inline: true },
        { name: "💰 Valor Total da Compra", value: `**${totalStr}** (${totalPurchaseBronze}bz)`, inline: false },
        { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: " ", inline: false },
        ...items
      ],
      footer: { text: "Sistema de Gestão - Taverna Lobo Branco" },
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });

      if (response.ok) {
        alert("Compra registrada com sucesso no Discord!");
        setPurchaseItems({});
        setSellerName('');
      } else {
        throw new Error("Falha ao enviar para o Discord");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar compra. Verifique o console.");
    } finally {
      setIsSending(false);
    }
  };

  const categories = ['PROMOÇÕES', 'PRATOS DA CASA', 'COMIDAS', 'BEBIDAS'] as const;

  const copySummary = () => {
    const lines = Object.entries(order)
      .map(([id, qty]) => {
        const item = MENU_ITEMS.find(i => i.id === id);
        const price = item ? item.priceBz : 0;
        return `${qty}x ${item?.name} (${Number(price) * Number(qty)}bz)`;
      });
    
    const totalStr = `Total: ${currency.gold > 0 ? `${currency.gold} Ouro, ` : ''}${currency.silver > 0 ? `${currency.silver} Prata, ` : ''}${currency.bronze} Bronze`;
    
    const text = `--- PEDIDO TAVERNA ---\n${lines.join('\n')}\n--------------------\n${totalStr}`;
    
    navigator.clipboard.writeText(text.replace(/\./g, ','));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#e0e0e0] font-sans p-3 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-row items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="text-amber-500" size={24} />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                Taverna Lobo Branco
              </h1>
              <p className="text-[10px] text-white/40 italic">Sistema de Gestão</p>
            </div>
          </div>
          
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'calculator' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Calculator size={14} />
              Calculadora
            </button>
            <button 
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'stock' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <Package size={14} />
              Estoque
            </button>
            <button 
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'purchases' ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <ShoppingBag size={14} />
              Compras
            </button>
          </div>
        </header>

        {activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Menu Section */}
            <div className="md:col-span-7 lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6">
                {categories.map(category => (
                  <section key={category} className="space-y-3 min-w-0">
                    <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-500/80 border-l-2 border-amber-500/50 pl-2 mb-2">
                      {category}
                    </h2>
                    <div className="grid gap-2">
                      {MENU_ITEMS.filter(item => item.category === category).map(item => (
                        <div 
                          key={item.id}
                          className="group flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all min-w-0"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <h3 className="text-sm font-medium text-white/90 truncate" title={item.name}>
                              {item.name}
                            </h3>
                            <p className="text-[10px] text-white/40">{item.priceBz.toString().replace('.', ',')} bz</p>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 shrink-0">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={order[item.id] || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setOrder(prev => {
                                  if (isNaN(val) || val <= 0) {
                                    const { [item.id]: _, ...rest } = prev;
                                    return rest;
                                  }
                                  return { ...prev, [item.id]: val };
                                });
                              }}
                              className="w-10 text-center font-mono text-xs font-bold text-amber-400 bg-transparent border-none focus:ring-0 p-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {/* Checkout Section */}
            <div className="md:col-span-5 lg:col-span-4">
              <div className="sticky top-4 space-y-4">
                {/* Total Card */}
                <div className="bg-[#252525] rounded-xl p-4 border border-white/10 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-white/80">
                      <Receipt size={16} />
                      <h2 className="font-bold uppercase tracking-wider text-xs">Resumo</h2>
                    </div>
                    <button 
                      onClick={clearOrder}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-amber-500/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Ouro</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-mono font-bold text-amber-400">{currency.gold}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-slate-300/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Prata</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-mono font-bold text-slate-300">{currency.silver}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-orange-400/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Bronze</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-mono font-bold text-orange-400">{currency.bronze.toString().replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>Total em Bronze</span>
                      <span className="font-mono">{totalBronze.toString().replace('.', ',')} bz</span>
                    </div>
                    
                    <button 
                      disabled={totalBronze === 0}
                      onClick={copySummary}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        totalBronze === 0 
                          ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                          : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                      }`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado!' : 'Copiar Pedido'}
                    </button>
                  </div>
                </div>

                {/* Order List */}
                <AnimatePresence>
                  {Object.keys(order).length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white/5 rounded-xl p-3 border border-white/5"
                    >
                      <h3 className="text-[10px] font-bold text-white/40 uppercase mb-2">Itens Selecionados</h3>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {Object.entries(order).map(([id, qty]) => {
                          const item = MENU_ITEMS.find(i => i.id === id);
                          const price = item ? item.priceBz : 0;
                          return (
                            <div key={id} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                              <span className="text-white/70 truncate mr-2">{qty}x {item?.name}</span>
                              <span className="text-white/40 font-mono shrink-0">{Number(price) * Number(qty)}bz</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : activeTab === 'stock' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Stock Input Section */}
            <div className="md:col-span-5 lg:col-span-4 space-y-4">
              {/* Scanner Card */}
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 shadow-lg">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <Sparkles size={16} />
                  <h2 className="font-bold uppercase tracking-wider text-xs">Ingredientes do Inventário</h2>
                </div>
                <p className="text-[10px] text-amber-200/60 mb-4 leading-relaxed">
                  Envie prints do seu inventário ou <span className="text-amber-400 font-bold">cole (Ctrl+V)</span> em qualquer lugar para somar os ingredientes automaticamente.
                </p>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                
                <button 
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                    isScanning 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Camera size={18} />
                      Enviar Print
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#252525] rounded-xl p-4 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white/80">
                    <Package size={16} />
                    <h2 className="font-bold uppercase tracking-wider text-xs">Meu Estoque</h2>
                  </div>
                  <button 
                    onClick={clearStock}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {ALL_INGREDIENTS.map(ing => (
                    <div key={ing} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <label className="text-xs text-white/70 truncate mr-2">{ing}</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={stock[ing] || ''}
                        onChange={(e) => updateStock(ing, parseInt(e.target.value) || 0)}
                        className="w-16 text-right font-mono text-xs font-bold text-amber-400 bg-black/20 border border-white/5 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  ))}
                  {/* Mostrar ingredientes extras detectados pelo scanner que não estão na lista base */}
                  {Object.keys(stock).filter(name => !ALL_INGREDIENTS.includes(name)).map(name => (
                    <div key={name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <label className="text-xs text-amber-400/80 truncate mr-2 italic">{name}*</label>
                      <input
                        type="number"
                        min="0"
                        value={stock[name] || 0}
                        onChange={(e) => updateStock(name, parseInt(e.target.value) || 0)}
                        className="w-16 text-right font-mono text-xs font-bold text-amber-400 bg-black/20 border border-white/5 rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Production Capacity Section */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-4 text-white/80">
                  <Calculator size={16} />
                  <h2 className="font-bold uppercase tracking-wider text-xs">Capacidade de Produção</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productionCapacity.map(recipe => (
                    <div 
                      key={recipe.menuItemId}
                      className={`p-3 rounded-xl border transition-all ${
                        recipe.canMake > 0 
                          ? 'bg-amber-500/10 border-amber-500/20' 
                          : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold text-white leading-tight pr-2">{recipe.itemName}</h3>
                        <div className="shrink-0 text-center">
                          <span className={`text-xl font-mono font-bold ${recipe.canMake > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                            {recipe.canMake}
                          </span>
                          <p className="text-[8px] uppercase font-bold text-white/30">Pode fazer</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {recipe.ingredients.map(ing => {
                          const hasEnough = (stock[ing.name] || 0) >= ing.amount;
                          return (
                            <div key={ing.name} className="flex justify-between text-[10px]">
                              <span className={hasEnough ? 'text-white/60' : 'text-red-400'}>
                                {ing.name} ({ing.amount})
                              </span>
                              <span className="font-mono text-white/30">
                                {stock[ing.name] || 0} em estoque
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 items-start">
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-200/70 leading-relaxed">
                    Este cálculo mostra a quantidade máxima que você pode produzir de cada item individualmente com base no seu estoque atual. 
                    Produzir um item consumirá os ingredientes e reduzirá a capacidade dos outros.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Purchase Form Section */}
            <div className="md:col-span-5 lg:col-span-4 space-y-4">
              <div className="bg-[#252525] rounded-xl p-4 border border-white/10 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-white/80">
                  <ShoppingBag size={16} />
                  <h2 className="font-bold uppercase tracking-wider text-xs">Nova Compra</h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Nome do Comprador</label>
                    <input 
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ex: Taverneiro"
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/30 mb-1 block">Nome do Vendedor</label>
                    <input 
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="Ex: Mercador Errante"
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-amber-500/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Ouro</span>
                      <span className="text-xl font-mono font-bold text-amber-400">{purchaseCurrency.gold}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-slate-300/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Prata</span>
                      <span className="text-xl font-mono font-bold text-slate-300">{purchaseCurrency.silver}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-orange-400/10">
                      <span className="text-[9px] text-white/30 uppercase font-bold mb-1">Bronze</span>
                      <span className="text-xl font-mono font-bold text-orange-400">{purchaseCurrency.bronze}</span>
                    </div>
                  </div>

                  <button 
                    disabled={totalPurchaseBronze === 0 || isSending}
                    onClick={sendToDiscord}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                      totalPurchaseBronze === 0 || isSending
                        ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                        : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                    }`}
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <ShoppingBag size={18} />}
                    {isSending ? 'Registrando...' : 'Registrar Compra'}
                  </button>
                </div>
              </div>
            </div>

            {/* Purchase Items List */}
            <div className="md:col-span-7 lg:col-span-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white/80">
                    <Package size={16} />
                    <h2 className="font-bold uppercase tracking-wider text-xs">Itens para Compra</h2>
                  </div>
                  <span className="text-[10px] text-white/30 italic">Baseado no Estoque</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {ALL_INGREDIENTS.map(ing => (
                    <div key={ing} className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-white/90 truncate">{ing}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase font-bold text-white/30 block mb-1">Quantidade</label>
                          <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            value={purchaseItems[ing]?.qty || ''}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0;
                              setPurchaseItems(prev => ({
                                ...prev,
                                [ing]: { ...prev[ing], qty, price: prev[ing]?.price || 0 }
                              }));
                            }}
                            className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-xs font-mono text-amber-400 outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase font-bold text-white/30 block mb-1">Preço Unit. (bz)</label>
                          <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            value={purchaseItems[ing]?.price || ''}
                            onChange={(e) => {
                              const price = parseInt(e.target.value) || 0;
                              setPurchaseItems(prev => ({
                                ...prev,
                                [ing]: { ...prev[ing], price, qty: prev[ing]?.qty || 0 }
                              }));
                            }}
                            className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-xs font-mono text-amber-400 outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      {purchaseItems[ing]?.qty > 0 && purchaseItems[ing]?.price > 0 && (
                        <div className="text-right text-[10px] text-white/40 italic">
                          Subtotal: {purchaseItems[ing].qty * purchaseItems[ing].price}bz
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
