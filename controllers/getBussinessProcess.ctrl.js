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

methods.getBussinessProcess = async (req, res, next) => {
    try {
        let sessionId = req.query.sessionid;
        let BusinessProcess = appSettings.BusinessProcess;
        let items = [];
        if(sessionId){
            let bprocess = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_BusinessProcess_getAllBusinessProcess"(
                IV_SESSIONID => '${sessionId}'
                )
            `);
            if(bprocess.length){
                BusinessProcess = bprocess[0].BusinessProcess;
                items = BusinessProcess.split(',');
            }else{
                items = BusinessProcess.split(',');
            }
        }else{
            items = BusinessProcess.split(',');
        }
        res.json({message:"Success",  status : 200, Result : items});
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error Please after after some time', err: err });
    }
};




module.exports = methods
