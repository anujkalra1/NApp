/** **************************************************************************
*                      AddorUpdateProcessqueue.ctrl.js
* This is the controller for users microservice, which provides
* Add or Update Process queue

**************************************************************************** */

let methods = {};
const child_process = require('child_process');
const path = require('path');
const lo = require('lodash');
const fs = require("fs"); // Or `import fs from "fs";` with ESM
const { execQuery } = require('../utils/connections');
const { dbConfig } = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);
const JobInfoStatus = appConfig.JobInfoStatusSettings;
const ProcessInformation = appConfig.ProcessInformationSettings.ProcessInformation;
const ImportReportProcess = appConfig.ImportReportProcessSettings.ImportReportProcess;

const forkChild = child_process.fork(path.resolve('./controllers/initializeJob.ctrl.js'));

methods.addorUpdateProcessQueues = async (req, res, next) => {
    let payload = req.body;
    if(!payload.Authtoken){
        return res.status(500).json({ Message: 'Authtoken is required', Status: 500 });
    }
    if(!payload.clientname){
        return res.status(500).json({ Message: 'clientname is required', Status: 500 });
    }
    if(!payload.Robotname){
        return res.status(500).json({ Message: 'Robotname is required', Status: 500 });
    }
    if(!payload.EnvironmentName){
        return res.status(500).json({ Message: 'EnvironmentName is required', Status: 500 });
    }
    if(!payload.SessionId){
        return res.status(500).json({ Message: 'SessionId is required', Status: 500 });
    }
    if(lo.isEmpty(payload.Processlist)) {
        return res.status(500).json({ Message: 'Processlist is required', Status: 500 });
    }
    try {
        let Authtoken = payload.Authtoken;
        let clientname = payload.clientname;
        let Robotname = payload.Robotname;
        let EnvironmentName = payload.EnvironmentName;
        let SessionId = payload.SessionId;
        let Processlistdata = payload.Processlist;

        let deleteProcessQueueItem = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_deleteProcessQueuebyId"(
            IV_SESSIONID => '${SessionId}')
        `);
        let deleteHeaderandLineItem = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_deleteHeaderLineItemsbyId"(
            IV_SESSIONID => '${SessionId}')
        `);

        var tableName = "#temp_processlist_"+Math.floor(new Date() / 1000);
        let query1 = 'create local temporary table '+tableName+' ("VariantName" nvarchar(200),"CaseIds" nvarchar(500),"businessprocess" nvarchar(2000))';
        let createTable = await execQuery(query1);

        Processlistdata.forEach(async element => {
            await execQuery(`insert into ${tableName} values('${element["VariantName"]}','${element["CaseIds"]}','${element["businessprocess"]}')`);
        });

        let addProcessQueue = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_AddProcessQueues"(
            IV_SESSIONID => '${SessionId}',
            IT_VARIANTLIST => ${tableName},
            IV_PROCESSINFO => '${ProcessInformation}',
            IV_ROBOT_NAME => '${Robotname}',
            IV_IMPORTREPORT_PERC => 0)
        `);

        let dropTable = await execQuery(`drop TABLE ${tableName}`);

        // let dir = appSettings.AutoUiFilePath + "\\" + SessionId;
        let dir = appSettings.HeadFilePath + "\\" + SessionId;
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        /*let filePath = dir + "\\Variant.csv";
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }*/
        // let appPath = HttpContext.Current.Request.ApplicationPath + "//UploadFiles";
        // let PhysicalPath = HttpContext.Current.Request.MapPath(appPath);
        // let SourcecodePath = HttpContext.Current.Server.MapPath("~/UploadFile/ITC_WrapperCode.txt");

        // let PhysicalPath = appSettings.sharedFolderPath;

        let PhysicalPath = dir;
        let SourcecodePath = PhysicalPath + '\\UploadFile\\ITC_WrapperCode.txt';

        let Processinfo = {
            AuthToken : Authtoken,
            Clientname : clientname,
            SessionId : SessionId,
            PhysicalPath : PhysicalPath,
            SourcecodePath : SourcecodePath,
            EnvironmentName : EnvironmentName
        };

        forkChild.send(Processinfo);

        res.json({Status:200,Message:"Success",Result:true});

        // forkChild.send(Processinfo, response => {
        //     console.log(response);
        // });
        // forkChild.on('message', processobj => {
        //     console.log('message from child:', processobj);
        //     //InitializeJob(processobj);
        //     // process.exit();
        // });
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

module.exports = methods