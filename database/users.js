const database = require('../databaseConnection.js');

// Creates a new chatroom
async function createGroup(postData) {
	let createUserSQL = `
		INSERT INTO user
		(email, username, password)
		VALUES
		(:email, :user, :passwordHash);
	`;
	let params = {
		email: postData.email,
		user: postData.user,
		passwordHash: postData.hashedPassword
	}
	
	try {
		const results = await database.query(createUserSQL, params);
        console.log("Successfully created user");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting user");
        console.log(err);
		return false;
	}
}
// Gets all chatrooms
async function getGroups(postData) {
	let getUsersSQL = `
		SELECT username, password
		FROM user;
	`;
	
	try {
		const results = await database.query(getUsersSQL);
        console.log("Successfully retrieved users");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting users");
        console.log(err);
		return false;
	}
}

// Gets a specific chatroom
async function getGroup(postData) {
	let getUserSQL = `
		SELECT user_id, username, password, user_type_id
		FROM user
		-- JOIN user_type_id USING (user_type_id)
		WHERE username = :user;
	`;

	let params = {
		user: postData.user
	}
	
	try {
		const results = await database.query(getUserSQL, params);
		console.log(`params:`);
		console.log(params);
        // console.log("Successfully found user");
		console.log("results:")
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find user");
        console.log(err);
		return false;
	}
}
module.exports = {createGroup, getGroups, getGroup};