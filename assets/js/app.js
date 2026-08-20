/* VJ·POS — điểm vào của app. File này CHỈ giữ state và nối dây; mọi thứ hiển thị nằm ở
   assets/js/screens/*, mọi công thức nằm ở assets/js/domain/*. Đừng viết JSX-render dài ở đây. */
(function () {
  var e = React.createElement, Fragment = React.Fragment;
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef;
  var fmt = VJ.format.fmt, vnNow = VJ.format.vnNow, vnDate = VJ.format.vnDate;
  var CAT_ORDER = VJ.catalog.CAT_ORDER;
  var drafts$ = VJ.drafts;

  function MainApp(props) {
    var auth = props.auth, pin = props.pin;
    var isAdmin = auth.role === "manager";

    // ── Dữ liệu từ Google Sheets ──
    var productsS = useState([]), products = productsS[0], setProducts = productsS[1];
    var staffS = useState([]), setStaff = staffS[1];
    var ordersS = useState([]), orders = ordersS[0], setOrders = ordersS[1];
    var loadingS = useState(true), loading = loadingS[0], setLoading = loadingS[1];
    var errorS = useState(null), error = errorS[0], setError = errorS[1];

    // ── Điều hướng + bộ lọc ──
    var tabS = useState("products"), tab = tabS[0], setTab = tabS[1];
    var searchS = useState(""), search = searchS[0], setSearch = searchS[1];
    var catS = useState("ALL"), catFilter = catS[0], setCatFilter = catS[1];
    var brandS = useState("ALL"), brandFilter = brandS[0], setBrandFilter = brandS[1];

    // ── Đơn nháp ──
    var draftsS = useState([drafts$.createEmpty(1)]), draftList = draftsS[0], setDrafts = draftsS[1];
    var activeIdS = useState(1), activeDraftId = activeIdS[0], setActiveDraftId = activeIdS[1];
    var nextNumS = useState(2), nextDraftNum = nextNumS[0], setNextDraftNum = nextNumS[1];

    // Không bao giờ để activeDraft undefined — từng gây màn hình đen sau khi submit
    var activeDraft = drafts$.find(draftList, activeDraftId) || draftList[0] || drafts$.createEmpty(activeDraftId || 1);

    // Ref giữ id draft mới nhất để các callback không bị đóng gói giá trị cũ
    var activeDraftIdRef = useRef(activeDraftId);
    activeDraftIdRef.current = activeDraftId;

    /* MỘT setter duy nhất cho mọi field của draft. Thêm field mới chỉ cần thêm vào
       drafts$.createEmpty() rồi gọi patch({tenField: giaTri}) — không phải viết hàm mới. */
    var patch = function (fields) {
      setDrafts(function (prev) { return drafts$.update(prev, activeDraftIdRef.current, fields); });
    };
    var setCart = function (valOrFn) {
      setDrafts(function (prev) { return drafts$.updateCart(prev, activeDraftIdRef.current, valOrFn); });
    };
    var setCid = function (v) { patch({ cid: v }); };
    var setCustName = function (v) { patch({ custName: v }); };
    var setCustPhone = function (v) { patch({ custPhone: v }); };
    var setBillDiscVal = function (v) { patch({ billDiscVal: v }); };
    var setBillDiscType = function (v) { patch({ billDiscType: v }); };
    var setShippingFee = function (v) { patch({ shippingFee: v }); };
    var setCardFeeOn = function (v) { patch({ cardFeeOn: v }); };
    var setOrderNotes = function (v) { patch({ orderNotes: v }); };

    var addDraft = function () {
      var num = nextDraftNum;
      setNextDraftNum(num + 1);
      setDrafts(function (prev) { return prev.concat([drafts$.createEmpty(num)]); });
      setActiveDraftId(num);
      setTab("order");
    };
    var removeDraft = function (id) {
      var fallbackNum = nextDraftNum;
      setDrafts(function (prev) {
        var remaining = drafts$.remove(prev, id, fallbackNum);
        // Không gọi setState khác bên trong updater → hoãn sang tick sau
        if (remaining.length === 1 && remaining[0].id === fallbackNum) {
          setTimeout(function () { setNextDraftNum(fallbackNum + 1); }, 0);
        }
        if (activeDraftIdRef.current === id) {
          var newId = remaining[0].id;
          setTimeout(function () { setActiveDraftId(newId); }, 0);
        }
        return remaining;
      });
    };
    var switchDraft = function (id) { setActiveDraftId(id); setTab("order"); };
    var resetActiveDraft = function () {
      setDrafts(function (prev) { return drafts$.reset(prev, activeDraftIdRef.current); });
    };

    // ── State UI tạm ──
    var selOrderS = useState(null), selOrder = selOrderS[0], setSelOrder = selOrderS[1];
    var showPayS = useState(null), showPay = showPayS[0], setShowPay = showPayS[1];
    var showCustomS = useState(false), showCustom = showCustomS[0], setShowCustom = showCustomS[1];
    var customNameS = useState(""), customName = customNameS[0], setCustomName = customNameS[1];
    var customPriceS = useState(0), customPrice = customPriceS[0], setCustomPrice = customPriceS[1];
    var toastS = useState(null), toast = toastS[0], setToast = toastS[1];
    var justAddedS = useState(null), justAddedId = justAddedS[0], setJustAddedId = justAddedS[1];
    var submittingS = useState(false), submitting = submittingS[0], setSubmitting = submittingS[1];
    var importTextS = useState(""), importText = importTextS[0], setImportText = importTextS[1];
    var importPreviewS = useState(null), importPreview = importPreviewS[0], setImportPreview = importPreviewS[1];

    var toastSeq = useRef(0);
    var showToast = function (msg, dur) {
      toastSeq.current += 1;
      setToast({ msg: msg, key: toastSeq.current });
      setTimeout(function () { setToast(null); }, dur || 1500);
    };

    // ── Nạp dữ liệu lần đầu ──
    useEffect(function () {
      (async function () {
        try {
          setLoading(true);
          var res = await Promise.all([VJ.api.get("products"), VJ.api.get("staff"), VJ.api.get("orders")]);
          if (res[0].ok) setProducts(res[0].products); else throw new Error(res[0].error);
          if (res[1].ok) setStaff(res[1].staff);
          if (res[2].ok) setOrders(res[2].orders);
          setError(null);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      })();
    }, []);

    // ── Dữ liệu dẫn xuất ──
    var categories = useMemo(function () {
      var s = new Set(products.map(function (p) { return p.type; }).filter(Boolean));
      var sorted = CAT_ORDER.filter(function (c) { return s.has(c); });
      s.forEach(function (c) { if (!sorted.includes(c)) sorted.push(c); });
      return ["ALL"].concat(sorted);
    }, [products]);

    var brands = useMemo(function () {
      var s = new Set(products.map(function (p) { return p.brand; }).filter(Boolean));
      return ["ALL"].concat(Array.from(s).sort());
    }, [products]);

    var filtered = useMemo(function () {
      return products.filter(function (p) {
        if (catFilter !== "ALL" && p.type !== catFilter) return false;
        if (brandFilter !== "ALL" && p.brand !== brandFilter) return false;
        if (search) {
          var words = search.toLowerCase().split(/\s+/).filter(Boolean);
          var target = (p.name + " " + p.id + " " + p.cat).toLowerCase();
          return words.every(function (w) { return target.indexOf(w) >= 0; });
        }
        return true;
      });
    }, [search, catFilter, brandFilter, products]);

    var cart = activeDraft.cart;
    var cartQtyMap = useMemo(function () {
      var m = {};
      cart.forEach(function (i) { m[i.id] = (m[i.id] || 0) + i.qty; });
      return m;
    }, [cart]);

    // Badge tab Orders đếm đơn CHƯA thu đủ tiền, không phải tổng số đơn
    var unpaidOrderCount = useMemo(function () {
      return orders.filter(function (o) {
        if (o.status === "VOID") return false;
        return VJ.screens.collectedOf(o) < o.grandTotal;
      }).length;
    }, [orders]);

    var totalDraftItems = useMemo(function () { return drafts$.totalItems(draftList); }, [draftList]);

    var totals = useMemo(function () {
      return VJ.totals.calcTotals(cart, {
        billDiscVal: activeDraft.billDiscVal,
        billDiscType: activeDraft.billDiscType,
        shippingFee: activeDraft.shippingFee,
        cardFeeOn: activeDraft.cardFeeOn
      });
    }, [cart, activeDraft.billDiscVal, activeDraft.billDiscType, activeDraft.shippingFee, activeDraft.cardFeeOn]);

    // ── Thao tác giỏ hàng ──
    var quickAdd = function (p) {
      if (p.qty === 0) { showToast("❌ " + p.id + " is out of stock"); return; }
      var n = activeDraft.cid + 1;
      setCid(n);
      setCart(function (prev) {
        return prev.concat([Object.assign({}, p, { qty: 1, unitPrice: p.price, discount: 0, discountPct: 0, cartId: n })]);
      });
      showToast("✓ " + p.id + " added");
      setJustAddedId(p.id);
      setTimeout(function () { setJustAddedId(null); }, 600);
    };

    var addCustomItem = function () {
      if (!customName || !customPrice) return;
      var n = activeDraft.cid + 1;
      setCid(n);
      setCart(function (prev) {
        return prev.concat([{
          id: "CUSTOM-" + n, name: customName, type: "ORDER", cat: customName, brand: "OR",
          price: customPrice, qty: 1, unitPrice: customPrice, discount: 0, discountPct: 0,
          cartId: n, rate: 0.02, isService: true, img: ""
        }]);
      });
      setShowCustom(false); setCustomName(""); setCustomPrice(0);
      showToast("✓ Custom item added");
    };

    var updateCart = function (id, f, v) {
      if (f === "qty") { if (v < 1) v = 1; if (v > 999) v = 999; }
      setCart(function (prev) {
        return prev.map(function (i) { return i.cartId === id ? Object.assign({}, i, { [f]: v }) : i; });
      });
    };
    var removeCart = function (id) {
      setCart(function (prev) { return prev.filter(function (i) { return i.cartId !== id; }); });
    };

    // ── Gọi API ──
    var submitOrder = async function () {
      if (!cart.length || submitting) return;
      setSubmitting(true);
      try {
        var items = VJ.totals.buildOrderItems(cart, totals);
        var res = await VJ.api.post({
          action: "submit_order", pin: pin,
          customerName: activeDraft.custName, customerPhone: activeDraft.custPhone,
          subtotal: totals.subtotal, itemDiscTotal: totals.itemDiscTotal,
          billDiscAmt: totals.billDiscAmt, billDiscPct: totals.billDiscPct,
          netCommBase: totals.netCommBase, cardFeeAmt: totals.cardFeeAmt,
          shipAmt: totals.shipAmt, grandTotal: totals.grandTotal,
          notes: activeDraft.orderNotes, items: items
        });
        if (!res.ok) throw new Error(res.error);

        setOrders(function (prev) {
          return [Object.assign(
            { orderId: res.orderId, date: vnNow(), staffId: auth.id, staffName: auth.name, customerName: activeDraft.custName || "Walk-in" },
            totals,
            { items: items, payments: [], notes: activeDraft.orderNotes, status: "ACTIVE" }
          )].concat(prev);
        });
        resetActiveDraft();
        showToast("✓ " + res.orderId + " saved", 2000);
        setTab("orders");
      } catch (err) {
        showToast("❌ " + err.message, 3000);
      } finally {
        setSubmitting(false);
      }
    };

    var addPayment = async function (orderId, p) {
      setSubmitting(true);
      try {
        var res = await VJ.api.post({ action: "add_payment", pin: pin, orderId: orderId, method: p.method, amount: p.amount, amountForComm: 0, note: p.note });
        if (!res.ok) throw new Error(res.error);
        setOrders(function (prev) {
          return prev.map(function (o) {
            if (o.orderId !== orderId) return o;
            return Object.assign({}, o, {
              payments: (o.payments || []).concat([{ paymentId: res.paymentId, method: p.method, amount: p.amount, note: p.note, date: vnDate() }])
            });
          });
        });
        showToast("✓ Payment recorded");
      } catch (err) {
        showToast("❌ " + err.message, 3000);
      } finally {
        setSubmitting(false);
      }
    };

    var voidOrder = async function (orderId) {
      if (!confirm("Void order " + orderId + "? Stock will be restored.")) return;
      setSubmitting(true);
      try {
        var res = await VJ.api.post({ action: "void_order", pin: pin, orderId: orderId });
        if (!res.ok) throw new Error(res.error);
        setOrders(function (prev) {
          return prev.map(function (o) { return o.orderId === orderId ? Object.assign({}, o, { status: "VOID" }) : o; });
        });
        showToast("✓ " + orderId + " voided");
        setSelOrder(null);
      } catch (err) {
        showToast("❌ " + err.message, 3000);
      } finally {
        setSubmitting(false);
      }
    };

    // Đơn đang mở chi tiết phải bám theo danh sách orders khi có thanh toán mới
    useEffect(function () {
      if (selOrder) {
        var u = orders.find(function (o) { return o.orderId === selOrder.orderId; });
        if (u) setSelOrder(u);
      }
    }, [orders]);

    var refreshProducts = async function () {
      showToast("🔄 Refreshing...");
      try {
        var r = await VJ.api.get("products");
        if (r.ok) { setProducts(r.products); showToast("✓ " + r.count + " products loaded"); }
      } catch (err) {
        showToast("❌ " + err.message, 3000);
      }
    };

    var parseImport = function () {
      if (!importText.trim()) { setImportPreview(null); return; }
      setImportPreview(VJ.screens.parseImportText(importText, products));
    };

    var submitImport = async function () {
      if (!importPreview || !importPreview.length) return;
      setSubmitting(true);
      try {
        var res = await VJ.api.post({ action: "bulk_import", pin: pin, items: importPreview });
        if (!res.ok) throw new Error(res.error);
        showToast("✓ " + res.updated + " updated, " + res.added + " added", 3000);
        setImportText(""); setImportPreview(null);
        refreshProducts();
      } catch (err) {
        showToast("❌ " + err.message, 3000);
      } finally {
        setSubmitting(false);
      }
    };

    if (loading) {
      return e("div", { className: "app" }, e("div", { className: "loader" },
        e("div", { className: "spin" }),
        e("div", { style: { color: "var(--accent2)", fontSize: 14 } }, "Loading from Google Sheets...")));
    }

    // ── RENDER: chỉ nối props vào các hàm trong screens/ ──
    var screenProps = {
      auth: auth, isAdmin: isAdmin, tab: tab, setTab: setTab, submitting: submitting,
      // products
      filtered: filtered, search: search, setSearch: setSearch, justAddedId: justAddedId,
      cartQtyMap: cartQtyMap, quickAdd: quickAdd, categories: categories, brands: brands,
      catFilter: catFilter, setCatFilter: setCatFilter, brandFilter: brandFilter, setBrandFilter: setBrandFilter,
      // order
      drafts: draftList, activeDraftId: activeDraftId, switchDraft: switchDraft,
      removeDraft: removeDraft, addDraft: addDraft, cart: cart, totals: totals,
      custName: activeDraft.custName, setCustName: setCustName,
      custPhone: activeDraft.custPhone, setCustPhone: setCustPhone,
      billDiscVal: activeDraft.billDiscVal, setBillDiscVal: setBillDiscVal,
      billDiscType: activeDraft.billDiscType, setBillDiscType: setBillDiscType,
      shippingFee: activeDraft.shippingFee, setShippingFee: setShippingFee,
      cardFeeOn: activeDraft.cardFeeOn, setCardFeeOn: setCardFeeOn,
      orderNotes: activeDraft.orderNotes, setOrderNotes: setOrderNotes,
      updateCart: updateCart, removeCart: removeCart, submitOrder: submitOrder,
      setShowCustom: setShowCustom, customName: customName, setCustomName: setCustomName,
      customPrice: customPrice, setCustomPrice: setCustomPrice, addCustomItem: addCustomItem,
      // orders
      orders: orders, selOrder: selOrder, setSelOrder: setSelOrder, setShowPay: setShowPay, voidOrder: voidOrder,
      // admin
      importText: importText, setImportText: setImportText, importPreview: importPreview,
      parseImport: parseImport, submitImport: submitImport
    };

    return e(Fragment, null,
      toast ? e("div", { className: "toast", key: toast.key }, toast.msg) : null,
      submitting ? e("div", { className: "submitting" },
        e("div", { className: "spin" }),
        e("div", { className: "submitting-t" }, "Saving to Google Sheets...")) : null,

      e("div", { className: "app" },
        e("div", { className: "top" },
          e("div", { className: "logo" }, "VJ·POS"),
          e("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            e("button", { onClick: refreshProducts, style: { background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: 4 } }, "🔄"),
            e("div", {
              style: { background: "var(--s2)", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "var(--t2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
              onClick: props.onLogout
            }, "👤 " + auth.name, isAdmin ? " ★" : "", e("span", { style: { fontSize: 10, color: "var(--t3)", marginLeft: 4 } }, "🔒"))
          )
        ),

        error ? e("div", { className: "err-banner" }, "⚠️ " + error) : null,

        // Search bar nằm NGOÀI .main nên không cuộn mất
        tab === "products" ? VJ.screens.productsSearchBar(screenProps) : null,

        e("div", { className: "main" },
          tab === "products" ? VJ.screens.products(screenProps) : null,
          tab === "order" ? VJ.screens.order(screenProps) : null,
          tab === "orders" && !selOrder ? VJ.screens.ordersList(screenProps) : null,
          tab === "orders" && selOrder ? VJ.screens.orderDetail(screenProps) : null,
          isAdmin && tab === "admin" ? VJ.screens.admin(screenProps) : null
        ),

        e("div", { className: "tabs" },
          e("button", { className: "tb " + (tab === "products" ? "on" : ""), onClick: function () { setTab("products"); } },
            e("span", { className: "tb-i" }, "💎"), e("span", { className: "tb-l" }, "Products")),
          e("button", { className: "tb " + (tab === "order" ? "on" : ""), onClick: function () { setTab("order"); } },
            e("span", { className: "tb-i" }, "🧾"),
            totalDraftItems > 0 ? e("span", { className: "badge" }, totalDraftItems) : null,
            e("span", { className: "tb-l" }, "Order")),
          e("button", { className: "tb " + (tab === "orders" ? "on" : ""), onClick: function () { setTab("orders"); setSelOrder(null); } },
            e("span", { className: "tb-i" }, "📋"),
            unpaidOrderCount > 0 ? e("span", { className: "badge" }, unpaidOrderCount) : null,
            e("span", { className: "tb-l" }, "Orders")),
          isAdmin ? e("button", { className: "tb " + (tab === "admin" ? "on" : ""), onClick: function () { setTab("admin"); } },
            e("span", { className: "tb-i" }, "⚙️"), e("span", { className: "tb-l" }, "Admin")) : null
        ),

        showCustom ? VJ.screens.customModal(screenProps) : null,
        showPay ? e(VJ.ui.PaymentModal, {
          order: showPay, submitting: submitting,
          onClose: function () { setShowPay(null); },
          onSubmit: function (p) { addPayment(showPay.orderId, p); setShowPay(null); }
        }) : null
      )
    );
  }

  function App() {
    var authS = useState(null), auth = authS[0], setAuth = authS[1];
    var pinS = useState(""), pin = pinS[0], setPin = pinS[1];
    return auth
      ? e(MainApp, { auth: auth, pin: pin, onLogout: function () { setAuth(null); setPin(""); } })
      : e(VJ.screens.PinLogin, { onLogin: function (staff, p) { setAuth(staff); setPin(p); } });
  }

  window.addEventListener("unhandledrejection", function (ev) {
    try { console.error("Unhandled promise rejection:", ev.reason); } catch (e2) {}
  });

  console.log("VJ·POS build:", VJ.config.BUILD_VERSION);

  ReactDOM.render(e(VJ.ui.ErrorBoundary, null, e(App)), document.getElementById("root"));
})();
