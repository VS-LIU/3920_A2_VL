const database = require('../databaseConnection.js');

async function createRoom(postData) {
	let createRoomSQL = `

		INSERT INTO room (name, start_datetime)
		VALUES (:name, NOW());

		INSERT INTO room_user (user_id, room_id, most_recent_read_message_id)
		VALUES (:user_id, LAST_INSERT_ID(), 0);
	`;

	// roomName: roomName, username: username, user_id: user_id, selectedUserIDs: selectedUserIDs
	let params = {
		name: postData.roomName,
		user_id: postData.user_id,
		selectedUserIDs: postData.selectedUserIDs
		
	}

	try {
		const results = await database.query(createRoomSQL, params);
		console.log("chats.js: createRoom(): Successfully created room.");
		console.log("chats.js: createRoom()_params:");
		console.log(params);
		console.log("chats.js: createRoom()_results[0]:")
		console.log(results[0]);
		// return the id of the newly created room
		return results[0].insertId;
	}
	catch (err) {
		console.log("Error inserting room");
		console.log(err);
		return false;
	}
}

async function getRoom(postData) {
	let getRoomSQL = `
		SELECT ru.user_id, u.username, ru.room_id, r.name, m.message_id, m.text, m.sent_datetime, ru.room_user_id, ru.most_recent_read_message_id
		FROM room_user ru
		JOIN room r ON ru.room_id = r.room_id
		JOIN user u ON ru.user_id = u.user_id
		JOIN message m ON ru.room_user_id = m.room_user_id
		-- WHERE u.username = :username
		WHERE ru.room_id = :room_id;
	`;

	let params = {
		username: postData.username,
		room_id: postData.room_id
	}

	try {
		console.log("---- START - /chats.js - getRoom(postData) ----")
		const results = await database.query(getRoomSQL, params);
		console.log(`getRoom_params:`);
		console.log(params);
		console.log("getRoom_results[0]:")
		console.log(results[0]);
		console.log("---- END - /chats.js - getRoom(postData) ----\n")
		return results[0];
	}
	catch (err) {
		console.log("getRoom: Error trying to find room");
		console.log(err);
		return false;
	}
}
async function getRooms(postData) {
	let getRoomsSQL = `
	SELECT 
    ru.room_user_id, 
    r.room_id, 
    r.name, 
    u.user_id, 
    u.username, 
    ru.most_recent_read_message_id,
    (SELECT 
        DATE_FORMAT(MAX(m.sent_datetime), '%a %b %e %Y %H:%i:%s')
     FROM 
        message m
     JOIN 
        room_user ru2 ON m.room_user_id = ru2.room_user_id
     WHERE 
        ru2.room_id = ru.room_id
     AND 
        m.sent_datetime > FROM_UNIXTIME(ru.most_recent_read_message_id)
    ) AS sent_datetime,
    (SELECT 
        COUNT(DISTINCT m2.message_id)
     FROM 
        message m2
     JOIN 
        room_user ru2 ON m2.room_user_id = ru2.room_user_id
     WHERE 
        ru2.room_id = ru.room_id
     AND 
        m2.message_id > ru.most_recent_read_message_id
    ) AS number_of_messages_behind
FROM 
    room_user ru
LEFT JOIN 
    room_user ru2 ON ru.room_id = ru2.room_id
LEFT JOIN 
    room r ON ru.room_id = r.room_id
LEFT JOIN 
    user u ON ru.user_id = u.user_id
LEFT JOIN 
    message m ON ru.room_user_id = m.room_user_id 
WHERE 
    u.username = :username
GROUP BY 
    ru.user_id, ru.room_id
HAVING 
    number_of_messages_behind >= 0;
	`;


	let params = {
		username: postData.username
	}

	try {
		console.log("getRooms_postData:");
		console.log(postData);
		const results = await database.query(getRoomsSQL, params);
		console.log("getRooms: Successfully retrieved rooms");
		console.log("getRooms_Results:");
		console.log(results);
		console.log("getRooms_Results[0]:")
		console.log(results[0]);
		return results[0];
	}
	catch (err) {
		console.log("Error getting rooms");
		console.log(err);
		return false;
	}
}

async function getNumberUnreadMessages(postData) {
	let getNumberUnreadMessagesSQL = `
	SELECT 
    (SELECT COUNT(DISTINCT m2.message_id)
     FROM message m2
     JOIN room_user ru2 ON m2.room_user_id = ru2.room_user_id
     WHERE ru2.room_id = ru.room_id
     AND m2.message_id > ru.most_recent_read_message_id
    ) AS number_of_messages_behind
	FROM 
		room_user ru
	JOIN 
		room_user ru2 ON ru.room_id = ru2.room_id 
	LEFT JOIN 
		message m ON ru.room_user_id = m.room_user_id 
		AND m.message_id > ru.most_recent_read_message_id
	WHERE 
	ru.user_id = :user_id
	GROUP BY 
		ru.user_id, ru.room_id
	HAVING 
		number_of_messages_behind > 0;
	`;

	let params = {
		room_id: postData.room_id,
		user_id: postData.user_id,
	}

	try {
		// const mostRecentMessageID = await database.query(getMostRecentMessageIDSQL, params);
		const numberOfUnreadMessages = await database.query(getNumberUnreadMessagesSQL, params);
		console.log("Successfully retrieved most recent message");
		console.log("mostRecentMessageText: \n");
		console.log(mostRecentMessageText);
		console.log("mostRecentMessageText[0]: \n")
		console.log(mostRecentMessageText[0]);
		return mostRecentMessageText[0];
	}
	catch (err) {
		console.log("Error getting messages");
		console.log(err);
		return false;
	}
}

async function getAvailableUsers(roomID) {
    let getAvailableUsersSQL = `
	SELECT u.user_id, u.username
	FROM user u
	WHERE u.user_id NOT IN (
		SELECT ru.user_id
		FROM room_user ru
		WHERE ru.room_id = :room_id
	);       
    `;

    let params = {
        room_id: roomID
    };

    try {
        const results = await database.query(getAvailableUsersSQL, params);
        console.log("chats_getAvailableUsers_Successfully retrieved available users for room_id: " + roomID);
		console.log("chats_getAvailableUsers_results[0]:")
		console.log(results[0]);
        return results;
    } catch (err) {
        console.log("Error getting available users");
        console.log(err);
        return false;
    }
}

async function inviteUserToRoom(userId, roomId) {
    const inviteUserToRoomSQL = `
        INSERT INTO room_user (user_id, room_id, most_recent_read_message_id)
        VALUES (:user_id, :room_id, 0);
    `;

    const params = {
        user_id: userId,
        room_id: roomId
    };

    try {
        await database.query(inviteUserToRoomSQL, params);
        console.log('User invited to room successfully');
    } catch (error) {
        console.error('Error inviting user to room:', error);
        throw error; // Propagate error to caller
    }
}

async function getAllUsers() {
	const getAllUsersSQL = `
		SELECT user_id, username
		FROM user;
	`;
	try {
		const results = await database.query(getAllUsersSQL);
		console.log("chats_getAllUsers_Successfully retrieved all users");
		console.log("chats_getAllUsers_results[0]:")
		console.log(results[0]);
		return results;
	} catch (err) {
		console.log("Error getting all users");
		console.log(err);
		return false;
	}
}

module.exports = { createRoom, getRooms, getRoom, getNumberUnreadMessages, getAvailableUsers, inviteUserToRoom, getAllUsers };