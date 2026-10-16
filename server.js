const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "online_quiz",
  waitForConnections: true,
  connectionLimit: 10
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Server and database are connected." });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields are required." });

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email already registered." });

    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'student')",
      [name, email, password]
    );
    res.json({ message: "Registration successful. Please login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE email = ? AND password = ?",
      [email, password]
    );
    if (!rows.length) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/quizzes", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT q.id, q.title, q.description, q.duration_minutes,
             COUNT(questions.id) AS question_count
      FROM quizzes q
      LEFT JOIN questions ON questions.quiz_id = q.id
      GROUP BY q.id
      ORDER BY q.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/quizzes/:id", async (req, res) => {
  try {
    const [quizRows] = await pool.query("SELECT * FROM quizzes WHERE id = ?", [req.params.id]);
    if (!quizRows.length) return res.status(404).json({ message: "Quiz not found." });

    const [questions] = await pool.query(`
      SELECT id, question_text, option_a, option_b, option_c, option_d
      FROM questions WHERE quiz_id = ? ORDER BY id
    `, [req.params.id]);

    res.json({ quiz: quizRows[0], questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/results", async (req, res) => {
  const { user_id, quiz_id, answers } = req.body;
  if (!user_id || !quiz_id || !Array.isArray(answers)) {
    return res.status(400).json({ message: "Invalid result data." });
  }

  try {
    const [questions] = await pool.query(
      "SELECT id, correct_option, marks FROM questions WHERE quiz_id = ?",
      [quiz_id]
    );

    let score = 0;
    let total = 0;
    const answerMap = new Map(answers.map(a => [Number(a.question_id), a.answer]));

    for (const q of questions) {
      total += Number(q.marks);
      if (answerMap.get(q.id) === q.correct_option) score += Number(q.marks);
    }

    const percentage = total ? ((score / total) * 100).toFixed(2) : "0.00";

    const [result] = await pool.query(
      "INSERT INTO results (user_id, quiz_id, score, total_marks, percentage) VALUES (?, ?, ?, ?, ?)",
      [user_id, quiz_id, score, total, percentage]
    );

    res.json({
      result_id: result.insertId,
      score,
      total_marks: total,
      percentage
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/results/:userId", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, q.title, r.score, r.total_marks, r.percentage, r.attempted_at
      FROM results r
      JOIN quizzes q ON q.id = r.quiz_id
      WHERE r.user_id = ?
      ORDER BY r.attempted_at DESC
    `, [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/admin/quizzes", async (req, res) => {
  const { title, description, duration_minutes } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required." });

  try {
    const [result] = await pool.query(
      "INSERT INTO quizzes (title, description, duration_minutes) VALUES (?, ?, ?)",
      [title, description || "", duration_minutes || 10]
    );
    res.json({ id: result.insertId, message: "Quiz created." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/admin/questions", async (req, res) => {
  const { quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;
  if (!quiz_id || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
    return res.status(400).json({ message: "All question fields are required." });
  }

  try {
    await pool.query(`
      INSERT INTO questions
      (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks || 1]);

    res.json({ message: "Question added." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Online Quiz System running at http://localhost:${PORT}`);
});
