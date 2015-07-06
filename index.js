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

// app.get("/db", function (request, response) {
//   pool.query("select * from users;", function(err, result) {
//     if (err) {
//       console.error(err);
//       response.json({error: "sql error. oops"});
//     } else {
//       response.send(result.rows[0].name);
//     }
//   });
// });

app.get("/set_name", function(request, response) {
  if (request.query.id === null || request.query.id === undefined ||
      isStringBlank(request.query.name)) {
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

  // TODO: figure out a way to sanitize the account token without destroying it. 
  // if it is left as is the server is vulnerable to SQL injection.
  // but i dont know the format of the account token so that i dont destroy it
  // this is a temporary fix that assumes that the token string is alphanumeric
  account_token = account_token.replace(/[^A-Za-z0-9 ]/g, "");

  var name_in_use_by_id = 0;
  pool.query("select id from users where name='" + newName + "';", function(err, result) {
    if (err) {
      console.error(err);
      response.json({error: "sql error 1. oops"});
      return;
    } else if (result.rows.length > 0) {
      name_in_use_by_id = result.rows[0].id;
    }

    pool.query("select * from users where (account_token<>'' and account_token='" + account_token +
               "') or id=" + request.query.id +";", function(err, result) {
      if (err) {
        console.error(err);
        response.json({error: "sql error 2. oops"});
      } else if (result.rows.length > 0 && (name_in_use_by_id == 0 || name_in_use_by_id == result.rows[0].id)) {
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


app.get("/update_scores", function (request, response) {
  if (request.query.id === null || request.query.id === undefined || 
      request.query.scores === null || request.query.scores === undefined) {
    response.json({error: "Improper query string"});
    return;
  }
  var scores = JSON.parse(request.query.scores);
  if (scores.length <= 0) {
    response.json({error: "Improper query string"});
  }
  for (var i = 0; i < scores.length; i++) {
    if (scores[i].score === null || scores[i].score === undefined ||
        scores[i].level === null || scores[i].level === undefined ||
        scores[i].datetime === null || scores[i].datetime === undefined) {
      response.json({error: "Improper query string"});
      return;
    }
  }

  var account_token = "";
  if (!isStringBlank(request.query.account_token)) {
    account_token = request.query.account_token;
  }

  // TODO: figure out a way to sanitize the account token without destroying it. 
  // if it is left as is the server is vulnerable to SQL injection.
  // but i dont know the format of the account token so that i dont destroy it
  // this is a temporary fix that assumes that the token string is alphanumeric
  account_token = account_token.replace(/[^A-Za-z0-9 ]/g, "");

  pool.query("select * from users where (account_token<>'' and account_token='" + account_token +
             "') or id=" + request.query.id +";", function(err, result) {
    if (err) {
      console.error(err);
      response.json({error: "sql error 1. oops"});
    } else if (result.rows.length > 0) {
      var insertQueryString = "insert into users (user_id, score, datetime, level) values ";
      var deleteQueryString = "delete from users where user_id=" + result.query.id + " and datetime in (";

      for (var i = 0; i < scores.length; i++) {
        insertQueryString = insertQueryString + "(" + result.rows[0].id + ", " + 
                      scores[i].score + ", " + scores[i].datetime + ", " + scores[i].level + ")";
        deleteQueryString = deleteQueryString + scores[i].datetime;
        if (i+1 != scores.length) {
          insertQueryString = insertQueryString + ", ";
          deleteQueryString = deleteQueryString + ", ";
        }
      }

      // insertQueryString = insertQueryString + "";
      deleteQueryString = deleteQueryString + ");"

      pool.query(deleteQueryString, function(err, deleteResult) {
        if (err) {
          console.error(err);
          response.json({error: "sql error 2. oops"});
        }
        pool.query(insertQueryString, function(err, insertResult) {
          if (err) {
            console.error(err);
            response.json({error: "sql error 3. oops"});
          } else {
            var num_high_scores = 5;
            pool.query("select s.score, s.level, s.datetime, u.name " +
                       "from scores as s, users as u where " +
                       "s.user_id=u.id order by s.score desc limit " + num_high_scores + ";", 
                       function (err, selectResult) {
              if (err) {
                console.error(err);
                response.json({error: "sql error 4. oops"});
              } else {
                var scoresFlatJSON = {};
                for (var i = 0; i < num_high_scores; i++) {
                  scoresFlatJSON[i] = selectResult.rows[i];
                }
                response.json(scoresFlatJSON);
              }
            });
          }
        });
      });
    } else {
      // failure. just do nothing
      response.json({error: "The pebble account token was not found in the database."});
    }
  });
});


