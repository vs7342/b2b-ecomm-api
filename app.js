//Node libraries
var express = require('express');
var http = require('http');
var body_parser = require('body-parser');

//Including utility methods
var helper = require('./helper');

//Express app
var app = express();
var server = http.createServer(app);

//Middleware stuff - Request body parser
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

//Handling pre-flight requests - required for browsers
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

    if(req.method === 'OPTIONS'){
        res.status(204).send();
    }else{
        next();
    }
})

//Middleware stuff - CORS and API Key header
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE');
    next();
})

//Server will accept request on port 80
server.listen(80, function(){
    console.log('API handling requests on port ' + server.address().port);
});

//Test Route - GET
app.get('/test', function(req, res){
    res.status(200).send(helper.getResponseObject(true, "OK"));
});

//Test Route - POST
app.post('/test', function(req, res){
    var test_param = req.body.test_param;
    res.status(200).send(helper.getResponseObject(true, {'test_param': test_param}));
})

