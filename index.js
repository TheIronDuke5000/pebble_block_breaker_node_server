var express = require('express');
var app = express();
var cool = require('cool-ascii-faces');

app.use(express.static(__dirname + '/public'));

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  response.send(cool());
});

app.listen(app.get('port'), function() {
  console.log("Node app is running on port:" + app.get('port'))
})