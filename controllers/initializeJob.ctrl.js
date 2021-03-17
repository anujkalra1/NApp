/** **************************************************************************
*                      users.ctrl.js
* This is the controller for users microservice, which provides
* Create and get and Update the users

**************************************************************************** */

const request = require('request');
const xlsx = require("node-xlsx");
const Excel = require("exceljs");
const child_process = require('child_process');
// const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const os = require('os');
const lo = require('lodash');
const fs = require("fs");
const { dbConfig } = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);
const { execQuery } = require(`../utils/connections`);
const JobInfoStatus = appConfig.JobInfoStatusSettings;
const ProcessInformation = appConfig.ProcessInformationSettings.ProcessInformation;
const ImportReportProcess = appConfig.ImportReportProcessSettings.ImportReportProcess;
const TypeOfFIle = appConfig.TypeOfFIle;

// const forkVariantStatusThread = child_process.fork(path.resolve('./controllers/getVariantStatusThread.ctrl.js'));
// const forkProcessStatusThread = child_process.fork(path.resolve('./controllers/getProcessStatusThread.ctrl.js'));

//process.send("Hello");
// process.on('message', processobj => {
//     process.send(processobj);
// });

process.on('message', processobj => {
    try {
        InitializeJob(processobj);
    } catch (err) {
        console.log(err);
    }
});

async function InitializeJob(processobj)
{
    if (processobj != null)
    {
        let authtoken = processobj.AuthToken;
        let sessionid = processobj.SessionId;
        let clientname = processobj.Clientname;
        let data = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_selectProcessQueuebyId"(
            IV_SESSIONID => '${sessionid}')
        `);

        let variantnamelist = '';
        data.forEach(element => {
            if(element.Type == 'Variant') {
                variantnamelist += element.ProcessName + ',';
            }
        });
        variantnamelist = variantnamelist.replace(/,\s*$/, "");

        let subsetdata = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_getEYPASubsets"(
            IV_BUSINESSVARIANTNAME => '${variantnamelist}',
            IV_CASECATEGORY => 'Valid',
            IV_CLIENTNAME => '${clientname}')
        `);

        if(data) {
            for(let i=0; i < data.length; i++) {
                let item = data[i];
                await trySwitch(item,processobj,subsetdata);
            }
        }
    }
}

async function trySwitch(item,processobj,subsetdata) {
    console.log(item.ProcessName);
    switch (await item.Type) {
        case "Variant":
            let variantStatus = await GetVariantStatusThread(item.ProcessName,processobj.AuthToken,processobj.SessionId);
        break;

        case "ImportReport":
            let ImportReportstatus = await ImportReportInformation(processobj);
        break;

        default:
            let processbyNameandVariantstatus = await GetprocessbyNameandVariant(item.ProcessName, item.Type, processobj.SessionId);
            try {
                if (processbyNameandVariantstatus[0] && processbyNameandVariantstatus[0].Status != JobInfoStatus.Faulted)
                {
                    let JobInfo = {
                        Processname : item.ProcessName,
                        AuthToken : processobj.AuthToken,
                        RobotID : item.RobotId,
                        Robotname : item.RobotName,
                        JobKey : item.Jobkey,
                        VariantName : item.Type,
                        SessionId : processobj.SessionId,
                        Businessname : item.BusinessProcess,
                        subsetInfo : subsetdata,
                        Clientname : processobj.Clientname,
                        PhysicalPath : processobj.PhysicalPath,
                        CaseId : item.Case_Id,
                        SourcecodePath : processobj.SourcecodePath,
                        EnvironmentName : processobj.EnvironmentName
                    };
                    let jobProcessStatus = await GetProcessStatusThread(JobInfo);
                }
            } catch (err) {
                console.log(err);
                await UpdateProcessByVariant(item.Type, JobInfoStatus.Faulted, processobj.SessionId);
            }
        break;
    }
}

async function GetprocessbyNameandVariant(ProcessName,type,sessionid) {
    console.log('---2---');
    return new Promise(async(resolve,reject) => {
        try {            
            let processbyNameandVariant = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_GetprocessbyNameandVariant"(
                IV_PROCESS => '${ProcessName}',
                IV_TYPE => '${type}',
                IV_SESSIONID => '${sessionid}')
            `);
            resolve(processbyNameandVariant);
        }
        catch (err) {
            reject(err);
        }
    });
}

//---------------------------Begin GetVariantStatusThread-------------------------------------

async function GetVariantStatusThread(VariantName,authtoken,sessionId) {
    console.log('---1---');
    return new Promise(async(resolve,reject) => {
        try {
            let status = JobInfoStatus.Start;
            let UpdateVariantStatus = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_UpdateVariantStatus"(
                IV_SESSIONID => '${sessionId}',
                IV_STATUS => '${status}',
                IV_PROCESSNAME => '${VariantName}')
            `);
            resolve(UpdateVariantStatus);
        }
        catch (err) {
            reject(err);
        }
    });
}

//---------------------------END GetVariantStatusThread--------------------------------------

//---------------------------Begin GetProcessStatusThread------------------------------------

