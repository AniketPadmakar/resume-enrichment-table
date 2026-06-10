// Candidate drop page — reads ?slug, shows the JD, posts name + email + PDF.
const $ = (id) => document.getElementById(id);
const slug = new URLSearchParams(location.search).get("slug");

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function showError(msg) {
  $("errorCard").classList.remove("hidden");
  if (msg) $("errorMsg").textContent = msg;
}

// Load the public job (title + JD + optional full-JD link).
async function loadJob() {
  if (!slug) return showError("No job link provided.");
  const res = await fetch(`/public/${slug}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return showError(body.message);

  const job = body.data;
  $("jobTitle").textContent = job.title;
  const jdEl = $("jd");
  jdEl.textContent = job.description;
  if (job.jd_url) {
    $("jdLink").href = job.jd_url;
    $("jdLink").classList.remove("hidden");
  }
  $("jobCard").classList.remove("hidden");

  // show "read full" toggle only when the JD is taller than the clamp
  requestAnimationFrame(() => {
    if (jdEl.scrollHeight > jdEl.clientHeight + 4) $("jdToggle").classList.remove("hidden");
  });
  $("jdToggle").onclick = () => {
    const clamped = jdEl.classList.toggle("clamp");
    $("jdToggle").textContent = clamped ? "Read full description ▾" : "Show less ▴";
  };
}

$("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("file").files[0];
  if (!file) return toast("Attach your résumé PDF");

  const fd = new FormData();
  fd.set("name", $("name").value.trim());
  fd.set("email", $("email").value.trim());
  fd.set("file", file);

  $("submitBtn").disabled = true;
  $("submitBtn").textContent = "Submitting…";
  try {
    const res = await fetch(`/public/${slug}/submit`, { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "Submission failed");
    // Candidate always sees a clean confirmation — internal parse status stays internal.
    $("jobCard").classList.add("hidden");
    $("doneCard").classList.remove("hidden");
  } catch (err) {
    toast(err.message);
    $("submitBtn").disabled = false;
    $("submitBtn").textContent = "Submit application";
  }
});

loadJob();
