const request = require('request');
const appConfig = require(`../configs/appConfig`);
const appSettings = appConfig.appSettings;
const path = require('path');
const fs = require('fs'); 
class SessionHelperClass {
    constructor(){

    }
    static async Get(sessionId) {
        return new Promise(function(resolve, reject){ 
            try
            {
                let filename = sessionId + ".txt";
                let filePath = `${appSettings.siteUrl}${filename}`;
                if (fs.existsSync(filePath)){
                    let data = fs.readFileSync(filePath, 'utf8');
                    console.log("Reading session Info")
                    resolve(data);
                }else{
                    reject({status : 403, message : "Invalid session, please login again"});
                }
            } catch (e) {
                reject(e);
            }
        }); 
    }

    static Set(info){
        return new Promise(function(resolve, reject){ 
            try
            {
               let filename = info.SessionId + ".txt";
               let folderPath = appSettings.siteUrl;
               let filePath = `${appSettings.siteUrl}${filename}`;
               console.log("Writing Session Info")
               console.log(filePath)
               if (!fs.existsSync(folderPath)){
                    fs.mkdirSync(folderPath, { recursive: true });
               }
               fs.writeFileSync(filePath, JSON.stringify(info))
               resolve(true)
            } catch (e) {
                reject(e);
            }
        }); 
    }

    static Delete(sessionid){
        return new Promise(function(resolve, reject){ 
            try
            {
                
            } catch (e) {
                reject(e);
            }
        }); 
    }
}
module.exports = SessionHelperClass