async function GetProcessStatusThread(job)
{
    return new Promise(async(resolve,reject) => {
    try {
        if (job.Processname == "RunVariance") {
            console.log('---3---');
            job.Status = JobInfoStatus.InProgress;
            await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId, "Generate EYPA Subset File Inprogress");

            let rvJobInfo = {
                VariantName : job.VariantName,
                Businessname : job.Businessname,
                Clientname : job.Clientname,
                SessionId : job.SessionId,
                subsetInfo : job.subsetInfo,
                PhysicalPath : job.PhysicalPath,
                CaseId : job.CaseId,
                Processname: job.Processname
            };
            // forkupdateRunVariance.send(rvJobInfo);
            await UpdateRunVariance(rvJobInfo);
            job.Status = JobInfoStatus.Successful;
            await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId, "Generate EYPA Subset File Completed");
            resolve(true);
        }
        else if (job.Processname == "CSV_Creation") {
            console.log('---7---');
            job.Status = JobInfoStatus.InProgress;
            await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId, "Generate Header/line items Files Inprogress");

            if(job.subsetInfo.length > 0) {
                let filterdData = [];
                let caseidstr = job.CaseId;
                let caseIdArr = caseidstr.split('|');

                caseIdArr.forEach(caseid => {
                    job.subsetInfo.filter(function(subinfo) {
                        if(subinfo.BUSINESS_VARIANT_NAME == job.VariantName && subinfo.CASE_ID == caseid) {
                            filterdData.push(subinfo);
                        }
                    });
                });
                // console.log(filterdData);

                job.subsetInfo = filterdData;
                let newJobInfo = {
                    VariantName : job.VariantName,
                    Businessname : job.Businessname,
                    Clientname : job.Clientname,
                    SessionId : job.SessionId,
                    subsetInfo : filterdData,
                    PhysicalPath : job.PhysicalPath,
                    SourcecodePath : job.SourcecodePath,
                    Processname: job.Processname
                };
                // forkStatusThread.send(newJobInfo);
                await GetStatusThread(newJobInfo);
                resolve(true);
            }
            // resolve(true);
        }
        else if (job.Processname == "AutoUI_Execution") {
            console.log('AutoUI_Execution STARTS');
            if (appSettings.UiDemo == "1")
            {
                await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, "Running", job.SessionId, "Auto_UI Execution started", 1);
                
                let newjobInfo = {
                    VariantName : job.VariantName,
                    SessionId : job.SessionId,
                    Processname: job.Processname,
                    AuthToken : job.AuthToken,
                    RobotID : job.RobotID,
                    Robotname : job.Robotname,
                    JobKey : job.JobKey
                };                
                // forkProcessStatusCheckThread.send(newjobInfo);
            }
            else {
                console.log('---16---');
                let releasekey = '';
                let RobotId = '';
                let jobkey = '';
                let infor = await GetProcessInformationdetail(job.SessionId);
                infor = infor[0];

                let tenantName = appSettings.tenantName;
                if (appSettings.CommunityEnvironment == "Community") {
                    let CommunityUrl = appSettings.CommunityUrl;
                    let oapi = new Orch_Community_APIClass();

                    // releasekey = await oapi.GetReleaseKey(CommunityUrl + "/odata/Releases", job.SessionId, job.Processname, tenantName, job.EnvironmentName);
                    releasekey = await oapi.GetReleaseKey(CommunityUrl + "/odata/Releases", job.SessionId, job.Processname, tenantName, job.EnvironmentName);

                    if (releasekey != '')
                    {
                        RobotId = await oapi.GetRobotID(CommunityUrl + "/odata/Robots", job.SessionId, job.Robotname, tenantName);
                        if (RobotId != '')
                        {
                            job.RobotID = RobotId;
                            jobkey = await oapi.startJob(CommunityUrl + "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs", job.AuthToken,
                            job.Processname, RobotId, releasekey, job.SessionId, tenantName, infor.FolderPath, infor.SessionId, infor.EYPAFilePath, infor.ReportFilePath);

                            job.JobKey = jobkey;
                            job.Status = "Start";
                            await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId);

                            let newjobInfo2 = {
                                VariantName : job.VariantName,
                                SessionId : job.SessionId,
                                Processname : job.Processname,
                                AuthToken : job.AuthToken,
                                RobotID : job.RobotID,
                                Robotname : job.Robotname,
                                JobKey : job.JobKey
                            };                
                            // forkProcessStatusCheckThread.send(newjobInfo);
                            await GetProcessStatusCheckThread(newjobInfo2);
                            resolve(true);
                        }
                    }
                }
                else {
                    let BaseUrl = appSettings.AuthenticationURL;
                    let oapi = new Orch_APIClass();
                    releasekey = await oapi.GetReleaseKey(BaseUrl + "/odata/Releases", job.SessionId, job.Processname, job.EnvironmentName);

                    if (releasekey != '')
                    {
                        RobotId = await oapi.GetRobotID(BaseUrl + "/odata/Robots", job.SessionId, job.Robotname);
                        if (RobotId != '')
                        {
                            job.RobotID = RobotId;
                            jobkey = await oapi.startJob(BaseUrl + "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs", job.AuthToken,
                            job.Processname, RobotId, releasekey, infor.FolderPath, infor.SessionId, infor.EYPAFIlePath, infor.ReportFilePath);

                            job.JobKey = jobkey;
                            job.Status = "Start";
                            await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId);

                            let newjobInfo = {
                                VariantName : job.VariantName,
                                SessionId : job.SessionId,
                                Processname : job.Processname,
                                AuthToken : job.AuthToken,
                                RobotID : job.RobotID,
                                Robotname : job.Robotname,
                                JobKey : job.JobKey
                            };                
                            // forkProcessStatusCheckThread.send(newjobInfo);
                            await GetProcessStatusCheckThread(newjobInfo);
                            resolve(true);
                        }
                    }
                }
            }
            // resolve(true);
        }
        else {
            console.log('---14---');
            let releasekey = '';
            let RobotId = '';
            let jobkey = '';
            let infor = await GetProcessInformationdetail(job.SessionId);
            infor = infor[0];

            let tenantName = appSettings.tenantName;
            if (appSettings.CommunityEnvironment == "Community") {
                let CommunityUrl = appSettings.CommunityUrl;
                let oapi = new Orch_Community_APIClass();

                // releasekey = await oapi.GetReleaseKey(CommunityUrl + "/odata/Releases", job.SessionId, job.Processname, tenantName, job.EnvironmentName);
                releasekey = await oapi.GetReleaseKey(CommunityUrl + "/odata/Releases", job.SessionId, job.Processname, tenantName, job.EnvironmentName);

                if (releasekey != '')
                {
                    RobotId = await oapi.GetRobotID(CommunityUrl + "/odata/Robots", job.SessionId, job.Robotname, tenantName);
                    if (RobotId != '')
                    {
                        job.RobotID = RobotId;
                        jobkey = await oapi.startJob(CommunityUrl + "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs", job.AuthToken,
                        job.Processname, RobotId, releasekey, job.SessionId, tenantName, infor.FolderPath, infor.SessionId, infor.EYPAFilePath, infor.ReportFilePath);

                        job.JobKey = jobkey;
                        job.Status = "Start";
                        await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId);

                        let newjobInfo2 = {
                            VariantName : job.VariantName,
                            SessionId : job.SessionId,
                            Processname : job.Processname,
                            AuthToken : job.AuthToken,
                            RobotID : job.RobotID,
                            Robotname : job.Robotname,
                            JobKey : job.JobKey
                        };
                        await GetProcessStatusCheckThread(newjobInfo2);
                        console.log('RPA PROCESS COMPLETED');
                        resolve(true);
                    }
                }
            }
            else {
                let BaseUrl = appSettings.AuthenticationURL;
                let oapi = new Orch_APIClass();
                releasekey = await oapi.GetReleaseKey(BaseUrl + "/odata/Releases", job.SessionId, job.Processname, job.EnvironmentName);

                if (releasekey != '')
                {
                    RobotId = await oapi.GetRobotID(BaseUrl + "/odata/Robots", job.SessionId, job.Robotname);
                    if (RobotId != '')
                    {
                        job.RobotID = RobotId;
                        jobkey = await oapi.startJob(BaseUrl + "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs", job.AuthToken,
                        job.Processname, RobotId, releasekey, infor.FolderPath, infor.SessionId, infor.EYPAFIlePath, infor.ReportFilePath);

                        job.JobKey = jobkey;
                        job.Status = "Start";
                        await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId);

                        let newjobInfo = {
                            VariantName : job.VariantName,
                            SessionId : job.SessionId,
                            Processname : job.Processname,
                            AuthToken : job.AuthToken,
                            RobotID : job.RobotID,
                            Robotname : job.Robotname,
                            JobKey : job.JobKey
                        };
                        await GetProcessStatusCheckThread(newjobInfo);
                        resolve(true);
                    }
                }
            }
        }
        // resolve(true);
    }
    catch (err) {
        console.log(err);
        job.Status = JobInfoStatus.Faulted;
        await UpdateProcessByVariant(job.VariantName, job.Status, job.SessionId);
    }
    });
}

