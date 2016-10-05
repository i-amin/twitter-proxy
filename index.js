var http = require('http');
var https = require('https');
var url = require('url');
var querystring = require('querystring');

var portNum = process.env.PORT || 3000;

/*
 * generate the bearer code
 * */

var bearerKey = '';
if (!process.env.consumerKey || !process.env.consumerSecret) {
    throw new Error('both consumerKey and consumerSecret are required');
} else {
    var bearerCredintials = new Buffer(process.env.consumerKey + ':' + process.env.consumerSecret).toString('base64');

    var reqBody = querystring.stringify({
        grant_type: "client_credentials"
    });
    var opts = {
        hostname: 'api.twitter.com',
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + bearerCredintials,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Content-Length': Buffer.byteLength(reqBody)
        }
    };

    var bearerAuthReq = https.request(opts, function (res) {
        res.on('data', function (d) {
            bearerKey = JSON.parse(d.toString()).access_token;
            startingProxyServer();
        })
    });
    bearerAuthReq.write(reqBody);


    bearerAuthReq.on('error', function (e) {
        console.error(e);
    });
}


function startingProxyServer() {
    http.createServer(onRequest).listen(portNum, function () {
        console.log('server is listening on port: ' + portNum);
    });
}

function onRequest(c_req, c_res) {
    console.log('serving :' + c_req.url);

    var options = {
        hostname: 'api.twitter.com',
        path: '/1.1/' + c_req.url,
        method: c_req.method,
        headers: {
            Authorization: 'Bearer ' + bearerKey
        }
    };

    var proxy = https.request(options, function (res) {


        for (var key in res.headers) {
            if (res.headers.hasOwnProperty(key)) {
                c_res.setHeader(key, res.headers[key])
            }
        }


        res.pipe(c_res, {
            end: true
        });

        res.on('data', function (data) {
            // console.log('result :', JSON.parse(data.toString()));
        });
    });


    proxy.on('error', function (e) {
        console.log('error', e);
    });

    c_req.pipe(proxy, {
        end: true
    });
}