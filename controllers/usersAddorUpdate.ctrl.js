/** **************************************************************************
*                      users.ctrl.js
* This is the controller for users microservice, which provides
* Create and get and Update the users

**************************************************************************** */

let methods = {};
const { execQuery } = require('../utils/connections');
const {dbConfig} = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);

methods.addorUpdateUser = async (req, res, next) => {
    try {
        var status = '';
        let BaseUrl = appSettings.AuthenticationURL;
        let AuthToken = '';
        let result = false;
        let model = req.body;
        var adminuser = {
            tenant : "Default",
            servername : "Test Server",
            password : "eygds123456",
            username : "eygds"
        }
        let respData = await dbHelper.getAdminUser(model.UserId);
        adminuser = respData.length ? respData[0] : '';
        console.log(adminuser)
        if (adminuser) {
            if (appSettings.CommunityEnvironment != "Community"){
                let oapi = new Orch_APIClass();
                let Url = BaseUrl + "/api/account/authenticate";
                AuthToken = await oapi.Authenticate(Url, adminuser.Tenant, adminuser.UserName, adminuser.Password);
                let userEndpoint = BaseUrl + "/odata/Users";
                if (AuthToken) {
                    let roles = model.RolesList.split(',');
                    if (model.Id > 0) {
                        //Update a user
                        status = await oapi.UpdateUser(userEndpoint, AuthToken, model.FullName, model.UserName, model.Surname, model.Password, roles);
                        if (status == "OK") {
                            result = await dbHelper.addorUpdateuser(model, status);
                            result = result ? true : false;
                            status = "Updated";
                        }
                    } else {
                        //Create a user 
                        var oldpassword = model.Password + "_" + model.ClientName;
                        status = await oapi.CreateUser(userEndpoint, AuthToken, model.FullName, model.Surname, model.UserName, oldpassword, roles, adminuser.tenant);
                        if (status == "CREATED"){
                            model.ClientName = model.TenancyName;
                            result = await dbHelper.addorUpdateuser(model, status);
                            result = result ? true : false;
                            let passwordUrl = BaseUrl + "//account/changepassword";
                            let passwordSttaus = await oapi.UpdatePassword(passwordUrl, AuthToken, model.Password, oldpassword, model.UserName, userEndpoint);
                        }
                        if(status == "EXISTS"){
                            status = 'Username already exists';
                            result = false;
                        }
                    }
                }
                res.json({status:200,message:status, Result: result});
            } else {
                res.json({status:200,message:"NOACCESS", Result: result});
            }
        } else {
            res.json({status:200,message:"NOACCESS", Result: result});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods
