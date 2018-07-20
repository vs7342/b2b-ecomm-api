/**
 * Endpoints/Services related to Cart object in specified retailer DB
 */

//Helper Function
var helper = require('../helper');

//Required Models
var Cart = require('../models/Cart');
var Product = require('../models/Product');
var User = require('../models/User');

exports.addProductToCart = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var cart = new Cart(Retailer_DB).dbSeq;
    var product = new Product(Retailer_DB).dbSeq;
    var user = new User(Retailer_DB).dbSeq;

    //Extract body params
    var User_id = req.body.User_id;
    var Product_id = req.body.Product_id;
    var Quantity = req.body.Quantity;

    //Check if necessary params were sent
    if(User_id && Product_id && Quantity != undefined){

        //Valditing user ID
        user.findOne({
            where:{
                id: User_id
            }
        }).then((user_found)=>{
            if(user_found){

                //Validating product id
                product.findOne({
                    where:{
                        id: Product_id,
                        Quantity:{
                            $gte: Quantity
                        }
                    }
                }).then(product_found =>{
                    if(product_found){

                        //Checking if the cart already has the product
                        cart.findOne({
                            where:{
                                User_id: User_id,
                                Product_id: Product_id
                            }
                        }).then(cart_found=>{
                            if(!cart_found){

                                //Proceed with cart creation
                                cart.create({
                                    User_id: User_id,
                                    Product_id: Product_id,
                                    Quantity: Quantity
                                }).then(created_cart =>{
                                    helper.sendResponse(res, 200, true, created_cart);
                                }).catch(err=>{
                                    console.error(err);
                                    helper.sendResponse(res, 500, false, "Error Adding product to cart. Code 4.");
                                });

                            }else{
                                helper.sendResponse(res, 400, false, "Product already exists in cart. Try updating quantity."); 
                            }
                        }).catch(err=>{
                            console.error(err);
                            helper.sendResponse(res, 500, false, "Error Adding product to cart. Code 3.");
                        });

                    }else{

                        // Either product not found.. Or not enough quantity available.. Find out the qty and send error message accordingly
                        product.findOne({
                            where:{
                                id: Product_id
                            }
                        }).then(product_with_qty_found=>{
                            if(product_with_qty_found){
                                helper.sendResponse(res, 404, false, "Cannot Add Product. Only " + product_with_qty_found.Quantity + " items are available."); 
                            }else{
                                helper.sendResponse(res, 404, false, "Product not found."); 
                            }
                        }).catch(err=>{
                            console.error(err);
                            helper.sendResponse(res, 500, false, "Error Adding product to cart. Code 5.");
                        });

                    }
                }).catch(err=>{
                    console.error(err);
                    helper.sendResponse(res, 500, false, "Error Adding product to cart. Code 2.");
                });

            }else{
                helper.sendResponse(res, 404, false, "User not found."); 
            }
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error Adding product to cart. Code 1.");
        });
    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.changeProductQuantity = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var cart = new Cart(Retailer_DB).dbSeq;
    var product = new Product(Retailer_DB).dbSeq;

    //Extract body params
    var id = req.body.id;
    var Quantity = req.body.Quantity;

    //Check if necessary params were sent
    if(id && Quantity != undefined){

        if(Quantity == 0){

            //Delete cart instance (Used for removing product from cart)
            cart.destroy({
                where:{
                    id: id
                }
            }).then(()=>{
                helper.sendResponse(res, 200, true, "Cart updated successfully");
            }).catch(err=>{
                console.error(err);
                helper.sendResponse(res, 500, false, "Error Updating Cart. Code 2.");
            });

        }else{

            //Check if there is enough quantity available to add to cart
            cart.belongsTo(product, {foreignKey: "Product_id"});
            cart.findOne({
                where:{
                    id: id
                },
                include:[{
                    model: product,
                    where:{
                        Quantity:{
                            $gte: Quantity
                        }
                    }
                }]
            }).then(cart_found => {
                if(cart_found){
                    //Update quantity
                    cart.update({
                        Quantity: Quantity
                    },{
                        where:{
                            id: id
                        }
                    }).then(()=>{
                        helper.sendResponse(res, 200, true, "Cart updated successfully");
                    }).catch(err=>{
                        console.error(err);
                        helper.sendResponse(res, 500, false, "Error Updating Cart. Code 2.");
                    });
                }else{
                    // Either cart not found / product not found / product found but not enough quantity available
                    cart.findOne({
                        where:{
                            id: id
                        }
                    }).then(cart_found_with_product => {
                        if(cart_found_with_product){
                            // Check if product is available.. Return qty if available
                            product.findOne({
                                where:{
                                    id: cart_found_with_product.Product_id
                                }
                            }).then(product_with_qty_found=>{
                                if(product_with_qty_found){
                                    helper.sendResponse(res, 404, false, "Cannot update. Only " + product_with_qty_found.Quantity + " items are available."); 
                                }else{
                                    helper.sendResponse(res, 404, false, "Product not found."); 
                                }
                            }).catch(err=>{
                                console.error(err);
                                helper.sendResponse(res, 500, false, "Error Updating Cart. Code 4.");
                            });
                        }else{
                            helper.sendResponse(res, 404, false, "Cannot update. Cart with specified ID not found.");
                        }
                    }).catch(err=>{
                        console.error(err);
                        helper.sendResponse(res, 500, false, "Error Updating Cart. Code 3.");
                    });
                }

            }).catch(err=>{
                console.error(err);
                helper.sendResponse(res, 500, false, "Error Updating Cart. Code 1.");
            });
        }

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}

exports.emptyCart = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var cart = new Cart(Retailer_DB).dbSeq;

    //Extract body params
    var User_id = req.body.User_id;

    //Check if necessary params were sent
    if(User_id){

        //Delete cart instances for the user id specified
        cart.destroy({
            where:{
                User_id: User_id
            }
        }).then(()=>{
            helper.sendResponse(res, 200, true, "Cart emptied successfully");
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error emptying cart. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    } 
}

exports.getCartForUser = function(req, res){
    //Extract DB name
    var Retailer_DB = req.body.Retailer_DB;

    //Define models based on DB
    var cart = new Cart(Retailer_DB).dbSeq;
    var product = new Product(Retailer_DB).dbSeq;

    //Extract query params
    var User_id = req.query.User_id;

    //Check if necessary params were sent
    if(User_id){

        //Delete cart instances for the user id specified
        cart.belongsTo(product, {foreignKey: "Product_id"});
        cart.findAll({
            attributes:["id", "User_id", "Quantity", "Product_id"],
            where:{
                User_id: User_id
            },
            include:[{
                model: product,
                attributes: ["id", "Name", "Short_Description", "Price", "Image_Url"]
            }]
        }).then((cart_products)=>{
            helper.sendResponse(res, 200, true, cart_products);
        }).catch(err=>{
            console.error(err);
            helper.sendResponse(res, 500, false, "Error fetching cart products. Code 1.");
        });

    }else{
        helper.sendResponse(res, 400, false, "Insufficient Parameters");
    }
}
