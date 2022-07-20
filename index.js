const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/booksId/", async (request, response) => {
  const getBooksQuery = `
    SELECT 
    * 
    FROM 
    book 
    ORDER BY 
    book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

//create Users API

app.post("/users/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User Already Exist");
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createUserQuery = `INSERT INTO user(name,username,password,gender,location)VALUES(
          '${name}','${username}','${hashedPassword}','${gender}','${location}'
      );`;
    const dbResponse = await db.run(createUserQuery);
    const userId = await dbResponse.lastID;
    response.status(201);
    response.send({ userId });
  }
});

// login User Api

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  console.log(dbUser.password);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const hashedPassword = await bcrypt.compare(password, dbUser.password);
    if (hashedPassword === true) {
      const payload = {
        username,
      };
      const jwtToken = await jwt.sign(payload, "SECRET_KEY");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//api to get books
app.get("/books/", async (request, response) => {
  const authHeader = request.headers["authorization"];
  const jwtToken = authHeader.split(" ")[1];
  console.log(jwtToken);
  jwt.verify(jwtToken, "SECRET_KEY", async (error, payload) => {
    if (error) {
      response.status(401);
      response.send("Invalid Access token");
    } else {
      const getBooksQuery = `
    SELECT 
    * 
    FROM 
    book;`;
      const booksArray = await db.all(getBooksQuery);
      response.send(booksArray);
    }
  });
});
