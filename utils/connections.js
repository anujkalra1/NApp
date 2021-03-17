let methods = {};
//let envVar = process.env.NODE_ENV || 'dev';
//console.log('nodeENV', envVar);
//hdb

const {dbConfig} = require(`../configs/DBConfig`)["dev"];
let hana = require('@sap/hana-client');
let client = hana.createConnection();
var dbClient;

let  connString=`serverNode=${dbConfig['host']}:${dbConfig['port']};uid=${dbConfig['user']};pwd=${dbConfig['password']};encrypt=true;sslValidateCertificate=false;Pooling=true;Max Pool Size=50;Min Pool Size=10;`;

(async function () {
   try {
    dbClient = await establishDBconnection();
   } catch (err) {
     console.log('DB connction Error', err);
     process.exit(1);
   }

 })();

methods.execQuery = async function (query) {
  return new Promise(async (reslove, reject) => {
    try {
      //let dbClient = await establishDBconnection();

      dbClient.exec(query,(err,rows)=>{
        if (err) {
          console.log(err);
          reject(err);
        };
        reslove(rows);
      })
    } catch (err) {
      reject(err);
    }

  })
}

function establishDBconnection() {
  return new Promise((reslove, reject) => {
    client.connect(connString, (err) => {
      if (err) {
        console.log('Issue with DB Connection: ', err);
        reject(err)
      }else{
        console.log('DB Connection established Successfully')
        reslove(client)
      }
    });
  });
};

module.exports = methods;