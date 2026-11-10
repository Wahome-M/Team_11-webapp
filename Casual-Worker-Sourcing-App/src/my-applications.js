// A worker's applications and their status, from /web/my-bookings (only the logged-in worker's own).
const msg = document.getElementById("appsMsg");
const list = document.getElementById("appsList");

const NEXT_STEP = {
  pending: "Waiting for the employer to reply.",
  confirmed: "You're confirmed. The employer expects you.",
  rejected: "The employer chose someone else this time.",
  completed: "Job done. Well done!",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent only: data is never inserted as HTML
  return node;
}

function applicationPanel(b) {
  const panel = el("div", "panel");
  const head = el("div", "panel-head");
  const title = el("div");
  title.append(el("h3", "", b.title));
  const applied = new Date(b.appliedAt);
  title.append(el("div", "panel-meta",
    `${b.category} · ${b.location} · KES ${b.pay.toLocaleString()} ${b.payType}` +
    `${b.employer ? ` · posted by ${b.employer}` : ""}` +
    `${isNaN(applied) ? "" : ` · applied ${applied.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`}`));
  head.append(title);
  head.append(el("span", `status status-${b.status}`, b.status));
  panel.append(head);
  panel.append(el("p", "applicant-info", NEXT_STEP[b.status] || ""));
  return panel;
}

(async () => {
  if (!window.fundilinkUser()) { window.location.href = "login.html"; return; }
  try {
    const r = await window.fundilinkApi("/web/my-bookings");
    if (!r.ok) { msg.textContent = `Could not load your applications: ${window.fundilinkError(r)}`; return; }
    list.replaceChildren(...r.body.map(applicationPanel));
    msg.textContent = r.body.length
      ? `${r.body.length} application${r.body.length === 1 ? "" : "s"}.`
      : "You haven't applied for any jobs yet.";
  } catch {
    msg.textContent = `Could not reach the server at ${window.FUNDILINK_API}. Is it running?`;
  }
})();
