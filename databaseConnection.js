const mysql = require('mysql2/promise');

// ------------------- PRODUCTION -------------------
const dbConfig = {
	host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	multipleStatements: false,
	namedPlaceholders: true
};

// ------------------- LOCAL -------------------
// const dbConfig = {
// 	host: process.env.MYSQL_HOST_LOCAL,
//     port: process.env.MYSQL_PORT_LOCAL,
// 	user: process.env.MYSQL_USER_LOCAL,
// 	password: process.env.MYSQL_PASSWORD_LOCAL,
// 	database: process.env.MYSQL_DATABASE_LOCAL,
// 	multipleStatements: false,
// 	namedPlaceholders: true
// };

var database = mysql.createPool(dbConfig);

module.exports = database;