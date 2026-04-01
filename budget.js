// ── budget.js ──────────────────────────────────────────────
// 記帳模組 - 簡單快速，超過100才記

const CATEGORIES = [
  { id:"food",    label:"飲食", emoji:"🍜" },
  { id:"home",    label:"居家", emoji:"🏠" },
  { id:"traffic", label:"交通", emoji:"🚗" },
  { id:"fun",     label:"娛樂", emoji:"🎮" },
  { id:"other",   label:"其他", emoji:"📦" },
];

// ── 新增記帳 Modal ─────────────────────────────────────────
function AddExpenseModal({ user, displayName, defaultMonth, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // 預設今天，但如果當前瀏覽月份不是今月，預設該月第一天
  function getDefaultDate() {
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if (defaultMonth === nowMonth) {
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }
    return `${defaultMonth}-01`;
  }
  const [date, setDate] = useState(getDefaultDate());

  function handleSave() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setSaving(true);
    // 用選的日期產生 id（保留時間排序）
    const d = new Date(date + "T" + new Date().toTimeString().slice(0,8));
    onSave({
      id: d.getTime(),
      amount: Math.round(num),
      category,
      note: note.trim(),
      who: displayName,
      time: new Date().toLocaleTimeString("zh-TW", { hour:"2-digit", minute:"2-digit" }),
      date,
    });
  }

  const cat = CATEGORIES.find(c => c.id === category);

  return ReactDOM.createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"flex-end", background:"rgba(0,0,0,0.2)" }}
      onClick={onClose}>
      <div className="pop-in" onClick={e=>e.stopPropagation()}
        style={{ width:"100%", maxWidth:430, margin:"0 auto", background:C.card, borderRadius:"20px 20px 0 0", padding:"24px 20px 40px" }}>

        {/* 金額輸入 */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:13, color:C.sub, marginBottom:8 }}>支出金額</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <span style={{ fontSize:24, color:C.sub, fontWeight:300 }}>NT$</span>
            <input
              type="number" value={amount} onChange={e=>setAmount(e.target.value)}
              placeholder="0" autoFocus
              onKeyDown={e=>e.key==="Enter"&&handleSave()}
              style={{ width:160, border:"none", borderBottom:`2px solid ${C.accent}`, outline:"none", fontSize:40, fontFamily:"'Noto Serif TC',serif", fontWeight:700, color:C.text, textAlign:"center", background:"transparent", padding:"4px 0" }}
            />
          </div>
        </div>

        {/* 日期選擇 */}
        <div style={{ marginBottom:16 }}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:12, padding:"10px 14px", fontSize:14, color:C.text, background:C.bg, outline:"none", WebkitAppearance:"none", appearance:"none" }} />
        </div>

        {/* 類別選擇 */}
        <div style={{ display:"flex", gap:8, marginBottom:16, justifyContent:"center" }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={()=>setCategory(c.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 12px", borderRadius:12, border:`1.5px solid ${category===c.id?C.accent:C.border}`, background:category===c.id?C.accentLight:C.bg, cursor:"pointer", transition:"all 0.15s", minWidth:52 }}>
              <span style={{ fontSize:22 }}>{c.emoji}</span>
              <span style={{ fontSize:10, color:category===c.id?C.accent:C.sub, fontWeight:category===c.id?600:400 }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 備註 */}
        <input value={note} onChange={e=>setNote(e.target.value)}
          placeholder="備註（選填）"
          style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:12, padding:"11px 14px", fontSize:15, color:C.text, background:C.bg, outline:"none", marginBottom:16 }} />

        {/* 確認按鈕 */}
        <button onClick={handleSave} disabled={saving||!amount||parseFloat(amount)<=0}
          style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontSize:16, fontWeight:600, cursor:"pointer", opacity:(!amount||parseFloat(amount)<=0)?0.5:1 }}>
          {saving ? "記錄中…" : `記錄 ${cat.emoji} NT$${amount||0}`}
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Budget App ─────────────────────────────────────────────
function BudgetApp({ user, password, saving, setSaving, displayName }) {
  const [myRecords, setMyRecords] = useState([]);
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [partner, setPartner] = useState(undefined);
  const [filterWho, setFilterWho] = useState("all");
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const timer = useRef(null);

  // 固定存在 _shared_budget，key 用 帳號_月份
  const SHEET = "budget";
  const myKey = `${user}_${viewMonth}`;
  const partnerKey = partner ? `${partner}_${viewMonth}` : null;

  // 載入 partner（先查快取，沒有才打 API）
  useEffect(()=>{
    const cached = cacheHas(user, "budget_partner", "partner")
      ? cacheGet(user, "budget_partner", "partner") : null;
    if (cached !== null) {
      setPartner(cached);
      return;
    }
    apiCall({ action:"getBudgetPartner", user, password }).then(val => {
      const p = (val && String(val).trim() && String(val) !== "null") ? String(val).trim() : "";
      cacheSet(user, "budget_partner", "partner", p);
      setPartner(p);
    });
  }, []);

  // 載入資料 - partner 已在啟動時預載，直接同時讀兩個快取
  useEffect(()=>{
    if (partner === undefined) return;

    const cachedMy = cacheHas("_shared", SHEET, myKey) ? cacheGet("_shared", SHEET, myKey) : null;
    const cachedPartner = partnerKey && cacheHas("_shared", SHEET, partnerKey) ? cacheGet("_shared", SHEET, partnerKey) : null;

    // 快取都有，直接一起顯示
    if (cachedMy !== null && (!partnerKey || cachedPartner !== null)) {
      try { setMyRecords(cachedMy ? (Array.isArray(JSON.parse(cachedMy))?JSON.parse(cachedMy):[]) : []); } catch { setMyRecords([]); }
      if (partnerKey) {
        try { setPartnerRecords(cachedPartner ? (Array.isArray(JSON.parse(cachedPartner))?JSON.parse(cachedPartner):[]) : []); } catch { setPartnerRecords([]); }
      }
      setLoaded(true);
      return;
    }

    // 快取不完整，同時打所有缺少的 API
    setLoaded(false);
    Promise.all([
      cachedMy !== null ? Promise.resolve(cachedMy)
        : apiCall({ action:"readOne", user:"_shared", sheet:SHEET, key:myKey }),
      partnerKey && cachedPartner === null
        ? apiCall({ action:"readOne", user:"_shared", sheet:SHEET, key:partnerKey })
        : Promise.resolve(cachedPartner),
    ]).then(([myVal, partnerVal]) => {
      if (cachedMy === null) {
        const str = typeof myVal === "string" ? myVal : JSON.stringify(myVal||[]);
        cacheSet("_shared", SHEET, myKey, str);
      }
      if (partnerKey && cachedPartner === null && partnerVal !== null) {
        const str = typeof partnerVal === "string" ? partnerVal : JSON.stringify(partnerVal||[]);
        cacheSet("_shared", SHEET, partnerKey, str);
      }
      try { setMyRecords(myVal ? (Array.isArray(myVal)?myVal:JSON.parse(myVal)) : []); } catch { setMyRecords([]); }
      if (partnerKey) {
        try { setPartnerRecords(partnerVal ? (Array.isArray(partnerVal)?partnerVal:JSON.parse(partnerVal)) : []); } catch { setPartnerRecords([]); }
      }
      setLoaded(true);
    });
  }, [viewMonth, partner]);

  function save(next) {
    setMyRecords(next);
    cacheSet("_shared", SHEET, myKey, JSON.stringify(next));
    setSaving(p=>({...p, budget:true}));
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await writeOne("_shared", SHEET, myKey, JSON.stringify(next));
      setSaving(p=>({...p, budget:false}));
    }, 1500);
  }

  function handleAdd(expense) {
    save([expense, ...myRecords]);
    setShowAdd(false);
  }

  function handleDelete(id) {
    if (!confirm("確定要刪除這筆記錄？")) return;
    // 只能刪自己的記錄
    if (myRecords.find(r=>r.id===id)) {
      save(myRecords.filter(r => r.id !== id));
    }
  }

  // 合併 + 排序
  const allRecords = [...myRecords, ...partnerRecords].sort((a,b) => b.id - a.id);

  // 篩選
  const filteredRecords = allRecords.filter(r => {
    if (!partner || filterWho === "all") return true;
    if (filterWho === "me") return r.who === displayName;
    return r.who !== displayName;
  });

  // 統計
  const today = new Date().toLocaleDateString("zh-TW");
  const todayRecords = filteredRecords.filter(r => {
    const d = new Date(r.id).toLocaleDateString("zh-TW");
    return d === today;
  });
  const todayTotal = todayRecords.reduce((s,r) => s+r.amount, 0);
  const monthTotal = filteredRecords.reduce((s,r) => s+r.amount, 0);

  // 月份切換
  function prevMonth() {
    const [y,m] = viewMonth.split("-").map(Number);
    if (m === 1) setViewMonth(`${y-1}-12`);
    else setViewMonth(`${y}-${String(m-1).padStart(2,'0')}`);
  }
  function nextMonth() {
    const [y,m] = viewMonth.split("-").map(Number);
    if (m === 12) setViewMonth(`${y+1}-01`);
    else setViewMonth(`${y}-${String(m+1).padStart(2,'0')}`);
  }

  const [vy, vm] = viewMonth.split("-").map(Number);
  const monthLabel = `${vy}年 ${vm}月`;
  const isCurrentMonth = viewMonth === (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  })();

  return (
    <div style={{ height:"100%", overflowY:"auto", padding:"20px 20px 100px", background:C.bg }}>

      {/* 統計卡 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg, ${C.accent}, #2d5a3d)`, borderRadius:16, padding:"16px", color:"#fff" }}>
          <div style={{ fontSize:12, opacity:0.8, marginBottom:4 }}>今日支出</div>
          <div style={{ fontSize:24, fontFamily:"'Noto Serif TC',serif", fontWeight:700 }}>NT$ {todayTotal.toLocaleString()}</div>
          <div style={{ fontSize:11, opacity:0.6, marginTop:4 }}>{todayRecords.length} 筆</div>
        </div>
        <div style={{ background:C.card, borderRadius:16, padding:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>本月支出</div>
          <div style={{ fontSize:24, fontFamily:"'Noto Serif TC',serif", fontWeight:700, color:C.text }}>NT$ {monthTotal.toLocaleString()}</div>
          <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>
            {partner ? `與 ${partner} 共同記帳 · ` : ""}{filteredRecords.length} 筆
          </div>
        </div>
      </div>

      {/* 篩選 tabs - 只有共同記帳才顯示 */}
      {partner && (
        <div style={{ display:"flex", background:C.border, borderRadius:10, padding:3, marginBottom:14 }}>
          {[["all","全部"],["me","我的"],["partner","對方的"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilterWho(val)}
              style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:filterWho===val?600:400, color:filterWho===val?C.text:C.sub, background:filterWho===val?C.card:"transparent", transition:"all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 月份切換 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={prevMonth}
          style={{ width:32, height:32, borderRadius:16, background:C.card, border:`1.5px solid ${C.border}`, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{monthLabel}</div>
        <button onClick={nextMonth}
          style={{ width:32, height:32, borderRadius:16, background:C.card, border:`1.5px solid ${C.border}`, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>

      {/* 記錄列表 */}
      {!loaded ? (
        <div style={{ padding:40, display:"flex", justifyContent:"center" }}>
          <div style={{ width:28, height:28, borderRadius:14, border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:C.sub }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💰</div>
          <div style={{ fontSize:15, marginBottom:6 }}>這個月還沒有記錄</div>
          <div style={{ fontSize:13 }}>點下方 + 新增第一筆</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filteredRecords.map((r,i) => {
            const cat = CATEGORIES.find(c=>c.id===r.category) || CATEGORIES[4];
            const rDate = r.date ? new Date(r.date+"T00:00:00") : new Date(r.id);
            const dateStr = rDate.toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"});
            const prevDate = i>0 ? (filteredRecords[i-1].date ? new Date(filteredRecords[i-1].date+"T00:00:00") : new Date(filteredRecords[i-1].id)).toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"}) : null;
            const showDate = i===0 || prevDate !== dateStr;

            return (
              <div key={r.id}>
                {showDate && (
                  <div style={{ fontSize:12, color:C.sub, padding:"8px 4px 4px", fontWeight:500 }}>
                    {dateStr}{rDate.toLocaleDateString("zh-TW")===today?" · 今天":""}
                  </div>
                )}
                <div className="fade-up" style={{ background:C.card, borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)", animationDelay:`${i*15}ms` }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:20 }}>
                    {cat.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{cat.label}</span>
                      <span style={{ fontSize:11, color:C.sub }}>· {r.who}</span>
                      <span style={{ fontSize:11, color:C.sub }}>· {r.time}</span>
                    </div>
                    {r.note && <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{r.note}</div>}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:C.text }}>NT${r.amount.toLocaleString()}</div>
                    <button onClick={()=>handleDelete(r.id)}
                      style={{ fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", padding:0, marginTop:2 }}>刪除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增按鈕 */}
      <button onClick={()=>setShowAdd(true)}
        style={{ position:"fixed", bottom:32, right:"calc(50% - 215px + 20px)", width:52, height:52, borderRadius:26, background:C.accent, border:"none", fontSize:26, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(74,124,89,0.4)", cursor:"pointer", color:"#fff" }}>
        +
      </button>

      {showAdd && (
        <AddExpenseModal
          user={user}
          displayName={displayName}
          defaultMonth={viewMonth}
          onSave={handleAdd}
          onClose={()=>setShowAdd(false)}
        />
      )}
    </div>
  );
}
