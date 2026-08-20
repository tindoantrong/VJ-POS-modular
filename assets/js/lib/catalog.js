/* VJ·POS — bảng tra cứu danh mục hàng. Thêm brand/loại hàng mới thì sửa Ở ĐÂY.
   brand phải khớp cột brand_id trong sheet Admin_Products, loại hàng khớp cột loai_hang. */
(function () {
  window.VJ = window.VJ || {};

  var BRAND_COLORS = {
    "KS": "#B0C4D8", "CH": "#C77DFF", "OTS": "#00B4D8", "CT": "#EF476F",
    "KP": "#06D6A0", "KR": "#118AB2", "TF": "#FF6B35", "MD": "#7209B7",
    "GR": "#FFD166", "SV": "#8D99AE", "TOOTHCHARMGEM": "#2EC4B6", "W": "#073B4C",
    "HB": "#E56B6F", "HD": "#B5838D", "AC": "#6D6875", "OR": "#FFBE0B",
    "CX": "#FB5607", "PR": "#3A86FF", "SE": "#8338EC"
  };

  var CAT_ICONS = {
    "RING": "💍", "NECKLACE": "📿", "EAR STUD": "✨", "EAR HOOP": "⭕",
    "BRACELET": "⛓", "EAR CUFF": "🌙", "EAR HOOK": "🪝", "CHAIN": "🔗",
    "PENDANT": "🔮", "BANGLE": "🪬", "NOSE RING": "👃", "ACCESSORY": "🎀",
    "WATCH": "⌚", "GRILLZ": "🦷", "TOOTHGEM": "💎", "TOOTHCHARM": "✦",
    "Service": "🔧", "KEYCHAIN": "🔑", "BROOCH": "🌸", "ANK": "🦶"
  };

  // Thứ tự hiển thị pill lọc loại hàng (loại nào không có ở đây sẽ xếp cuối)
  var CAT_ORDER = ["RING", "NECKLACE", "EAR STUD", "EAR HOOP", "BRACELET", "EAR CUFF",
    "CHAIN", "PENDANT", "BANGLE", "GRILLZ", "TOOTHGEM", "TOOTHCHARM", "Service",
    "WATCH", "NOSE RING", "EAR HOOK", "KEYCHAIN", "ACCESSORY", "BROOCH", "ANK"];

  VJ.catalog = {
    brandColor: function (b) { return BRAND_COLORS[b] || "#6B7280"; },
    catIcon: function (c) { return CAT_ICONS[c] || "📦"; },
    CAT_ORDER: CAT_ORDER
  };
})();
