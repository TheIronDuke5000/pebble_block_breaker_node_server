var express = require("express");
var app = express();
var mysql = require("mysql");
var pg = require("pg");
var cool = require("cool-ascii-faces");

app.use(express.static(__dirname + "/public"));

app.set("port", (process.env.PORT || 5000));

app.listen(app.get("port"), function() {
  console.log("Node app is running on port:" + app.get("port"))
});

app.get("/db", function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query("select * from users;", function(err, result) {
      // done();
      if (err) {
        console.error(err); response.send("Error " + err);
        response.send("error");
      } else {
        response.send("pages/db" + String(result.name) );
      }
    });
  });
});

app.get("/set_name", function(request, response) {
  request.query.peb_account_token
  request.query.id
  request.query.name


  response.send(cool());
});