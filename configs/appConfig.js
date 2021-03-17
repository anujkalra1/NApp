//TODO In feature dev and prod env be should be diffent config values.
module.exports = {
    appSettings: {
        ClientValidationEnabled: "true",
        siteUrl: "C:/ITC/SessionHistories/",
        UnobtrusiveJavaScriptEnabled: "true",
        // AuthenticationURL: "https://jumpservejbox",
        AuthenticationURL: "https://jumpserver-ey.eastus2.cloudapp.azure.com",
        AutoUiFilePath: "C:\\projects\\ITP\\wrapperfiles",
        logFilePath: "C:\\projects\\ITP\\Intelligent_IIS_Log",
        logFileName: "Intelligent_API.log",
        CommunityEnvironment: "Community",
        NonCommunitytenantName: "Default",
        BusinessProcess: "PTP,RTR,OTC",
        CommunityAuth: "https://account.uipath.com/oauth/token",
        // CommunityUrl: "https://platform.uipath.com/itpinfra/ITPInfraDefault/",
        CommunityUrl: "https://cloud.uipath.com/eygdsodhausu/EYGDSDefault",
        ClientId: "8DEv1AMNXczW3y4U15LL3jYf62jK93n5",
        // UserKey: "xmA8jHcbXFCMhJnyjLOJfJtB2FHoaVc0LEnahlnkDb0rY",
        // tenantName: "ITPInfraDefmfed464578",
        UserKey: "DxFkwoP6GbvHz_FUchyy_eyGxUxw18_unZn9Iqpnq5Avt",
        tenantName: "EYGDSDefaulzsoq523827",
        OrganizationUnitId: 388519,
        ProcessInformation: "RunVariance|10,CSV_Creation|20,AddQueuesUpdated|10,AutoUI_Execution|50,GenerateReport|10",
        ImportReportProcess: "ImportReport|0",
        EYPAWrapper: "ZEY_CREATE_DATA_FILE_WRAPPER",
        HeadFilePath: "C:\\projects\\ITP\\wrapperfiles",
        sharedFolderPath: "C:\\projects\\ITP\\wrapperfiles",
        AutoUiProgress: "3",
        UiDemo: "0",
        SAPMachine: "S4S"
    },
    JobInfoStatusSettings: {
        Start: "Start",
        Faulted: "Faulted",
        Stopped: "Stopped",
        Error: "Error",
        Successful: "Successful",
        Failed: "Failed",
        Running: "Running",
        InProgress: "InProgress",
        Success: "Success"
    },
    ProcessInformationSettings: {
        ProcessInformation: "RunVariance|10,CSV_Creation|20,AddQueuesUpdated|10,AutoUI_Execution|50,GenerateReport|10"
    },
    ImportReportProcessSettings : {
        ImportReportProcess: "ImportReport|0"
    },
    TypeOfFIle : {
        Variant: 1,
        FilterParameter: 2,
        Subset: 3
    }
}