async function UpdateProcessbyVariantandprocessname(ProcessName, variantname, status, sessionid, LogMessage = "", percentage = 0) 
{
    if(LogMessage && LogMessage != "") {
        LogMessage = LogMessage.replace(/['"]+/g, '');
    }
    return new Promise(async(resolve,reject) => {
    try {
    let updateProcessbyVariantandprocessname = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_UpdateProcessbyVariantandprocessname"(
        IV_PROCESSNAME => '${ProcessName}',
        IV_TYPE => '${variantname}',
        IV_SESSIONID => '${sessionid}',
        IV_STATUS => '${status}',
        IV_LOGMESS => '${LogMessage}',
        IV_PERCEN => ${percentage})
    `);
    console.log(LogMessage,'--------',updateProcessbyVariantandprocessname);
    resolve(updateProcessbyVariantandprocessname);
    } catch (err) {
        console.log(err);
        reject(err);
    }
    });
}

async function UpdateProcessByVariant(Variantname, status, sessionid) 
{
    return new Promise(async(resolve,reject) => {
    try {
    let updateProcessByVariant = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_UpdateProcessByVariant"(
        IV_SESSIONID => '${sessionid}',
        IV_VARIANTNAME => '${Variantname}',
        IV_STATUS => '${status}',
        EV_F_RECORD_NOT_FOUND => ?)
    `);
    console.log('--UpdateProcessByVariant--',updateProcessByVariant);
    resolve(updateProcessByVariant);
    } catch (err) {
        console.log(err);
        reject(err);
    }
    });
}

