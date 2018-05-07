const RestServer = require('./server');
const Config = require('./config');
const TestManager = require('./tests');
const ResultsManager = require('./results');
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
        let resultsManager = new ResultsManager(theDb);
        let executor = new Executor(theDb);

        server.AddRoute("POST","/test",(params,queryparams,content)=>testManager.AddTest(content));
        server.AddRoute("PUT","/test/:id",(params,queryparams,content)=>testManager.UpdateTest(content,params['id']));
        server.AddRoute("GET","/test/:id",(params,queryparams,content)=>testManager.GetTest(params['id']));
        server.AddRoute("GET","/test",(params,queryparams,content)=>testManager.GetTests());
        server.AddRoute("DELETE","/test/:id",(params,queryparams,content)=>testManager.DeleteTest(params['id']));
        server.AddRoute("GET","/result",(params,queryparams,content)=>resultsManager.GetResults(queryparams['test'],queryparams['latest']));
        server.RunService(config.port);
        if (config.mode!="notest") setInterval(()=>executor.RunTests(),config.periodicity*100);
      }
    });
