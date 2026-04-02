// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************
// Example Positive Testcase :
// API: /register
// Input: {username: 'JohnDoe1', password: "password"}
// Expect: res.status == 200 and res.body.message == 'Register Successful!'
// Result: This test case should pass and return a status 200 along with a "Register Successful!" message.
// Explanation: The testcase will call the /register API with the following input
// and expects the API to return a status of 200 along with the "Register Successful!" message.

describe('Testing Register API', () => {
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .redirects(0)
      .send({username: 'JohnDoe3', password: "password"})
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res).to.redirectTo(/\/login$/);
        done();
      });
  });

  it('Negative : /register. Checking invalid name', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', password: "password"})
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equals('Failed to register!');
        done();
      });
  });
});