/** **************************************************************************
*                      users.ctrl.js
* This is the controller for users microservice, which provides
* Create and get and Update the users

**************************************************************************** */

let methods = {};
const lo = require('lodash');
const { execQuery } = require('../utils/connections');
const { dbConfig } = require(`../configs/DBConfig`)["dev"];
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const Orch_APIClass = require(`../classes/orch_api`);
const Orch_Community_APIClass = require(`../classes/orch_community_api`);
const dbHelper = require(`../utils/dbQuery`);





methods.getVariantsInfo = async (req, res, next) => {
    try {
        let payload = req.body;
        let businessName = payload.BusinessName;
        let clientName = payload.ClientName;
        let list = [];
        let variantsData = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Cockpit_GetVariantsInfo_getEYPAInformation"(
            IV_CLIENTNAME => '${clientName}',
            IV_BUSSINESSPROCESS => '${businessName}'
            )
        `);
        if (!lo.isEmpty(variantsData)) {
            variantsData.forEach(element => {
                let obj = {
                    FREQUENCY: element["FREQUENCY"],
                    VARIANT_DESCRIPTION: element["VARIANT_DESCRIPTION"],
                    VARIANT_FULLFORM: element["VARIANT_FULLFORM"]
                }
                list.push(obj);
            });
        }
        res.json(list);
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};

methods.getEypaHeaders = async (req, res, next) => {
    try {
        let payload = req.body;
        let clientName = payload.ClientName;
        let businessname = payload.businessname;
        let Variantname = payload.Variantname;


        let getNodeInfo = await execQuery(`CALL "ITP_TEST_1"."ITP_Test.db::Testing_Cockpit_GetEYPAHeaders_GetNodeValues"()`)


        let getNodeInformation = await execQuery(`CALL "ITP_TEST_1"."ITP_Test.db::Testing_Cockpit_GetEYPAHeaders_GetEYPADetails"(
             '${clientName}',
             '${businessname}',
             '${Variantname}'
            


)`)


        if (lo.isEmpty(getNodeInformation)) {
            console.log("sorry")
            res.json({ status: 200, message: "Success", Results: getNodeInformation });

        }



        let tCodes = await execQuery(`
            select distinct  VARIANT_STEPS from  "ITP_TEST_1"."ITP_Test.db::EYPA" where "ClientName"='${clientName}' and "BUSINESS_VARIANT_NAME"='${businessname}' and "BUSINESS_SCENARIO"='${Variantname}' and "VARIANT_STEP_ORDER"=1
`)


        let data = await getEYPAHeader(getNodeInformation)



        let rowMapKey = []
        let rowMapvalues = []
        getNodeInfo.forEach(element => {
            rowMapKey.push(element.FIELDNAME)
            rowMapvalues.push(element.NODENAME)
        });
        var i = 0



        data.HeaderInfo.forEach(element => {
            var indexVal = (rowMapKey.indexOf(element));
            var indexString = (rowMapvalues[indexVal])
            data.HeaderInfo[i] = indexString;
            i++;

        });
        data.HeaderInfo.push("CASE_ID")
        data.HeaderInfo.push("STATUS")
        data.HeaderInfo.push("STATE")


        var objValues = Object.values(tCodes[0])

        let myObj = {
            Tcodes: objValues,
            HeaderInfo: data.HeaderInfo,
            RowInfo: data.RowInfo,
        }

        let getUpdateEYPAValues = await UpdateEYPAValues(myObj)
        let headerArray = []
        data.HeaderInfo.forEach(element => {
            let headObj = {
                columnName: element
            }
            headerArray.push(headObj)
        });
        let rowArray = []

        for (let g = 0; g < data.RowInfo.length; g++) {
            let h = 0
            var rowValue = {}
            data.RowInfo[g].forEach(element => {
                rowValue[data.HeaderInfo[h]] = element
                h++

            });
            rowArray.push(rowValue)

        }








        let ObjCall = {
            Tcodes: objValues,
            HeaderInfo: headerArray,
            RowInfo: rowArray,
            "filterinfo":
            {
                Filters: getUpdateEYPAValues
            }

        }




        res.json({ status: 200, message: "Success", Results: ObjCall });
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: 500, message: 'Server side error. Please try after some time', err: err });
    }
};


async function getEYPAHeader(getNodeinfo) {



    if (!lo.isEmpty(getNodeinfo)) {

        var interfaceData = []
        var keysplits = []
        var caseId = []
        var updatedKeyFeildsArray = []
        var updatedvalueFeildsArray = []


        getNodeinfo.forEach(element => {
            var newKeys = element.REMAINING_FIELDS
            keysplits = newKeys.split('|')
            var newValues = element.REM_FIELD_VALUES
            var valuesplits = newValues.split('|')



            if (!lo.isEmpty(element.UPDATE_FIELDS)) {
                updatedKeyFeildsArray = element.UPDATE_FIELDS.split('|')

                updatedvalueFeildsArray = element.UPDATE_FIELD_VALUES.split('|')

                for (let q = 0; q < updatedKeyFeildsArray.length; q++) {
                    let updatedindexValue = (keysplits.indexOf(updatedKeyFeildsArray[q]))
                    if (updatedindexValue != -1) {
                        valuesplits[updatedindexValue] = updatedvalueFeildsArray[q]
                    }
                }
            }
            valuesplits.push(element.CASE_ID)
            valuesplits.push("Valid")
            if (!lo.isEmpty(element.UPDATE_FIELDS)) {
                valuesplits.push("Updated")

            }
            else {
                valuesplits.push("Original")
            }
            interfaceData.push(valuesplits)
        })



        var myObj = {
            HeaderInfo: keysplits,
            RowInfo: interfaceData
        }
    }
    return myObj
}

async function UpdateEYPAValues(myObj) {
    var mappingArray = []
    var mappingArrayKey = []
    var mappingArrayValue = []
    /*
        myObj.HeaderInfo.push("CASE_ID")
        myObj.HeaderInfo.push("STATUS")
        myObj.HeaderInfo.push("STATE")
    */
    myObj.RowInfo.forEach(element => {
        for (q = 0; q < element.length; q++) {
            var Obj = {}
            var keyName = myObj.HeaderInfo[q]
            mappingArrayKey.push(keyName)
            mappingArrayValue.push(element[q])
            Obj[keyName] = element[q]
            mappingArray.push(Obj)
        }
    });
    let unique = mappingArrayValue.filter((item, i, ar) => ar.indexOf(item) === i);
    let finalArr = []
    for (let j = 0; j < unique.length; j++) {
        let ObjCall = {}
        var indexVal = (mappingArrayValue.indexOf(unique[j]));
        ObjCall[mappingArrayKey[indexVal]] = mappingArrayValue[indexVal]
        finalArr.push(ObjCall)
    }
    let finalcallObj = {}
    finalArr.forEach(each => {
        let keyName = Object.keys(each).pop();
        if (!finalcallObj[keyName]) finalcallObj[keyName] = [{ value: each[keyName] }];
        else {
            let calObj = {
                value: each[keyName]
            }
            finalcallObj[keyName].push(calObj);
        }
    })
    return finalcallObj
}



module.exports = methods
