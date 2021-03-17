let methods= {};
const {execQuery} = require('./connections');
const {dbConfig} = require(`../configs/DBConfig`)["dev"];
const _= require('lodash');
const { v4: uuidv4 } = require('uuid');
const {getDateFromTimetime} = require('../utils/datetime')

methods.LoginSession = async(data, AuthToken) => {
  let _self = this; 
    return new Promise(async(reslove,reject)=>{
        try{
          console.log("Check if user exists")
          let user = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_UserAuthentication_getUserDetails"(
            IV_USERNAME => '${data.username}',
            IV_PASSWORD => '${data.password}',
            IV_TENANCYNAME => '${data.tenant}',
            IV_INTERFACEADMIN => '0'
            )
          `);
          console.log(user)
          userDetails = user.length ? user[0]: '';
          if(userDetails){
            var userSessionHis =  {
                LastLoggedIn: getDateFromTimetime(),
                SessionId: uuidv4(),
                UserId: userDetails.Id,
                UserType: "1"
            };
            await updateUserLastLoginTime(userDetails.Id, userSessionHis.LastLoggedIn);
            await saveUserSessionHistories(userSessionHis);
            console.log("Return final response")
            reslove({
              LastLoggedIn : userSessionHis.LastLoggedIn,
              SessionId : userSessionHis.SessionId,
              UserId : userSessionHis.UserId,
              UserName : userDetails.UserName,
              ClientName : userDetails.TenancyName,
              AuthToken : AuthToken
            });
          }else{
            reslove('')
          }
        }catch(err){
          reject(err);
        }
    })
}

async function saveUserSessionHistories(userSessionHis) {
  return new Promise(async(reslove,reject)=>{
    try{
      console.log("Store user session history")
      let userSession = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_UserAuthentication_saveSessionHistory"(
        IV_USERID => '${userSessionHis.UserId}',
        IV_LASTLOGGEDIN => '${userSessionHis.LastLoggedIn}',
        IV_SESSIONID => '${userSessionHis.SessionId}',
        IV_USERTYPE => '${userSessionHis.UserType}'
        )
      `);
      console.log(userSession)
      reslove(true);
    }catch(err){
      reject(err);
    }
  });
} 

methods.authUser = async(data) => {
  return new Promise(async(resolve,reject) => {
    try {
      let adminuser = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_GetUsersDetails"(
        IV_USERNAME => '${data.username}',
        IV_PASSWORD => '${data.password}',
        IV_INTERFACEADMIN => 1,
        IV_ISACTIVE => 1
        )`);
      let userDetails = adminuser.length ? adminuser[0]: '';
      
      if(userDetails) {
        var userSessionHis =  {
          LastLoggedIn: getDateFromTimetime(),
          SessionId: uuidv4(),
          UserId: userDetails.Id,
          UserType: "2"
        };
        await updateUserLastLoginTime(userDetails.Id, userSessionHis.LastLoggedIn);
        await saveUserSessionHistories(userSessionHis);
        userDetails.ClientName = userDetails.clientName;
        delete userDetails.clientName;
        userDetails.SessionId = userSessionHis.SessionId;
        resolve(userDetails);
      } else {
        resolve('');
      }
    } catch(err) {
      reject(err);
    }
  });
}

async function updateUserLastLoginTime(UserId, LastLoggedIn) {
  return new Promise(async(reslove,reject)=>{
    try{
      console.log("Updating last login time for Users")
      let userSession = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_UpdateUserLastLoginTime"(
        IV_ID => '${UserId}',
        IV_LASTLOGINTIME => '${LastLoggedIn}',
        OV_STATUS => ?
        )
      `);
      reslove(true);
    }catch(err){
      reject(err);
    }
  });
}

methods.getAdminUser = async(UserId) => {
  return new Promise(async(reslove,reject)=>{
    try{
      console.log("Get admin orchestrator user details")
      let userSession = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::User_GetAdmin"(
        IV_USERID  => '${UserId}'
        )
      `);
      reslove(userSession);
    }catch(err){
      reject(err);
    }
  });
}

methods.addorUpdateuser = async(model, status) => {
  return new Promise(async(reslove,reject)=>{
    try{
      if(model){
        if(model.Id){
          console.log("Updating user")
          let userInfo = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_GetUserDetailById"(
            IV_ID  => '${model.Id}'
            )
          `);
          if(userInfo.length){
            let data = userInfo[0];
            let updateUser = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_UpdateUser"(
              ID  => '${data.Id}',
              EMAILADDRESS  => '${model.EmailAddress}',
              FULLNAME  => '${model.FullName}',
              PASSWORD  => '${model.Password}',
              ROLESLIST  => '${model.RolesList}',
              SURNAME  => '${model.Surname}',
              TenancyName  => '${model.TenancyName}',
              TENANTID  => 1,
              USERID  => '${model.UserId}',
              USERNAME   => '${model.UserName}',
              LV_RESULT  => ?
              )
            `);
            console.log(updateUser)
            reslove(updateUser)
          }else{
            reject(false)
          }
        }else{
          console.log("Creating user")
          let createUser = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_CreateUser"(
            IV_CREATIONTIME  => '${getDateFromTimetime()}',
            IV_EMAILADDRESS  => '${model.EmailAddress}',
            IV_FULLNAME  => '${model.FullName}',
            IV_INTERFACEADMIN  => 1,
            IV_ISACTIVE  => 1,
            IV_PASSWORD  => '${model.Password}',
            IV_ROLESLIST  => '${model.RolesList}',
            IV_SURNAME  => '${model.Surname}',
            IV_TENANCYNAME  => '${model.TenancyName}',
            IV_TENANTID  => 1,
            IV_USERID  => '${model.UserId}',
            IV_USERNAME  => '${model.UserName}',
            IV_BUSINESSPROCESS  => 'PTP,RTR,OTC',
            IV_CLIENTNAME  => '${model.ClientName}'
            )
          `);
          console.log(createUser)
          reslove(createUser)
        }
      }else{
        reject(false);
      }
    }catch(err){
      console.log(err)
      reject(false);
    }
  });
}

methods.addorUpdateStatus = async(Id, Status) => {
  if(Status == false) {
    Status = 0;
  } else {
    Status = 1;
  }
  return new Promise(async(reslove,reject)=>{
    try{
      let updateuserstatus = await execQuery(`CALL  "${dbConfig['dbSchemaName']}"."${dbConfig['databaseName']}.db::Testing_User_UpdateUserStatus"(
        IV_ID  => ${Id},
        IV_ISACTIVE => ${Status},
        OV_STATUS => ?
      )`);
      if(updateuserstatus){
        reslove(true);
      } else {
        reject(false);
      }
    } catch(err) {
      reject(false);
    }
  });
}

module.exports=methods;