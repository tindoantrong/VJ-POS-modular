/* VJ·SHOP — chặn màn hình trắng. Cố ý KHÔNG dùng lại VJ.ui.ErrorBoundary của POS vì
   component đó bám vào class CSS của app tối (.app/.top/.main), đưa sang đây sẽ hiện lỗi
   trần không style. Khách đang mua hàng mà thấy trang trắng là mất đơn. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {}; VJ.shop.ui = VJ.shop.ui || {};
  var e = React.createElement;

  VJ.shop.ui.ShopError = class extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, msg: "" }; }

    static getDerivedStateFromError(err) {
      return { hasError: true, msg: String(err && err.message ? err.message : err) };
    }

    componentDidCatch(err, info) {
      try { console.error("VJ·SHOP lỗi:", err, info); } catch (e2) {}
    }

    render() {
      if (!this.state.hasError) return this.props.children;

      var tel = VJ.shop.CONTACT.hotline;
      return e("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 } },
        e("div", { style: { maxWidth: 420, textAlign: "center" } },
          e("div", { style: { fontSize: 52, marginBottom: 14 } }, "🌾"),
          e("h1", { style: { fontSize: 22, color: "var(--green)", fontWeight: 800, marginBottom: 10 } },
            "Trang đang gặp sự cố"),
          e("p", { style: { color: "var(--ink-2)", fontSize: 15, marginBottom: 20 } },
            "Bạn vui lòng tải lại trang. Nếu vẫn lỗi, gọi ngay cho chúng tôi để đặt hàng trực tiếp."),
          e("button", { className: "btn btn-main", onClick: function () { location.reload(); } }, "Tải lại trang"),
          e("a", { className: "btn btn-ghost", style: { display: "block", textDecoration: "none", textAlign: "center" },
                   href: "tel:" + tel.replace(/\s/g, "") }, "📞 Gọi " + tel),
          e("div", { style: { marginTop: 18, fontSize: 11.5, color: "var(--ink-3)", fontFamily: "monospace", wordBreak: "break-word" } },
            this.state.msg)
        )
      );
    }
  };
})();
