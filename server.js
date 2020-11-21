const koa = require('koa')
const Router = require('koa-router')
const static = require('./routers/static')
const body = require('koa-better-body')
const path = require('path')
const session = require('koa-session')
const fs = require('fs')
const ejs = require('koa-ejs')
const config = require('./config')

/*创建服务应用*/
let server = new koa()

server.listen(config.PORT, () => {
    server.context.Running_Record = new Date().getTime() //当服务器开启时，记录当前网站运行的时间。
    console.log(`Server running at ${config.PORT} ....`)
})

/*中间件功能配置：为当前服务应用添加其他功能。*/

//为当前服务应用配置 解析 POST 数据的功能，会在 ctx 对象身上添加 files【文件数据】，fields 【普通、文件数据】两个属性
server.use(body({
    uploadDir: config.UPLOAD_DIR //文件上传的位置
}))

//为当前服务应用添加 cookie 签名值列表，后期在配置 Session 功能的时候，会自动分配到 Session 对象身上，以表示默认 进行 cookie签名
server.keys = fs.readFileSync('.keys').toString().split('\n')
//同步读取存储 cookie签名值的文件，以换行的形式将 cookie签名值字符串拆分成数组，并存入 server.keys 属性中

//为当前服务应用添加 发送 Session-ID 的功能。会在 ctx 对象身上添加 session 属性，以进行 session 操作。
server.use(session({
    maxAge: 20 * 60 * 1000, // Session-ID 有效期
    renew: true //自动续期
}, server))

/* 数据库配置 */
//为 ctx 对象添加 db 实例属性，使得 mysql 数据库操作成为 局部操作，而不是引用全局 db 变量。
server.context.db = require('./lib/database')
server.context.config = config // 将配置信息添加到 ctx 对象身上。

/*渲染引擎配置 */
//为 ctx 对象添加 render 方法，可以用于渲染模板页面给客户端。
ejs(server, {
    root: path.resolve(__dirname, 'template'), //模板页面文件的位置。
    layout: false, //是否为模板页面文件添加子目录
    viewExt: 'ejs', //模板页面文件的后缀名
    cache: false, //不缓存
    debug: false //不输出渲染结果
})

/*路由配置*/
let router = new Router() //主路由，用来负责当前服务应用的外部访问的响应处理。

router.use('/admin', require('./routers/admin')) //子路由 localhost/admin 管理员登录
router.use('/', require('./routers/www')) //子路由 localhost/  普通用户展示数据页面
router.use('/api', require('./routers/api')) //子路由 localhost/api  数据接口

/*路由容器统一处理错误*/
router.use(async (ctx, next) => {
    try {
        await next() //下一个路由中间件

        if (!ctx.body) { //如果路径输入返回的页面没有数据，代表用户是乱输入路径地址。返回 404 页面
            await ctx.render('www/404', {
                HTTP_ROOT: ctx.config.HTTP_ROOT
            })
        }
    } catch (error) {
        await ctx.render('www/404', {
            HTTP_ROOT: ctx.config.HTTP_ROOT
        })
    }
})

static(router, { //为当前主路由配置文件缓存。
    html: 30,
    js: 1,
    css: 10,
    image: 30,
    other: 30
})

server.use(router.routes()) //将带着子路由的主路由绑定到当前服务应用身上，这样外部客户端才能访问此服务应用。