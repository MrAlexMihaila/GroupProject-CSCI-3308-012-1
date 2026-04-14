const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars'); //to enable express to work with handlebars
const Handlebars = require('handlebars'); // to include the templating engine responsible for compiling templates
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

//specific spotify functions
let spotifyToken = null;
let tokenExpiresAt = 0;

//get the spotify api token for use in all future spotify api calls, and make sure we do not spam call the server every
//single time we refresh the page
function getSpotifyToken()
{
  const currentTime = Date.now();

  //if a token already exists and token has not expired, simply return the token we already made
  if(spotifyToken && currentTime < tokenExpiresAt) 
  {
    //console.log("token not expired yet");
    return Promise.resolve(spotifyToken);
  }

  //fetch a new token since we either have not gotten a token yet, or current token has expired
  return axios({
      url: "https://accounts.spotify.com/api/token",
      method: "POST",
      headers: 
      {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }).toString(),
    })
    .then(response => {
      spotifyToken = response.data.access_token;

      //gets the time when the token will expire
      tokenExpiresAt = currentTime + (response.data.expires_in * 1000);

      return spotifyToken;
    })
    .catch(err => {
      console.error("Error getting Spotify Token, maybe an API issue?", err.response?.data || err.message);
    });
};

//random string for spotify web playback sdk
const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Helper functions for handlebars
Handlebars.registerHelper('mod', function(a, b) {
  return a % b;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('div', function(a, b) {
  return Math.floor(a / b);
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});
//makes follower count formatted on artists page
Handlebars.registerHelper('formatNumber', (num) => {
  return num ? num.toLocaleString() : '';
});
Handlebars.registerHelper('year', (date) => {
  return date ? date.substring(0, 4) : '';
});
Handlebars.registerHelper('formatDuration', (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});
Handlebars.registerHelper('limit', (arr, n) => {
  return arr ? arr.slice(0, n) : [];
});

//for individual song page
Handlebars.registerHelper("gradeFromRating", (rating) => {
  if(rating >= 5)
  {
    return "A";
  }
  else if(rating >= 4)
  {
    return "B";
  }
  else if(rating >= 3)
  {
    return "C";
  }
  else if(rating >= 2)
  {
    return "D";
  }
  else if(rating >= 1)
  {
    return "E";
  }
  else
  {
    return "F";
  }
});

//helper function for review rating calculations
function convertRatingToLetter(rating)
{
    if(rating >= 4.5)
    {
      return "A";
    }
    else if(rating >= 3.5)
    {
      return "B";
    }
    else if(rating >= 2.5)
    {
      return "C";
    } 
    else if(rating >= 1.5)
    {
      return "D";
    }
    else
    {
      return "E";
    }
}

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

  // Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
      })
);

