const padThreadDateNumber = (n) => String(n).padStart(2, "0");
(function () {
  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function formatDate(date) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return (
      date.getFullYear() +
      "/" +
      padThreadDateNumber(date.getMonth() + 1) +
      "/" +
      padThreadDateNumber(date.getDate()) +
      "(" +
      days[date.getDay()] +
      ") " +
      padThreadDateNumber(date.getHours()) +
      ":" +
      padThreadDateNumber(date.getMinutes()) +
      ":" +
      padThreadDateNumber(date.getSeconds())
    );
  }
  function randomId() {
    return "ID:" + Math.random().toString(36).slice(2, 10);
  }
  function addOkaPost() {
    const input = document.querySelector("[data-oka-input]");
    const list = document.querySelector("[data-oka-posts]");
    if (!input || !list) {
      return;
    }
    const text = input.value.trim();
    if (!text) {
      return;
    }
    const no = list.querySelectorAll("[data-oka-post]").length + 1;
    const item = document.createElement("div");
    item.setAttribute("data-oka-post", "");
    item.className = "lp-thread-post is-own";
    item.setAttribute("data-post-id", "lp-oka-user-" + Date.now());
    item.innerHTML =
      '<div class="lp-thread-meta"><span class="lp-thread-no">' +
      no +
      '</span><div style="min-width:0; flex:1;"><span class="lp-thread-badge">あなた</span> <span class="lp-thread-date">' +
      formatDate(new Date()) +
      '</span></div></div><div class="lp-thread-body">' +
      escapeHtml(text) +
      '</div><div class="lp-thread-id">' +
      randomId() +
      "</div>";
    list.appendChild(item);
    input.value = "";
    list.scrollTop = list.scrollHeight;
  }
  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest("[data-oka-submit]")) {
      addOkaPost();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (
      event.target &&
      event.target.matches("[data-oka-input]") &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      addOkaPost();
    }
  });
})();
