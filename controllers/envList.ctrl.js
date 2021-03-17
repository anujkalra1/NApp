/** **************************************************************************
*                      run.ctrl.js
* This is the controller for run microservice, which provides
* Create and get and Update the runId servicesSS

**************************************************************************** */

/**
 * The getRunId  method is used to get the runId details based on the userId given
 *  @param {userId} - userId
 */


const lo = require('lodash');
let methods = {};

const { execQuery } = require('../utils/connections');
const {dbConfig} = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);

methods.envList = async (req, res, next) => {
    try {
        let payload = req.body;
        let sessionid = payload.sessionid;
        let tenantName = appSettings.tenantName;
        let CommunityUrl = appSettings.CommunityUrl;
        let BaseUrl = appSettings.AuthenticationURL;

        if (appSettings.CommunityEnvironment == "Community") {
            let oapi = new Orch_Community_APIClass();
            items = await oapi.GetEnvironments(CommunityUrl + "/odata/Environments", sessionid, tenantName);
        }
        else {
            let oapi = new Orch_APIClass();
            items = await oapi.GetEnvironments(BaseUrl + "/odata/Environments", sessionid);
        }
        res.json({status:200,message:"Success",data:items});
    } catch (err) {
        console.log(err);
        if(err.status == 403){
            res.status(403).json({ status: 403, message: err.message });
        }else{
            res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
        }
    }
};




module.exports = methods
