var RestServer = require('./server');

let server = new RestServer();
let matcher = server.prepareMatch("/test/:id/:name");
let url = "/test/myid/myname"
console.log(url.match(matcher.expression)[1]);
console.log(server.serviceInstance);