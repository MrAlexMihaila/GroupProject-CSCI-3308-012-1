-- Seed users for friends functionality
-- bcrypt hash of password 'password'
-- source hash: $2a$10$CwTycUXWue0Thq9StjUM0uJ8bZU1f0XU/HtZzF0RRqbi0.8V8aG1e
INSERT INTO users (user_id, username, email, password_hash, created_at) VALUES
(1, 'user_a', 'alan@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8bZU1f0XU/HtZzF0RRqbi0.8V8aG1e', NOW() - INTERVAL '1/1/2000'),
(2, 'user_b', 'bella@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8bZU1f0XU/HtZzF0RRqbi0.8V8aG1e', NOW() - INTERVAL '1/1/2000'),
(3, 'user_c', 'carol@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8bZU1f0XU/HtZzF0RRqbi0.8V8aG1e', NOW() - INTERVAL '1/1/2000'),
(4, 'user_d', 'dan@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8bZU1f0XU/HtZzF0RRqbi0.8V8aG1e', NOW() - INTERVAL '1/1/2000');