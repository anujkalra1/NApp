/** **************************************************************************
*                      users.ctrl.js
* This is the controller for users microservice, which provides
* Create and get and Update the users

**************************************************************************** */

let methods = {};
const lo = require('lodash');
const { execQuery } = require('../utils/connections');
const {dbConfig} = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);

methods.getRoles = async (req, res, next) => {
    try {
        let list = [];
        let rolesData = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_GetUserRoles"()
        `);
        if (!lo.isEmpty(rolesData)) {
            rolesData.forEach(element => {
                list.push(element.Rolename);
            });
        }
        res.json({status:200,message:"Success", Result : list});
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods
