// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 40_catalog.gs
// Các endpoint chỉ ĐỌC: kiểm tra schema, artists (tỉ lệ hoa hồng), nhân viên, sản phẩm.
// ═══════════════════════════════════════════════════════════

// Loại hàng nào không trừ tồn kho
function _isService_(loaiHang) {
  return SERVICE_TYPES.indexOf(String(loaiHang || "").trim()) >= 0;
}

/* GET action=schema — công cụ chẩn đoán. Gọi khi app báo lỗi cột: nó liệt kê sheet thiếu,
   cột thiếu và các header thực tế đang có, đỡ phải mò trong Sheets. */
function schemaReport(reqId) {
  const issues = { missingSheets: [], missingHeaders: {}, detectedHeaders: {} };
  const required = {};

  for (const sheetName in SCHEMA) {
    required[sheetName] = SCHEMA[sheetName].requiredAnyOf;

    const ws = SS.getSheetByName(sheetName);
    if (!ws) {
      issues.missingSheets.push(sheetName);
      continue;
    }

    const hs = _headers_(ws);
    issues.detectedHeaders[sheetName] = hs;
    const hmap = _hmap_(ws);

    const miss = [];
    const req = SCHEMA[sheetName].requiredAnyOf;
    for (const key in req) {
      const ok = _col_(hmap, req[key]) >= 0;
      if (!ok) miss.push({ field: key, expectedOneOf: req[key] });
    }
    if (miss.length) issues.missingHeaders[sheetName] = miss;
  }

  return _ok_({ schema: required, issues: issues }, reqId);
}

// ===== GET: Artists — mỗi brand có 1 tỉ lệ hoa hồng trả cho nhân viên =====
function getArtists() {
  const ws = _sheet_("Admin_Artists");
  const h = _hmap_(ws);
  const data = ws.getDataRange().getValues();

  const cId = _col_(h, SCHEMA.Admin_Artists.requiredAnyOf.id);
  const cName = _col_(h, SCHEMA.Admin_Artists.requiredAnyOf.name);
  const cType = _col_(h, SCHEMA.Admin_Artists.requiredAnyOf.type);
  const cRate = _col_(h, SCHEMA.Admin_Artists.requiredAnyOf.rate);

  // Dự phòng v2.0: A=id, B=name, C=type, D=rate
  const artists = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = (cId >= 0) ? row[cId] : row[0];
    if (!id) continue;
    artists.push({
      id: String(id),
      name: String((cName >= 0) ? row[cName] : (row[1] || "")),
      type: String((cType >= 0) ? row[cType] : (row[2] || "")),
      rate: _asNum_((cRate >= 0) ? row[cRate] : row[3], 0),
    });
  }
  return { ok: true, artists: artists, version: API_VERSION, ts: _nowStr_() };
}

// { brand_id: rate } — dùng để gắn rate vào từng sản phẩm
function _getArtistMap_() {
  try {
    const res = getArtists();
    const map = {};
    (res.artists || []).forEach(a => { map[String(a.id)] = _asNum_(a.rate, 0); });
    return map;
  } catch (_) {
    return {};
  }
}

// ===== GET: Staff — CHỈ trả id/name/role, TUYỆT ĐỐI không trả cột pin =====
function getStaffPublic() {
  const ws = _sheet_("Admin_Staff");
  const h = _hmap_(ws);
  const data = ws.getDataRange().getValues();

  const cId = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.staff_id);
  const cName = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.name);
  const cRole = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.role);
  const cActive = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.active);

  const staff = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = (cId >= 0) ? row[cId] : row[0];
    if (!id) continue;

    const active = (cActive >= 0) ? row[cActive] : row[3];
    if (_isFalse_(active)) continue;

    staff.push({
      id: String(id),
      name: String((cName >= 0) ? row[cName] : (row[1] || "")),
      role: String((cRole >= 0) ? row[cRole] : (row[2] || "")),
    });
  }
  return { ok: true, staff: staff, version: API_VERSION, ts: _nowStr_() };
}

// ===== GET: Products =====
function getProducts() {
  const ws = _sheet_("Admin_Products");
  const h = _hmap_(ws);
  const data = ws.getDataRange().getValues();
  const artists = _getArtistMap_();

  const cPid = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.product_id);
  const cTen = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.ten_hang);
  const cLoai = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.loai_hang);
  const cNhom = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.nhom_hang);
  const cBrand = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.brand);
  const cPrice = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.price);
  const cCost = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.cost);
  const cQty = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.qty);
  const cImg = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.img);
  const cActive = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.active);

  // Dự phòng v2.0: A pid, B ten, C loai, D nhom, E brand, F price, G cost, H qty, I img, J active
  const products = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const pid = (cPid >= 0) ? row[cPid] : row[0];
    if (!pid) continue;

    const active = (cActive >= 0) ? row[cActive] : row[9];
    if (_isFalse_(active)) continue;

    const tenHang = String((cTen >= 0) ? row[cTen] : (row[1] || ""));
    const loaiHang = String((cLoai >= 0) ? row[cLoai] : (row[2] || ""));
    const nhomHang = String((cNhom >= 0) ? row[cNhom] : (row[3] || ""));
    const brand = String((cBrand >= 0) ? row[cBrand] : (row[4] || ""));
    const isService = _isService_(loaiHang);
    const displayName = tenHang || nhomHang || String(pid);

    const price = _asNum_((cPrice >= 0) ? row[cPrice] : row[5], 0);
    const cost = _asNum_((cCost >= 0) ? row[cCost] : row[6], 0);
    const qtyRaw = _asNum_((cQty >= 0) ? row[cQty] : row[7], 0);
    const img = String((cImg >= 0) ? row[cImg] : (row[8] || ""));

    products.push({
      id: String(pid),
      name: displayName,
      type: loaiHang,       // frontend dùng type để chọn icon và lọc
      cat: nhomHang,        // frontend dùng cat để gom nhóm
      brand: brand,
      price: price,
      cost: cost,
      qty: isService ? 999 : qtyRaw,   // dịch vụ luôn "còn hàng"
      img: img,
      rate: artists[brand] || 0,
      isService: isService,
    });
  }

  return { ok: true, count: products.length, products: products, version: API_VERSION, ts: _nowStr_() };
}
