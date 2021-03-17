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

methods.getAllUsers = async (req, res, next) => {
    try {
        let payload = req.body;
        let sessionId = payload.SessionId;
        let clientName = payload.ClientName;
        let list = [];
        let userSession = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_GetUserSessionHistory"(
            IV_SESSIONID => '${sessionId}',
            IV_USERTYPE => '2'
            )
        `);
        console.log(userSession)
        if (!lo.isEmpty(userSession)) {
            let userData = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_GetUserDetailsByClientName"(
                IV_INTERFACEADMIN => 0,
                IV_ISACTIVE => 1,
                IV_CLIENTNAME  => '${clientName}'
                )
            `);
            if (!lo.isEmpty(userData)) {
                userData.forEach(item => {
                    let obj = {
                        EmailAddress: item.EmailAddress,
                        FullName: item.FullName,
                        Surname: item.Surname,
                        Id: item.Id,
                        UserId: item.UserId,
                        LastLoginTime: item.LastLoginTime,
                        RolesList: item.RolesList,
                        TenantId: item.TenantId,
                        TenancyName: item.TenancyName,
                        UserName: item.UserName,
                        ClientName: item.clientName,
                        InterfaceAdmin: item.InterfaceAdmin,
                        IsActive: item.IsActive,
                        CreationTime: item.CreationTime,
                        LastLoginTime: item.LastLoginTime
                    }
                    list.push(obj);
                });
            }
        }
        res.json({status:200,message:"Success", Result : list});
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods
