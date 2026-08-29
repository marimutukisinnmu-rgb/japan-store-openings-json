const DATA_URL = "https://raw.githubusercontent.com/marimutukisinnmu-rgb/japan-store-openings-json/main/json/latest.json";

const state = {
  items: [],
  data: null
};

const $ = (id) => document.getElementById(id);

function escapeText(value) {
  return String(value ?? "");
}

function formatDate(value) {
  if (!value) return "日付不明";
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo"
  }).format(date);
}

function populateFilter(selectId, values) {
  const select = $(selectId);
  const current = select.value;
  for (const value of values.sort((a, b) => a.localeCompare(b, "ja"))) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  if (values.includes(current)) select.value = current;
}

function render(items) {
  const list = $("storeList");
  list.replaceChildren();

  $("count").textContent = items.length.toLocaleString("ja-JP");
  $("message").style.display = items.length ? "none" : "block";
  $("message").textContent = items.length ? "" : "条件に一致する店舗がありません。";

  const template = $("storeTemplate");

  for (const item of items) {
    const node = template.content.cloneNode(true);
    node.querySelector(".store-date").textContent = formatDate(item.open_date);
    node.querySelector(".store-name").textContent = escapeText(item.store_name || "店舗名不明");
    node.querySelector(".store-location").textContent = [item.prefecture, item.city].filter(Boolean).join(" / ") || "所在地不明";
    node.querySelector(".store-category").textContent = item.category ? `カテゴリ：${item.category}` : "カテゴリ：不明";
    node.querySelector(".store-type").textContent = item.business_type || "unknown";

    const link = node.querySelector(".source-link");
    if (item.source_url) {
      link.href = item.source_url;
    } else {
      link.removeAttribute("href");
      link.textContent = "出典なし";
    }

    const evidence = node.querySelector(".evidence");
    if (item.evidence_summary) {
      evidence.textContent = item.evidence_summary;
    } else {
      evidence.remove();
    }

    list.appendChild(node);
  }
}

function applyFilters() {
  const prefecture = $("prefectureFilter").value;
  const category = $("categoryFilter").value;
  const keyword = $("search").value.trim().toLocaleLowerCase("ja-JP");

  const filtered = state.items.filter((item) => {
    const prefectureMatch = !prefecture || item.prefecture === prefecture;
    const categoryMatch = !category || item.category === category;
    const name = String(item.store_name ?? "").toLocaleLowerCase("ja-JP");
    const keywordMatch = !keyword || name.includes(keyword);
    return prefectureMatch && categoryMatch && keywordMatch;
  });

  render(filtered);
}

async function load() {
  try {
    $("message").textContent = "最新データを読み込んでいます…";
    const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data || !Array.isArray(data.items)) {
      throw new Error("items が見つかりません");
    }

    state.data = data;
    state.items = data.items;

    $("period").textContent = data.period ? `対象期間：${data.period}` : "対象期間：—";
    $("updated").textContent = data.updatetime ? `最終更新：${data.updatetime}` : "最終更新：—";

    populateFilter("prefectureFilter", [...new Set(state.items.map((x) => x.prefecture).filter(Boolean))]);
    populateFilter("categoryFilter", [...new Set(state.items.map((x) => x.category).filter(Boolean))]);

    applyFilters();
  } catch (error) {
    console.error(error);
    $("message").style.display = "block";
    $("message").textContent = "最新データの読み込みに失敗しました。JSONのURLや公開状態を確認してください。";
    $("count").textContent = "—";
  }
}

$("prefectureFilter").addEventListener("change", applyFilters);
$("categoryFilter").addEventListener("change", applyFilters);
$("search").addEventListener("input", applyFilters);

load();
