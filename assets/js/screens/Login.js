/* VJ·POS — màn nhập PIN 4 số, rồi màn chào hiển thị hoa hồng tháng này / tháng trước.
   PIN gửi bằng POST (xem api/client.js) để không lọt vào URL và execution log. */
(function () {
  window.VJ = window.VJ || {};
  VJ.screens = VJ.screens || {};
  var e = React.createElement;
  var useState = React.useState;
  var fmtK = VJ.format.fmtK;

  function PinLogin(props) {
    var pinState = useState(""), pin = pinState[0], setPin = pinState[1];
    var errState = useState(false), err = errState[0], setErr = errState[1];
    var checkingState = useState(false), checking = checkingState[0], setChecking = checkingState[1];
    var welcomeState = useState(null), welcome = welcomeState[0], setWelcome = welcomeState[1];

    var fail = function () {
      setErr(true);
      setTimeout(function () { setPin(""); setErr(false); }, 600);
    };

    var tap = async function (n) {
      if (checking) return;
      var next = pin + n;
      setPin(next);
      setErr(false);
      if (next.length === 4) {
        setChecking(true);
        try {
          var res = await VJ.api.login(next);
          if (res.ok) {
            setWelcome({ staff: res.staff, commission: res.commission || { thisMonth: 0, lastMonth: 0 }, pin: next });
          } else {
            fail();
          }
        } catch (x) {
          fail();
        }
        setChecking(false);
      }
    };

    var del = function () { setPin(pin.slice(0, -1)); setErr(false); };

    // ── Màn chào sau khi PIN đúng ──
    if (welcome) {
      var c = welcome.commission;
      var delta = null;
      if (c.thisMonth > c.lastMonth) {
        var up = c.lastMonth > 0 ? Math.round((c.thisMonth - c.lastMonth) / c.lastMonth * 100) : 100;
        delta = e("div", { style: { fontSize: 12, color: "var(--green)", marginBottom: 4 } }, "📈 +" + up + "% so với tháng trước");
      } else if (c.thisMonth < c.lastMonth && c.lastMonth > 0) {
        var down = Math.round((c.thisMonth - c.lastMonth) / c.lastMonth * 100);
        delta = e("div", { style: { fontSize: 12, color: "var(--red)", marginBottom: 4 } }, "📉 " + down + "% so với tháng trước");
      }

      return e("div", { className: "app" },
        e("div", { className: "welcome" },
          e("div", { className: "login-logo" }, "VJ·POS"),
          e("div", { className: "welcome-card" },
            e("div", { className: "welcome-name" }, "👤 " + welcome.staff.name),
            e("div", { className: "welcome-role" }, welcome.staff.role),
            e("div", { className: "comm-grid" },
              e("div", { className: "comm-box active" },
                e("div", { className: "comm-label" }, "Tháng này"),
                e("div", { className: "comm-val" }, fmtK(c.thisMonth) + "đ")
              ),
              e("div", { className: "comm-box" },
                e("div", { className: "comm-label" }, "Tháng trước"),
                e("div", { className: "comm-val" }, fmtK(c.lastMonth) + "đ")
              )
            ),
            delta
          ),
          e("button", {
            className: "btn btn-g",
            style: { maxWidth: 340, width: "100%" },
            onClick: function () { props.onLogin(welcome.staff, welcome.pin); }
          }, "Bắt đầu làm việc →")
        )
      );
    }

    // ── Bàn phím số ──
    return e("div", { className: "app" },
      e("div", { className: "login" },
        e("div", { className: "login-logo" }, "VJ·POS"),
        e("div", { className: "login-sub" }, "Enter your 4-digit PIN"),
        e("div", { className: "pin-dots" },
          [0, 1, 2, 3].map(function (i) {
            return e("div", { key: i, className: "pin-dot" + (i < pin.length ? (err ? " err" : " filled") : "") });
          })
        ),
        checking
          ? e("div", { className: "spin", style: { margin: "20px auto" } })
          : e("div", { className: "numpad" },
            [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
              return e("button", { key: n, className: "nk", onClick: function () { tap(String(n)); } }, n);
            }),
            e("div"),
            e("button", { className: "nk", onClick: function () { tap("0"); } }, "0"),
            e("button", { className: "nk fn", onClick: del }, "⌫")
          )
      )
    );
  }

  VJ.screens.PinLogin = PinLogin;
})();
