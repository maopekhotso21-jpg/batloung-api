const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    user: '2FJvTVQitAAxa41.root',
    password: 'M4vCFgzduuPCEGMX',
    database: 'Batloung_db', // Try with 'e' first
    port: 4000,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();