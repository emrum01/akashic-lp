window.SAFARI_TRACK = {
  ga4Id: "G-F53JLZ0Z44", // ← GA4測定ID（本番）。空/プレースホルダにすると注入されない
  formBaseUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSdIkxqX2XbYLUMMcv-RIiqYILNnGcjQI4NWPJXrWDtZTJqoJw/viewform",
  // Googleフォームのhidden項目 entry ID（手動取得して差し込む。空のままなら該当キーはURLに付かない＝安全）
  formEntries: {
    source: "entry.25730402", // 例 'entry.1234567890'
    medium: "entry.864487700",
    campaign: "",
    ref: "",
    cta: "",
    landing_path: "",
  },
  // リファラー（参照元ドメイン）からの自動判定マップ。明示パラメータが無いときのみ使用。
  // ここに { match:['媒体ドメイン'], source:'...', medium:'...' } を追記すれば判定対象が増える。
  referrerMap: [
    { match: ["instagram.com"], source: "instagram", medium: "social" },
    { match: ["x.com", "twitter.com", "t.co"], source: "x", medium: "social" },
    { match: ["line.me", "lin.ee", "liff.line.me"], source: "line", medium: "social" },
    { match: ["threads.net", "threads.com"], source: "threads", medium: "social" },
    { match: ["google."], source: "google", medium: "organic" },
    // 謎解きプラットフォーム（ドメイン確定後にここへ追記）:
    // { match: ['<nazohiroba-domain>'], source: 'nazohiroba', medium: 'platform' },
    // { match: ['<nazolog-domain>'],    source: 'nazolog',    medium: 'platform' }
  ],
  webnazo: { enabled: false }, // 将来のWeb謎計測拡張ポイント（今は無効）
};

