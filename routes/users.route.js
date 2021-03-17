var express = require('express');
var router = express.Router();
const {usersAuth} = require('../controllers/adminUsersAuth.ctrl')
const {getAllUsers} = require('../controllers/usersList.ctrl')
const {addorUpdateUser} = require('../controllers/usersAddorUpdate.ctrl')
const {updateUserStatus} = require('../controllers/usersStatus.ctrl')
const {getRoles} = require('../controllers/usersRoles.ctrl')

router.post('/Authenticate',usersAuth);
router.post('/GetAllUsers',getAllUsers);
router.post('/AddorUpdateUser',addorUpdateUser);
router.post('/UpdateUserStatus',updateUserStatus);
router.get('/GetRoles',getRoles);

module.exports = router;
