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

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
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

//this is a test method to ensure that the search bar is working, probably remove this when searching is
//actually made
app.get('/search', async (req, res) => {
  console.log("search happened");
  res.redirect('/home'); //default for now
});

app.get('/albums', async (req, res) => {
  res.render('pages/albums', {isAlbums: true});
});

app.get('/songs', async (req, res) => {
  res.render('pages/songs', {isSongs: true});
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

//can only access friends page if authenticated
app.get('/friends', auth, async (req, res) => {
  res.render('pages/friends', {isFriends: true});
})

//starting server, do not delete the next two lines
app.listen(3000);
console.log('Server is listening on port 3000');