/**
 * Endpoints/Services related to Product object in specified retailer DB
 */

//Helper Function
var helper = require('../helper');

//Required Models
var Product = require('../models/Product');
var Alert = require('../models/Alert');
var User = require('../models/User');

exports.createProduct = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var product = new Product(Retailer_DB).dbSeq;

    //Extract body params
    var Name = req.body.Name;
    var Short_Description = req.body.Short_Description;
    var Detail_Description = req.body.Detail_Description;
    var Price = req.body.Price;
    var Image_Url = req.body.Image_Url;
    var Quantity = req.body.Quantity;
    var Minimum_Quantity_Threshold = req.body.Minimum_Quantity_Threshold;

    //Check if necessary params were sent
    if(Name && Short_Description && Detail_Description && Price != undefined && Quantity != undefined && Minimum_Quantity_Threshold != undefined){
        product.create({
            Name: Name,
            Short_Description: Short_Description,
            Detail_Description: Detail_Description,
            Price: Price,
            Image_Url: Image_Url,
            Quantity: Quantity,
            Minimum_Quantity_Threshold: Minimum_Quantity_Threshold
        }).then((created_product)=>{
            helper.sendResponse(res, 200, true, created_product);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating product. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.editProduct = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var product = new Product(Retailer_DB).dbSeq;
    var alert = new Alert(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var Name = req.body.Name;
    var Short_Description = req.body.Short_Description;
    var Detail_Description = req.body.Detail_Description;
    var Price = req.body.Price;
    var Image_Url = req.body.Image_Url;
    var Quantity = req.body.Quantity;
    var Minimum_Quantity_Threshold = req.body.Minimum_Quantity_Threshold;

    //Check if necessary params were sent
    if(id && Name && Short_Description && Detail_Description && Price != undefined && Quantity != undefined && Minimum_Quantity_Threshold != undefined){
        //Fetch the product quantity before the update
        product.findOne({
            attributes:["Quantity", "Name"],
            where:{
                id: id
            }
        }).then(product_found=>{
            
            //Check if product is present
            if(product_found){

                //Product found
                var earlier_quantity = product_found.Quantity;
                var new_quantity = Quantity;

                //Check to see if product quantity is increased from 0 to some number
                if(earlier_quantity == 0 && new_quantity > earlier_quantity){
                    //This means that product was not available earlier in the inventory.. and is now available for customers
                    //Find customers who signed up for this product availability
                    alert.belongsTo(user, {foreignKey: 'User_id'});
                    alert.findAll({
                        attributes:[],
                        where:{
                            Product_id: id,
                            Is_Triggered: false
                        },
                        include:[{
                            model: user,
                            attributes: ["Email"]
                        }]
                    }).then(alerts=>{
                        if(alerts.length > 0){
                            //We now have an array of alert objects and in each of those objects we have user email IDs
                            
                            //Loop through the alerts and extract Email ID of the users
                            var arr_email_id = [];
                            alerts.forEach(single_alert => {
                                arr_email_id.push(single_alert.User.Email);
                            });

                            //Send email to the users using the helper function
                            try{
                                helper.sendEmail(arr_email_id, "Product now available", `
                                    <p>
                                        Hello, <br/><br/>
                                        Product '`+ product_found.Name +`' is now available. Visit our website now to order. <br/><br/>
                                        Regards, <br/>
                                        B2BComm Team.
                                    </p>
                                `);
                            }catch(e){
                                console.log('Error sending emails.');
                                console.log(e);
                            }

                            //Update Is_Triggered to true for all the alerts sent
                            alert.update({
                                Is_Triggered: true
                            },{
                                where:{
                                    Product_id: id,
                                    Is_Triggered: false
                                }
                            }).then(()=>{
                                console.log("Alerts updated - Is_Triggered = true.")
                            }).catch(err=>{
                                console.log('Error updating alerts.');
                                console.log(err);
                            });
                        }
                    
                    }).catch(error=>{
                        console.log('Error fetching alerts.');
                        console.log(error);
                    })
                }

                //Meanwhile, update the product asynchronously
                product.update({
                    Name: Name,
                    Short_Description: Short_Description,
                    Detail_Description: Detail_Description,
                    Price: Price,
                    Image_Url: Image_Url,
                    Quantity: Quantity,
                    Minimum_Quantity_Threshold: Minimum_Quantity_Threshold
                },{
                    where:{
                        id: id
                    }
                }).then(()=>{
                    helper.sendResponse(res, 200, true, "Product updated successfully.");
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error Updating Product. Code 2.");
                });
            }else{
                helper.sendResponse(res, 404, false, "Product not found.");
            }

        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Updating Product. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getProduct = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var product = new Product(Retailer_DB).dbSeq;

    //Extract route params
    var Product_id = req.params.product_id;

    //Check if necessary params were sent
    if(Product_id != undefined){

        //Get single product
        product.findOne({
            where:{
                id: Product_id
            }
        }).then((product_found)=>{
            helper.sendResponse(res, 200, true, product_found);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching Product. Code 1.");
        });

    }else{

        //Get all products
        product.findAll().then(products=>{
            helper.sendResponse(res, 200, true, products);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Fetching Products. Code 1.");
        });

    }
}

exports.createAlert = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var alert = new Alert(Retailer_DB).dbSeq;

    //Extract body params
    var Product_id = req.body.Product_id;
    var User_id = req.body.User_id;

    //Check if necessary params were sent
    if(Product_id && User_id){

        //Check to see if an alert already exists
        alert.findOne({
            where:{
                User_id: User_id,
                Product_id: Product_id,
                Is_Triggered: false
            }
        }).then(existing_alert =>{
            if(!existing_alert){

                //Create an alert
                alert.create({
                    User_id: User_id,
                    Product_id: Product_id,
                    Is_Triggered: false
                }).then((alert)=>{
                    helper.sendResponse(res, 200, true, alert);
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error creating alert. Code 1.");
                });

            }else{
                helper.sendResponse(res, 400, false, "Alert already exists. Cannot create a duplicate.");
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error creating alert. Code 2.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.getAlert = function(req, res) {
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var alert = new Alert(Retailer_DB).dbSeq;

    //Extract query params
    var Product_id = req.query.Product_id;
    var User_id = req.query.User_id;

    //Check if necessary params were sent
    if(Product_id && User_id){

        //Check to see if an alert exists and has not been triggered yet
        alert.findOne({
            where:{
                User_id: User_id,
                Product_id: Product_id,
                Is_Triggered: false
            }
        }).then(alert_found =>{
            if(alert_found){
                helper.sendResponse(res, 200, true, alert_found);
            }else{
                helper.sendResponse(res, 200, true, null);
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching alert. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}