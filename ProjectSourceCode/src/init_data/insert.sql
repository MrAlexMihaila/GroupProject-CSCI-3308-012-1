-- =====================
-- USERS
-- =====================
INSERT INTO users (username, password_hash, user_image_url) VALUES
  ('alice', '$2b$10$examplehashforalice000000000000000000000000000000000000', NULL),
  ('bob',   '$2b$10$examplehashforbob0000000000000000000000000000000000000', NULL),
  ('carol', '$2b$10$examplehashforcarol00000000000000000000000000000000000', NULL),
  ('dave',  '$2b$10$examplehashfordave000000000000000000000000000000000000', NULL),
  ('eve',   '$2b$10$examplehashforeve0000000000000000000000000000000000000', NULL);

-- =====================
-- FOLLOWS
-- =====================
INSERT INTO follows (following_user_id, followed_user_id) VALUES
  (1, 2),
  (1, 3),
  (2, 1),
  (3, 1),
  (4, 1),
  (5, 2);

-- =====================
-- ARTIST (required before album/song)
-- =====================
INSERT INTO artists (artist_id, name, image_url, last_fetched) VALUES
  ('artist_001', 'Justin Bieber', NULL, NOW()),
  ('artist_002', 'Nicki Minaj',   NULL, NOW());

-- =====================
-- ALBUM (required before song)
-- =====================
INSERT INTO albums (album_id, title, release_date, image_url) VALUES
  ('album_001', 'Believe', '2012-06-15', 'https://i.scdn.co/image/ab67616d0000b273f1d02a6cec967f8b6b78f76e');

INSERT INTO albums_to_artists (album_id, artist_id) VALUES
  ('album_001', 'artist_001');

-- =====================
-- SONG (required before reviews/comments)
-- =====================
INSERT INTO songs (song_id, title, album_id, duration, release_date, track_number) VALUES
  ('6QFCMUUq1T2Vf5sFUXcuQ7', 'Beauty And A Beat', 'album_001', 224, '2012-09-18', 3);

INSERT INTO songs_to_artists (song_id, artist_id) VALUES
  ('6QFCMUUq1T2Vf5sFUXcuQ7', 'artist_001'),
  ('6QFCMUUq1T2Vf5sFUXcuQ7', 'artist_002');

-- =====================
-- REVIEWS
-- =====================
INSERT INTO reviews (user_id, song_id, album_id, rating, review_text, likes, dislikes) VALUES
  (1, '6QFCMUUq1T2Vf5sFUXcuQ7', NULL, 5, 'Perfect Song',                      12, 1),
  (2, '6QFCMUUq1T2Vf5sFUXcuQ7', NULL, 4, 'Great track, very nostalgic.',        7, 0),
  (3, '6QFCMUUq1T2Vf5sFUXcuQ7', NULL, 3, 'Decent song but nothing groundbreaking.', 2, 3),
  (4, '6QFCMUUq1T2Vf5sFUXcuQ7', NULL, 5, 'Playing this every single day!',      9, 0),
  (5, '6QFCMUUq1T2Vf5sFUXcuQ7', NULL, 2, 'Not really my style...',              1, 5);

-- =====================
-- REVIEW REACTIONS
-- =====================
INSERT INTO review_reactions (user_id, review_id, reaction) VALUES
  (2, 1,  1),
  (3, 1,  1),
  (4, 1,  1),
  (5, 1, -1),
  (1, 2,  1),
  (3, 2,  1),
  (1, 3, -1),
  (2, 3, -1),
  (5, 3, -1),
  (1, 4,  1),
  (2, 4,  1),
  (3, 5, -1),
  (4, 5, -1);

-- =====================
-- SONG COMMENTS
-- =====================
INSERT INTO song_comments (user_id, song_id, timestamp_seconds, comment_text) VALUES
  (1, '6QFCMUUq1T2Vf5sFUXcuQ7',  15, 'That intro is amazing!'),
  (2, '6QFCMUUq1T2Vf5sFUXcuQ7',  62, 'Perfection'),
  (3, '6QFCMUUq1T2Vf5sFUXcuQ7', 120, 'Driving at 2am'),
  (4, '6QFCMUUq1T2Vf5sFUXcuQ7', 200, 'Love it'),
  (5, '6QFCMUUq1T2Vf5sFUXcuQ7', 210, 'Perfect ending!');