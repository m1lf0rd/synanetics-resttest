const RestServer = require('./server');
const Config = require('./config');
const TestManager = require('./tests');
const Executor = require('./executor');
const MongoClient = require('mongodb').MongoClient;
const MongoServer = require('mongodb').MongoServer;

let server = new RestServer();
let config = Config();

console.log(JSON.stringify(config));

MongoClient.connect(config.db,  (err,db)=> 
  {
      if (err)
      {
        console.log("Failed to connect to MongoDB");
      }
      else
      {
        let theDb = db.db();
        let testManager = new TestManager(theDb);
        let executor = new Executor(theDb);

        server.AddRoute("POST","/test",(params,content)=>testManager.AddTest(content));
        server.AddRoute("GET","/test/:id",(params,content)=>testManager.GetTest(params['id']));
        server.AddRoute("GET","/test",(params,content)=>testManager.GetTests());
        server.AddRoute("DELETE","/test/:id",(params,content)=>testManager.DeleteTest(params['id']));
        server.RunService(config.port);
        setInterval(()=>executor.RunTests(),config.periodicity*100);
      }
    });
