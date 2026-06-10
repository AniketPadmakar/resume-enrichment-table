// Recruiter console — vanilla JS over the JSON API. No framework, no build step.
const $ = (id) => document.getElementById(id);

let currentJobId = null;
let currentJob = null;

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

// Thin fetch wrapper — unwraps our { success, data } envelope, throws on error.
async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body.data;
}

// ---- reusable skills chip editor ----
function makeChips(editorId, inputId) {
  let arr = [];
  let dragIndex = null;
  const editor = $(editorId);
  const input = $(inputId);

  function render() {
    editor.querySelectorAll(".chip-tag").forEach((c) => c.remove());
    arr.forEach((s, i) => {
      const chip = document.createElement("span");
      chip.className = "chip-tag";
      chip.draggable = true;
      chip.innerHTML = `<span>${s}</span><button type="button" aria-label="remove">×</button>`;
      chip.querySelector("button").onclick = () => {
        arr.splice(i, 1);
        render();
      };
      chip.ondragstart = () => (dragIndex = i);
      chip.ondragover = (e) => e.preventDefault();
      chip.ondrop = (e) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === i) return;
        const [moved] = arr.splice(dragIndex, 1);
        arr.splice(i, 0, moved);
        dragIndex = null;
        render();
      };
      editor.insertBefore(chip, input);
    });
  }

  function add(value) {
    const v = value.trim().replace(/,$/, "").trim();
    if (!v || arr.some((s) => s.toLowerCase() === v.toLowerCase())) return;
    arr.push(v);
    render();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(e.target.value);
      e.target.value = "";
    } else if (e.key === "Backspace" && !e.target.value && arr.length) {
      arr.pop();
      render();
    }
  });

  return {
    add,
    get: () => arr,
    set: (a) => {
      arr = [...(a || [])];
      render();
    },
    clear: () => {
      arr = [];
      render();
    },
  };
}

const createChips = makeChips("skillsEditor", "skillInput");
const editChips = makeChips("editSkillsEditor", "editSkillInput");

// ---- create job ----
$("suggestBtn").onclick = async () => {
  const description = $("jd").value.trim();
  if (!description) return toast("Paste a JD first");
  $("suggestBtn").disabled = true;
  $("suggestBtn").textContent = "Thinking…";
  try {
    const result = await api("/jobs/extract-skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description }),
    });
    result.skills.forEach((s) => createChips.add(s));
    toast(`Suggested ${result.skills.length} skills`);
  } catch (e) {
    toast(e.message);
  } finally {
    $("suggestBtn").disabled = false;
    $("suggestBtn").textContent = "Suggest from JD";
  }
};

$("createBtn").onclick = async () => {
  const title = $("title").value.trim();
  const description = $("jd").value.trim();
  if (!title || !description) return toast("Title and JD are required");
  try {
    const job = await api("/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        required_skills: createChips.get(),
      }),
    });
    const link = `${location.origin}/apply.html?slug=${job.public_slug}`;
    $("applyLink").value = link;
    $("linkArea").classList.remove("hidden");
    $("title").value = $("jd").value = "";
    createChips.clear();
    toast("Job created");
    loadJobs();
  } catch (e) {
    toast(e.message);
  }
};

$("copyBtn").onclick = () => {
  navigator.clipboard.writeText($("applyLink").value);
  toast("Link copied");
};

// ---- jobs as tabs ----
async function loadJobs(selectId) {
  const { items } = await api("/jobs?limit=50");
  const tabs = $("jobsTabs");
  if (!items.length) {
    tabs.innerHTML = `<span class="muted">No jobs yet — create one above.</span>`;
    return;
  }
  tabs.innerHTML = "";
  for (const job of items) {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.dataset.id = job.id;
    tab.innerHTML = `${job.title}<span class="count">${job._count?.candidates ?? 0}</span>`;
    tab.onclick = () => openJob(job);
    tabs.appendChild(tab);
  }
  const target = items.find((j) => j.id === (selectId || currentJobId)) || items[0];
  openJob(target);
}

// ---- candidates ----
async function openJob(job) {
  currentJobId = job.id;
  currentJob = job;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.id === job.id));
  $("candTitle").textContent = job.title;
  $("linkText").textContent = `/apply.html?slug=${job.public_slug}`;
  $("drawer").classList.add("hidden");
  $("drawer").classList.remove("open");
  document.body.style.overflow = "";
  await loadCandidates();
}

function statusTag(s) {
  if (s === "DONE") return `<span class="tag done">Done</span>`;
  if (s === "FAILED") return `<span class="tag failed">Failed</span>`;
  return `<span class="tag analyzing">Analyzing…</span>`;
}

