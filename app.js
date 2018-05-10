//Node libraries
var express = require('express');
var http = require('http');
var body_parser = require('body-parser');

//Including utility methods
var helper = require('./helper');

//Importing Services
var service_control = require("./services/ControlService");
var service_user = require("./services/UserService");

//Express app
var app = express();
var server = http.createServer(app);

//Middleware stuff - Request body parser
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

//Handling pre-flight requests - required for browsers
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

    if(req.method === 'OPTIONS'){
        res.status(204).send();
    }else{
        next();
    }
})

//Endpoints for signup / login (signup - only for customers, login - all users inside a retailer db)
app.post('/signup/:url_part', service_user.userSignup);
app.post('/login/:url_part', service_user.login);

//These 2 end points are just used to display error message when url part is not specified
app.post('/signup', service_user.userSignup);
app.post('/login', service_user.login);

//Middleware stuff - CORS and Authorization header
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
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

//Control DB Endpoints
//Retailer
app.post('/control/retailer', service_control.createRetailer);
app.put('/control/retailer', service_control.editRetailer);
app.get('/control/retailer', service_control.getRetailer);
app.get('/control/retailer/:retailer_id', service_control.getRetailer);
app.delete('/control/retailer', service_control.deleteRetailer);
//Control User
app.post('/control/user', service_control.createControlUser);
app.put('/control/user', service_control.editControlUser);
app.get('/control/user', service_control.getControlUser);
app.get('/control/user/:user_id', service_control.getControlUser);
app.delete('/control/user', service_control.deleteControlUser);
app.post('/control/user/login', service_control.loginControlUser);