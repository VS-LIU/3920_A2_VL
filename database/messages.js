const database = require('../databaseConnection.js');

async function getMessagesForRoom(postData) {
    let getMessagesSQL = `
        SELECT 	m.message_id AS message_id,
        m.room_user_id AS room_user_id,
        DATE_FORMAT(m.sent_datetime, '%a %b %e %Y %H:%i:%s') AS sent_datetime,
        m.text AS text,
        r.room_id AS room_id,
        r.name AS room_name,
        u.user_id AS user_id,
        u.username AS username
        FROM message m
        JOIN room_user ru ON m.room_user_id = ru.room_user_id
        JOIN room r ON ru.room_id = r.room_id
        JOIN user u ON ru.user_id = u.user_id
        WHERE r.room_id = :room_id
        ORDER BY sent_datetime ASC;
    `;

    let params = {
        room_id: postData.room_id
    }

    try {
        const results = await database.query(getMessagesSQL, params);
        console.log("Successfully retrieved messages for room_id " + postData.room_id);
        console.log(results[0]);
        return results[0];
    }
    catch (err) {
        console.log("Error getting messages");
        console.log(err);
        return false;
    }
}

async function createMessage(postData) {
    let createMessageSQL = `
        INSERT INTO message
        (room_user_id, sent_datetime, text)
        VALUES
        (:room_user_id, NOW(), :text);
    `;

    let params = {
        room_user_id: postData.room_user_id,
        text: postData.text
    }

    try {
        console.log("============== messages.js > createMessage(postData) ==============");
        console.log("Attempting to create message in room_user_id: " + postData.room_user_id + " at " + new Date().toLocaleString() + " with text: " + postData.text);
        const results = await database.query(createMessageSQL, params);
        console.log("Successfully created message in room_user_id: " + postData.room_user_id + " at " + new Date().toLocaleString() + " with text: " + postData.text);
        console.log(results[0]);
        return true;
    }
    catch (err) {
        console.log("Error inserting message");
        console.log(err);
        return false;
    }
}

async function updateMostRecentReadMessageID(username, room_id) {
    let updateMostRecentReadMessageIDSQL = `
    UPDATE room_user
    SET most_recent_read_message_id = (
        SELECT MAX(message_id)
        FROM message
        WHERE room_id = :room_id
    )
    WHERE user_id = (
        SELECT user_id
        FROM user
        WHERE username = :username
    )
    AND room_id = :room_id;
    `;

    let params = {
        username: username,
        room_id: room_id
    };

    try {
        await database.query(updateMostRecentReadMessageIDSQL, params);
        console.log("Successfully updated most_recent_read_message_id for user:", username, "in room_id ", room_id);
    } catch (err) {
        console.error("Error updating most_recent_read_message_id:", err);
    }
}
module.exports = { createMessage, getMessagesForRoom, updateMostRecentReadMessageID };