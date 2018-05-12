//Node libraries
var express = require('express');
var http = require('http');
var body_parser = require('body-parser');

//Including utility methods
var helper = require('./helper');

//Importing Services
var service_control = require("./services/ControlService");
var service_user = require("./services/UserService");

//Express sub-app for control services
var control_app = express();

//Middleware stuff - Request body parser - For Control sub-app
control_app.use(body_parser.json());
control_app.use(body_parser.urlencoded({extended: true}));

//Handling pre-flight requests - required for browsers - For Control sub-app
control_app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

    if(req.method === 'OPTIONS'){
        res.status(204).send();
    }else{
        next();
    }
})

//Control sub-app login
control_app.post('/user/login', service_control.loginControlUser);

//Middleware stuff - CORS and Authorization header - Control sub-app
control_app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Control-Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE');

    //Extract control-authorization header since it contains the jwt
    var auth_header = req.headers['Control-Authorization'] || req.headers['control-authorization'];

    if(auth_header){
        //Verify the signature/token
        var decoded = helper.decodeToken(auth_header);
        if(decoded !== null){
            //Token Valid
            //Extract Retailer_DB from token and attach it to the request body
            //This body param will be used inside the endpoint function to determine which DB should be used.
            req.body.Retailer_DB = decoded.Retailer_DB;
            next();
        }else{
            //Token Invalid
            helper.sendResponse(res, 401, false, "Invalid Control Token.");
        }

    }else{
        helper.sendResponse(res, 400, false, "Please provide a control token.");
    }
})

//Control sub-app endpoints
//Retailer
control_app.post('/retailer', service_control.createRetailer);
control_app.put('/retailer', service_control.editRetailer);
control_app.get('/retailer', service_control.getRetailer);
control_app.get('/retailer/:retailer_id', service_control.getRetailer);
control_app.delete('/retailer', service_control.deleteRetailer);
control_app.get('/url/available', service_control.checkIfUrlAvailable);
//Control User
control_app.post('/user', service_control.createControlUser);
control_app.put('/user', service_control.editControlUser);
control_app.get('/user', service_control.getControlUser);
control_app.get('/user/:user_id', service_control.getControlUser);
control_app.delete('/user', service_control.deleteControlUser);

//Express app
var app = express();

//Mounting the control sub-app
app.use('/control', control_app);

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

    //Extract authorization header since it contains the jwt
    var auth_header = req.headers['Authorization'] || req.headers['authorization'];

    if(auth_header){
        //Verify the signature/token
        var decoded = helper.decodeToken(auth_header);
        if(decoded !== null){
            //Token Valid
            //Extract Retailer_DB from token and attach it to the request body
            //This body param will be used inside the endpoint function to determine which DB should be used.
            req.body.Retailer_DB = decoded.Retailer_DB;
            next();
        }else{
            //Token Invalid
            helper.sendResponse(res, 401, false, "Invalid Token.");
        }

    }else{
        helper.sendResponse(res, 400, false, "Please provide a token.");
    }
})

//Create server from the main app
var server = http.createServer(app);

//Server will accept request on port 80
server.listen(80, function(){
    console.log('API handling requests on port ' + server.address().port);
});