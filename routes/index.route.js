var express = require('express');
var router = express.Router();

const {javaCall} = require('../controllers/javaDest')



router.post('/javaCall/',javaCall);


/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("Welcome to the ITC application");
});


module.exports = router;