async function GetProcessInformationdetail(sessionid)
{
    console.log('---15---');
    return new Promise(async(resolve,reject) => {
    let getProcessInformation = '';
    try {
        getProcessInformation = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_getProcessInformationDetail"(
            IV_SESSIONID => '${sessionid}')
        `);
        resolve(getProcessInformation);
    }
    catch(err) {
        console.log(err);
        reject(err);
    }
    resolve(getProcessInformation);
    });
}

//------------------------------updateRunVarianceProcess-------------------------------------

async function UpdateRunVariance(job)
{
    console.log('---4---');
    return new Promise(async(resolve,reject) => {
    try {
        let dir = appSettings.HeadFilePath + "\\" + job.SessionId;
        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        /*let filePath = dir + "\\Variant.csv";
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }*/

        if (job.subsetInfo.length > 0) {
            let filterdData = [];
            let caseidstr = job.CaseId;
            let caseIdArr = caseidstr.split('|');

            caseIdArr.forEach(caseid => {
                job.subsetInfo.filter(function(subinfo) {
                    if(subinfo.BUSINESS_VARIANT_NAME == job.VariantName && subinfo.CASE_ID == caseid) {
                        filterdData.push(subinfo);
                    }
                });
            });

            job.subsetInfo = filterdData;
            let FilePath = '';

            if (job.subsetInfo.length > 0)
            {
                let businessVariant = job.subsetInfo[0].BUSINESS_VARIANT;
                if (businessVariant)
                {
                    FilePath = dir + "\\" + businessVariant + "_EypaSubsetFile.csv";
                    FilePath = await GenerateEypaSubsetFile(FilePath, job.subsetInfo);
                    await UpdateFilePath(job.SessionId, FilePath, TypeOfFIle.Subset);
                    resolve(true);
                }
            }
            else {
                console.log('No matching Subset Info !!!');
                reject("No matching Subset Info !!!");
            }
        }
        else {
            console.log('No Subset Info !!!');
            reject("No Subset Info !!!");
        }
        // job.Status = JobInfoStatus.Successful;
        // await UpdateProcessbyVariantandprocessname(job.Processname, job.VariantName, job.Status, job.SessionId, "Generate EYPA Subset File Completed");
        // resolve(true);
    } catch (err) {
        console.log(err);
        await UpdateProcessByVariant(job.VariantName, JobInfoStatus.Faulted, job.SessionId);
        reject(err);
    }
    });
}

async function GenerateEypaSubsetFile(Filepath, values)
{
    console.log('---5---');
    return new Promise(async(resolve,reject) => {
    let output = [];
    let head = ["BUSINESS_SCENARIO","CASE_KEY_VALUE","CASE_ID","BUSINESS_VARIANT_ID",
    "BUSINESS_VARIANT_NAME","BUSINESS_VARIANT","BUSINESS_VARIANT_DESCRIPTION","EVENT_TYPE",
    "EVENT_TYPE_DESCRIPTION","VARIANT_STEPS","VARIANT_STEP_ORDER","DOCUMENT_TABLE","DOCUMENT_FIELD",
    "DOC_HEADER_VALUE","DOC_ITEM_VALUE","USER_TABLE","USER_FIELD","USER_FIELD_VALUE","OTHER_TABLES",
    "REMAINING_FIELDS","REM_FIELD_VALUES","PRECEEDING_DOC","PRECEEDING_LINE_ITEM",
    "PRECEEDING_EVENT_TYPE","PRECEEDING_TCODE","PRECEEDING_EVENT_DESC","CASE_CATEGORY",
    "CASE_SUBCATEGORY","UPDATE","UPDATE_FIELDS","UPDATE_FIELD_VALUES"];

    try {
    output.push(head);
    values.forEach(item => {
        let row = [];
        row.push(item.BUSINESS_SCENARIO);
        row.push(item.CASE_KEY_VALUE);
        row.push(item.CASE_ID);
        row.push(item.BUSINESS_VARIANT_ID);
        row.push(item.BUSINESS_VARIANT_NAME);
        row.push(item.BUSINESS_VARIANT);
        row.push(item.BUSINESS_VARIANT_DESCRIPTION);
        row.push(item.EVENT_TYPE);
        row.push(item.EVENT_TYPE_DESCRIPTION);
        row.push(item.VARIANT_STEPS);
        row.push(item.VARIANT_STEP_ORDER);
        row.push(item.DOCUMENT_TABLE);
        row.push(item.DOCUMENT_FIELD);
        row.push(item.DOC_HEADER_VALUE);
        row.push(item.DOC_ITEM_VALUE);
        row.push(item.USER_TABLE);
        row.push(item.USER_FIELD);
        row.push(item.USER_FIELD_VALUE);
        row.push(item.OTHER_TABLES);
        row.push(item.REMAINING_FIELDS);
        row.push(item.REM_FIELD_VALUES);
        row.push(item.PRECEEDING_DOC);
        row.push(item.PRECEEDING_LINE_ITEM);
        row.push(item.PRECEEDING_EVENT_TYPE);
        row.push(item.PRECEEDING_TCODE);
        row.push(item.PRECEEDING_EVENT_DESC);
        row.push(item.CASE_CATEGORY);
        row.push(item.CASE_SUBCATEGORY);
        row.push(item.UPDATE);
        row.push(item.UPDATE_FIELDS);
        row.push(item.UPDATE_FIELD_VALUES);

        output.push(row.join());
    });
    fs.writeFileSync(Filepath, output.join(os.EOL));
    resolve(Filepath);
    } catch(err) {
        console.log(err);
        reject(err);
    }
    resolve(Filepath);
    });
}

async function UpdateFilePath(sessionId, FilePath, Type)
{
    console.log('---6---');
    return new Promise(async(resolve,reject) => {
    try {
    let UpdateFilePathproc = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_updateFilePathbyType"(
        IV_SESSIONID => '${sessionId}',
        IV_FILEPATH => '${FilePath}',
        IV_TYPE => ${Type})
    `);
    console.log('--rv-UpdateFilePathproc--',UpdateFilePathproc);
    resolve(true);
    } catch (err) {
        console.log(err);
        reject(err);
    }
    });
}

//-------------------------------END updateRunVarianceProcess---------------------------------

//-------------------------------BEGIN GetStatusThread----------------------------------------

