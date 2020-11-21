const Router = require('koa-router')
const md5 = require('blueimp-md5')
const path = require('path')
const common = require('./common')

//以下是几个模块通用的路由方法 API，将其封装到一个模块中，为其他模块所共用。
let router = new Router()

const page_types = { // 导航栏 【请求路径 ：文字显示】
    "banner": '图片管理',
    "catalog": "类目管理",
    'article': '文章管理'
}

module.exports = function (fields, table, page_type) {
    //查询数据
    router.get('/', async (ctx, next) => {
        let Datas = await ctx.db.query(`SELECT * FROM ${table}`)

        let admin
        if (!ctx.session['admin']) {
            admin = ctx.session['admin']
        }
        await ctx.render('admin/index', {
            HTTP_ROOT: ctx.config.HTTP_ROOT,
            type: `${page_type}`, // 表示此次数据渲染的访问是普通展示查询出的数据结果
            data: Datas, //数据库中查询出来的数据
            action: `${ctx.config.HTTP_ROOT}/admin/${page_type}`, //动态给定 form 表单的提价路径
            fields: fields, //input 渲染属性值。
            page_type: page_type,
            page_types: page_types,
            infoMsg: ctx.query.infoMsg,
            admin: ctx.session['admin']
        })
    })

    //添加数据
    router.post('/', async (ctx, next) => {
        //实现 POST 路由方法的通用，直接根据 field 中的字段值来决定插入数据库值以及更新。
        let keys = [] //存储 title 字段
        let values = [] //存储 type name 字段
        fields.forEach(item => {
            const {
                type,
                name
            } = fields[0]
                
            keys.push(name)
            if (item.type == 'file') { //文件类型，单独处理
                values.push(path.basename(ctx.request.fields[name][0].path)) // [{ name : xxx,type: xxx },{...}]
            } else {
                values.push(ctx.request.fields[name]) //根据 name 值获取 用户上传的 POST 参数列表中对应的数组数据并存储到数组中。
            }
        })

        let result = await ctx.db.query(`SELECT max(ID) FROM ${table}`)
        let id = eval(JSON.stringify(result)).shift()['max(ID)'] //取出 最大 id 值
        keys.push(id)
        
        ////参数正确，往数据库中插入数据，为了防止 SQL 注入问题，可以通过占位符的形式来插入数1据。
        let data = await ctx.db.query(`INSERT INTO ${table} VALUES(${keys.map(key=>{ return '?' }).join(',')})`,[id + 1,...values])

        //插入成功，返回页面
        ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('添加成功')}`)
    })

    //删除数据
    router.get('/delete/:id/', async (ctx, next) => {
        let {
            id
        } = ctx.params //解析客户端发送的 路由参数。

        //查询数据库中对应 id 的数据
        let data = await ctx.db.query(`SELECT * FROM ${table} WHERE ID = ?`, [id])

        //没有查询到，assert() 方法默认传入的第一个参数表达式是取反形式的，那么意味着 data.length == 0 如果成立，则执行后面的处理。
        ctx.assert(data.length, 400, ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('没有该项数据')}`))

        //查询到数据
        let row = data[0] //结果条
        fields.forEach(async field => {
            if (field.type == 'file') {
                // = 是执行语句， == 是判断语句，切记不要少！！！
                //注意：如果此处是 type = file ，那么会执行此条语句，从而将 fileds 数组中的所有 input 属性参数的 type 都改为 file。 从而传入 index.ejs 中的也会是 input type = file 的字段
                //删除文件
                await common.unlink(path.resolve(ctx.config.UPLOAD_DIR, row.src)) // 相对路径，文件名。
            }
        })

        //删除数据库中的数据
        await ctx.db.query(`DELETE FROM ${table} WHERE ID = ?`, [id])
        //删除成功，返回信息给页面
        ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('删除成功')}`)
    })

    //修改数据
    router.get('/modify/:id/', async (ctx, next) => {

        let {
            id
        } = ctx.params
        //先根据用户上传的数据 id 查询出要修改的数据
        let data = await ctx.db.query(`SELECT * FROM ${table} WHERE ID = ?`, [id])
        //如果没有数据
        if (data.length == 0) {
            ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('无法查询到数据')}`)
        } else {
            //查询到数据
            //重新渲染访问主页面，将要修改的老数据渲染到 /banner 页面上，
            //同时将 banner 页面的表单提交路径改为 /banner/modify 表示为要修改数据，而不是添加数据
            await ctx.render('admin/index', {
                HTTP_ROOT: ctx.config.HTTP_ROOT,
                type: 'modify', //表示此次渲染 banner 主页面是目的是为了要修改数据。
                old_data: data[0], //要修改的旧数据展示，数组第一条。
                data: data[0],
                fields: fields, //input 字段渲染属性
                action: `${ctx.config.HTTP_ROOT}/${page_type}/modify/${id}`, //将表单提交的路径修改为要修改数据的路径。
                infoMsg: ctx.query.infoMsg
            })
        }

    })

    //修改数据 【客户端渲染】客户端根据 ajax 请求临时数据显示要修改的面板上。
    router.get('/get/:id/', async (ctx, next) => {

        let {
            id
        } = ctx.params
        //先根据用户上传的数据 id 查询出要修改的数据
        let result = await ctx.db.query(`SELECT * FROM ${table} WHERE ID = ?`, [id])
        //如果没有数据
        if (result.length == 0) {
            ctx.body = {
                error: 500,
                infoMsg: '找不到数据'
            }
        } else {
            ctx.body = {
                error: 200,
                infoMsg: 'ok',
                data: result
            }
        }

    })

    //提交修改数据操作
    router.post('/modify/:id/', async (ctx, next) => {
        // 解析出用户上传的要修改的三个字段值， src是文件提交，需要单独处理。
        let post = ctx.request.fields
        let {
            id
        } = ctx.params //获取数据的编号值。

        //获取原来的 src 数据 ，用以比较匹配，以及更新。
        let rows = await ctx.db.query(`SELECT * FROM ${table} WHERE ID = ?`, [id])
        ctx.assert(rows.length, 400, ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('修改失败：没有该项数据')}`))

        let paths = {}
        fields.forEach(field => {
            if (field.type == 'file') {
                paths[field.name] = rows[0].name //根据 field 中的 name 字段与 数据库中查询出来的数据的 name 字段进行匹配并最终将值存储到 path数组中。
            }
        })

        let keys = [] //三个可以直接设定的字段值，用于插入数据库时 指定的 xx = ?
        let values = [] //用于存储要插入数据库中的新数据。 [xxx,xxx] 
        //keys values ： 表示为 UPDATE banner SET 【keys数组】xx =?  , [....values] 插入更新数据。
        let src_changed = {} //用以判断用户是否上传文件、

        fields.forEach(field => {
            if (field.type == 'file') {

                if (post.files['src'] && post.files['src'].size) {
                    //如果用户上传的文件存在，且有长度，size 不为0，则视为用户上传了文件。src_changed为 true，可以进行文件处理
                    src_changed[field.name] = true

                    keys.push(field.name)
                    values.push(path.basename(post[field.name][0].path))
                }
            } else {
                keys.push(field.name)
                values.push(post[field.name])
            }
        })

        //插入数据库更新数据
        await ctx.db.query(`UPDATE ${table} SET ${ keys.map(key=> (`${key}=?`)).join(',')} WHERE ID = ?`, [...values, id])
        /* ${ keys.map(key=> (`${key}=?`)).join(',')} : 遍历 keys 数组得到每个 key 成员，
            将每个 key 成员使用 单/双引号变为字符串形式组合 成为： title=?,href=?,serial=? 的格式，
            同时使用 , 符号将所有字符串拆分成单独的字符并组成数组形式：[title=?,src=?,href=?,...]
        */

        //插入数据库成功之后，就将用户上传的旧文件删除。同时将新文件写入代替。
        fields.forEach(async field => {
            if (field.type == 'file' && src_changed[field.name]) {
                await common.unlink(path.resolve(ctx.config.UPLOAD_DIR, paths[field.name]))
            }
        })

        //更新文件成功，新数据插入数据库成功，返回主页面进行展示新数据。
        ctx.redirect(`${ctx.config.HTTP_ROOT}/admin/${page_type}?infoMsg=${encodeURIComponent('修改成功')}`)

        /*
         POST 请求参数更新小结：
         1、首先获取到除了 用户上传的文件之外的所有字段值，
         2、通过用户上传的 id 值，向数据库查询对应的旧数据
         3、定义两个数组 keys \ values ，分为代表要插入的字段值，要插入对应字段值的新数据
         4、取出从数据库中查询到 src 旧数据
         5、定义一个判断变量 src_changed ，判断用户上传的文件是否有内容，如果没有内容则为 false， 有内容则为 true，可以进行文件处理。
         6、如果 src_changed 为 true，代表 用户上传了文件，src 文件字段值有内容，则将此 src 字段值添加到相应数组中，以插入数据库
         7、更新数据库旧数据，将 keys \ values 传入以更新值。
         8、删除旧文件【koa-better-body 模块会自动将上传的文件写入到指定目录中】 ，通过 fs.unlink() 方法
         9、最终更新成功，返回主页面，并给予相应提示。
        */
    })

    return router.routes() //将此路由的结构对外暴露出去，相当于执行完此函数之后，就拥有了 此路由上的 API 以及结构。
}