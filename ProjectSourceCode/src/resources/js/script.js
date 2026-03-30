
//get all the information from the review modal, except for song id and user info
function makeReview() {
    return {
        rating: document.getElementById("review_number").value,
        description: document.getElementById("review_description").value
    };
}


//handles getting review data, and then sending it to server for proper checks and adding to database
function handleSubmit() {
    let review = makeReview();
}