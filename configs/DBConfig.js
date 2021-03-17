//TODO In feature dev and prod env be should be diffent config values.
module.exports={
    dev:{
     port:8080,
     dbConfig:{
        host: 'zeus.hana.prod.eu-central-1.whitney.dbaas.ondemand.com',
        port: 31735,
        user: "TEST_USER_ITP",
        password: "Welcome@1234",
        useTLS: true,
        instanceNumber: '00',
        databaseName: 'ITP_Test',
        minPoolSize:10,
        maxPoolSize:50,
        dbSchemaName:'ITP_TEST_1'
     }
    }

    
}