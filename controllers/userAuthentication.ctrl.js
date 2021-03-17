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
const SessionHelper = require(`../classes/session_helper`);
const dbHelper = require(`../utils/dbQuery`);


methods.userAuthentication = async (req, res, next) => {
    try {
        let Url = "";
        let AuthToken = "";
        let tenant = "";
        let BaseUrl = appSettings.AuthenticationURL;
        let NonCommunitytenantName = appSettings.NonCommunitytenantName;
        let ClientId = appSettings.ClientId;
        let UserKey = appSettings.UserKey;
        let tenantName = appSettings.tenantName;
        let payload = req.body;
        if(!payload.tenant){
            return res.status(500).json({ message: 'Tenant name is required', status: 500 });
        }
        if(!payload.username){
            return res.status(500).json({ message: 'Username is required', status: 500 });
        }
        if(!payload.password){
            return res.status(500).json({ message: 'Password is required', status: 500 });
        }
        if (appSettings.CommunityEnvironment == "Community")
        {
            Url = appSettings.CommunityAuth;
            try{
                let oapi = new Orch_Community_APIClass();
                AuthToken = await oapi.RefreshToken(Url, ClientId, UserKey, tenantName);
                console.log("oapi.refreshToken Resp")
                console.log(AuthToken)
            }catch(err){
                console.log(err)
                return res.status(500).json({ message: 'Server side error Please try after some time', error: err });
            }
            tenant = tenantName;
        }else {
            Url = BaseUrl + "/api/account/authenticate";
            try{
                let oapi = new Orch_APIClass();
                AuthToken = await oapi.Authenticate(Url, NonCommunitytenantName, payload.username, payload.password);
                console.log("oapi.Authenticate Resp")
                console.log(AuthToken)
            }catch(err){
                return res.status(500).json({ message: 'Server side error Please try after some time', error: err });
            }
            tenant = NonCommunitytenantName;
        }
        let session = await dbHelper.LoginSession(payload, AuthToken);
        if(session){
            let info = {
                SessionId : session.SessionId,
                UserName : payload.username,
                Password : payload.password,
                AuthUrl : Url,
                TenancyName : tenant,
                AuthToken : AuthToken
            };
            await SessionHelper.Set(info);//update each user session 
            await AddorUpdatedAssests(AuthToken, session.SessionId); // Add queue and add Assets
            res.json({ message:"Success", status:200, Result : session});
        }else{
            res.status(403).json({ message:"Invalid User credentials", status:403});
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error Please after after some time', error: err });
    }

    async function AddorUpdatedAssests(AuthToken, sessionid){
        let CommunityUrl = appSettings.CommunityUrl;
        let BaseUrl = appSettings.AuthenticationURL;
        let tenantName = appSettings.tenantName;
        if (AuthToken != ""){
            if (appSettings.CommunityEnvironment == "Community"){
                try{
                    console.log("Calling community api for add or update assets")
                    let oapi = new Orch_Community_APIClass();
                    await oapi.AddNewQueue(CommunityUrl + "/odata/QueueDefinitions", AuthToken, sessionid, sessionid, tenantName);
                    await oapi.AddNewAsset(CommunityUrl + "/odata/Assets", AuthToken, sessionid + "_ReportFlag", sessionid, "", tenantName);
                    await oapi.AddNewAsset(CommunityUrl + "/odata/Assets", AuthToken, sessionid + "_MappingFlag", sessionid, "", tenantName);
                }catch(err){
                    console.log(err)
                    return err;
                }
            }else {
                try{
                    let oapi = new Orch_APIClass();
                    await oapi.AddNewQueue(BaseUrl + "/odata/QueueDefinitions", AuthToken, sessionid, "");
                    await oapi.AddNewAsset(BaseUrl + "/odata/Assets", AuthToken, sessionid + "_ReportFlag", sessionid, sessionid);
                    await oapi.AddNewAsset(BaseUrl + "/odata/Assets", AuthToken, sessionid + "_MappingFlag", sessionid, sessionid);
                }catch(err){
                    return err;
                }
            }
        }

    }
};




module.exports = methods
