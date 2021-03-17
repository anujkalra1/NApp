const request = require('request');
const SessionHelper = require(`./session_helper`);
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;

class Orch_Community_APIClass {
    constructor() {
        this.AuthToken = '';
        this.JobKey = '';
        this.JobID = '';
        this.ReleaseKey = '';
        this.AddAssetStatus = '';
        this.EditAssetStatus = '';
        this.AssetID = '';
        this.ErrorMessage = '';
        this.list_Environments = [];
        this.list_Robots = [];
        this.list_Process = [];
    }

    async RefreshToken(AuthenticationURL, clientID, userKey, tenantName){
        return new Promise(async(resolve, reject)=>{ 
            try
            {
                let loginModel = {
                    "grant_type": "refresh_token",
                    "client_id": clientID,
                    "refresh_token": userKey
                }
                console.log("refreshToken : "+AuthenticationURL)
                request({
                    url:AuthenticationURL,
                    method: 'POST',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json'
                    },
                    json: loginModel
                }, function(error, response, body){
                    if(response && response.statusCode == 200){
                        console.log(body)
                        resolve(body.access_token);
                    }else{
                        console.log("Error while executing auth api"); 
                        reject(error);
                    }				
                }); 
            } catch (e) {
                reject(e);
            }
        }); 
    }
    async Authenticate(AuthenticationURL, Tenant, Usernameoruseremail, Password){
        return new Promise(async(resolve, reject)=>{ 
            try
            {
                let ClientId = appSettings.ClientId;
                let UserKey = appSettings.UserKey;
                let loginModel = {
                    "grant_type": "refresh_token",
                    "client_id": ClientId,
                    "refresh_token": UserKey
                }
                request({
                    url:AuthenticationURL,
                    method: 'POST',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    },
                    json: loginModel
                }, function(error, response, body){
                    if(response && response.statusCode == 200){
                        resolve(body.access_token);
                    }else{
                        console.log("Error while executing auth api"); 
                        reject(error);
                    }				
                }); 
            } catch (e) {
                reject(e);
            }
        }); 
    }

    async AddNewQueue(AuthenticationURL, AuthToken, queueName, queueDescription, tenantName){
        let thisLocal = this;
        let isTrue = true;
        do {
            try{
                var userdetail = await SessionHelper.Get(queueName);
                userdetail = JSON.parse(userdetail);
                let resp = await thisLocal.AddNewQueueInternal(AuthenticationURL, AuthToken, queueName, queueDescription, tenantName, userdetail);
                console.log("resp")
                console.log(resp)
                if(resp == 2){
                    isTrue = true;
                    await thisLocal.UpdataAuthToken(userdetail);
                }else{
                    isTrue = false; 
                }
            } catch (e) {
                console.log(e)
                throw e;
            }
        } while (isTrue);
    }

    async AddNewQueueInternal(AuthenticationURL, AuthToken, queueName, queueDescription, tenantName, userdetail){
        return new Promise(async(resolve, reject)=>{
            let addQueueInfo = {
                "Name": queueName,
                "Description": queueDescription,
                "MaxNumberOfRetries": 1,
                "AcceptAutomaticallyRetry": true,
                "EnforceUniqueReference": true
            }
            request({
                url:AuthenticationURL,
                method: 'POST',
                headers:{
                    "X-UIPATH-TenantName":userdetail.TenancyName,
                    "Authorization":"Bearer " + userdetail.AuthToken,
                    "Content-Type":"application/json",
                    "Accept": 'application/json',
                    "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                },
                json: addQueueInfo
            }, async(error, response, body)=>{
                if(response && response.statusCode == 201){
                    console.log(body);
                    console.log(error);
                    resolve(1);
                } else if (response.statusCode == 401){
                    console.log(body);
                    console.log(error);
                    resolve(2);
                } else {
                    console.log(body);
                    console.log(error);
                    resolve(3);
                }			
            }); 
        }); 
    }
    async AddNewAsset(AuthenticationURL, AuthToken, assetName, assetDescription, assetValue, tenantName){
        let thisLocal = this;
        let isTrue = true;
        do {
            try{
                var userdetail = await SessionHelper.Get(assetDescription);
                userdetail = JSON.parse(userdetail);
                let resp = await thisLocal.AddNewAssetInternal(AuthenticationURL, AuthToken, assetName, assetDescription, assetValue, tenantName, userdetail);
                console.log("resp")
                console.log(resp)
                if(resp == 2){
                    isTrue = true;
                    await thisLocal.UpdataAuthToken(userdetail);
                }else{
                    isTrue = false; 
                }
            } catch (e) {
                console.log(e)
                throw e;
            }
        } while (isTrue);
        
    }

    async AddNewAssetInternal(AuthenticationURL, AuthToken, assetName, assetDescription, assetValue, tenantName, userdetail){
        return new Promise(async(resolve, reject)=>{ 
            var userdetail = await SessionHelper.Get(assetDescription);
            userdetail = JSON.parse(userdetail);
            let addAssetInfo = {
                "Name": assetName,
                "ValueScope": "Global",
                "ValueType": "Bool",
                "BoolValue": false
            }
            request({
                url:AuthenticationURL,
                method: 'POST',
                headers:{
                    "X-UIPATH-TenantName":userdetail.TenancyName,
                    "Authorization":"Bearer " + userdetail.AuthToken,
                    "Content-Type":"application/json",
                    "Accept": 'application/json',
                    "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                },
                json: addAssetInfo
            }, async(error, response, body)=>{
                if(response && response.statusCode == 201){
                    console.log(body);
                    console.log(error);
                    resolve(1);
                } else if (response.statusCode == 401){
                    console.log(body);
                    console.log(error);
                    resolve(2);
                } else {
                    console.log(body);
                    console.log(error);
                    resolve(3);
                }			
            }); 
        }); 
    }

    async UpdataAuthToken(userdetail){
        let thisLocal = this;
        console.log("Inside the update auth token")
        if (userdetail){
            let authtoken = await thisLocal.Authenticate(userdetail.AuthUrl, userdetail.TenancyName, userdetail.UserName, userdetail.Password);
            userdetail.AuthToken = authtoken;
            //updating session info
            await SessionHelper.Set(userdetail);
            return true;
        }
    }

    async GetRobots(AuthenticationURL, EnvironmentName, sessionid, tenantName) {
        var userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;

        do {
        return new Promise(async(resolve, reject) => {
            // let list_Robots = [];
            try {
                request({
                    url:AuthenticationURL,
                    method: 'GET',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "Authorization": "Bearer " + userdetail.AuthToken,
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    }
                }, async(error, response, body) => {
                    if(response && response.statusCode == 200){
                        isTrue = false;
                        let result = JSON.parse(response.body);
                        let list_Robots_All = result["value"];
                        let env;

                        list_Robots_All.forEach(Robot => {
                            env = Robot.RobotEnvironments.toString();
                            if(env.includes(EnvironmentName)) {
                                this.list_Robots.push(Robot["Name"]);
                            }
                        });
                        resolve(this.list_Robots);
                    }else{
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        } else {
                            isTrue = false;
                            console.log("Error while executing get robot api"); 
                            reject(error);
                        }
                    }			
                }); 
            } catch (e) {
                isTrue = false;
                reject(error);
            }
        });
        } while (isTrue);
    }

    async GetEnvironments(AuthenticationURL, sessionid, tenantName) {
        var userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;

        do {
        return new Promise(async(resolve, reject) => {
            // let list_Environments = [];
            try {
                request({
                    url:AuthenticationURL,
                    method: 'GET',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "Authorization": "Bearer " + userdetail.AuthToken,
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    }
                }, async(error, response, body) => {
                    if(response && response.statusCode == 200){
                        isTrue = false;
                        let result = JSON.parse(response.body);
                        let list_Environments_All = result["value"];

                        list_Environments_All.forEach(envt => {
                            this.list_Environments.push(envt["Name"]);
                        });
                        resolve(this.list_Environments);
                    }else{
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        } else {
                            isTrue = false;
                            console.log("Error while executing get environment api"); 
                            reject(error);
                        }
                    }			
                }); 
            } catch (e) {
                isTrue = false;
                reject(error);
            }
        });
        } while (isTrue);
    }

    async GetReleaseKey(AuthenticationURL, sessionid, ProcessName, tenantName,Environmentname)
    {
        console.log('GetReleaseKey-----');
        let thisLocal = this;
        let isTrue = true;
        let status = 0;
        let ReleaseKey = "";

        let userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);

        do {
        return new Promise(async(resolve, reject) => {
            try {
                request({
                    url:AuthenticationURL,
                    method: 'GET',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "Authorization": "Bearer " + userdetail.AuthToken,
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    }
                }, async(error, response, body) => {
                    if(response && response.statusCode == 200){
                        isTrue = false;
                        let result = JSON.parse(response.body);
                        let resarr = result["value"];
                        resarr.forEach(element => {
                            let ProcessKey = element["ProcessKey"];
                            let Environment = element["EnvironmentName"];

                            if (ProcessKey.toUpperCase().includes(ProcessName.toUpperCase()) && 
                            (Environmentname.toUpperCase() == Environment.toUpperCase()))
                            {
                                ReleaseKey = element["Key"];
                            }
                        });
                        console.log('releasekey',ReleaseKey);
                        resolve(ReleaseKey);
                    }
                    else {
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        }
                        else {
                            isTrue = false;
                            console.log("Error while executing the api");
                            reject(error);
                        }
                    }
                });
            } catch (err) {
                isTrue = false;
                reject(err);
            }
            });
        } while (isTrue);
        return ReleaseKey;
    }

    async GetRobotID(AuthenticationURL, sessionid, RobotName, tenantName)
    {
        console.log('GetRobotID-----');
        let userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;
        let status = 0;
        let RoboID = "";

        do {
        return new Promise(async(resolve, reject) => {
            try {
                request({
                    url:AuthenticationURL,
                    method: 'GET',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "Authorization": "Bearer " + userdetail.AuthToken,
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    }
                }, async(error, response, body) => {
                    if(response && response.statusCode == 200){
                        isTrue = false;
                        let result = JSON.parse(response.body);
                        let resarrrobo = result["value"];

                        resarrrobo.forEach(element => {
                            let RoboName = element["Name"];
                            let vId = element["Id"];
                            if (RoboName == RobotName) {
                                // var RoboRequired = RoboName; //working
                                RoboID = element["Id"];
                            }
                        });
                        console.log('RoboID',RoboID);
                        resolve(RoboID);
                    }
                    else {
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        }
                        else {
                            isTrue = false;
                            console.log("Error while executing the api");
                            reject(error);
                        }
                    }
                });
            } catch (err) {
                isTrue = false;
                reject(err);
            }
            });
        } while (isTrue);
        return RoboID;
    }

    async startJob(AuthenticationURL, AuthToken, ProcessName, RoboID, ReleaseKey, sessionid, 
        tenantName, BusinessVarientPath, UserSessionId, EYPAFilePath, ReportFilePath)
    {
        console.log('startJob-----');
        let userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;
        let status = 0;
        let JobKey = "";

        do {
        return new Promise(async(resolve, reject) => {
            // BusinessVarientPath = BusinessVarientPath.replace(/\\/g,'/');
            // EYPAFilePath = EYPAFilePath.replace(/\\/g,'/');
            // ReportFilePath = ReportFilePath.replace(/\\/g,'/');
            try {
                let RoboIDs = [];
                RoboIDs.push(RoboID);
                let addQueueInfo = {
                    "BusinessVarientPath" : BusinessVarientPath,
                    "UserSessionId" : UserSessionId,
                    "EYPAFilePath" : EYPAFilePath,
                    "ReportFilePath" : ReportFilePath
                };
                let arry = {};
                arry.argInputs = addQueueInfo;

                let myMod = {
                    "startInfo":{
                        "ReleaseKey": ReleaseKey,
                        "Strategy": "Specific",
                        "RobotIds": RoboIDs,
                        "JobsCount": 0,
                        "NoOfRobots": 0,
                        "Source": "Manual",
                        "InputArguments":JSON.stringify(arry)
                    }
                }
                request({
                    url: AuthenticationURL,
                    method: 'POST',
                    headers:{
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId,
                        "Authorization":"Bearer " + userdetail.AuthToken,
                        "Content-Type":"application/json",
                        "Accept": 'application/json'
                    },
                    json : myMod
                }, async(error, response, body)=>{
                    if(response && (response.statusCode == 200 || response.statusCode == 201)){
                        isTrue = false;
                        let result = response.body;
                        let StartJobJArray = [];
                        StartJobJArray = result["value"];

                        StartJobJArray.forEach(element => {
                            let ProcName = element["ReleaseName"];
                            if (ProcName.includes(ProcessName)) {
                                JobKey = element["Id"];
                                resolve(JobKey);
                                console.log('JobKey',JobKey);
                            }
                        });
                    }
                    else {
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        }
                        else {
                            isTrue = false;
                            console.log("Error while executing the api");
                            reject(error);
                        }
                    }
                });
            } catch (err) {
                isTrue = false;
                console.log(err);
                reject(err);
            }
            });
        } while (isTrue);
        return JobKey;
    }

    async StatusRobot(AuthenticationURL, sessionid, RoboID, JobKey, tenantName) 
    {
        console.log('StatusRobot----');
        let userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;

        let RobotStatus = "";
        let resp = [];
        do {
            return new Promise(async(resolve, reject) => {
            try {
                request({
                    url:AuthenticationURL,
                    method: 'GET',
                    headers:{
                        "cache-control":"no-cache",
                        "Content-Type":"application/json",
                        "Accept": 'application/json',
                        "Authorization": "Bearer " + userdetail.AuthToken,
                        "X-UIPATH-TenantName": tenantName,
                        "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                    }
                }, async(error, response, body) => {
                    if(response && response.statusCode == 200){
                        isTrue = false;
                        let result = JSON.parse(response.body);
                        resp["Status"] = result["State"];
                        resp["Key"] = result["Key"];
                        console.log('resp',resp);
                        resolve(resp);
                    } else {
                        if(response.statusCode == 401) {
                            isTrue = true;
                            await thisLocal.UpdataAuthToken(userdetail);
                        }
                        else {
                            isTrue = false;
                            console.log("Error while executing the api");
                            reject(error);
                        }
                    }
                });
            } catch (err) {
                isTrue = false;
                console.log(err);
                reject(err);
            }
        });
        } while (isTrue);
        return resp;
    }

    async GetJobLogs(AuthenticationURL, sessionid, jobId, Robotname, tenantName)
    {
        console.log('GetJobLogs----');
        let userdetail = await SessionHelper.Get(sessionid);
        userdetail = JSON.parse(userdetail);
        let thisLocal = this;
        let isTrue = true;

        let status = 0;
        let messag = '';
        do {
            return new Promise(async(resolve, reject) => {
                try {
                    AuthenticationURL = AuthenticationURL + "?filter=(JobKey eq " + jobId + "))&$top=1&$orderby=TimeStamp desc";

                    request({
                        url:AuthenticationURL,
                        method: 'GET',
                        headers:{
                            "cache-control":"no-cache",
                            "Content-Type":"application/json",
                            "Accept": 'application/json',
                            "Authorization": "Bearer " + userdetail.AuthToken,
                            "X-UIPATH-TenantName": tenantName,
                            "X-UIPATH-OrganizationUnitId":appSettings.OrganizationUnitId
                        }
                    }, async(error, response, body) => {
                        if(response && response.statusCode == 200){
                            isTrue = false;
                            let result = JSON.parse(response.body);

                            messag = result["value"][0]["Message"] ? result["value"][0]["Message"] : '';
                            resolve(messag);
                        } else {
                            if(response.statusCode == 401) {
                                isTrue = true;
                                await thisLocal.UpdataAuthToken(userdetail);
                            }
                            else {
                                isTrue = false;
                                console.log("Error while executing the api");
                                reject(messag);
                            }
                        }
                    });
                } catch (err) {
                    isTrue = false;
                    console.log(err);
                    reject(messag);
                }
            });
        } while (isTrue);
        return messag;
    }
}

module.exports = Orch_Community_APIClass
