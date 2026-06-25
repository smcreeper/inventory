import { useState, useEffect } from 'react';
import {
  Package, Plus, Minus, Trash2, Edit3, TrendingUp,
  ArrowDownLeft, ArrowUpRight, Calendar, DollarSign,
  Sparkles, Download, ChevronDown, ChevronUp,
  Check, AlertCircle, AlertTriangle, X, Info, Layers,
  Activity, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Product, SKU, PurchaseRecord, SaleRecord, InventoryState, CHANNELS, ChannelType
} from './types';

// Helper: Get local date string YYYY-MM-DD
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Convert YYYY-MM-DD to timestamp in local zone safely
function dateToTs(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return Date.now();
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
}

// Helper: Format date string for display (e.g. 2026-06-25 -> 6/25)
function formatDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

// Helper: Get day difference from date A to date B
function getDaysBetween(dateStrA: string, dateStrB: string): number {
  const tA = dateToTs(dateStrA);
  const tB = dateToTs(dateStrB);
  return (tB - tA) / (1000 * 60 * 60 * 24);
}

// Start with empty state for a clean canvas
const SAMPLE_STATE: InventoryState = {
  products: []
};

export default function App() {
  // --- States ---
  const [state, setState] = useState<InventoryState>(() => {
    try {
      const saved = localStorage.getItem('inventory-state');
      if (saved) {
        const parsed = JSON.parse(saved) as InventoryState;
        // Verify migration
        let mutated = false;
        parsed.products.forEach(p => {
          if (p.leadtime === undefined) {
            p.leadtime = 20; // Default leadtime
            mutated = true;
          }
          // Remove leadtime from SKU if any existed in raw object
          p.skus.forEach((s: any) => {
            if (s.leadtime !== undefined) {
              delete s.leadtime;
              mutated = true;
            }
          });
        });
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
    return SAMPLE_STATE;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'in' | 'out' | 'advice'>('overview');
  const [openProducts, setOpenProducts] = useState<Record<string, boolean>>({ "prod-1": true, "prod-2": true });
  const [showAddSkuProductId, setShowAddSkuProductId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Registration Form States ---
  const [inDate, setInDate] = useState<string>(getTodayString());
  const [inProductId, setInProductId] = useState<string>('');
  const [inSkuId, setInSkuId] = useState<string>('');
  const [inQty, setInQty] = useState<number>(0);
  const [inCost, setInCost] = useState<string>('');
  const [inNote, setInNote] = useState<string>('');

  const [outDate, setOutDate] = useState<string>(getTodayString());
  const [outProductId, setOutProductId] = useState<string>('');
  const [outSkuId, setOutSkuId] = useState<string>('');
  const [outQty, setOutQty] = useState<number>(0);
  const [outChannel, setOutChannel] = useState<string>(CHANNELS[0]);

  // --- Search / Filter States ---
  const [overviewSearch, setOverviewSearch] = useState<string>('');

  // --- Inline SKU creation form inside accordion ---
  const [newSkuName, setNewSkuName] = useState<string>('');
  const [newSkuInitialStock, setNewSkuInitialStock] = useState<number>(0);

  // --- Product creation form states ---
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductLeadtime, setNewProductLeadtime] = useState<number>(10);

  // --- Modal Edit/Delete States ---
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editSku, setEditSku] = useState<{ productId: string; sku: SKU } | null>(null);
  const [editPurchase, setEditPurchase] = useState<{ productId: string; skuId: string; record: PurchaseRecord } | null>(null);
  const [editSale, setEditSale] = useState<{ productId: string; skuId: string; record: SaleRecord } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'product' | 'sku' | 'purchase' | 'sale';
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // --- Effect: Persist state to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('inventory-state', JSON.stringify(state));
  }, [state]);

  // --- Sync Dropdowns when products/skus change ---
  useEffect(() => {
    if (state.products.length > 0) {
      // Sync Purchase select
      if (!inProductId || !state.products.some(p => p.id === inProductId)) {
        setInProductId(state.products[0].id);
      }
      // Sync Sale select
      if (!outProductId || !state.products.some(p => p.id === outProductId)) {
        setOutProductId(state.products[0].id);
      }
    }
  }, [state.products]);

  useEffect(() => {
    const prod = state.products.find(p => p.id === inProductId);
    if (prod && prod.skus.length > 0) {
      if (!inSkuId || !prod.skus.some(s => s.id === inSkuId)) {
        setInSkuId(prod.skus[0].id);
      }
    } else {
      setInSkuId('');
    }
  }, [inProductId, state.products]);

  useEffect(() => {
    const prod = state.products.find(p => p.id === outProductId);
    if (prod && prod.skus.length > 0) {
      if (!outSkuId || !prod.skus.some(s => s.id === outSkuId)) {
        setOutSkuId(prod.skus[0].id);
      }
    } else {
      setOutSkuId('');
    }
  }, [outProductId, state.products]);

  // --- Helper: trigger temporary toast notifications ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2000);
  };

  // --- Utility State UUID ---
  const uid = () => Math.random().toString(36).substring(2, 11);

  // --- SKU Math Calculations ---
  const getSkuPurchasesTotal = (sku: SKU) => sku.purchases.reduce((a, r) => a + r.qty, 0);
  const getSkuSalesTotal = (sku: SKU) => sku.sales.reduce((a, r) => a + r.qty, 0);
  const getSkuCurrentStock = (sku: SKU) => sku.initialStock + getSkuPurchasesTotal(sku) - getSkuSalesTotal(sku);

  // 30 Days Average Sales helper
  const get30DayAvgSales = (sku: SKU, refDateStr: string = getTodayString()) => {
    const totalSales = sku.sales.filter(r => {
      const daysDiff = getDaysBetween(r.date, refDateStr);
      return daysDiff >= 0 && daysDiff < 30;
    }).reduce((a, r) => a + r.qty, 0);
    return parseFloat((totalSales / 30).toFixed(2));
  };

  const getSkuReorderPoint = (sku: SKU, productLeadtime: number, refDateStr: string = getTodayString()) => {
    const avg = get30DayAvgSales(sku, refDateStr);
    const safety = avg * (productLeadtime / 2);
    return avg * productLeadtime + safety;
  };

  const getSkuStatus = (sku: SKU, productLeadtime: number, refDateStr: string = getTodayString()) => {
    const avg = get30DayAvgSales(sku, refDateStr);
    const stock = getSkuCurrentStock(sku);
    if (avg === 0) {
      return { label: '暂无销量', cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
    }
    const reorderPoint = getSkuReorderPoint(sku, productLeadtime, refDateStr);
    if (stock <= reorderPoint * 0.5) {
      return { label: '库存紧急', cls: 'bg-rose-50 text-rose-600 border border-rose-200' };
    }
    if (stock <= reorderPoint) {
      return { label: '接近补货点', cls: 'bg-amber-50 text-amber-600 border border-amber-200' };
    }
    return { label: '库存充足', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
  };

  // Product aggregations
  const getProductTotalStock = (p: Product) => p.skus.reduce((a, s) => a + getSkuCurrentStock(s), 0);
  const getProductTotalAvgSales = (p: Product) => p.skus.reduce((sum, s) => sum + get30DayAvgSales(s), 0);

  // 30 Days Channel breakdown
  const getSkuChannelSales = (sku: SKU, refDateStr: string = getTodayString()) => {
    const breakdown: Record<string, number> = {};
    CHANNELS.forEach(c => { breakdown[c] = 0; });
    sku.sales.filter(r => {
      const daysDiff = getDaysBetween(r.date, refDateStr);
      return daysDiff >= 0 && daysDiff < 30;
    }).forEach(r => {
      if (breakdown[r.channel] !== undefined) {
        breakdown[r.channel] += r.qty;
      } else {
        breakdown['其他'] = (breakdown['其他'] || 0) + r.qty;
      }
    });
    return breakdown;
  };

  const getProductChannelSales = (product: Product, refDateStr: string = getTodayString()) => {
    const totals: Record<string, number> = {};
    CHANNELS.forEach(c => { totals[c] = 0; });
    product.skus.forEach(s => {
      const sBreakdown = getSkuChannelSales(s, refDateStr);
      CHANNELS.forEach(c => {
        totals[c] += sBreakdown[c];
      });
    });
    return totals;
  };

  // --- State Mutating Actions ---

  // 1. Create Product
  const handleCreateProduct = () => {
    const name = newProductName.trim();
    if (!name) {
      showToast('请输入产品名称');
      return;
    }
    const leadtime = Number(newProductLeadtime);
    if (isNaN(leadtime) || leadtime <= 0) {
      showToast('请输入有效的补货周期');
      return;
    }

    const newProd: Product = {
      id: `prod-${uid()}`,
      name,
      leadtime,
      skus: []
    };

    setState(prev => ({
      ...prev,
      products: [...prev.products, newProd]
    }));

    // Accordion auto-open
    setOpenProducts(prev => ({ ...prev, [newProd.id]: true }));
    setNewProductName('');
    setNewProductLeadtime(10);
    showToast(`产品《${name}》创建成功！`);
  };

  // 2. Save Edit Product
  const handleSaveEditProduct = () => {
    if (!editProduct) return;
    const name = editProduct.name.trim();
    if (!name) {
      showToast('名称不能为空');
      return;
    }
    const leadtime = Number(editProduct.leadtime);
    if (isNaN(leadtime) || leadtime <= 0) {
      showToast('请输入有效的补货周期');
      return;
    }

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === editProduct.id ? { ...p, name, leadtime } : p)
    }));

    setEditProduct(null);
    showToast('产品信息已修改');
  };

  // 3. Delete Product (Trigger)
  const triggerDeleteProduct = (product: Product) => {
    setDeleteConfirm({
      type: 'product',
      title: '删除产品确认',
      description: `您确定要彻底删除《${product.name}》吗？这将连同该产品下的所有SKU以及所有相关的进出货历史记录一同抹去，此操作无法撤销。`,
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          products: prev.products.filter(p => p.id !== product.id)
        }));
        setDeleteConfirm(null);
        showToast('产品已被彻底删除');
      }
    });
  };

  // 4. Create SKU
  const handleCreateSku = (productId: string) => {
    const name = newSkuName.trim();
    if (!name) {
      showToast('请输入SKU名称');
      return;
    }
    const initial = Number(newSkuInitialStock);
    if (isNaN(initial) || initial < 0) {
      showToast('请输入正确的初始库存');
      return;
    }

    const newSkuObj: SKU = {
      id: `sku-${uid()}`,
      name,
      initialStock: initial,
      purchases: [],
      sales: []
    };

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          return { ...p, skus: [...p.skus, newSkuObj] };
        }
        return p;
      })
    }));

    setNewSkuName('');
    setNewSkuInitialStock(0);
    setShowAddSkuProductId(null);
    showToast(`SKU《${name}》添加成功`);
  };

  // 5. Save Edit SKU
  const handleSaveEditSku = () => {
    if (!editSku) return;
    const name = editSku.sku.name.trim();
    if (!name) {
      showToast('SKU名称不能为空');
      return;
    }
    const parsedInitial = Number(editSku.sku.initialStock);
    if (isNaN(parsedInitial) || parsedInitial < 0) {
      showToast('请输入正确的库存数据');
      return;
    }

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === editSku.productId) {
          return {
            ...p,
            skus: p.skus.map(s => s.id === editSku.sku.id ? { ...s, name, initialStock: parsedInitial } : s)
          };
        }
        return p;
      })
    }));

    setEditSku(null);
    showToast('SKU信息已更新');
  };

  // 6. Delete SKU (Trigger)
  const triggerDeleteSku = (productId: string, sku: SKU) => {
    setDeleteConfirm({
      type: 'sku',
      title: '删除 SKU 确认',
      description: `您确定要彻底删除《${sku.name}》SKU吗？所有针对此SKU的专属进出货账目记录也将被永久删除。`,
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          products: prev.products.map(p => {
            if (p.id === productId) {
              return { ...p, skus: p.skus.filter(s => s.id !== sku.id) };
            }
            return p;
          })
        }));
        setDeleteConfirm(null);
        showToast('SKU已被删除');
      }
    });
  };

  // 7. Add Purchase Record (入库)
  const handleAddPurchase = () => {
    const qty = Number(inQty);
    if (!inProductId || !inSkuId) {
      showToast('请选择产品及SKU');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('进货数量必须大于0');
      return;
    }
    const cost = parseFloat(inCost) || 0;
    const note = inNote.trim();
    const date = inDate || getTodayString();

    const record: PurchaseRecord = {
      id: `p-${uid()}`,
      date,
      qty,
      cost,
      note,
      createdAt: Date.now()
    };

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === inProductId) {
          return {
            ...p,
            skus: p.skus.map(s => {
              if (s.id === inSkuId) {
                return { ...s, purchases: [...s.purchases, record] };
              }
              return s;
            })
          };
        }
        return p;
      })
    }));

    setInQty(0);
    setInCost('');
    setInNote('');
    showToast(`成功登记：入库 ${qty} 件`);
  };

  // 8. Edit Purchase Record (Save)
  const handleSaveEditPurchase = () => {
    if (!editPurchase) return;
    const { productId, skuId, record } = editPurchase;
    const qty = Number(record.qty);
    if (isNaN(qty) || qty <= 0) {
      showToast('数量必须大于 0');
      return;
    }

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            skus: p.skus.map(s => {
              if (s.id === skuId) {
                return {
                  ...s,
                  purchases: s.purchases.map(pr => pr.id === record.id ? { ...record, qty } : pr)
                };
              }
              return s;
            })
          };
        }
        return p;
      })
    }));

    setEditPurchase(null);
    showToast('进货记录已更新');
  };

  // 9. Delete Purchase Record
  const triggerDeletePurchase = (productId: string, skuId: string, record: PurchaseRecord) => {
    setDeleteConfirm({
      type: 'purchase',
      title: '删除进货记录确认',
      description: `确定删除该笔进货记录吗？这会引起当前库存的相应扣减。日期: ${record.date}, 数量: +${record.qty}件。`,
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          products: prev.products.map(p => {
            if (p.id === productId) {
              return {
                ...p,
                skus: p.skus.map(s => {
                  if (s.id === skuId) {
                    return { ...s, purchases: s.purchases.filter(pr => pr.id !== record.id) };
                  }
                  return s;
                })
              };
            }
            return p;
          })
        }));
        setDeleteConfirm(null);
        showToast('进货记录已删除');
      }
    });
  };

  // 10. Add Sale Record (出货)
  const handleAddSale = () => {
    const qty = Number(outQty);
    if (!outProductId || !outSkuId) {
      showToast('请选择产品及SKU');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('出货数量必须大于0');
      return;
    }
    const date = outDate || getTodayString();

    const product = state.products.find(p => p.id === outProductId);
    const sku = product?.skus.find(s => s.id === outSkuId);
    if (!sku) return;

    const currentStock = getSkuCurrentStock(sku);

    const proceedWithSale = () => {
      const record: SaleRecord = {
        id: `s-${uid()}`,
        date,
        qty,
        channel: outChannel,
        createdAt: Date.now()
      };

      setState(prev => ({
        ...prev,
        products: prev.products.map(p => {
          if (p.id === outProductId) {
            return {
              ...p,
              skus: p.skus.map(s => {
                if (s.id === outSkuId) {
                  return { ...s, sales: [...s.sales, record] };
                }
                return s;
              })
            };
          }
          return p;
        })
      }));

      setOutQty(0);
      showToast(`成功登记：出货 ${qty} 件`);
    };

    if (qty > currentStock) {
      // Premium custom modal confirm
      setDeleteConfirm({
        type: 'sale',
        title: '库存不足警示',
        description: `当前库存只有 ${currentStock} 件，但您登记了 ${qty} 件出货。这会导致该SKU库存沦为负数 (${currentStock - qty} 件)，是否强制继续？`,
        onConfirm: () => {
          proceedWithSale();
          setDeleteConfirm(null);
        }
      });
    } else {
      proceedWithSale();
    }
  };

  // 11. Edit Sale Record (Save)
  const handleSaveEditSale = () => {
    if (!editSale) return;
    const { productId, skuId, record } = editSale;
    const qty = Number(record.qty);
    if (isNaN(qty) || qty <= 0) {
      showToast('出货数量必须大于0');
      return;
    }

    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            skus: p.skus.map(s => {
              if (s.id === skuId) {
                return {
                  ...s,
                  sales: s.sales.map(sr => sr.id === record.id ? { ...record, qty } : sr)
                };
              }
              return s;
            })
          };
        }
        return p;
      })
    }));

    setEditSale(null);
    showToast('出货记录已更新');
  };

  // 12. Delete Sale Record
  const triggerDeleteSale = (productId: string, skuId: string, record: SaleRecord) => {
    setDeleteConfirm({
      type: 'sale',
      title: '删除出货记录确认',
      description: `确定删除该笔出货记录吗？这会引起当前库存的相应回充。日期: ${record.date}, 数量: -${record.qty}件。`,
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          products: prev.products.map(p => {
            if (p.id === productId) {
              return {
                ...p,
                skus: p.skus.map(s => {
                  if (s.id === skuId) {
                    return { ...s, sales: s.sales.filter(sr => sr.id !== record.id) };
                  }
                  return s;
                })
              };
            }
            return p;
          })
        }));
        setDeleteConfirm(null);
        showToast('出货记录已成功抹去');
      }
    });
  };

  // Toggle Accordion
  const toggleProductAccordion = (pid: string) => {
    setOpenProducts(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  // --- Combined Ledger Rows for In/Out Tab Listing ---
  const getAllPurchaseRecordsSorted = () => {
    const list: Array<{
      productId: string;
      productName: string;
      skuId: string;
      skuName: string;
      record: PurchaseRecord;
    }> = [];
    state.products.forEach(p => {
      p.skus.forEach(s => {
        s.purchases.forEach(rec => {
          list.push({
            productId: p.id,
            productName: p.name,
            skuId: s.id,
            skuName: s.name,
            record: rec
          });
        });
      });
    });
    // Sort descending by date, then by creation time
    return list.sort((a, b) => b.record.date.localeCompare(a.record.date) || b.record.createdAt - a.record.createdAt);
  };

  const getAllSaleRecordsSorted = () => {
    const list: Array<{
      productId: string;
      productName: string;
      skuId: string;
      skuName: string;
      record: SaleRecord;
    }> = [];
    state.products.forEach(p => {
      p.skus.forEach(s => {
        s.sales.forEach(rec => {
          list.push({
            productId: p.id,
            productName: p.name,
            skuId: s.id,
            skuName: s.name,
            record: rec
          });
        });
      });
    });
    // Sort descending by date, then by creation time
    return list.sort((a, b) => b.record.date.localeCompare(a.record.date) || b.record.createdAt - a.record.createdAt);
  };

  // --- CSV Export Tool ---
  const handleExportCSV = () => {
    if (state.products.length === 0) {
      showToast('暂无数据可供导出');
      return;
    }

    const csvField = (v: any) => {
      const s = String(v === undefined || v === null ? '' : v);
      if (/[",\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const lines: string[] = [];

    // Part 1: Current Stock Snapshot
    lines.push(csvField('当前全量库存快照'));
    lines.push(['主产品', 'SKU款式名称', '当前库存 (件)', '产品级补货周期 (天)', '近30天日均销售量 (件)'].map(csvField).join(','));

    state.products.forEach(p => {
      p.skus.forEach(s => {
        const stock = getSkuCurrentStock(s);
        const avg = get30DayAvgSales(s);
        lines.push([p.name, s.name, stock, p.leadtime, avg.toFixed(2)].map(csvField).join(','));
      });
    });

    lines.push(''); // Empty Spacer

    // Part 2: Detailed Transactions Ledger
    lines.push(csvField('历史明细账目明细'));
    lines.push(['单据类型', '主产品', 'SKU款式名称', '交易账目日期', '交易数量 (件)', '单位成本 (元)', '销售通道', '账目备注'].map(csvField).join(','));

    const allTx: Array<[string, string, string, string, number, string, string, string]> = [];
    state.products.forEach(p => {
      p.skus.forEach(s => {
        s.purchases.forEach(r => {
          allTx.push(['进货入库', p.name, s.name, r.date, r.qty, r.cost ? r.cost.toFixed(2) : '0.00', '-', r.note || '']);
        });
        s.sales.forEach(r => {
          allTx.push(['出货记账', p.name, s.name, r.date, r.qty, '-', r.channel, '']);
        });
      });
    });

    // Sort by Date Ascending for Ledger continuity
    allTx.sort((a, b) => a[3].localeCompare(b[3]));
    allTx.forEach(row => {
      lines.push(row.map(csvField).join(','));
    });

    const csvContent = lines.join('\r\n');
    // Prepend UTF-8 BOM so Excel opens Chinese text correctly
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `盐水棒冰库存报表_${getTodayString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV 导出成功，请查看下载项');
  };

  // Filtered Overview products
  const filteredProducts = state.products.filter(p => {
    if (!overviewSearch) return true;
    const query = overviewSearch.toLowerCase();
    const matchesProduct = p.name.toLowerCase().includes(query);
    const matchesSku = p.skus.some(s => s.name.toLowerCase().includes(query));
    return matchesProduct || matchesSku;
  });

  return (
    <div className="min-h-screen bg-[#f0f9fa] text-slate-800 font-sans pb-28 antialiased flex flex-col items-center">
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-medium tracking-wide shadow-xl flex items-center gap-2 border border-slate-700/50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main viewport frame */}
      <div className="w-full max-w-lg px-4 pt-5 flex-1 flex flex-col">
        {/* Modern Top bar */}
        <header className="mb-5 flex items-center justify-between bg-white border border-slate-100 rounded-2xl py-3.5 px-4.5 shadow-[0_4px_16px_rgba(200,225,230,0.25)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e4f6f8] rounded-xl flex items-center justify-center text-indigo-600 border border-[#cbeef1]">
              <Package className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-900 leading-none">盐水棒冰库存本</h1>
              <p className="text-[10.5px] text-slate-400 mt-1">两级架构 · LocalStorage 守护记录</p>
            </div>
          </div>
        </header>

        {/* Tab views router wrapper */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* 1. Add Product Form Card */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)]">
                  <div className="flex items-center gap-2 mb-3.5">
                    <Plus className="w-4.5 h-4.5 text-indigo-600" />
                    <h2 className="text-[13.5px] font-bold text-slate-900">创建新产品</h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">产品名称</label>
                      <input
                        type="text"
                        placeholder="例如：极简经典盐水棒冰、多肉草莓"
                        value={newProductName}
                        onChange={e => setNewProductName(e.target.value)}
                        className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">默认补货周期 (天)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="例如: 10"
                          value={newProductLeadtime || ''}
                          onChange={e => setNewProductLeadtime(Math.max(1, Number(e.target.value)))}
                          className="flex-1 bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
                        />
                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap bg-slate-100 rounded-lg px-2.5 py-2">
                          天数之后出货自动告警
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateProduct}
                      className="w-full mt-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl py-3 text-xs font-bold shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      创建新产品
                    </button>
                  </div>
                </section>

                {/* 2. Product and Stock Grid Card */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)] flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-indigo-600" />
                      <h2 className="text-[13.5px] font-bold text-slate-900">产品与库存大盘</h2>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5 font-medium">
                      总共 {state.products.length} 个产品
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4 relative">
                    <input
                      type="text"
                      placeholder="搜索产品或 SKU 款式..."
                      value={overviewSearch}
                      onChange={e => setOverviewSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-300 transition"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Package className="w-10 h-10 mx-auto text-slate-200 mb-2.5" />
                      暂无对应的产品大盘数据
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {filteredProducts.map(p => {
                        const isOpen = !!openProducts[p.id];
                        const totalStock = getProductTotalStock(p);
                        const totalAvgSales = getProductTotalAvgSales(p);

                        return (
                          <div key={p.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            {/* Accordion Head */}
                            <div
                              onClick={() => toggleProductAccordion(p.id)}
                              className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none transition"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-800 truncate">{p.name}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                  <span>{p.skus.length} SKU</span>
                                  <span>•</span>
                                  <span>日销约 {totalAvgSales.toFixed(1)} 支</span>
                                  <span>•</span>
                                  <span>补货周期: {p.leadtime}天</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3.5 shrink-0">
                                <div className="text-right">
                                  <span className="block text-[15px] font-black text-indigo-600 leading-none">{totalStock}</span>
                                  <span className="text-[8.5px] text-slate-400 mt-1 block">总库存</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditProduct(p);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition"
                                    title="编辑产品"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerDeleteProduct(p);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 transition"
                                    title="删除产品"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Accordion Body */}
                            {isOpen && (
                              <div className="bg-white p-3 border-t border-slate-50 space-y-2">
                                {p.skus.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 text-center py-4">该产品暂无具体SKU。请立刻在下方添加。</p>
                                ) : (
                                  p.skus.map(s => {
                                    const st = getSkuStatus(s, p.leadtime);
                                    const stock = getSkuCurrentStock(s);
                                    const avg = get30DayAvgSales(s);

                                    return (
                                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-medium ${st.cls}`}>
                                              {st.label}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-1">
                                            日均销量: {avg.toFixed(1)} 支 · 初始: {s.initialStock}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="font-extrabold text-xs text-slate-800">{stock} 件</span>
                                          <div className="flex items-center gap-0.5">
                                            <button
                                              onClick={() => setEditSku({ productId: p.id, sku: s })}
                                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => triggerDeleteSku(p.id, s)}
                                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}

                                {/* SKU Create Form Area */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100">
                                  {showAddSkuProductId === p.id ? (
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl space-y-2.5 border border-slate-100">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">SKU名称（如颜色/款式）</label>
                                          <input
                                            type="text"
                                            placeholder="例如：原味标准版"
                                            value={newSkuName}
                                            onChange={e => setNewSkuName(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">初始库存（件）</label>
                                          <input
                                            type="number"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={newSkuInitialStock || ''}
                                            onChange={e => setNewSkuInitialStock(Math.max(0, Number(e.target.value)))}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2 text-xs">
                                        <button
                                          onClick={() => {
                                            setShowAddSkuProductId(null);
                                            setNewSkuName('');
                                            setNewSkuInitialStock(0);
                                          }}
                                          className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                                        >
                                          取消
                                        </button>
                                        <button
                                          onClick={() => handleCreateSku(p.id)}
                                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                                        >
                                          确认添加
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setShowAddSkuProductId(p.id)}
                                      className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-lg py-2 text-[11px] font-bold text-slate-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      添加该产品的 SKU 款式
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* 3. Export Snapshot & Ledger Card */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)] flex items-center justify-between">
                  <div className="space-y-1 pr-3">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-500" />
                      全套数据安全备份 (CSV)
                    </h3>
                    <p className="text-[10px] text-slate-400">导出产品各SKU即时库存盘点及完整的交易流水明细</p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3.5 py-2 rounded-xl transition"
                  >
                    立即导出
                  </button>
                </section>
              </motion.div>
            )}

            {activeTab === 'in' && (
              <motion.div
                key="in"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Add Purchase Ledger Form */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)]">
                  <div className="flex items-center gap-2 mb-3.5">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-[13.5px] font-bold text-slate-900">登记进货入库</h2>
                  </div>

                  <div className="space-y-3.5">
                    {/* Date select comes first */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择进货入库日期</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={inDate}
                          onChange={e => setInDate(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择产品</label>
                        <select
                          value={inProductId}
                          onChange={e => setInProductId(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                        >
                          {state.products.length === 0 && <option value="">暂无产品可供入库</option>}
                          {state.products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择具体款式 SKU</label>
                        <select
                          value={inSkuId}
                          onChange={e => setInSkuId(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                        >
                          {(() => {
                            const prod = state.products.find(p => p.id === inProductId);
                            if (!prod || prod.skus.length === 0) {
                              return <option value="">暂无SKU</option>;
                            }
                            return prod.skus.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    {/* Quantity Selector with Quick Adjustment Plus/Minus Buttons */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">入库进货数量 (件)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInQty(prev => Math.max(0, prev - 1))}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-600 font-bold transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={inQty || ''}
                          onChange={e => setInQty(Math.max(0, Number(e.target.value)))}
                          className="flex-1 text-center bg-slate-50/60 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setInQty(prev => prev + 1)}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-600 font-bold transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick preset buttons underneath */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[-50, -10, -5, +5, +10, +50, +100].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setInQty(prev => Math.max(0, prev + step))}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2 py-1 rounded-md transition"
                          >
                            {step > 0 ? `+${step}` : step}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setInQty(0)}
                          className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-2 py-1 rounded-md transition ml-auto"
                        >
                          重置归零
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">单价成本 (元, 选填)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={inCost}
                          onChange={e => setInCost(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">批次备注 (选填)</label>
                        <input
                          type="text"
                          placeholder="如：夏季主批、均摊运费"
                          value={inNote}
                          onChange={e => setInNote(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddPurchase}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-xs font-bold shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      确认入库入账
                    </button>
                  </div>
                </section>

                {/* Purchase Ledger Records */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)]">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[13px] font-bold text-slate-900">最近进货明细记录</h3>
                    <span className="text-[10px] text-slate-400">最新在前</span>
                  </div>

                  {(() => {
                    const purchases = getAllPurchaseRecordsSorted();
                    if (purchases.length === 0) {
                      return <p className="text-center text-xs text-slate-400 py-8">暂无任何进货明细历史记录</p>;
                    }

                    return (
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {purchases.map(({ productId, productName, skuId, skuName, record }) => (
                          <div key={record.id} className="p-3 bg-slate-50 rounded-xl flex items-start justify-between border border-slate-100/50">
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {productName} • {skuName}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                                  +{record.qty}件
                                </span>
                                {record.cost > 0 && <span>成本: ￥{record.cost}</span>}
                                {record.note && <span className="truncate max-w-[120px]">({record.note})</span>}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {record.date}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setEditPurchase({ productId, skuId, record })}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded"
                                title="修改记录"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDeletePurchase(productId, skuId, record)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded"
                                title="删除记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </section>
              </motion.div>
            )}

            {activeTab === 'out' && (
              <motion.div
                key="out"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Add Sales Ledger Form */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)]">
                  <div className="flex items-center gap-2 mb-3.5">
                    <ArrowUpRight className="w-5 h-5 text-rose-600" />
                    <h2 className="text-[13.5px] font-bold text-slate-900">登记出货出库</h2>
                  </div>

                  <div className="space-y-3.5">
                    {/* Date select comes first */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择出货日期</label>
                      <input
                        type="date"
                        value={outDate}
                        onChange={e => setOutDate(e.target.value)}
                        className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择产品</label>
                        <select
                          value={outProductId}
                          onChange={e => setOutProductId(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                        >
                          {state.products.length === 0 && <option value="">暂无产品可供出货</option>}
                          {state.products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">选择款式 SKU</label>
                        <select
                          value={outSkuId}
                          onChange={e => setOutSkuId(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                        >
                          {(() => {
                            const prod = state.products.find(p => p.id === outProductId);
                            if (!prod || prod.skus.length === 0) {
                              return <option value="">暂无SKU</option>;
                            }
                            return prod.skus.map(s => (
                              <option key={s.id} value={s.id}>{s.name} (余 {getSkuCurrentStock(s)})</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    {/* Out quantity block with rapid +/- adjustments */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">出库数量 (件)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOutQty(prev => Math.max(0, prev - 1))}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-600 font-bold transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={outQty || ''}
                          onChange={e => setOutQty(Math.max(0, Number(e.target.value)))}
                          className="flex-1 text-center bg-slate-50/60 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setOutQty(prev => prev + 1)}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-slate-600 font-bold transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick presets row */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[-50, -10, -5, +5, +10, +50, +100].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setOutQty(prev => Math.max(0, prev + step))}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2 py-1 rounded-md transition"
                          >
                            {step > 0 ? `+${step}` : step}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setOutQty(0)}
                          className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-2 py-1 rounded-md transition ml-auto"
                        >
                          重置归零
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">出货分销渠道</label>
                      <select
                        value={outChannel}
                        onChange={e => setOutChannel(e.target.value)}
                        className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                      >
                        {CHANNELS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleAddSale}
                      className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      确认登记出货
                    </button>
                  </div>
                </section>

                {/* Sales history list */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)]">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[13px] font-bold text-slate-900">最近出货明细记录</h3>
                    <span className="text-[10px] text-slate-400">最新在首</span>
                  </div>

                  {(() => {
                    const sales = getAllSaleRecordsSorted();
                    if (sales.length === 0) {
                      return <p className="text-center text-xs text-slate-400 py-8">暂无任何出货历史记账明细</p>;
                    }

                    return (
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {sales.map(({ productId, productName, skuId, skuName, record }) => (
                          <div key={record.id} className="p-3 bg-slate-50 rounded-xl flex items-start justify-between border border-slate-100/50">
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {productName} • {skuName}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                                  -{record.qty}件
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">
                                  {record.channel}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {record.date}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setEditSale({ productId, skuId, record })}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded"
                                title="编辑记录"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDeleteSale(productId, skuId, record)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded"
                                title="删除记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </section>
              </motion.div>
            )}

            {activeTab === 'advice' && (
              <motion.div
                key="advice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* 1. Header Info Advice */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)] bg-gradient-to-br from-indigo-50/50 to-white">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900">30天平均销量补货引擎</h2>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        基于近 30 日出货记账，智能预测销售速率。计算公式包含延迟安全储备，在库存低于警戒值时自动发出补货预警，帮您从容规划供应链。
                      </p>
                    </div>
                  </div>
                </section>

                {/* 2. Advice Items */}
                {state.products.length === 0 || state.products.every(p => p.skus.length === 0) ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-xs">
                    <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                    请先建立产品与SKU，并添加出货流水数据，方可在此得出30天平均销量。
                  </div>
                ) : (
                  state.products.map(p => {
                    if (p.skus.length === 0) return null;
                    const totalStock = getProductTotalStock(p);
                    const totalAvgSales = getProductTotalAvgSales(p);
                    const prodChannels = getProductChannelSales(p);

                    // Compute product total sales across 30 days
                    const sumProdSales = Object.values(prodChannels).reduce((a, b) => a + b, 0);

                    return (
                      <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)] space-y-4">
                        {/* Title Row */}
                        <div className="border-b border-slate-50 pb-2.5">
                          <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                              补货周期: {p.leadtime}天
                            </span>
                          </h3>
                          <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>全线库存: <b className="text-slate-700 font-bold">{totalStock}</b></span>
                            <span>全线日销平均: <b className="text-slate-700 font-bold">{totalAvgSales.toFixed(1)} 件/天</b></span>
                          </div>

                          {/* Product Channel distribution percentages */}
                          {sumProdSales > 0 && (
                            <div className="mt-2.5">
                              <p className="text-[9px] text-slate-400 font-medium mb-1">全款30天出货渠道分布：</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {CHANNELS.map(chan => {
                                  const cQty = prodChannels[chan];
                                  if (cQty === 0) return null;
                                  const pct = Math.round((cQty / sumProdSales) * 100);
                                  return (
                                    <span key={chan} className="text-[9px] bg-slate-50 text-slate-500 rounded border border-slate-100 px-1.5 py-0.5 font-medium">
                                      {chan}: {cQty}支 ({pct}%)
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sku Specific Advice Cards */}
                        <div className="space-y-3.5">
                          {p.skus.map(s => {
                            const avg = get30DayAvgSales(s);
                            const stock = getSkuCurrentStock(s);
                            const safety = avg * (p.leadtime / 2);
                            const reorderPoint = avg * p.leadtime + safety;
                            const suggestQty = Math.max(0, Math.round(reorderPoint * 1.5 - stock));

                            let isLow = stock <= reorderPoint && avg > 0;
                            let isCritical = stock <= reorderPoint * 0.5 && avg > 0;

                            let statusText = '暂无销售数据，无需补货。';
                            let statusColor = 'text-slate-500 bg-slate-50 border-slate-100';

                            if (avg > 0) {
                              if (isCritical) {
                                statusText = `库存严重紧张 (${stock} 件)，远低于建议补货点（约 ${Math.round(reorderPoint)} 件）。`;
                                statusColor = 'text-rose-700 bg-rose-50 border-rose-100';
                              } else if (isLow) {
                                statusText = `库存偏低 (${stock} 件)，已触发补货线（约 ${Math.round(reorderPoint)} 件）。`;
                                statusColor = 'text-amber-700 bg-amber-50 border-amber-100';
                              } else {
                                statusText = `当前库存充足 (${stock} 件)，充裕度良好（补货点为 ${Math.round(reorderPoint)} 件）。`;
                                statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                              }
                            }

                            const skuChannels = getSkuChannelSales(s);

                            return (
                              <div key={s.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-800">{s.name}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    日销: {avg.toFixed(1)} 支/天
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                  <div className="bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                    <span className="block text-[11px] text-slate-400 mb-0.5">当前实际库存</span>
                                    <span className={`text-[13px] font-black ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                                      {stock}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                    <span className="block text-[11px] text-slate-400 mb-0.5">30天日销量</span>
                                    <span className="text-[13px] font-black text-indigo-600">{avg.toFixed(1)}</span>
                                  </div>
                                </div>

                                <div className={`text-[10px] p-2 rounded-lg border leading-normal font-medium ${statusColor}`}>
                                  <div className="flex gap-1.5 items-start">
                                    {isLow ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                                    <span>
                                      {statusText} {isLow && <>建议立即订制 <b>{suggestQty}</b> 件补货批次。</>}
                                    </span>
                                  </div>
                                </div>

                                {/* Channel Distribution bar */}
                                {avg > 0 && (
                                  <div className="text-[9px] text-slate-400 pt-1 flex flex-wrap gap-2">
                                    <span>分售细分：</span>
                                    {CHANNELS.map(ch => {
                                      const val = skuChannels[ch];
                                      if (val === 0) return null;
                                      return <span key={ch} className="font-semibold text-slate-500">{ch}:{val}支</span>;
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Calculation Description Block */}
                <section className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_4px_16px_rgba(200,225,230,0.15)] space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    补货决策建议算法是怎样运作的？
                  </h4>
                  <ul className="text-[10px] text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li><b>30天日均销量 (Avg)</b>: 最近30天内所有出货记录的总数，除以 30。</li>
                    <li><b>安全缓冲库存 (Safety)</b>: 计算为 <code>日销 × (产品补货周期 ÷ 2)</code>，抵御物流迟到与订单激增。</li>
                    <li><b>补货临界阈值 (ReorderPoint)</b>: 达到 <code>(日销 × 补货周期) + 安全缓冲</code> 时建议启动采购。</li>
                    <li><b>建议补货数量</b>: 触发采购时，推荐将缺口补充至补货线的 1.5 倍，算式为 <code>(临界值 × 1.5) - 现有库存</code>。</li>
                  </ul>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- Tab Selector bottom nav --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2.5 px-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-xl transition ${activeTab === 'overview' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Package className="w-5 h-5" />
          <span>总览</span>
        </button>

        <button
          onClick={() => setActiveTab('in')}
          className={`flex flex-col items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-xl transition ${activeTab === 'in' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span>进货入库</span>
        </button>

        <button
          onClick={() => setActiveTab('out')}
          className={`flex flex-col items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-xl transition ${activeTab === 'out' ? 'text-rose-700 bg-rose-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ArrowUpRight className="w-5 h-5" />
          <span>出货登记</span>
        </button>

        <button
          onClick={() => setActiveTab('advice')}
          className={`flex flex-col items-center gap-1 text-[10.5px] font-bold px-3 py-1.5 rounded-xl transition ${activeTab === 'advice' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>补货建议</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* ======================= MODAL FORMS & CONFIRMATIONS ======================= */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {/* 1. EDIT PRODUCT MODAL */}
        {editProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">编辑产品信息</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">修改产品主属性，自动适用于其所有SKU款式</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">产品名称</label>
                  <input
                    type="text"
                    value={editProduct.name}
                    onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">默认补货周期 (天)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editProduct.leadtime}
                    onChange={e => setEditProduct({ ...editProduct, leadtime: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={() => setEditProduct(null)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEditProduct}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. EDIT SKU MODAL */}
        {editSku && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">编辑 SKU 款式信息</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">修改款式命名及盘点调整初始库存</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">SKU 属性款式名称</label>
                  <input
                    type="text"
                    value={editSku.sku.name}
                    onChange={e => setEditSku({
                      ...editSku,
                      sku: { ...editSku.sku, name: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    初始库存数 (件)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editSku.sku.initialStock}
                    onChange={e => setEditSku({
                      ...editSku,
                      sku: { ...editSku.sku, initialStock: Math.max(0, Number(e.target.value)) }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                  <span className="block text-[9px] text-slate-400 mt-1.5 leading-normal">
                    * 编辑初始库存不影响现有的进出货账目记录，这用于期初建账或对账调整。
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={() => setEditSku(null)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEditSku}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. EDIT PURCHASE RECORD MODAL */}
        {editPurchase && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">修改进货明细记录</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">修改该笔入库明细的参数，库存会自动重新结算</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">入库日期</label>
                  <input
                    type="date"
                    value={editPurchase.record.date}
                    onChange={e => setEditPurchase({
                      ...editPurchase,
                      record: { ...editPurchase.record, date: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">入库数量 (件)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editPurchase.record.qty}
                    onChange={e => setEditPurchase({
                      ...editPurchase,
                      record: { ...editPurchase.record, qty: Math.max(1, Number(e.target.value)) }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">单价成本 (元)</label>
                  <input
                    type="number"
                    value={editPurchase.record.cost || ''}
                    onChange={e => setEditPurchase({
                      ...editPurchase,
                      record: { ...editPurchase.record, cost: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">备注信息</label>
                  <input
                    type="text"
                    value={editPurchase.record.note}
                    onChange={e => setEditPurchase({
                      ...editPurchase,
                      record: { ...editPurchase.record, note: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={() => setEditPurchase(null)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEditPurchase}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  确认保存
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. EDIT SALE RECORD MODAL */}
        {editSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">修改出货明细记录</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">修改出货明细，库存将即时自动重计</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">出货日期</label>
                  <input
                    type="date"
                    value={editSale.record.date}
                    onChange={e => setEditSale({
                      ...editSale,
                      record: { ...editSale.record, date: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">出货数量 (件)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editSale.record.qty}
                    onChange={e => setEditSale({
                      ...editSale,
                      record: { ...editSale.record, qty: Math.max(1, Number(e.target.value)) }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">分销出货渠道</label>
                  <select
                    value={editSale.record.channel}
                    onChange={e => setEditSale({
                      ...editSale,
                      record: { ...editSale.record, channel: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    {CHANNELS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1.5">
                <button
                  onClick={() => setEditSale(null)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEditSale}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  确认保存
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. GORGEOUS COMPREHENSIVE CONFIRM MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{deleteConfirm.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {deleteConfirm.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2.5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  放弃取消
                </button>
                <button
                  onClick={deleteConfirm.onConfirm}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-rose-100 transition"
                >
                  确定继续
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
