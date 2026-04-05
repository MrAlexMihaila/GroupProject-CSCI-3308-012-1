let playerInstance = null

//converts a passed string into a rating number
function convertRatingToInt(ratingLetter)
{
    if(ratingLetter === "rating_f") //0
    {
        return 0;
    }
    else if(ratingLetter === "rating_e") //1
    {
        return 1;
    }
    else if(ratingLetter === "rating_d") //2
    {
        return 2;
    }
    else if(ratingLetter === "rating_c") //3
    {
        return 3;
    }
    else if(ratingLetter === "rating_b") //4
    {
        return 4;
    }
    else if(ratingLetter === "rating_a") //5
    {
        return 5;
    }
    else //default case, just in case something unexpected gets passed
    {
        console.log("passed invalid rarting letter of " + ratingLetter);
        return -1;
    }
}

//get all the information from the review modal, except for song id and user info
function makeReview() 
{
    return {
        songID: document.getElementById("song-page").dataset.songId,
        rating: convertRatingToInt(document.getElementById("review_rating").value),
        description: document.getElementById("review_description").value,
        createdAt: new Date(),
        likes: 0,
        dislikes: 0
    };
}

//handles getting review data, and then sending it to server for proper checks and adding to database
async function handleSubmit() 
{
    const review = makeReview();

    await fetch('/addReview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(review)
    });

    //force reload the page
    if(res.ok)
    {
        window.location.reload();
    }
    else 
    {
        alert("Something went wrong with your review. Please try again.");
    }

    return false;
}

//dummy function for now, will actually implement later
async function addTimestampComment() 
{
    console.log("attempting to add timestamp comment!");
}

//spotify web playback sdk related code below
function setPlayerInstance(player)
{
    playerInstance = player;
}

//basically, when page is fully loaded...
document.addEventListener("DOMContentLoaded", () => {

    //connect the buttons so they do the things they are
    //supposed to do (play button resuming playback, pause pausing, etc.)
    document.getElementById("play-btn")?.addEventListener("click", () => {
        playerInstance?.resume();
    });

    document.getElementById("pause-btn")?.addEventListener("click", () => {
        playerInstance?.pause();
    });

    //update the position of the seek bar
    document.getElementById("seek-bar")?.addEventListener("input", async (e) => {
        if(!playerInstance)
        {
            return;
        }

        const state = await playerInstance.getCurrentState();
        if(!state)
        {
            return;
        }

        const duration = state.duration;
        const newPosition = (e.target.value / 100) * duration;

        playerInstance.seek(newPosition);
    });

});

//basically a timer that will update the time display of the player every 500 ms
//probably should optimize it later but oh well
setInterval(async () => {
    if(!playerInstance)
    {
        return;
    }

    const state = await playerInstance.getCurrentState();
    if(!state)
    {
        return;
    }

    const position = state.position;
    const duration = state.duration;

    const percent = (position / duration) * 100;

    document.getElementById("seek-bar").value = percent;

    const seconds = Math.floor(position / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    document.getElementById("time-display").textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;

}, 500);

window.onSpotifyWebPlaybackSDKReady = () => 
{
    if(document.getElementById("song-page"))
    {
        console.log("SONG TAB PAGE!!!");

        const token = SPOTIFY_TOKEN;

        if(!token) 
        {
            console.log("No Spotify token, did you log in?");
            return;
        }

        const player = new Spotify.Player({
            name: 'ATrack Song Player',
            getOAuthToken: cb => cb(token),
            volume: 0.5
        });

        setPlayer(player);

        player.addListener('ready', ({ device_id }) => 
        {
            console.log('Ready with Device ID', device_id);
            setupPlayback(device_id, token);
        });

        player.addListener('not_ready', ({ device_id }) => 
        {
            console.log('Device ID has gone offline', device_id);
        });

        player.connect();
    }
}

function setupPlayback(device_id, token) 
{
    fetch(`https://api.spotify.com/v1/me/player`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device_ids: [device_id],
            play: false
        })
    })
    .then(() => {
        const songID = document.getElementById("song-page").dataset.songId;

        return fetch(`https://api.spotify.com/v1/me/player/play`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [`spotify:track:${songID}`]
            })
        });
    })
    .catch(err => {
        console.error("Playback error:", err);
    });
}