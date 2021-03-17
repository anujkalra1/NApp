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

methods.usersAuth = async (req, res, next) => {
    let payload = req.body;
    if(!payload.username){
        return res.status(500).json({ Message: 'Username is required', Status: 500 });
    }
    if(!payload.password){
        return res.status(500).json({ Message: 'Password is required', Status: 500 });
    }
    let authModel = {
        "username": payload.username,
        "password": payload.password
    }
    try {
        let data = await dbHelper.authUser(authModel);
        if(data) {
            res.json({Status:200,Message:"Success",Result:data});
        }
        else {
            res.status(403).json({ Message:"Invalid User credentials", Status:403});
        }
    } catch (err) {
        res.status(500).json({ Status: 500, Message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods
