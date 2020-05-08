var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

let sessions = {  //存储用户id

}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url
  var queryString = ''
  if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)

  if(path === '/js/main.js'){
    let string = fs.readFileSync('./js/main.js', 'utf8')
    response.setHeader('Content-Type', 'applicatoin/javascript;charset=utf8')
    response.setHeader('Cache-Control', 'max-age=30')
    response.write(string)
    response.end()
  }else if(path === '/css/default.css'){
    let string = fs.readFileSync('./css/default.css', 'utf8')
    response.setHeader('Content-Type', 'applicatoin/css;charset=utf8')
    response.setHeader('Cache-Control', 'max-age=30')
    response.write(string)
    response.end()
  }else if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf8')
    let cookies = '' 
    if(request.headers.cookie){ // sign_in_email=1203901485@qq.com; a=1; b=2
      cookies = request.headers.cookie.split('; ') 
    }
    let hash = {}
    for(let i = 0; i < cookies.length; i++){
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    }
    let mySession = sessions[hash.sessionId]
    let email
    if(mySession){
      email = mySession.sign_in_email
    }
    let users = fs.readFileSync('./db/users', 'utf-8')
    users = JSON.parse(users)
    let foundUser
    for(let i = 0; i < users.length; i++){
      if(users[i].email === email){
        foundUser = users[i]
        break
      }
    }
    if(foundUser){
      string = string.replace('__password__', foundUser.password)
    }else{
      string = string.replace('__password__', '不知道')
    }
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'GET') {
    let string = fs.readFileSync('./sign_up.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'POST') {
    readBody(request)
      .then((body) => {  // body email=1&password=2&password_confirmation=3
        let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
        let hash = {}
        strings.forEach(element => {
          let parts = element.split('=')  // ['email', '1']
          let key = parts[0]
          let value = parts[1]
          hash[key] = decodeURIComponent(value)  // %40 == @      
        })
        let { email, password, password_confirmation } = hash
        if (email.indexOf('@') === -1) {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.write(`{
            "errors":{
              "email": "invalid"
            }
          }`)
        } else if (password !== password_confirmation) {
          response.statusCode = 400
          response.write(`password not match`)
        } else {
          let users = fs.readFileSync('./db/users', 'utf-8')
          try {
            users = JSON.parse(users)
          } catch (exception) {
            users = []
          }
          let inUse = false
          for (let i = 0; i < users.length; i++) {
            let user = users[i]
            if (user.email === email) {
              inUse = true
              break
            }
          }
          if (inUse) {
            response.statusCode = 400
            response.write(`email is in use!`)
          } else {
            users.push({ email: email, password: password })
            var usersString = JSON.stringify(users)
            fs.writeFileSync('./db/users', usersString)
            response.statusCode = 200
          }
        }
        response.end()
      })
  } else if (path === '/sign_in' && method === 'GET') {
    let string = fs.readFileSync('./sign_in.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_in' && method === 'POST') {
    readBody(request)
      .then((body) => {
        let strings = body.split('&')
        let hash = {}
        strings.forEach(element => {
          let parts = element.split('=')
          let key = parts[0]
          let value = parts[1]
          hash[key] = decodeURIComponent(value)
        })
        let { email, password } = hash
        //读取已注册用户数据
        let users = fs.readFileSync('./db/users', 'utf-8')
        try {
          users = JSON.parse(users)
        } catch (exception) {
          users = []
        }
        let found = false
        for (let i = 0; i < users.length; i++) {
          let user = users[i]
          if (user.email === email && user.password === password) {
            found = true
            break
          }
        }
        if (found) {  // 登录成功之后，返回一个Set-Cookie，跳转到首页
          let sessionId = Math.random() * 10000
          sessions[sessionId] = {sign_in_email: email}
          response.setHeader('Set-Cookie', `sessionId=${sessionId}`)
          response.statusCode = 200
        } else {
          response.statusCode = 401
        }
        response.end()
      })
  } else if (path === '/style.css') {
    let string = fs.readFileSync('./style.css', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/css; charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/main.js') {
    let string = fs.readFileSync('./main.js', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/xxx') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/json')
    response.write(`
    {
      "note":{
        "to":"jack",
        "from":"john",
        "heading":"打招呼",
        "body":"你好"
      }
    }
    `)
    response.end()
  } else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(`
    {
      "error":"失败！"
    }
    `)
    response.end()
  }


  /******** 代码结束，下面不要看 ************/
})

// 获取客户端传来的第四部分数据
function readBody(request) {
  let body = [] // 请求体
  return new Promise((resolve, reject) => {
    request.on('data', (chunk) => {  //request监听data事件，每次客户端传来一小块数据
      body.push(chunk)
    }).on('end', () => {  //当数据全部上传之后，就可以得到传递过来的所有数据啦
      body = Buffer.concat(body).toString()
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)


