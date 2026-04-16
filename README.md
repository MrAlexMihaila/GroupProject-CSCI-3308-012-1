# ATrack
ATrack is designed to allow users to publicly grade albums, songs, and singles based on their personal enjoyment of it using a letter-grade review system. Users may add comments to specific timestamps in the song allowing them to discuss their opinions about specific parts of a song.

## Contributors
lukieman8, j16stevenson, AndrewF1234, MrAlexMihaila, WillisBurr

## Technology Stack
- HTML, CSS, JavaScript
- Node.js, Express
- Docker, PostgreSQL

## Prerequisites
- Docker
- Node.js

## How to run Locally
Navigate to the ProjectSourceCode folder in your local machine. First, create a .env file with the following information:
```
POSTGRES_USER=username here
POSTGRES_PASSWORD=password here
POSTGRES_DB=database here

#extra
SESSION_SECRET=secret here
SPOTIFY_CLIENT_ID=client id from Spotify API
SPOTIFY_CLIENT_SECRET=client secret from Spotify API
```

Then, run `docker compose up` to start the local server. Afterwards, navigate to [http://127.0.0.1:3000/home](http://127.0.0.1:3000/home) or [http://localhost:3000/home](http://localhost:3000/home) in order to view the website locally. Run `docker compose down` to close the local server.

## How to run tests
The tests run everytime `docker compose up` is run, testing the register/login system to ensure they are working as expected.

## Link
(todo)
