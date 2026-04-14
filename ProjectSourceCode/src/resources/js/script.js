let playerInstance = null;
let playerTimestampPosition = 0;

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

function makeTimestampComment()
{
    return {
        songID: document.getElementById("song-page").dataset.songId,
        timestampSeconds: playerTimestampPosition,
        commentText: document.getElementById("timestamp_comment").value,
        createdAt: new Date()
    }
}

//dummy function for now, will actually implement later
async function addTimestampComment() 
{
    const comment = makeTimestampComment();
    console.log(comment);

    await fetch('/addTimestampComment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(comment)
    });

    if(res.ok)
    {
        //probably do not want to reload since that would stop playback
        window.location.reload();
    }
    else
    {
        alert("Something went wrong with your timestamp comment. Please try again.");
    }

    return false;
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

    document.getElementById("timestampCommentID").addEventListener("click", async (e) => {
        if(!playerInstance)
        {
            return;
        }

        const state = await playerInstance.getCurrentState();
        if(!state)
        {
            return;
        }

        playerTimestampPosition = state.position/1000;
    })
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
            //disable the player here and ask the user to connect with spotify?
            console.log("No Spotify token, did you log in?");
            return;
        }

        const player = new Spotify.Player({
            name: 'ATrack Song Player',
            getOAuthToken: cb => cb(token),
            volume: 0.5
        });

        setPlayerInstance(player);

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
        const songURI = document.getElementById("song-page").dataset.songUri;

        try{
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [songURI] }),
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
                },
            });
        } catch(err)
        {
            console.log(err);
        }
    })
    .catch(err => {
        console.error("Playback error:", err);
    });
}

// Handles profile menu clicking and toggling
function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
    const profileCard = document.querySelector('.profile-card');
    const menu = document.getElementById('profileMenu');

    if (profileCard && !profileCard.contains(event.target)) {
        if (menu) {
        menu.style.display = 'none';
        }
    }
});

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