async function GetStatusThread(job)
{
    console.log('---8---');
    return new Promise(async(resolve,reject) => {
        try {
            let stat = await CheckWrapper(job.VariantName, job.Businessname, job.Clientname, job.SessionId, job.subsetInfo, job.PhysicalPath, job.SourcecodePath, job.Processname);
            resolve(stat);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function CheckWrapper(Variants, businessname, clientName, sessionid, subsetdata, Physicalpath, SourceCodeFilePath, Processname)
{
    console.log('---9---');
    return new Promise(async(resolve,reject) => {
    try {
        if (subsetdata.length > 0)
        {
            let variantsArr = Variants.split(',');
            variantsArr.forEach(async varnt => {
                let Tcodes = [];
                let eysubset = [];
                subsetdata.filter(function(subinfo) {
                    if(subinfo.BUSINESS_VARIANT_NAME == varnt) {
                        //if(!Tcodes[subinfo.VARIANT_STEPS]) {
                            Tcodes.push(subinfo.VARIANT_STEPS);
                            eysubset.push(subinfo);
                        //}
                    }
                });
                Tcodes = Tcodes.filter(onlyUnique);
                let Tcodes_str = Tcodes.join();

                if (Tcodes.length > 0) {
                    let datamappinginfo = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_GetDataMappingInfo"(
                        IV_TCODES => '${Tcodes_str}')
                    `);

                    if(datamappinginfo.length > 0) {
                        let TsrInfo = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_GetTSRINFO"(
                            IV_TCODES => '${Tcodes_str}')
                        `);

                        if(TsrInfo.length > 0) {
                            if (eysubset.length > 0)
                            {
                                let HeadFilePath = appSettings.HeadFilePath;
                                let SAPMachine = appSettings.SAPMachine;
                                let WrapperName = appSettings.EYPAWrapper;
                                // HeadFilePath = HeadFilePath + "\\" + sessionid;
                                // LogHelper.LogMessage(LogHelper.TracingLevel.INFO, "before TriggerWrapper");

                                let response = await TriggerWrapper(SAPMachine, WrapperName, HeadFilePath, 
                                    Variants, businessname, clientName, eysubset,Tcodes, datamappinginfo, 
                                    TsrInfo, SourceCodeFilePath);

                                if (response != null)
                                {
                                    let keys = Object.keys(response);
                                    let varient_folder = keys[0];
                                    response = response[varient_folder];
                                    if (response.length > 0)
                                    {
                                    response.shift();
                                    let respstr = response.join("\n");

                                    await GenerateFiles(varient_folder, respstr, sessionid, Physicalpath);
                                    await UpdateProcessbyVariantandprocessname(Processname, Variants, JobInfoStatus.Successful, sessionid, "Generate Header/line items Files Completed");
                                    resolve(true);
                                    // if(GenerateFiles(varient_folder, respstr, sessionid, Physicalpath)) {
                                    //     await UpdateProcessbyVariantandprocessname(Processname, Variants, JobInfoStatus.Successful, sessionid, "Generate Header/line items Files Completed");
                                    //     resolve(true);
                                    // }
                                    // else {
                                    //     reject(false);
                                    // }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    catch (err) {
        await UpdateProcessByVariant(Variants, JobInfoStatus.Faulted, sessionid);
        reject(err);
    }
    });
}

async function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

async function TriggerWrapper(SAPMachine, WrapperName, HeadFilePath, Variants, businessname, 
    businessclientName, SubsetData, Tcodes, Mapinfo, Tsrinfo, SourceCodeFilePath)
{
    console.log('---10---');
    return new Promise(async(resolve, reject)=>{ 
    let responseData = '';
    try {
        let eypainfo = [];
        let liststring = '';
        if (SubsetData.length > 0) {
            SubsetData.forEach(item => {
                liststring = (item.BUSINESS_SCENARIO != null && item.BUSINESS_SCENARIO!='NULL' ? item.BUSINESS_SCENARIO : "")
                + "@#" + (item.CASE_ID != null && item.CASE_ID!='NULL' ? item.CASE_ID : "")
                + "@#" + (item.BUSINESS_VARIANT != null && item.BUSINESS_VARIANT!='NULL' ? item.BUSINESS_VARIANT : "")
                + "@#" + (item.BUSINESS_VARIANT_NAME != null && item.BUSINESS_VARIANT_NAME!='NULL' ? item.BUSINESS_VARIANT_NAME : "")
                + "@#" + (item.BUSINESS_VARIANT_DESCRIPTION != null && item.BUSINESS_VARIANT_DESCRIPTION!='NULL' ? item.BUSINESS_VARIANT_DESCRIPTION : "")
                + "@#" + (item.VARIANT_STEPS != null && item.VARIANT_STEPS!='NULL' ? item.VARIANT_STEPS : "")
                + "@#" + (item.VARIANT_STEP_ORDER != null && item.VARIANT_STEP_ORDER!='NULL' ? item.VARIANT_STEP_ORDER : "")
                + "@#" + (item.DOCUMENT_TABLE != null && item.DOCUMENT_TABLE!='NULL' ? item.DOCUMENT_TABLE : "")
                + "@#" + (item.DOCUMENT_FIELD != null && item.DOCUMENT_FIELD!='NULL' ? item.DOCUMENT_FIELD : "")
                + "@#" + (item.DOC_HEADER_VALUE != null && item.DOC_HEADER_VALUE!='NULL' ? item.DOC_HEADER_VALUE : "")
                + "@#" + (item.DOC_ITEM_VALUE != null && item.DOC_ITEM_VALUE!='NULL' ? item.DOC_ITEM_VALUE : "")
                + "@#" + (item.USER_TABLE != null && item.USER_TABLE!='NULL' ? item.USER_TABLE : "")
                + "@#" + (item.USER_FIELD != null && item.USER_FIELD!='NULL' ? item.USER_FIELD : "")
                + "@#" + (item.USER_FIELD_VALUE != null && item.USER_FIELD_VALUE!='NULL' ? item.USER_FIELD_VALUE : "")
                + "@#" + (item.PRECEEDING_DOC != null && item.PRECEEDING_DOC!='NULL' ? item.PRECEEDING_DOC : "")
                + "@#" + (item.PRECEEDING_TCODE != null && item.PRECEEDING_TCODE!='NULL' ? item.PRECEEDING_TCODE : "")
                + "@#" + (item.CASE_CATEGORY != null && item.CASE_CATEGORY!='NULL' ? item.CASE_CATEGORY : "")
                + "@#" + (item.UPDATE != null && item.UPDATE!='NULL' ? item.UPDATE : "")
                + "@#" + (item.UPDATE_FIELDS != null && item.UPDATE_FIELDS!='NULL' ? item.UPDATE_FIELDS : "")
                + "@#" + (item.UPDATE_FIELD_VALUES != null && item.UPDATE_FIELD_VALUES!='NULL' ? item.UPDATE_FIELD_VALUES : "");
                eypainfo.push(liststring);
            });
        }

        let Datainfo = [];
        let Datainfostr = '';
        if (Mapinfo.length > 0) {
            Mapinfo.forEach(item => {
                Datainfostr = item.Tcode
                + "@#" + (item.differentiating_fields!=null && item.differentiating_fields!='NULL' ? item.differentiating_fields:"")
                + "@#" + (item.Tables!=null && item.Tables!='NULL' ?item.Tables:"")
                + "@#" + (item.Joining_conditions!=null && item.Joining_conditions!='NULL' ? item.Joining_conditions:"")
                + "@#" + (item.Comment!=null && item.Comment!='NULL' ? item.Comment:"")
                + "@#" + (item.Master_Data!=null && item.Master_Data!='NULL' ? item.Master_Data:"")
                + "@#" + (item.Transaction_Data!=null && item.Transaction_Data!='NULL' ? item.Transaction_Data:"")
                + "@#" + (item.System!=null && item.System!='NULL' ? item.System: "")
                + "@#" + (item.Additional_Comments!=null && item.Additional_Comments!='NULL' ? item.Additional_Comments:"")
                + "@#" + (item.Status!=null && item.Status!='NULL' ? item.Status:"");
                Datainfo.push(Datainfostr);
            });
        }

        let Tsrinfoinfo = [];
        let Tsrinfoinfostr = '';
        if (Tsrinfo.length > 0) {
            Tsrinfo.forEach(item => {
                Tsrinfoinfostr = item.SAPTransactionCode
                + "@#" + (item.SAPTransactionTableScreenName!=null && item.SAPTransactionTableScreenName!='NULL' ? item.SAPTransactionTableScreenName:"")
                + "@#" + (item.SAPTransactionFieldType!=null && item.SAPTransactionFieldType!='NULL' ? item.SAPTransactionFieldType:"")
                + "@#" + (item.SAPTableName!=null && item.SAPTableName!='NULL' ? item.SAPTableName:"")
                + "@#" + (item.SAPColumnName!=null && item.SAPColumnName!='NULL' ? item.SAPColumnName:"")
                + "@#" + (item.TSR_Screen_Field!=null && item.TSR_Screen_Field!='NULL' ? item.TSR_Screen_Field:"")
                + "@#" + (item.Direction!=null && item.Direction!='NULL' ? item.Direction:"");
                Tsrinfoinfo.push(Tsrinfoinfostr);
            });
        }
        request({
            rejectUnauthorized: false,
            url:"http://localhost:8081/javaCall",
            method: 'POST',
            headers:{
                "cache-control":"no-cache",
                "Content-Type":"application/json",
                "Accept": 'application/json'
            },
            body: {
                headFilePath: HeadFilePath,
                dataMappingList:Datainfo,
                tsrinfoinfoList:Tsrinfoinfo,
                eypainfoList:eypainfo,
                iCodeList:Tcodes
           },
           json: true
        }, async(error, response, body) => {
            if(response && response.statusCode == 200){
                console.log('RFCresponse---',response.body);
                responseData = response.body.data;
                resolve(responseData);
            } else {
                reject(error);
            }
        });
    }
    catch (err) {
        reject(err);
    }
    });
}

async function GenerateFiles(variantfolder, data, usersessionId, physicalPath) {
    console.log('---11---');
    return new Promise(async(resolve, reject)=>{
    try {
        let ReportPath = '';
        let HeadFilePath = appSettings.HeadFilePath;
        // let sharedFolderPath = appSettings.sharedFolderPath;
        // physicalPath = HeadFilePath + "\\" + usersessionId;
        // let sessionId = Guid.NewGuid();
        // physicalPath = physicalPath + "\\" + sessionId;
        variantfolder = variantfolder.replace(HeadFilePath, physicalPath);

        let Items = [];
        if (data != null)
        {
            let lines = data.split("|||||||||||||||||||");
            if(lines.length > 0) {
                lines.forEach(async itm => {
                    let list = [];
                    let details = itm.split("\n");
                    if(details.length > 0) {
                        details.forEach(async it => {
                            if(it != "") {
                                await list.push(it);
                            }
                        });
                        await Items.push(list);
                    }
                });
            }
        }
        if (Items != null && Items.length > 0)
        {
            Items.forEach(async files => {
                let Filename = '';
                let columns = '';
                let count = 0;
                let fileActualPath = '';
                let Dtarows = [];
                files.forEach(file => {
                    if (count == 0)
                    {
                        Filename = file.replace("File:\\", '');
                        Filename = Filename.replace("File:", '');
                        fileActualPath = Filename;
                        Filename = Filename.replace(HeadFilePath, physicalPath);
                    }
                    else if (count == 1) {
                        columns = file;
                    }
                    else {
                        Dtarows.push(file);
                    }
                    count = count + 1;
                });

                Filename = Filename.replace(physicalPath, '');
                let filepath = '';
                let extension = Filename.split('.').pop();

                if (extension == "xls" || extension == "xlsx")
                {
                    if (extension == ".xls")
                    {
                        Filename = Filename.replace("xls", "xlsx");
                        fileActualPath = fileActualPath.replace("xls", "xlsx");
                    }
                    filepath = await ExportDataSetToExcel(columns, Dtarows, Filename, physicalPath);
                }
                else {
                    filepath = await GenerateHeaderFile(columns, Dtarows, Filename, physicalPath);
                }
                let ReportPath = '';
                if(filepath.includes("Report")) {
                    ReportPath = filepath;
                    let AddHeaderItems = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_AddHeaderItems"(
                        IV_SESSIONID => '${usersessionId}',
                        IV_FILEPATH => '${variantfolder}',
                        IV_REPORTFILEPATH => '${ReportPath}')
                    `);
                    console.log('------------------7------------');
                    // resolve(true);
                }
                // resolve(true);
            });
            resolve(true);
        }
        else {
            reject("No data returned from RFC to create files !!!");
        }
    }
    catch (err) {
        console.log(err);
        reject(err);
    }
    });
}

async function ExportDataSetToExcel_bkup(columns, infor, FilePath, physicalPath)
{
    console.log('---13---');
    return new Promise(async(resolve, reject)=>{
    try {
    FilePath = physicalPath + FilePath;
    
    let mainrow = [];
    var columnlist = columns.split('@#');
    mainrow.push(columnlist);

    let dir = '';
    var filename = FilePath.replace(/^.*[\\\/]/, '');
    let filenamesplit = filename.split('.');
    let fname = filenamesplit[0];
    dir = FilePath.replace(filename, '');

    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let roarr = [];
    infor.forEach(roelm => {
        roarr = roelm.split('@#');
        mainrow.push(roarr);
    });

    let buffer = xlsx.build([{ name: fname, data: mainrow }]);
    // await fs.writeFile(FilePath, buffer, (err) => {
    //     resolve(FilePath);
    // });
    await fs.writeFileSync(FilePath, buffer);
    resolve(FilePath);
    }
    catch (err) {
        reject(err);
    }
    resolve(FilePath);
    });
}

async function GenerateHeaderFile(columns, infor, FilePath, physicalPath) 
{
    console.log('---12---');
    return new Promise(async(resolve, reject)=>{
        try {
            FilePath = physicalPath + FilePath;
            let mainrow = [];
            let headcolumn = columns.split('@#');
            mainrow.push(headcolumn);

            let dir = '';
            var filename = FilePath.replace(/^.*[\\\/]/, '');
            dir = FilePath.replace(filename, '');

            if(!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            infor.forEach(roelm => {
                let roarr = [];
                roarr = roelm.split('@#');
                mainrow.push(roarr);
            });
            fs.writeFileSync(FilePath, mainrow.join(os.EOL));
            resolve(FilePath);
        }
        catch (err) {
            reject(err);
        }
        resolve(FilePath);
    });
}

//-------------------------------END GetStatusThread----------------------------------------------

//-------------------------------BEGIN GetProcessStatusCheckThread--------------------------------

async function GetProcessStatusCheckThread(info)
{
    return new Promise(async(resolve, reject)=>{
    try {
        let isTrue = true;
        let count = 0;
        let message = '';

        while (isTrue)
        {
            if (appSettings.UiDemo == "1" && info.Processname == "AutoUI_Execution")
            {
                // Thread.Sleep(1000);
                count = count + 1;
                if (count < 50) {
                    info.Status = JobInfoStatus.Running;
                }
                else {
                    count = 50;
                    info.Status = JobInfoStatus.Successful;
                }
                await UpdateProcessbyVariantandprocessname(info.Processname, info.VariantName, info.Status, info.SessionId, "AutoUI_Execution " + info.Status, count);

                if (info.Status == JobInfoStatus.Faulted || info.Status == JobInfoStatus.Failed || info.Status == JobInfoStatus.Error) {
                    await UpdateProcessByVariant(info.VariantName, JobInfoStatus.Faulted, info.SessionId);
                    isTrue = false;
                }
                else if (info.Status != JobInfoStatus.Successful) {
                    isTrue = true;
                }
                else {
                    isTrue = false;
                }
            }
            else {
                let tenantName = appSettings.tenantName;
                if (appSettings.CommunityEnvironment == "Community")
                {
                    let CommunityUrl = appSettings.CommunityUrl;
                    let oapi = new Orch_Community_APIClass();
                    let community_items = [];
                    community_items = await oapi.StatusRobot(CommunityUrl + "/odata/Jobs("+info.JobKey+")", info.SessionId, info.RobotID, info.JobKey, tenantName);

                    if(community_items != null) {
                        info.Status = community_items['Status'];
                        let keyval = community_items['Key'];
                        message = await oapi.GetJobLogs(CommunityUrl + "/odata/RobotLogs", info.SessionId, keyval, info.RobotID, tenantName);
                    }
                    console.log('info.Status', info.Status);
                    /*for(let i=0; i<community_items.length; i++) {
                        let itm = community_items[i][];
                        message = await oapi.GetJobLogs(CommunityUrl + "/odata/RobotLogs", info.SessionId, itm.Value, info.RobotID, tenantName);
                        console.log(message);
                    }*/
                }
                else
                {
                    let BaseUrl = appSettings.AuthenticationURL;
                    let oapi = new Orch_APIClass();
                    let noncommunity_items = [];
                    noncommunity_items = await oapi.StatusRobot(BaseUrl + "/odata/Jobs("+info.JobKey+")", info.SessionId, info.RobotID, info.JobKey);

                    if (noncommunity_items != null) {
                        info.Status = noncommunity_items['Status'];
                        let keyval = noncommunity_items['Key'];
                        message = await oapi.GetJobLogs(BaseUrl + "/odata/RobotLogs", info.SessionId, keyval, info.RobotID);
                    }
                }
                if(message != '') {
                    message = message.replace(/['"]+/g, '');
                }
                await UpdateProcessbyVariantandprocessname(info.Processname, info.VariantName, info.Status, info.SessionId, message);

                if (info.Status == JobInfoStatus.Faulted || info.Status == JobInfoStatus.Stopped || info.Status == JobInfoStatus.Error) {
                    await UpdateProcessByVariant(info.VariantName, JobInfoStatus.Faulted, info.SessionId);
                    isTrue = false;
                }
                else if (info.Status != JobInfoStatus.Successful) {
                    isTrue = true;
                }
                else {
                    isTrue = false;
                }
            }
        }
        resolve(true);
    }
    catch (err) {
        // LogHelper.LogMessage(ex);
        await UpdateProcessByVariant(info.VariantName, JobInfoStatus.Faulted, info.SessionId);
        reject(err);
    }
    });
}

//-------------------------------END GetProcessStatusCheckThread---------------------------------

//-------------------------------BEGIN ImportReportInformation-----------------------------------

async function ImportReportInformation(processobj) {
    return new Promise(async(resolve,reject) => {
        try {
            let FilePath = '';
            let HeadFilePath = appSettings.HeadFilePath;
            FilePath = HeadFilePath + "\\" + processobj.SessionId + "\\Report\\TestCaseStatusFile.xlsx";

            if(fs.existsSync(FilePath)) {
                let reportTables = [];
                reportTables = await ImportExceltoDatatableWithsessionname(FilePath, '', processobj.SessionId, 0);

                if (reportTables != null && reportTables.length > 0)
                {
                    let count = 0;
                    for (let i=0; i<reportTables.length; i++)
                    {
                        let tbl = reportTables[i];
                        if(tbl.length > 0) 
                        {
                            tbl.shift();
                            if (count == 0)
                            {
                                let Delete_Detail_Sheet = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_DeleteDetailSheet_BySessionID"(
                                    iv_sessionname => '${processobj.SessionId}')
                                `);
                                let savedetailsheet = await saveDetailSheet(tbl);

                                let updateEypaStatus = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Cockpit_AddOrUpdateCases_UpdateEYPAStatus"(
                                    IV_SESSIONID => '${processobj.SessionId}',
                                    IV_CLIENTNAME => '${processobj.Clientname}')
                                `);
                                console.log('updateEypaStatus',updateEypaStatus);
                                count = count + 1;
                            }
                            else if(count == 1)
                            {
                                let Delete_Header_Sheet = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_DeleteHeaderSheet_BySessionID"(
                                    iv_sessionname => '${processobj.SessionId}')
                                `);
                                let saveheadersheet = await saveHeaderSheet(tbl);
                            }
                        }
                    }
                }
            }
            await UpdateProcessbyVariantandprocessname("ImportReport", "ImportReport", JobInfoStatus.Successful, processobj.SessionId);
            console.log('ALL PROCESSES COMPLETED !!!');
            resolve(true);
        }
        catch (err) {
            reject(err);
        }
    });
}

async function saveDetailSheet(tbl)
{
    return new Promise(async(resolve,reject) => {
        try {
            let tblrow = [];
            let SaveDetailSheet;
            for (let i=0; i<tbl.length; i++) {
            tblrow = await escapechars(tbl[i]);

            SaveDetailSheet = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Insert_Detail_Sheet"(
                BUSINESS_SCENARIO => '${tblrow[0]}',
                CASE_KEY_VALUE => '${tblrow[1]}',
                CASE_ID => '${tblrow[2]}',
                BUSINESS_VARIANT_ID => '${tblrow[3]}',
                BUSINESS_VARIANT_NAME => '${tblrow[4]}',
                BUSINESS_VARIANT => '${tblrow[5]}',
                BUSINESS_VARIANT_DESCRIPTION => '${tblrow[6]}',
                EVENT_TYPE => '${tblrow[7]}',
                EVENT_TYPE_DESCRIPTION => '${tblrow[8]}',
                VARIANT_STEPS => '${tblrow[9]}',
                VARIANT_STEP_ORDER => '${tblrow[10]}',
                DOCUMENT_TABLE => '${tblrow[11]}',
                DOCUMENT_FIELD => '${tblrow[12]}',
                DOC_HEADER_VALUE => '${tblrow[13]}',
                DOC_ITEM_VALUE => '${tblrow[14]}',
                USER_TABLE => '${tblrow[15]}',
                USER_FIELD => '${tblrow[16]}',
                USER_FIELD_VALUE => '${tblrow[17]}',
                OTHER_TABLES => '${tblrow[18]}',
                REMAINING_FIELDS => '${tblrow[19]}',
                REM_FIELD_VALUES => '${tblrow[20]}',
                PRECEEDING_DOC => '${tblrow[21]}',
                PRECEEDING_LINE_ITEM => '${tblrow[22]}',
                PRECEEDING_EVENT_TYPE => '${tblrow[23]}',
                PRECEEDING_TCODE => '${tblrow[24]}',
                PRECEEDING_EVENT_DESC => '${tblrow[25]}',
                CASE_CATEGORY => '${tblrow[26]}',
                CASE_SUBCATEGORY => '${tblrow[27]}',
                UPDATE => '${tblrow[28]}',
                UPDATE_FIELDS => '${tblrow[29]}',
                UPDATE_FIELD_VALUES => '${tblrow[30]}',
                DOCUMENT_EXECUTION_ERROR_MESSAGE => '${tblrow[31]}',
                OUT_DOCUMENT_NUMBER => '${tblrow[32]}',
                STATUS => '${tblrow[33]}',
                SESSIONNAME => '${tblrow[34]}')
            `);
            }
            resolve(SaveDetailSheet);
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function saveHeaderSheet(tbl)
{
    return new Promise(async(resolve,reject) => {
        try {
            let tblrow = [];
            let SaveHeaderSheet;
            for (let i=0; i<tbl.length; i++) {
            tblrow = await escapechars(tbl[i]);

            SaveHeaderSheet = await execQuery(`CALL "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_Insert_Header_Sheet"(
                CASE_ID => '${tblrow[0]}',
                DOC_HEADER_VALUE => '${tblrow[1]}',
                VARIANT_STEPS => '${tblrow[2]}',
                STATUS => '${tblrow[3]}',
                SESSIONNAME => '${tblrow[4]}')
            `);
            }
            resolve(SaveHeaderSheet);
        }
        catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function escapechars(tblrow)
{
    let escrow = [];
    return new Promise(async(resolve,reject) => {
        tblrow.forEach(rowitem => {
            if(rowitem && rowitem != null) {
                rowitem = rowitem.replace(/['"]+/g, '');
            }
            escrow.push(rowitem);
        });
        resolve(escrow);
    });
}

async function ImportExceltoDatatableWithsessionname(filePath, sheetName, sessionname, Runid)
{
    return new Promise(async(resolve,reject) => {
    try {
        let worksheets = await xlsx.parse(fs.readFileSync(filePath));
        let dataset = [];
        let sheetslen = worksheets.length;
        let sheetscompleted = 0;
        let rows = [];

        for(let j=0; j<worksheets.length; j++) 
        {
            rows = await worksheets[j].data;
            let firstRow = true;

            for(let i=0; i<rows.length; i++) {
                if (firstRow) {
                    await rows[i].push('sessionname');
                    firstRow = false;
                }
                else {
                    for(let k=0; k<rows[i].length; k++ )
                    {
                        if(rows[i][k] == undefined) {
                            rows[i][k] = null;
                        }
                    }
                    await rows[i].push(sessionname);
                    // console.log('filtered',rows[i]);
                }
            }
            await dataset.push(rows);
            sheetscompleted = sheetscompleted + 1;
            if(sheetscompleted == sheetslen) {
                resolve(dataset);
            }
        }
    }
    catch(err) {
        console.log(err);
        reject(err);
    }
    });
}

async function ExportDataSetToExcel(columns, infor, FilePath, physicalPath)
{
    console.log('---13---');
    return new Promise(async(resolve, reject)=>{
    try {
    FilePath = physicalPath + FilePath;

    let dir = '';
    var filename = FilePath.replace(/^.*[\\\/]/, '');
    let filenamesplit = filename.split('.');
    let fname = filenamesplit[0];
    dir = FilePath.replace(filename, '');

    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet(fname);

    let mainrow = [];
    let columnlist = columns.split('@#');
    for(let i=0; i<columnlist.length; i++) {
        mainrow.push({
            header: columnlist[i],
            key: columnlist[i]
        })
    }
    worksheet.columns = mainrow;

    let roarr = [];
    let columnname = '';
    for(let j=0; j<infor.length; j++) 
    {
        roarr = infor[j].split('@#');
        let subrow = {};
        for(let k=0; k<mainrow.length; k++) 
        {
            columnname = mainrow[k].key;
            subrow[columnname] = roarr[k];
        }
        await worksheet.addRow(subrow);
    }
    await workbook.xlsx.writeFile(FilePath);
    resolve(FilePath);
    }
    catch (err) {
        reject(err);
    }
    });
}
