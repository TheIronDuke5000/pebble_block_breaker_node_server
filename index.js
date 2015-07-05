var express = require("express");
var app = express();
// var mysql = require("mysql");
// var pg = require("pg");
var anyDB = require('any-db')
var cool = require("cool-ascii-faces");

app.use(express.static(__dirname + "/public"));

app.set("port", (process.env.PORT || 5000));

app.listen(app.get("port"), function() {
  console.log("Node app is running on port:" + app.get("port"))
});

var pool = anyDB.createPool(process.env.DATABASE_URL, {
    min: 0,  // Minimum connections
    max: 10 // Maximum connections
});



app.get("/db", function (request, response) {
  pool.query("select * from users;", function(err, result) {
    if (err) {
      console.error(err); response.send("Error " + err);
      response.send("error");
    } else {
      response.send(result.rows[0].name);
    }
  });
});

app.get("/set_name", function(request, response) {
  request.query.peb_account_token
  request.query.id
  request.query.name


  response.send(cool());
});