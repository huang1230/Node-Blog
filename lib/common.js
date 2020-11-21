//自己封装或定义的功能函数体
const fs = require('fs')
module.exports = {
    unlink(path){
        return new Promise((resolve,reject)=> {
            fs.unlink(path,err => {
                if(err){
                    reject(err)
                }else {
                    resolve()
                }
            })
        })
    },
    getTimes(date){
        let year = date.getFullYear()
        let month = date.getMonth() + 1 
        let day = date.getDate()

        if(month < 10){
            month = '0' + month
        }

        return year + '-' + month + '-' + day
    }
}