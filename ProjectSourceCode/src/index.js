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
  console.log("SESSION ON REQUEST:", req.session.user);
  res.locals.user = req.session.user || null;
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static(__dirname + '/')); //allow for anything in resources directory to be used

//basically everything above this line was taken from lab 7

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
    const match = await bcrypt.compare(req.body.password, user.password);

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
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  try {
    await db.none(
      `INSERT INTO users(username, password) VALUES($1, $2);`, [req.body.username, hash]
    );

    res.redirect('/login');
  } catch(err)
  {
    res.redirect('/register'); //redirect to page in case something goes wrong
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
      res.render('pages/artists', {
        artist_list: results,
        isArtists: true
      });
    }
    else if (type === "album") {
      results = response.data.albums.items;
      res.render('pages/albums', {
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

    res.render('pages/songs_tab', {
      song_list: [],
      isSongs: true,
      error: "Search Failed"
    });
  }
});


app.get('/albums', async (req, res) => {
  res.render('pages/albums', {isAlbums: true});
});

app.get('/songs', async (req, res) => {
  //this is a test call for now
  getSpotifyToken()
  .then(token => {
    return axios({
      url: "https://api.spotify.com/v1/search",
      method: "GET",
      headers: 
      {
        Authorization: `Bearer ${token}`,
      },
       params: 
      {
          q: "Pink Floyd", //dummy search value for now
          type: "track",
          limit: 15,
      },
    });
  })
  //once above api call is done, return the response
  .then(response => {
    const tracks = response.data.tracks.items;

    //console.log(tracks); //view all tracks from our "search"
    
    // pass the track data to the songs page
    // in the future we should have multiple rows on the song page, each with its own api call, and we can pass in different data for each row (ex: top tracks, new releases, etc.)
    res.render('pages/songs_tab', { song_list: tracks, isSongs: true });
  })
  .catch(err => {
    console.error(err.response?.data || err.message);
    res.render('pages/songs_tab', { song_list: [], isSongs: true});
  });
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

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/home');
  });
});

app.get('/songs_tab/:id', async (req, res) => {
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
  .then(response => {
    const songName = response.data.name;
    const artistsArray = response.data.artists;
    const songAlbumImage = response.data.album.images;

    const totalSeconds = Math.floor(response.data.duration_ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    let loggedIn = false;

    //check if user is logged in
    if(req.session.user)
    {
      loggedIn = true;
      console.log("we need to add a database check to see if user has already made a review for this");
    }

    //code to calculate rating number will go here once we get database set up
    //will just pass a dummy value for now
    let songRating = 3.0; //out of 5 "stars"
    
    res.render('pages/song', {name: songName, artists: artistsArray, albumImages: songAlbumImage, 
      time: formattedTime, login: loggedIn, songRating: songRating, songID: songID, isSongs: true
    });
  })
  .catch(err => {
    console.error(err.response?.data || err.message);
    res.render('pages/songs_tab', { song_list: [], isSongs: true});
  });
});

app.get('/albums_tab/:id', async (req, res) => {
  const albumID = req.params.id;
  getSpotifyToken()
  .then(token => {
    return axios({
      url: `https://api.spotify.com/v1/albums/${albumID}`,
      method: "GET",
      headers:
      {
        Authorization: `Bearer ${token}`
      },
    });
  })
  .then(response => {
    const albumName = response.data.name;
    const artistsArray = response.data.artists;
    const albumImage = response.data.album.images;

    const tracksArray = 0;

    

    let loggedIn = false;

    //check if user is logged in
    if(req.session.user)
    {
      loggedIn = true;
      console.log("we need to add a database check to see if user has already made a review for this");
    }

    //code to calculate rating number will go here once we get database set up
    //will just pass a dummy value for now
    let albumRating = 3.0; //out of 5 "stars"
    

    res.render('pages/album', {name: albumName, artists: artistsArray, albumImages: albumImage, 
      tracksArray: tracksArray, login: loggedIn, albumRating: albumRating, albumID: albumID, isAlbums: true
    });
  });

  

});

app.post('/addReview', auth, async (req, res) => {
  //TO DO, get user id from request
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
  
  console.log("got a request of...");
  console.log(req.body);
  return res.redirect(`/songs_tab/${songID}`);
});

//can only access friends page if authenticated
app.get('/friends', auth, async (req, res) => {
  res.render('pages/friends', {isFriends: true});
});

//starting server, do not delete the next two lines
app.listen(3000);
console.log('Server is listening on port 3000');