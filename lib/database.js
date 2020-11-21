const mysql = require('mysql')
const co = require('co-mysql')
const config = require('../config')

let conn = mysql.createPool({
    host : config.DB_HOST,
    port : config.DB_PROT,
    user : config.DB_USER,
    password : config.DB_PASS,
    database : config.DB_NAME
})

module.exports = co(conn) 
//将封装好的 mysql 数据库操作对外提供。使得mysql 数据库的 query() 方法操作变得 Promise 同步化，而不至于回调嵌套过多而导致代码结构复杂。