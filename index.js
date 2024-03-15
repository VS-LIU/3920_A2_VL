//safe version of node
require('./utils.js');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const cookieParser = require('cookie-parser');
const database = require('./databaseConnection.js');
const db_utils = require('./database/db_utils.js');
const db_users = require('./database/users.js');
const success = db_utils.printMySQLVersion();
const fs = require('fs');
const app = express();
const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)
const node_session_secret = process.env.NODE_SESSION_SECRET;
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname + "/public"));
app.use(express.json())

app.use(session({ 
    secret: node_session_secret,
    store: MongoStore.create({
        // mongoUrl: `mongodb+srv://${process.env.ATLAS_DB_USERNAME}:${process.env.ATLAS_DB_PASSWORD}@${process.env.ATLAS_DB_HOST}/?retryWrites=true&w=majority`,
        mongoUrl: `mongodb://127.0.0.1:27017/sessionStoreDB`,
        crypto: {
            secret: process.env.MONGO_SESSION_SECRET,
        },
        dbName: 'sessionStoreDB',
        collectionName: 'sessions',
        ttl: 60 * 60 * 1, // 1 hour
        autoRemove: 'native'
    }),
	saveUninitialized: false, 
	resave: true
}));

app.get('/', (req,res) => {
    // res.render("index");
    if (req.session.authenticated) {
        res.redirect('/loggedin');
    } else {
        console.log("\'\/\', \'\/home\': Current session cookie:", req.cookies)
        res.render('./index.ejs');
    }
});

app.get('/about', (req,res) => {
    var color = req.query.color;
    if (!color) {
        color = "black";
    }
    res.render("about", {color: color} );
});

app.get('/contact', (req,res) => {
    var missingEmail = req.query.missing;
    res.render("contact", {missing: missingEmail});
});

app.post('/submitEmail', (req,res) => {
    var email = req.body.email;
    if (!email) {
        res.redirect('/contact?missing=1');
    }
    else {
        res.render("submitEmail", {email: email});
    }
});

const headerContent = fs.readFileSync('./views/partials/header2.ejs', 'utf8');
const footerContent = fs.readFileSync('views/partials/footer.ejs', 'utf8');
app.get('/findUser', (req, res) => {
    res.render("findUser", { user: null});
});
app.post('/processForm', async (req, res) => {
    var name = req.body.name;
    try {
        // const query = `SELECT * FROM user WHERE username = '${name}'`;
        // console.log("query: ", query);
        // const [rows, fields] = await database.query(query);
        // console.log("rows: ", rows);

        const query = `SELECT * FROM user WHERE username = :username`; // Named Placeholder
        console.log("query: ", query);
        const [rows, fields] = await database.query(query, { username: name }); // Passing parameters as an object with named placeholders
        console.log("rows: ", rows);
        if (rows.length > 0) {
            // If user found, send user details
            res.render("findUserResult", { user: rows[0] });
        } else {
            console.log(rows[0]);
            res.render("findUserResult", { user: name });
        }
    } catch (error) {
        console.error("Error fetching user from database:", error);
        res.status(500).send("Error fetching user from database");
    }
});

app.get('/createTables', async (req,res) => {
    const create_tables = include('database/create_tables');
    var success = create_tables.createTables();
    if (success) {
        res.render("successMessage", {message: "Created tables."} );
    }
    else {
        res.render("errorMessage", {error: "Failed to create tables."} );
    }
});

app.get('/createUser', async (req,res) => {
    await res.render("createUser");
});

app.get('/login', (req,res) => {
    res.render("login");
});
 
app.post('/submitUser', async (req,res) => {
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var hashedPassword = bcrypt.hashSync(password, saltRounds);
    var success = await db_users.createUser({ email: email, user: username, hashedPassword: hashedPassword });
    if (success) {
        // res.render("successMessage", {message: "Created user."} );
        // render successmessage and include a link visit home page
        res.redirect('/loggedin');
    }
    else {
        res.render("errorMessage", {error: "Failed to create user."} );
    }
});

app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var results = await db_users.getUser({ user: username, hashedPassword: password });
    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].password)) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.user_type = results[0].type;
                req.session.cookie.maxAge = expireTime;
                res.redirect('/loggedIn');
                return;
            }
            else {
                console.log("invalid password");
            }
        }
        else {
            console.log('invalid number of users matched: '+results.length+" (expected 1).");
            res.redirect('/login');
            return;            
        }
    }
    console.log('user not found');
    //user and password combination not found
    res.redirect("/login");
});

function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {error: "Not Authorized"});
        return;
	}
	else {
		next();
	}
}

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (!isValidSession(req)) {
		req.session.destroy();
		res.redirect('/login');
		return;
	}
	else {
		next();
	}
}

app.use('/loggedin', sessionValidation);
app.use('/loggedin/admin', adminAuthorization);
app.get('/loggedin', (req,res) => {
    console.log("app.get(\'\/protectedRoute\'): Current session cookie-id:", req.cookies);
    const randomImageNumber = Math.floor(Math.random() * 3) + 1;
    const imageName = `00${randomImageNumber}.gif`;
    res.render('protectedRoute.ejs', {
        "username": req.session.username,
        "imagea": `00${Math.floor(Math.random() * 3) + 1}.gif`,
        "imageb": `00${Math.floor(Math.random() * 3) + 1}.gif`,
        "imagec": `00${Math.floor(Math.random() * 3) + 1}.gif`,
        "isAdmin": req.session.loggedType == 'administrator'
    })
});

app.get(['/loggedin/info', '/info'], (req,res) => {
    res.render("loggedin-info");
});

app.get(['/loggedin/admin', '/admin'], async (req,res) => {
    // res.render("admin");
    users = await db_users.getUsers();
    res.render('adminRoute.ejs', {
        "admin_name": req.session.loggedUsername,
        "users": users,
        "type": req.session.loggedType
        });
});

app.get(['/loggedin/memberinfo', '/memberinfo'], (req,res) => {
    res.render("memberInfo", {username: req.session.username, user_type: req.session.user_type});
});

app.get('/cat/:id', (req,res) => {
    var cat = req.params.id;
    res.render("cat", {cat: cat});
});

app.get('/api', (req,res) => {
	var user = req.session.user;
    var user_type = req.session.user_type;
	console.log("api hit ");
	var jsonResponse = {
		success: false,
		data: null,
		date: new Date()
	};
	if (!isValidSession(req)) {
		jsonResponse.success = false;
		res.status(401);  //401 == bad user
		res.json(jsonResponse);
		return;
	}
	if (typeof id === 'undefined') {
		jsonResponse.success = true;
		if (user_type === "admin") {
			jsonResponse.data = ["A","B","C","D"];
		}
		else {
			jsonResponse.data = ["A","B"];
		}
	}
	else {
		if (!isAdmin(req)) {
			jsonResponse.success = false;
			res.status(403);  //403 == good user, but, user should not have access
			res.json(jsonResponse);
			return;
		}
		jsonResponse.success = true;
		jsonResponse.data = [id + " - details"];
	}
	res.json(jsonResponse);

});
app.get('/logout', function (req, res, next) {
    console.log("Before Logout: Session User:", req.session.loggedUsername, "; ", "Session Password: ", req.session.loggedPassword);
    console.log("Logging out. . .")
    req.session.loggedUsername = null;
    req.session.loggedPassword = null;
    req.session.authenticated = false;
    console.log("After Logout: Session User:", req.session.loggedUsername, "; ", "Session Password: ", req.session.loggedPassword);
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
})

app.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

module.exports = app;