(function () {
  const cfg = window.SAFARI_TRACK;
  const STORE_KEY = "safari_attribution";
  const PLACEHOLDER = "G-XXXXXXXXXX";

  // --- 1) URLパラメータ解析（utm_* を正規化） ---
  function parseParams() {
    let q = {};
    try {
      const sp = new URLSearchParams(location.search);
      const get = function (k) {
        return sp.get(k) || "";
      };
      q.source = get("source") || get("utm_source");
      q.medium = get("medium") || get("utm_medium");
      q.campaign = get("campaign") || get("utm_campaign");
      q.ref = get("ref");
    } catch (_error) {
      q = { source: "", medium: "", campaign: "", ref: "" };
    }
    return q;
  }
  const params = parseParams();
  const hasParam = !!(params.source || params.medium || params.campaign || params.ref);

  // --- 1.5) リファラー自動判定（明示パラメータが無いときの補完） ---
  function detectFromReferrer() {
    let ref = "";
    try {
      ref = document.referrer || "";
    } catch (_error) {
      ref = "";
    }
    if (!ref) {
      return null;
    } // リファラー無し → direct扱いへ
    let host = "";
    try {
      host = new URL(ref).hostname.toLowerCase().replace(/^www\./, "");
    } catch (_error) {
      return null;
    }
    if (!host) {
      return null;
    }
    // 自サイトからの内部遷移は無視
    if (host === location.hostname.toLowerCase().replace(/^www\./, "")) {
      return null;
    }
    // referrerMap を走査（部分一致：完全一致 / '.'+m で終わる / m を含む）
    const map = cfg.referrerMap || [];
    for (let i = 0; i < map.length; i++) {
      const rule = map[i],
        ms = rule.match || [];
      for (let j = 0; j < ms.length; j++) {
        const m = String(ms[j]).toLowerCase();
        if (
          host === m ||
          host.indexOf("." + m) === host.length - m.length - 1 ||
          host.indexOf(m) !== -1
        ) {
          return { source: rule.source, medium: rule.medium };
        }
      }
    }
    // どのルールにも一致しない外部リファラー → hostnameそのままで取りこぼさず記録
    return { source: host, medium: "referral" };
  }
  const referrerInfo = params.source || params.medium ? null : detectFromReferrer();

  // --- 1.6) SNSアプリ内ブラウザ判定（User-Agentから）。referrerが空になりがちなWebViewでearnedを捕捉 ---
  // UA文字列（小文字）に対する部分一致ルール。source名は referrerMap と整合（instagram/x/line/threads）。
  const clientAppMap = [
    { match: ["instagram"], app: "instagram" },
    { match: ["fban", "fbav"], app: "facebook" },
    { match: ["line/", " line"], app: "line" },
    { match: ["threads"], app: "threads" },
    { match: ["twitter"], app: "x" },
    { match: ["tiktok"], app: "tiktok" },
  ];
  function detectClientApp() {
    let ua = "";
    try {
      ua = (navigator.userAgent || "").toLowerCase();
    } catch (_error) {
      return "unknown";
    }
    if (!ua) {
      return "unknown";
    }
    for (let i = 0; i < clientAppMap.length; i++) {
      const rule = clientAppMap[i],
        ms = rule.match || [];
      for (let j = 0; j < ms.length; j++) {
        if (ua.indexOf(ms[j]) !== -1) {
          return rule.app;
        }
      }
    }
    return "browser"; // 通常のSafari/Chrome等
  }

  // effective source/medium 決定：明示パラメータ最優先 → リファラー判定 → direct
  const effSource = params.source || (referrerInfo && referrerInfo.source) || "";
  const effMedium = params.medium || (referrerInfo && referrerInfo.medium) || "";
  // 流入情報が1つでも得られたか（明示param または リファラー判定）
  const hasAttribution = hasParam || !!referrerInfo;

  // --- 2) localStorage アトリビューション（first/last touch） ---
  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }
  function writeStore(obj) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (_error) {}
  }
  function makeTouch(src, med) {
    return {
      source: src,
      medium: med,
      campaign: params.campaign,
      ref: params.ref,
      landing_path: location.pathname,
      ts: new Date().toISOString(),
    };
  }
  const store = readStore();
  if (hasAttribution) {
    // 明示パラメータ または リファラー判定で流入元が得られた訪問
    const touch = makeTouch(effSource, effMedium);
    if (!store.first_touch) {
      store.first_touch = touch;
    } // 初回のみ確定（以後不変）
    store.last_touch = touch; // 毎回上書き
    writeStore(store);
  } else if (!store.first_touch && !store.last_touch) {
    // 完全初回かつdirect：両方をdirectで記録
    const d = makeTouch("direct", "");
    store.first_touch = d;
    store.last_touch = d;
    writeStore(store);
  }
  // 既存のチャネル情報がある場合のdirect訪問はlast_touchを上書きしない（保持）

  // 送信に使う現在の流入情報：last_touch優先→first_touch→direct
  const cur = store.last_touch ||
    store.first_touch || {
      source: "direct",
      medium: "",
      campaign: "",
      ref: "",
      landing_path: location.pathname,
    };
  const first = store.first_touch || cur;

  // --- 3) GA4（gtag stubは常に定義、本番IDのときのみ実注入） ---
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  const liveId =
    cfg.ga4Id && cfg.ga4Id !== PLACEHOLDER && cfg.ga4Id.indexOf("G-") === 0 ? cfg.ga4Id : null;
  if (liveId) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(liveId);
    document.head.appendChild(s);
    gtag("js", new Date());
    // page_viewに流入情報をuser_propertiesとして付与
    gtag("set", "user_properties", {
      att_source: cur.source,
      att_medium: cur.medium,
      att_campaign: cur.campaign,
      att_first_source: first.source,
      att_first_medium: first.medium,
      att_first_campaign: first.campaign,
      att_client_app: detectClientApp(),
    });
    gtag("config", liveId);
  }

  // --- 4) CTA配線（DOMContentLoaded後） ---
  function wireCTAs() {
    const els = document.querySelectorAll("[data-cta]");
    for (let i = 0; i < els.length; i++) {
      (function (el) {
        const ctaId = el.getAttribute("data-cta");
        const href = el.getAttribute("href") || "";
        const isForm = href.indexOf("docs.google.com/forms") !== -1;

        // フォームCTAはロード時にプレフィル付きURLへ書き換え
        if (isForm) {
          const values = {
            source: cur.source,
            medium: cur.medium,
            campaign: cur.campaign,
            ref: cur.ref,
            cta: ctaId,
            landing_path: first.landing_path || location.pathname,
          };
          let url = cfg.formBaseUrl + "?usp=pp_url";
          const keys = ["source", "medium", "campaign", "ref", "cta", "landing_path"];
          for (let k = 0; k < keys.length; k++) {
            const key = keys[k];
            const entry = cfg.formEntries[key];
            const val = values[key];
            if (entry && val) {
              url += "&" + entry + "=" + encodeURIComponent(val);
            }
          }
          el.setAttribute("href", url);
        }

        el.addEventListener("click", function () {
          window.gtag("event", "reservation_cta_click", {
            cta_id: ctaId,
            source: cur.source,
            medium: cur.medium,
            campaign: cur.campaign,
          });
          if (isForm) {
            window.gtag("event", "form_open", {
              cta_id: ctaId,
              source: cur.source,
              medium: cur.medium,
              campaign: cur.campaign,
            });
          }
        });
      })(els[i]);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireCTAs);
  } else {
    wireCTAs();
  }
})();
