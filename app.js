let koa = require('koa');
let route = require('koa-route');
let bodyparser = require('koa-bodyparser');
let mongo = require('koa-mongo');
let session = require('koa-session');

let app = koa();
app.keys = ['speech'];
app.use(mongo({
    host: "localhost",
    port: 27017
}));

app.use(session(app));
app.use(bodyparser());


let port = 8082;
let api = '/api/';
let users = ['flyover'];

app.use(function*(next) {
    try {
        yield next;
    } catch (e) {
        console.log(e);
    }
});

app.use(route.post(api + 'login', function*() {
    let {
        user
    } = this.request.body;
    if (~users.indexOf(user)) {
        this.session.user = user;
        this.body = {
            code: 1
        };
    } else {
        this.session.user = '';
        this.body = {
            code: 0,
            msg: 'not find user'
        };
    }
}));

app.use(route.post(api + 'saveScore', checkLogin));
app.use(route.post(api + 'saveScore', function*() {
    let body = this.request.body;
    let res = {
        code: 1
    };
    if (!!body && !!body.to) {
        Object.assign(body, {from: this.session.user});
        yield (cb) => {
            mc(this.mongo).update({to: body.to, from: body.from}, body, {upsert: true}, (err, res) => cb(err, res));
        }
    } else {
        Object.assign(res, {code: 0, msg: 'not find body'});
    }
    this.body = res;
}));

app.use(route.get(api + 'rank', checkLogin));
app.use(route.get(api + 'rank', function*() {
    let data = yield(cb) => {
        mc(this.mongo).find({}).toArray((err, res) => cb(err, res));
    }
    console.log(data);
    let h = handleData(data);
    this.body = handleResult(h);
}));

let handleResult = (data) => {
    let res = {};
    for (let to in data) {
        res[to] = calculate(data[to]);
    }
    return res;
}

let projects = ['language', 'ppt'];
let calculate = (list) => {
    let res = 0;
    list.map((item) => projects.map((p) => res += item[p] ? item[p] : 0));
    return res;
}

let handleData = (data) => {
    var hash = {};
    data.map((item) => {
        let list = hash[item.to] || [];
        list.push(item);
        hash[item.to] = list;
    });

    return hash;
}

function* checkLogin(next) {
    if (this.session.user) {
        yield next;
    } else {
        this.body = {
            code: 0,
            msg: "no login"
        };
    }
}

// mongo
let mc = (mongo) => mongo.db('speech').collection('score');

app.listen(port, () => console.log("start !!"));
