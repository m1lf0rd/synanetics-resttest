var RestServer = require('./server');
var Executor = require('./executor');

let server = new RestServer();
let executor = new Executor();
let matcher = server.prepareMatch("/test/:id/:name");
//let url = "/test/myid/myname"
//let re=/http(s)?:\/\/([^:\/]+)(:(\d+))?(\S+)$/i

/*let url=['https://server:9090/blah','http://server:9090/blah','https://server/blah','http://server/blah'];
for (let i in url)
{
    console.log(url[i]);
    console.log(executor.parseURL(url[i]));
}*/
let s="a";
console.log(!s);
