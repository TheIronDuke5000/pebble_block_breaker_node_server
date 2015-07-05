var express = require("express");
var app = express();
// var mysql = require("mysql");
// var pg = require("pg");
var anyDB = require('any-db')
var cool = require("cool-ascii-faces");

var MAX_NAME_LENGTH = 16;


app.use(express.static(__dirname + "/public"));

app.set("port", (process.env.PORT || 5000));

app.listen(app.get("port"), function() {
  console.log("Node app is running on port:" + app.get("port"))
});

var pool = anyDB.createPool(process.env.DATABASE_URL, {
  min: 0,  // Minimum connections
  max: 10 // Maximum connections
});

function isStringBlank(str){
  return str === undefined || str === null || str.match(/^\s*$/) !== null;
}

app.get("/db", function (request, response) {
  pool.query("select * from users;", function(err, result) {
    if (err) {
      console.error(err);
      response.json({error: "sql error. oops"});
    } else {
      response.send(result.rows[0].name);
    }
  });
});

app.get("/set_name", function(request, response) {
  if (request.query.id === null || request.query.id === undefined || isStringBlank(request.query.name)) {
    response.json({error: "Improper query string"});
    return;
  }

  var newName = request.query.name.replace(/[^A-Za-z0-9 ]/g, "");
  if (newName.length > MAX_NAME_LENGTH) {
    response.json({error: "Name must be less than 16 characters"});
    return;
  }

  var account_token = "";
  if (!isStringBlank(request.query.account_token)) {
    account_token = request.query.account_token;
  }

  var name_in_use_by_id = 0;
  pool.query("select id from users where name='" + newName + "';",
             function(err, result) {
    if (err) {
      console.error(err);
      response.json({error: "sql error 1. oops"});
      return;
    } else if (result.rows.length > 0) {
      name_in_use_by_id = result.rows[0].id;
    }

    pool.query("select * from users where (account_token<>'' and account_token='" + account_token + 
               "') or id=" + request.query.id +";",
               function(err, result) {
      if (err) {
        console.error(err);
        response.json({error: "sql error 2. oops"});
      } else if (result.rows.length > 1) {
        // shit
        response.json({error: "sql error 2b. oops"});
      } else if (result.rows.length == 1 && (name_in_use_by_id == 0 || name_in_use_by_id == result.rows[0].id)) {
        // change name
        if (isStringBlank(account_token)) {
          account_token = result.rows[0].account_token;
        }
        pool.query("update users set name='" + newName + "', account_token='" + account_token + 
                   "' where id=" + result.rows[0].id + " returning *;", function(err, updateResult) {
          if (err) {
            console.error(err);
            response.json({error: "sql error 3. oops"});
          } else {
            response.json({
              id: updateResult.rows[0].id,
              name: updateResult.rows[0].name,
              account_token: updateResult.rows[0].account_token
            });
          }
        });
      } else if (result.rows.length == 0 && name_in_use_by_id == 0) {
        // create new user
        pool.query("insert into users (name, account_token) values ('" + 
                    newName + "', '" + account_token + "') returning *;", function(err, insertResult) {
          if (err) {
            console.error(err);
            response.json({error: "sql error 4. oops"});
          } else {
            response.json({
              id: insertResult.rows[0].id,
              name: insertResult.rows[0].name,
              account_token: insertResult.rows[0].account_token
            });
          }
        });
      } else {
        response.json({error: "This name is already in use. Please choose another name."});
      }
    });
  });
});