//Makes user available to all templates
app.use((req, res, next) => {
  //console.log("SESSION ON REQUEST:", req.session.user);
  res.locals.user = req.session.user || null;
  //user logged into spotify
  let userLoggedIntoSpotify = false;
  if(req.session.spotifyAccessToken)
  {
    userLoggedIntoSpotify = true;
  }
  res.locals.userLoggedIntoSpotify = userLoggedIntoSpotify;
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static(__dirname + '/')); //allow for anything in resources directory to be used

//basically everything above this line was taken from lab 7

// helper function to get recent reviews
async function getRecentReviews(userid, limit = 5) {
  try {
    const reviews = await db.any(
      `SELECT r.review_id, r.rating, r.review_text, r.song_id, r.created_at, u.username,
              COALESCE(s.title, 'Unknown Song') AS song_title
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN songs s ON r.song_id = s.song_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
      [userid, limit]
    );
    return reviews;
  } catch (err) {
    console.error('Error fetching recent reviews:', err);
    return [];
  }
}

//lab 10 test function
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

//default, just redirect to home
app.get('/', (req, res) => {
    res.redirect('/home');
});

//home get route, renders home page
app.get('/home', (req, res) => {
    res.render('pages/home');
});

//logic get route
app.get('/login', (req, res) => {
    res.render('pages/login');
});

//taken from lab 7, checks and then logs in user
app.post('/login', async (req, res) => {
  const {username, password} = req.body;

  try {
    const user = await db.oneOrNone(
      `SELECT * FROM users WHERE username = $1`, [username]
    );

    if(!user) //user not found
    {
      return res.redirect('/register');
    }

    // check if password from request matches with password in DB
    const match = await bcrypt.compare(req.body.password, user.password_hash);

    if(!match) //password and/or user do not match
    {
      return res.render('pages/login', {message: 'Incorrect Username or password!'});
    }

    req.session.user = user;
    req.session.save();
    
    res.redirect('/home'); //default, probably change
  } catch(err)
  {
    return res.render('pages/login', {message: 'Something went wrong. Please try again.'});
  }
});

//register get route, renders register page
app.get('/register', (req, res) => {
    res.render('pages/register');
});

//register post route
app.post('/register', async (req, res) => {
  const {username, password} = req.body;

  // Fail fast for invalid usernames used in API tests and to avoid DB constraint hangs.
  if (!username || username.length > 50) {
    return res.status(400).json({ message: 'Failed to register!' });
  }

  try {
    //hash the password using bcrypt library
    const hash = await bcrypt.hash(password, 10);

    await db.none(
      `INSERT INTO users(username, password_hash) VALUES($1, $2);`, [username, hash]
    );

    //res.status(200).json({ message: 'Register Successful!' });
    res.redirect('/login');
  } catch(err) {

    // check if user already exists, if so send to register page with message
    try {
      const existingUser = await db.oneOrNone(
        `SELECT * FROM users WHERE username = $1`, [username]
      );

      if (existingUser) {
        return res.render('pages/register', {message: 'Username already exists'});
      }

      // Any other registration error should still respond (prevents request timeouts).
      return res.status(400).json({ message: 'Failed to register!'});
    } catch(err) {
      //console.log("Database Error:", err.message || err);
      return res.status(400).json({ message: 'Failed to register!'});
    }
  }
});

//get route for spotify login
app.get('/spotify-login', (req, res) => {
  const scope = "streaming user-read-email user-read-private user-modify-playback-state";
  const state = generateRandomString(16);

  //save for later
  req.session.spotifyAuthState = state;

  //generate parameters for link
  let authQueryParameters = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: "http://127.0.0.1:3000/spotify-callback",
    state: state
  });

  res.redirect('https://accounts.spotify.com/authorize/?' + authQueryParameters.toString());
});

//get route for spotify callback
app.get('/spotify-callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state || null;
  const storedState = req.session.spotifyAuthState || null;

  if(state === null || state !== storedState)
  {
    console.error("State mismatch?");
    return res.redirect('/home');
  }

  //we don't need the state anymore, so delete it
  delete req.session.spotifyAuthState;

  try
  {
    const response = await axios({
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer
          .from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET)
          .toString('base64'),
      },
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: "http://127.0.0.1:3000/spotify-callback",
      }).toString(),
    });

    req.session.spotifyAccessToken = response.data.access_token;

    console.log("Connected with Spotify!");

    res.redirect('/home');
  }catch (err) {
    console.error(err.response?.data || err.message);
    res.send("Spotify login failed");
  }
});

app.get('/search', async (req, res) => {
  console.log("TYPE FROM FRONTEND:", req.query.type);
  const query = req.query.song;
  let type = req.query.type || "track"; // defaults to song
  
  const validTypes = ["track", "artist", "album"];
  if (!validTypes.includes(type)) {
    type = "track"; // defaults to track
  }

  if (!query) { //sends home if search bar is empty
    return res.redirect('/home');
  }

  try {
    // get a valid api token
    const token = await getSpotifyToken();
    
    const response = await axios({

      url: "https://api.spotify.com/v1/search",
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
      },
      
      params: {
        q: query, // what the user entered
        type: type, // only search for whatever is in the dropdown
        limit: 25, // number of results
      },
    });

    //get the track list from spotify
    let results = [];

    if (type === "track") {
      results = response.data.tracks.items;
      res.render('pages/search_song', {
        song_list: results,
        isSongs: true
      });
    }
    else if (type === "artist") {
      results = response.data.artists.items;
      res.render('pages/search_artist', {
        artist_list: results,
        isArtists: true
      });
    }
    else if (type === "album") {
      results = response.data.albums.items;
      res.render('pages/search_album', {
        album_list: results,
        isAlbums: true
      });
    }
    console.log("Search query:", query);
    console.log("Search type:", type);
    console.log("Number of results:", results.length);
    console.log("First result:", results[0]);
  }
  

  
  catch (err) {
    console.error(err.response?.data || err.message);

    res.render('pages/song', {
      song_list: [],
      isSongs: true,
      error: "Search Failed"
    });
  }
});

//individual artist page
app.get('/artist/:id', async (req, res) => {
  const artistID = req.params.id;

  try {
    const token = await getSpotifyToken();

    // Fetch artist details
    const artistResponse = await axios({
      url: `https://api.spotify.com/v1/artists/${artistID}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    // Fetch artist's top tracks
    const topTracksResponse = await axios({
      url: `https://api.spotify.com/v1/artists/${artistID}/top-tracks`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { market: "US" },
    });

    // Fetch artist's albums
    const albumsResponse = await axios({
      url: `https://api.spotify.com/v1/artists/${artistID}/albums`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { include_groups: "album,single", market: "US", limit: 50 },
    });

    const artist = artistResponse.data;
    const topTracks = topTracksResponse.data.tracks;
    const albums = albumsResponse.data.items;

    res.render('pages/individual_artist', {  // <-- updated here
      artist,
      topTracks,
      albums,
      isArtists: true
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.redirect('/search');
  }
});


app.get('/albums', async (req, res) => {
  try {
    const token = await getSpotifyToken();

    const topAlbumsResponse = await axios({
      url: "https://api.spotify.com/v1/search",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { q: "top albums 2025", type: "album", limit: 50 }
    });
    const topAlbums = topAlbumsResponse.data.albums.items.filter(a => a !== null);

    const popularAlbumsResponse = await axios({
      url: "https://api.spotify.com/v1/search",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { q: "Greatest hits", type: "album", limit: 50 }
    });
    const popularAlbums = popularAlbumsResponse.data.albums.items.filter(a => a !== null);

    res.render('pages/albums', { topAlbums, popularAlbums, isAlbums: true });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.render('pages/albums', { topAlbums: [], popularAlbums: [], isAlbums: true });
  }
});
/*it works, but it doesn't fetch the playlists like it should, Im just searching top hits 2025, or popular songs 2025 so theres some bad data*/ 
app.get('/songs', async (req, res) => {
  try {
    const token = await getSpotifyToken();

    let USATop50PlaylistID = "3DLP1u57jcYremGNWw9Gfn"; //playlist id for a custom playlist i made with the current top 50 songs in the usa

    const topChartsResponse = await axios({
      url: "https://api.spotify.com/v1/search",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { q: "top hits 2025", type: "track", limit: 50 }
    });
    const topCharts = topChartsResponse.data.tracks.items.filter(t => t !== null);
    console.log("topCharts count:", topCharts.length);

    const popularResponse = await axios({
      url: "https://api.spotify.com/v1/search",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      params: { q: "yacht rock", type: "track", limit: 50 }
    });
    const popular = popularResponse.data.tracks.items.filter(t => t !== null);
    console.log("popular count:", popular.length);

    res.render('pages/songs_tab', { topCharts, popular, isSongs: true });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.render('pages/songs_tab', { topCharts: [], popular: [], isSongs: true });
  }
});

app.get('/genres', async (req, res) => {
  res.render('pages/genres', {isGenres: true});
});

//Authentication Middleware, from lab 7 (again)
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// User profile route
app.get('/profile', auth, async (req, res) => {
  const reviews = await getRecentReviews(req.session.user.user_id);
  res.render('pages/profile', {
    user: req.session.user,
    isOwnProfile: true,
    reviews
  });
});

// Public profile route
app.get('/profile/:userid', async (req, res) => {
  
  // convert user id to integer and check if valid
  const userId = Number.parseInt(req.params.userid, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).render('pages/profile', {
      message: 'Invalid user id.',
      user: null,
      isOwnProfile: false,
      reviews: []
    });
  }

  try {
    // query user id from database
    const profileUser = await db.oneOrNone(
      'SELECT user_id, username FROM users WHERE user_id = $1',
      [userId]
    );

    if (!profileUser) {
      return res.status(404).render('pages/profile', {
        message: 'User not found.',
        user: null,
        isOwnProfile: false,
        reviews: []
      });
    }

    // check if the it is the logged in users profile
    const isOwnProfile =
      req.session.user && req.session.user.user_id === profileUser.user_id;
    
    const reviews = await getRecentReviews(profileUser.user_id);

    return res.render('pages/profile', {
      profileUser,
      isOwnProfile,
      reviews
    });
  } catch (err) {
    return res.status(500).render('pages/profile', {
      message: 'Something went wrong loading this profile.',
      profileUser: null,
      isOwnProfile: false,
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/home');
  });
});

app.get('/song/:id', async (req, res) => {
  const songID = req.params.id;
  //console.log(songID);
  getSpotifyToken()
  .then(token => {
    return axios({
      url: `https://api.spotify.com/v1/tracks/${songID}`,
      method: "GET",
      headers: 
      {
        Authorization: `Bearer ${token}`,
      },
    });
  })
  .then(async response => {
    const songName = response.data.name;
    const artistsArray = response.data.artists;
    const songAlbumImage = response.data.album.images;
    const songURI = response.data.uri;

    const totalSeconds = Math.floor(response.data.duration_ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;


    let loggedIn = !!req.session.user;

    const reviews = await db.any(
      `SELECT r.*, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.song_id = $1
       ORDER BY r.created_at DESC`,
      [songID]
    );

    //search database for timestamp comments
    const timestampComments = await db.any(
      `SELECT sc.*, u.username 
      FROM song_comments sc
      JOIN users u ON sc.user_id = u.user_id
      WHERE sc.song_id = $1
      ORDER BY sc.timestamp_seconds ASC`,
      [songID]
    );

    //convert the time into a string in order to get the correct timestamp position for the comment
    const formattedComments = timestampComments.map(c => ({
      ...c,
      formattedTime: `${Math.floor(c.timestamp_seconds / 60)}:${(c.timestamp_seconds % 60).toString().padStart(2, '0')}`
    }));

    //code to calculate rating number using database
    let songRating = 0; //out of 5 "stars"
    let ratingLetter = "No Reviews";

    if(reviews.length > 0) 
    {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      songRating = total / reviews.length;
      ratingLetter = convertRatingToLetter(songRating);
    }

    //find user review (to change review button to an edit button)
    let userReview = null;
    if(req.session.user) 
    {
      userReview = reviews.find(
        r => r.user_id === req.session.user.user_id
      );
    }

    let userTimestampComment = null;
    if(req.session.user)
    {
      console.log("search for user timestamp review will be here");
    }

    //user logged into spotify
    let userLoggedIntoSpotify = false;
    if(req.session.spotifyAccessToken)
    {
      userLoggedIntoSpotify = true;
    }
    
    res.render('pages/song', {name: songName, artists: artistsArray, albumImages: songAlbumImage, 
      time: formattedTime, login: loggedIn, songRating: ratingLetter, reviews: reviews, timestampComments: timestampComments, userReview: userReview, 
      userTimestampComment: userTimestampComment, songID: songID, songURI: songURI, spotifyToken: req.session.spotifyAccessToken || null,
      userLoggedIntoSpotify: userLoggedIntoSpotify, isSongs: true 
    });
  })
  .catch(err => {
    console.error(err.response?.data || err.message);
    res.render('pages/songs_tab', { song_list: [], isSongs: true});
  });
});

app.get('/albums_tab/:id', async (req, res) => {
  const albumID = req.params.id;
  try {
    const token = await getSpotifyToken();
    const response = await axios({
      url: `https://api.spotify.com/v1/albums/${albumID}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
    });
  
    const albumName = response.data.name;
    const artistsArray = response.data.artists;
    const albumImage = response.data.images;
    const tracksArray = response.data.tracks.items.map(track => {
      // map time to minutes and seconds
      const totalSeconds = Math.floor(track.duration_ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return {
        ...track,
        formattedDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      };
    });

    let loggedIn = !!req.session.user;

    //code to calculate rating number will go here once we get database set up
    //will just pass a dummy value for now
    let albumRating = 3.0; //out of 5 "stars"
    

    res.render('pages/album', {
      name: albumName,
      artists: artistsArray,
      albumImages: albumImage,
      tracks: tracksArray,
      login: loggedIn,
      albumRating: albumRating,
      albumID: albumID,
      isAlbums: true
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.redirect('/albums');
  }
});


app.post('/addReview', auth, async (req, res) => {
  const userId = req.session.user.user_id;
  const {rating, description, songID} = req.body;
  if(rating < 0 || rating > 5) //somehow got invalid request
  {
    console.log("invalid rating?");
    console.log(rating);
    return res.status(400).json({
      error: "Invalid Rating Sent"
    });
    //res.redirect(`/songs_tab/${songId}`);
  }
  try{
    //need to save locally first before we can add review
    const token = await getSpotifyToken();
    const response = await axios({
      url: `https://api.spotify.com/v1/tracks/${songID}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const track = response.data;
    const title = track.name;
    const duration = Math.floor(track.duration_ms / 1000);
    let releaseDate = track.album.release_date;

    if(releaseDate.length === 4) //just a year
    {
      releaseDate = `${releaseDate}-01-01`;
    }
    else if(releaseDate.length === 7) //just year and month
    {
      releaseDate = `${releaseDate}-01`;
    }

    const trackNumber = track.track_number;
    const albumId = track.album.id;
    const albumTitle = track.album.name;
    const albumImage = track.album.images?.[0]?.url ?? null;

    await db.none(
      `INSERT INTO albums (album_id, title, release_date, image_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (album_id) DO NOTHING`,
      [albumId, albumTitle, releaseDate, albumImage]
    );

    await db.none(
      `INSERT INTO songs (song_id, title, album_id, duration, release_date, track_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (song_id) DO NOTHING`,
      [songID, title, albumId, duration, releaseDate, trackNumber]
    );

    //finally attempt to insert review into table
    await db.none(
      `INSERT INTO reviews (user_id, song_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, song_id)
       DO UPDATE SET 
         rating = EXCLUDED.rating,
         review_text = EXCLUDED.review_text,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, songID, rating, description]
    );

    return res.status(200).json({ success: true });
  } catch(err){
    console.log("error inserting review into database", err.message);
    return res.status(500).json({
      error: "Database error"
    });
  }
});

app.post('/addAlbumReview', auth, async (req, res) => {
  const userId = req.session.user.user_id;
  const { rating, description, albumID } = req.body;

  if (rating < 0 || rating > 5) {
    console.log("invalid rating?");
    console.log(rating);
    return res.status(400).json({
      error: "Invalid Rating Sent"
    });
  }

  try {
    // fetch album from Spotify
    const token = await getSpotifyToken();
    const response = await axios({
      url: `https://api.spotify.com/v1/albums/${albumID}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const album = response.data;
    const title = album.name;
    const releaseDate = album.release_date;
    const image = album.images?.[0]?.url ?? null;

    await db.none(
      `INSERT INTO albums (album_id, title, release_date, image_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (album_id) DO NOTHING`,
      [albumID, title, releaseDate, image]
    );

    // insert/update review
    await db.none(
      `INSERT INTO reviews (user_id, album_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, album_id)
       DO UPDATE SET 
         rating = EXCLUDED.rating,
         review_text = EXCLUDED.review_text,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, albumID, rating, description]
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.log("error inserting album review into database", err.message);
    return res.status(500).json({
      error: "Database error"
    });
  }
});

app.post('/addTimestampComment', auth, async (req, res) => {
  const userId = req.session.user.user_id;
  const {songID, timestampSeconds, commentText} = req.body;

  try{
    //need to save locally first before we can add review
    const token = await getSpotifyToken();
    const response = await axios({
      url: `https://api.spotify.com/v1/tracks/${songID}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    const track = response.data;
    const title = track.name;
    const duration = Math.floor(track.duration_ms / 1000);
    const releaseDate = track.album.release_date;
    const trackNumber = track.track_number;
    const albumId = track.album.id;
    const albumTitle = track.album.name;
    const albumImage = track.album.images?.[0]?.url ?? null;

    await db.none(
      `INSERT INTO albums (album_id, title, release_date, image_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (album_id) DO NOTHING`,
      [albumId, albumTitle, releaseDate, albumImage]
    );

    await db.none(
      `INSERT INTO songs (song_id, title, album_id, duration, release_date, track_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (song_id) DO NOTHING`,
      [songID, title, albumId, duration, releaseDate, trackNumber]
    );

    //finally attempt to insert timestamp comment into table
    await db.none(
      `INSERT INTO song_comments (user_id, song_id, timestamp_seconds, comment_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, song_id)
       DO UPDATE SET 
         timestamp_seconds = EXCLUDED.timestamp_seconds,
         comment_text = EXCLUDED.comment_text,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, songID, timestampSeconds, commentText]
    );

    return res.status(200).json({success: true});

  } catch(err){
    console.log("error inserting timestamp comment into database", err.message);
    return res.status(500).json({
      error: "Database error"
    });
  }
});

//can only access friends page if authenticated
app.get('/friends', auth, async (req, res) => {
  const search = req.query.search ? req.query.search.trim() : '';
  const currentUserId = req.session.user?.user_id;

  try {
    const query = `
      SELECT user_id, username, DATE(created_at) AS created_at, COALESCE(user_image_url, '/resources/img/default-profile.png') AS user_image_url,
             (SELECT COUNT(*) FROM follows WHERE followed_user_id = users.user_id) AS followers_count
      FROM users
      WHERE username ILIKE $1 AND user_id <> $2
      ORDER BY username ASC
      LIMIT 20
    `;

    // The value includes the wildcards
    const values = [`%${search}%`, currentUserId || 0];

    const users = await db.any(query, values);

    const followQuery = `
      SELECT followed_user_id
      FROM follows
      WHERE following_user_id = $1
    `;

    const followedRows = await db.any(followQuery, [currentUserId || 0]);
    const followedIds = new Set(followedRows.map((row) => row.followed_user_id));

    const usersDisplay = users.map((u) => ({
      ...u,
      created_at: u.created_at,
      isFollowing: followedIds.has(u.user_id),
    }));

    res.render('pages/friends', {
      isFriends: true,
      users: usersDisplay,
      search,
      currentUserId,
    });
  } catch (err) {
    console.error('Friends page load error:', err);
    res.render('pages/friends', {
      isFriends: true,
      users: [],
      search,
      error: 'Unable to load friends. Please try again later.',
    });
  }
});

app.post('/friends/add', async (req, res) => {
  const currentUserId = req.session.user?.user_id;
  const { userId } = req.body;

  if (!currentUserId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (!userId) {
    return res.status(400).json({ message: 'Missing user ID' });
  }

  try {
    await db.none(
      `INSERT INTO follows(following_user_id, followed_user_id) VALUES($1, $2)
       ON CONFLICT DO NOTHING`,
      [currentUserId, userId]
    );

    res.redirect('/friends?search=' + encodeURIComponent(req.body.search || ''));
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).render('pages/friends', {
      isFriends: true,
      users: [],
      search: req.body.search || '',
      error: 'Unable to add friend. Please try again later.',
    });
  }
});



//starting server, do not delete or modify the next two lines
const server = app.listen(3000);
module.exports = {server, db};
console.log('Server is listening on port 3000');