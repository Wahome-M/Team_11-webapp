// Post a job as the logged-in employer. The server fills in who posted it from the login session.
const form = document.getElementById("jobForm");
const submit = document.getElementById("jobSubmit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = (id) => document.getElementById(id).value.trim();
  const job = {
    title: value("jobTitle"),
    category: value("jobCategory"),
    location: value("jobLocation"),
    pay: Number(value("jobPay")),
    payType: value("jobPayType"),
    duration: value("jobDuration") || undefined,
    description: value("jobDescription") || undefined,
    urgent: document.getElementById("jobUrgent").checked,
  };
  if (!job.title || !job.category || !job.location || !value("jobPay") || !(job.pay >= 0)) {
    alert("Please fill in the title, category, location and pay.");
    return;
  }

  submit.disabled = true;
  try {
    const r = await window.fundilinkApi("/web/jobs", { method: "POST", body: job });
    if (r.ok) {
      window.location.href = "dashboard.html";
      return;
    }
    if (r.status !== 401) alert(`Could not post the job: ${window.fundilinkError(r)}`);
  } catch {
    alert(`Could not reach the server at ${window.FUNDILINK_API}. Is it running?`);
  } finally {
    submit.disabled = false;
  }
});
