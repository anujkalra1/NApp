/** **************************************************************************
*                      cockpit.route.js
* This is the router file for run microservice, which provides
* API Services  Cockcpit Services

**************************************************************************** */

const router=  require('express').Router();

const {userAuthentication} = require('../controllers/userAuthentication.ctrl');
const {envList} = require('../controllers/envList.ctrl');
const {getRobots} = require('../controllers/getRobots.ctrl');
const {getBussinessProcess} = require('../controllers/getBussinessProcess.ctrl');
const {getVariantsInfo, getEypaHeaders} = require('../controllers/eypa.ctrl');
const {addorUpdateProcessQueues} = require('../controllers/addorUpdateProcessQueues.ctrl');

router.post('/Authenticate/',userAuthentication);
router.post('/GetEnvironments/',envList);
router.post('/GetRobots/',getRobots);
router.get('/GetAllBusinessProcess/',getBussinessProcess);
router.post('/GetVariantsInfo',getVariantsInfo);
router.post('/GetEypaHeaders',getEypaHeaders);
router.post('/AddorUpdateProcessQueues',addorUpdateProcessQueues);

module.exports= router;