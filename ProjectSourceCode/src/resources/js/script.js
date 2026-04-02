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

    return false;
}