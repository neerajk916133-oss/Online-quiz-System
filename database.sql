CREATE DATABASE IF NOT EXISTS online_quiz;
USE online_quiz;

DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_option CHAR(1) NOT NULL,
  marks INT NOT NULL DEFAULT 1,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quiz_id INT NOT NULL,
  score INT NOT NULL,
  total_marks INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@quiz.com', 'admin123', 'admin'),
('Demo Student', 'student@quiz.com', 'student123', 'student');

INSERT INTO quizzes (title, description, duration_minutes) VALUES
('Java Basics', 'Basic Java programming MCQ quiz.', 10),
('DBMS Basics', 'Basic database and SQL MCQ quiz.', 10);

INSERT INTO questions
(quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
VALUES
(1, 'Which keyword is used to create a class in Java?', 'class', 'struct', 'define', 'object', 'A', 1),
(1, 'Which method is the entry point of a Java application?', 'start()', 'main()', 'run()', 'execute()', 'B', 1),
(1, 'Which data type stores true or false?', 'int', 'char', 'boolean', 'double', 'C', 1),
(1, 'Which symbol ends a Java statement?', '.', ':', ';', ',', 'C', 1),
(1, 'Which keyword is used for inheritance?', 'this', 'extends', 'super', 'inherit', 'B', 1),
(2, 'What does SQL stand for?', 'Structured Query Language', 'Simple Query Language', 'System Query List', 'Structured Question List', 'A', 1),
(2, 'Which command is used to retrieve data?', 'GET', 'SELECT', 'FETCH', 'READ', 'B', 1),
(2, 'Which key uniquely identifies a row?', 'Foreign Key', 'Primary Key', 'Candidate Value', 'Index Key', 'B', 1),
(2, 'Which command adds a new row?', 'INSERT', 'ADD', 'UPDATE', 'CREATE', 'A', 1),
(2, 'Which command changes existing data?', 'CHANGE', 'MODIFY', 'UPDATE', 'ALTER', 'C', 1);
