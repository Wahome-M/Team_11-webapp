const { useState, useEffect } = React;
// Our API server (default: this laptop). Open the page with ?api=https://their-link to use another server.
const API_BASE = window.FUNDILINK_API; // set in config.js

function JobCard({ job, onApply }) {
  return (
    <div className="job-card">
      <div className="card-top">
        <span className="card-category">{job.category}</span>
        {job.urgent && <span className="card-urgent">Urgent</span>}
      </div>
      <h3 className="card-title">{job.title}</h3>
      <p className="card-location">{job.location}</p>
      <p className="card-duration">{job.duration}</p>
      <div className="card-footer">
        <span className="card-pay">
          KES {job.pay.toLocaleString()} <small>{job.payType}</small>
        </span>
        <button
          className="apply-btn"
          disabled={job.applied}
          onClick={() => onApply(job.id)}
        >
          {job.applied ? "Applied" : "Apply Now"}
        </button>
      </div>
    </div>
  );
}

function JobGrid() {
  const [jobs, setJobs] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/web/jobs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Mark the jobs this worker has already applied for
        const mine = await window.fundilinkApi("/web/my-bookings");
        const appliedIds = new Set(mine.ok ? mine.body.map(b => b.jobId) : []);
        setJobs(data.map(j => ({ ...j, applied: appliedIds.has(j.id) })));
      } catch {
        alert(`Could not load jobs from ${API_BASE}. Is the server running?`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const chips = document.querySelectorAll(".chip");
    const handleClick = (e) => {
      chips.forEach(c => c.classList.remove("active"));
      e.target.classList.add("active");
      setActiveCategory(e.target.dataset.category);
    };
    chips.forEach(chip => chip.addEventListener("click", handleClick));
    return () => chips.forEach(chip => chip.removeEventListener("click", handleClick));
  }, []);

  // Apply as the logged-in worker. The server takes who you are from your login, not from the page.
  const handleApply = async (jobId) => {
    const r = await window.fundilinkApi("/web/bookings", { method: "POST", body: { jobId } });
    if (r.ok || r.status === 409) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applied: true } : j));
      if (r.ok) alert("Application sent! Track it under My Applications.");
      return;
    }
    if (r.status !== 401) alert(`Could not apply: ${window.fundilinkError(r)}`);
  };

  if (loading) return <p className="no-results">Loading jobs...</p>;

  const filtered = activeCategory === "all"
    ? jobs
    : jobs.filter(j => j.category === activeCategory);

  if (filtered.length === 0) {
    return <p className="no-results">No jobs found for this category.</p>;
  }

  return (
    <div className="job-grid">
      {filtered.map(job => (
        <JobCard key={job.id} job={job} onApply={handleApply} />
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("jobGrid")).render(<JobGrid />);