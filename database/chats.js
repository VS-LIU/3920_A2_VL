const database = require('../databaseConnection.js');

async function createRoom(postData) {
	let createRoomSQL = `
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
async function getRooms(postData) {
	let getRoomsSQL = `
		SELECT  ru.room_user_id, 
				r.room_id, 
				r.name, 
				u.user_id, 
				u.username, 
				ru.most_recent_read_message_id,
				DATE_FORMAT(m.sent_datetime, '%a %b %e %Y %H:%i:%s') AS sent_datetime
		FROM room_user ru
		JOIN room r ON ru.room_id = r.room_id
		JOIN user u ON ru.user_id = u.user_id
		JOIN message m ON ru.room_user_id = m.room_user_id
		WHERE u.username = :username;
	`;

	let params = {
		username: postData.username
	}
	
	try {
		console.log("postData:");
		console.log(postData);
		const results = await database.query(getRoomsSQL, params);
        console.log("Successfully retrieved rooms");
		console.log("Results:");
		console.log(results);
		console.log("Results[0]:")
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting rooms");
        console.log(err);
		return false;
	}
}

async function getMostRecentMessage(postData) {
	let getMostRecentMessageIDSQL = `
		SELECT ru.most_recent_read_message_id
		FROM room_user ru
		JOIN room r ON ru.room_id = r.room_id
		JOIN user u ON ru.user_id = u.user_id
		WHERE ru.room_id = :room_id AND u.username = :username;
	`;



	let getMostRecentMessageTextSQL = `
		SELECT m.text
		FROM message m
		WHERE m.message_id = :most_recent_read_message_id;
	`;

	let params = {
		room_id: postData.room_id,
		username: postData.username,
		most_recent_read_message_id: postData.most_recent_read_message_id
	}
	
	try {
		// const mostRecentMessageID = await database.query(getMostRecentMessageIDSQL, params);
		const mostRecentMessageText = await database.query(getMostRecentMessageTextSQL, params);
		console.log("Successfully retrieved most recent message");
		console.log("mostRecentMessageText: \n");
		console.log(mostRecentMessageText);
		console.log("mostRecentMessageText[0]: \n")
		console.log(mostRecentMessageText[0]);
		return mostRecentMessageText[0];
	}
	catch(err) {
		console.log("Error getting messages");
		console.log(err);
		return false;
	}
}


async function getRoom(postData) {
	let getRoomSQL = `
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
        // console.log("Successfully found room");
		console.log("results:")
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find room");
        console.log(err);
		return false;
	}
}
module.exports = {createRoom, getRooms, getRoom, getMostRecentMessage};