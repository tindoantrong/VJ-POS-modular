/* VJ·POS — chặn màn hình đen. Lỗi render bất kỳ sẽ hiện màn Recovery kèm thông báo tiếng Việt
   thay vì để nhân viên đứng trước mặt khách với cái màn hình trống. */
(function () {
  window.VJ = window.VJ || {};
  VJ.ui = VJ.ui || {};
  var e = React.createElement;

  var ErrorBoundary = class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, errorMsg: "" };
    }
    static getDerivedStateFromError(err) {
      return { hasError: true, errorMsg: String(err && err.message ? err.message : err) };
    }
    componentDidCatch(err, info) {
      try { console.error("VJ·POS crashed:", err, info); } catch (e2) {}
    }
    render() {
      if (this.state.hasError) {
        return e("div", { className: "app" },
          e("div", { className: "top" },
            e("div", { className: "logo" }, "VJ·POS"),
            e("div", { style: { color: "var(--t3)", fontSize: 12 } }, "Recovery")
          ),
          e("div", { className: "main", style: { padding: 16 } },
            e("div", { className: "err-banner" },
              "Ứng dụng vừa gặp lỗi hiển thị (màn hình đen). Bạn bấm Reload để tiếp tục.\n",
              e("div", { style: { marginTop: 8, fontFamily: "'Space Mono', monospace", fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" } }, this.state.errorMsg)
            ),
            e("button", { className: "btn btn-g", onClick: function () { location.reload(); } }, "Reload")
          )
        );
      }
      return this.props.children;
    }
  };

  VJ.ui.ErrorBoundary = ErrorBoundary;
})();
