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
const rp = require('request-promise');
var querystring = require('querystring');

methods.javaCall = async (req, res, next) => {
    try {
        let payload = req.body;

        let filePath = payload.headFilePath
        let dataMappingList = payload.dataMappingList
        let tsrinfoinfoList = payload.tsrinfoinfoList
        let eypainfoList = payload.eypainfoList
        let iCodeList = payload.iCodeList

       let hitAPI = await hitJavaApi(filePath,dataMappingList,tsrinfoinfoList,eypainfoList,iCodeList)
        res.json({status:200,message:"Success",data:hitAPI.body});
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

async function hitJavaApi(filePath,dataMappingList,tsrinfoinfoList,eypainfoList,iCodeList){

    let tokenDetails = await getToken()


    

    let options = {
        method: 'POST',
        uri: 'https://autotestingapp.cfapps.eu10.hana.ondemand.com/rest/autotest/api/processqueue',
        timeout: 600000,
        resolveWithFullResponse: true,
        body: {
            headFilePath: filePath,
            dataMappingList:dataMappingList,
            tsrinfoinfoList:tsrinfoinfoList,
            eypainfoList:eypainfoList,
            iCodeList:iCodeList
       },
        headers: {
            //          'content-type': 'application/json',
                      Authorization: 'Bearer '+tokenDetails['access_token']
                  },

        json: true 
    };
    return rp(options);
}


async function getToken() {
    
    let options = {
        method: 'POST',
        uri: 'https://itpdev.authentication.eu10.hana.ondemand.com/oauth/token',
        body: querystring.stringify({
            client_id: 'sb-autotestingapp!t44864',
            client_secret: '+W4IxmkGJUYbMGRhjHNbzGu4Sso=',
            grant_type: 'client_credentials',
            response_type: 'token'
        }),
        headers:
            { 'content-type': 'application/x-www-form-urlencoded' },
        json: true
    };
    return rp(options)
};



module.exports = methods
