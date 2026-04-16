CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  --email VARCHAR(100) NOT NULL UNIQUE,--
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_image_url VARCHAR(255)
); 

CREATE TABLE follows (
  following_user_id INT NOT NULL,
  followed_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (following_user_id, followed_user_id),
  FOREIGN KEY (following_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (followed_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (following_user_id <> followed_user_id)
);

CREATE TABLE artists (
  artist_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255),
  last_fetched TIMESTAMP
);

CREATE TABLE albums (
  album_id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  release_date DATE,
  image_url VARCHAR(255)
);

CREATE TABLE albums_to_artists (
  album_artist_id SERIAL PRIMARY KEY,
  album_id VARCHAR(50) NOT NULL,
  artist_id VARCHAR(50) NOT NULL,
  UNIQUE (album_id, artist_id),
  FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE
);

CREATE TABLE songs (
  song_id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  album_id VARCHAR(50),
  duration INT CHECK (duration >= 0),
  release_date DATE,
  track_number INT,
  FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE SET NULL
);

CREATE TABLE songs_to_artists (
  song_artist_id SERIAL PRIMARY KEY,
  song_id VARCHAR(50) NOT NULL,
  artist_id VARCHAR(50) NOT NULL,
  UNIQUE (song_id, artist_id),
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  review_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  song_id VARCHAR(50),
  album_id VARCHAR(50),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 5),
  review_text TEXT,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, song_id),
  UNIQUE (user_id, album_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE CASCADE
);

CREATE TABLE review_reactions (
  user_id INT NOT NULL,
  review_id INT NOT NULL,
  reaction SMALLINT NOT NULL, --where 1 is like, -1 is dislike
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, review_id),

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,

  CHECK (reaction IN (1, -1))
);

CREATE TABLE genres (
  genre_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE songs_to_genres (
  song_genre_id SERIAL PRIMARY KEY,
  song_id VARCHAR(50) NOT NULL,
  genre_id INT NOT NULL,
  UNIQUE (song_id, genre_id),
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE albums_to_genres (
  album_genre_id SERIAL PRIMARY KEY,
  album_id VARCHAR(50) NOT NULL,
  genre_id INT NOT NULL,
  UNIQUE (album_id, genre_id),
  FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE song_comments (
  comment_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  song_id VARCHAR(50) NOT NULL,
  timestamp_seconds INT NOT NULL CHECK (timestamp_seconds >= 0),
  comment_text TEXT NOT NULL,
  UNIQUE (user_id, song_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE
);