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

methods.updateUserStatus = async (req, res, next) => {
    let userinfo = req.body;
    if(!userinfo.username){
        return res.status(500).json({ Message: 'Username is required', Status: 500 });
    }
    if(!userinfo.UserId){
        return res.status(500).json({ Message: 'UserId is required', Status: 500 });
    }
    if(!userinfo.Id){
        return res.status(500).json({ Message: 'Id is required', Status: 500 });
    }
    userinfo.status = false; 
    let stats = "";
    let finalstatus = "";
    try {
        if (appSettings.CommunityEnvironment != "Community") {
            if (!userinfo.status) {
                let adminuser = await dbHelper.getAdminUser(userinfo.UserId);
                adminuser = adminuser.length ? adminuser[0]: '';

                if (adminuser) {
                    let oapi = new Orch_APIClass();
                    let Url = appSettings.AuthenticationURL + "/api/account/authenticate";
                    let AuthToken = await oapi.Authenticate(Url, adminuser.Tenant, adminuser.UserName, adminuser.Password);

                    if (AuthToken) {
                        let userEndpoint = appSettings.AuthenticationURL + "/odata/Users";
                        stats = await oapi.DeleteUser(userEndpoint, AuthToken, userinfo.username);

                        if (stats == "Success") {
                            finalstatus = await dbHelper.addorUpdateStatus(userinfo.Id, userinfo.status);
                        }
                    }
                }
            }
            res.json({Status:200,Message:stats,Result:finalstatus});
        }
        else {
            res.json({Status:200,Message:"Access denied"});
        }
    } catch (err) {
        res.status(500).json({ Status: 500, Message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods
