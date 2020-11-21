//将 mysql 数据库的配置单独配置，以达到解耦合的效果，容易维护。
const path = require('path')

module.exports = {
    DB_HOST : 'localhost',
    DB_PROT : 3306,
    DB_USER : 'root',
    DB_PASS : '123456',
    DB_NAME : 'koa_blog',

    //加密的后缀
    ADMINS_MD5 : '_huang',
    //服务端口号
    PORT : 3000,
    //本机服务端口域名地址
    HTTP_ROOT : 'http://localhost:3000',

    //文件上传的路径。
    UPLOAD_DIR : path.resolve(__dirname, './public/upload')
}