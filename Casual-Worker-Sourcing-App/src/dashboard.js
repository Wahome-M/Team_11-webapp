// Employer dashboard: your jobs, who applied, and confirm / reject / mark done.
// Data comes from /web/my-jobs, which only returns the logged-in employer's own jobs.
const me = window.fundilinkUser();
const msg = document.getElementById("dashMsg");
const list = document.getElementById("dashJobs");

if (!me) {
  window.location.href = "login.html";
} else {
  document.getElementById("dashName").textContent = `, ${me.firstName}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent only: data is never inserted as HTML
  return node;
}

function statusPill(status) {
  return el("span", `status status-${status}`, status);
}

async function setStatus(bookingId, status, button) {
  button.disabled = true;
  const r = await window.fundilinkApi(`/web/bookings/${bookingId}`, { method: "PUT", body: { status } });
  if (!r.ok && r.status !== 401) alert(`Could not update: ${window.fundilinkError(r)}`);
  loadJobs();
}

function applicantRow(a) {
  const row = el("div", "applicant");
  const who = el("div");
  who.append(el("div", "applicant-name", `${a.workerName || `Worker #${a.workerId}`}${a.verified ? " ✓ verified" : ""}`));
  who.append(el("div", "applicant-info", [a.trade, a.location].filter(Boolean).join(" · ") || "No trade or area given"));
  row.append(who);

  const actions = el("div", "applicant-actions");
  actions.append(statusPill(a.status));
  const add = (label, status, secondary) => {
    const b = el("button", `btn-small${secondary ? " secondary" : ""}`, label);
    b.type = "button";
    b.addEventListener("click", () => setStatus(a.id, status, b));
    actions.append(b);
  };
  if (a.status === "pending") { add("Confirm", "confirmed"); add("Reject", "rejected", true); }
  if (a.status === "confirmed") add("Mark job done", "completed");
  row.append(actions);
  return row;
}

function jobPanel(job) {
  const panel = el("div", "panel");
  const head = el("div", "panel-head");
  const title = el("div");
  title.append(el("h3", "", job.title));
  title.append(el("div", "panel-meta", `${job.category} · ${job.location} · KES ${job.pay.toLocaleString()} ${job.payType}${job.duration ? ` · ${job.duration}` : ""}`));
  head.append(title);
  if (job.urgent) head.append(el("span", "card-urgent", "Urgent"));
  panel.append(head);

  panel.append(el("div", "panel-sub", `${job.applicants.length} applicant${job.applicants.length === 1 ? "" : "s"}`));
  if (job.applicants.length === 0) {
    panel.append(el("p", "applicant-info", "No one has applied yet."));
  } else {
    job.applicants.forEach((a) => panel.append(applicantRow(a)));
  }
  return panel;
}

async function loadJobs() {
  try {
    const r = await window.fundilinkApi("/web/my-jobs");
    if (!r.ok) { msg.textContent = `Could not load your jobs: ${window.fundilinkError(r)}`; return; }
    list.replaceChildren(...r.body.map(jobPanel));
    msg.textContent = r.body.length
      ? `${r.body.length} job${r.body.length === 1 ? "" : "s"} posted.`
      : "No jobs posted yet. Post your first job to start receiving applications from verified workers.";
  } catch {
    msg.textContent = `Could not reach the server at ${window.FUNDILINK_API}. Is it running?`;
  }
}

if (me) loadJobs();