function renderCandidates(items, startIndex = 0) {
  const body = $("candBody");
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="10" class="muted" style="padding:18px">No matching candidates.</td></tr>`;
    return;
  }
  body.innerHTML = "";
  items.forEach((c, idx) => {
    const i = startIndex + idx;
    const companies = (c.companies || []).length ? c.companies.join(", ") : "—";
    const matched = (c.matched_skills || []).map((s) => `<span class="pill match">${s}</span>`).join("");
    const pct = c.match_score == null ? null : Math.round(c.match_score * 100);
    const score =
      pct == null
        ? "—"
        : `<span class="score">${pct}%</span><span class="score-bar"><i style="width:${pct}%"></i></span>`;
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML = `
      <td class="rownum">${i + 1}</td>
      <td class="name">${c.name}</td>
      <td>${c.email}</td>
      <td>${c.location || "—"}</td>
      <td>${c.experience_years ?? "—"}</td>
      <td>${c.grad_year ?? "—"}</td>
      <td class="wrap">${companies}</td>
      <td class="wrap">${matched || '<span class="muted">—</span>'}</td>
      <td>${score}</td>
      <td>${statusTag(c.status)}</td>`;
    tr.onclick = () => showDetail(c.id);
    body.appendChild(tr);
  });
}

// ---- client-side filter / sort / paginate ----
let allCandidates = [];
let candPage = 1;
let pollTimer = null;
const PAGE_SIZE = 10;

async function loadCandidates() {
  const { items } = await api(`/jobs/${currentJobId}/candidates?limit=500`);
  allCandidates = items;
  candPage = 1;
  applyView();
  schedulePoll();
}

// while any candidate is still Analyzing, re-fetch so the grid flips to Done live
function schedulePoll() {
  clearTimeout(pollTimer);
  if (!allCandidates.some((c) => c.status === "PENDING")) return;
  const jobAtSchedule = currentJobId;
  pollTimer = setTimeout(async () => {
    if (jobAtSchedule !== currentJobId) return;
    try {
      const { items } = await api(`/jobs/${currentJobId}/candidates?limit=500`);
      allCandidates = items;
      applyView();
      schedulePoll();
    } catch {
      /* keep last view on a transient error */
    }
  }, 3000);
}

function applyView() {
  const q = $("fSearch").value.trim().toLowerCase();
  const loc = $("fLocation").value.trim().toLowerCase();
  const minExp = parseFloat($("fMinExp").value);
  const minScore = parseFloat($("fMinScore").value);
  const status = $("fStatus").value;
  const sort = $("fSort").value;

  const rows = allCandidates.filter((c) => {
    if (q && !`${c.name} ${c.email}`.toLowerCase().includes(q)) return false;
    if (loc && !(c.location || "").toLowerCase().includes(loc)) return false;
    if (!isNaN(minExp) && (c.experience_years ?? -1) < minExp) return false;
    if (!isNaN(minScore) && Math.round((c.match_score ?? 0) * 100) < minScore) return false;
    if (status && c.status !== status) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sort === "recent") return new Date(b.created_at) - new Date(a.created_at);
    if (sort === "exp") return (b.experience_years ?? -1) - (a.experience_years ?? -1);
    return (b.match_score ?? -1) - (a.match_score ?? -1); // default: top match
  });

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (candPage > pages) candPage = pages;
  const start = (candPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  renderCandidates(pageRows, start);
  $("pagerInfo").textContent = total
    ? `${total} candidate${total === 1 ? "" : "s"} · showing ${start + 1}–${start + pageRows.length}`
    : "No matches";
  $("pageInfo").textContent = `Page ${candPage} / ${pages}`;
  $("prevPage").disabled = candPage <= 1;
  $("nextPage").disabled = candPage >= pages;
}

["fSearch", "fLocation", "fMinExp", "fMinScore"].forEach((id) =>
  $(id).addEventListener("input", () => {
    candPage = 1;
    applyView();
  }),
);
["fStatus", "fSort"].forEach((id) =>
  $(id).addEventListener("change", () => {
    candPage = 1;
    applyView();
  }),
);
$("fClear").onclick = () => {
  ["fSearch", "fLocation", "fMinExp", "fMinScore"].forEach((id) => ($(id).value = ""));
  $("fStatus").value = "";
  $("fSort").value = "score";
  candPage = 1;
  applyView();
};
$("prevPage").onclick = () => {
  if (candPage > 1) {
    candPage--;
    applyView();
  }
};
$("nextPage").onclick = () => {
  candPage++;
  applyView();
};

// ---- detail drawer ----
function esc(v) {
  return v == null || v === "" ? "—" : String(v);
}
function link(url) {
  return url ? `<a href="${url}" target="_blank" rel="noopener">${url}</a>` : "—";
}

async function showDetail(id) {
  const c = await api(`/candidates/${id}`);
  $("detailName").textContent = c.name || "Candidate dossier";

  const spec = [
    ["Email", esc(c.email)],
    ["Location", esc(c.location)],
    ["Phone", esc(c.phone)],
    ["Experience", c.experience_years == null ? "—" : `${c.experience_years} yrs`],
    ["Graduated", esc(c.grad_year)],
    ["LinkedIn", link(c.linkedin_url)],
    ["GitHub", link(c.github_url)],
    ["Status", statusTag(c.status)],
  ]
    .map(([k, v]) => `<div class="spec-row"><span class="k">${k}</span><span class="v">${v}</span></div>`)
    .join("");

  const companies = (c.companies || []).length
    ? c.companies
        .map((co, i) => {
          const current = i === c.companies.length - 1;
          return `<tr><td class="rank">${i + 1}</td><td>${co}${current ? ' <span class="current-tag">current</span>' : ""}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="2" class="muted">No companies parsed.</td></tr>`;

  const required = new Set((c.matched_skills || []).map((s) => s.toLowerCase()));
  const skills = (c.skills || []).length
    ? c.skills
        .map((s) => `<span class="pill ${required.has(s.toLowerCase()) ? "match" : ""}">${s}</span>`)
        .join("")
    : '<span class="muted">No skills parsed.</span>';

  $("detailBody").innerHTML = `
    <div class="spec">${spec}</div>
    <div class="dossier-block">
      <h3>Work history · oldest → current</h3>
      <div class="table-wrap">
        <table class="co-table">
          <thead><tr><th style="width:48px">#</th><th>Company</th></tr></thead>
          <tbody>${companies}</tbody>
        </table>
      </div>
    </div>
    <div class="dossier-block">
      <h3>Skills · matched to JD highlighted</h3>
      <div>${skills}</div>
    </div>
    ${
      c.source_file
        ? `<div class="dossier-block"><a class="resume-link" href="/candidates/${c.id}/resume" target="_blank" rel="noopener">View original résumé ↗</a></div>`
        : ""
    }`;

  openDrawer();
}

function openDrawer() {
  const d = $("drawer");
  d.classList.remove("hidden");
  void d.offsetWidth; // force reflow so the slide-in transitions
  d.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  const d = $("drawer");
  d.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => d.classList.add("hidden"), 280);
}

$("drawerClose").onclick = closeDrawer;
$("drawerBackdrop").onclick = closeDrawer;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("drawer").classList.contains("open")) closeDrawer();
});

// ---- edit job modal ----
function openEditModal() {
  if (!currentJob) return;
  $("editTitle").value = currentJob.title || "";
  $("editJd").value = currentJob.description || "";
  editChips.set(currentJob.required_skills || []);
  const m = $("jobModal");
  m.classList.remove("hidden");
  void m.offsetWidth;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeEditModal() {
  const m = $("jobModal");
  m.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => m.classList.add("hidden"), 220);
}

function applyUrl() {
  return currentJob ? `${location.origin}/apply.html?slug=${currentJob.public_slug}` : "";
}
$("copyLinkBtn").onclick = () => {
  if (!currentJob) return;
  navigator.clipboard.writeText(applyUrl());
  toast("Apply link copied");
};
$("openLinkBtn").onclick = () => {
  if (currentJob) window.open(applyUrl(), "_blank");
};

$("editJobBtn").onclick = openEditModal;
$("editClose").onclick = closeEditModal;
$("editCancel").onclick = closeEditModal;
$("jobModalBackdrop").onclick = closeEditModal;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("jobModal").classList.contains("open")) closeEditModal();
});

$("editSave").onclick = async () => {
  const title = $("editTitle").value.trim();
  const description = $("editJd").value.trim();
  if (!title || !description) return toast("Title and JD are required");
  try {
    await api(`/jobs/${currentJob.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, required_skills: editChips.get() }),
    });
    closeEditModal();
    toast("Job updated");
    await loadJobs(currentJob.id);
  } catch (e) {
    toast(e.message);
  }
};

$("editDelete").onclick = async () => {
  if (!confirm(`Delete "${currentJob.title}" and all its candidates?`)) return;
  try {
    await api(`/jobs/${currentJob.id}`, { method: "DELETE" });
    closeEditModal();
    toast("Job deleted");
    currentJobId = null;
    currentJob = null;
    await loadJobs();
  } catch (e) {
    toast(e.message);
  }
};

loadJobs();
