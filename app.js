let koa = require('koa');
let route = require('koa-route');
let bodyparser = require('koa-bodyparser');
let mongo = require('koa-mongo');
let session = require('koa-session');
let conf = require('./conf.json');
let md5 = require('md5');

let app = koa();
let api = '/api/';
let {
    port, users, skills
} = conf;

app.keys = ['speech'];
app.use(mongo({
    host: "localhost",
    port: 27017
}));
app.use(session(app));
app.use(bodyparser());


app.use(function*(next) {
    try {
        yield next;
    } catch (e) {
        console.log(e);
    }
});

app.use(route.post(api + '*', checkLogin));
app.use(route.get(api + '*', checkLogin));

app.use(route.post('/login', function*() {
    let {
        user
    } = this.request.body;
    if (~users.indexOf(user)) {
        setSessionUser(this, user);
        this.body = {
            code: 1
        };
    } else {
        setSessionUser(this);
        this.body = {
            code: 0,
            msg: 'not find user'
        };
    }
}));

app.use(route.post(api + 'saveScore', function*() {
    let body = this.request.body;
    let res = {
        code: 1
    };
    if (!!body && !!body.to) {
        Object.assign(body, {
            from: getSessionUser(this.session, this.header)
        });

        if (body.to == body.from) {
            Object.assign(res, {
                code: 2,
                msg: 'can not score self'
            });
        } else {
            yield (cb) => {
                mc(this.mongo).update({
                    to: body.to,
                    from: body.from
                }, body, {
                    upsert: true
                }, (err, res) => cb(err, res));
            }
        }
    } else {
        Object.assign(res, {
            code: 0,
            msg: 'not find body or to'
        });
    }
    this.body = res;
}));

app.use(route.get(api + 'rank', function*() {
    let data =
        yield (cb) => mc(this.mongo).find({}).toArray((err, res) => cb(err, res));
    let orderData =
        yield (cb) => mo(this.mongo).find().sort({
            id: -1
        }).limit(1).toArray((err, res) => cb(err, res))
    let h = handleData(data);
    this.body = handleResult(h, orderData[0].order);
}));

app.use(route.get(api + 'random', function*() {
    let d = new Date();
    let time = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    let id = d.getTime();
    let randomOrder = randomArray(users);
    let order = [];
    randomOrder.map((user, index) => order.push({
        'user': user,
        'order': index + 1
    }));
    let data = {
        time: time,
        id: id,
        order: order
    };
    mo(this.mongo).insert(data);
    this.body = order;
}));

app.use(route.get(api + 'order', function*() {
    let data =
        yield (cb) => mo(this.mongo).find().sort({
            id: -1
        }).limit(1).toArray((err, res) => cb(err, res));
    if (data && data[0] && data[0].order) {
        let order = data[0].order;
        let user = getSessionUser(this.session, this.header);
        let index = -1;
        order.map((o) => {
            if (md5(o.user) === user) {
                index = o.order;
                // 表示被访问过了
                o.status = 1;
            }
        });

        mo(this.mongo).update({
            'id': data[0].id
        }, {
            $set: {
                "order": order
            }
        });

        this.body = {
            order: index
        };
    } else {
        this.body = {
            order: -1
        };
    }
}));

let handleResult = (data, orders) => {
    let res = {};
    orders.map((user) => {
        if (user.status) {
            res[user.user] = {
                order: user.order,
                score: 0
            }
        }
    });
    for (let to in data) {
        res[to] = res[to] || {};
        Object.assign(res[to], {
            score: calculate(data[to])
        });
    }
    return res;
}

let calculate = (list) => {
    let res = 0;
    list.map((item) => skills.map((p) => res += item[p] ? item[p] : 0));
    return res / list.length;
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

function* checkLogin(path, next) {
    let user = getSessionUser(this.session, this.header);
    if (isLogin(user)) {
        if (typeof path === 'string') {
            yield next;
        } else {
            yield path;
        }
    } else {
        setSessionUser(this);
        this.body = {
            code: 0,
            msg: "no login"
        };
    }
}

let randomArray = (lists) => {
    if (!lists) return [];
    lists = JSON.parse(JSON.stringify(lists));
    let res = [];
    while (lists.length) {
        let rn = randomInt(lists.length);
        res.push(lists[rn]);
        lists.splice(rn, 1);
    }
    return res;
}

let getSessionUser = (session, header) => session.user || header.token;
let setSessionUser = (_this, user) => {
    let m = '';
    if (user) {
        m = md5(user);
    } 
    console.log(m, user);
    _this.session.user = m;
    _this.set('token', m);
}
let isLogin = (user) => {
    let login = false;
    users.map(function(u) {
        if (md5(u) === user) {
            login = true;
        }
    });
    return login;
}

let randomInt = (max) => Math.floor(Math.random() * max);

// mongo
let mc = (mongo) => mongo.db('speech').collection('score');
let mo = (mongo) => mongo.db('speech').collection('order');

app.listen(port, () => console.log("start !!"));
