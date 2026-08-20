/* VJ·POS — tab Admin (chỉ role manager): nhập kho hàng loạt bằng cách dán từ spreadsheet.
   Định dạng mỗi dòng: product_id, qty_to_add, [new_price], [name], [type], [brand]
   Tách bằng TAB (dán từ Sheets) hoặc dấu phẩy (gõ tay). */
(function () {
  window.VJ = window.VJ || {};
  VJ.screens = VJ.screens || {};
  var e = React.createElement;

  /* Parse text nhập kho thành danh sách item + đối chiếu với sản phẩm đang có.
     Hàm thuần — tách khỏi UI để sau này viết test được. */
  function parseImportText(text, products) {
    var lines = String(text || "").trim().split("\n");
    var items = [];
    for (var li = 0; li < lines.length; li++) {
      var parts = lines[li].split("\t").length > 1 ? lines[li].split("\t") : lines[li].split(",");
      if (parts.length < 2) continue;

      var pid = parts[0].trim();
      var qtyAdd = parseInt(parts[1]) || 0;
      var price = parts[2] ? parseInt(parts[2]) : undefined;
      var name = parts[3] ? parts[3].trim() : undefined;
      var type = parts[4] ? parts[4].trim() : undefined;
      var brand = parts[5] ? parts[5].trim() : undefined;

      var existing = products.find(function (p) { return p.id === pid; });
      items.push({
        product_id: pid,
        qty_add: qtyAdd,
        price: price,
        name: name || (existing ? existing.name : undefined),
        type: type || (existing ? existing.type : ""),
        brand: brand || (existing ? existing.brand : ""),
        isExisting: !!existing,
        existingQty: existing ? existing.qty : 0
      });
    }
    return items;
  }

  function admin(p) {
    return e("div", { className: "fin", style: { padding: 16 } },
      e("div", { className: "stit" }, "📦 Stock Import"),
      e("div", { style: { fontSize: 12, color: "var(--t3)", marginBottom: 8 } }, "Paste from spreadsheet or type CSV. Format per line:"),
      e("div", { style: { fontSize: 11, color: "var(--t3)", marginBottom: 4, fontFamily: "'Space Mono',monospace" } }, "product_id, qty_to_add, [new_price], [name], [type], [brand]"),
      e("div", { style: { fontSize: 11, color: "var(--t3)", marginBottom: 12 } }, "Existing products: stock adds. New products: creates row."),

      e("textarea", {
        className: "nti",
        style: { minHeight: 120, fontFamily: "'Space Mono',monospace", fontSize: 12 },
        value: p.importText,
        onChange: function (ev) { p.setImportText(ev.target.value); },
        placeholder: "CHR2201267, 5\nCHR2201266, 3, 1800000\nNEW001, 10, 500000, Custom Ring, RING, KS"
      }),
      e("button", { className: "btn btn-o", onClick: p.parseImport }, "Preview Import"),

      p.importPreview ? e("div", null,
        e("div", { className: "imp-preview" },
          e("div", { style: { fontSize: 11, color: "var(--t2)", marginBottom: 8 } }, p.importPreview.length + " items parsed"),
          p.importPreview.map(function (item, i) {
            return e("div", { key: i, className: "imp-row " + (item.isExisting ? "upd" : "new") },
              e("span", null, (item.isExisting ? "🔄" : "➕") + " " + item.product_id),
              e("span", { style: { fontFamily: "'Space Mono',monospace" } }, "+" + item.qty_add + (item.isExisting ? " (was " + item.existingQty + ")" : ""))
            );
          })
        ),
        e("button", { className: "btn btn-g", onClick: p.submitImport }, "Confirm Import · " + p.importPreview.length + " items")
      ) : null
    );
  }

  VJ.screens.admin = admin;
  VJ.screens.parseImportText = parseImportText;
})();
