const fs = require('fs')

//通常情况下，cookie 签名值列表都是从文件中进行自动生成的，且 cookie 签名值越多，越长，越复杂越好。

let KEY_LEN = 1024 //单个 cookie 签名值的字符串长度
let KEY_COUNT = 2048 // cookie 签名值个数

let arr = [] //存储 cookie 签名值列表的数组变量
let CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,./<>?;:[]{}~!@#$%^&*()_+`-=/*-+.\|' 
//规定 cookie 签名值的字符组成

for (let i = 0; i < KEY_COUNT; i++) {//个数

    let key = ''

    for (let j = 0; j < KEY_LEN; j++) {//长度

        key += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    
    arr.push(key)
}

fs.writeFileSync('.keys',arr.join('\n')) //以 cookie 签名值字符串，单个换行的形式同步写入文件中。