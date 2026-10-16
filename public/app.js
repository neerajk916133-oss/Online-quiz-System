let currentUser = null;
let currentQuiz = null;

const $ = id => document.getElementById(id);

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 2500);
}

function showOnly(id) {
  ["authSection","studentSection","quizSection","adminSection"].forEach(x => $(x).classList.add("hidden"));
  $(id).classList.remove("hidden");
}

$("loginTab").onclick = () => {
  $("loginTab").classList.add("active"); $("registerTab").classList.remove("active");
  $("loginForm").classList.remove("hidden"); $("registerForm").classList.add("hidden");
};
$("registerTab").onclick = () => {
  $("registerTab").classList.add("active"); $("loginTab").classList.remove("active");
  $("registerForm").classList.remove("hidden"); $("loginForm").classList.add("hidden");
};

$("registerForm").onsubmit = async e => {
  e.preventDefault();
  const res = await fetch("/api/register", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name:$("regName").value, email:$("regEmail").value, password:$("regPassword").value
    })
  });
  const data = await res.json();
  toast(data.message);
  if(res.ok) $("loginTab").click();
};

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  const res = await fetch("/api/login", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email:$("loginEmail").value, password:$("loginPassword").value})
  });
  const data = await res.json();
  if(!res.ok) return toast(data.message);

  currentUser = data.user;
  $("logoutBtn").classList.remove("hidden");
  $("authSection").classList.add("hidden");

  if(currentUser.role === "admin") {
    showOnly("adminSection");
    await loadAdmin();
  } else {
    $("studentName").textContent = currentUser.name;
    showOnly("studentSection");
    await loadStudent();
  }
};

$("logoutBtn").onclick = () => {
  currentUser = null;
  $("logoutBtn").classList.add("hidden");
  showOnly("authSection");
};

async function loadStudent() {
  const res = await fetch("/api/quizzes");
  const quizzes = await res.json();
  $("quizList").innerHTML = quizzes.map(q => `
    <div class="quiz-card">
      <h3>${escapeHtml(q.title)}</h3>
      <p>${escapeHtml(q.description || "")}</p>
      <p><b>${q.question_count}</b> questions • <b>${q.duration_minutes}</b> minutes</p>
      <button onclick="startQuiz(${q.id})">Start Quiz</button>
    </div>`).join("");
  loadResults();
}

async function loadResults() {
  const res = await fetch(`/api/results/${currentUser.id}`);
  const rows = await res.json();
  $("resultList").innerHTML = rows.length ? `
    <table><tr><th>Quiz</th><th>Score</th><th>Percentage</th><th>Date</th></tr>
    ${rows.map(r => `<tr><td>${escapeHtml(r.title)}</td><td>${r.score}/${r.total_marks}</td>
    <td>${r.percentage}%</td><td>${new Date(r.attempted_at).toLocaleString()}</td></tr>`).join("")}
    </table>` : "<p>No attempts yet.</p>";
}

async function startQuiz(id) {
  const res = await fetch(`/api/quizzes/${id}`);
  currentQuiz = await res.json();
  $("quizTitle").textContent = currentQuiz.quiz.title;
  $("quizDescription").textContent = currentQuiz.quiz.description;
  $("quizDuration").textContent = currentQuiz.quiz.duration_minutes;
  $("questionsContainer").innerHTML = currentQuiz.questions.map((q,i) => `
    <div class="question">
      <p><b>${i+1}. ${escapeHtml(q.question_text)}</b></p>
      ${["A","B","C","D"].map(letter => `
        <label class="option">
          <input type="radio" name="q${q.id}" value="${letter}"> 
          ${letter}. ${escapeHtml(q["option_"+letter.toLowerCase()])}
        </label>`).join("")}
    </div>`).join("");
  showOnly("quizSection");
}

$("backBtn").onclick = () => { showOnly("studentSection"); loadStudent(); };

$("submitQuizBtn").onclick = async () => {
  const answers = currentQuiz.questions.map(q => {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    return {question_id:q.id, answer:selected ? selected.value : null};
  });

  const res = await fetch("/api/results", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:currentUser.id, quiz_id:currentQuiz.quiz.id, answers})
  });
  const data = await res.json();
  if(!res.ok) return toast(data.message);
  alert(`Quiz submitted!\nScore: ${data.score}/${data.total_marks}\nPercentage: ${data.percentage}%`);
  showOnly("studentSection");
  loadStudent();
};

async function loadAdmin() {
  const res = await fetch("/api/quizzes");
  const quizzes = await res.json();
  $("questionQuiz").innerHTML = quizzes.map(q => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join("");
  const usersRes = await fetch("/api/admin/users");
  const users = await usersRes.json();
  $("usersTable").innerHTML = `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>
  ${users.map(u => `<tr><td>${u.id}</td><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${u.role}</td></tr>`).join("")}
  </table>`;
}

$("quizForm").onsubmit = async e => {
  e.preventDefault();
  const res = await fetch("/api/admin/quizzes", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      title:$("quizTitleInput").value, description:$("quizDescInput").value,
      duration_minutes:Number($("quizDurationInput").value)
    })
  });
  const data = await res.json(); toast(data.message);
  if(res.ok) { e.target.reset(); await loadAdmin(); }
};

$("questionForm").onsubmit = async e => {
  e.preventDefault();
  const res = await fetch("/api/admin/questions", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      quiz_id:Number($("questionQuiz").value),
      question_text:$("questionText").value,
      option_a:$("optionA").value, option_b:$("optionB").value,
      option_c:$("optionC").value, option_d:$("optionD").value,
      correct_option:$("correctOption").value, marks:Number($("questionMarks").value)
    })
  });
  const data = await res.json(); toast(data.message);
  if(res.ok) e.target.reset();
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
